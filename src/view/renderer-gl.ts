import { Renderer } from './renderer'

/**
 * WebGL renderer.
 *
 * The swap cycle has one renderer, since it is not possible for a no-op render
 * to occur when drawing the canvas to itself. This is because the canvas's
 * image data needs to be copied to a texture before it can be drawn back to the
 * canvas.
 */
export class RendererGL<T extends HTMLCanvasElement | OffscreenCanvas>
implements Renderer<T, WebGLRenderingContext> {
  readonly canvas: T

  // No need for a separate back renderer, since we load the view's output into
  // a texture before rendering.
  // eslint-disable-next-line no-use-before-define
  readonly nextRenderer: RendererGL<T> = this

  private _context: WebGLRenderingContext

  constructor (canvas: T) {
    this.canvas = canvas
  }

  private _initWebGL (): void {
    const gl = this.canvas.getContext('webgl')
    if (gl === null)
      throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')

    this._context = gl
  }

  get context (): WebGLRenderingContext {
    if (!this._context)
      this._initWebGL()

    return this._context
  }

  readPixels (x: number, y: number, width: number, height: number): Uint8ClampedArray {
    if (x < 0 || y < 0 || width < 0 || height < 0 || x + width > this.canvas.width || y + height > this.canvas.height)
      throw new Error('Invalid readPixels() call')

    const gl = this.context
    const pixels = new Uint8ClampedArray(width * height * 4)
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return pixels
  }

  resize (width: number, height: number): void {
    if (width === this.canvas.width && height === this.canvas.height)
      return

    this.canvas.width = width
    this.canvas.height = height

    this.context.viewport(0, 0, width, height)
  }
}
