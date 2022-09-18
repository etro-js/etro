/**
 * @module movie
 */

import { subscribe, publish } from './event'
import { Dynamic, val, clearCachedValues, applyOptions, watchPublic, Color, parseColor } from './util'
import { Base as BaseLayer, Audio as AudioLayer, Video as VideoLayer, Visual } from './layer/index' // `Media` mixins
import { Base as BaseEffect } from './effect/index'

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }

  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream
 }
}

export class MovieOptions {
  /** The html canvas element to use for playback */
  canvas: HTMLCanvasElement
  /** The audio context to use for playback, defaults to a new audio context */
  actx?: AudioContext
  /** @deprecated Use <code>actx</code> instead */
  audioContext?: AudioContext
  /** The background color of the movie as a cSS string */
  background?: Dynamic<Color>
  repeat?: boolean
  /** Call `refresh` when the user changes a property on the movie or any of its layers or effects */
  autoRefresh?: boolean
}

/**
 * The movie contains everything included in the render.
 *
 * Implements a pub/sub system.
 */
// TODO: Make record option to make recording video output to the user while
// it's recording
// TODO: rename renderingFrame -> refreshing
export class Movie {
  type: string
  /**
   * @deprecated Auto-refresh will be removed in the future (see issue #130).
   */
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>

  repeat: boolean
  /**
   * Call `refresh` when the user changes a property on the movie or any of its
   * layers or effects
   *
   * @deprecated Auto-refresh will be removed in the future. If you want to
   * refresh the canvas, call `refresh`. See issue #130.
   */
  autoRefresh: boolean
  /** The background color of the movie as a cSS string */
  background: Dynamic<Color>
  /** The audio context to which audio output is sent during playback */
  readonly actx: AudioContext
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly effects: BaseEffect[]
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly layers: BaseLayer[]

  private _canvas: HTMLCanvasElement
  private _cctx: CanvasRenderingContext2D
  private _effectsBack: BaseEffect[]
  private _layersBack: BaseLayer[]
  private _currentTime: number
  private _paused: boolean
  private _ended: boolean
  private _renderingFrame: boolean
  private _recordEndTime: number
  private _mediaRecorder: MediaRecorder
  private _lastPlayed: number
  private _lastPlayedOffset: number

  /**
   * Creates a new movie.
   */
  constructor (options: MovieOptions) {
    // TODO: move into multiple methods!
    // Set actx option manually, because it's readonly.
    this.actx = options.actx ||
      options.audioContext ||
      new AudioContext() ||
      // eslint-disable-next-line new-cap
      new window.webkitAudioContext()
    delete options.actx

    // Proxy that will be returned by constructor
    const newThis: Movie = watchPublic(this) as Movie
    // Set canvas option manually, because it's readonly.
    this._canvas = options.canvas
    delete options.canvas
    // Don't send updates when initializing, so use this instead of newThis:
    this._cctx = this.canvas.getContext('2d') // TODO: make private?
    applyOptions(options, this)

    const that: Movie = newThis

    this._effectsBack = []
    this.effects = new Proxy(newThis._effectsBack, {
      deleteProperty (target, property): boolean {
        // Refresh screen when effect is removed, if the movie isn't playing
        // already.
        const value = target[property]
        value.tryDetach()
        delete target[property]
        publish(that, 'movie.change.effect.remove', { effect: value })
        return true
      },
      set (target, property, value): boolean {
        // Check if property is an number (an index)
        if (!isNaN(Number(property))) {
          if (target[property]) {
            publish(that, 'movie.change.effect.remove', {
              effect: target[property]
            })
            target[property].tryDetach()
          }
          // Attach effect to movie
          value.tryAttach(that)
          target[property] = value
          // Refresh screen when effect is set, if the movie isn't playing
          // already.
          publish(that, 'movie.change.effect.add', { effect: value })
        } else {
          target[property] = value
        }

        return true
      }
    })

    this._layersBack = []
    this.layers = new Proxy(newThis._layersBack, {
      deleteProperty (target, property): boolean {
        const oldDuration = this.duration
        const value = target[property]
        value.tryDetach(that)
        delete target[property]
        const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration
        if (current)
          publish(that, 'movie.change.layer.remove', { layer: value })

        publish(that, 'movie.change.duration', { oldDuration })
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
            target[property].tryDetach()
          }
          // Attach layer to movie
          value.tryAttach(that)
          target[property] = value
          // Refresh screen when a relevant layer is added or removed
          const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration
          if (current)
            publish(that, 'movie.change.layer.add', { layer: value })

          publish(that, 'movie.change.duration', { oldDuration })
        } else {
          target[property] = value
        }

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

    if (newThis.autoRefresh)
      newThis.refresh() // render single frame on creation

    // Subscribe to own event "change" (child events propogate up)
    subscribe(newThis, 'movie.change', () => {
      if (newThis.autoRefresh && !newThis.rendering)
        newThis.refresh()
    })

    // Subscribe to own event "ended"
    subscribe(newThis, 'movie.recordended', () => {
      if (newThis.recording) {
        newThis._mediaRecorder.requestData()
        newThis._mediaRecorder.stop()
      }
    })

    return newThis
  }

  /**
   * Plays the movie
   * @return fulfilled when the movie is done playing, never fails
   */
  play (): Promise<void> {
    return new Promise(resolve => {
      if (!this.paused)
        throw new Error('Already playing')

      this._paused = this._ended = false
      this._lastPlayed = performance.now()
      this._lastPlayedOffset = this.currentTime

      if (!this.renderingFrame)
        // Not rendering (and not playing), so play.
        this._render(true, undefined, resolve)

      // Stop rendering frame if currently doing so, because playing has higher
      // priority. This will effect the next _render call.
      this._renderingFrame = false

      publish(this, 'movie.play', {})
    })
  }

  /**
   * Plays the movie in the background and records it
   *
   * @param options
   * @param frameRate
   * @param [options.video=true] - whether to include video in recording
   * @param [options.audio=true] - whether to include audio in recording
   * @param [options.mediaRecorderOptions=undefined] - options to pass to the <code>MediaRecorder</code>
   * @param [options.type='video/webm'] - MIME type for exported video
   *  constructor
   * @return resolves when done recording, rejects when internal media recorder errors
   */
  // TEST: *support recording that plays back with audio!*
  // TODO: figure out how to do offline recording (faster than realtime).
  // TODO: improve recording performance to increase frame rate?
  record (options: {
    frameRate: number,
    duration?: number,
    type?: string,
    video?: boolean,
    audio?: boolean,
    mediaRecorderOptions?: Record<string, unknown>
  }): Promise<Blob> {
    if (options.video === false && options.audio === false)
      throw new Error('Both video and audio cannot be disabled')

    if (!this.paused)
      throw new Error('Cannot record movie while already playing or recording')

    const mimeType = options.type || 'video/webm'
    if (MediaRecorder && MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mimeType))
      throw new Error('Please pass a valid MIME type for the exported video')

    return new Promise((resolve, reject) => {
      const canvasCache = this.canvas
      // Record on a temporary canvas context
      this._canvas = document.createElement('canvas')
      this.canvas.width = canvasCache.width
      this.canvas.height = canvasCache.height
      this._cctx = this.canvas.getContext('2d')

      // frame blobs
      const recordedChunks = []
      // Combine image + audio, or just pick one
      let tracks = []
      if (options.video !== false) {
        const visualStream = this.canvas.captureStream(options.frameRate)
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
      const mediaRecorderOptions = {
        ...(options.mediaRecorderOptions || {}),
        mimeType
      }
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions)
      mediaRecorder.ondataavailable = event => {
        // if (this._paused) reject(new Error("Recording was interrupted"));
        if (event.data.size > 0)
          recordedChunks.push(event.data)
      }
      // TODO: publish to movie, not layers
      mediaRecorder.onstop = () => {
        this._paused = true
        this._ended = true
        this._canvas = canvasCache
        this._cctx = this.canvas.getContext('2d')
        publish(this, 'movie.audiodestinationupdate',
          { movie: this, destination: this.actx.destination }
        )
        this._mediaRecorder = null
        // Construct the exported video out of all the frame blobs.
        resolve(
          new Blob(recordedChunks, {
            type: mimeType
          })
        )
      }
      mediaRecorder.onerror = reject

      mediaRecorder.start()
      this._mediaRecorder = mediaRecorder
      this._recordEndTime = options.duration ? this.currentTime + options.duration : this.duration
      this.play()
      publish(this, 'movie.record', { options })
    })
  }

  /**
   * Stops the movie, without reseting the playback position
   * @return the movie (for chaining)
   */
  pause (): Movie {
    this._paused = true
    // Deactivate all layers
    for (let i = 0; i < this.layers.length; i++)
      if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
        const layer = this.layers[i]
        layer.stop()
        layer.active = false
      }

    publish(this, 'movie.pause', {})
    return this
  }

  /**
   * Stops playback and resets the playback position
   * @return the movie (for chaining)
   */
  stop (): Movie {
    this.pause()
    this.currentTime = 0
    return this
  }

  /**
   * @param [timestamp=performance.now()]
   * @param [done=undefined] - called when done playing or when the current frame is loaded
   * @private
   */
  private _render (repeat, timestamp = performance.now(), done = undefined) {
    clearCachedValues(this)

    if (!this.rendering) {
      // (!this.paused || this._renderingFrame) is true so it's playing or it's
      // rendering a single frame.
      if (done)
        done()

      return
    }

    if (this.ready) {
      publish(this, 'movie.loadeddata', { movie: this })

      const end = this.recording ? this._recordEndTime : this.duration

      this._updateCurrentTime(timestamp, end)

      // TODO: Is calling duration every frame bad for performance? (remember,
      // it's calling Array.reduce)
      if (this.currentTime === end) {
        if (this.recording)
          publish(this, 'movie.recordended', { movie: this })

        if (this.currentTime === this.duration)
          publish(this, 'movie.ended', { movie: this, repeat: this.repeat })

        // TODO: only reset currentTime if repeating
        if (this.repeat) {
        // Don't use setter, which publishes 'movie.seek'. Instead, update the
        // value and publish a 'movie.timeupdate' event.
          this._currentTime = 0
          publish(this, 'movie.timeupdate', { movie: this })
        }

        this._lastPlayed = performance.now()
        this._lastPlayedOffset = 0 // this.currentTime
        this._renderingFrame = false

        // Stop playback or recording if done (except if it's playing and repeat
        // is true)
        if (!(!this.recording && this.repeat)) {
          this._paused = true
          this._ended = true
          // Deactivate all layers
          for (let i = 0; i < this.layers.length; i++)
            if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
              const layer = this.layers[i]
              // A layer that has been deleted before layers.length has been updated
              // (see the layers proxy in the constructor).
              if (!layer || !layer.active)
                continue

              layer.stop()
              layer.active = false
            }

          if (done)
            done()

          return
        }
      }

      // Do render
      this._renderBackground(timestamp)
      this._renderLayers()
      this._applyEffects()
    }

    // If the frame didn't load this instant, repeatedly frame-render until it
    // is loaded.
    // If the expression below is true, don't publish an event, just silently
    // stop the render loop.
    if (this._renderingFrame && this.ready) {
      this._renderingFrame = false
      if (done)
        done()

      return
    }

    window.requestAnimationFrame(() => {
      this._render(repeat, undefined, done)
    }) // TODO: research performance cost
  }

  private _updateCurrentTime (timestampMs: number, end: number) {
    // If we're only instant-rendering (current frame only), it doens't matter
    // if it's paused or not.
    if (!this._renderingFrame) {
      // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
      const sinceLastPlayed = (timestampMs - this._lastPlayed) / 1000
      const currentTime = this._lastPlayedOffset + sinceLastPlayed // don't use setter
      if (this.currentTime !== currentTime) {
        this._currentTime = currentTime
        publish(this, 'movie.timeupdate', { movie: this })
      }
      // this._lastUpdate = timestamp;
      // }

      if (this.currentTime > end)
        this.currentTime = end
    }
  }

  private _renderBackground (timestamp) {
    this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const background = val(this, 'background', timestamp)
    if (background) { // TODO: check val'd result
      this.cctx.fillStyle = background
      this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  /**
   * @param [timestamp=performance.now()]
   * @private
   */
  private _renderLayers () {
    for (let i = 0; i < this.layers.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(this.layers, i)) continue

      const layer = this.layers[i]
      // A layer that has been deleted before layers.length has been updated
      // (see the layers proxy in the constructor).
      if (!layer)
        continue

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
      layer.render()

      // if the layer has visual component
      if (layer instanceof Visual) {
        const canvas = (layer as Visual).canvas
        // layer.canvas.width and layer.canvas.height should already be interpolated
        // if the layer has an area (else InvalidStateError from canvas)
        if (canvas.width * canvas.height > 0)
          this.cctx.drawImage(canvas,
            val(layer, 'x', reltime), val(layer, 'y', reltime), canvas.width, canvas.height
          )
      }
    }
  }

  private _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      // An effect that has been deleted before effects.length has been updated
      // (see the effectsproxy in the constructor).
      if (!effect)
        continue

      effect.apply(this, this.currentTime)
    }
  }

  /**
   * Refreshes the screen (only use this if auto-refresh is disabled)
   * @return - resolves when the frame is loaded
   */
  refresh (): Promise<null> {
    return new Promise(resolve => {
      this._renderingFrame = true
      this._render(false, undefined, resolve)
    })
  }

  /**
   * Convienence method
   */
  private _publishToLayers (type, event) {
    for (let i = 0; i < this.layers.length; i++)
      if (Object.prototype.hasOwnProperty.call(this.layers, i))
        publish(this.layers[i], type, event)
  }

  /**
   * If the movie is playing, recording or refreshing
   */
  get rendering (): boolean {
    return !this.paused || this._renderingFrame
  }

  /**
   * If the movie is refreshing current frame
   */
  get renderingFrame (): boolean {
    return this._renderingFrame
  }

  /**
   * If the movie is recording
   */
  get recording (): boolean {
    return !!this._mediaRecorder
  }

  /**
   * The combined duration of all layers
   */
  // TODO: dirty flag?
  get duration (): number {
    return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0)
  }

  /**
   * Convienence method for <code>layers.push()</code>
   * @param layer
   * @return the movie
   */
  addLayer (layer: BaseLayer): Movie {
    this.layers.push(layer); return this
  }

  /**
   * Convienence method for <code>effects.push()</code>
   * @param effect
   * @return the movie
   */
  addEffect (effect: BaseEffect): Movie {
    this.effects.push(effect); return this
  }

  /**
   */
  get paused (): boolean {
    return this._paused
  }

  /**
   * If the playback position is at the end of the movie
   */
  get ended (): boolean {
    return this._ended
  }

  /**
   * The current playback position
   */
  get currentTime (): number {
    return this._currentTime
  }

  set currentTime (time: number) {
    this._currentTime = time
    publish(this, 'movie.seek', {})
    // Render single frame to match new time
    if (this.autoRefresh)
      this.refresh()
  }

  /**
   * Sets the current playback position. This is a more powerful version of
   * `set currentTime`.
   *
   * @param time - the new cursor's time value in seconds
   * @param [refresh=true] - whether to render a single frame
   * @return resolves when the current frame is rendered if
   * <code>refresh</code> is true, otherwise resolves immediately
   *
   */
  // TODO: Refresh if only auto-refreshing is enabled
  setCurrentTime (time: number, refresh = true): Promise<void> {
    return new Promise((resolve, reject) => {
      this._currentTime = time
      publish(this, 'movie.seek', {})
      if (refresh)
        // Pass promise callbacks to `refresh`
        this.refresh().then(resolve).catch(reject)
      else
        resolve()
    })
  }

  get ready (): boolean {
    const layersReady = this.layers.every(layer => layer.ready)
    const effectsReady = this.effects.every(effect => effect.ready)
    return layersReady && effectsReady
  }

  /**
   * The rendering canvas
   */
  get canvas (): HTMLCanvasElement {
    return this._canvas
  }

  /**
   * The rendering canvas's context
   */
  get cctx (): CanvasRenderingContext2D {
    return this._cctx
  }

  /**
   * The width of the rendering canvas
   */
  get width (): number {
    return this.canvas.width
  }

  set width (width: number) {
    this.canvas.width = width
  }

  /**
   * The height of the rendering canvas
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

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): MovieOptions {
    return {
      canvas: undefined, // required
      /**
       * @name module:movie#background
       * @desc The color for the background, or <code>null</code> for transparency
       */
      background: parseColor('#000'),
      /**
       * @name module:movie#repeat
       */
      repeat: false,
      /**
       * @name module:movie#autoRefresh
       * @desc Whether to refresh when changes are made that would effect the current frame
       */
      autoRefresh: true
    }
  }
}

// id for events (independent of instance, but easy to access when on prototype chain)
Movie.prototype.type = 'movie'
// TODO: refactor so we don't need to explicitly exclude some of these
Movie.prototype.publicExcludes = ['canvas', 'cctx', 'actx', 'layers', 'effects']
Movie.prototype.propertyFilters = {}
