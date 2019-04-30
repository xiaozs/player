var del = require("del");
var gulp = require("gulp");
var childProcess = require("child_process")
var tsc = require("gulp-typescript");
tsc = tsc.createProject("./tsconfig.json");

gulp.task("default", ["build"]);
gulp.task("dev", ["watch-file", "watch-server"]);
gulp.task("clear", function () {
    return del("./dist");
});
gulp.task("copy-worker", ["clear"], function () {
    return gulp.src("./src/decoder/worker/*").pipe(gulp.dest("./dist"));
});
gulp.task("build", ["clear", "copy-worker"], function () {
    return gulp.src("./src/**/*.ts")
        .pipe(tsc())
        .pipe(gulp.dest("."))
});
gulp.task("watch-file", function () {
    gulp.start("build");
    gulp.watch(["./src/**/*", "./tsconfig.json"], ["build"]);
})
gulp.task("watch-server", function () {
    var child = childProcess.fork("./server/index.js");
    gulp.watch("./server/**/*", function () {
        child && child.kill('SIGKILL');
        child = childProcess.fork("./server/index.js");
    });
})