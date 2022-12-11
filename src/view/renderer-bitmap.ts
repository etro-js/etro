import { Renderer } from './renderer'

/**
 * Renderer for the 2D rendering context.
 */
export class RendererBitmap<T extends HTMLCanvasElement | OffscreenCanvas>
implements Renderer<T, ImageBitmapRenderingContext> {
  readonly canvas: T
  readonly context: ImageBitmapRenderingContext

  constructor (canvas: T) {
    this.canvas = canvas
    this.context = canvas.getContext('bitmaprenderer')
  }

  resize (width: number, height: number): void {
    if (width === this.canvas.width && height === this.canvas.height)
      return

    this.canvas.width = width
    this.canvas.height = height
  }
}
