import EtroObject from '../object'
import { applyOptions } from '../util'
import { Movie } from '../movie'

interface BaseOptions {
  /** The time in the movie at which this layer starts */
  startTime: number
  duration: number
}

/**
 * A layer outputs content for the movie
 */
class Base implements EtroObject {
  type: string
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>
  enabled: boolean
  /**
   * If the attached movie's playback position is in this layer
   */
  active: boolean

  /**
   * The number of times this layer has been attached to a movie minus the
   * number of times it's been detached. (Used for the movie's array proxy with
   * `unshift`)
   */
  private _occurrenceCount: number
  private _startTime: number
  private _duration: number
  private _currentTime: number
  private _movie: Movie

  /**
   * Creates a new empty layer
   *
   * @param options
   * @param options.startTime - when to start the layer on the movie's
   * timeline
   * @param options.duration - how long the layer should last on the
   * movie's timeline
   */
  constructor (options: BaseOptions) {
    if (options.duration === null || options.duration === undefined) {
      throw new Error('Property "duration" is required in BaseOptions')
    }

    if (options.startTime === null || options.startTime === undefined) {
      throw new Error('Property "startTime" is required in BaseOptions')
    }

    // Set startTime and duration properties manually, because they are
    // readonly. applyOptions ignores readonly properties.
    this._startTime = options.startTime
    this._duration = options.duration

    applyOptions(options, this)

    // Whether this layer is currently being rendered
    this.active = false
    this.enabled = true

    this._occurrenceCount = 0 // no occurrences in parent
    this._movie = null
  }

  /**
   * Wait until this layer is ready to render
   */
  async whenReady (): Promise<void> {} // eslint-disable-line @typescript-eslint/no-empty-function

  /**
   * Attaches this layer to `movie` if not already attached.
   * @ignore
   */
  tryAttach (movie: Movie): void {
    if (this._occurrenceCount === 0) {
      this.attach(movie)
    }

    this._occurrenceCount++
  }

  /**
   * Attaches this layer to `movie`
   *
   * Called when the layer is added to a movie's `layers` array.
   *
   * @param movie The movie to attach to
   */
  attach (movie: Movie): void {
    this._movie = movie
  }

  /**
   * Detaches this layer from its movie if the number of times `tryDetach` has
   * been called (including this call) equals the number of times `tryAttach`
   * has been called.
   *
   * @ignore
   */
  tryDetach (): void {
    if (this.movie === null) {
      throw new Error('No movie to detach from')
    }

    this._occurrenceCount--
    // If this layer occurs in another place in a `layers` array, do not unset
    // _movie. (For calling `unshift` on the `layers` proxy)
    if (this._occurrenceCount === 0) {
      this.detach()
    }
  }

  /**
   * Detaches this layer from its movie
   *
   * Called when the layer is removed from a movie's `layers` array.
   */
  detach (): void {
    this._movie = null
  }

  /**
   * Called when the layer is activated
   */
  start (): void {} // eslint-disable-line @typescript-eslint/no-empty-function

  /**
   * Update {@link currentTime} when seeking
   *
   * This method is called when the movie seeks to a new time at the request of
   * the user. {@link progress} is called when the movie's `currentTime` is
   * updated due to playback.
   *
   * @param time - The new time in the layer
   */
  seek (time: number): void {
    this._currentTime = time
  }

  /**
   * Update {@link currentTime} due to playback
   *
   * This method is called when the movie's `currentTime` is updated due to
   * playback. {@link seek} is called when the movie seeks to a new time at the
   * request of the user.
   *
   * @param time - The new time in the layer
   */
  progress (time: number): void {
    this._currentTime = time
  }

  /**
   * Called when the movie renders and the layer is active
   */
  render (): void {} // eslint-disable-line @typescript-eslint/no-empty-function

  /**
   * Called when the layer is deactivated
   */
  stop (): void {
    this._currentTime = undefined
  }

  // TODO: is this needed?
  get parent (): Movie {
    return this._movie
  }

  /**
   * The time in the movie at which this layer starts (in seconds)
   */
  get startTime (): number {
    return this._startTime
  }

  set startTime (val: number) {
    this._startTime = val
  }

  /**
   * The current time of the movie relative to this layer (in seconds)
   */
  get currentTime (): number {
    return this._currentTime
  }

  /**
   * The duration of this layer (in seconds)
   */
  get duration (): number {
    return this._duration
  }

  set duration (val: number) {
    this._duration = val
  }

  /**
   * `true` if this layer is ready to be rendered, `false` otherwise
   */
  get ready (): boolean {
    return true
  }

  get movie (): Movie {
    return this._movie
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): BaseOptions {
    return {
      startTime: undefined, // required
      duration: undefined // required
    }
  }
}
// id for events (independent of instance, but easy to access when on prototype
// chain)
Base.prototype.type = 'layer'
Base.prototype.publicExcludes = ['active']
Base.prototype.propertyFilters = {}

export { Base, BaseOptions }
