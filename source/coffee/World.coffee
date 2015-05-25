class World
  constructor: (config) ->
    @canvas = document.getElementById "canvas"
    @ctx = @canvas.getContext "2d"

    @fps = 60
    @interval = 1000 / @fps

    @scale = new Vector 1.0, 1.0

    @window =
      width: window.innerWidth
      height: window.innerHeight

    @scene =
      width: 10000
      height: 10000

    @mouse = new Vector

    @camera = new Camera
      world: @

    @players = new BlobSystem
      world: @
      speed: new Vector 3, 3
      camera: @camera

    @players.addBlob
      id: "slain"
      name: "Slain"
      color: { r: 224, g: 0, b: 0 }
      mass: 50
      mouse: @mouse
      loc: new Vector 0, 0

    @players.addBlob
      id: "bot1"
      name: "Bot 1"
      color: { r: 0, g: 88, b: 224 }
      mass: 50
      loc: new Vector 900, 1500

    @players.addBlob
      id: "bot2"
      name: "Bot 2"
      color: { r: 125, g: 224, b: 0 }
      mass: 250
      loc: new Vector 400, 600

    @map = new Map
      world: @
      camera: @camera

    @canvas.addEventListener "mousemove", @event.onMousemove.bind(@), no
    window.addEventListener "resize", @event.onResize.bind(@), on
    do @event.onResize.bind @

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

    @ctx.fillStyle = '#F2FBFF';
    @ctx.fillRect 0, 0, @window.width, @window.height

    do @draw

    window.setTimeout( =>
      requestAnimationFrame @tick.bind @
    , @interval)
  update: ->
    do @camera.update
    do @players.update
  draw: ->
    do @map.draw
    do @players.draw
