class BlobSystem
  constructor: (config) ->
    @world  = config.world   || no
    @camera = config.camera  || no
    @blobs  = config.blobs   || []
  createBlob: (config) ->
    config.system = @
    config.world  = @world
    config.camera = @camera
    @blobs.push new Blob config
    return
  update: ->
    do blob.update for blob in @blobs when blob
    return
  draw: ->
    do blob.draw for blob in @blobs when blob
    return

class Joint
  constructor: (config) ->
    @world    = config.world    || no
    @ctx      = @world.ctx

    @parent   = config.parent
    @node     = config.node
    @strength = config.strength || new Vector 1.6, 1.6
    @strain   = config.strain   || new Vector
  update: ->
    normal = @node.normal.clone().subtract(@parent.normal)
    ghost = @node.ghost.clone().subtract(@parent.ghost)
    @strain.copy ghost.subtract(normal)
    return @strain.clone().multiply(@strength)
  draw: ->
    @ctx.moveTo(@parent.position.x - @node.blob.camera.loc.x, @parent.position.y - @node.blob.camera.loc.y)
    @ctx.lineTo(@node.position.x - @node.blob.camera.loc.x, @node.position.y - @node.blob.camera.loc.y)
    return

class Node
  constructor: (config) ->
    @world    = config.world    || no
    @ctx      = @world.ctx

    @blob     = config.blob     || no

    @normal   = config.normal   || new Vector
    @target   = config.target   || new Vector
    @position = config.position || new Vector
    @ghost    = config.ghost    || new Vector

    @angle    = config.angle    || 0

    @joints   = config.joints   || []
  updateJoints: (index) ->
    @joints = []
    @joints.push new Joint
      world: @world
      parent: @
      node: @blob.nodes.elementByOffset(index,-1)
    @joints.push new Joint
      world: @world
      parent: @
      node: @blob.nodes.elementByOffset(index, 1)
    @joints.push new Joint
      world: @world
      parent: @
      node: @blob.nodes.elementByOffset(index,-2)
    @joints.push new Joint
      world: @world
      parent: @
      node: @blob.nodes.elementByOffset(index, 2)
    return
  updateNormals: (index) ->
    @angle = index / (@blob.quality + 1) * Math.PI * 2

    @target.copy(new Vector(
      Math.cos(@angle) * @blob.radius,
      Math.sin(@angle) * @blob.radius
    ))

    if @normal.x == 0 && @normal.y == 0
      @normal.copy(@target)
    return
  update: ->
    @ghost.copy(@position)

    @normal.add(@target.clone().subtract(@normal).multiply(new Vector(0.05, 0.05)))

    position = do @blob.position.clone

    for joint in @joints
      position.add(do joint.update)

    position.add(@normal)
    @position.add(position.subtract(@position).multiply(new Vector(0.1, 0.1)))

    @position.x = Math.max( Math.min( @position.x, @world.scene.width - 3), 3)
    @position.y = Math.max( Math.min( @position.y, @world.scene.height - 3), 3)
    return
  draw: (index) ->
    node = @blob.nodes.elementByOffset(index, 0)
    next = @blob.nodes.elementByOffset(index, 1)

    if @world.debug
      do @ctx.save
      do @ctx.beginPath
      @ctx.lineWidth = 1
      @ctx.strokeStyle = '#ababab'

      for joint in node.joints
        do joint.draw
      do @ctx.stroke
      do @ctx.restore

      do @ctx.save
      do @ctx.beginPath
      @ctx.fillStyle = if index == 1 then '#00ff00' else '#dddddd'
      @ctx.arc node.position.x - @blob.camera.loc.x, node.position.y - @blob.camera.loc.y, 5, 0, Math.PI * 2, true
      do @ctx.fill
      do @ctx.restore
    else
      current_node = node.position.clone().subtract(@blob.camera.loc)
      next_node = next.position.clone().subtract(@blob.camera.loc)

      @ctx.quadraticCurveTo(
        current_node.x,
        current_node.y,
        current_node.x + ( next_node.x - current_node.x ) / 2,
        current_node.y + ( next_node.y - current_node.y ) / 2
      )
      do @ctx.stroke
      do @ctx.fill
    return

class Blob
  constructor: (config) ->
    @world    = config.world    || no
    @ctx      = @world.ctx

    @name     = config.name     || no
    @color    = config.color    || { r: 255, g: 0, b: 0 }
    @camera   = config.camera   || no
    @mouse    = config.mouse    || no

    if @mouse then @camera.follow(@)

    @position = config.position || new Vector
    @velocity = config.velocity || new Vector
    @radius   = config.radius   || 120
    @quality  = config.quality  || 32
    @friction = config.friction || new Vector(1.035, 1.035)
    @nodes    = config.nodes    || []

    do @createNodes
  createNodes: ->
    @nodes = []
    for i in [0..@quality]
      @nodes.push new Node
        world: @world
        blob: @
        ghost: do @position.clone
        position: do @position.clone

    do @updateJoints
    do @updateNormals
    return
  updateJoints: ->
    node.updateJoints(index) for node, index in @nodes when node
    return
  updateNormals: ->
    node.updateNormals(index) for node, index in @nodes when node
    return
  update: ->
    if @position.x > @world.scene.width
      @velocity.x -= ( @position.x - @world.scene.width ) * 0.05
      @friction.y = 1.07
    else if @position.x < 0
      @velocity.x += Math.abs( @position.x ) * 0.05
      @friction.y = 1.07

    if @position.y > @world.scene.height
      @velocity.y -= ( @position.y - @world.scene.height ) * 0.05
      @friction.x = 1.07
    else if @position.y < 0
      @velocity.y += Math.abs( @position.y ) * 0.05
      @friction.x = 1.07

    @velocity.divide(@friction)
    @position.add(@velocity)

    if @mouse and @camera
      target = do @mouse.clone

      target.subtract do @camera.loc.clone().invert
      target.subtract @position

      magnitude = do target.magnitude
      target.divide new Vector(magnitude, magnitude)

      target.multiply new Vector(5, 5) # Speed

      @position.add(target)


    node.update(index) for node, index in @nodes when node
    return
  draw: ->
    if !@world.debug
      node = @nodes.elementByOffset(0, -1)
      next = @nodes.elementByOffset(0, 0)

      do @ctx.save
      do @ctx.beginPath
      @ctx.fillStyle = "rgb(#{@color.r}, #{@color.g}, #{@color.b})"
      @ctx.strokeStyle = "rgb(#{@color.r-30}, #{@color.g-30}, #{@color.b-30})"
      @ctx.lineWidth = 15 * @world.scale.x

      current_node = node.position.clone().subtract(@camera.loc)
      next_node = next.position.clone().subtract(@camera.loc)

      @ctx.moveTo(
        current_node.x + ( next_node.x - current_node.x ) / 2,
        current_node.y + ( next_node.y - current_node.y ) / 2
      )

    node.draw(index) for node, index in @nodes when node

    if !@world.debug
      do @ctx.restore
    return
