/**
 * @module movie
 */

import { subscribe, publish } from './event.js'
import { val, applyOptions, watchPublic } from './util.js'
import { Audio as AudioLayer, Video as VideoLayer } from './layer.js' // `Media` mixins

/**
 * Contains all layers and movie information<br>
 * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
 *
 * @todo Implement event "durationchange", and more
 * @todo Add width and height options
 * @todo Make record option to make recording video output to the user while it's recording
 * @todo rename renderingFrame -> refreshing
 */
export default class Movie {
  /**
   * Creates a new <code>Movie</code> instance (project)
   *
   * @param {HTMLCanvasElement} canvas - the canvas to display image data on
   * @param {object} [options] - various optional arguments
   * @param {BaseAudioContext} [options.audioContext=new AudioContext()]
   * @param {string} [options.background="#000"] - the background color of the movijse,
   *  or <code>null</code> for a transparent background
   * @param {boolean} [options.repeat=false] - whether to loop playbackjs
   * @param {boolean} [options.autoRefresh=true] - whether to call `.refresh()` on init and when relevant layers
   *  are added/removed
   */
  constructor (canvas, options = {}) {
    // TODO: move into multiple methods!
    // Rename audioContext -> _actx
    if ('audioContext' in options) {
      options._actx = options.audioContext
    }
    delete options.audioContext // TODO: move up a line :P

    const newThis = watchPublic(this) // proxy that will be returned by constructor
    // Don't send updates when initializing, so use this instead of newThis:
    // output canvas
    this._canvas = canvas
    // output canvas context
    this._cctx = canvas.getContext('2d') // TODO: make private?
    applyOptions(options, this)

    // proxy arrays
    const that = newThis

    this._effectsBack = []
    this._effects = new Proxy(newThis._effectsBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(newThis, argumentsList)
      },
      deleteProperty: function (target, property) {
        // Refresh screen when effect is removed, if the movie isn't playing already.
        const value = target[property]
        publish(that, 'movie.change.effect.remove', { effect: value })
        publish(value, 'effect.detach', { target: that })
        delete target[property]
        return true
      },
      set: function (target, property, value) {
        if (!isNaN(property)) { // if property is an number (index)
          if (target[property]) {
            delete target[property] // call deleteProperty
          }
          publish(value, 'effect.attach', { target: that }) // Attach effect to movie (first)
          // Refresh screen when effect is set, if the movie isn't playing already.
          publish(that, 'movie.change.effect.add', { effect: value })
        }
        target[property] = value
        return true
      }
    })

    this._layersBack = []
    this._layers = new Proxy(newThis._layersBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(newThis, argumentsList)
      },
      deleteProperty: function (target, property) {
        const value = target[property]
        publish(value, 'layer.detach', { movie: that })
        const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration
        if (current) {
          publish(that, 'movie.change.layer.remove', { layer: value })
        }
        delete target[property]
        return true
      },
      set: function (target, property, value) {
        target[property] = value
        if (!isNaN(property)) { // if property is an number (index)
          publish(value, 'layer.attach', { movie: that }) // Attach layer to movie (first)
          // Refresh screen when a relevant layer is added or removed
          const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration
          if (current) {
            publish(that, 'movie.change.layer.add', { layer: value })
          }
        }
        return true
      }
    })
    this._paused = true
    this._ended = false
    // to prevent multiple frame-rendering loops at the same time (see `render`)
    this._renderingFrame = false // only applicable when rendering
    this._currentTime = 0

    this._mediaRecorder = null // for recording

    // NOTE: -1 works well in inequalities
    this._lastPlayed = -1 // the last time `play` was called
    this._lastPlayedOffset = -1 // what was `currentTime` when `play` was called
    // newThis._updateInterval = 0.1; // time in seconds between each "timeupdate" event
    // newThis._lastUpdate = -1;

    if (newThis.autoRefresh) {
      newThis.refresh() // render single frame on init
    }

    // Subscribe to own event "change" (child events propogate up)
    subscribe(newThis, 'movie.change', () => {
      if (newThis.autoRefresh && !newThis.rendering) {
        newThis.refresh()
      }
    })

    // Subscribe to own event "ended"
    subscribe(newThis, 'movie.ended', () => {
      if (newThis.recording) {
        newThis._mediaRecorder.requestData() // I shouldn't have to call newThis right? err
        newThis._mediaRecorder.stop()
      }
    })

    return newThis
  }

  /**
   * Plays the movie
   * @return {Promise} fulfilled when done playing, never fails
   */
  play () {
    return new Promise((resolve, reject) => {
      if (!this.paused) {
        throw new Error('Already playing')
      }

      this._paused = this._ended = false
      this._lastPlayed = performance.now()
      this._lastPlayedOffset = this.currentTime

      if (!this._renderingFrame) {
        // Not rendering (and not playing), so play
        this._render(undefined, resolve)
      }
      // Stop rendering frame if currently doing so, because playing has higher priority.
      this._renderingFrame = false // this will effect the next _render call
    })
  }

  // TEST: *support recording that plays back with audio!*
  // TODO: figure out a way to record faster than playing (i.e. not in real time)
  // TODO: improve recording performance to increase frame rate?
  /**
   * Plays the movie in the background and records it
   *
   * @param {number} framerate
   * @param {object} [options]
   * @param {boolean} [options.video=true] - whether to include video in recording
   * @param {boolean} [options.audio=true] - whether to include audio in recording
   * @param {object} [options.mediaRecorderOptions=undefined] - options to pass to the <code>MediaRecorder</code>
   *  constructor
   * @return {Promise} resolves when done recording, rejects when internal media recorder errors
   */
  record (framerate, options = {}) {
    if (options.video === options.audio === false) {
      throw new Error('Both video and audio cannot be disabled')
    }

    if (!this.paused) {
      throw new Error('Cannot record movie while already playing or recording')
    }
    return new Promise((resolve, reject) => {
      // https://developers.google.com/web/updates/2016/01/mediarecorder
      const canvasCache = this.canvas
      // record on a temporary canvas context
      this._canvas = document.createElement('canvas')
      this.canvas.width = canvasCache.width
      this.canvas.height = canvasCache.height
      this._cctx = this.canvas.getContext('2d')

      const recordedChunks = [] // frame blobs
      // combine image + audio, or just pick one
      let tracks = []
      if (options.video !== false) {
        const visualStream = this.canvas.captureStream(framerate)
        tracks = tracks.concat(visualStream.getTracks())
      }
      // Check if there's a layer that's an instance of a Media mixin (Audio or Video)
      const hasMediaTracks = this.layers.some(layer => layer instanceof AudioLayer || layer instanceof VideoLayer)
      // If no media tracks present, don't include an audio stream, because Chrome doesn't record silence
      // when an audio stream is present.
      if (hasMediaTracks && options.audio !== false) {
        const audioDestination = this.actx.createMediaStreamDestination()
        const audioStream = audioDestination.stream
        tracks = tracks.concat(audioStream.getTracks())
        this.publishToLayers('movie.audiodestinationupdate', { movie: this, destination: audioDestination })
      }
      const stream = new MediaStream(tracks)
      const mediaRecorder = new MediaRecorder(stream, options.mediaRecorderOptions)
      // TODO: publish to movie, not layers
      mediaRecorder.ondataavailable = event => {
        // if (this._paused) reject(new Error("Recording was interrupted"));
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }
      mediaRecorder.onstop = () => {
        this._ended = true
        this._canvas = canvasCache
        this._cctx = this.canvas.getContext('2d')
        this.publishToLayers(
          'movie.audiodestinationupdate',
          { movie: this, destination: this.actx.destination }
        )
        this._mediaRecorder = null
        // construct super-blob
        // this is the exported video as a blob!
        resolve(new Blob(recordedChunks, { type: 'video/webm' }/*, {"type" : "audio/ogg; codecs=opus"} */))
      }
      mediaRecorder.onerror = reject

      mediaRecorder.start()
      this._mediaRecorder = mediaRecorder
      this.play()
    })
  }

  /**
   * Stops the movie, without reseting the playback position
   * @return {Movie} the movie (for chaining)
   */
  pause () {
    this._paused = true
    // disable all layers
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      layer.stop(this.currentTime - layer.startTime)
      layer._active = false
    }
    return this
  }

  /**
   * Stops playback and resets the playback position
   * @return {Movie} the movie (for chaining)
   */
  stop () {
    this.pause()
    this.currentTime = 0 // use setter?
    return this
  }

  /**
   * @param {number} [timestamp=performance.now()]
   * @param {function} [done=undefined] - called when done playing or when the current frame is loaded
   * @private
   */
  _render (timestamp = performance.now(), done = undefined) {
    if (!this.rendering) {
      // (!this.paused || this._renderingFrame) is true (it's playing or it's rendering a single frame)
      done && done()
      return
    }

    this._updateCurrentTime(timestamp)
    // bad for performance? (remember, it's calling Array.reduce)
    const end = this.duration
    const ended = this.currentTime >= end
    if (ended) {
      publish(this, 'movie.ended', { movie: this, repeat: this.repeat })
      this._currentTime = 0 // don't use setter
      publish(this, 'movie.timeupdate', { movie: this })
      this._lastPlayed = performance.now()
      this._lastPlayedOffset = 0 // this.currentTime
      this._renderingFrame = false
      if (!this.repeat || this.recording) {
        this._ended = true
        // disable all layers
        for (let i = 0; i < this.layers.length; i++) {
          const layer = this.layers[i]
          layer.stop(this.currentTime - layer.startTime)
          layer._active = false
        }
      }
      done && done()
      return
    }

    // do render
    this._renderBackground(timestamp)
    const frameFullyLoaded = this._renderLayers(timestamp)
    this._applyEffects()

    if (frameFullyLoaded) {
      publish(this, 'movie.loadeddata', { movie: this })
    }

    // if instant didn't load, repeatedly frame-render until frame is loaded
    // if the expression below is false, don't publish an event, just silently stop render loop
    if (this._renderingFrame && frameFullyLoaded) {
      this._renderingFrame = false
      done && done()
      return
    }

    window.requestAnimationFrame(timestamp => {
      this._render(timestamp)
    }) // TODO: research performance cost
  }

  _updateCurrentTime (timestamp) {
    // if we're only instant-rendering (current frame only), it doens't matter if it's paused or not
    if (!this._renderingFrame) {
      // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
      const sinceLastPlayed = (timestamp - this._lastPlayed) / 1000
      this._currentTime = this._lastPlayedOffset + sinceLastPlayed // don't use setter
      publish(this, 'movie.timeupdate', { movie: this })
      // this._lastUpdate = timestamp;
      // }
    }
  }

  _renderBackground (timestamp) {
    this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.background) {
      this.cctx.fillStyle = val(this.background, this, timestamp)
      this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  /**
   * @return {boolean} whether or not video frames are loaded
   * @param {number} [timestamp=performance.now()]
   * @private
   */
  _renderLayers (timestamp) {
    let frameFullyLoaded = true
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      const reltime = this.currentTime - layer.startTime
      // Cancel operation if outside layer time interval
      //                                                         > or >= ?
      if (this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
        // outside time interval
        // if only rendering this frame (instant==true), we are not "starting" the layer
        if (layer.active && !this._renderingFrame) {
          // TODO: make a `deactivate()` method?
          // console.log("stop");
          layer.stop(reltime)
          layer._active = false
        }
        continue
      }
      // if only rendering this frame, we are not "starting" the layer
      if (!layer.active && !this._renderingFrame) {
        // TODO: make an `activate()` method?
        // console.log("start");
        layer.start(reltime)
        layer._active = true
      }

      if (layer.media) {
        frameFullyLoaded = frameFullyLoaded && layer.media.readyState >= 2
      } // frame loaded
      layer.render(reltime) // pass relative time for convenience

      // if the layer has visual component
      if (layer.canvas) {
        // layer.canvas.width and layer.canvas.height should already be interpolated
        // if the layer has an area (else InvalidStateError from canvas)
        if (layer.canvas.width * layer.canvas.height > 0) {
          this.cctx.drawImage(layer.canvas,
            val(layer.x, layer, reltime), val(layer.y, layer, reltime), layer.canvas.width, layer.canvas.height
          )
        }
      }
    }

    return frameFullyLoaded
  }

  _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      effect.apply(this, this.currentTime)
    }
  }

  /**
   * Refreshes the screen (only use this if auto-refresh is disabled)
   * @return {Promise} - resolves when the frame is loaded
   */
  refresh () {
    if (this.rendering) {
      throw new Error('Cannot refresh frame while already rendering')
    }

    return new Promise((resolve, reject) => {
      this._renderingFrame = true
      this._render(undefined, resolve)
    })
  }

  /**
   * Convienence method
   * @todo Make private
   */
  publishToLayers (type, event) {
    for (let i = 0; i < this.layers.length; i++) {
      publish(this.layers[i], type, event)
    }
  }

  /**
   * If the movie is playing, recording or refreshing
   * @type boolean
   */
  get rendering () {
    return !this.paused || this._renderingFrame
  }

  /**
   * If the movie is refreshing current frame
   * @type boolean
   */
  get renderingFrame () {
    return this._renderingFrame
  }

  /**
   * If the movie is recording
   * @type boolean
   */
  get recording () {
    return !!this._mediaRecorder
  }

  /**
   * The combined duration of all layers
   * @type number
   */
  get duration () { // TODO: dirty flag?
    return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0)
  }

  /**
   * @type layer.Base[]
   */
  get layers () {
    return this._layers
  }

  // (proxy)
  /**
   * Convienence method for <code>layers.push()</code>
   * @param {BaseLayer} layer
   * @return {Movie} the movie (for chaining)
   */
  addLayer (layer) {
    this.layers.push(layer); return this
  }

  /**
   * @type effect.Base[]
   */
  get effects () {
    return this._effects // private (because it's a proxy)
  }

  /**
   * Convienence method for <code>effects.push()</code>
   * @param {BaseEffect} effect
   * @return {Movie} the movie (for chaining)
   */
  addEffect (effect) {
    this.effects.push(effect); return this
  }

  /**
   * @type boolean
   */
  get paused () {
    return this._paused
  }

  /**
   * If the playback position is at the end of the movie
   * @type boolean
   */
  get ended () {
    return this._ended
  }

  /**
   * The current playback position
   * @type number
   */
  get currentTime () {
    return this._currentTime
  }

  /**
   * Sets the current playback position. This is a more powerful version of `set currentTime`.
   *
   * @param {number} time - the new cursor's time value in seconds
   * @param {boolean} [refresh=true] - whether to render a single frame to match new time or not
   * @return {Promise} resolves when the current frame is rendered if <code>refresh</code> is true,
   *  otherwise resolves immediately
   *
   * @todo Refresh ionly f auto-refreshing is enabled
   */
  setCurrentTime (time, refresh = true) {
    return new Promise((resolve, reject) => {
      this._currentTime = time
      publish(this, 'movie.seek', { movie: this })
      if (refresh) {
        // pass promise callbacks to `refresh`
        this.refresh().then(resolve).catch(reject)
      } else {
        resolve()
      }
    })
  }

  set currentTime (time) {
    this._currentTime = time
    publish(this, 'movie.seek', { movie: this })
    this.refresh() // render single frame to match new time
  }

  /**
   * The rendering canvas
   * @type HTMLCanvasElement
   */
  get canvas () {
    return this._canvas
  }

  /**
   * The rendering canvas's context
   * @type CanvasRenderingContext2D
   */
  get cctx () {
    return this._cctx
  }

  /**
   * The audio context to which audio is played
   * @type BaseAudioContext
   */
  get actx () {
    return this._actx
  }

  /**
   * The width of the rendering canvas
   * @type number
   */
  get width () {
    return this.canvas.width
  }

  /**
   * The height of the rendering canvas
   * @type number
   */
  get height () {
    return this.canvas.height
  }

  set width (width) {
    this.canvas.width = width
  }

  set height (height) {
    this.canvas.height = height
  }
}

// id for events (independent of instance, but easy to access when on prototype chain)
Movie.prototype._type = 'movie'
Movie.prototype.getDefaultOptions = function () {
  return {
    _actx: new AudioContext(),
    /**
     * @name module:movie#background
     * @type string
     * @desc The css color for the background, or <code>null</code> for transparency
     */
    background: '#000',
    /**
     * @name module:movie#repeat
     * @type boolean
     */
    repeat: false,
    /**
     * @name module:movie#autoRefresh
     * @type boolean
     * @desc Whether to refresh when changes are made that would effect the current frame
     */
    autoRefresh: true
  }
}
// TODO: refactor so we don't need to explicitly exclude some of these
Movie.prototype._publicExcludes = ['canvas', 'cctx', 'actx', 'layers', 'effects']
