/**
 * A renderer exposes a render context to a view.
 *
 * Every renderer has its own canvas.
 */
export interface Renderer<T extends OffscreenCanvas | HTMLCanvasElement, U> {
  /**
   * The canvas to render to.
   */
  readonly canvas: T

  /**
   * The context to render with.
   */
  readonly context: U

  /**
   * Resizes the renderer's canvas.
   *
   * @param width
   * @param height
   */
  resize (width: number, height: number): void

  /**
   * Reads the image data from the canvas.
   *
   * Since this copies the canvas's image data from the GPU to the CPU, it is
   * expensive and should be avoided if possible.
   *
   * @param x
   * @param y
   * @param width
   * @param height
   */
  readPixels (x: number, y: number, width: number, height: number): Uint8ClampedArray
}
