import { Visual } from './visual'
import { VisualSourceOptions, VisualSourceMixin } from './visual-source'
import { AudioSourceOptions, AudioSourceMixin } from './audio-source'
import { publish } from '../event'

type VideoOptions = VisualSourceOptions & AudioSourceOptions

// Use mixins instead of `extend`ing two classes (which isn't supported by
// JavaScript).
/**
 * @extends AudioSource
 * @extends VisualSource
 */
class Video extends AudioSourceMixin(VisualSourceMixin(Visual)) {
  constructor (options: VisualSourceOptions) {
    if (typeof (options.source) === 'string') {
      const img = document.createElement('video')
      img.src = options.source
      options.source = img
    }

    super(options)

    // Emit ready event when the video is ready to play
    // TODO: Change to 'canplay'
    this.source.addEventListener('loadeddata', () => {
      // Make sure all superclasses are ready
      if (this.ready)
        publish(this, 'layer.ready', {})
    })
  }
}

export { Video, VideoOptions }
