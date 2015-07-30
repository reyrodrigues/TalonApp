var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var templateCache = require('gulp-angular-templatecache');

var paths = {
    sass: ['./scss/**/*.scss'],
    js: ['./js/**/*.js'],
    js: ['./templates/**/*.html'],
};


gulp.task('templateCache', function () {
    return gulp.src('templates/**/*.html')
        .pipe(templateCache({
            templateHeader: 'angular.module("talon.templates", []).run(["$templateCache", function($templateCache) {',
            templateBody: '$templateCache.put("templates/<%= url %>","<%= contents %>");'
        }))
        .pipe(gulp.dest('www/js/'));
});

gulp.task('default', ['sass', 'scripts', 'templateCache', 'compress']);

gulp.task('compress',['scripts'], function () {
    return gulp.src('./build/*.js')
        .pipe(ngAnnotate())
        .pipe(uglify({
         mangle: true
        }))
        .pipe(gulp.dest('./www/js/'));
});


gulp.task('sass', function (done) {
    gulp.src('./scss/ionic.app.scss')
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(gulp.dest('./www/css/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(gulp.dest('./www/css/'))
        .on('end', done);
});

gulp.task('scripts', function () {
    return gulp.src('./js/**/*.js')
        .pipe(concat('app.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, ['sass']);
    gulp.watch(paths.js, ['default']);
    gulp.watch(paths.html, ['default']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
        .on('log', function (data) {
            gutil.log('bower', gutil.colors.cyan(data.id), data.message);
        });
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});
