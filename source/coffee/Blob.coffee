class BlobSystem
  constructor: (config) ->
    @world = config.world
    @speed = config.speed
    @camera = config.camera
    @blobs = []
    return @
  update: ->
    do blob.update for blob in @blobs when blob
    no
  draw: ->
    do blob.draw for blob in @blobs when blob
    no
  getBlobById: (id) ->
    i = 0
    while i < @blobs.length
      if @blobs[i].id == id
        return @blobs[i]
      i++
    no
  addBlob: (config) ->
    config.system = @
    config.world = @world
    config.speed = @speed
    config.camera = @camera
    @blobs.push new Blob config
  removeBlob: (index) -> @blobs.splice index, 1

class Blob
  constructor: (config) ->
    @loc = config.loc || new Vector
    @world = config.world
    @name = config.name
    @id = config.id
    @color = config.color
    @speed = config.speed
    @mass = config.mass
    @scene = @world.scene
    @ctx = @world.ctx

    @mouse = config.mouse
    @camera = config.camera
    if @mouse then @camera.setPlayer @
  move: ->
      target = do @mouse.clone
      target.subtract do @camera.loc.clone().invert
      target.divide @world.scale
      target.subtract @loc

      magnitude = do target.magnitude

      target.divide new Vector(magnitude, magnitude)
      target.multiply @speed
      @loc.add target

      radius = @radius / 2
      if @loc.x - radius < 0
        @loc.x = radius

      if @loc.y - radius < 0
        @loc.y = radius

      if @loc.x + radius > @scene.width
        @loc.x = scene.width - @radius

      if @loc.y + radius > @scene.height
        @loc.y = @scene.height - radius
  update: ->
    @radius = @mass / @world.scale.x
    if @mouse
      do @move
  draw: ->
    do @ctx.save
    loc = @loc.clone().subtract @camera.loc
    do @ctx.beginPath
    @ctx.lineWidth = 10 / @world.scale.x
    @ctx.fillStyle = "rgb(#{@color.r}, #{@color.g}, #{@color.b})"
    @ctx.strokeStyle = "rgb(#{@color.r-30}, #{@color.g-30}, #{@color.b-30})"
    @ctx.arc loc.x, loc.y, @radius, 0, Math.PI * 2, true
    do @ctx.fill
    do @ctx.stroke

    do @ctx.beginPath
    @ctx.font = "normal #{(@radius / 4) + 8}px Arial"
    @ctx.lineWidth = 1 * @world.scale.x
    @ctx.fillStyle = "#FFFFFF"
    @ctx.strokeStyle = "#000000"
    @ctx.textAlign = "center"
    @ctx.textBaseline = 'middle'
    @ctx.strokeText @name, loc.x, loc.y
    @ctx.fillText @name, loc.x, loc.y
    do @ctx.restore
