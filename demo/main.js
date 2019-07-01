require(["../dist/index"], function (myPlayer) {
    var template = $("#template").html();
    var $container = $("#container");
    var $nav = $("#nav");

    $.get("/GoVideo/Device/RecordFileRetrievalRequest").then(function (data) {
        data.Message.RcdContent.map(function (it) {
            $("<div class='file'>" + it.RcdFilename + "</div>")
                .data("fileData", it)
                .appendTo($nav);
        })
    });

    $nav.on("click", ".file", function () {
        var data = $(this).data("fileData");
        getUrl(data).then(function (data) {
            addPlayer(data.Message.RecFileURI.replace("http://127.0.0.1:8005", ""));
        })
    })

    function getUrl(data) {
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

    function addPlayer(url) {
        var $new = $(template);
        $new.on("click", ".play", onPlay(url))
            .on("click", ".pause", onPause(url))
            .on("click", ".fullscreen", onFullscreen);
        $container.append($new);
    }

    function getPlayer($item, url) {
        var player = $item.data("player");
        if (!player) {
            var canvas = $item.find(".canvas")[0];
            var player = new myPlayer.Player({
                canvas: canvas,
                url: url,
                fileName: "ts", // url.replace(/.*\.(.*)$/, "$1"),
                // loaderType: "live",
                workerUrl: "./dist/decodeWorker.js"
            });
            $item.data("player", player);
        }
        return player;
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
})