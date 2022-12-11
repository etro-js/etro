import { Renderer } from './renderer'
import { Renderer2D } from './renderer-2d'
import { RendererBitmap } from './renderer-bitmap'
import { RendererGL } from './renderer-gl'

export interface ViewOptions {
  width?: number

  height?: number

  /**
   * Optional output canvas to copy the final image to.
   */
  staticOutput?: HTMLCanvasElement
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
 * const ctx = view.use2D()
 * ctx.fillStyle = 'red'
 * ctx.fillRect(0, 0, 100, 100)
 *
 * view.finish()
 * const output: ImageBitmap = view.output()
 *
 * An optional `staticOutput` canvas can be provided to the constructor. The
 * active context will be drawn to this canvas when `renderStatic()` is called.
 * ```
 *
 * @template T The type of canvas to use.
 */
// The purpose of this class is to support multiple graphics APIs, such as
// WebGL, Canvas2D, and probably WebGPU in the future. Backwards compatibility
// is maintained by copying the previous canvas to the current one when
// switching rendering contexts.
export class View {
  readonly staticOutput: HTMLCanvasElement
  private _rendererStatic: RendererBitmap<HTMLCanvasElement> | null = null

  private _rendererReadPixels: Renderer2D<HTMLCanvasElement, CanvasRenderingContext2D> | null = null

  private _renderer2D: Renderer2D<OffscreenCanvas, OffscreenCanvasRenderingContext2D>
  private _rendererGL: RendererGL<OffscreenCanvas>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _backRenderer: Renderer<OffscreenCanvas, any> = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _frontRenderer: Renderer<OffscreenCanvas, any> = null

  private _width: number
  private _height: number

  private _staticRendered = false

  /**
   * Creates a new view.
   */
  constructor (options: ViewOptions = {}) {
    if (options.staticOutput) {
      // No need to lazily create the static renderer, since the canvas is
      // provided by the user.
      this._rendererStatic = new RendererBitmap(options.staticOutput)
      this.staticOutput = options.staticOutput

      if ((options.width !== undefined && options.width !== options.staticOutput.width) ||
        (options.height !== undefined && options.height !== options.staticOutput.height)) {
        const width = options.width ?? options.staticOutput.width
        const height = options.height ?? options.staticOutput.height
        this._rendererStatic.resize(width, height)
      }

      this._width = this.staticOutput.width
      this._height = this.staticOutput.height
    } else {
      this._width = options.width ?? 0
      this._height = options.height ?? 0
    }
  }

  get width (): number {
    return this._width
  }

  get height (): number {
    return this._height
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

    if (this._renderer2D)
      this._renderer2D.resize(width, height)

    if (this._rendererGL)
      this._rendererGL.resize(width, height)

    if (this._rendererStatic)
      this._rendererStatic.resize(width, height)

    if (this._rendererReadPixels)
      this._rendererReadPixels.resize(width, height)
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
   * Activates the 2D context.
   *
   * @returns The 2D context.
   */
  use2D (): OffscreenCanvasRenderingContext2D {
    // Lazily create the renderer to avoid creating canvases if they're not used.
    this._renderer2D = this._renderer2D || new Renderer2D(
      new OffscreenCanvas(this.width, this.height)
    )

    if (!(this._backRenderer instanceof Renderer2D))
      this._setBackRenderer(this._renderer2D)

    return this._renderer2D.context
  }

  /**
   * Activates the WebGL context.
   *
   * @returns The WebGL context.
   * @throws If WebGL is not supported.
   */
  useGL (): WebGLRenderingContext {
    // Lazily create the renderer to avoid creating a canvas if it's not used.
    this._rendererGL = this._rendererGL || new RendererGL(
      new OffscreenCanvas(this.width, this.height)
    )

    if (!(this._backRenderer instanceof RendererGL))
      this._setBackRenderer(this._rendererGL)

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
    this._staticRendered = false
  }

  /**
   * Copies {@link output} to {@link staticOutput}.
   *
   * @throws If the fixed output canvas was not provided in the constructor.
   * @throws If `finish()` was not called.
   */
  renderStatic () {
    if (!this._rendererStatic)
      throw new Error('No static output canvas was provided in the constructor.')

    this._rendererStatic.context.transferFromImageBitmap(this.output())
    this._staticRendered = true
  }

  /**
   * Reads image data from the current output.
   *
   * Must be called after {@link finish} and before {@link output}.
   *
   * Since this copies the image data from the GPU, it is slow. Prefer using
   * `output` when possible.
   *
   * @returns The image data in RGBA format.
   * @throws If `finish()` was not called.
   */
  readPixels (x: number, y: number, width: number, height: number): Uint8ClampedArray {
    if (x < 0 || y < 0 || width < 0 || height < 0 || x + width > this._width || y + height > this._height)
      throw new Error('Invalid readPixels() bounds.')

    if (!this._rendererReadPixels) {
      this._rendererReadPixels = new Renderer2D(
        document.createElement('canvas')
      )
      this._rendererReadPixels.resize(this._width, this._height)
    }

    // Copy the output to the readPixels renderer. If the front renderer has
    // been copied to the static renderer, then we need to copy the static
    // renderer to the readPixels renderer, because the front renderer has been
    // transferred and thus is now longer valid. Otherwise, we can copy the
    // front renderer directly.
    let output: HTMLCanvasElement | OffscreenCanvas
    if (this._staticRendered)
      output = this._rendererStatic.canvas
    else if (!this._frontRenderer)
      throw new Error('No output is available. Call finish() first.')
    else
      output = this._frontRenderer.canvas

    this._rendererReadPixels.context.drawImage(output, 0, 0)
    return this._rendererReadPixels.context.getImageData(x, y, width, height).data
  }

  /**
   * Converts the current output to an ImageBitmap.
   *
   * Must be called after {@link finish}. Can only be called once per call to
   * {@link finish}. The ImageBitmap must be closed by the caller.
   *
   * @returns The ImageBitmap.
   * @throws If `finish()` was not called.
   */
  output (): ImageBitmap {
    if (!this._frontRenderer)
      throw new Error('No output is available. Call finish() first.')

    const bitmap = this._frontRenderer.canvas.transferToImageBitmap()
    this._frontRenderer = null
    return bitmap
  }
}
