import { CustomArray, CustomArrayListener } from '../custom-array'
import { Dynamic, val, applyOptions } from '../util'
import { Base, BaseOptions } from './base'
import { Visual as VisualEffect } from '../effect/visual'

// eslint-disable-next-line no-use-before-define
class EffectsListener extends CustomArrayListener<VisualEffect> {
  // eslint-disable-next-line no-use-before-define
  private _layer: VisualBase

  // eslint-disable-next-line no-use-before-define
  constructor (layer: VisualBase) {
    super()
    this._layer = layer
  }

  onAdd (effect: VisualEffect) {
    effect.tryAttach(this._layer)
  }

  onRemove (effect: VisualEffect) {
    effect.tryDetach()
  }
}

class Effects extends CustomArray<VisualEffect> {
  // eslint-disable-next-line no-use-before-define
  constructor (target: VisualEffect[], layer: VisualBase) {
    super(target, new EffectsListener(layer))
  }
}

interface VisualBaseOptions extends BaseOptions {
  x?: Dynamic<number>
  y?: Dynamic<number>
  width?: Dynamic<number>
  height?: Dynamic<number>
}

/** Any layer that renders to a canvas */
abstract class VisualBase extends Base {
  x: Dynamic<number>
  y: Dynamic<number>
  width: Dynamic<number>
  height: Dynamic<number>

  // readonly because it's a proxy
  readonly effects: VisualEffect[]

  /**
   * Creates a visual layer
   */
  constructor (options: VisualBaseOptions) {
    super(options)
    // Only validate extra if not subclassed, because if subclcass, there will
    // be extraneous options.
    applyOptions(options, this)

    this.effects = new Effects([], this)
  }

  /**
   * Render visual output
   */
  render (): void {
    /*
     * If this.width or this.height is null, that means "take all available
     * screen space", so set it to this._move.width or this._movie.height,
     * respectively canvas.width & canvas.height are already interpolated
     */
    // Prevent empty canvas errors if the width or height is 0
    const width = val(this, 'width', this.currentTime)
    const height = val(this, 'height', this.currentTime)
    if (width === 0 || height === 0)
      return

    this.beginRender()
    this.doRender()
    this.endRender()
  }

  beginRender (): void {
  }

  abstract doRender (): void

  endRender (): void {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      if (effect && effect.enabled)
        // Pass relative time
        effect.apply(this, this.movie.currentTime - this.startTime)
    }
  }

  /**
   * Convienence method for <code>effects.push()</code>
   * @param effect
   * @return the layer (for chaining)
   */
  addEffect (effect: VisualEffect): VisualBase {
    this.effects.push(effect); return this
  }

  get ready (): boolean {
    // Typescript doesn't support `super.ready` when targetting es5
    const superReady = Object.getOwnPropertyDescriptor(Base.prototype, 'ready').get.call(this)
    return superReady && this.effects.every(effect => effect.ready)
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): VisualBaseOptions {
    return {
      ...Base.prototype.getDefaultOptions(),
      /**
       * @name module:layer.Visual#x
       * @desc The offset of the layer relative to the movie
       */
      x: 0,
      /**
       * @name module:layer.Visual#y
       * @desc The offset of the layer relative to the movie
       */
      y: 0,
      /**
       * @name module:layer.Visual#width
       */
      width: null,
      /**
       * @name module:layer.Visual#height
       */
      height: null
    }
  }
}
VisualBase.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['effects'])
VisualBase.prototype.propertyFilters = {
  ...Base.prototype.propertyFilters,
  /*
   * If this.width or this.height is null, that means "take all available screen
   * space", so set it to this._move.width or this._movie.height, respectively
   */
  width: function (width) {
    return width != undefined ? width : this._movie.width // eslint-disable-line eqeqeq
  },
  height: function (height) {
    return height != undefined ? height : this._movie.height // eslint-disable-line eqeqeq
  }
}

export { VisualBase, VisualBaseOptions }
