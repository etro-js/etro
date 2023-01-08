import { VisualSource, VisualSourceOptions } from './visual-source'

type ImageOptions = VisualSourceOptions

/**
 * Layer for an HTML image element
 * @extends VisualSource
 */
class Image extends VisualSource {
  constructor (options: ImageOptions) {
    if (typeof (options.source) === 'string') {
      const img = document.createElement('img')
      img.src = options.source
      options.source = img
    }
    super(options)
  }
}

export { Image, ImageOptions }
