import { publish } from '../event'
import { Visual } from './visual'
import { VisualSourceMixin, VisualSourceOptions } from './visual-source'

type ImageOptions = VisualSourceOptions

class Image extends VisualSourceMixin(Visual) {
  constructor (options: ImageOptions) {
    if (typeof (options.source) === 'string') {
      const img = document.createElement('img')
      img.src = options.source
      options.source = img
    }
    super(options)

    // Emit ready event when the image is ready to be drawn
    this.source.addEventListener('load', () => {
      // Make sure all superclasses are ready
      if (this.ready)
        publish(this, 'layer.ready', {})
    })
  }
}

export { Image, ImageOptions }
