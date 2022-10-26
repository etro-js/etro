import { View } from './view'

export interface OffscreenViewOptions {
  /**
   * Optional onscreen output canvas to copy the final image to.
   */
  staticOutput?: HTMLCanvasElement

  width?: number

  height?: number
}

/**
 * View that renders to offscreen canvases.
 */
export class OffscreenView extends View<OffscreenCanvas> {
  constructor (options: OffscreenViewOptions = {}) {
    // TypeScript accepts a canvas element as a OffscreenViewOptions argument, but
    // it's not a valid argument. This is a workaround.
    if (options instanceof HTMLCanvasElement)
      throw new Error('visibleOutput cannot be an HTMLCanvasElement')

    super({
      createCanvas: (width: number, height: number) => new OffscreenCanvas(width, height),
      staticOutput: options.staticOutput,
      width: options.width,
      height: options.height
    })
  }
}
