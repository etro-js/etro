import { Visual } from './visual'
import { VisualSourceMixin, VisualSourceOptions } from './visual-source'

type ImageOptions = VisualSourceOptions

class Image extends VisualSourceMixin(Visual) {}

export { Image, ImageOptions }
