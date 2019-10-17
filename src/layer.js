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
   * @param {number} startTime - when to start the layer on the movie's timeline
   * @param {number} duration - how long the layer should last on the movie's timeline
   * @param {object} [options] - no options, here for consistency
   */
  constructor (startTime, duration, options = {}) { // rn, options isn't used but I'm keeping it here
    const newThis = watchPublic(this) // proxy that will be returned by constructor
    // Don't send updates when initializing, so use this instead of newThis:
    applyOptions(options, this) // no options rn, but just to stick to protocol

    this._startTime = startTime
    this._duration = duration

    this._active = false // whether newThis layer is currently being rendered

    // on attach to movie
    subscribe(newThis, 'layer.attach', event => {
      newThis._movie = event.movie
    })

    // Propogate up to target
    subscribe(newThis, 'layer.change', event => {
      const typeOfChange = event.type.substring(event.type.lastIndexOf('.') + 1)
      const type = `movie.change.layer.${typeOfChange}`
      publish(newThis._movie, type, { ...event, target: newThis._movie, type })
    })

    return newThis
  }

  /**
   * Generic step function
   * @todo rename to <code>render</code>
   */
  render () {}

  get _parent () {
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
   * @type number
   */
  get duration () {
    return this._duration
  }

  set duration (val) {
    this._duration = val
  }
}
// id for events (independent of instance, but easy to access when on prototype chain)
Base.prototype._type = 'layer'

Base.prototype.getDefaultOptions = function () {
  return {}
}
Base.prototype._publicExcludes = []

/** Any layer that renders to a canvas */
export class Visual extends Base {
  /**
   * Creates a visual layer
   *
   * @param {number} startTime - when to start the layer on the movie's timeline
   * @param {number} duration - how long the layer should last on the movie's timeline
   * @param {object} [options] - various optional arguments
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
  constructor (startTime, duration, options = {}) {
    super(startTime, duration, options)
    // only validate extra if not subclassed, because if subclcass, there will be extraneous options
    applyOptions(options, this)

    this._canvas = document.createElement('canvas')
    this._cctx = this.canvas.getContext('2d')

    this._effectsBack = []
    const that = this
    this._effects = new Proxy(this._effectsBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(this, argumentsList)
      },
      deleteProperty: function (target, property) {
        return true
      },
      set: function (target, property, value, receiver) {
        target[property] = value
        if (!isNaN(property)) { // if property is an number (index)
          publish(value, 'effect.attach', { target: that })
        }
        return true
      }
    })
  }

  /**
   * Render visual output
   */
  render (reltime) {
    this._beginRender(reltime)
    this._doRender(reltime)
    this._endRender(reltime)
  }

  _beginRender (reltime) {
    // if this.width or this.height is null, that means "take all available screen space", so set it to
    // this._move.width or this._movie.height, respectively
    const w = val(this.width || this._movie.width, this, reltime)
    const h = val(this.height || this._movie.height, this, reltime)
    this.canvas.width = w
    this.canvas.height = h
    this.cctx.globalAlpha = val(this.opacity, this, reltime)
  }

  _doRender (reltime) {
    // if this.width or this.height is null, that means "take all available screen space", so set it to
    // this._move.width or this._movie.height, respectively
    // canvas.width & canvas.height are already interpolated
    if (this.background) {
      this.cctx.fillStyle = val(this.background, this, reltime)
      this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height) // (0, 0) relative to layer
    }
    if (this.border && this.border.color) {
      this.cctx.strokeStyle = val(this.border.color, this, reltime)
      this.cctx.lineWidth = val(this.border.thickness, this, reltime) || 1 // this is optional.. TODO: integrate this with defaultOptions
    }
  }

  _endRender (reltime) {
    const w = val(this.width || this._movie.width, this, reltime)
    const h = val(this.height || this._movie.height, this, reltime)
    if (w * h > 0) {
      this._applyEffects()
    }
    // else InvalidStateError for drawing zero-area image in some effects, right?
  }

  _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      effect.apply(this, this._movie.currentTime - this.startTime) // pass relative time
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
  get cctx () {
    return this._cctx
  }

  /**
   * @type effect.Base[]
   */
  get effects () {
    return this._effects // priavte (because it's a proxy)
  }
}
// TODO: move these inside class declaration?
Visual.prototype.getDefaultOptions = function () {
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
Visual.prototype._publicExcludes = Base.prototype._publicExcludes.concat(['canvas', 'cctx', 'effects'])

export class Text extends Visual {
  // TODO: is textX necessary? it seems inconsistent, because you can't define width/height directly for a text layer
  /**
   * Creates a new text layer
   *
   * @param {number} startTime
   * @param {number} duration
   * @param {string} text - the text to display
   * @param {number} width - the width of the entire layer
   * @param {number} height - the height of the entire layer
   * @param {object} [options] - various optional arguments
   * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
   * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
   * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
   *  for a transparent background
   * @param {object} [options.border=null] - the layer's outline, or <code>null</code> for no outline
   * @param {string} [options.border.color] - the outline"s color; required for a border
   * @param {string} [options.border.thickness=1] - the outline"s weight
   * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
   *  and <code>0</code> for full transparency
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
  constructor (startTime, duration, text, options = {}) {
    //                          default to no (transparent) background
    super(startTime, duration, { background: null, ...options }) // fill in zeros in |_doRender|
    applyOptions(options, this)

    /**
     * @type string
     */
    this.text = text

    // this._prevText = undefined;
    // // because the canvas context rounds font size, but we need to be more accurate
    // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
    // this._lastFont = undefined;
    // this._prevMaxWidth = undefined;
  }

  _doRender (reltime) {
    super._doRender(reltime)
    const text = val(this.text, this, reltime); const font = val(this.font, this, reltime)
    const maxWidth = this.maxWidth ? val(this.maxWidth, this, reltime) : undefined
    // // properties that affect metrics
    // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
    //     this._updateMetrics(text, font, maxWidth);

    this.cctx.font = font
    this.cctx.fillStyle = val(this.color, this, reltime)
    this.cctx.textAlign = val(this.textAlign, this, reltime)
    this.cctx.textBaseline = val(this.textBaseline, this, reltime)
    this.cctx.textDirection = val(this.textDirection, this, reltime)
    this.cctx.fillText(
      text, val(this.textX, this, reltime), val(this.textY, this, reltime),
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
}
Text.prototype.getDefaultOptions = function () {
  return {
    ...Visual.prototype.getDefaultOptions(),
    background: null,
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

export class Image extends Visual {
  /**
   * Creates a new image layer
   *
   * @param {number} startTime
   * @param {number} duration
   * @param {HTMLImageElement} image
   * @param {object} [options]
   * @param {number} [options.x=0] - the offset of the layer relative to the movie
   * @param {number} [options.y=0] - the offset of the layer relative to the movie
   * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
   *  for transparency
   * @param {object} [options.border=null] - the layer"s outline, or <code>null</code> for no outline
   * @param {string} [options.border.color] - the outline"s color; required for a border
   * @param {string} [options.border.thickness=1] - the outline"s weight
   * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
   *  and <code>0</code> for full transparency
   * @param {number} [options.clipX=0] - image source x
   * @param {number} [options.clipY=0] - image source y
   * @param {number} [options.clipWidth=undefined] - image source width, or <code>undefined</code> to fill the entire layer
   * @param {number} [options.clipHeight=undefined] - image source height, or <code>undefined</code> to fill the entire layer
   * @param {number} [options.imageX=0] - offset of the image relative to the layer
   * @param {number} [options.imageY=0] - offset of the image relative to the layer
   */
  constructor (startTime, duration, image, options = {}) {
    super(startTime, duration, options) // wait to set width & height
    applyOptions(options, this)
    // clipX... => how much to show of this.image
    // imageX... => how to project this.image onto the canvas
    this._image = image

    const load = () => {
      this.width = this.imageWidth = this.width || this.image.width
      this.height = this.imageHeight = this.height || this.image.height
      this.clipWidth = this.clipWidth || image.width
      this.clipHeight = this.clipHeight || image.height
    }
    if (image.complete) {
      load()
    } else {
      image.addEventListener('load', load)
    }
  }

  _doRender (reltime) {
    super._doRender(reltime) // clear/fill background
    this.cctx.drawImage(
      this.image,
      val(this.clipX, this, reltime), val(this.clipY, this, reltime),
      val(this.clipWidth, this, reltime), val(this.clipHeight, this, reltime),
      // this.imageX and this.imageY are relative to layer
      val(this.imageX, this, reltime), val(this.imageY, this, reltime),
      val(this.imageWidth, this, reltime), val(this.imageHeight, this, reltime)
    )
  }

  /**
   * @type HTMLImageElement
   */
  get image () {
    return this._image
  }
}
Image.prototype.getDefaultOptions = function () {
  return {
    ...Visual.prototype.getDefaultOptions(),
    /**
     * @name module:layer.Image#clipX
     * @type number
     * @desc Image source x
     */
    clipX: 0,
    /**
     * @name module:layer.Image#clipY
     * @type number
     * @desc Image source y
     */
    clipY: 0,
    /**
     * @name module:layer.Image#clipWidth
     * @type number
     * @desc Image source width, or <code>undefined</code> to fill the entire layer
     */
    clipWidth: undefined,
    /**
     * @name module:layer.Image#clipHeight
     * @type number
     * @desc Image source height, or <code>undefined</code> to fill the entire layer
     */
    clipHeight: undefined,
    /**
     * @name module:layer.Image#imageX
     * @type number
     * @desc Offset of the image relative to the layer
     */
    imageX: 0,
    /**
     * @name module:layer.Image#imageX
     * @type number
     * @desc Offset of the image relative to the layer
     */
    imageY: 0
  }
}

// https://web.archive.org/web/20190111044453/http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
/**
 * Video or audio
 * @mixin MediaMixin
 * @todo implement playback rate
 */
export const MediaMixin = superclass => {
  if (superclass !== Base && superclass !== Visual) {
    throw new Error('Media can only extend Base and Visual')
  }

  class Media extends superclass {
    /**
     * @param {number} startTime
     * @param {HTMLVideoElement} media
     * @param {object} [options]
     * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
     * @param {numer} [options.duration=media.duration-options.mediaStartTime]
     * @param {boolean} [options.muted=false]
     * @param {number} [options.volume=1]
     * @param {number} [options.playbackRate=1]
     */
    constructor (startTime, media, onload, options = {}) {
      super(startTime, 0, options) // works with both Base and Visual
      this._initialized = false
      this._media = media
      this._mediaStartTime = options.mediaStartTime || 0
      applyOptions(options, this)

      const load = () => {
        // TODO:              && ?
        if ((options.duration || (media.duration - this.mediaStartTime)) < 0) {
          throw new Error('Invalid options.duration or options.mediaStartTime')
        }
        this.duration = options.duration || (media.duration - this.mediaStartTime)
        // onload will use `this`, and can't bind itself because it's before super()
        onload && onload.bind(this)(media, options)
      }
      if (media.readyState >= 2) {
        // this frame's data is available now
        load()
      } else {
        // when this frame's data is available
        media.addEventListener('canplay', load)
      }
      media.addEventListener('durationchange', () => {
        this.duration = options.duration || (media.duration - this.mediaStartTime)
      })

      subscribe(this, 'layer.attach', event => {
        subscribe(event.movie, 'movie.seek', e => {
          const time = e.movie.currentTime
          if (time < this.startTime || time >= this.startTime + this.duration) {
            return
          }
          this.media.currentTime = time - this.startTime
        })
        // connect to audiocontext
        this._source = event.movie.actx.createMediaElementSource(this.media)
        this.source.connect(event.movie.actx.destination)
      })
      // TODO: on unattach?
      subscribe(this, 'movie.audiodestinationupdate', event => {
        // reset destination
        this.source.disconnect()
        this.source.connect(event.destination)
      })
      subscribe(this, 'layer.start', () => {
        this.media.currentTime = (this._movie.currentTime - this.startTime) + this.mediaStartTime
        this.media.play()
      })
      subscribe(this, 'layer.stop', () => {
        this.media.pause()
      })
    }

    render (reltime) {
      super.render(reltime)
      // even interpolate here
      // TODO: implement Issue: Create built-in audio node to support built-in audio nodes, as this does nothing rn
      this.media.muted = val(this.muted, this, reltime)
      this.media.volume = val(this.volume, this, reltime)
      this.media.playbackRate = val(this.playbackRate, this, reltime)
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
  };
  Media.prototype.getDefaultOptions = function () {
    return {
      ...superclass.prototype.getDefaultOptions(),
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

  return Media // custom mixin class
}

// use mixins instead of `extend`ing two classes (which doens't work); see below class def
/**
 * @extends module:layer~Media
 */
export class Video extends MediaMixin(Visual) {
  /**
   * Creates a new video layer
   *
   * @param {number} startTime
   * @param {HTMLVideoElement} media
   * @param {object} [options]
   * @param {number} startTime
   * @param {HTMLVideoElement} media
   * @param {object} [options]
   * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
   * @param {numer} [options.duration=media.duration-options.mediaStartTime]
   * @param {boolean} [options.muted=false]
   * @param {number} [options.volume=1]
   * @param {number} [options.speed=1] - the audio's playerback rate
   * @param {number} [options.mediaStartTime=0] - at what time in the video the layer starts
   * @param {numer} [options.duration=media.duration-options.mediaStartTime]
   * @param {number} [options.clipX=0] - video source x
   * @param {number} [options.clipY=0] - video source y
   * @param {number} [options.clipWidth=0] - video destination width
   * @param {number} [options.clipHeight=0] - video destination height
   * @param {number} [options.mediaX=0] - video offset relative to the layer
   * @param {number} [options.mediaY=0] - video offset relative to the layer
   */
  constructor (startTime, media, options = {}) {
    // fill in the zeros once loaded
    super(startTime, media, function () {
      this.width = this.mediaWidth = options.width || media.videoWidth
      this.height = this.mediaHeight = options.height || media.videoHeight
      this.clipWidth = options.clipWidth || media.videoWidth
      this.clipHeight = options.clipHeight || media.videoHeight
    }, options)
    // clipX... => how much to show of this.media
    // mediaX... => how to project this.media onto the canvas
    applyOptions(options, this)
    if (this.duration === undefined) {
      this.duration = media.duration - this.mediaStartTime
    }
  }

  _doRender (reltime) {
    super._doRender()
    this.cctx.drawImage(this.media,
      val(this.clipX, this, reltime), val(this.clipY, this, reltime),
      val(this.clipWidth, this, reltime), val(this.clipHeight, this, reltime),
      val(this.mediaX, this, reltime), val(this.mediaY, this, reltime), // relative to layer
      val(this.mediaWidth, this, reltime), val(this.mediaHeight, this, reltime))
  }
}
Video.prototype.getDefaultOptions = function () {
  return {
    ...Object.getPrototypeOf(this).getDefaultOptions(), // let's not call MediaMixin again
    /**
     * @name module:layer.Video#clipX
     * @type number
     * @desc Video source x
     */
    clipX: 0,
    /**
     * @name module:layer.Video#clipY
     * @type number
     * @desc Video source y
     */
    clipY: 0,
    /**
     * @name module:layer.Video#mediaX
     * @type number
     * @desc Video offset relative to layer
     */
    mediaX: 0,
    /**
     * @name module:layer.Video#mediaY
     * @type number
     * @desc Video offset relative to layer
     */
    mediaY: 0,
    /**
     * @name module:layer.Video#mediaWidth
     * @type number
     * @desc Video destination width
     */
    mediaWidth: undefined,
    /**
     * @name module:layer.Video#mediaHeight
     * @type number
     * @desc Video destination height
     */
    mediaHeight: undefined
  }
}

/**
 * @extends module:layer~Media
 */
export class Audio extends MediaMixin(Base) {
  /**
   * Creates an audio layer
   *
   * @param {number} startTime
   * @param {HTMLAudioElement} media
   * @param {object} [options]
   * @param {number} startTime
   * @param {HTMLVideoElement} media
   * @param {object} [options]
   * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
   * @param {numer} [options.duration=media.duration-options.mediaStartTime]
   * @param {boolean} [options.muted=false]
   * @param {number} [options.volume=1]
   * @param {number} [options.speed=1] - the audio's playerback rate
   */
  constructor (startTime, media, options = {}) {
    // fill in the zero once loaded, no width or height (will raise error)
    super(startTime, media, null, options)
    applyOptions(options, this)
    if (this.duration === undefined) {
      this.duration = media.duration - this.mediaStartTime
    }
  }
}
Audio.prototype.getDefaultOptions = function () {
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
