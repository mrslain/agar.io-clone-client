Array.prototype.indexByOffset = (index, offset) ->
    if @[index + offset]
      return index + offset
    if index + offset > @length - 1
      return index - (@length) + offset
    if index + offset < 0
      return @length + index + offset
    return

Array.prototype.elementByOffset = (index, offset) ->
  return @[@indexByOffset(index, offset)]
