import { Renderer } from './renderer'
import { Renderer2D } from './renderer-2d'
import { RendererGL } from './renderer-gl'

export class ViewOptions<T extends HTMLCanvasElement | OffscreenCanvas> {
  back2DCanvas: T

  front2DCanvas: T

  glCanvas: T

  /**
   * Optional output canvas to copy the final image to.
   */
  staticOutput?: T
}

/**
 * A view is a set of canvases, each with its own rendering context.
 *
 * Only one context can be active at a time.
 *
 * Sample usage:
 *
 * ```ts
 * const view = new View({
 *   back2DCanvas: document.createElement('canvas'),
 *   front2DCanvas: document.createElement('canvas'),
 *   glCanvas: document.createElement('canvas'),
 * })
 * view.resize(100, 100)
 *
 * view.use2D()
 * view.ctx.fillStyle = 'red'
 * view.ctx.fillRect(0, 0, 100, 100)
 *
 * view.finish()
 * const outputCanvas = view.output
 *
 * An optional `staticOutput` canvas can be provided to the constructor. The
 * active context will be drawn to this canvas when `flush()` is called.
 * ```
 *
 * @template T The type of canvas to use.
 */
// The purpose of this class is to support multiple graphics APIs, such as
// WebGL, Canvas2D, and probably WebGPU in the future. Backwards compatibility
// is maintained by copying the previous canvas to the current one when
// switching rendering contexts.
export class View<T extends HTMLCanvasElement | OffscreenCanvas> {
  readonly staticOutput: T
  private _rendererStatic: Renderer2D<T, OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D> | null = null

  private _renderer2D: Renderer2D<T, T extends OffscreenCanvas ? OffscreenCanvasRenderingContext2D : CanvasRenderingContext2D>
  private _rendererGL: RendererGL<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _backRenderer: Renderer<T, any> = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _frontRenderer: Renderer<T, any> = null

  private _width: number
  private _height: number

  /**
   * Creates a new view.
   */
  constructor (options: ViewOptions<T>) {
    this._width = options.front2DCanvas.width
    this._height = options.front2DCanvas.height

    if (this._width !== options.back2DCanvas.width ||
      this._height !== options.back2DCanvas.height ||
      this._width !== options.glCanvas.width ||
      this._height !== options.glCanvas.height)
      throw new Error('Canvas dimensions do not match.')

    this._renderer2D = new Renderer2D(options.front2DCanvas, options.back2DCanvas)
    this._rendererGL = new RendererGL(options.glCanvas)

    if (options.staticOutput) {
      if (options.staticOutput.width !== this._width || options.staticOutput.height !== this._height)
        throw new Error('Canvas dimensions do not match.')

      this._rendererStatic = new Renderer2D(options.staticOutput)
      this.staticOutput = options.staticOutput
    }
  }

  get width (): number {
    return this._width
  }

  get height (): number {
    return this._height
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _resizeRenderer (renderer: Renderer<any, any>, width: number, height: number): void {
    // Resize all renderers in the cycle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visited = new Set<Renderer<any, any>>()

    while (renderer && !visited.has(renderer)) {
      renderer.resize(width, height)
      visited.add(renderer)
      renderer = renderer.nextRenderer
    }
  }

  /**
   * Resizes all of the view's canvases.
   *
   * @param width
   * @param height
   * @returns
   */
  resize (width: number, height: number): void {
    if (this._backRenderer)
      throw new Error('Cannot resize while a rendering context is active.')

    if (width === this._width && height === this._height)
      return

    this._width = width
    this._height = height

    this._resizeRenderer(this._renderer2D, width, height)
    this._resizeRenderer(this._rendererGL, width, height)
    if (this._rendererStatic)
      this._resizeRenderer(this._rendererStatic, width, height)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _setBackRenderer (renderer: Renderer<any, any>): void {
    if (renderer && this._backRenderer)
      throw new Error('Cannot switch rendering contexts while one is active. Call finish() first.')

    if (this._backRenderer === renderer)
      return

    if (this._backRenderer)
      this._frontRenderer = this._backRenderer

    this._backRenderer = renderer
  }

  /**
   * Activates a 2D context.
   *
   * @returns One of the 2D contexts.
   */
  use2D (): T extends OffscreenCanvas ? OffscreenCanvasRenderingContext2D : CanvasRenderingContext2D {
    if (!(this._backRenderer instanceof Renderer2D)) {
      this._renderer2D = this._renderer2D.nextRenderer
      this._setBackRenderer(this._renderer2D)
    }

    return this._renderer2D.context
  }

  /**
   * Activates the WebGL context.
   *
   * @returns The WebGL context.
   * @throws If WebGL is not supported.
   */
  useGL (): WebGLRenderingContext {
    if (!(this._backRenderer instanceof RendererGL)) {
      this._rendererGL = this._rendererGL.nextRenderer
      this._setBackRenderer(this._rendererGL)
    }

    return this._rendererGL.context
  }

  /**
   * Finishes rendering. `output` will be updated with the result
   *
   * @throws If no rendering context is active.
   */
  finish (): void {
    if (!this._backRenderer)
      throw new Error('No rendering context is active. Call useDOM(), use2D(), or useGL() first.')

    this._setBackRenderer(null)
  }

  /**
   * Copies `output` to `staticOutput`.
   *
   * @returns The fixed output canvas.
   * @throws If the fixed output canvas was not provided in the constructor.
   * @throws If `finish()` was not called.
   */
  flush () {
    if (!this._rendererStatic)
      throw new Error('No static output canvas was provided in the constructor.')

    this._rendererStatic.context.drawImage(this.output, 0, 0)
  }

  /**
   * Read image data from the last rendered canvas.
   *
   * Since this copies the image data from the GPU, it is slow. Prefer using
   * `output` when possible.
   *
   * @returns The image data in RGBA format.
   * @throws If `finish()` was not called.
   */
  readPixels (x: number, y: number, width: number, height: number): Uint8ClampedArray {
    if (!this._frontRenderer)
      throw new Error('No output is available. Call finish() first.')

    if (x < 0 || y < 0 || width < 0 || height < 0 || x + width > this._width || y + height > this._height)
      throw new Error('Invalid readPixels() bounds.')

    return this._frontRenderer.readPixels(x, y, width, height)
  }

  /**
   * The last rendered canvas.
   *
   * @returns The last rendered canvas.
   * @throws If `finish()` was not called.
   */
  get output (): T {
    if (!this._frontRenderer)
      throw new Error('No output is available. Call finish() first.')

    return this._frontRenderer.canvas
  }
}
