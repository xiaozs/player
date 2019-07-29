var del = require("del");
var gulp = require("gulp");
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var childProcess = require("child_process");
var tsify = require("tsify");
var uglify = require("gulp-uglify");
var sourcemaps = require('gulp-sourcemaps');
var browserify = require("browserify");

function swallowError(error) {
    // If you want details of the error in the console
    console.error(error.toString())
    this.emit('end')
}

gulp.task("default", ["build"]);
gulp.task("dev", ["watch-file", "watch-server"]);
gulp.task("clear", function () {
    return del("./dist");
});
gulp.task("copy-worker", ["clear"], function () {
    return gulp.src("./src/decoder/worker/*").pipe(gulp.dest("./dist"));
});
gulp.task("build", ["clear", "copy-worker"], function () {
    return browserify({ standalone: "GoVideo", debug: true })
        .add("./src/index.ts")
        .plugin(tsify)
        .bundle()
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify())
        .on("error", swallowError)
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest("./dist"));
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