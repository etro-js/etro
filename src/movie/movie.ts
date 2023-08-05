/**
 * @module movie
 */

import { publish, deprecate } from '../event'
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

  /**
   * If set to true, the movie will repeat when it reaches the end (unless it's
   * recording)
   */
  repeat?: boolean
}

/**
 * The movie contains everything included in the render.
 *
 * Implements a pub/sub system.
 */
// TODO: rename renderingFrame -> refreshing
export class Movie {
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
  private _recorder: MediaRecorder
  private _currentTime: number
  private _paused: boolean
  private _ended: boolean
  private _renderingFrame: boolean
  private _recording = false
  private _currentStream: MediaStream
  private _endTime: number
  /** The timestamp last frame in seconds */
  private _lastRealTime: number

  /**
   * Creates a new movie.
   */
  constructor (options: MovieOptions) {
    // Set actx option manually, because it's readonly.
    this.actx = options.actx ||
      options.audioContext ||
      new AudioContext() ||
      // eslint-disable-next-line new-cap
      new window.webkitAudioContext()
    delete options.actx

    // Check if required file canvas is provided
    if (!options.canvas) {
      throw new Error('Required option "canvas" not provided to Movie')
    }

    // Set canvas option manually, because it's readonly.
    this._canvas = this._visibleCanvas = options.canvas
    delete options.canvas
    this._cctx = this.canvas.getContext('2d') // TODO: make private?

    // Set options on the movie
    applyOptions(options, this)

    this.effects = new MovieEffects([], this)
    this.layers = new MovieLayers([], this)

    this._paused = true
    this._ended = false
    // This lock prevents multiple refresh loops at the same time (see
    // `render`). It's only valid while rendering.
    this._renderingFrame = false
    this.currentTime = 0
  }

  private async _whenReady (): Promise<void> {
    await Promise.all([
      Promise.all(this.layers.map(layer => layer.whenReady())),
      Promise.all(this.effects.map(effect => effect.whenReady()))
    ])
  }

  /**
   * Plays the movie
   *
   * @param [options]
   * @param [options.onStart] Called when the movie starts playing
   * @param [options.duration] The duration of the movie to play in seconds
   *
   * @return Fulfilled when the movie is done playing, never fails
   */
  async play (options: {
    onStart?: () => void,
    duration?: number,
  } = {}): Promise<void> {
    await this._whenReady()

    if (!this.paused) {
      throw new Error('Already playing')
    }

    this._paused = this._ended = false
    this._lastRealTime = performance.now()
    this._endTime = options.duration ? this.currentTime + options.duration : this.duration

    options.onStart?.()

    // For backwards compatibility
    publish(this, 'movie.play', {})

    // Repeatedly render frames until the movie ends
    await new Promise<void>(resolve => {
      if (!this.renderingFrame) {
        // Not rendering (and not playing), so play.
        this._render(undefined, resolve)
      }

      // Stop rendering frame if currently doing so, because playing has higher
      // priority. This will affect the next _render call.
      this._renderingFrame = false
    })

    // After we're done playing, clear the last timestamp
    this._lastRealTime = undefined
  }

  /**
   * Updates the rendering canvas and audio destination to the visible canvas
   * and the audio context destination.
   */
  private _show (): void {
    this._canvas = this._visibleCanvas
    this._cctx = this.canvas.getContext('2d')

    publish(this, 'audiodestinationupdate',
      { movie: this, destination: this.actx.destination }
    )
  }

  /**
   * Streams the movie to a MediaStream
   *
   * @param options Options for the stream
   * @param options.frameRate The frame rate of the stream's video
   * @param options.duration The duration of the stream in seconds
   * @param options.video Whether to stream video. Defaults to true.
   * @param options.audio Whether to stream audio. Defaults to true.
   * @param options.onStart Called when the stream is started
   * @return Fulfilled when the stream is done, never fails
   */
  async stream (options: {
    frameRate: number,
    duration?: number,
    video?: boolean,
    audio?: boolean,
    onStart (stream: MediaStream): void,
  }): Promise<void> {
    // Validate options
    if (!options || !options.frameRate) {
      throw new Error('Required option "frameRate" not provided to Movie.stream')
    }

    if (options.video === false && options.audio === false) {
      throw new Error('Both video and audio cannot be disabled')
    }

    if (!this.paused) {
      throw new Error("Cannot stream movie while it's already playing")
    }

    // Wait until all resources are loaded
    await this._whenReady()

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
      publish(this, 'audiodestinationupdate',
        { movie: this, destination: audioDestination }
      )
    }

    // Create the stream
    this._currentStream = new MediaStream(tracks)

    // Play the movie
    await this.play({
      onStart: () => {
        // Call the user's onStart callback
        options.onStart(this._currentStream)
      },
      duration: options.duration
    })

    // Clear the stream after the movie is done playing
    this._currentStream.getTracks().forEach(track => {
      track.stop()
    })
    this._currentStream = null
    this._show()
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
   * @param [options.onStart] - Called when the recording starts
   * @return Resolves when done recording, rejects when media recorder errors
   */
  // TODO: Improve recording performance to increase frame rate
  async record (options: {
    frameRate: number,
    duration?: number,
    type?: string,
    video?: boolean,
    audio?: boolean,
    mediaRecorderOptions?: Record<string, unknown>,
    onStart?: (recorder: MediaRecorder) => void,
  }): Promise<Blob> {
    // Validate options
    if (options.video === false && options.audio === false) {
      throw new Error('Both video and audio cannot be disabled')
    }

    if (!this.paused) {
      throw new Error("Cannot record movie while it's already playing")
    }

    const mimeType = options.type || 'video/webm'
    if (MediaRecorder && MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error('Please pass a valid MIME type for the exported video')
    }

    // Start streaming in the background
    const stream = await new Promise<MediaStream>(resolve => {
      this.stream({
        frameRate: options.frameRate,
        duration: options.duration,
        video: options.video,
        audio: options.audio,
        onStart: resolve
      }).then(() => {
        // Stop the media recorder when the movie is done playing
        this._recorder.requestData()
        this._recorder.stop()
      })
    })

    // The array to store the recorded chunks
    const recordedChunks = []

    // Create the media recorder
    const mediaRecorderOptions = {
      ...(options.mediaRecorderOptions || {}),
      mimeType
    }
    this._recorder = new MediaRecorder(stream, mediaRecorderOptions)
    this._recorder.ondataavailable = event => {
      // if (this._paused) reject(new Error("Recording was interrupted"));
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }

    // Start recording
    this._recorder.start()
    this._recording = true

    // Notify caller that the media recorder has started
    options.onStart?.(this._recorder)

    // For backwards compatibility
    publish(this, 'movie.record', { options })

    // Wait until the media recorder is done recording and processing
    await new Promise<void>((resolve, reject) => {
      this._recorder.onstop = () => {
        resolve()
      }

      this._recorder.onerror = reject
    })

    // Clean up
    this._paused = true
    this._ended = true
    this._recording = false

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
    // Update state
    this._paused = true

    // Deactivate all layers
    for (let i = 0; i < this.layers.length; i++) {
      if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
        const layer = this.layers[i]

        if (layer.active) {
          layer.stop()
          layer.active = false
        }
      }
    }

    // For backwards compatibility, notify event listeners that the movie has
    // paused
    publish(this, 'movie.pause', {})

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
   * Processes one frame of the movie and draws it to the canvas
   *
   * @param [timestamp=performance.now()]
   * @param [done=undefined] - Called when done playing or when the current
   * frame is loaded
   */
  private _render (timestamp = performance.now(), done = undefined) {
    clearCachedValues(this)

    if (!this.rendering) {
      // (this.paused && !this._renderingFrame) is true so it's playing or it's
      // rendering a single frame.
      if (done) {
        done()
      }

      return
    }

    if (this.ready) {
      publish(this, 'movie.loadeddata', { movie: this })

      // If the movie is streaming or recording, resume the media recorder
      if (this._recording && this._recorder.state === 'paused') {
        this._recorder.resume()
      }

      // If the movie is streaming or recording, end at the specified duration.
      // Otherwise, end at the movie's duration, because play() does not
      // support playing a portion of the movie yet.
      // TODO: Is calling duration every frame bad for performance? (remember,
      // it's calling Array.reduce)
      const end = this._currentStream ? this._endTime : this.duration

      this._updateCurrentTime(timestamp, end)

      if (this.currentTime === end) {
        if (this.recording) {
          publish(this, 'movie.recordended', { movie: this })
        }

        if (this.currentTime === this.duration) {
          publish(this, 'movie.ended', { movie: this, repeat: this.repeat })
        }

        // Don't use setter, which publishes 'seek'. Instead, update the
        // value and publish a 'imeupdate' event.
        this._currentTime = 0
        publish(this, 'movie.timeupdate', { movie: this })

        this._renderingFrame = false

        // Stop playback or recording if done (except if it's playing and repeat
        // is true)
        if (!(!this.recording && this.repeat)) {
          this._paused = true
          this._ended = true
          // Deactivate all layers
          for (let i = 0; i < this.layers.length; i++) {
            if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
              const layer = this.layers[i]
              // A layer that has been deleted before layers.length has been updated
              // (see the layers proxy in the constructor).
              if (!layer || !layer.active) {
                continue
              }

              layer.stop()
              layer.active = false
            }
          }

          publish(this, 'movie.pause', {})

          if (done) {
            done()
          }

          return
        }
      }

      // Do render
      this._renderBackground(timestamp)
      this._renderLayers()
      this._applyEffects()
    } else {
      // If we are recording, pause the media recorder until the movie is
      // ready.
      if (this.recording && this._recorder.state === 'recording') {
        this._recorder.pause()
      }
    }

    // If the frame didn't load this instant, repeatedly frame-render until it
    // is loaded.
    // If the expression below is true, don't publish an event, just silently
    // stop the render loop.
    if (this._renderingFrame && this.ready) {
      this._renderingFrame = false
      if (done) {
        done()
      }

      return
    }

    // TODO: Is making a new arrow function every frame bad for performance?
    window.requestAnimationFrame(() => {
      this._render(undefined, done)
    })
  }

  private _updateCurrentTime (timestampMs: number, end: number) {
    // If we're only frame-rendering (current frame only), it doesn't matter if
    // it's paused or not.
    if (!this._renderingFrame) {
      const timestamp = timestampMs / 1000
      const delta = timestamp - this._lastRealTime
      this._lastRealTime = timestamp
      if (delta > 0) {
        // Update the current time (don't use setter)
        this._currentTime += delta

        // For backwards compatibility, publish a 'movie.timeupdate' event.
        publish(this, 'movie.timeupdate', { movie: this })
      }

      if (this.currentTime > end) {
        this._currentTime = end
      }
    }
  }

  /**
   * Draws the movie's background to the canvas
   *
   * @param timestamp The current high-resolution timestamp in milliseconds
   */
  private _renderBackground (timestamp: number) {
    this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Evaluate background color (since it's a dynamic property)
    const background = val(this, 'background', timestamp)
    if (background) {
      this.cctx.fillStyle = background
      this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  /**
   * Ticks all layers and renders them to the canvas
   */
  private _renderLayers () {
    for (let i = 0; i < this.layers.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(this.layers, i)) {
        continue
      }

      const layer = this.layers[i]
      // A layer that has been deleted before layers.length has been updated
      // (see the layers proxy in the constructor).
      if (!layer) {
        continue
      }

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

      // If we are playing (not refreshing), update the layer's progress
      if (!this._renderingFrame) {
        layer.progress(reltime)
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
        if (canvas.width * canvas.height > 0) {
          this.cctx.drawImage(canvas,
            val(layer, 'x', reltime), val(layer, 'y', reltime), canvas.width, canvas.height
          )
        }
      }
    }
  }

  /**
   * Applies all of the movie's effects to the canvas
   *
   * Note: This method only applies the movie's effects, not the layers'
   * effects.
   */
  private _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]

      // An effect that has been deleted before effects.length has been updated
      // (see the effectsproxy in the constructor).
      if (!effect) {
        continue
      }

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
    if (!this.paused) {
      throw new Error('Already playing')
    }

    return new Promise(resolve => {
      this._renderingFrame = true
      this._render(undefined, resolve)
    })
  }

  /**
   * Convienence method (TODO: remove)
   */
  private _publishToLayers (type, event) {
    for (let i = 0; i < this.layers.length; i++) {
      if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
        publish(this.layers[i], type, event)
      }
    }
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
    return this._recording
  }

  /**
   * The duration of the movie in seconds
   *
   * Calculated from the end time of the last layer
   */
  // TODO: cache
  get duration (): number {
    return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0)
  }

  /**
   * Convenience method for `layers.push()`
   *
   * @param layer
   * @return The movie
   */
  addLayer (layer: BaseLayer): Movie {
    this.layers.push(layer); return this
  }

  /**
   * Convenience method for `effects.push()`
   *
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
   * Skips to the provided playback position, updating {@link currentTime}.
   *
   * @param time - The new playback position (in seconds)
   */
  seek (time: number) {
    this._currentTime = time

    // Call `seek` on every layer
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      if (layer) {
        const relativeTime = time - layer.startTime
        if (relativeTime >= 0 && relativeTime <= layer.duration) {
          layer.seek(relativeTime)
        } else {
          layer.seek(undefined)
        }
      }
    }

    // For backwards compatibility, publish a `seek` event
    publish(this, 'movie.seek', {})
  }

  /**
   * The current playback position in seconds
   */
  get currentTime (): number {
    return this._currentTime
  }

  /**
   * Skips to the provided playback position, updating {@link currentTime}.
   *
   * @param time - The new playback position (in seconds)
   *
   * @deprecated Use `seek` instead
   */
  set currentTime (time: number) {
    this.seek(time)
  }

  /**
   * Skips to the provided playback position, updating {@link currentTime}.
   *
   * @param time - The new time (in seconds)
   * @param [refresh=true] - Render a single frame?
   * @return Promise that resolves when the current frame is rendered if
   * `refresh` is true; otherwise resolves immediately.
   *
   * @deprecated Call {@link seek} and {@link refresh} separately
   */
  // TODO: Refresh only if auto-refreshing is enabled
  setCurrentTime (time: number, refresh = true): Promise<void> {
    return new Promise((resolve, reject) => {
      this.seek(time)

      if (refresh) {
        // Pass promise callbacks to `refresh`
        this.refresh().then(resolve).catch(reject)
      } else {
        resolve()
      }
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

deprecate('movie.audiodestinationupdate', 'audiodestinationupdate')
deprecate('movie.ended', undefined)
deprecate('movie.loadeddata', undefined)
deprecate('movie.pause', undefined, 'Wait for `play()`, `stream()`, or `record()` to resolve instead.')
deprecate('movie.play', undefined, 'Provide an `onStart` callback to `play()`, `stream()`, or `record()` instead.')
deprecate('movie.record', undefined, 'Provide an `onStart` callback to `record()` instead.')
deprecate('movie.recordended', undefined, 'Wait for `record()` to resolve instead.')
deprecate('movie.seek', undefined, 'Override the `seek` method on layers instead.')
deprecate('movie.timeupdate', undefined, 'Override the `progress` method on layers instead.')
