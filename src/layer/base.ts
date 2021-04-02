import VidarObject from '../object'
import { publish, subscribe } from '../event'
import { watchPublic, applyOptions } from '../util'
import Movie from '../movie'

interface BaseOptions {
  startTime: number
  duration: number
}

/**
 * A layer outputs content for the movie
 */
class Base implements VidarObject {
  type: string
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>
  enabled: boolean
  /**
   * If the attached movie's playback position is in this layer
   */
  active: boolean

  private _startTime: number
  private _duration: number
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
    // Set startTime and duration properties manually, because they are
    // readonly. applyOptions ignores readonly properties.
    this._startTime = options.startTime
    this._duration = options.duration

    // Proxy that will be returned by constructor (for sending 'modified'
    // events).
    const newThis = watchPublic(this) as Base
    // Don't send updates when initializing, so use this instead of newThis
    applyOptions(options, this)

    // Whether this layer is currently being rendered
    this.active = false
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

  attach (movie: Movie): void {
    this._movie = movie
  }

  detach (): void {
    this._movie = null
  }

  /**
   * Called when the layer is activated
   */
  start (): void {} // eslint-disable-line @typescript-eslint/no-empty-function

  /**
   * Called when the movie renders and the layer is active
   */
  render (): void {} // eslint-disable-line @typescript-eslint/no-empty-function

  /**
  * Called when the layer is deactivated
   */
  stop (): void {} // eslint-disable-line @typescript-eslint/no-empty-function

  // TODO: is this needed?
  get parent (): Movie {
    return this._movie
  }

  /**
   */
  get startTime (): number {
    return this._startTime
  }

  set startTime (val: number) {
    this._startTime = val
  }

  /**
   * The current time of the movie relative to this layer
   */
  get currentTime (): number {
    return this._movie ? this._movie.currentTime - this.startTime
      : undefined
  }

  /**
   */
  get duration (): number {
    return this._duration
  }

  set duration (val: number) {
    this._duration = val
  }

  get movie (): Movie {
    return this._movie
  }

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
Base.prototype.publicExcludes = []
Base.prototype.propertyFilters = {}

export { Base, BaseOptions }
