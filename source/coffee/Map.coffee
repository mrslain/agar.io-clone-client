class Map
	constructor: (config) ->
		@world = config.world
		@camera = config.camera
		@scene = @world.scene
		@scale = @world.scale || new Vector 1.0, 1.0
		@ctx = @world.ctx
		@size = 50
	draw: ->
		do @ctx.save
		@ctx.globalAlpha = .2
		@ctx.lineWidth = .5
		@ctx.scale @scale.x, @scale.y

		width2 = @world.window.width / @scale.x
		height2 = @world.window.height / @scale.y

		i = 0.5 + (width2 / 2 -@camera.loc.x) % @size
		while i < width2
			do @ctx.beginPath
			@ctx.moveTo i, 0
			@ctx.lineTo i, height2
			do @ctx.stroke
			i += @size

		i = 0.5 + (-@camera.loc.y + height2 / 2) % @size
		while i < height2
			do @ctx.beginPath
			@ctx.moveTo 0, i
			@ctx.lineTo width2, i
			do @ctx.stroke
			i += @size

		do @ctx.restore

		do @ctx.save
		@ctx.translate @world.window.width / 2, @world.window.height / 2
		@ctx.scale @scale.x, @scale.y
		@ctx.translate -@camera.loc.x, -@camera.loc.y
		do @ctx.restore
