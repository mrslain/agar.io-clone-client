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

    do @ctx.beginPath
    i = 0.5 + (width2 / 2 -@camera.loc.x) % @size
    while i < width2
      @ctx.moveTo i, 0
      @ctx.lineTo i, height2
      i += @size
    do @ctx.stroke

    do @ctx.beginPath
    i = 0.5 + (-@camera.loc.y + height2 / 2) % @size
    while i < height2
      @ctx.moveTo 0, i
      @ctx.lineTo width2, i
      i += @size
    do @ctx.stroke
    do @ctx.restore

    do @ctx.save
    @ctx.translate @world.window.width / 2, @world.window.height / 2
    @ctx.scale @scale.x, @scale.y
    @ctx.translate -@camera.loc.x, -@camera.loc.y
    do @ctx.restore

    if @world.debug.enable
      do @ctx.save
      do @ctx.beginPath
      @ctx.strokeStyle = "#ff0000"
      @ctx.globalAlpha = .1
      @ctx.lineWidth = 4
      @ctx.moveTo @world.window.width/2, 0
      @ctx.lineTo @world.window.width/2, @world.window.height
      @ctx.moveTo 0, @world.window.height/2
      @ctx.lineTo @world.window.width, @world.window.height/2
      do @ctx.stroke
      do @ctx.restore
