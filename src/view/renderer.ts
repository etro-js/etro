/**
 * A renderer exposes a render context to a view.
 *
 * Every renderer has its own canvas.
 *
 * Each renderer is part of a cycle used for swapping between front and back
 * renderers.
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
   * The next renderer in the swap cycle.
   *
   * The swap cycle must have at least two renderers if it is possible for a
   * no-op render to occur when drawing the current canvas to itself. This
   * occurs when the canvas's image data is accessed at the same time that it is
   * being drawn to (e.g. no buffer is required). If it is impossible for a
   * no-op render to occur, then the swap cycle may have only one renderer.
   */
  readonly nextRenderer: Renderer<T, U>

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
