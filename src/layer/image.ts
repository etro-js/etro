import { Visual, VisualSourceOptions} from './visual'
import { VisualSourceMixin } from './visual-source'

type ImageOptions = VisualSourceOptions

class Image extends VisualSourceMixin(Visual) {}

export { Image, ImageOptions }
