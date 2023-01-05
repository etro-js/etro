// TODO: rename to something more consistent with the naming convention of Visual and VisualSourceMixin

import { AudioSource, AudioSourceOptions } from './audio-source'
import { publish } from '../event'

type AudioOptions = AudioSourceOptions

/**
 * Layer for an HTML audio element
 * @extends AudioSource
 */
class Audio extends AudioSource {
  /**
   * Creates an audio layer
   */
  constructor (options: AudioOptions) {
    super(options)

    // Emit ready event when the audio is ready to play
    // TODO: Change to 'canplay'
    this.source.addEventListener('loadeddata', () => {
      // Make sure all superclasses are ready
      if (this.ready)
        publish(this, 'ready', {})
    })

    if (this.duration === undefined)
      this.duration = (this).source.duration - this.sourceStartTime
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): AudioOptions {
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
