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

  resize (width: number, height: number): void {
    if (width === this.canvas.width && height === this.canvas.height)
      return

    this.canvas.width = width
    this.canvas.height = height

    this.context.viewport(0, 0, width, height)
  }
}
