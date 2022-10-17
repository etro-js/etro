import { Dynamic, val, applyOptions, Color } from '../util'
import { VisualBase, VisualBaseOptions } from './visual-base'

// Redeclaring this function to avoid circular dependency
function get2DRenderingContext (object: Visual2D): CanvasRenderingContext2D {
  if (object.view)
    return object.view.use2D() as CanvasRenderingContext2D
  else
    return object.cctx
}

interface Visual2DOptions extends VisualBaseOptions {
  background?: Dynamic<Color>
  border?: Dynamic<{
    color: Color
    thickness?: number
  }>
  opacity?: Dynamic<number>
}

/** Any layer that renders to a canvas */
class Visual2D extends VisualBase {
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

  /**
   * Creates a visual layer
   */
  constructor (options: Visual2DOptions) {
    super(options)
    // Only validate extra if not subclassed, because if subclcass, there will
    // be extraneous options.
    applyOptions(options, this)

    this.canvas = document.createElement('canvas')
    this.cctx = this.canvas.getContext('2d')

  }

  beginRender (): void {
    this.canvas.width = val(this, 'width', this.currentTime)
    this.canvas.height = val(this, 'height', this.currentTime)
    const ctx = get2DRenderingContext(this)
    ctx.globalAlpha = val(this, 'opacity', this.currentTime)
  }

  doRender (): void {
    const ctx = get2DRenderingContext(this)
    const width = val(this, 'width', this.currentTime)
    const height = val(this, 'height', this.currentTime)

    ctx.clearRect(0, 0, width, height)

    if (this.background) {
      ctx.fillStyle = val(this, 'background', this.currentTime)
      // (0, 0) relative to layer
      ctx.fillRect(0, 0, width, height)
    }
    const border = val(this, 'border', this.currentTime)
    if (border && border.color) {
      ctx.strokeStyle = border.color
      // This is optional.. TODO: integrate this with defaultOptions
      ctx.lineWidth = border.thickness || 1
    }

  }

  }

  /**
   */

  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): Visual2DOptions {
    return {
      ...VisualBase.prototype.getDefaultOptions(),
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
Visual2D.prototype.publicExcludes = VisualBase.prototype.publicExcludes.concat(['canvas', 'cctx'])

export { Visual2D, Visual2DOptions }
