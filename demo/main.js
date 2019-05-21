require(["../dist/index"], function (myPlayer) {
    var canvas = document.getElementById("canvas");
    var player = new myPlayer.Player(canvas);
    var screen = createScreen();

    document.getElementById("play").addEventListener("click", function () {
        var url = document.getElementById("input").value;
        if (!screen.isPlaying && screen.url === url) {
            screen.play();
        } else {
            screen.destroy();
            screen = createScreen();
            screen.play();
        }
    })
    document.getElementById("pause").addEventListener("click", function () {
        screen.pause();
    })
    document.getElementById("fullscreen").addEventListener("click", function () {
        canvas.requestFullscreen();
    })

    function createScreen() {
        var url = document.getElementById("input").value;
        return player.createScreen({
            url: url,
            fileName: url.replace(/.*\.(.*)$/, "$1"),
            loaderType: "live",
            workerUrl: "./dist/decodeWorker.js"
        });
    }
})