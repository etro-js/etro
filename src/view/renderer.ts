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
}
