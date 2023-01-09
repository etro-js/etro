import { Mixin } from 'ts-mixer'
import { VisualSource, VisualSourceOptions } from './visual-source'
import { AudioSource, AudioSourceOptions } from './audio-source'

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
class Video extends Mixin(VisualSource, AudioSource) {
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
