/**
 * @module effect
 *
 * @todo Investigate why an effect might run once in the beginning even if its layer isn't at the beginning
 * @todo Add audio effect support
 * @todo Move shader source to external files
 */

import { publish, subscribe } from './event.js'
import { val, watchPublic } from './util.js'

/**
 * Any effect that modifies the visual contents of a layer.
 *
 * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
 * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
 * different module.</em>
 */
export class Base {
  constructor () {
    const newThis = watchPublic(this) // proxy that will be returned by constructor

    newThis.enabled = true
    newThis._target = null

    // Propogate up to target
    subscribe(newThis, 'effect.change.modify', event => {
      if (!newThis._target) {
        return
      }
      const type = `${newThis._target.type}.change.effect.modify`
      publish(newThis._target, type, { ...event, target: newThis._target, source: newThis, type })
    })

    return newThis
  }

  attach (target) {
    this._target = target
  }

  detach () {
    this._target = null
  }

  // subclasses must implement apply
  /**
   * Apply this effect to a target at the given time
   *
   * @param {module:movie|module:layer.Base} target
   * @param {number} reltime - the movie's current time relative to the layer (will soon be replaced with an instance getter)
   * @abstract
   */
  apply (target, reltime) {
    throw new Error('No overriding method found or super.apply was called')
  }

  /**
   * The current time of the target
   * @type number
   */
  get currentTime () {
    return this._target ? this._target.currentTime : undefined
  }

  get parent () {
    return this._target
  }

  get movie () {
    return this._target ? this._target.movie : undefined
  }
}
// id for events (independent of instance, but easy to access when on prototype chain)
Base.prototype.type = 'effect'
Base.prototype.publicExcludes = []
Base.prototype.propertyFilters = {}

/**
 * A sequence of effects to apply, treated as one effect. This can be useful for defining reused effect sequences as one effect.
 */
export class Stack extends Base {
  constructor (effects) {
    super()

    this._effectsBack = []
    this._effects = new Proxy(this._effectsBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(this, argumentsList)
      },
      deleteProperty: function (target, property) {
        const value = target[property]
        publish(value, 'effect.detach', { effectTarget: this._target })
        delete target[property]
        return true
      },
      set: function (target, property, value) {
        if (!isNaN(property)) { // if property is an number (index)
          if (target[property]) {
            delete target[property] // call deleteProperty
          }
          publish(value, 'effect.attach', { effectTarget: this._target }) // Attach effect to movie (first)
        }
        target[property] = value
        return true
      }
    })
    effects.forEach(effect => this.effects.push(effect))
  }

  attach (movie) {
    super.attach(movie)
    this.effects.forEach(effect => {
      effect.detach()
      effect.attach(movie)
    })
  }

  detach () {
    super.detach()
    this.effects.forEach(effect => {
      effect.detach()
    })
  }

  apply (target, reltime) {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      effect.apply(target, reltime)
    }
  }

  /**
   * @type module:effect.Base[]
   */
  get effects () {
    return this._effects
  }

  /**
   * Convenience method for chaining
   * @param {module:effect.Base} effect - the effect to append
   */
  addEffect (effect) {
    this.effects.push(effect)
    return this
  }
}

/**
 * A hardware-accelerated pixel mapping
 * @todo can `v_TextureCoord` be replaced by `gl_FragUV`
 */
export class Shader extends Base {
  /**
   * @param {string} fragmentSrc
   * @param {object} [userUniforms={}]
   * @param {object[]} [userTextures=[]]
   * @param {object} [sourceTextureOptions={}]
   */
  constructor (fragmentSrc = Shader._IDENTITY_FRAGMENT_SOURCE, userUniforms = {}, userTextures = [], sourceTextureOptions = {}) {
    super()
    // TODO: split up into multiple methods

    const gl = this._initGl()
    this._program = Shader._initShaderProgram(gl, Shader._VERTEX_SOURCE, fragmentSrc)
    this._buffers = Shader._initRectBuffers(gl)

    this._initTextures(userUniforms, userTextures, sourceTextureOptions)
    this._initAttribs()
    this._initUniforms(userUniforms)
  }

  _initGl () {
    this._canvas = document.createElement('canvas')
    const gl = this._canvas.getContext('webgl')
    if (gl === null) {
      throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
    }
    this._gl = gl
    return gl
  }

  _initTextures (userUniforms, userTextures, sourceTextureOptions) {
    const gl = this._gl
    const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    if (userTextures.length > maxTextures) {
      console.warn('Too many textures!')
    }
    this._userTextures = {}
    for (const name in userTextures) {
      const userOptions = userTextures[name]
      // Apply default options.
      const options = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...userOptions }

      if (options.createUniform) {
        // Automatically, create a uniform with the same name as this texture, that points to it.
        // This is an easy way for the user to use custom textures, without having to define multiple properties in the effect object.
        if (userUniforms[name]) {
          throw new Error(`Texture - uniform naming conflict: ${name}!`)
        }
        // Add this as a "user uniform".
        userUniforms[name] = '1i' // texture pointer
      }
      this._userTextures[name] = options
    }
    this._sourceTextureOptions = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...sourceTextureOptions }
  }

  _initAttribs () {
    const gl = this._gl
    this._attribLocations = {
      textureCoord: gl.getAttribLocation(this._program, 'a_TextureCoord')
      // a_VertexPosition ?? somehow it works without it though...
    }
  }

  _initUniforms (userUniforms) {
    const gl = this._gl
    this._uniformLocations = {
      // modelViewMatrix: gl.getUniformLocation(this._program, "u_ModelViewMatrix"),
      source: gl.getUniformLocation(this._program, 'u_Source'),
      size: gl.getUniformLocation(this._program, 'u_Size')
    }
    // The options value can just be a string equal to the type of the variable, for syntactic sugar.
    //  If this is the case, convert it to a real options object.
    this._userUniforms = {}
    for (const name in userUniforms) {
      const val = userUniforms[name]
      this._userUniforms[name] = typeof val === 'string' ? { type: val } : val
    }
    for (const unprefixed in userUniforms) {
      // property => u_Property
      const prefixed = 'u_' + unprefixed.charAt(0).toUpperCase() + (unprefixed.length > 1 ? unprefixed.slice(1) : '')
      this._uniformLocations[unprefixed] = gl.getUniformLocation(this._program, prefixed)
    }
  }

  // Not needed, right?
  /* watchWebGLOptions() {
        const pubChange = () => {
            this.publish("change", {});
        };
        for (let name in this._userTextures) {
            watch(this, name, pubChange);
        }
        for (let name in this._userUniforms) {
            watch(this, name, pubChange);
        }
    } */

  apply (target, reltime) {
    this._checkDimensions(target)
    this._refreshGl()

    this._enablePositionAttrib()
    this._enableTexCoordAttrib()
    this._prepareTextures(target, reltime)

    this._gl.useProgram(this._program)

    this._prepareUniforms(target, reltime)

    this._draw(target)
  }

  _checkDimensions (target) {
    const gl = this._gl
    // TODO: Change target.canvas.width => target.width and see if it breaks anything.
    if (this._canvas.width !== target.canvas.width || this._canvas.height !== target.canvas.height) { // (optimization)
      this._canvas.width = target.canvas.width
      this._canvas.height = target.canvas.height

      gl.viewport(0, 0, target.canvas.width, target.canvas.height)
    }
  }

  _refreshGl () {
    const gl = this._gl
    gl.clearColor(0, 0, 0, 1) // clear to black; fragments can be made transparent with the blendfunc below
    // gl.clearDepth(1.0);         // clear everything
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.SRC_ALPHA, gl.ONE, gl.ZERO) // idk why I can't multiply rgb by zero
    gl.enable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST) // gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  _enablePositionAttrib () {
    const gl = this._gl
    // Tell WebGL how to pull out the positions from buffer
    const numComponents = 2
    const type = gl.FLOAT // the data in the buffer is 32bit floats
    const normalize = false // don't normalize
    const stride = 0 // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0 // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.position)
    gl.vertexAttribPointer(
      this._attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset)
    gl.enableVertexAttribArray(
      this._attribLocations.vertexPosition)
  }

  _enableTexCoordAttrib () {
    const gl = this._gl
    // tell webgl how to pull out the texture coordinates from buffer
    const numComponents = 2 // every coordinate composed of 2 values (uv)
    const type = gl.FLOAT // the data in the buffer is 32 bit float
    const normalize = false // don't normalize
    const stride = 0 // how many bytes to get from one set to the next
    const offset = 0 // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.textureCoord)
    gl.vertexAttribPointer(this._attribLocations.textureCoord, numComponents, type, normalize, stride, offset)
    gl.enableVertexAttribArray(this._attribLocations.textureCoord)
  }

  _prepareTextures (target, reltime) {
    const gl = this._gl
    // TODO: figure out which properties should be private / public

    // Tell WebGL we want to affect texture unit 0
    // Call `activeTexture` before `_loadTexture` so it won't be bound to the last active texture.
    gl.activeTexture(gl.TEXTURE0)
    this._inputTexture = Shader._loadTexture(gl, target.canvas, this._sourceTextureOptions)
    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this._inputTexture)

    let i = 0
    for (const name in this._userTextures) {
      const options = this._userTextures[name]
      // Call `activeTexture` before `_loadTexture` so it won't be bound to the last active texture.
      // TODO: investigate better implementation of `_loadTexture`
      gl.activeTexture(gl.TEXTURE0 + (Shader.INTERNAL_TEXTURE_UNITS + i)) // use the fact that TEXTURE0, TEXTURE1, ... are continuous
      const preparedTex = Shader._loadTexture(gl, val(this, name, reltime), options) // do it every frame to keep updated (I think you need to)
      gl.bindTexture(gl[options.target], preparedTex)
      i++
    }
  }

  _prepareUniforms (target, reltime) {
    const gl = this._gl
    // Set the shader uniforms

    // Tell the shader we bound the texture to texture unit 0
    // All base (Shader class) uniforms are optional
    if (this._uniformLocations.source) {
      gl.uniform1i(this._uniformLocations.source, 0)
    }

    // All base (Shader class) uniforms are optional
    if (this._uniformLocations.size) {
      gl.uniform2iv(this._uniformLocations.size, [target.canvas.width, target.canvas.height])
    }

    for (const unprefixed in this._userUniforms) {
      const options = this._userUniforms[unprefixed]
      const value = val(this, unprefixed, reltime)
      const preparedValue = this._prepareValue(value, options.type, reltime, options)
      const location = this._uniformLocations[unprefixed]
      gl['uniform' + options.type](location, preparedValue) // haHA JavaScript (`options.type` is "1f", for instance)
    }
    gl.uniform1i(this._uniformLocations.test, 0)
  }

  _draw (target) {
    const gl = this._gl

    const offset = 0
    const vertexCount = 4
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount)

    // clear the target, in case the effect outputs transparent pixels
    target.vctx.clearRect(0, 0, target.canvas.width, target.canvas.height)
    // copy internal image state onto target
    target.vctx.drawImage(this._canvas, 0, 0)
  }

  /**
   * Converts a value of a standard type for javascript to a standard type for GLSL
   * @param value - the raw value to prepare
   * @param {string} outputType - the WebGL type of |value|; example: <code>1f</code> for a float
   * @param {number} reltime - current time, relative to the target
   * @param {object} [options] - Optional config
   */
  _prepareValue (value, outputType, reltime, options = {}) {
    const def = options.defaultFloatComponent || 0
    if (outputType === '1i') {
      /*
       * Textures are passed to the shader by both providing the texture (with texImage2D)
       * and setting the |sampler| uniform equal to the index of the texture.
       * In vidar shader effects, the subclass passes the names of all the textures ot this base class,
       * along with all the names of uniforms. By default, corresponding uniforms (with the same name) are
       * created for each texture for ease of use. You can also define different texture properties in the
       * javascript effect by setting it identical to the property with the passed texture name.
       * In WebGL, it will be set to the same integer texture unit.
       *
       * To do this, test if |value| is identical to a texture.
       * If so, set it to the texture's index, so the shader can use it.
       */
      let i = 0
      for (const name in this._userTextures) {
        const testValue = val(this, name, reltime)
        if (value === testValue) {
          value = Shader.INTERNAL_TEXTURE_UNITS + i // after the internal texture units
        }
        i++
      }
    }

    if (outputType === '3fv') {
      // allow 4-component vectors; TODO: why?
      if (Array.isArray(value) && (value.length === 3 || value.length === 4)) {
        return value
      }
      // kind of loose so this can be changed if needed
      if (typeof value === 'object') {
        return [
          value.r !== undefined ? value.r : def,
          value.g !== undefined ? value.g : def,
          value.b !== undefined ? value.b : def
        ]
      }

      throw new Error(`Invalid type: ${outputType} or value: ${value}`)
    }

    if (outputType === '4fv') {
      if (Array.isArray(value) && value.length === 4) {
        return value
      }
      // kind of loose so this can be changed if needed
      if (typeof value === 'object') {
        return [
          value.r !== undefined ? value.r : def,
          value.g !== undefined ? value.g : def,
          value.b !== undefined ? value.b : def,
          value.a !== undefined ? value.a : def
        ]
      }

      throw new Error(`Invalid type: ${outputType} or value: ${value}`)
    }

    return value
  }
}
// Shader.prototype.getpublicExcludes = () =>
Shader._initRectBuffers = gl => {
  const position = [
    // the screen/canvas (output)
    -1.0, 1.0,
    1.0, 1.0,
    -1.0, -1.0,
    1.0, -1.0
  ]
  const textureCoord = [
    // the texture/canvas (input)
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0
  ]

  return {
    position: Shader._initBuffer(gl, position),
    textureCoord: Shader._initBuffer(gl, textureCoord)
  }
}
/**
 * Creates the quad covering the screen
 */
Shader._initBuffer = (gl, data) => {
  const buffer = gl.createBuffer()

  // Select the buffer as the one to apply buffer operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)

  return buffer
}
/**
 * Creates a webgl texture from the source.
 * @param {object} [options] - optional WebGL config for texture
 * @param {number} [options.target=gl.TEXTURE_2D]
 * @param {number} [options.level=0]
 * @param {number} [options.internalFormat=gl.RGBA]
 * @param {number} [options.srcFormat=gl.RGBA]
 * @param {number} [options.srcType=gl.UNSIGNED_BYTE]
 * @param {number} [options.wrapS=gl.CLAMP_TO_EDGE]
 * @param {number} [options.wrapT=gl.CLAMP_TO_EDGE]
 * @param {number} [options.minFilter=gl.LINEAR]
 * @param {number} [options.magFilter=gl.LINEAR]
 */
Shader._loadTexture = (gl, source, options = {}) => {
  options = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...options } // Apply default options, just in case.
  const target = gl[options.target] // When creating the option, the user can't access `gl` so access it here.
  const level = options.level
  const internalFormat = gl[options.internalFormat]
  const srcFormat = gl[options.srcFormat]
  const srcType = gl[options.srcType]
  const wrapS = gl[options.wrapS]
  const wrapT = gl[options.wrapT]
  const minFilter = gl[options.minFilter]
  const magFilter = gl[options.magFilter]
  // TODO: figure out how wrap-s and wrap-t interact with mipmaps
  // (for legacy support)
  // let wrapS = options.wrapS ? options.wrapS : gl.CLAMP_TO_EDGE,
  //     wrapT = options.wrapT ? options.wrapT : gl.CLAMP_TO_EDGE;

  const tex = gl.createTexture()
  gl.bindTexture(target, tex)

  // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true) // premultiply alpha

  // TODO: figure out how this works with layer width/height

  // TODO: support 3d textures (change texImage2D)
  // set to `source`
  gl.texImage2D(target, level, internalFormat, srcFormat, srcType, source)

  // WebGL1 has different requirements for power of 2 images
  // vs non power of 2 images so check if the image is a
  // power of 2 in both dimensions.
  // Get dimensions by using the fact that all valid inputs for
  // texImage2D must have `width` and `height` properties except
  // videos, which have `videoWidth` and `videoHeight` instead
  // and `ArrayBufferView`, which is one dimensional (so don't
  // worry about mipmaps)
  const w = target instanceof HTMLVideoElement ? target.videoWidth : target.width
  const h = target instanceof HTMLVideoElement ? target.videoHeight : target.height
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
  if ((w && isPowerOf2(w)) && (h && isPowerOf2(h))) {
    // Yes, it's a power of 2. All wrap modes are valid. Generate mips.
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)
    gl.generateMipmap(target)
  } else {
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    if (wrapS !== gl.CLAMP_TO_EDGE || wrapT !== gl.CLAMP_TO_EDGE) {
      console.warn('Wrap mode is not CLAMP_TO_EDGE for a non-power-of-two texture. Defaulting to CLAMP_TO_EDGE')
    }
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  return tex
}
const isPowerOf2 = value => (value && (value - 1)) === 0
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
Shader._initShaderProgram = (gl, vertexSrc, fragmentSrc) => {
  const vertexShader = Shader._loadShader(gl, gl.VERTEX_SHADER, vertexSrc)
  const fragmentShader = Shader._loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc)

  const shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  // check program creation status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.warn('Unable to link shader program: ' + gl.getProgramInfoLog(shaderProgram))
    return null
  }

  return shaderProgram
}
Shader._loadShader = (gl, type, source) => {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  // check compile status
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('An error occured compiling shader: ' + gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}
/**
 * WebGL texture units consumed by <code>Shader</code>
 */
Shader.INTERNAL_TEXTURE_UNITS = 1
Shader._DEFAULT_TEXTURE_OPTIONS = {
  createUniform: true,
  target: 'TEXTURE_2D',
  level: 0,
  internalFormat: 'RGBA',
  srcFormat: 'RGBA',
  srcType: 'UNSIGNED_BYTE',
  minFilter: 'LINEAR',
  magFilter: 'LINEAR',
  wrapS: 'CLAMP_TO_EDGE',
  wrapT: 'CLAMP_TO_EDGE'
}
Shader._VERTEX_SOURCE = `
  attribute vec4 a_VertexPosition;
  attribute vec2 a_TextureCoord;

  varying highp vec2 v_TextureCoord;

  void main() {
      // no need for projection or model-view matrices, since we're just rendering a rectangle
      // that fills the screen (see position values)
      gl_Position = a_VertexPosition;
      v_TextureCoord = a_TextureCoord;
  }
`
Shader._IDENTITY_FRAGMENT_SOURCE = `
  precision mediump float;

  uniform sampler2D u_Source;

  varying highp vec2 v_TextureCoord;

  void main() {
      gl_FragColor = texture2D(u_Source, v_TextureCoord);
  }
`

/* COLOR & TRANSPARENCY */
// TODO: move shader source code to external .js files (with exports)

/**
 * Changes the brightness
 */
export class Brightness extends Shader {
  /**
   * @param {number} [brightness=0] - the value to add to each pixel's channels [-255, 255]
   */
  constructor (brightness = 0.0) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform float u_Brightness;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(color.rgb + u_Brightness / 255.0, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
      }
    `, {
      brightness: '1f'
    })
    /**
     * The value to add to each pixel's channels [-255, 255]
     * @type number
     */
    this.brightness = brightness
  }
}

/**
 * Changes the contrast
 */
export class Contrast extends Shader {
  /**
   * @param {number} [contrast=1] - the contrast multiplier
   */
  constructor (contrast = 1.0) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform float u_Contrast;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(u_Contrast * (color.rgb - 0.5) + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
      }
    `, {
      contrast: '1f'
    })
    /**
     * The contrast multiplier
     * @type number
     */
    this.contrast = contrast
  }
}

export class Grayscale extends Shader {
  constructor() {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec4 u_Factors;

      varying highp vec2 v_TextureCoord;

      float max3(float x, float y, float z) {
        return max(x, max(y, z));
      }

      float min3(float x, float y, float z) {
        return min(x, min(y, z));
      }

      void main() {
        vec4 color = texture2D(u_Source, v_TextureCoord);
        // Desaturate
        float value = (max3(color.r, color.g, color.b) + min3(color.r, color.g, color.b)) / 2.0;
        gl_FragColor = vec4(value, value, value, color.a);
      }
    `, {})
  }
}

/**
 * Multiplies each channel by a different number
 */
export class Channels extends Shader {
  /**
   * @param {module:util.Color} factors - channel factors, each defaulting to 1
   */
  constructor (factors = {}) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec4 u_Factors;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          gl_FragColor = clamp(u_Factors * color, 0.0, 1.0);
      }
    `, {
      factors: { type: '4fv', defaultFloatComponent: 1 }
    })

    /**
     * Channel factors, each defaulting to 1
     * @type module:util.Color
     */
    this.factors = factors
  }
}

/**
 * Reduces alpha for pixels which are close to a specified target color
 */
export class ChromaKey extends Shader {
  /**
   * @param {module:util.Color} [target={r: 0, g: 0, b: 0}] - the color to remove
   * @param {number} [threshold=0] - how much error is allowed
   * @param {boolean} [interpolate=false] - true value to interpolate the alpha channel,
   *  or false value for no smoothing (i.e. 255 or 0 alpha)
   * @param {number} [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable
   * @todo Use <code>smoothingSharpness</code>
   */
  constructor (target = { r: 0, g: 0, b: 0 }, threshold = 0, interpolate = false/*, smoothingSharpness=0 */) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec3 u_Target;
      uniform float u_Threshold;
      uniform bool u_Interpolate;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          float alpha = color.a;
          vec3 dist = abs(color.rgb - u_Target / 255.0);
          if (!u_Interpolate) {
              // Standard way that most video editors probably use (all-or-nothing method)
              float thresh = u_Threshold / 255.0;
              bool transparent = dist.r <= thresh && dist.g <= thresh && dist.b <= thresh;
              if (transparent)
                  alpha = 0.0;
          } else {
              /*
                  better way IMHO:
                  Take the average of the absolute differences between the pixel and the target for each channel
              */
              float transparency = (dist.r + dist.g + dist.b) / 3.0;
              // TODO: custom or variety of interpolation methods
              alpha = transparency;
          }
          gl_FragColor = vec4(color.rgb, alpha);
      }
    `, {
      target: '3fv',
      threshold: '1f',
      interpolate: '1i'
    })
    /**
     * The color to remove
     * @type module:util.Color
     */
    this.target = target
    /**
     * How much error is alloed
     * @type number
     */
    this.threshold = threshold
    /**
     * True value to interpolate the alpha channel,
     *  or false value for no smoothing (i.e. 255 or 0 alpha)
     * @type boolean
     */
    this.interpolate = interpolate
    // this.smoothingSharpness = smoothingSharpness;
  }
}

/* BLUR */

/**
 * Applies a Gaussian blur
 *
 * @todo Improve performance
 * @todo Make sure this is truly gaussian even though it doens't require a standard deviation
 */
export class GaussianBlur extends Stack {
  constructor (radius) {
    // Divide into two shader effects (use the fact that gaussian blurring can be split into components for performance benefits)
    super([
      new GaussianBlurHorizontal(radius),
      new GaussianBlurVertical(radius)
    ])
  }
}

/**
 * Shared class for both horizontal and vertical gaussian blur classes.
 * @todo If radius == 0, don't affect the image (right now, the image goes black).
 */
class GaussianBlurComponent extends Shader {
  /**
   * @param {string} src - fragment src code specific to which component (horizontal or vertical)
   * @param {number} radius
   */
  constructor (src, radius) {
    super(src, {
      radius: '1i'
    }, {
      shape: { minFilter: 'NEAREST', magFilter: 'NEAREST' }
    })
    /**
     * @type number
     */
    this.radius = radius
    this._radiusCache = undefined
  }

  apply (target, reltime) {
    const radiusVal = val(this, 'radius', reltime)
    if (radiusVal !== this._radiusCache) {
      // Regenerate gaussian distribution.
      this.shape = GaussianBlurComponent.render1DKernel(
        GaussianBlurComponent.gen1DKernel(radiusVal)
      ) // distribution canvas
    }
    this._radiusCache = radiusVal

    super.apply(target, reltime)
  }
}
GaussianBlurComponent.prototype.publicExcludes = Shader.prototype.publicExcludes.concat(['shape'])
/**
 * Render Gaussian kernel to a canvas for use in shader.
 * @param {number[]} kernel
 * @private
 *
 * @return {HTMLCanvasElement}
 */
GaussianBlurComponent.render1DKernel = kernel => {
  // TODO: Use Float32Array instead of canvas.
  // init canvas
  const canvas = document.createElement('canvas')
  canvas.width = kernel.length
  canvas.height = 1 // 1-dimensional
  const ctx = canvas.getContext('2d')

  // draw to canvas
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  for (let i = 0; i < kernel.length; i++) {
    imageData.data[4 * i + 0] = 255 * kernel[i] // Use red channel to store distribution weights.
    imageData.data[4 * i + 1] = 0 // Clear all other channels.
    imageData.data[4 * i + 2] = 0
    imageData.data[4 * i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)

  return canvas
}
GaussianBlurComponent.gen1DKernel = radius => {
  const pascal = GaussianBlurComponent.genPascalRow(2 * radius + 1)
  // don't use `reduce` and `map` (overhead?)
  let sum = 0
  for (let i = 0; i < pascal.length; i++) {
    sum += pascal[i]
  }
  for (let i = 0; i < pascal.length; i++) {
    pascal[i] /= sum
  }
  return pascal
}
GaussianBlurComponent.genPascalRow = index => {
  if (index < 0) {
    throw new Error(`Invalid index ${index}`)
  }
  let currRow = [1]
  for (let i = 1; i < index; i++) {
    const nextRow = []
    nextRow.length = currRow.length + 1
    // edges are always 1's
    nextRow[0] = nextRow[nextRow.length - 1] = 1
    for (let j = 1; j < nextRow.length - 1; j++) {
      nextRow[j] = currRow[j - 1] + currRow[j]
    }
    currRow = nextRow
  }
  return currRow
}

/**
 * Horizontal component of gaussian blur
 */
export class GaussianBlurHorizontal extends GaussianBlurComponent {
  /**
   * @param {number} radius
   */
  constructor (radius) {
    super(`
      #define MAX_RADIUS 250

      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;   // pixel dimensions of input and output
      uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
      uniform int u_Radius;   // TODO: support floating-point radii

      varying highp vec2 v_TextureCoord;

      void main() {
          /*
           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1
           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)
           * So, normalize by accumulating all the weights and dividing by that.
           */
          float totalWeight = 0.0;
          vec4 avg = vec4(0.0);
          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
              if (i >= 2 * u_Radius + 1)
                  break;  // GLSL can only use constants in for-loop declaration, so we break here.
              // (2 * u_Radius + 1) is the width of u_Shape, by definition
              float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format
              totalWeight += weight;
              vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(i - u_Radius, 0.0) / vec2(u_Size));
              avg += weight * sample;
          }
          gl_FragColor = avg / totalWeight;
      }
    `, radius)
  }
}

/**
 * Vertical component of gaussian blur
 */
export class GaussianBlurVertical extends GaussianBlurComponent {
  /**
   * @param {number} radius
   */
  constructor (radius) {
    super(`
      #define MAX_RADIUS 250

      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;   // pixel dimensions of input and output
      uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
      uniform int u_Radius;   // TODO: support floating-point radii

      varying highp vec2 v_TextureCoord;

      void main() {
          /*
           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1
           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)
           * So, normalize by accumulating all the weights and dividing by that.
           */
          float totalWeight = 0.0;
          vec4 avg = vec4(0.0);
          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
              if (i >= 2 * u_Radius + 1)
                  break;  // GLSL can only use constants in for-loop declaration, so we break here.
              // (2 * u_Radius + 1) is the width of u_Shape, by definition
              float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format
              totalWeight += weight;
              vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(0.0, i - u_Radius) / vec2(u_Size));
              avg += weight * sample;
          }
          gl_FragColor = avg / totalWeight;
      }
    `, radius)
  }
}

/**
 * Makes the target look pixelated
 * @todo just resample with NEAREST interpolation? but how?
 */
export class Pixelate extends Shader {
  /**
   * @param {number} pixelSize
   */
  constructor (pixelSize = 1) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;
      uniform int u_PixelSize;

      varying highp vec2 v_TextureCoord;

      void main() {
          int ps = u_PixelSize;

          // Snap to nearest block's center
          vec2 loc = vec2(u_Size) * v_TextureCoord; // pixel-space
          vec2 snappedLoc = float(ps) * floor(loc / float(ps));
          vec2 centeredLoc = snappedLoc + vec2(float(u_PixelSize) / 2.0 + 0.5);
          vec2 clampedLoc = clamp(centeredLoc, vec2(0.0), vec2(u_Size));
          gl_FragColor = texture2D(u_Source, clampedLoc / vec2(u_Size));
      }
    `, {
      pixelSize: '1i'
    })
    /**
     * @type number
     */
    this.pixelSize = pixelSize
  }

  apply (target, reltime) {
    const ps = val(this, 'pixelSize', reltime)
    if (ps % 1 !== 0 || ps < 0) {
      throw new Error('Pixel size must be a nonnegative integer')
    }

    super.apply(target, reltime)
  }
}

// TODO: implement directional blur
// TODO: implement radial blur
// TODO: implement zoom blur

/* DISTORTION */
/**
 * Transforms a layer or movie using a transformation matrix. Use {@link Transform.Matrix}
 * to either A) calculate those values based on a series of translations, scalings and rotations)
 * or B) input the matrix values directly, using the optional argument in the constructor.
 */
export class Transform extends Base {
  /**
   * @param {module:effect.Transform.Matrix} matrix - how to transform the target
   */
  constructor (matrix) {
    super()
    /**
     * How to transform the target
     * @type module:effect.Transform.Matrix
     */
    this.matrix = matrix
    this._tmpMatrix = new Transform.Matrix()
    this._tmpCanvas = document.createElement('canvas')
    this._tmpCtx = this._tmpCanvas.getContext('2d')
  }

  apply (target, reltime) {
    if (target.canvas.width !== this._tmpCanvas.width) {
      this._tmpCanvas.width = target.canvas.width
    }
    if (target.canvas.height !== this._tmpCanvas.height) {
      this._tmpCanvas.height = target.canvas.height
    }
    this._tmpMatrix.data = val(this, 'matrix.data', reltime) // use data, since that's the underlying storage

    this._tmpCtx.setTransform(
      this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c,
      this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f
    )
    this._tmpCtx.drawImage(target.canvas, 0, 0)
    // Assume it was identity for now
    this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1)
    target.vctx.clearRect(0, 0, target.canvas.width, target.canvas.height)
    target.vctx.drawImage(this._tmpCanvas, 0, 0)
  }
}
/**
 * @class
 * A 3x3 matrix for storing 2d transformations
 */
Transform.Matrix = class Matrix {
  constructor (data) {
    this.data = data || [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]
  }

  identity () {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = Transform.Matrix.IDENTITY.data[i]
    }

    return this
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [val]
   */
  cell (x, y, val) {
    if (val !== undefined) {
      this.data[3 * y + x] = val
    }
    return this.data[3 * y + x]
  }

  /* For canvas context setTransform */
  get a () {
    return this.data[0]
  }

  get b () {
    return this.data[3]
  }

  get c () {
    return this.data[1]
  }

  get d () {
    return this.data[4]
  }

  get e () {
    return this.data[2]
  }

  get f () {
    return this.data[5]
  }

  /**
   * Combines <code>this</code> with another matrix <code>other</code>
   * @param other
   */
  multiply (other) {
    // copy to temporary matrix to avoid modifying `this` while reading from it
    // http://www.informit.com/articles/article.aspx?p=98117&seqNum=4
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        let sum = 0
        for (let i = 0; i < 3; i++) {
          sum += this.cell(x, i) * other.cell(i, y)
        }
        TMP_MATRIX.cell(x, y, sum)
      }
    }
    // copy data from TMP_MATRIX to this
    for (let i = 0; i < TMP_MATRIX.data.length; i++) {
      this.data[i] = TMP_MATRIX.data[i]
    }
    return this
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  translate (x, y) {
    this.multiply(new Transform.Matrix([
      1, 0, x,
      0, 1, y,
      0, 0, 1
    ]))

    return this
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  scale (x, y) {
    this.multiply(new Transform.Matrix([
      x, 0, 0,
      0, y, 0,
      0, 0, 1
    ]))

    return this
  }

  /**
   * @param {number} a - the angle or rotation in radians
   */
  rotate (a) {
    const c = Math.cos(a); const s = Math.sin(a)
    this.multiply(new Transform.Matrix([
      c, s, 0,
      -s, c, 0,
      0, 0, 1
    ]))

    return this
  }
}
/**
 * The identity matrix
 */
Transform.Matrix.IDENTITY = new Transform.Matrix()
const TMP_MATRIX = new Transform.Matrix()

/**
 * Preserves an ellipse of the layer and clears the rest
 * @todo Parent layer mask effects will make more complex masks easier
 */
export class EllipticalMask extends Base {
  constructor (x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = 2 * Math.PI, anticlockwise = false) {
    super()
    this.x = x
    this.y = y
    this.radiusX = radiusX
    this.radiusY = radiusY
    this.rotation = rotation
    this.startAngle = startAngle
    this.endAngle = endAngle
    this.anticlockwise = anticlockwise
    // for saving image data before clearing
    this._tmpCanvas = document.createElement('canvas')
    this._tmpCtx = this._tmpCanvas.getContext('2d')
  }

  apply (target, reltime) {
    const ctx = target.vctx
    const canvas = target.canvas
    const x = val(this, 'x', reltime)
    const y = val(this, 'y', reltime)
    const radiusX = val(this, 'radiusX', reltime)
    const radiusY = val(this, 'radiusY', reltime)
    const rotation = val(this, 'rotation', reltime)
    const startAngle = val(this, 'startAngle', reltime)
    const endAngle = val(this, 'endAngle', reltime)
    const anticlockwise = val(this, 'anticlockwise', reltime)
    this._tmpCanvas.width = target.canvas.width
    this._tmpCanvas.height = target.canvas.height
    this._tmpCtx.drawImage(canvas, 0, 0)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save() // idk how to preserve clipping state without save/restore
    // create elliptical path and clip
    ctx.beginPath()
    ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise)
    ctx.closePath()
    ctx.clip()
    // render image with clipping state
    ctx.drawImage(this._tmpCanvas, 0, 0)
    ctx.restore()
  }
}
