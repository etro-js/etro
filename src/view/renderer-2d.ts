import { Renderer } from './renderer'

/**
 * Renderer for the 2D rendering context.
 *
 * The swap cycle has two renderers, because it is possible for the canvas's
 * image data to be accessed at the same time that it is being drawn to, like
 * this:
 *
 * ```ts
 * renderer.context.drawImage(renderer.canvas, 0, 0)
 * ```
 */
export class Renderer2D<T extends HTMLCanvasElement | OffscreenCanvas, U extends CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D>
implements Renderer<T, U> {
  readonly canvas: T
  readonly context: U
  // eslint-disable-next-line no-use-before-define
  readonly nextRenderer: Renderer2D<T, U> = null

  constructor (frontCanvas: T, backCanvasOrRenderer?: T | Renderer2D<T, U>) {
    this.canvas = frontCanvas
    this.context = frontCanvas.getContext('2d') as U

    if (backCanvasOrRenderer instanceof Renderer2D)
      this.nextRenderer = backCanvasOrRenderer
    else if (backCanvasOrRenderer)
      this.nextRenderer = new Renderer2D(backCanvasOrRenderer, this)
    else
      // No back renderer supplied, so we'll just render to the front canvas.
      this.nextRenderer = this
  }

  resize (width: number, height: number): void {
    if (width === this.canvas.width && height === this.canvas.height)
      return

    this.canvas.width = width
    this.canvas.height = height
  }

  readPixels (x: number, y: number, width: number, height: number): Uint8ClampedArray {
    if (x < 0 || y < 0 || width < 0 || height < 0 || x + width > this.canvas.width || y + height > this.canvas.height)
      throw new Error('Invalid readPixels() call')

    return this.context.getImageData(x, y, width, height).data
  }
}
