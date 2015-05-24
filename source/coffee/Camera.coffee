class Camera
	constructor: (config) ->
		@world = config.world
		@loc = config.loc || new Vector

		@deadzone = new Vector(@world.window.width / 2, @world.window.height / 2)
		return @
	setPlayer: (player) ->
		@player = player
		return @
	update: ->
		@loc.copy @player.loc.clone().subtract(@deadzone)
