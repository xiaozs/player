require(["../dist/index"], function (myPlayer) {
    var player = new myPlayer.Player({
        url: "./video.mp4",
        loaderType: "live",
        canvas: document.getElementById("canvas"),
        workerUrl: "./dist/decodeWorker.js"
    });
    player.play();
})