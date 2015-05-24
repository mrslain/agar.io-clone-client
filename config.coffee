module.exports = (app, express) ->
  bodyParser = require 'body-parser'

  app.use bodyParser.urlencoded
    extended: true
  app.set 'views', __dirname + '/views'
  app.set 'view engine', 'jade'
  app.use express.static(__dirname + '/public')

  # env = process.env.NODE_ENV || 'development'
  # if 'development' == env
  #   app.use express.errorHandler({ dumpExveption: true, showStack: true })
  # if 'production' == env
  #   app.use express.errorHandler()