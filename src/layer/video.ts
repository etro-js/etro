import { Visual } from './visual'
import { VisualSourceOptions, VisualSourceMixin } from './visual-source'
import { AudioSourceOptions, AudioSourceMixin } from './audio-source'

interface VideoOptions extends Omit<AudioSourceOptions & VisualSourceOptions, 'duration'|'source'> {
  duration?: number

  /**
   * The raw html `<video>` element
   */
  source: string | HTMLVideoElement
}

/**
 * Layer for an HTML video element
 * @extends AudioSource
 * @extends VisualSource
 */
class Video extends AudioSourceMixin(VisualSourceMixin(Visual)) {
  /**
   * The raw html `<video>` element
   */
  source: HTMLVideoElement

  constructor (options: VideoOptions) {
    if (typeof (options.source) === 'string') {
      const video = document.createElement('video')
      video.src = options.source
      options.source = video
    }

    super({
      ...options,

      // Set a default duration so that the super constructor doesn't throw an
      // error
      duration: options.duration ?? 0
    } as (AudioSourceOptions & VisualSourceOptions))
  }
}

export { Video, VideoOptions }
