/**
 * @module layer
 * @todo Add aligning options, like horizontal and vertical align modes
 */

import { publish, subscribe } from './event.js'
import { watchPublic, val, applyOptions } from './util.js'

/**
 * A layer is a piece of content for the movie
 */
export class Base {
  /**
   * Creates a new empty layer
   *
   * @param {object} options
   * @param {number} options.startTime - when to start the layer on the movie's timeline
   * @param {number} options.duration - how long the layer should last on the movie's timeline
   */
  constructor (options) {
    // Set startTime and duration properties manually, because they are
    // readonly. applyOptions ignores readonly properties.
    this._startTime = options.startTime
    this._duration = options.duration

    const newThis = watchPublic(this) // proxy that will be returned by constructor
    // Don't send updates when initializing, so use this instead of newThis:
    applyOptions(options, this) // no options rn, but just to stick to protocol

    this._active = false // whether newThis layer is currently being rendered
    this.enabled = true

    this._movie = null

    // Propogate up to target
    subscribe(newThis, 'layer.change', event => {
      const typeOfChange = event.type.substring(event.type.lastIndexOf('.') + 1)
      const type = `movie.change.layer.${typeOfChange}`
      publish(newThis._movie, type, { ...event, target: newThis._movie, type })
    })

    return newThis
  }

  attach (movie) {
    this._movie = movie
  }

  detach () {
    this._movie = null
  }

  /**
   * Called when the layer is activated
   */
  start () {}

  /**
   * Called when the movie renders and the layer is active
   */
  render () {}

  /**
  * Called when the layer is deactivated
   */
  stop () {}

  get parent () {
    return this._movie
  }

  /**
   * If the attached movie's playback position is in this layer
   * @type boolean
   */
  get active () {
    return this._active
  }

  /**
   * @type number
   */
  get startTime () {
    return this._startTime
  }

  set startTime (val) {
    this._startTime = val
  }

  /**
   * The current time of the movie relative to this layer
   * @type number
   */
  get currentTime () {
    return this._movie ? this._movie.currentTime - this.startTime
      : undefined
  }

  /**
   * @type number
   */
  get duration () {
    return this._duration
  }

  set duration (val) {
    this._duration = val
  }

  get movie () {
    return this._movie
  }

  getDefaultOptions () {
    return {
      startTime: undefined, // required
      duration: undefined // required
    }
  }
}
// id for events (independent of instance, but easy to access when on prototype chain)
Base.prototype.type = 'layer'
Base.prototype.publicExcludes = []
Base.prototype.propertyFilters = {}

/** Any layer that renders to a canvas */
export class Visual extends Base {
  /**
   * Creates a visual layer
   *
   * @param {object} options - various optional arguments
   * @param {number} [options.width=null] - the width of the entire layer
   * @param {number} [options.height=null] - the height of the entire layer
   * @param {number} [options.x=0] - the offset of the layer relative to the movie
   * @param {number} [options.y=0] - the offset of the layer relative to the movie
   * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
   *  for a transparent background
   * @param {object} [options.border=null] - the layer's outline, or <code>null</code> for no outline
   * @param {string} [options.border.color] - the outline's color; required for a border
   * @param {string} [options.border.thickness=1] - the outline's weight
   * @param {number} [options.opacity=1] - the layer's opacity; <code>1</cod> for full opacity
   *  and <code>0</code> for full transparency
   */
  constructor (options) {
    super(options)
    // only validate extra if not subclassed, because if subclcass, there will be extraneous options
    applyOptions(options, this)

    this._canvas = document.createElement('canvas')
    this._vctx = this.canvas.getContext('2d')

    this._effectsBack = []
    const that = this
    this._effects = new Proxy(this._effectsBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(this, argumentsList)
      },
      deleteProperty: function (target, property) {
        const value = target[property]
        value.detach()
        delete target[property]
        return true
      },
      set: function (target, property, value, receiver) {
        if (!isNaN(property)) { // if property is an number (index)
          if (target[property]) {
            target[property].detach()
          }
          value.attach(that)
        }
        target[property] = value
        return true
      }
    })
  }

  /**
   * Render visual output
   */
  render (reltime) {
    this.beginRender(reltime)
    this.doRender(reltime)
    this.endRender(reltime)
  }

  beginRender (reltime) {
    this.canvas.width = val(this, 'width', reltime)
    this.canvas.height = val(this, 'height', reltime)
    this.vctx.globalAlpha = val(this, 'opacity', reltime)
  }

  doRender (reltime) {
    // if this.width or this.height is null, that means "take all available screen space", so set it to
    // this._move.width or this._movie.height, respectively
    // canvas.width & canvas.height are already interpolated
    if (this.background) {
      this.vctx.fillStyle = val(this, 'background', reltime)
      this.vctx.fillRect(0, 0, this.canvas.width, this.canvas.height) // (0, 0) relative to layer
    }
    if (this.border && this.border.color) {
      this.vctx.strokeStyle = val(this, 'border.color', reltime)
      this.vctx.lineWidth = val(this, 'border.thickness', reltime) || 1 // this is optional.. TODO: integrate this with defaultOptions
    }
  }

  endRender (reltime) {
    const w = val(this, 'width', reltime) || val(this._movie, 'width', this.startTime + reltime)
    const h = val(this, 'height', reltime) || val(this._movie, 'height', this.startTime + reltime)
    if (w * h > 0) {
      this._applyEffects()
    }
    // else InvalidStateError for drawing zero-area image in some effects, right?
  }

  _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      if (effect.enabled) {
        effect.apply(this, this._movie.currentTime - this.startTime) // pass relative time
      }
    }
  }

  /**
   * Convienence method for <code>effects.push()</code>
   * @param {BaseEffect} effect
   * @return {module:layer.Visual} the layer (for chaining)
   */
  addEffect (effect) {
    this.effects.push(effect); return this
  }

  /**
   * The intermediate rendering canvas
   * @type HTMLCanvasElement
   */
  get canvas () {
    return this._canvas
  }

  /**
   * The context of {@link module:layer.Visual#canvas}
   * @type CanvasRenderingContext2D
   */
  get vctx () {
    return this._vctx
  }

  /**
   * @type effect.Base[]
   */
  get effects () {
    return this._effects // priavte (because it's a proxy)
  }

  getDefaultOptions () {
    return {
      ...Base.prototype.getDefaultOptions(),
      /**
       * @name module:layer.Visual#x
       * @type number
       * @desc The offset of the layer relative to the movie
       */
      x: 0,
      /**
       * @name module:layer.Visual#y
       * @type number
       * @desc The offset of the layer relative to the movie
       */
      y: 0,
      /**
       * @name module:layer.Visual#width
       * @type number
       */
      width: null,
      /**
       * @name module:layer.Visual#height
       * @type number
       */
      height: null,
      /**
       * @name module:layer.Visual#background
       * @type string
       * @desc The css color code for the background, or <code>null</code> for transparency
       */
      background: null,
      /**
       * @name module:layer.Visual#border
       * @type string
       * @desc The css border style, or <code>null</code> for no border
       */
      border: null,
      /**
       * @name module:layer.Visual#opacity
       * @type number
       */
      opacity: 1
    }
  }
}
Visual.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['canvas', 'vctx', 'effects'])
Visual.prototype.propertyFilters = {
  ...Base.propertyFilters,
  /*
   * If this.width or this.height is null, that means "take all available
   * screen space", so set it to this._move.width or this._movie.height,
   * respectively
   */
  width: function (width) {
    return width != undefined ? width : this._movie.width // eslint-disable-line eqeqeq
  },
  height: function (height) {
    return height != undefined ? height : this._movie.height // eslint-disable-line eqeqeq
  }
}

export class Text extends Visual {
  // TODO: is textX necessary? it seems inconsistent, because you can't define width/height directly for a text layer
  /**
   * Creates a new text layer
   *
   * @param {object} options - various optional arguments
   * @param {string} options.text - the text to display
   * @param {string} [options.font="10px sans-serif"]
   * @param {string} [options.color="#fff"]
   * @param {number} [options.textX=0] - the text's horizontal offset relative to the layer
   * @param {number} [options.textY=0] - the text's vertical offset relative to the layer
   * @param {number} [options.maxWidth=null] - the maximum width of a line of text
   * @param {string} [options.textAlign="start"] - horizontal align
   * @param {string} [options.textBaseline="top"] - vertical align
   * @param {string} [options.textDirection="ltr"] - the text direction
   *
   * @todo add padding options
   */
  constructor (options = {}) {
    //                          default to no (transparent) background
    super({ background: null, ...options }) // fill in zeros in |doRender|
    applyOptions(options, this)

    // `text` is now set in applyOptions

    // this._prevText = undefined;
    // // because the canvas context rounds font size, but we need to be more accurate
    // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
    // this._lastFont = undefined;
    // this._prevMaxWidth = undefined;
  }

  doRender (reltime) {
    super.doRender(reltime)
    const text = val(this, 'text', reltime); const font = val(this, 'font', reltime)
    const maxWidth = this.maxWidth ? val(this, 'maxWidth', reltime) : undefined
    // // properties that affect metrics
    // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
    //     this._updateMetrics(text, font, maxWidth);

    this.vctx.font = font
    this.vctx.fillStyle = val(this, 'color', reltime)
    this.vctx.textAlign = val(this, 'textAlign', reltime)
    this.vctx.textBaseline = val(this, 'textBaseline', reltime)
    this.vctx.textDirection = val(this, 'textDirection', reltime)
    this.vctx.fillText(
      text, val(this, 'textX', reltime), val(this, 'textY', reltime),
      maxWidth
    )

    this._prevText = text
    this._prevFont = font
    this._prevMaxWidth = maxWidth
  }

  // _updateMetrics(text, font, maxWidth) {
  //     // TODO calculate / measure for non-integer font.size values
  //     let metrics = Text._measureText(text, font, maxWidth);
  //     // TODO: allow user-specified/overwritten width/height
  //     this.width = /*this.width || */metrics.width;
  //     this.height = /*this.height || */metrics.height;
  // }

  // TODO: implement setters and getters that update dimensions!

  /* static _measureText(text, font, maxWidth) {
        // TODO: fix too much bottom padding
        const s = document.createElement("span");
        s.textContent = text;
        s.style.font = font;
        s.style.padding = "0";
        if (maxWidth) s.style.maxWidth = maxWidth;
        document.body.appendChild(s);
        const metrics = {width: s.offsetWidth, height: s.offsetHeight};
        document.body.removeChild(s);
        return metrics;
    } */

  getDefaultOptions () {
    return {
      ...Visual.prototype.getDefaultOptions(),
      background: null,
      text: undefined, // required
      /**
       * @name module:layer.Text#font
       * @type string
       * @desc The css font to render with
       */
      font: '10px sans-serif',
      /**
       * @name module:layer.Text#font
       * @type string
       * @desc The css color to render with
       */
      color: '#fff',
      /**
       * @name module:layer.Text#textX
       * @type number
       * @desc Offset of the text relative to the layer
       */
      textX: 0,
      /**
       * @name module:layer.Text#textY
       * @type number
       * @desc Offset of the text relative to the layer
       */
      textY: 0,
      /**
       * @name module:layer.Text#maxWidth
       * @type number
       */
      maxWidth: null,
      /**
       * @name module:layer.Text#textAlign
       * @type string
       * @desc The horizontal alignment
       * @see [<code>CanvasRenderingContext2D#textAlign</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign}
       */
      textAlign: 'start',
      /**
       * @name module:layer.Text#textAlign
       * @type string
       * @desc the vertical alignment
       * @see [<code>CanvasRenderingContext2D#textBaseline</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
       */
      textBaseline: 'top',
      /**
       * @name module:layer.Text#textDirection
       * @type string
       * @see [<code>CanvasRenderingContext2D#direction</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
       */
      textDirection: 'ltr'
    }
  }
}

/**
 * Image or video
 * @mixin VisualSourceMixin
 */
export const VisualSourceMixin = superclass => {
  if (superclass !== Visual && !(superclass.prototype instanceof Visual)) {
    throw new Error('VisualSourceMixin can only be applied to subclasses of Visual')
  }

  class VisualSource extends superclass {
    /**
     * @param {number} startTime
     * @param {number} endTime
     * @param {(HTMLImageElement|HTMLVideoElement)} media
     * @param {object} [options]
     * @param {number} [options.sourceX=0] - image source x
     * @param {number} [options.sourceY=0] - image source y
     * @param {number} [options.sourceWidth=undefined] - image source width, or <code>undefined</code> to fill the entire layer
     * @param {number} [options.sourceHeight=undefined] - image source height, or <code>undefined</code> to fill the entire layer
     * @param {number} [options.destX=0] - offset of the image relative to the layer
     * @param {number} [options.destY=0] - offset of the image relative to the layer
     * @param {number} [options.destWidth=undefined] - width to render the image at
     * @param {number} [options.destHeight=undefined] - height to render the image at
     */
    constructor (options) {
      super(options) // works with both Base and Visual
      this._source = options.source // set readonly property manually
      applyOptions(options, this)
    }

    doRender (reltime) {
      super.doRender(reltime) // clear/fill background

      /*
       * Source dimensions crop the image. Dest dimensions set the size that
       * the image will be rendered at *on the layer*. Note that this is
       * different than the layer dimensions (`this.width` and `this.height`).
       * The main reason this distinction exists is so that an image layer can
       * be rotated without being cropped (see iss #46).
       */
      this.vctx.drawImage(
        this.source,
        val(this, 'sourceX', reltime), val(this, 'sourceY', reltime),
        val(this, 'sourceWidth', reltime), val(this, 'sourceHeight', reltime),
        // `destX` and `destY` are relative to the layer
        val(this, 'destX', reltime), val(this, 'destY', reltime),
        val(this, 'destWidth', reltime), val(this, 'destHeight', reltime)
      )
    }

    /**
     * The raw html media element
     * @type HTMLMediaElement
     */
    get source () {
      return this._source
    }

    getDefaultOptions () {
      return {
        ...superclass.prototype.getDefaultOptions(),
        source: undefined, // required
        /**
         * @name module:layer.VisualSource#sourceX
         * @type number
         */
        sourceX: 0,
        /**
         * @name module:layer.VisualSource#sourceY
         * @type number
         */
        sourceY: 0,
        /**
         * @name module:layer.VisualSource#sourceWidth
         * @type number
         * @desc How much to render of the source, or <code>undefined</code> to render the entire width
         */
        sourceWidth: undefined,
        /**
         * @name module:layer.VisualSource#sourceHeight
         * @type number
         * @desc How much to render of the source, or <code>undefined</code> to render the entire height
         */
        sourceHeight: undefined,
        /**
         * @name module:layer.VisualSource#destX
         * @type number
         */
        destX: 0,
        /**
         * @name module:layer.VisualSource#destY
         * @type number
         */
        destY: 0,
        /**
         * @name module:layer.VisualSource#destWidth
         * @type number
         * @desc Width to render the source at, or <code>undefined</code> to use the layer's width
         */
        destWidth: undefined,
        /**
         * @name module:layer.VisualSource#destHeight
         * @type number
         * @desc Height to render the source at, or <code>undefined</code> to use the layer's height
         */
        destHeight: undefined
      }
    }
  };
  VisualSource.prototype.propertyFilters = {
    ...Visual.propertyFilters,

    /*
     * If no layer width was provided, fall back to the dest width.
     * If no dest width was provided, fall back to the source width.
     * If no source width was provided, fall back to `source.width`.
     */
    sourceWidth: function (sourceWidth) {
      // != instead of !== to account for `null`
      const width = this.source instanceof HTMLImageElement
        ? this.source.width
        : this.source.videoWidth
      return sourceWidth != undefined ? sourceWidth : width // eslint-disable-line eqeqeq
    },
    sourceHeight: function (sourceHeight) {
      const height = this.source instanceof HTMLImageElement
        ? this.source.height
        : this.source.videoHeight
      return sourceHeight != undefined ? sourceHeight : height // eslint-disable-line eqeqeq
    },
    destWidth: function (destWidth) {
      // I believe reltime is redundant, as element#currentTime can be used
      // instead. (TODO: fact check)
      /* eslint-disable eqeqeq */
      return destWidth != undefined
        ? destWidth : val(this, 'sourceWidth', this.currentTime)
    },
    destHeight: function (destHeight) {
      /* eslint-disable eqeqeq */
      return destHeight != undefined
        ? destHeight : val(this, 'sourceHeight', this.currentTime)
    },
    width: function (width) {
      /* eslint-disable eqeqeq */
      return width != undefined
        ? width : val(this, 'destWidth', this.currentTime)
    },
    height: function (height) {
      /* eslint-disable eqeqeq */
      return height != undefined
        ? height : val(this, 'destHeight', this.currentTime)
    }
  }

  return VisualSource
}

export class Image extends VisualSourceMixin(Visual) {}

/**
 * Video or audio
 * @mixin MediaMixin
 * @todo implement playback rate
 */
export const MediaMixin = superclass => {
  if (superclass !== Base && !(superclass.prototype instanceof Base)) {
    throw new Error('MediaMixin can only be applied to subclasses of Base')
  }

  class Media extends superclass {
    /**
     * @param {object} options
     * @param {HTMLVideoElement} options.media
     * @param {function} options.onload
     * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
     * @param {numer} [options.duration=media.duration-options.mediaStartTime]
     * @param {boolean} [options.muted=false]
     * @param {number} [options.volume=1]
     * @param {number} [options.playbackRate=1]
     */
    constructor (options = {}) {
      const onload = options.onload
      delete options.onload // don't set as instance property
      super(options) // works with both Base and Visual
      this._initialized = false
      // Set media manually, because it's readonly.
      this._media = options.media
      this._mediaStartTime = options.mediaStartTime || 0
      applyOptions(options, this)

      const load = () => {
        // TODO:              && ?
        if ((options.duration || (this.media.duration - this.mediaStartTime)) < 0) {
          throw new Error('Invalid options.duration or options.mediaStartTime')
        }
        this._unstretchedDuration = options.duration || (this.media.duration - this.mediaStartTime)
        this.duration = this._unstretchedDuration / (this.playbackRate)
        // onload will use `this`, and can't bind itself because it's before super()
        onload && onload.bind(this)(this.media, options)
      }
      if (this.media.readyState >= 2) {
        // this frame's data is available now
        load()
      } else {
        // when this frame's data is available
        this.media.addEventListener('loadedmetadata', load)
      }
      this.media.addEventListener('durationchange', () => {
        this.duration = options.duration || (this.media.duration - this.mediaStartTime)
      })

      // TODO: on unattach?
      subscribe(this, 'movie.audiodestinationupdate', event => {
        // Connect to new destination if immeidately connected to the existing
        // destination.
        if (this._connectedToDestination) {
          this.source.disconnect(this.movie.actx.destination)
          this.source.connect(event.destination)
        }
      })
    }

    attach (movie) {
      super.attach(movie)

      subscribe(movie, 'movie.seek', () => {
        const time = movie.currentTime
        if (time < this.startTime || time >= this.startTime + this.duration) {
          return
        }
        this.media.currentTime = time - this.startTime
      })
      // connect to audiocontext
      this._source = movie.actx.createMediaElementSource(this.media)

      // Spy on connect and disconnect to remember if it connected to
      // actx.destination (for Movie#record).
      const oldConnect = this._source.connect.bind(this.source)
      this._source.connect = (destination, outputIndex, inputIndex) => {
        this._connectedToDestination = destination === movie.actx.destination
        return oldConnect(destination, outputIndex, inputIndex)
      }
      const oldDisconnect = this._source.disconnect.bind(this.source)
      this._source.disconnect = (destination, output, input) => {
        if (this.connectedToDestination &&
        destination === movie.actx.destination) {
          this._connectedToDestination = false
        }
        return oldDisconnect(destination, output, input)
      }

      // Connect to actx.destination by default (can be rewired by user)
      this.source.connect(movie.actx.destination)
    }

    start (reltime) {
      this.media.currentTime = reltime + this.mediaStartTime
      this.media.play()
    }

    render (reltime) {
      super.render(reltime)
      // even interpolate here
      // TODO: implement Issue: Create built-in audio node to support built-in audio nodes, as this does nothing rn
      this.media.muted = val(this, 'muted', reltime)
      this.media.volume = val(this, 'volume', reltime)
      this.media.playbackRate = val(this, 'playbackRate', reltime)
    }

    stop () {
      this.media.pause()
    }

    /**
     * The raw html media element
     * @type HTMLMediaElement
     */
    get media () {
      return this._media
    }

    /**
     * The audio source node for the media
     * @type MediaStreamAudioSourceNode
     */
    get source () {
      return this._source
    }

    get playbackRate () {
      return this._playbackRate
    }

    set playbackRate (value) {
      this._playbackRate = value
      if (this._unstretchedDuration !== undefined) {
        this.duration = this._unstretchedDuration / value
      }
    }

    get startTime () {
      return this._startTime
    }

    set startTime (val) {
      this._startTime = val
      if (this._initialized) {
        const mediaProgress = this._movie.currentTime - this.startTime
        this.media.currentTime = this.mediaStartTime + mediaProgress
      }
    }

    set mediaStartTime (val) {
      this._mediaStartTime = val
      if (this._initialized) {
        const mediaProgress = this._movie.currentTime - this.startTime
        this.media.currentTime = mediaProgress + this.mediaStartTime
      }
    }

    /**
     * Where in the media the layer starts at
     * @type number
     */
    get mediaStartTime () {
      return this._mediaStartTime
    }

    getDefaultOptions () {
      return {
        ...superclass.prototype.getDefaultOptions(),
        media: undefined, // required
        /**
         * @name module:layer~Media#mediaStartTime
         * @type number
         * @desc Where in the media the layer starts at
         */
        mediaStartTime: 0,
        /**
         * @name module:layer~Media#duration
         * @type number
         */
        duration: undefined, // important to include undefined keys, for applyOptions
        /**
         * @name module:layer~Media#muted
         * @type boolean
         */
        muted: false,
        /**
         * @name module:layer~Media#volume
         * @type number
         */
        volume: 1,
        /**
         * @name module:layer~Media#playbackRate
         * @type number
         * @todo <strong>Implement</strong>
         */
        playbackRate: 1
      }
    }
  };

  return Media // custom mixin class
}

// use mixins instead of `extend`ing two classes (which doens't work); see below class def
/**
 * @extends module:layer~Media
 */
export class Video extends MediaMixin(VisualSourceMixin(Visual)) {}

/**
 * @extends module:layer~Media
 */
export class Audio extends MediaMixin(Base) {
  /**
   * Creates an audio layer
   *
   * @param {object} options
   */
  constructor (options = {}) {
    // fill in the zero once loaded, no width or height (will raise error)
    super(options)
    if (this.duration === undefined) {
      this.duration = this.media.duration - this.mediaStartTime
    }
  }

  getDefaultOptions () {
    return {
      ...Object.getPrototypeOf(this).getDefaultOptions(), // let's not call MediaMixin again
      /**
       * @name module:layer.Audio#mediaStartTime
       * @type number
       * @desc Where in the media to start playing when the layer starts
       */
      mediaStartTime: 0,
      duration: undefined
    }
  }
}
