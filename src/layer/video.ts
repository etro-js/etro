import { VisualSourceOptions, VisualSourceMixin } from './visual-source'
import { AudioSourceOptions, AudioSourceMixin } from './audio-source'
import { Visual2D } from './visual-2d'

type VideoOptions = VisualSourceOptions & AudioSourceOptions

// Use mixins instead of `extend`ing two classes (which isn't supported by
// JavaScript).
/**
 * @extends AudioSource
 * @extends VisualSource
 */
class Video extends AudioSourceMixin(VisualSourceMixin(Visual2D)) {
  constructor (options: VisualSourceOptions) {
    if (typeof (options.source) === 'string') {
      const img = document.createElement('video')
      img.src = options.source
      options.source = img
    }
    super(options)
  }
}

export { Video, VideoOptions }
