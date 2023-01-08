import { Movie } from '../movie'
import { Visual } from './visual'
import { Visual as VisualLayer } from '../layer'
import { CustomArray, CustomArrayListener } from '../custom-array'

class StackEffectsListener extends CustomArrayListener<Visual> {
  // eslint-disable-next-line no-use-before-define
  private _stack: Stack

  constructor (stack: Stack) {
    super()
    this._stack = stack
  }

  onAdd (effect: Visual) {
    if (!this._stack.parent) {
      return
    }

    effect.tryAttach(this._stack.parent)
  }

  onRemove (effect: Visual) {
    if (!this._stack.parent) {
      return
    }

    effect.tryDetach()
  }
}

class StackEffects extends CustomArray<Visual> {
  // eslint-disable-next-line no-use-before-define
  constructor (target: Visual[], stack: Stack) {
    super(target, new StackEffectsListener(stack))
  }
}

export interface StackOptions {
  effects: Visual[]
}

/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
export class Stack extends Visual {
  readonly effects: StackEffects

  constructor (options: StackOptions) {
    super()

    this.effects = new StackEffects(options.effects, this)
    options.effects.forEach(effect => this.effects.push(effect))
  }

  attach (movie: Movie): void {
    super.attach(movie)

    this.effects.filter(effect => !!effect).forEach(effect => {
      effect.tryAttach(movie)
    })
  }

  detach (): void {
    super.detach()

    this.effects.filter(effect => !!effect).forEach(effect => {
      effect.tryDetach()
    })
  }

  apply (target: Movie | VisualLayer, reltime: number): void {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      if (!effect) {
        continue
      }
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
