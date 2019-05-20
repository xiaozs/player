require(["../dist/index"], function (myPlayer) {
    var canvas = document.getElementById("canvas");
    var player;
    document.getElementById("play").addEventListener("click", function () {
        var url = document.getElementById("input").value;

        player = new myPlayer.Player({
            url: url,
            fileName: url.replace(/.*\.(.*)$/, "$1"),
            loaderType: "live",
            canvas: canvas,
            workerUrl: "./dist/decodeWorker.js"
        });
        player.play();
    })
    document.getElementById("pause").addEventListener("click", function () {
        player.pause();
    })
    document.getElementById("fullscreen").addEventListener("click", function () {
        canvas.requestFullscreen();
    })
})