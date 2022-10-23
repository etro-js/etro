import { View } from './view'

function createCanvas (width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export interface DOMViewOptions {
  /**
   * Optional output canvas to copy the final image to.
   */
  staticOutput?: HTMLCanvasElement

  width?: number

  height?: number
}

/**
 * The DOM view is a view that renders to HTML canvas elements.
 *
 * Sample usage:
 *
 * ```ts
 * const view = new DOMView()
 * view.resize(100, 100)
 *
 * const ctx = view.use2D()
 * ctx.fillStyle = 'red'
 * ctx.fillRect(0, 0, 100, 100)
 *
 * view.finish()
 * const outputCanvas = view.output
 */
export class DOMView extends View<HTMLCanvasElement> {
  constructor (options: DOMViewOptions = {}) {
    // TypeScript accepts a canvas element as a DOMViewOptions argument, but
    // it's not a valid argument. This is a workaround.
    if (options instanceof HTMLCanvasElement)
      throw new Error('visibleOutput cannot be an HTMLCanvasElement')

    super({
      createCanvas,
      staticOutput: options.staticOutput,
      width: options.width,
      height: options.height
    })
  }
}
