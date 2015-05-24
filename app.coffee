exports.run = () ->
	require 'coffee-script'

	log       = require('logule').init(module);
	express   = require 'express'
	app       = module.exports = express()
	app.log   = log

	require('./config.coffee')(app, express)
	require('./routes.coffee')(app)

	port = process.env.PORT || 1337
	app.listen port, (req, res) ->
		log.info "Express server listening on port #{port}"
