class Camera
  constructor: (config) ->
    @world = config.world
    @loc = config.loc || new Vector
    @blob = no

    @viewport = new Rectangle(@loc.x, @loc.y, @world.window.width,  @world.window.height)
    @deadzone = new Vector(@world.window.width / 2, @world.window.height / 2)
    return @
  follow: (blob) ->
    @blob = blob
    return @
  update: ->
    if @blob != no
      @loc.copy @blob.position.clone().subtract(@deadzone)
