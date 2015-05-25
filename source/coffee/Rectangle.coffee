class Rectangle
  constructor: (left, top, width, height) ->
    @left = left or 0
    @top = top or 0
    @width = width or 0
    @height = height or 0
    @right = @left + @width
    @bottom = @top + @height
    return
  set: (left, top, width, height) ->
    @left = left
    @top = top
    @width = width or @width
    @height = height or @height
    @right = @left + @width
    @bottom = @top + @height
    return
  within: (r) ->
    r.left <= @left and r.right >= @right and r.top <= @top and r.bottom >= @bottom
  overlaps: (r) ->
    @left < r.right and r.left < @right and @top < r.bottom and r.top < @bottom
