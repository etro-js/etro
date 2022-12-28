import { CustomArray, CustomArrayListener } from '../custom-array'
import { Dynamic, val, applyOptions, Color } from '../util'
import { Base, BaseOptions } from './base'
import { Visual as VisualEffect } from '../effect/visual'
import { publish, subscribe } from '../event'

// eslint-disable-next-line no-use-before-define
class VisualEffectsListener extends CustomArrayListener<VisualEffect> {
  // eslint-disable-next-line no-use-before-define
  private _layer: Visual
  private _checkReady: () => void

  // eslint-disable-next-line no-use-before-define
  constructor (layer: Visual, checkReady: () => void) {
    super()
    this._layer = layer
    this._checkReady = checkReady
  }

  onAdd (effect: VisualEffect) {
    effect.tryAttach(this._layer)

    // Update ready state if the effect is not ready
    this._checkReady()

    // Emit a layer.ready event whenever the effect is ready (as long as the
    // layer is too).
    subscribe(effect, 'ready', () => {
      this._checkReady()
    })
  }

  onRemove (effect: VisualEffect) {
    effect.tryDetach()

    this._checkReady()
  }
}

class VisualEffects extends CustomArray<VisualEffect> {
  // eslint-disable-next-line no-use-before-define
  constructor (target: VisualEffect[], layer: Visual, checkReady: () => void) {
    super(target, new VisualEffectsListener(layer, checkReady))
  }
}

interface VisualOptions extends BaseOptions {
  x?: Dynamic<number>
  y?: Dynamic<number>
  width?: Dynamic<number>
  height?: Dynamic<number>
  background?: Dynamic<Color>
  border?: Dynamic<{
    color: Color
    thickness?: number
  }>

  opacity?: Dynamic<number>
}

/** Any layer that renders to a canvas */
class Visual extends Base {
  x: Dynamic<number>
  y: Dynamic<number>
  width: Dynamic<number>
  height: Dynamic<number>
  background: Dynamic<Color>
  border: Dynamic<{
    color: Color
    thickness: number
  }>

  opacity: Dynamic<number>

  /**
   * The layer's rendering canvas
   */
  readonly canvas: HTMLCanvasElement

  /**
   * The context of {@link Visual#canvas}
   */
  readonly cctx: CanvasRenderingContext2D

  // readonly because it's a proxy
  readonly effects: VisualEffect[]

  private publishReadyEvent = false

  /**
   * Creates a visual layer
   */
  constructor (options: VisualOptions) {
    super(options)
    // Only validate extra if not subclassed, because if subclass, there will
    // be extraneous options.
    applyOptions(options, this)

    this.canvas = document.createElement('canvas')
    this.cctx = this.canvas.getContext('2d')
    this.effects = new VisualEffects([], this, this._checkReady.bind(this))
  }

  /**
   * Render visual output
   */
  render (): void {
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
    this.canvas.width = val(this, 'width', this.currentTime)
    this.canvas.height = val(this, 'height', this.currentTime)
    this.cctx.globalAlpha = val(this, 'opacity', this.currentTime)
  }

  doRender (): void {
    /*
     * If this.width or this.height is null, that means "take all available
     * screen space", so set it to this._move.width or this._movie.height,
     * respectively canvas.width & canvas.height are already interpolated
     */
    if (this.background) {
      this.cctx.fillStyle = val(this, 'background', this.currentTime)
      // (0, 0) relative to layer
      this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    const border = val(this, 'border', this.currentTime)
    if (border && border.color) {
      this.cctx.strokeStyle = border.color
      // This is optional.. TODO: integrate this with defaultOptions
      this.cctx.lineWidth = border.thickness || 1
    }
  }

  endRender (): void {
    const w = val(this, 'width', this.currentTime) || val(this.movie, 'width', this.movie.currentTime)
    const h = val(this, 'height', this.currentTime) || val(this.movie, 'height', this.movie.currentTime)
    if (w * h > 0)
      this._applyEffects()

    // else InvalidStateError for drawing zero-area image in some effects, right?

    // Since the playback position changed, the layer might not be ready
    // anymore.
    this._checkReady()
  }

  _applyEffects (): void {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      if (effect && effect.enabled)
        // Pass relative time
        effect.apply(this, this.movie.currentTime - this.startTime)
    }
  }

  /**
   * Convenience method for <code>effects.push()</code>
   * @param effect
   * @return the layer (for chaining)
   */
  addEffect (effect: VisualEffect): Visual {
    this.effects.push(effect); return this
  }

  private _checkReady () {
    if (this.ready && this.publishReadyEvent) {
      publish(this, 'ready', {})
      this.publishReadyEvent = false
    } else if (!this.ready) {
      this.publishReadyEvent = true
    }
  }

  get ready (): boolean {
    // Typescript doesn't support `super.ready` when targeting es5
    const superReady = Object.getOwnPropertyDescriptor(Base.prototype, 'ready').get.call(this)
    return superReady && this.effects.every(effect => effect.ready)
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): VisualOptions {
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
       * @name module:layer.Visual#background
       * @desc The color code for the background, or <code>null</code> for
       * transparency
       */
      background: null,
      /**
       * @name module:layer.Visual#border
       * @desc The border style, or <code>null</code> for no border
       */
      border: null,
      /**
       * @name module:layer.Visual#opacity
       */
      opacity: 1
    }
  }
}
Visual.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['canvas', 'cctx', 'effects'])
Visual.prototype.propertyFilters = {
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

export { Visual, VisualOptions }
