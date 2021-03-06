'use strict'

// References to gulp and all the gulp plugins
var gulp = require('gulp')
var clean = require('gulp-clean')
var concat = require('gulp-concat')
var gutil = require('gulp-util')
var imagemin = require('gulp-imagemin')
var print = require('gulp-print')
var rename = require('gulp-rename')
var sass = require('gulp-sass')
var stream = require('stream')
var streamify = require('gulp-streamify')
var template = require('gulp-template')
var uglify = require('gulp-uglify')
var watch = require('gulp-watch')

// Other node libraries
var _ = require('underscore')
var browserify = require('browserify')
var serialize = require('node-serialize')
var stream = require('stream')
var source = require('vinyl-source-stream')


// Get configuration information from the JSON files
var pkg = require('./package.json')

gutil.log(gutil.colors.yellow('Name'), gutil.colors.cyan(pkg.name))
gutil.log(gutil.colors.yellow('Version'), gutil.colors.cyan(pkg.version))


gulp.task('clean', function() {
	gulp.src('build', {read: false})
		.pipe(clean())
})

gulp.task('images', function(){
	return gulp.src('./src/main/images/**')
		.pipe(imagemin())
		.pipe(gulp.dest('./build/dist/images'))
		.pipe(gulp.dest('./build/dev/images'))
})

gulp.task('vendor', function() {
	return browserify()
		.require('jquery')
		.require('react')
		.require('underscore')
		.bundle()
		.pipe(source('vendor.js'))
		.pipe(gulp.dest('./build/dev'))
		.pipe(rename('vendor-'+ pkg.version +'.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest('./build/dist'))
})

gulp.task('bundle', function() {
	return browserify({
			entries: ['./src/main/js/app.js'],
			extensions: ['.jsx'],
		})
		.exclude('jquery')
		.exclude('react')
		.exclude('underscore')
		.bundle()
		.pipe(source('bundle.js'))
		.pipe(gulp.dest('./build/dev'))
		.pipe(rename('bundle-'+ pkg.version +'.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest('./build/dist'))
})

gulp.task('styles', function () {
	return gulp.src('./src/main/scss/*.scss')
		.pipe(print())
		.pipe(concat('styles.scss'))
		.pipe(sass({
			outputStyle: 'expanded',
			errLogToConsole: true
		}))
		.pipe(gulp.dest('./build/dev'))
		.pipe(sass({
			outputStyle: 'compressed',
			errLogToConsole: true
		}))
		.pipe(rename("styles-"+ pkg.version +".css"))
		.pipe(gulp.dest('./build/dist'))
})

gulp.task('config', function () {
	delete require.cache[require.resolve('./config.json')]
	var config = require('./config.json')
	config.app_name = pkg.name
	config.version = pkg.version

	var config_json = serialize.serialize(config)

	gutil.log("Configuration", gutil.colors.cyan(config_json))

	return string_src("config.js", "_config = "+ config_json)
		.pipe(print())
		.pipe(gulp.dest('build/dev'))
		.pipe(gulp.dest('build/dist'))
})


gulp.src('./src/index.html')
  .pipe(gulp.dest("./dist"));

gulp.task('index-dev', function () {
	return index_stream([css_tag('styles.css'), js_tag('vendor.js'), js_tag('bundle.js')])
		.pipe(gulp.dest('build/dev'))
})

gulp.task('index-dist', function () {
	return index_stream([css_tag('styles-'+ pkg.version +'.css'), js_tag('vendor-'+ pkg.version +'.js'), js_tag('bundle-'+ pkg.version +'.js')])
		.pipe(gulp.dest('build/dist'))
})

gulp.task('index', ['index-dev', 'index-dist'])


gulp.task('build', ['styles', 'vendor', 'bundle', 'images', 'index', 'config'])


gulp.task('watch', ['build'], function() {
	gulp.watch('config.json', ['config'])
	gulp.watch('src/main/images/**', ['images'])
	gulp.watch('src/main/js/**/*.js', ['bundle'])
	gulp.watch('src/main/js/**/*.jsx', ['bundle'])
	gulp.watch('src/main/scss/*.scss', ['styles'])
	gulp.watch('src/main/index.tmpl', ['index'])
})


gulp.task('default', ['build'])


function js_tag(path) {
	return '<script src="'+ path +'"></script>'
}

function css_tag(path) {
	return '<link rel="stylesheet" href="'+ path +'">'
}

function index_stream(includes) {

	includes = [js_tag('config.js')].concat(includes)
	gutil.log(includes)

	return gulp.src('src/main/index.tmpl')
		.pipe(rename('index.html'))
		.pipe(template({ includes: includes.join("\n") }))
		.on('error', gutil.log)
}

function string_src(path, string) {
	var src = stream.Readable({ objectMode: true })
	src._read = function () {
		this.push(new gutil.File({ cwd: "", base: "", path: path, contents: new Buffer(string) }))
		this.push(null)
	}
	return src
}
