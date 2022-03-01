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
  /**
   * The number of times this effect has been attached to a target minus the
   * number of times it's been detached. (Used for the target's array proxy with
   * `unshift`)
   */
  private _occurrenceCount: number

  constructor () {
    const newThis = watchPublic(this) as Base // proxy that will be returned by constructor

    newThis.enabled = true
    newThis._occurrenceCount = 0
    newThis._target = null

    // Propogate up to target
    subscribe(newThis, 'effect.change.modify', event => {
      if (!newThis._target)
        return

      const type = `${newThis._target.type}.change.effect.modify`
      publish(newThis._target, type, { ...event, target: newThis._target, source: newThis, type })
    })

    return newThis
  }

  /**
   * Attaches this effect to `target` if not already attached.
   * @ignore
   */
  tryAttach (target: Movie | Visual): void {
    if (this._occurrenceCount === 0)
      this.attach(target)

    this._occurrenceCount++
  }

  attach (movie: Movie | Visual): void {
    this._target = movie
  }

  /**
   * Dettaches this effect from its target if the number of times `tryDetach`
   * has been called (including this call) equals the number of times
   * `tryAttach` has been called.
   *
   * @ignore
   */
  tryDetach (): void {
    if (this._target === null)
      throw new Error('No movie to detach from')

    this._occurrenceCount--
    // If this effect occurs in another place in the containing array, do not
    // unset _target. (For calling `unshift` on the `layers` proxy)
    if (this._occurrenceCount === 0)
      this.detach()
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
  apply (target: Movie | Visual, reltime: number): void {} // eslint-disable-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function

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
