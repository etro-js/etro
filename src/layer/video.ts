import { Mixin } from 'ts-mixer'
import { VisualSource, VisualSourceOptions } from './visual-source'
import { AudioSource, AudioSourceOptions } from './audio-source'
import { publish } from '../event'

type VideoOptions = VisualSourceOptions & AudioSourceOptions

// Use mixins instead of `extend`ing two classes (which isn't supported by
// JavaScript).
/**
 * @extends AudioSource
 * @extends VisualSource
 */
class Video extends Mixin(VisualSource, AudioSource) {
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
        publish(this, Video.Event.READY, {})
    })
  }
}

export { Video, VideoOptions }
