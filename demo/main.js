
var template = $("#template").html();
var $container = $("#container");
var $nav = $("#nav");

$.get("/GoVideo/Device/RecordFileRetrievalRequest").then(function (data) {
    data.Message.RcdContent.map(function (it) {
        $("<div class='file'>" + it.RcdFilename + "</div>")
            .data("fileData", it)
            .appendTo($nav);
    })
    $("<div class='file'>local</div>")
        .data("fileData", {
            url: "./tss/test.m3u8"
        })
        .appendTo($nav);
});

$nav.on("click", ".file", function () {
    var data = $(this).data("fileData");
    getUrl(data).then(function (data) {
        addPlayer(data.Message.RecFileURI.replace("http://127.0.0.1:8005", ""));
    })
})

function getUrl(data) {
    if (data.url) {
        var def = $.Deferred();
        return def.resolve({
            Message: {
                RecFileURI: data.url
            }
        })
    } else {
        return $.post("/GoVideo/Device/RecordFileOperRequest", JSON.stringify({
            "Message": {
                "OperType": 2,
                "RcdFilename": data.RcdStartTime + "," + data.RcdStartTime + "," + data.RcdEndTime,
                "DevID": data.DevID,
                "ChnID": data.ChnID,
                "StorageType": data.StorageType,
                "RelevantReason": data.RelevantReason,
                "IPAddr": 0,
                "StreamEncodeInfo": {
                    "VideoStreamID": 17,
                    "Width": 704,
                    "Height": 576,
                    "Rate": 12.5,
                    "VBitrate": 1024,
                    "AudioStreamcodeid": 770,
                    "Samples": 8000,
                    "Bits": 16,
                    "Channel": 1,
                    "ABitrate": 16,
                    "StandardStream": 0
                },
                "DirectDevice": 1,
                "StreamAgentType": 6
            }
        }))
    }
}

function addPlayer(url) {
    var $new = $(template);
    $new.on("click", ".play", onPlay(url))
        .on("click", ".pause", onPause(url))
        .on("click", ".destroy", onDestroy)
        .on("click", ".fullscreen", onFullscreen)
        .on("click", ".range", onRangeChange)
        .on("click", ".frame-m-1", toFrame(-1))
        .on("click", ".frame-a-1", toFrame(+1))
        .on("click", ".frame-m-5", toFrame(-5))
        .on("click", ".frame-a-5", toFrame(+5))
        .on("click", ".rate-4", rate(-4))
        .on("click", ".rate-1", rate(-1))
        .on("click", ".rate0-5", rate(0.5))
        .on("click", ".rate1", rate(1))
        .on("click", ".rate2", rate(2))
        .on("click", ".rate4", rate(4))
    $container.append($new);
    getPlayer($new, url);
}

function getPlayer($item, url) {
    var player = $item.data("player");
    if (!player) {
        var canvas = $item.find(".canvas")[0];
        var player = new GoVideo.Player({
            canvas: canvas,
            url: url,
            fileName: "ts", // url.replace(/.*\.(.*)$/, "$1"),
            // loaderType: "live",
            workerUrl: "./dist/decodeWorker.js"
        });
        $item.data("player", player);
        player.on("meta", onMeta($item));
        player.on("frame", onFrame($item))
        player.on("error", function (e) { console.error(e) });
        player.on("end", function () { console.log("播放完毕") });
        player.on("loading", function () { $item.find(".loading").show() })
        player.on("unloading", function () { $item.find(".loading").hide() })
    }
    return player;
}

function onDestroy() {
    var $item = $(this).parent(".item");
    var player = $item.data("player");
    player.destroy()
    $item.remove();
}

function rate(val) {
    return function () {
        var player = $(this).parent(".item").data("player");
        player.rate = val;
    }
}

function toFrame(index) {
    return function () {
        var player = $(this).parent(".item").data("player");
        player.toFrame(index);
    }
}

function onMeta($item) {
    return function (data) {
        $item.find(".range").data("max", data.duration);
    }
}

function onFrame($item) {
    return function (data) {
        let max = $item.find(".range").data("max");
        let percent = data / max * 100;
        $item.find(".range-inner").css("width", percent + "%");
    }
}

function onRangeChange(e) {
    var $this = $(this);
    var player = $this.parent(".item").data("player");

    var x = e.offsetX;
    var width = $this.width();
    var max = $this.data("max");

    var num = x / width * max;
    player.seek(num);
}

function onPlay(url) {
    return function () {
        var $item = $(this).parents(".item");
        var player = getPlayer($item, url);
        player.play();
    }
}

function onPause(url) {
    return function () {
        var $item = $(this).parents(".item");
        var player = getPlayer($item, url);
        player.pause();
    }
}

function onFullscreen() {
    var $item = $(this).parents(".item");
    var canvas = $item.find(".canvas")[0];
    canvas.requestFullscreen();
}