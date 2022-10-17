import { Visual2D } from './visual-2d'
import { VisualSourceMixin, VisualSourceOptions } from './visual-source'

type ImageOptions = VisualSourceOptions

class Image extends VisualSourceMixin(Visual2D) {
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
