import { View } from './view'

export class DOMViewOptions {
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
 * view.use2D()
 * view.ctx.fillStyle = 'red'
 * view.ctx.fillRect(0, 0, 100, 100)
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

    const staticOutput = options.staticOutput
    const back2DCanvas = document.createElement('canvas')
    const front2DCanvas = document.createElement('canvas')
    const glCanvas = document.createElement('canvas')

    const width = staticOutput ? staticOutput.width : options.width
    if (width) {
      back2DCanvas.width = front2DCanvas.width = glCanvas.width = width
      if (staticOutput)
        staticOutput.width = width
    }

    const height = staticOutput ? staticOutput.height : options.height
    if (height) {
      back2DCanvas.height = front2DCanvas.height = glCanvas.height = height
      if (staticOutput)
        staticOutput.height = height
    }

    super({
      back2DCanvas,
      front2DCanvas,
      glCanvas,
      staticOutput
    })
  }
}
