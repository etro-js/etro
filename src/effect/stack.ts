import { Movie } from '../movie'
import { Visual } from './visual'
import { Visual as VisualLayer } from '../layer'

export interface StackOptions {
  effects: Visual[]
}

/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
export class Stack extends Visual {
  readonly effects: Visual[]

  private _effectsBack: Visual[]

  constructor (options: StackOptions) {
    super()

    this._effectsBack = []
    // TODO: Throw 'change' events in handlers
    this.effects = new Proxy(this._effectsBack, {
      deleteProperty: function (target: Visual[], property: string | symbol): boolean {
        const value = target[property]
        value.detach() // Detach effect from movie
        delete target[property]
        return true
      },
      set: function (target: Visual[], property: string | symbol, value: Visual): boolean {
        // TODO: make sure type check works
        if (!isNaN(Number(property))) { // if property is a number (index)
          if (target[property])
            target[property].detach() // Detach old effect from movie

          value.attach(this._target) // Attach effect to movie
        }
        target[property] = value
        return true
      }
    })
    options.effects.forEach(effect => this.effects.push(effect))

    // TODO: Propogate 'change' events from children up
  }

  attach (movie: Movie): void {
    super.attach(movie)
    this.effects.filter(effect => !!effect).forEach(effect => {
      effect.detach()
      effect.attach(movie)
    })
  }

  detach (): void {
    super.detach()
    this.effects.filter(effect => !!effect).forEach(effect => {
      effect.detach()
    })
  }

  apply (target: Movie | VisualLayer, reltime: number): void {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      if (!effect) continue
      effect.apply(target, reltime)
    }
  }

  /**
   * Convenience method for chaining
   * @param effect - the effect to append
   */
  addEffect (effect: Visual): Stack {
    this.effects.push(effect)
    return this
  }
}
