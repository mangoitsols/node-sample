var gulp = require("gulp");
var babel = require("gulp-babel");
var nodemon = require("gulp-nodemon");

gulp.task("copyDeps", function () {
    return gulp.src(["package.json", "web.config"])
        .pipe(gulp.dest("dist/"));
});

gulp.task("copyDocs", function () {
    return gulp.src(["src/Documents/**/*.*"])
        .pipe(gulp.dest("dist/Documents/"));
});

gulp.task("build", ['copyDeps', 'copyDocs'], function () {
    return gulp.src("src/**/*.js")
        .pipe(babel())
        .pipe(gulp.dest("dist/"));
});

gulp.task('run', function () {
    nodemon({
        ignore: ["dist/", "log/", "node_modules/"],
        script: 'dist/server.js',
        ext: 'js',
        tasks: ['build']
    })
});

gulp.task('default', ['run'], function () { });
