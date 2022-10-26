import { Dynamic, val, applyOptions, Color } from '../util'
import { VisualBase, VisualBaseOptions } from './visual-base'

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

// Redeclaring this function to avoid circular dependency
function get2DRenderingContext (object: Visual2D): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  if (object.view)
    return object.view.use2D()
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

  private _canvas: HTMLCanvasElement
  private _cctx: CanvasRenderingContext2D

  /**
   * Creates a visual layer
   */
  constructor (options: Visual2DOptions) {
    super(options)
    // Only validate extra if not subclassed, because if subclcass, there will
    // be extraneous options.
    applyOptions(options, this)

    // Create a canvas if not using a view (for backwards compatibility)
    if (!this.view) {
      // We cannot call val() until attached to a movie, so we have to use default
      // values.
      const width = 100
      const height = 100

      this._canvas = makeCanvas(width, height)
      this._cctx = this._canvas.getContext('2d')
    }
  }

  beginRender (): void {
    super.beginRender()

    if (!this.view) {
      const width = val(this, 'width', this.currentTime)
      const height = val(this, 'height', this.currentTime)

      if (this._canvas.width !== width || this._canvas.height !== height) {
        this._canvas.width = width
        this._canvas.height = height
      }
    }

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

    if (this.view)
      this.view.finish()
  }

  /**
   * HTML canvas element used for rendering
   * @deprecated Use {@link module:layer.Visual#view} instead
   */
  get canvas (): HTMLCanvasElement {
    if (this.view)
      throw new Error('`canvas` is incompatible with `view`')

    return this._canvas
  }

  /**
   * Rendering context for {@link module:layer.Visual#canvas}
   * @deprecated Use {@link module:layer.Visual#view.use2D} instead
   */
  get cctx (): CanvasRenderingContext2D {
    if (this.view)
      throw new Error('`cctx` is incompatible with `view`')

    return this._cctx
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
