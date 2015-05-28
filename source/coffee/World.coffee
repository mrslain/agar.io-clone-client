class World
  constructor: (config) ->
    @debug = new Debug on

    @canvas = document.getElementById "canvas"
    @ctx = @canvas.getContext "2d"

    @fps = 60
    @interval = 1000 / @fps

    @scale = new Vector 1.0, 1.0

    @scene = new Rectangle(0, 0, 3000,  3000)

    @mouse = new Vector

    @canvas.addEventListener "mousemove", @event.onMousemove.bind(@), no
    window.addEventListener "resize", @event.onResize.bind(@), on
    do @event.onResize.bind @

    @camera = new Camera
      world: @

    @users = new BlobSystem
      world: @
      mouse: @mouse
      camera: @camera

    @users.createBlob
      name: "Slain"
      color: { r: 231, g: 62, b: 62 }
      position: new Vector(400, 400)
      controll: on

    @users.createBlob
      name: "Test"
      color: { r: 224, g: 224, b: 0 }
      position: new Vector(900, 900)

    @map = new Map
      world: @
      camera: @camera

    do @start
  event:
    onMousemove: (e) ->
      [@mouse.x, @mouse.y] = [e.clientX, e.clientY]
    onResize: (e) ->
      @window =
        width: window.innerWidth
        height: window.innerHeight
      @canvas.width = @window.width
      @canvas.height = @window.height
  start: -> do @tick
  tick: ->
    do @update
    do @draw

    window.setTimeout( =>
      requestAnimationFrame @tick.bind @
    , @interval)
  update: ->
    do @camera.update
    do @users.update
    do @debug.update
  draw: ->
    @ctx.fillStyle = '#F2FBFF';
    @ctx.fillRect 0, 0, @window.width, @window.height
    do @map.draw
    do @users.draw
