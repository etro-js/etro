/** Mock time dependencies */
// eslint-disable-next-line no-unused-vars
export function mockTime (start = 0, step = 100) {
  spyOn(window, 'requestAnimationFrame').and.callFake(cb => {
    // Run callback asynchronously. If we ran it immediately, it would be
    // called synchronously, which would break tests that expect it to be run
    // asynchronously (like it would be if we weren't mocking it).
    setTimeout(cb, 0)
  })

  let time = start
  spyOn(window.performance, 'now').and.callFake(() => {
    const result = time
    time += step
    return result
  })
}

// eslint-disable-next-line no-unused-vars
export function mockMediaElementSource (actx) {
  const source = jasmine.createSpyObj('source', [
    'connect',
    'disconnect',
    'addEventListener',
    'play',
    'pause',
    'stop'
  ])
  source.connect.and.callFake(node => {
    source.destination = node
  })
  source.disconnect.and.callFake(() => {
    source.destination = null
  })
  source.readyState = 2
  source.currentTime = 0
  source.duration = 4
  return source
}

// eslint-disable-next-line no-unused-vars
export function mockAudioContext () {
  const actx = jasmine.createSpyObj('actx', ['createMediaElementSource'])
  actx.createMediaElementSource.and.callFake(mockMediaElementSource)
  actx.destination = jasmine.createSpyObj('destination', ['connect'])
  return actx
}

export function mockImage () {
  const image = jasmine.createSpyObj('image', ['addEventListener'])
  image.addEventListener.and.callFake((event, cb) => {
    if (event === 'load')
      cb()
  })
  return image
}

export function mockRenderingContext2D (canvas?: HTMLCanvasElement) {
  const ctx = jasmine.createSpyObj('CanvasRenderingContext2D', [
    'beginPath',
    'clearRect',
    'clip',
    'closePath',
    'drawImage',
    'ellipse',
    'fillRect',
    'fillText',
    'getImageData',
    'putImageData',
    'restore',
    'save',
    'setTransform'
  ])

  ctx.getImageData.and.callFake((x, y, width, height) => {
    if (x < 0 || y < 0 || width < 0 || height < 0 || x + width > ctx.canvas.width || y + height > ctx.canvas.height)
      throw new Error('Invalid getImageData() call')

    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    }
  })

  ctx.canvas = canvas || mockCanvas(ctx)

  return ctx
}

export function mockWebGL (canvas?: HTMLCanvasElement) {
  const gl = jasmine.createSpyObj('WebGLRenderingContext', [
    'activeTexture',
    'attachShader',
    'bindBuffer',
    'bindTexture',
    'blendFuncSeparate',
    'bufferData',
    'clear',
    'clearColor',
    'createBuffer',
    'createProgram',
    'createShader',
    'createTexture',
    'compileShader',
    'deleteShader',
    'deleteTexture',
    'disable',
    'disableVertexAttribArray',
    'drawArrays',
    'enable',
    'enableVertexAttribArray',
    'getAttribLocation',
    'getParameter',
    'getProgramInfoLog',
    'getProgramParameter',
    'getShaderInfoLog',
    'getShaderParameter',
    'getUniformLocation',
    'linkProgram',
    'readPixels',
    'shaderSource',
    'texImage2D',
    'texParameteri',
    'uniform1i',
    'uniform2f',
    'uniform2iv',
    'uniformMatrix4fv',
    'useProgram',
    'vertexAttribPointer',
    'viewport'
  ])

  gl.getShaderParameter.and.callFake((_shader, param) => {
    if (param === gl.COMPILE_STATUS) return true
    return null
  })

  gl.getProgramParameter.and.callFake((_program, param) => {
    if (param === gl.LINK_STATUS) return true
    return null
  })

  gl.canvas = canvas || mockCanvas(gl)

  return gl
}

export function mockMediaStream () {
  const stream = jasmine.createSpyObj('MediaStream', [
    'getAudioTracks',
    'getTracks',
    'getVideoTracks'
  ])

  stream.getAudioTracks.and.returnValue([])
  stream.getTracks.and.returnValue([])
  stream.getVideoTracks.and.returnValue([])

  return stream
}

// eslint-disable-next-line no-unused-vars
export function mockCanvas (context?: CanvasRenderingContext2D | WebGLRenderingContext) {
  const canvas = jasmine.createSpyObj('canvas', ['getContext', 'captureStream'])
  canvas.width = 100
  canvas.height = 100

  canvas.getContext.and.callFake((type: string) => {
    if (type === '2d') {
      context = context || mockRenderingContext2D(canvas)
      return context
    } else if (type === 'webgl') {
      context = context || mockWebGL(canvas)
      return context
    } else {
      throw new Error(`Unknown context type: ${type}`)
    }
  })

  canvas.captureStream.and.callFake(() => mockMediaStream())

  return canvas
}

export function mockOffscreenCanvas (width: number, height: number) {
  const canvas = jasmine.createSpyObj('OffscreenCanvas', ['getContext'])
  canvas.width = width
  canvas.height = height

  let context: OffscreenCanvasRenderingContext2D | WebGLRenderingContext | null = null

  canvas.getContext.and.callFake((type: string) => {
    if (type === '2d') {
      if (context && !(context instanceof OffscreenCanvasRenderingContext2D))
        throw new Error('Invalid context type')
      context = context || mockRenderingContext2D(canvas)
      return context
    } else if (type === 'webgl') {
      if (context && !(context instanceof WebGLRenderingContext))
        throw new Error('Invalid context type')
      context = context || mockWebGL(canvas)
      return context
    } else {
      throw new Error(`Unknown context type: ${type}`)
    }
  })

  return canvas
}

export function mockOffscreenCanvasConstructor () {
  spyOn(window, 'OffscreenCanvas').and.callFake(mockOffscreenCanvas)
}

export function mockMediaRecorder () {
  const recorder = jasmine.createSpyObj('MediaRecorder', [
    'requestData',
    'start',
    'stop'
  ])

  recorder.requestData.and.callFake(() => {
    recorder.ondataavailable({ data: new Blob() })
  })

  recorder.stop.and.callFake(() => {
    recorder.onstop()
  })

  return recorder
}

export function mockMediaRecorderConstructor () {
  spyOn(window, 'MediaRecorder').and.callFake(mockMediaRecorder)
}

export function mockDocumentCreate () {
  spyOn(document, 'createElement').and.callFake((type: string) => {
    if (type === 'canvas') return mockCanvas()
    if (type === 'img') return mockImage()
    return null
  })
}
