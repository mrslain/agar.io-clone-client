Array::indexByOffset = (index, offset) ->
    if @[index + offset]
      return index + offset
    if index + offset > @length - 1
      return index - (@length) + offset
    if index + offset < 0
      return @length + index + offset
    return

Array::elementByOffset = (index, offset) ->
  return @[@indexByOffset(index, offset)]


CanvasRenderingContext2D::wrapText = (text, x, y, maxWidth, lineHeight) ->
  lines = text.split('\n')
  i = 0
  while i < lines.length
    words = lines[i].split(' ')
    line = ''
    n = 0
    while n < words.length
      testLine = line + words[n] + ' '
      metrics = @measureText(testLine)
      testWidth = metrics.width
      if testWidth > maxWidth and n > 0
        @fillText line, x, y
        line = words[n] + ' '
        y += lineHeight
      else
        line = testLine
      n++
    @fillText line, x, y
    y += lineHeight
    i++
  return


class Debug
  constructor: (enable) ->
    @enable = enable
    @info = document.getElementById "debug-info"
    @params = []
  update: ->
    if @enable
      print = "<ul>"
      i = 0
      while i < @params.length
        param = @params[i]
        if param.type == 'pos'
          print += "<li><b>#{param.name} = </b>&nbsp;<span>X:#{Math.round(param.vector.x)} Y:#{Math.round(param.vector.y)}</span></li>"
        else if param.type == 'size'
          print += "<li><b>#{param.name} = </b>&nbsp;<span>W:#{Math.round(param.vector.width)} H:#{Math.round(param.vector.height)}</span></li>"
        i++
      print += "</ul>"
      @info.innerHTML = print
  set: (name, vector, type = "pos") ->
    if @enable
      i = 0
      while i < @params.length
        if @params[i].name == name
          @params[i] =
            type: type
            name: name
            vector: vector
          return
        i++
      @params.push
        name: name
        vector: vector
    return
