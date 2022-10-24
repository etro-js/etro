import { Renderer } from './renderer'

/**
 * Renderer for the 2D rendering context.
 */
export class Renderer2D<T extends HTMLCanvasElement | OffscreenCanvas, U extends CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D>
implements Renderer<T, U> {
  readonly canvas: T
  readonly context: U

  constructor (canvas: T) {
    this.canvas = canvas
    this.context = canvas.getContext('2d') as U
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
