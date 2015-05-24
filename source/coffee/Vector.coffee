class Vector
	constructor: (x, y) ->
		@x = x || 0
		@y = y || 0
		return @

	addX: (vector) ->
		@x += vector.x
		return @

	addY: (vector) ->
		@y += vector.y
		return @

	add: (vector) ->
		@x += vector.x
		@y += vector.y
		return @

	subtractX: (vector) ->
		@x -= vector.x
		return @

	subtractY: (vector) ->
		@y -= vector.y
		return @

	subtract: (vector) ->
		@x -= vector.x
		@y -= vector.y
		return @

	divideX: (vector) ->
		@x /= vector.x
		return @

	divideY: (vector) ->
		@y /= vector.y
		return @

	divide: (vector) ->
		@x /= vector.x
		@y /= vector.y
		return @

	multiplyX: (vector) ->
		@x *= vector.x
		return @

	multiplyY: (vector) ->
		@y *= vector.y
		return @

	multiply: (vector) ->
		@x *= vector.x
		@y *= vector.y
		return @

	invertX: (vector) ->
		@x *= -1
		return @

	invertY: (vector) ->
		@y *= -1
		return @

	invert: (vector) ->
		@x *= -1
		@y *= -1
		return @

	copyX: (vector) ->
		@x = vector.x
		return @

	copyY: (vector) ->
		@y = vector.y
		return @

	copy: (vector) ->
		@x = vector.x
		@y = vector.y
		return @

	distanceX: (vector) ->
		@x - vector.x

	absDistanceX: (vector) ->
		Math.abs @distanceX(vector)

	distanceY: (vector) ->
		@y - vector.y

	absDistanceY: (vector) ->
		Math.abs @distanceY(vector)

	distanceSq: (vector) ->
		dx = @distanceX(vector)
		dy = @distanceY(vector)
		return dx * dx + dy * dy

	distance: (vector) ->
		Math.sqrt @distanceSq(vector)

	magnitude: ->
		Math.sqrt @x * @x + @y * @y

	horizontalAngle: ->
		Math.atan2 @y, @x

	verticalAngle: ->
		Math.atan2 @x, @y

	angle: -> do @horizontalAngle

	clone: -> new Vector @x, @y