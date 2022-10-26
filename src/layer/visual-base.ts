import { CustomArray, CustomArrayListener } from '../custom-array'
import { Dynamic, val, applyOptions } from '../util'
import { Base, BaseOptions } from './base'
import { Visual as VisualEffect } from '../effect/visual'
import { View } from '../view/view'

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

interface VisualBaseOptions<V extends View = View> extends BaseOptions {
  x?: Dynamic<number>
  y?: Dynamic<number>
  width?: Dynamic<number>
  height?: Dynamic<number>
  view?: V
}

/** Any layer that renders to a canvas */
abstract class VisualBase<V extends View = View> extends Base {
  x: Dynamic<number>
  y: Dynamic<number>
  width: Dynamic<number>
  height: Dynamic<number>

  // readonly because it's a proxy
  readonly effects: VisualEffect[]

  /**
   * View used to render the layer
   */
  readonly view: V

  /**
   * Creates a visual layer
   */
  constructor (options: VisualBaseOptions) {
    super(options)

    // Only validate extra if not subclassed, because if subclcass, there will
    // be extraneous options.
    applyOptions(options, this)

    if (this.view && this.view.staticOutput)
      throw new Error("Cannot use a static output with a visual layer's view")

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
    const width = val(this, 'width', this.currentTime)
    const height = val(this, 'height', this.currentTime)

    if (this.view)
      this.view.resize(width, height)

    // Do not call this.view.finish() here, because we are not done rendering
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
      height: null,
      /**
       * @name module:layer.Visual#view
       * @desc The view used to render the layer
       */
      view: null
    }
  }
}
VisualBase.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['effects', 'view'])
VisualBase.prototype.propertyFilters = {
  ...Base.prototype.propertyFilters,
  /*
   * If this.width or this.height is null, that means "take all available screen
   * space", so set it to this._move.width or this._movie.height, respectively
   */
  width: function (width) {
    if (width != undefined) // eslint-disable-line eqeqeq
      return width
    else
      return this.movie.view ? this.movie.view.width : this.movie.width
  },
  height: function (height) {
    if (height != undefined) // eslint-disable-line eqeqeq
      return height
    else
      return this.movie.view ? this.movie.view.height : this.movie.height
  }
}

export { VisualBase, VisualBaseOptions }
