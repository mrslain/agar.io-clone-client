gulp = require 'gulp'
coffee = require 'gulp-coffee'
concat = require 'gulp-concat'
uglify = require 'gulp-uglify'
stylus = require 'gulp-stylus'

# Compiles CoffeeScript files into javascripts files
gulp.task 'coffee', ->
  gulp.src('source/coffee/**/*.coffee')
    .pipe(concat 'app.coffee')
    .pipe(do coffee)
    #.pipe(do uglify)
    .pipe(gulp.dest 'public/javascripts')

# Compiles Stylus files into stylesheets files
gulp.task 'stylus', ->
  gulp.src('source/stylus/**/*.styl')
    .pipe(stylus { compress: true })
    .pipe(concat 'app.css')
    .pipe(gulp.dest 'public/stylesheets')

gulp.task 'default', ->
  gulp.run 'coffee', 'stylus'

gulp.task 'watch', ->
  # Watches files for changes
  gulp.watch 'source/coffee/**', ->
    gulp.run 'coffee'

  gulp.watch 'source/stylus/**', ->
    gulp.run 'stylus'
