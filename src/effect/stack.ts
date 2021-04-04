import Movie from '../movie'
import { Base } from './base'
import { Visual } from '../layer'

export interface StackOptions {
  effects: Base[]
}

/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
export class Stack extends Base {
  readonly effects: Base[]

  private _effectsBack: Base[]

  constructor (options: StackOptions) {
    super()

    this._effectsBack = []
    this.effects = new Proxy(this._effectsBack, {
      deleteProperty: function (target: Base[], property: number | string): boolean {
        const value = target[property]
        value.detach() // Detach effect from movie
        delete target[property]
        return true
      },
      set: function (target: Base[], property: number | string, value: Base): boolean {
        // TODO: make sure type check works
        if (!isNaN(Number(property))) { // if property is a number (index)
          if (target[property]) {
            target[property].detach() // Detach old effect from movie
          }
          value.attach(this._target) // Attach effect to movie
        }
        target[property] = value
        return true
      }
    })
    options.effects.forEach(effect => this.effects.push(effect))
  }

  attach (movie: Movie): void {
    super.attach(movie)
    this.effects.forEach(effect => {
      effect.detach()
      effect.attach(movie)
    })
  }

  detach (): void {
    super.detach()
    this.effects.forEach(effect => {
      effect.detach()
    })
  }

  apply (target: Movie | Visual, reltime: number): void {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      effect.apply(target, reltime)
    }
  }

  /**
   * Convenience method for chaining
   * @param effect - the effect to append
   */
  addEffect (effect: Base): Stack {
    this.effects.push(effect)
    return this
  }
}
