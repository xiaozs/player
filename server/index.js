var portscanner = require("portscanner");
var express = require("express");
var path = require("path");
var proxy = require("http-proxy-middleware");

async function main() {
    var port = await portscanner.findAPortNotInUse(3000, 4000);


    var app = express();
    var staticPath = process.cwd();
    var demoPath = path.resolve(staticPath, "./demo");
    var distPath = path.resolve(staticPath, "./dist");
    var nodeModulesPath = path.resolve(staticPath, "./node_modules");

    app.use(express.static(demoPath));
    app.use("/GoVideo", proxy({
        target: 'http://127.0.0.1:8004',
        changeOrigin: true
    }));

    app.use(function (req, res, next) {
        if (!req.url.startsWith("/playback_m")) return next();
        console.log("test")
        proxy({
            target: 'http://127.0.0.1:8005',
            changeOrigin: true
        })(req, res, next);
    });


    app.use("/dist", express.static(distPath, {
        setHeaders(res, path) {
            if (/\.wasm$/.test(path)) {
                res.setHeader("content-type", "application/wasm")
            }
        }
    }));
    app.use("/node_modules", express.static(nodeModulesPath));

    app.listen(port, function () {
        console.log(`服务器已在端口${port}打开: http://localhost:${port}/`);
    })
}

main();