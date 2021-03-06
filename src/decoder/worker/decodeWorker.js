function Decoder() {
    this.cacheBuffer = new CacheBuffer(65536);
    this.logLevel = 0;
}

Decoder.prototype.initDecoder = function (videoCallback, audioCallback) {
    videoCallback = Module.addFunction(videoCallback);
    audioCallback = Module.addFunction(audioCallback);

    var res = Module._initDecoder(this.logLevel, videoCallback, audioCallback, 1024 * 1024 * 10);
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
        self.postMessage({ type: "uninitDecoder" })
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
    console.log("inputData", data);
    var bufferData = this.cacheBuffer.get(data);
    var res = Module._inputData(1, bufferData.buffer, bufferData.size);
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
    self.postMessage({ type: "flushDecoder" });
    console.log("flushDecoder");
    if (res !== 0 && res !== 7) {
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


var decoder;
var inited = false;
var cmdsBeforeInit = [];

function main() {
    try {
        decoder = new Decoder();
        decoder.initDecoder(videoCallback, audioCallback);
    } catch (e) {
        sendError(e)
        self.removeEventListener("message", onmessage);
        return;
    }
    for (var i = 0; i < cmdsBeforeInit.length; i++) {
        var e = cmdsBeforeInit[i];
        messageHandler(e);
    }
    inited = true;
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
            pts: pts,
            fps: meta.fps
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
            pts: pts,
            fps: meta.sample_rate / 1152 / 1000
        }
    }, [data.buffer])
}

var isReplay = false;

function messageHandler(e) {
    var type = e.data.type;
    var data = e.data.data;
    try {
        switch (type) {
            case "uninitDecoder":
                decoder.uninitDecoder();
                break;
            case "openDecoder":
                isReplay = data.isReplay;
                decoder.openDecoder(data.fileName, isReplay);
                break;
            case "closeDecoder":
                decoder.closeDecoder();
                break;
            case "inputData":
                decoder.inputData(data.data);
                if (isReplay) decoder.flushDecoder();
                break;
            case "decodePacket":
                decoder.decodePacket();
                break;
        }
    } catch (e) {
        sendError(e);
    }
}

function messageBind() {
    self.addEventListener("message", onMessage);
}

function onMessage(e) {
    if (inited) {
        messageHandler(e);
    } else {
        cmdsBeforeInit.push(e);
    }
}

function sendError(e) {
    self.postMessage({
        type: "error",
        data: e.stack
    })
}

/**
 * 真正的开始
 */
messageBind();
self.Module = {
    mainScriptUrlOrBlob: "./libffmpeg.js",
    onRuntimeInitialized: function () {
        main();
    }
};
importScripts("./libffmpeg.js");