import { Renderer } from './renderer'

/**
 * WebGL renderer.
 */
export class RendererGL<T extends HTMLCanvasElement | OffscreenCanvas>
implements Renderer<T, WebGLRenderingContext> {
  readonly canvas: T

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
