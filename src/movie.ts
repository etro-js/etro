/**
 * @module movie
 */

import { subscribe, publish } from './event'
import { val, clearCachedValues, applyOptions, watchPublic } from './util'
import { Base as BaseLayer, Audio as AudioLayer, Video as VideoLayer, Visual } from './layer/index' // `Media` mixins
import { AudioSource } from './layer/audio-source' // not exported from ./layer/index
import { Base as BaseEffect } from './effect/index'

declare global {
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream
 }
}

class MovieOptions {
  canvas: HTMLCanvasElement
  audioContext?: AudioContext
  background?: string
  repeat?: boolean
  autoRefresh?: boolean
}

/**
 * Contains all layers and movie information<br> Implements a sub/pub system
 *
 */
// TODO: Implement event "durationchange", and more
// TODO: Add width and height options
// TODO: Make record option to make recording video output to the user while
// it's recording
// TODO: rename renderingFrame -> refreshing
export default class Movie {
  type: string
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>

  repeat: boolean
  autoRefresh: boolean
  background: string
  /**
   * The audio context to which audio output is sent
   */
  readonly actx: AudioContext
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly effects: BaseEffect[]
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly layers: BaseLayer[]

  private _canvas: HTMLCanvasElement;
  private _vctx: CanvasRenderingContext2D
  private _effectsBack: BaseEffect[]
  private _layersBack: BaseLayer[]
  private _currentTime: number
  private _paused: boolean
  private _ended: boolean
  private _renderingFrame: boolean
  private _mediaRecorder: MediaRecorder
  private _lastPlayed: number
  private _lastPlayedOffset: number

  /**
   * Creates a new Vidar project.
   *
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas - the canvas to render to
   * @param {BaseAudioContext} [options.audioContext=new AudioContext()] - the
   * audio context to send audio output to
   * @param {string} [options.background="#000"] - the background color of the
   * movie, or <code>null</code> for a transparent background
   * @param {boolean} [options.repeat=false] - whether to loop playbackjs
   * @param {boolean} [options.autoRefresh=true] - whether to call `.refresh()`
   * when created and when active layers are added/removed
   */
  constructor (options: MovieOptions) {
    // TODO: move into multiple methods!
    // Rename audioContext -> _actx
    this.actx = options.audioContext || new AudioContext()
    delete options.audioContext // TODO: move up a line :P

    // Proxy that will be returned by constructor
    const newThis: Movie = watchPublic(this) as Movie
    // Set canvas option manually, because it's readonly.
    this._canvas = options.canvas
    delete options.canvas
    // Don't send updates when initializing, so use this instead of newThis:
    this._vctx = this.canvas.getContext('2d') // TODO: make private?
    applyOptions(options, this)

    const that: Movie = newThis

    this._effectsBack = []
    this.effects = new Proxy(newThis._effectsBack, {
      deleteProperty (target, property): boolean {
        // Refresh screen when effect is removed, if the movie isn't playing
        // already.
        const value = target[property]
        publish(that, 'movie.change.effect.remove', { effect: value })
        value.detach()
        delete target[property]
        return true
      },
      set (target, property, value): boolean {
        // Check if property is an number (an index)
        if (!isNaN(Number(property))) {
          if (target[property]) {
            publish(that, 'movie.change.effect.remove', {
              effect: target[property]
            })
            target[property].detach()
          }
          // Attach effect to movie
          value.attach(that)
          // Refresh screen when effect is set, if the movie isn't playing
          // already.
          publish(that, 'movie.change.effect.add', { effect: value })
        }
        target[property] = value
        return true
      }
    })

    this._layersBack = []
    this.layers = new Proxy(newThis._layersBack, {
      deleteProperty (target, property): boolean {
        const oldDuration = this.duration
        const value = target[property]
        value.detach(that)
        const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration
        if (current) {
          publish(that, 'movie.change.layer.remove', { layer: value })
        }
        publish(that, 'movie.change.duration', { oldDuration })
        delete target[property]
        return true
      },
      set (target, property, value): boolean {
        const oldDuration = this.duration
        // Check if property is an number (an index)
        if (!isNaN(Number(property))) {
          if (target[property]) {
            publish(that, 'movie.change.layer.remove', {
              layer: target[property]
            })
            target[property].detach()
          }
          // Attach layer to movie
          value.attach(that)
          // Refresh screen when a relevant layer is added or removed
          const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration
          if (current) {
            publish(that, 'movie.change.layer.add', { layer: value })
          }
          publish(that, 'movie.change.duration', { oldDuration })
        }
        target[property] = value
        return true
      }
    })
    this._paused = true
    this._ended = false
    // This variable helps prevent multiple frame-rendering loops at the same
    // time (see `render`). It's only applicable when rendering.
    this._renderingFrame = false
    this.currentTime = 0

    // For recording
    this._mediaRecorder = null

    // -1 works well in inequalities
    // The last time `play` was called
    this._lastPlayed = -1
    // What was `currentTime` when `play` was called
    this._lastPlayedOffset = -1
    // newThis._updateInterval = 0.1; // time in seconds between each "timeupdate" event
    // newThis._lastUpdate = -1;

    if (newThis.autoRefresh) {
      newThis.refresh() // render single frame on creation
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
        newThis._mediaRecorder.requestData()
        newThis._mediaRecorder.stop()
      }
    })

    return newThis
  }

  /**
   * Plays the movie
   * @return {Promise} fulfilled when the movie is done playing, never fails
   */
  play (): Promise<void> {
    return new Promise(resolve => {
      if (!this.paused) {
        throw new Error('Already playing')
      }

      this._paused = this._ended = false
      this._lastPlayed = performance.now()
      this._lastPlayedOffset = this.currentTime

      if (!this.renderingFrame) {
        // Not rendering (and not playing), so play.
        this._render(true, undefined, resolve)
      }
      // Stop rendering frame if currently doing so, because playing has higher
      // priority. This will effect the next _render call.
      this._renderingFrame = false

      publish(this, 'movie.play', {})
    })
  }

  /**
   * Plays the movie in the background and records it
   *
   * @param {object} options
   * @param {number} framerate
   * @param {boolean} [options.video=true] - whether to include video in recording
   * @param {boolean} [options.audio=true] - whether to include audio in recording
   * @param {object} [options.mediaRecorderOptions=undefined] - options to pass to the <code>MediaRecorder</code>
   * @param {string} [options.type='video/webm'] - MIME type for exported video
   *  constructor
   * @return {Promise} resolves when done recording, rejects when internal media recorder errors
   */
  // TEST: *support recording that plays back with audio!*
  // TODO: figure out how to do offline recording (faster than realtime).
  // TODO: improve recording performance to increase frame rate?
  record (options: {
    framerate: number,
    type?: string,
    video?: boolean,
    audio?: boolean,
    mediaRecorderOptions?: Record<string, unknown>
  }): Promise<Blob> {
    if (options.video === false && options.audio === false) {
      throw new Error('Both video and audio cannot be disabled')
    }

    if (!this.paused) {
      throw new Error('Cannot record movie while already playing or recording')
    }
    return new Promise((resolve, reject) => {
      const canvasCache = this.canvas
      // Record on a temporary canvas context
      this._canvas = document.createElement('canvas')
      this.canvas.width = canvasCache.width
      this.canvas.height = canvasCache.height
      this._vctx = this.canvas.getContext('2d')

      // frame blobs
      const recordedChunks = []
      // Combine image + audio, or just pick one
      let tracks = []
      if (options.video !== false) {
        const visualStream = this.canvas.captureStream(options.framerate)
        tracks = tracks.concat(visualStream.getTracks())
      }
      // Check if there's a layer that's an instance of an AudioSourceMixin
      // (Audio or Video)
      const hasMediaTracks = this.layers.some(layer => layer instanceof AudioLayer || layer instanceof VideoLayer)
      // If no media tracks present, don't include an audio stream, because
      // Chrome doesn't record silence when an audio stream is present.
      if (hasMediaTracks && options.audio !== false) {
        const audioDestination = this.actx.createMediaStreamDestination()
        const audioStream = audioDestination.stream
        tracks = tracks.concat(audioStream.getTracks())
        publish(this, 'movie.audiodestinationupdate',
          { movie: this, destination: audioDestination }
        )
      }
      const stream = new MediaStream(tracks)
      const mediaRecorder = new MediaRecorder(stream, options.mediaRecorderOptions)
      mediaRecorder.ondataavailable = event => {
        // if (this._paused) reject(new Error("Recording was interrupted"));
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }
      // TODO: publish to movie, not layers
      mediaRecorder.onstop = () => {
        this._ended = true
        this._canvas = canvasCache
        this._vctx = this.canvas.getContext('2d')
        publish(this, 'movie.audiodestinationupdate',
          { movie: this, destination: this.actx.destination }
        )
        this._mediaRecorder = null
        // Construct the exported video out of all the frame blobs.
        resolve(
          new Blob(recordedChunks, {
            type: options.type || 'video/webm'
          })
        )
      }
      mediaRecorder.onerror = reject

      mediaRecorder.start()
      this._mediaRecorder = mediaRecorder
      this.play()
      publish(this, 'movie.record', { options })
    })
  }

  /**
   * Stops the movie, without reseting the playback position
   * @return {Movie} the movie (for chaining)
   */
  pause (): Movie {
    this._paused = true
    // Deactivate all layers
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      layer.stop()
      layer.active = false
    }
    publish(this, 'movie.pause', {})
    return this
  }

  /**
   * Stops playback and resets the playback position
   * @return {Movie} the movie (for chaining)
   */
  stop (): Movie {
    this.pause()
    this.currentTime = 0
    return this
  }

  /**
   * @param {number} [timestamp=performance.now()]
   * @param {function} [done=undefined] - called when done playing or when the current frame is loaded
   * @private
   */
  private _render (repeat, timestamp = performance.now(), done = undefined) {
    clearCachedValues(this)

    if (!this.rendering) {
      // (!this.paused || this._renderingFrame) is true so it's playing or it's
      // rendering a single frame.
      done && done()
      return
    }

    this._updateCurrentTime(timestamp)
    // Bad for performance? (remember, it's calling Array.reduce)
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
        // Deactivate all layers
        for (let i = 0; i < this.layers.length; i++) {
          const layer = this.layers[i]
          layer.stop()
          layer.active = false
        }
      }
      done && done()
      return
    }

    // Do render
    this._renderBackground(timestamp)
    const frameFullyLoaded = this._renderLayers()
    this._applyEffects()

    if (frameFullyLoaded) {
      publish(this, 'movie.loadeddata', { movie: this })
    }

    // If didn't load in this instant, repeatedly frame-render until frame is
    // loaded.
    // If the expression below is false, don't publish an event, just silently
    // stop render loop.
    if (!repeat || (this._renderingFrame && frameFullyLoaded)) {
      this._renderingFrame = false
      done && done()
      return
    }

    window.requestAnimationFrame(timestamp => {
      this._render(repeat, timestamp)
    }) // TODO: research performance cost
  }

  private _updateCurrentTime (timestamp) {
    // If we're only instant-rendering (current frame only), it doens't matter
    // if it's paused or not.
    if (!this._renderingFrame) {
      // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
      const sinceLastPlayed = (timestamp - this._lastPlayed) / 1000
      this._currentTime = this._lastPlayedOffset + sinceLastPlayed // don't use setter
      publish(this, 'movie.timeupdate', { movie: this })
      // this._lastUpdate = timestamp;
      // }
    }
  }

  private _renderBackground (timestamp) {
    this.vctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.background) { // TODO: check val'd result
      this.vctx.fillStyle = val(this, 'background', timestamp)
      this.vctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  /**
   * @return {boolean} whether or not video frames are loaded
   * @param {number} [timestamp=performance.now()]
   * @private
   */
  private _renderLayers () {
    let frameFullyLoaded = true
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      const reltime = this.currentTime - layer.startTime
      // Cancel operation if layer disabled or outside layer time interval
      if (!val(layer, 'enabled', reltime) ||
        // TODO                                                    > or >= ?
        this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
        // Layer is not active.
        // If only rendering this frame, we are not "starting" the layer.
        if (layer.active && !this._renderingFrame) {
          // TODO: make a `deactivate()` method?
          layer.stop()
          layer.active = false
        }
        continue
      }
      // If only rendering this frame, we are not "starting" the layer
      if (!layer.active && val(layer, 'enabled', reltime) && !this._renderingFrame) {
        // TODO: make an `activate()` method?
        layer.start()
        layer.active = true
      }

      // if the layer has an input file
      if ('source' in layer) {
        frameFullyLoaded = frameFullyLoaded && (layer as unknown as AudioSource).source.readyState >= 2
      }
      layer.render()

      // if the layer has visual component
      if (layer instanceof Visual) {
        const canvas = (layer as Visual).canvas
        // layer.canvas.width and layer.canvas.height should already be interpolated
        // if the layer has an area (else InvalidStateError from canvas)
        if (canvas.width * canvas.height > 0) {
          this.vctx.drawImage(canvas,
            val(layer, 'x', reltime), val(layer, 'y', reltime), canvas.width, canvas.height
          )
        }
      }
    }

    return frameFullyLoaded
  }

  private _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      effect.apply(this, this.currentTime)
    }
  }

  /**
   * Refreshes the screen (only use this if auto-refresh is disabled)
   * @return {Promise} - resolves when the frame is loaded
   */
  refresh (): Promise<null> {
    return new Promise(resolve => {
      this._renderingFrame = true
      this._render(false, undefined, resolve)
    })
  }

  /**
   * Convienence method
   * @todo Make private
   */
  private _publishToLayers (type, event) {
    for (let i = 0; i < this.layers.length; i++) {
      publish(this.layers[i], type, event)
    }
  }

  /**
   * If the movie is playing, recording or refreshing
   * @type boolean
   */
  get rendering (): boolean {
    return !this.paused || this._renderingFrame
  }

  /**
   * If the movie is refreshing current frame
   * @type boolean
   */
  get renderingFrame (): boolean {
    return this._renderingFrame
  }

  /**
   * If the movie is recording
   * @type boolean
   */
  get recording (): boolean {
    return !!this._mediaRecorder
  }

  /**
   * The combined duration of all layers
   * @type number
   */
  // TODO: dirty flag?
  get duration (): number {
    return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0)
  }

  /**
   * Convienence method for <code>layers.push()</code>
   * @param {BaseLayer} layer
   * @return {Movie} the movie
   */
  addLayer (layer: BaseLayer): Movie {
    this.layers.push(layer); return this
  }

  /**
   * Convienence method for <code>effects.push()</code>
   * @param {BaseEffect} effect
   * @return {Movie} the movie
   */
  addEffect (effect: BaseEffect): Movie {
    this.effects.push(effect); return this
  }

  /**
   * @type boolean
   */
  get paused (): boolean {
    return this._paused
  }

  /**
   * If the playback position is at the end of the movie
   * @type boolean
   */
  get ended (): boolean {
    return this._ended
  }

  /**
   * The current playback position
   * @type number
   */
  get currentTime (): number {
    return this._currentTime
  }

  set currentTime (time: number) {
    this._currentTime = time
    publish(this, 'movie.seek', {})
    // Render single frame to match new time
    this.refresh()
  }

  /**
   * Sets the current playback position. This is a more powerful version of
   * `set currentTime`.
   *
   * @param {number} time - the new cursor's time value in seconds
   * @param {boolean} [refresh=true] - whether to render a single frame
   * @return {Promise} resolves when the current frame is rendered if
   * <code>refresh</code> is true, otherwise resolves immediately
   *
   */
  // TODO: Refresh if only auto-refreshing is enabled
  setCurrentTime (time: number, refresh = true): Promise<void> {
    return new Promise((resolve, reject) => {
      this._currentTime = time
      publish(this, 'movie.seek', {})
      if (refresh) {
        // Pass promise callbacks to `refresh`
        this.refresh().then(resolve).catch(reject)
      } else {
        resolve()
      }
    })
  }

  /**
   * The rendering canvas
   * @type HTMLCanvasElement
   */
  get canvas (): HTMLCanvasElement {
    return this._canvas
  }

  /**
   * The rendering canvas's context
   * @type CanvasRenderingContext2D
   */
  get vctx (): CanvasRenderingContext2D {
    return this._vctx
  }

  /**
   * The width of the rendering canvas
   * @type number
   */
  get width (): number {
    return this.canvas.width
  }

  set width (width: number) {
    this.canvas.width = width
  }

  /**
   * The height of the rendering canvas
   * @type number
   */
  get height (): number {
    return this.canvas.height
  }

  set height (height: number) {
    this.canvas.height = height
  }

  get movie (): Movie {
    return this
  }

  getDefaultOptions (): MovieOptions & { _actx: AudioContext } {
    return {
      canvas: undefined, // required
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
}

// id for events (independent of instance, but easy to access when on prototype chain)
Movie.prototype.type = 'movie'
// TODO: refactor so we don't need to explicitly exclude some of these
Movie.prototype.publicExcludes = ['canvas', 'vctx', 'actx', 'layers', 'effects']
Movie.prototype.propertyFilters = {}
