import { VisualSource, VisualSourceOptions } from './visual-source'

interface ImageOptions extends Omit<VisualSourceOptions, 'source'> {
  /**
   * The raw html `<img>` element
   */
  source: string | HTMLImageElement
}

/**
 * Layer for an HTML image element
 * @extends VisualSource
 */
class Image extends VisualSource {
  /**
   * The raw html `<img>` element
   */
  source: HTMLImageElement

  constructor (options: ImageOptions) {
    if (typeof (options.source) === 'string') {
      const img = document.createElement('img')
      img.src = options.source
      options.source = img
    }

    super(options as VisualSourceOptions)
  }
}

export { Image, ImageOptions }
