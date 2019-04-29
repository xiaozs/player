require(["myPlayer"], function (myPlayer) {
    var loader = new myPlayer.Loader();
    loader.on("progress", function (chunk) {
        console.log(chunk.byteLength);
    })
    loader.open("./video.mp4");
})