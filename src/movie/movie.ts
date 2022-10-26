/**
 * @module movie
 */

import { subscribe, publish } from '../event'
import { Dynamic, val, clearCachedValues, applyOptions, watchPublic, Color, parseColor } from '../util'
import { Base as BaseLayer, Audio as AudioLayer, Video as VideoLayer, VisualBase as VisualBaseLayer } from '../layer/index' // `Media` mixins
import { Base as BaseEffect } from '../effect/index'
import { MovieEffects } from './effects'
import { MovieLayers } from './layers'
import { DOMView } from '../view/dom-view'
import { get2DRenderingContext, getOutputCanvas } from '../compatibility-utils'

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }

  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream
 }
}

export class MovieOptions<V extends DOMView = DOMView> {
  /**
   * The html canvas element to render to. If not specified, the view will be
   * used.
   *
   * @deprecated Use `view` instead
   */
  canvas?: HTMLCanvasElement
  /**
   * The view to render to. If not specified, the canvas will be used, if
   * present.
   */
  view?: V
  /** The audio context to use for playback, defaults to a new audio context */
  actx?: AudioContext
  /** @deprecated Use <code>actx</code> instead */
  audioContext?: AudioContext
  /** The background color of the movie as a cSS string */
  background?: Dynamic<Color>
  repeat?: boolean
  /**
   * Call `refresh` when the user changes a property on the movie or any of its layers or effects
   *
   * @deprecated Auto-refresh will be removed in the future. If you want to
   * refresh the canvas, call `refresh`. See
   * {@link https://github.com/etro-js/etro/issues/130}
   */
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
export class Movie<V extends DOMView = DOMView> {
  type: string
  /**
   * @deprecated Auto-refresh will be removed in the future. If you want to
   * refresh the canvas, call `refresh`. See
   * {@link https://github.com/etro-js/etro/issues/130}
   */
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>

  repeat: boolean
  /**
   * Call `refresh` when the user changes a property on the movie or any of its
   * layers or effects
   *
   * @deprecated Auto-refresh will be removed in the future. If you want to
   * refresh the canvas, call `refresh`. See
   * {@link https://github.com/etro-js/etro/issues/130}
   */
  autoRefresh: boolean
  /** The background color of the movie as a cSS string */
  background: Dynamic<Color>
  /** The audio context to which audio output is sent during playback */
  readonly actx: AudioContext
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly effects: MovieEffects
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly layers: MovieLayers

  private _canvas: HTMLCanvasElement
  private _cctx: CanvasRenderingContext2D
  private _currentTime: number
  private _paused: boolean
  private _ended: boolean
  private _renderingFrame: boolean
  private _recordEndTime: number
  private _mediaRecorder: MediaRecorder
  private _view: V
  private _lastPlayed: number
  private _lastPlayedOffset: number

  /**
   * Creates a new movie.
   */
  constructor (options: MovieOptions<V>) {
    // TODO: Split this god constructor into multiple methods!

    // Set actx option manually, because it's readonly.
    this.actx = options.actx ||
      options.audioContext ||
      new AudioContext() ||
      // eslint-disable-next-line new-cap
      new window.webkitAudioContext()
    delete options.actx

    // Proxy that will be returned by constructor
    const newThis: Movie<V> = watchPublic(this) as Movie<V>

    // Set view option manually, because it's readonly.
    const view = options.view
    delete options.view

    // Set canvas option manually, because it's readonly.
    const canvas = options.canvas
    delete options.canvas

    // Don't send updates when initializing, so use this instead of newThis:
    applyOptions(options, this)

    const that: Movie<V> = newThis

    this.effects = new MovieEffects([], that)
    this.layers = new MovieLayers([], that)

    if ((view && canvas) || (!view && !canvas))
      throw new Error('Either "view" or "canvas" must be provided to Movie')

    if (view) {
      if (!view.staticOutput)
        throw new Error('Movie view must have visible output')

      this._view = view
    } else {
      this._canvas = canvas
      this._cctx = canvas.getContext('2d')
    }

    this._paused = true
    this._ended = false
    // This lock prevents multiple frame-rendering loops at the same time (see
    // `render`). It's only valid when rendering.
    this._renderingFrame = false
    this.currentTime = 0

    // For recording
    this._mediaRecorder = null

    // The last time `play` was called
    // -1 works well in comparisons.
    this._lastPlayed = -1
    // What was `currentTime` when `play` was called
    this._lastPlayedOffset = -1
    // newThis._updateInterval = 0.1; // time in seconds between each "timeupdate" event
    // newThis._lastUpdate = -1;

    // Render single frame on creation if autoRefresh is enabled
    if (newThis.autoRefresh)
      newThis.refresh()

    // Subscribe to own event "change" and refresh canvas
    subscribe(newThis, 'movie.change', () => {
      if (newThis.autoRefresh && !newThis.rendering)
        newThis.refresh()
    })

    // Subscribe to own event "recordended" and stop recording
    subscribe(newThis, 'movie.recordended', () => {
      if (newThis.recording) {
        newThis._mediaRecorder.requestData()
        newThis._mediaRecorder.stop()
      }
    })

    return newThis
  }

  private _waitUntilReady (): void {
    while (!this.ready) {
      // eslint-disable-next-line no-empty
    }
  }

  /**
   * Plays the movie
   * @return Fulfilled when the movie is done playing, never fails
   */
  play (): Promise<void> {
    return new Promise(resolve => {
      if (!this.paused)
        throw new Error('Already playing')

      this._waitUntilReady()

      this._paused = this._ended = false
      this._lastPlayed = performance.now()
      this._lastPlayedOffset = this.currentTime

      if (!this.renderingFrame)
        // Not rendering (and not playing), so play.
        this._render(true, undefined, resolve)

      // Stop rendering frame if currently doing so, because playing has higher
      // priority. This will affect the next _render call.
      this._renderingFrame = false

      publish(this, 'movie.play', {})
    })
  }

  /**
   * Plays the movie in the background and records it
   *
   * @param options
   * @param [options.frameRate] - Video frame rate
   * @param [options.video=true] - whether to include video in recording
   * @param [options.audio=true] - whether to include audio in recording
   * @param [options.mediaRecorderOptions=undefined] - Options to pass to the
   * `MediaRecorder` constructor
   * @param [options.type='video/webm'] - MIME type for exported video
   * @return Resolves when done recording, rejects when media recorder errors
   */
  // TODO: Improve recording performance to increase frame rate
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

    this._waitUntilReady()

    return new Promise((resolve, reject) => {
      const canvas = this.view ? this.view.staticOutput : this.canvas

      // frame blobs
      const recordedChunks = []
      // Combine image + audio, or just pick one
      let tracks = []
      if (options.video !== false) {
        const visualStream = canvas.captureStream(options.frameRate)
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
      mediaRecorder.onstop = () => {
        this._paused = true
        this._ended = true
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
   * Stops the movie without resetting the playback position
   * @return The movie
   */
  pause (): Movie<V> {
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
   * @return The movie
   */
  stop (): Movie<V> {
    this.pause()
    this.currentTime = 0
    return this
  }

  /**
   * @param [timestamp=performance.now()]
   * @param [done=undefined] - Called when done playing or when the current
   * frame is loaded
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

      // TODO: Is calling duration every frame bad for performance? (remember,
      // it's calling Array.reduce)
      const end = this.recording ? this._recordEndTime : this.duration

      this._updateCurrentTime(timestamp, end)

      if (this.currentTime === end) {
        if (this.recording)
          publish(this, 'movie.recordended', { movie: this })

        if (this.currentTime === this.duration)
          publish(this, 'movie.ended', { movie: this, repeat: this.repeat })

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

      if (this.view)
        // Copy view.output to view.visibleOutput
        this.view.renderStatic()
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

    // TODO: Is making a new arrow function every frame bad for performance?
    window.requestAnimationFrame(() => {
      this._render(repeat, undefined, done)
    })
  }

  private _updateCurrentTime (timestampMs: number, end: number) {
    // If we're only frame-rendering (current frame only), it doesn't matter if
    // it's paused or not.
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
        this._currentTime = end
    }
  }

  private _renderBackground (timestamp) {
    const ctx = get2DRenderingContext(this)
    const width = this.view ? this.view.width : this.width
    const height = this.view ? this.view.height : this.height

    ctx.clearRect(0, 0, width, height)
    const background = val(this, 'background', timestamp)
    if (background) { // TODO: check val'd result
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
    }
  }

  /**
   * @param [timestamp=performance.now()]
   */
  private _renderLayers () {
    const ctx = get2DRenderingContext(this)

    for (let i = 0; i < this.layers.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(this.layers, i)) continue

      const layer = this.layers[i]
      // A layer that has been deleted before layers.length has been updated
      // (see the layers proxy in the constructor).
      if (!layer)
        continue

      // Cancel operation if layer disabled or outside layer time interval
      const reltime = this.currentTime - layer.startTime
      if (!val(layer, 'enabled', reltime) ||
        // TODO                                                    > or >= ?
        this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
        // Layer is not active.
        // If only rendering this frame, we are not "starting" the layer.
        if (layer.active && !this._renderingFrame) {
          layer.stop()
          layer.active = false
        }
        continue
      }
      // If only rendering this frame, we are not "starting" the layer
      if (!layer.active && val(layer, 'enabled', reltime) && !this._renderingFrame) {
        layer.start()
        layer.active = true
      }

      layer.render()

      // if the layer has visual component
      if (layer instanceof VisualBaseLayer) {
        const output = getOutputCanvas(layer)
        if (output.width * output.height > 0)
          ctx.drawImage(output,
            val(layer, 'x', reltime), val(layer, 'y', reltime), output.width, output.height
          )
      }
    }

    if (this.view)
      this.view.finish()
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
   * Refreshes the screen
   *
   * Only use this if auto-refresh is disabled
   *
   * @return - Promise that resolves when the frame is loaded
   */
  refresh (): Promise<null> {
    return new Promise(resolve => {
      this._renderingFrame = true
      this._render(false, undefined, resolve)
    })
  }

  /**
   * Convienence method (TODO: remove)
   */
  private _publishToLayers (type, event) {
    for (let i = 0; i < this.layers.length; i++)
      if (Object.prototype.hasOwnProperty.call(this.layers, i))
        publish(this.layers[i], type, event)
  }

  /**
   * `true` if the movie is playing, recording or refreshing
   */
  get rendering (): boolean {
    return !this.paused || this._renderingFrame
  }

  /**
   * `true` if the movie is refreshing the current frame
   */
  get renderingFrame (): boolean {
    return this._renderingFrame
  }

  /**
   * `true` if the movie is recording
   */
  get recording (): boolean {
    return !!this._mediaRecorder
  }

  /**
   * The duration of the movie in seconds
   *
   * Calculated from the end time of the last layer
   */
  // TODO: dirty flag?
  get duration (): number {
    return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0)
  }

  /**
   * Convenience method for `layers.push()`
   * @param layer
   * @return The movie
   */
  addLayer (layer: BaseLayer): Movie<V> {
    this.layers.push(layer); return this
  }

  /**
   * Convenience method for `effects.push()`
   * @param effect
   * @return the movie
   */
  addEffect (effect: BaseEffect): Movie<V> {
    this.effects.push(effect); return this
  }

  /**
   * `true` if the movie is paused
   */
  get paused (): boolean {
    return this._paused
  }

  /**
   * `true` if the playback position is at the end of the movie
   */
  get ended (): boolean {
    return this._ended
  }

  /**
   * The current playback position in seconds
   */
  get currentTime (): number {
    return this._currentTime
  }

  /**
    * Sets the current playback position in seconds and publishes a
    * `movie.seek` event.
    *
    * @param time - The new playback position
   */
  set currentTime (time: number) {
    this._currentTime = time
    publish(this, 'movie.seek', {})
    // Render single frame to match new time
    if (this.autoRefresh)
      this.refresh()
  }

  /**
   * Sets the current playback position.
   *
   * @param time - The new time in seconds
   * @param [refresh=true] - Render a single frame?
   * @return Promise that resolves when the current frame is rendered if
   * `refresh` is true; otherwise resolves immediately.
   */
  // TODO: Deprecate
  // TODO: Refresh only if auto-refreshing is enabled
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

  /**
   * `true` if the movie is ready for playback
   */
  get ready (): boolean {
    const layersReady = this.layers.every(layer => layer.ready)
    const effectsReady = this.effects.every(effect => effect.ready)
    return layersReady && effectsReady
  }

  /**
   * The onscreen canvas
   * @deprecated Use {@link Movie#view} instead
   */
  get canvas (): HTMLCanvasElement {
    if (this.view)
      throw new Error('Movie#canvas is incompatible with Movie#view')

    return this._canvas
  }

  /**
   * The 2D rendering context for the onscreen canvas
   * @deprecated Use {@link Movie#view.use2D} instead
   */
  get cctx (): CanvasRenderingContext2D {
    if (this.view)
      throw new Error('Movie#cctx is incompatible with Movie#view')

    return this._cctx
  }

  /**
   * The rendering contexts for the movie
   */
  get view (): V {
    return this._view
  }

  /**
   * The width of the output canvas
   * @deprecated Use `view.width` instead
   */
  get width (): number {
    if (this.view)
      throw new Error('Movie#width is incompatible with Movie#view. Use Movie#view.resize instead.')

    return this.canvas.width
  }

  /**
   * The width of the output canvas
   * @deprecated Use `view.resize()` instead
   */
  set width (width: number) {
    if (this.view)
      throw new Error('Movie#width is incompatible with Movie#view. Use Movie#view.resize instead.')

    this.canvas.width = width
  }

  /**
   * The height of the output canvas
   * @deprecated Use `view.height` instead
   */
  get height (): number {
    if (this.view)
      throw new Error('Movie#height is incompatible with Movie#view. Use Movie#view.resize instead.')

    return this.canvas.height
  }

  /**
   * The height of the output canvas
   * @deprecated Use `view.resize()` instead
   */
  set height (height: number) {
    if (this.view)
      throw new Error('Movie#height is incompatible with Movie#view. Use Movie#view.resize instead.')

    this.canvas.height = height
  }

  /**
   * @return The movie
   */
  get movie (): Movie<V> {
    return this
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): MovieOptions<V> {
    return {
      canvas: null,
      view: null,
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

// Id for events
Movie.prototype.type = 'movie'
Movie.prototype.publicExcludes = ['canvas', 'cctx', 'actx', 'layers', 'effects', 'view']
Movie.prototype.propertyFilters = {}
