var portscanner = require("portscanner");
var express = require("express");
var path = require("path");
var chunksStream = require("chunks-stream");
var fs = require("fs");
var stream = require("stream");
var Transform = stream.Transform;
var PassThrough = stream.PassThrough;

async function main() {
    var port = await portscanner.findAPortNotInUse(3000, 4000);


    var app = express();
    var staticPath = process.cwd();
    var demoPath = path.resolve(staticPath, "./demo");
    var distPath = path.resolve(staticPath, "./dist");
    var nodeModulesPath = path.resolve(staticPath, "./node_modules");

    app.use("*.mp4", function (req, res) {
        let filePath = path.resolve(demoPath, "." + req.originalUrl);
        res.setHeader("Transfer-Encoding", "chunked");
        fs.createReadStream(filePath)
            .pipe(new chunksStream(200))
            .pipe(res);
    })

    app.use(express.static(demoPath));
    app.use("/dist", express.static(distPath));
    app.use("/node_modules", express.static(nodeModulesPath));

    app.listen(port, function () {
        console.log(`服务器已在端口${port}打开`);
    })
}

main();