// TODO: rename to something more consistent with the naming convention of Visual and VisualSourceMixin

import { Base, BaseOptions } from './base'
import { AudioSourceMixin, AudioSourceOptions } from './audio-source'

interface AudioOptions extends Omit<AudioSourceOptions, 'source'> {
  /**
   * The raw html `<audio>` element
   */
  source: string | HTMLAudioElement
}

/**
 * Layer for an HTML audio element
 * @extends AudioSource
 */
class Audio extends AudioSourceMixin<BaseOptions>(Base) {
  /**
   * The raw html `<audio>` element
   */
  source: HTMLAudioElement

  /**
   * Creates an audio layer
   */
  constructor (options: AudioOptions) {
    if (typeof options.source === 'string') {
      const audio = document.createElement('audio')
      audio.src = options.source
      options.source = audio
    }

    super(options)
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions () {
    return {
      ...Object.getPrototypeOf(this).getDefaultOptions(),
      /**
       * @name module:layer.Audio#sourceStartTime
       * @desc Where in the media to start playing when the layer starts
       */
      sourceStartTime: 0,
      duration: undefined
    }
  }
}

export { Audio, AudioOptions }
