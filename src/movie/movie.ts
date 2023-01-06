/**
 * @module movie
 */

import { subscribe, publish, deprecate } from '../event'
import { Dynamic, val, clearCachedValues, applyOptions, Color, parseColor } from '../util'
import { Base as BaseLayer, Audio as AudioLayer, Video as VideoLayer, Visual } from '../layer/index' // `Media` mixins
import { Base as BaseEffect } from '../effect/index'
import { MovieEffects } from './effects'
import { MovieLayers } from './layers'

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
  static readonly Event = {
    /**
     * Fired when `currentTime` skips to a new position.
     *
     * @event
     */
    SEEK: 'seek',

    /**
     * Fired when `currentTime` changes due to playback.
     *
     * @event
     */
    TIME_UPDATE: 'timeupdate',

    /**
     * Fired when the movie is ready to play.
     *
     * @event
     */
    READY: 'ready',

    /**
     * Fired when the movie is played.
     *
     * @event
     */
    PLAY: 'play',

    /**
     * Fired when the movie is paused.
     *
     * @event
     */
    PAUSE: 'pause',

    /**
     * Fired when the end of the movie is reached.
     *
     * @event
     */
    END: 'end',

    /**
     * Fired when the destination of `actx` is changed.
     *
     * @event
     */
    AUDIO_DESTINATION_UPDATE: 'audiodestinationupdate'
  }

  type: string
  /**
   * @deprecated Auto-refresh will be removed in the future. If you want to
   * refresh the canvas, call `refresh`. See
   * {@link https://github.com/etro-js/etro/issues/130}
   */
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>

  repeat: boolean
  /** The background color of the movie as a cSS string */
  background: Dynamic<Color>
  /** The audio context to which audio output is sent during playback */
  readonly actx: AudioContext
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly effects: MovieEffects
  // Readonly because it's a proxy (so it can't be overwritten).
  readonly layers: MovieLayers

  /** The canvas that we are currently rendering to */
  private _canvas: HTMLCanvasElement
  private _visibleCanvas: HTMLCanvasElement
  private _cctx: CanvasRenderingContext2D
  private _currentTime: number
  private _paused: boolean
  private _ended: boolean
  private _renderingFrame: boolean
  private _currentStream: MediaStream
  private _endTime: number
  private _mediaRecorder: MediaRecorder
  private _lastPlayed: number
  private _lastPlayedOffset: number
  private _publishReadyEvent = false

  /**
   * Creates a new movie.
   */
  constructor (options: MovieOptions) {
    // TODO: Split this god constructor into multiple methods!

    // Set actx option manually, because it's readonly.
    this.actx = options.actx ||
      options.audioContext ||
      new AudioContext() ||
      // eslint-disable-next-line new-cap
      new window.webkitAudioContext()
    delete options.actx

    // Check if required file canvas is provided
    if (!options.canvas)
      throw new Error('Required option "canvas" not provided to Movie')

    // Set canvas option manually, because it's readonly.
    this._canvas = this._visibleCanvas = options.canvas
    delete options.canvas
    this._cctx = this.canvas.getContext('2d') // TODO: make private?
    applyOptions(options, this)

    this.effects = new MovieEffects([], this, this._checkReady.bind(this))
    this.layers = new MovieLayers([], this, this._checkReady.bind(this))

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
    // this._updateInterval = 0.1; // time in seconds between each "timeupdate" event
    // this._lastUpdate = -1;

    // Stop recording when the movie is paused
    subscribe(this, Movie.Event.PAUSE, () => {
      if (this.recording) {
        this._mediaRecorder.requestData()
        this._mediaRecorder.stop()
      }
    })
  }

  private _waitUntilReady (): Promise<void> {
    return new Promise(resolve => {
      if (this.ready)
        resolve()
      else
        subscribe(this, Movie.Event.READY, () => {
          resolve()
        }, { once: true })
    })
  }

  /**
   * Plays the movie
   * @return Fulfilled when the movie is done playing, never fails
   */
  async play (): Promise<void> {
    await this._waitUntilReady()

    if (!this.paused)
      throw new Error('Already playing')

    this._paused = this._ended = false
    this._lastPlayed = performance.now()
    this._lastPlayedOffset = this.currentTime

    publish(this, Movie.Event.PLAY, {})

    await new Promise<void>(resolve => {
      if (!this.renderingFrame)
        // Not rendering (and not playing), so play.
        this._render(true, undefined, resolve)

      // Stop rendering frame if currently doing so, because playing has higher
      // priority. This will affect the next _render call.
      this._renderingFrame = false
    })
  }

  /**
   * Updates the rendering canvas and audio destination to the visible canvas
   * and the audio context destination.
   */
  private _show (): void {
    this._canvas = this._visibleCanvas
    this._cctx = this.canvas.getContext('2d')

    publish(this, Movie.Event.AUDIO_DESTINATION_UPDATE,
      { movie: this, destination: this.actx.destination }
    )
  }

  /**
   * Streams the movie to a MediaStream
   *
   * The stream will be available at {@link Movie#currentStream} while this
   * method is running.
   *
   * @param options Options for the stream
   * @param options.frameRate The frame rate of the stream's video
   * @param options.duration The duration of the stream in seconds
   * @param options.video Whether to stream video. Defaults to true.
   * @param options.audio Whether to stream audio. Defaults to true.
   * @return Fulfilled when the stream is done, never fails
   */
  async stream (options: {
    frameRate: number,
    duration?: number,
    video?: boolean,
    audio?: boolean,
  }): Promise<void> {
    // Validate options
    if (!options || !options.frameRate)
      throw new Error('Required option "frameRate" not provided to Movie.stream')

    if (options.video === false && options.audio === false)
      throw new Error('Both video and audio cannot be disabled')

    if (!this.paused)
      throw new Error("Cannot stream movie while it's already playing")

    // Wait until all resources are loaded
    await this._waitUntilReady()

    // Create a temporary canvas to stream from
    this._canvas = document.createElement('canvas')
    this.canvas.width = this._visibleCanvas.width
    this.canvas.height = this._visibleCanvas.height
    this._cctx = this.canvas.getContext('2d')

    // Create the stream
    let tracks = []
    // Add video track
    if (options.video !== false) {
      const visualStream = this.canvas.captureStream(options.frameRate)
      tracks = tracks.concat(visualStream.getTracks())
    }
    // Check if there's a layer that's an instance of an AudioSourceMixin
    // (Audio or Video). If so, add an audio track.
    const hasMediaTracks = this.layers.some(layer => layer instanceof AudioLayer || layer instanceof VideoLayer)
    // If no media tracks present, don't include an audio stream, because
    // Chrome doesn't record silence when an audio stream is present.
    if (hasMediaTracks && options.audio !== false) {
      const audioDestination = this.actx.createMediaStreamDestination()
      const audioStream = audioDestination.stream
      tracks = tracks.concat(audioStream.getTracks())

      // Notify layers and any other listeners of the new audio destination
      publish(this, Movie.Event.AUDIO_DESTINATION_UPDATE,
        { movie: this, destination: audioDestination }
      )
    }

    this._currentStream = new MediaStream(tracks)

    // Play the movie
    this._endTime = options.duration ? this.currentTime + options.duration : this.duration
    await this.play()

    // Clear the stream after the movie is done playing
    this._currentStream.getTracks().forEach(track => {
      track.stop()
    })
    this._currentStream = null
    this._show()
  }

  /**
   * Waits for the movie to emit a `play` event and returns the current stream,
   * or returns the stream immediately if it's already available.
   *
   * {@link Movie#stream} must be called first. It will emit a `play` event
   * when the stream is ready. This method will wait for that event and return
   * the stream.
   *
   * @returns Resolves with the stream when it's ready, never fails
   */
  async getStream (): Promise<MediaStream> {
    if (this._currentStream)
      return this._currentStream

    // Wait for playback to start. The stream will be available then.
    return await new Promise(resolve => {
      subscribe(this, Movie.Event.PLAY, () => {
        resolve(this._currentStream)
      }, { once: true })
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
  async record (options: {
    frameRate: number,
    duration?: number,
    type?: string,
    video?: boolean,
    audio?: boolean,
    mediaRecorderOptions?: Record<string, unknown>
  }): Promise<Blob> {
    // Validate options
    if (options.video === false && options.audio === false)
      throw new Error('Both video and audio cannot be disabled')

    if (!this.paused)
      throw new Error("Cannot record movie while it's already playing")

    const mimeType = options.type || 'video/webm'
    if (MediaRecorder && MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mimeType))
      throw new Error('Please pass a valid MIME type for the exported video')

    // Start streaming in the background
    this.stream(options)

    const stream = await this.getStream()

    // The array to store the recorded chunks
    const recordedChunks = []

    // Create the media recorder
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

    // Start recording
    mediaRecorder.start()
    this._mediaRecorder = mediaRecorder
    publish(this, 'record', { options })

    // Wait until the media recorder is done recording
    await new Promise<void>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        resolve()
      }

      mediaRecorder.onerror = reject
    })

    // Clean up
    this._paused = true
    this._ended = true
    this._mediaRecorder = null

    // Construct the exported video out of all the frame blobs.
    return new Blob(recordedChunks, {
      type: mimeType
    })
  }

  /**
   * Stops the movie without resetting the playback position
   * @return The movie
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

    publish(this, Movie.Event.PAUSE, {})
    return this
  }

  /**
   * Stops playback and resets the playback position
   * @return The movie
   */
  stop (): Movie {
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
      // (this.paused && !this._renderingFrame) is true so it's playing or it's
      // rendering a single frame.
      if (done)
        done()

      return
    }

    if (this.ready) {
      publish(this, 'loadeddata', { movie: this })

      // If the movie is streaming or recording, end at the specified duration.
      // Otherwise, end at the movie's duration, because play() does not
      // support playing a portion of the movie yet.
      // TODO: Is calling duration every frame bad for performance? (remember,
      // it's calling Array.reduce)
      const end = this._currentStream ? this._endTime : this.duration

      this._updateCurrentTime(timestamp, end)

      if (this.currentTime === end) {
        if (this.recording)
          publish(this, 'recordended', { movie: this })

        if (this.currentTime === this.duration)
          publish(this, Movie.Event.END, { movie: this, repeat: this.repeat })

        if (this.repeat) {
          // Don't use setter, which publishes 'seek'. Instead, update the
          // value and publish a 'imeupdate' event.
          this._currentTime = 0
          publish(this, Movie.Event.TIME_UPDATE, { movie: this })
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

          publish(this, Movie.Event.PAUSE, {})

          if (done)
            done()

          return
        }
      }

      // Do render
      this._renderBackground(timestamp)
      this._renderLayers()
      this._applyEffects()

      // Since the playback position has changed, the movie may no longer be
      // ready.
      this._checkReady()
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
        publish(this, Movie.Event.TIME_UPDATE, { movie: this })
      }
      // this._lastUpdate = timestamp;
      // }

      if (this.currentTime > end)
        this._currentTime = end
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
   */
  private _renderLayers () {
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
      if (layer instanceof Visual) {
        const canvas = (layer as Visual).canvas
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
   * Refreshes the screen
   *
   * Only use this if auto-refresh is disabled
   *
   * @return - Promise that resolves when the frame is loaded
   */
  refresh (): Promise<null> {

    // Refreshing while playing can interrupt playback  
    if (!this.paused)
      throw new Error('Already playing') 

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
  addLayer (layer: BaseLayer): Movie {
    this.layers.push(layer); return this
  }

  /**
   * Convenience method for `effects.push()`
   * @param effect
   * @return the movie
   */
  addEffect (effect: BaseEffect): Movie {
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
    * `seek` event.
    *
    * @param time - The new playback position
   */
  set currentTime (time: number) {
    this._currentTime = time
    publish(this, Movie.Event.SEEK, {})
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
      publish(this, Movie.Event.SEEK, {})
      if (refresh)
        // Pass promise callbacks to `refresh`
        this.refresh().then(resolve).catch(reject)
      else
        resolve()
    })
  }

  private _checkReady () {
    if (this.ready && this._publishReadyEvent) {
      publish(this, Movie.Event.READY, {})
      this._publishReadyEvent = false
    } else if (!this.ready) {
      this._publishReadyEvent = true
    }
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
   * The HTML canvas element used for rendering
   */
  get canvas (): HTMLCanvasElement {
    return this._canvas
  }

  /**
   * The canvas context used for rendering
   */
  get cctx (): CanvasRenderingContext2D {
    return this._cctx
  }

  /**
   * The width of the output canvas
   */
  get width (): number {
    return this.canvas.width
  }

  set width (width: number) {
    this.canvas.width = width
  }

  /**
   * The height of the output canvas
   */
  get height (): number {
    return this.canvas.height
  }

  set height (height: number) {
    this.canvas.height = height
  }

  /**
   * @return The movie
   */
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
      repeat: false
    }
  }
}

// Id for events
Movie.prototype.type = 'movie'
Movie.prototype.propertyFilters = {}

deprecate('movie.audiodestinationupdate', Movie.Event.AUDIO_DESTINATION_UPDATE)
deprecate('movie.ended', Movie.Event.END)
deprecate('movie.loadeddata', undefined, 'Consider using `Movie.Events.READY` instead.')
deprecate('movie.pause', Movie.Event.PAUSE)
deprecate('movie.play', Movie.Event.PLAY)
deprecate('movie.record', undefined, 'Consider using `Movie.Events.PLAY` instead.')
deprecate('movie.recordended', undefined, 'Consider using `Movie.Events.PAUSE` instead.')
deprecate('movie.seek', Movie.Event.SEEK)
deprecate('movie.timeupdate', Movie.Event.TIME_UPDATE)
