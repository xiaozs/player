function Decoder() {
    this.cacheBuffer = new CacheBuffer(65536);
    this.logLevel = 0;
}

Decoder.prototype.initDecoder = function (videoCallback, audioCallback) {
    videoCallback = Module.addFunction(videoCallback);
    audioCallback = Module.addFunction(audioCallback);

    var res = Module._initDecoder(this.logLevel, videoCallback, audioCallback);
    if (res !== 0) {
        throw new Error("initDecoder 失败");
    }
}

Decoder.prototype.uninitDecoder = function () {
    var res = Module._uninitDecoder();
    if (res === 0) {
        this.cacheBuffer.free();
    } else {
        throw new Error("uninitDecoder 失败");
    }
}

Decoder.prototype.openDecoder = function (decoderId, fileName) {
    var res = Module._openDecoder(decoderId, fileName);
    if (res !== 0) {
        throw new Error("openDecoder 失败");
    }
}

Decoder.prototype.closeDecoder = function (decoderId) {
    var res = Module._closeDecoder(decoderId);
    if (res !== 0) {
        throw new Error("closeDecoder 失败");
    }
}

Decoder.prototype.inputData = function (decoderId, data) {
    var bufferData = this.cacheBuffer.get(data);

    var res = Module._inputData(decoderId, bufferData.buffer, bufferData.size);

    if (res !== 0) {
        throw new Error("inputData 失败");
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

/**
 * 真正的开始
 */
var decoder = null;

var isInited = false;
var isFailed = false;
var mailBox = [];

function main() {
    try {
        decoder = new Decoder();
        decoder.initDecoder(videoCallback, audioCallback);
        clearMailBox();
        isInited = true;
    } catch (e) {
        self.postMessage({
            type: "error",
            data: e
        })
        this.isFailed = true;
    }
}

function videoCallback(decoderId, buff, size, pts, paramJsonStr) {
    var outArray = Module.HEAPU8.subarray(buff, buff + size);
    var data = new Uint8Array(outArray);
    var meta = JSON.stringify(paramJsonStr);
    self.postMessage({
        type: "decoder-videoFrame",
        data: {
            decoderId: decoderId,
            data: data,
            meta: meta,
            pts: pts
        }
    }, [data.buffer])
}

function audioCallback(decoderId, buff, size, pts, paramJsonStr) {
    var outArray = Module.HEAPU8.subarray(buff, buff + size);
    var data = new Uint8Array(outArray);
    var meta = JSON.stringify(paramJsonStr);
    self.postMessage({
        type: "decoder-audioFrame",
        data: {
            decoderId: decoderId,
            data: data,
            meta: meta,
            pts: pts
        }
    }, [data.buffer])
}

function clearMailBox() {
    mailBox.forEach(it => messageHandler(it));
    mailbox = [];
}

function messageHandler(e) {
    var type = e.data.type;
    var data = e.data.data;
    switch (type) {
        case "uninitDecoder":
            decoder.uninitDecoder();
            break;
        case "openDecoder":
            decoder.openDecoder(data.decoderId, data.fileName);
            break;
        case "closeDecoder":
            decoder.closeDecoder(data.decoderId);
            break;
        case "inputData":
            decoder.inputData(data.decoderId, data.data);
            break;
    }
}

self.addEventListener("message", function (e) {
    if (isInited) {
        messageHandler(e);
    } else if (!isFailed) {
        mailBox.push(e);
    }
})

self.Module = {
    onRuntimeInitialized: function () {
        main();
    }
};

importScripts("./libffmpeg.js");