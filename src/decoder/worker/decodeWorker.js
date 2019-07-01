function MailBox(handler) {
    this.cmdArr = [];
    this.handler = handler;
    this.timer = null;
    this.isRuning = false;
}

MailBox.prototype.start = function () {
    this.isRuning = true;
    this.startLoop();
}

MailBox.prototype.stop = function () {
    this.isRuning = false;
}

MailBox.prototype.startLoop = function () {
    this.clear();
    while (true) {
        var cmd = this.shift();
        if (!cmd) return;

        try {
            this.handler(cmd);
        } catch (e) {
            self.postMessage({
                type: "error",
                data: JSON.stringify(e)
            });
        }
    }
}

MailBox.prototype.stop = function () {
    this.isRuning = false;
}

MailBox.prototype.push = function (cmd) {
    this.cmdArr.push(cmd);
    if (this.isRuning) {
        clearTimeout(this.timer);
        var that = this;
        this.timer = setTimeout(function () {
            that.startLoop();
        });
    }
}

MailBox.prototype.shift = function () {
    return this.cmdArr.shift();
}

MailBox.prototype.clear = function () {
    if (this.cmdArr.length > 500) {
        console.log(this.cmdArr.length);
        this.cmdArr = this.cmdArr.filter(function (it, index) {
            return it.data.type !== "inputData" || index > 150;
        })
    }
}

var timerMap = {};

function Decoder() {
    this.cacheBuffer = new CacheBuffer(65536);
    this.logLevel = 0;
}

Decoder.prototype.initDecoder = function (videoCallback, audioCallback) {
    videoCallback = Module.addFunction(videoCallback);
    audioCallback = Module.addFunction(audioCallback);

    var res = Module._initDecoder(this.logLevel, videoCallback, audioCallback);
    console.log("initDecoder");
    if (res !== 0) {
        throw new Error("initDecoder 失败");
    }
}

Decoder.prototype.uninitDecoder = function () {
    var res = Module._uninitDecoder();
    console.log("uninitDecoder");
    if (res === 0) {
        this.cacheBuffer.free();
    } else {
        throw new Error("uninitDecoder 失败");
    }
}

Decoder.prototype.openDecoder = function (fileName, isReplay) {
    var res = Module._openDecoder(1, fileName, isReplay ? 1 : 0);
    console.log("openDecoder");
    if (res !== 0) {
        throw new Error("openDecoder 失败");
    }
}

Decoder.prototype.closeDecoder = function () {
    var res = Module._closeDecoder(1);
    console.log("closeDecoder");
    if (res !== 0) {
        throw new Error("closeDecoder 失败");
    }
}

Decoder.prototype.inputData = function (data) {
    var bufferData = this.cacheBuffer.get(data);
    var res = Module._inputData(1, bufferData.buffer, bufferData.size);
    console.log("inputData");
    if (res !== 0) {
        throw new Error("inputData 失败");
    }
}

Decoder.prototype.decodePacket = function () {
    var res = Module._decodePacket(1);
    console.log("decodePacket");
    if (res !== 0) {
        throw new Error("decodePacket 失败");
    }
}

Decoder.prototype.flushDecoder = function () {
    var res = Module._flushDecoder(1);
    console.log("flushDecoder");
    if (res !== 0) {
        throw new Error("flushDecoder 失败");
    }
}


function CacheBuffer(initSize) {
    this.size = initSize;
    this.buffer = Module._malloc(initSize);
}

CacheBuffer.prototype.get = function (chunk) {
    if (this.size <= chunk.byteLength) {
        Module._free(this.buffer);
        this.size = chunk.byteLength;
        this.buffer = Module._malloc(chunk.byteLength);
    }
    var typedArray = new Uint8Array(chunk);
    Module.HEAPU8.set(typedArray, this.buffer);
    return {
        buffer: this.buffer,
        size: typedArray.length
    };
}

CacheBuffer.prototype.free = function () {
    Module._free(this.buffer);
    this.buffer = null;
}

var td = new TextDecoder();
function getJSON(strPointer) {
    var endIndex = strPointer;
    for (var i = strPointer; i < Module.HEAPU8.length; i++) {
        var it = Module.HEAPU8[i];
        if (it === 0) {
            endIndex = i;
            break;
        }
    }
    var outArray = Module.HEAPU8.subarray(strPointer, endIndex);
    var data = new Uint8Array(outArray);
    var paramJsonStr = td.decode(data);
    return JSON.parse(paramJsonStr);
}

/**
 * 真正的开始
 */
var decoder = null;

var isFailed = false;
var mailBox = new MailBox(messageHandler);

function main() {
    try {
        decoder = new Decoder();
        decoder.initDecoder(videoCallback, audioCallback);
    } catch (e) {
        this.isFailed = true;
        self.postMessage({
            type: "error",
            data: JSON.stringify(e)
        })
    }

    mailBox.start();
}

function videoCallback(decoderId, buff, size, pts, paramJsonStr) {
    var outArray = Module.HEAPU8.subarray(buff, buff + size);
    var data = new Uint8Array(outArray);
    var meta = getJSON(paramJsonStr);
    self.postMessage({
        type: "decoder-videoFrame",
        data: {
            data: data,
            meta: meta,
            pts: pts
        }
    }, [data.buffer])
}

function audioCallback(decoderId, buff, size, pts, paramJsonStr) {
    var outArray = Module.HEAPU8.subarray(buff, buff + size);
    var data = new Uint8Array(outArray);
    var meta = getJSON(paramJsonStr);
    self.postMessage({
        type: "decoder-audioFrame",
        data: {
            data: data,
            meta: meta,
            pts: pts
        }
    }, [data.buffer])
}

function messageHandler(e) {
    var type = e.data.type;
    var data = e.data.data;
    switch (type) {
        case "uninitDecoder":
            decoder.uninitDecoder();
            break;
        case "openDecoder":
            decoder.openDecoder(data.fileName, data.isReplay);
            break;
        case "closeDecoder":
            decoder.closeDecoder();
            break;
        case "inputData":
            decoder.inputData(data.data);
            break;
    }
}

self.addEventListener("message", function (e) {
    if (!isFailed) {
        mailBox.push(e);
    }
})

self.Module = {
    mainScriptUrlOrBlob: "./libffmpeg.js",
    onRuntimeInitialized: function () {
        main();
    }
};

importScripts("./libffmpeg.js");