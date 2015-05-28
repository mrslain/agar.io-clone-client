class BlobSystem
  constructor: (config) ->
    @world  = config.world   || no
    @mouse  = config.mouse   || no
    @camera = config.camera  || no
    @blobs  = config.blobs   || []
  createBlob: (config) ->
    config.system = @
    config.world  = @world
    config.mouse  = @mouse
    config.camera = @camera
    @blobs.push new Blob config
    return
  getBlob: (id) ->
    return blob for blob in @blobs when blob.id == id
    return no
  update: ->
    do blob.update for blob in @blobs when blob
    return
  draw: ->
    do blob.draw for blob in @blobs when blob
    return

class Joint
  constructor: (config) ->
    @node     = config.node
    @strength = config.strength || new Vector 0.6, 0.6
    @strain   = config.strain   || new Vector

class Node
  constructor: (config) ->
    @normal   = config.normal   || new Vector
    @target   = config.target   || new Vector
    @position = config.position || new Vector
    @ghost    = config.ghost    || new Vector
    @angle    = config.angle    || 0
    @joints   = config.joints   || []

class Blob
  constructor: (config) ->
    @world    = config.world    || no
    @ctx      = @world.ctx

    @id       = config.id
    @name     = config.name     || no
    @color    = config.color    || { r: 255, g: 0, b: 0 }
    @camera   = config.camera   || no
    @mouse    = config.mouse    || no
    @controll = config.controll || no

    if @controll then @camera.follow(@)

    @position = config.position || new Vector
    @velocity = config.velocity || new Vector
    @radius   = config.radius   || 120
    @quality  = config.quality  || 32

    @friction = config.friction || new Vector(1.035, 1.035)
    @nodes    = config.nodes    || []

    do @createNodes
  createNodes: ->
    @nodes = []
    for i in [1..@quality]
      node = new Node
        ghost: do @position.clone
        position: do @position.clone
      @nodes.push node

    do @updateJoints
    do @updateNormals
    return
  updateJoints: ->
    i = 0
    while i < @quality
      node = @nodes[i]
      node.joints = []
      node.joints.push new Joint
        node: @nodes.elementByOffset(i, -1)
      node.joints.push new Joint
        node: @nodes.elementByOffset(i, 1)
      node.joints.push new Joint
        node: @nodes.elementByOffset(i, -2)
      node.joints.push new Joint
        node: @nodes.elementByOffset(i, 2)
      i++
    return
  updateNormals: ->
    i = 0
    while i < @quality
      node = @nodes[i]
      node.angle = ((i / @quality) * Math.PI * 2)
      node.target.copy new Vector(
        Math.cos(node.angle) * @radius,
        Math.sin(node.angle) * @radius
      )
      if node.normal.x == 0 && node.normal.y == 0
        node.normal.copy node.target
      i++
    return
  update: ->
    if @position.x > @world.scene.width
      @velocity.x -= (@position.x - (@world.scene.width)) * 0.05
      @friction.y = 1.07
    else if @position.x < 0
      @velocity.x += Math.abs(@position.x) * 0.05
      @friction.y = 1.07
    if @position.y > @world.scene.height
      @velocity.y -= (@position.y - (@world.scene.height)) * 0.05
      @friction.x = 1.07
    else if @position.y < 0
      @velocity.y += Math.abs(@position.y) * 0.05
      @friction.x = 1.07

    @velocity.divide @friction

    camera = do @camera.loc.clone
    do camera.invert

    target = do @mouse.clone

    target.subtract camera
    target.subtract @position

    magnitude = do target.magnitude
    target.divide new Vector(magnitude, magnitude)

    target.multiply new Vector(5, 5) # Speed

    if @controll
      @position.add(target)
      do @updateNormals

    @position.add @velocity

    i = 0
    while i < @quality
      node = @nodes[i]
      node.ghost.copy node.position

      node.normal.add node.target.clone().subtract(node.normal).multiply(new Vector(0.05, 0.05))

      position = do @position.clone

      position.subtract(@camera.loc)

      j = 0
      while j < node.joints.length
        joint = node.joints[j]
        normal = joint.node.normal.clone().subtract(node.normal)
        ghost = joint.node.ghost.clone().subtract(node.ghost)
        joint.strain.copy ghost.subtract(normal)
        position.add joint.strain.multiply(joint.strength)
        j++

      position.add(node.normal)

      node.position.add position.subtract(node.position).multiply(new Vector(0.1, 0.1))

      node.position.x = Math.max( Math.min( node.position.x, @world.scene.width + camera.x), camera.x)
      node.position.y = Math.max( Math.min( node.position.y, @world.scene.height + camera.y), camera.y)
      i++

    if @controll
      @world.debug.set("Target", target)
      @world.debug.set("Mouse", @mouse,)
      @world.debug.set("Window", @world.window, "size")
      @world.debug.set("Scene", @world.scene, "size")
      @world.debug.set("Camera", @camera.loc)
      @world.debug.set("Velocity", @velocity)

    @world.debug.set("Object:#{@name}", @position)
    return
  draw: ->
    if !@world.debug.enable
      do @ctx.save
      do @ctx.beginPath
      @ctx.fillStyle = "rgb(#{@color.r}, #{@color.g}, #{@color.b})"
      @ctx.strokeStyle = "rgb(#{@color.r-30}, #{@color.g-30}, #{@color.b-30})"
      @ctx.lineWidth = 15

      node = @nodes.elementByOffset(0, -1)
      next = @nodes.elementByOffset(0, 0)

      @ctx.moveTo( node.position.x + ( next.position.x - node.position.x ) / 2, node.position.y + ( next.position.y - node.position.y ) / 2 )

      i = 0
      while i < @quality
        node = @nodes.elementByOffset(i, 0)
        next = @nodes.elementByOffset(i, 1)

        @ctx.quadraticCurveTo( node.position.x, node.position.y, node.position.x + ( next.position.x - node.position.x ) / 2, node.position.y + ( next.position.y - node.position.y ) / 2 )
        i++

      do @ctx.stroke
      do @ctx.fill
      do @ctx.restore

    if @world.debug.enable
      i = 0
      while i < @quality
        node = @nodes.elementByOffset(i, 0)
        next = @nodes.elementByOffset(i, 1)

        do @ctx.save
        do @ctx.beginPath
        @ctx.lineWidth = 1
        @ctx.strokeStyle = '#ababab'

        j = 0
        while j < node.joints.length
          joint = node.joints[j]
          @ctx.moveTo(node.position.x, node.position.y)
          @ctx.lineTo(joint.node.position.x, joint.node.position.y)
          j++

        do @ctx.stroke
        do @ctx.restore

        do @ctx.save
        do @ctx.beginPath
        @ctx.fillStyle = if i == 1 then '#00ff00' else '#dddddd'
        @ctx.arc node.position.x, node.position.y, 5, 0, Math.PI * 2, true
        do @ctx.fill
        do @ctx.restore
        i++
    return
