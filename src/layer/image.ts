import { Visual } from './visual'
import { VisualSourceMixin, VisualSourceOptions } from './visual-source'

type ImageOptions = VisualSourceOptions

class Image extends VisualSourceMixin(Visual) {
    constructor (options: ImageOptions) {
        if (typeof(options.source) == 'string') {
            const img = document.createElement('img')
            try {
                img.src = options.source
                options.source = img
            }
            catch (err) {
                return
            }
        }
        super(options)
      }
}

export { Image, ImageOptions }
