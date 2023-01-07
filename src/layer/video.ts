import { Mixin } from 'ts-mixer'
import { VisualSource, VisualSourceOptions } from './visual-source'
import { AudioSource, AudioSourceOptions } from './audio-source'

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
      const video = document.createElement('video')
      video.src = options.source
      options.source = video
    }

    super(options)
  }
}

export { Video, VideoOptions }
