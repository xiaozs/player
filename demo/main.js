require(["../dist/index"], function (myPlayer) {
    var player;
    document.getElementById("play").addEventListener("click", function () {
        var url = document.getElementById("input").value;

        player = new myPlayer.Player({
            url: url,
            fileName: url.replace(/.*\.(.*)$/, "$1"),
            loaderType: "live",
            canvas: document.getElementById("canvas"),
            workerUrl: "./dist/decodeWorker.js"
        });
        player.play();
    })
    document.getElementById("pause").addEventListener("click", function () {
        player.pause();
    })
})