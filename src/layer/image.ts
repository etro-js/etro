import { Visual, VisualOptions } from './visual'
import { VisualSourceMixin } from './visual-source'

type ImageOptions = VisualOptions

class Image extends VisualSourceMixin(Visual) {}

export { Image, ImageOptions }
