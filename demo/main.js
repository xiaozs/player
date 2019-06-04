require(["../dist/index"], function (myPlayer) {
    var template = $("#template").html();
    var $container = $("#container");

    $("#add").click(function () {
        var $new = $(template);
        $new.on("click", ".play", onPlay)
            .on("click", ".pause", onPause)
            .on("click", ".fullscreen", onFullscreen);
        $container.append($new);
    })

    function getPlayer($item) {
        var player = $item.data("player");
        if (!player) {
            var url = $.trim($item.find(".input").val());
            var canvas = $item.find(".canvas")[0];
            var player = new myPlayer.Player({
                canvas: canvas,
                url: url,
                fileName: url.replace(/.*\.(.*)$/, "$1"),
                loaderType: "live",
                workerUrl: "./dist/decodeWorker.js"
            });
            $item.data("player", player);
        }
        return player;
    }

    function onPlay() {
        var $item = $(this).parents(".item");
        var player = getPlayer($item);
        player.play();
    }

    function onPause() {
        var $item = $(this).parents(".item");
        var player = getPlayer($item);
        player.pause();
    }

    function onFullscreen() {
        var $item = $(this).parents(".item");
        var canvas = $item.find(".canvas")[0];
        canvas.requestFullscreen();
    }
})