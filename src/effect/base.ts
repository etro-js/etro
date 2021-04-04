import { watchPublic } from '../util'
import { publish, subscribe } from '../event'
import { Movie } from '../movie'
import { Visual } from '../layer/index'
import BaseObject from '../object'

/**
 * Modifies the visual contents of a layer.
 */
export class Base implements BaseObject {
  type: string
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>

  enabled: boolean

  private _target: Movie | Visual

  constructor () {
    const newThis = watchPublic(this) as Base // proxy that will be returned by constructor

    newThis.enabled = true
    newThis._target = null

    // Propogate up to target
    subscribe(newThis, 'effect.change.modify', event => {
      if (!newThis._target) {
        return
      }
      const type = `${newThis._target.type}.change.effect.modify`
      publish(newThis._target, type, { ...event, target: newThis._target, source: newThis, type })
    })

    return newThis
  }

  attach (target: Movie | Visual): void {
    this._target = target
  }

  detach (): void {
    this._target = null
  }

  // subclasses must implement apply
  /**
   * Apply this effect to a target at the given time
   *
   * @param target
   * @param reltime - the movie's current time relative to the layer
   * (will soon be replaced with an instance getter)
   * @abstract
   */
  apply (target: Movie | Visual, reltime: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('No overriding method found or super.apply was called')
  }

  /**
   * The current time of the target
   */
  get currentTime (): number {
    return this._target ? this._target.currentTime : undefined
  }

  get parent (): Movie | Visual {
    return this._target
  }

  get movie (): Movie {
    return this._target ? this._target.movie : undefined
  }

  getDefaultOptions (): Record<string, unknown> {
    return {}
  }
}
// id for events (independent of instance, but easy to access when on prototype
// chain)
Base.prototype.type = 'effect'
Base.prototype.publicExcludes = []
Base.prototype.propertyFilters = {}
