// TODO: rename to something more consistent with the naming convention of Visual and VisualSourceMixin

import { Base, BaseOptions } from './base'
import { AudioSourceMixin, AudioSourceOptions } from './audio-source'

type AudioOptions = AudioSourceOptions

/**
 * @extends module:layer~Media
 */
class Audio extends AudioSourceMixin<BaseOptions>(Base) {
  /**
   * Creates an audio layer
   *
   * @param {object} options
   */
  constructor (options: AudioOptions) {
    super(options)
    if (this.duration === undefined) {
      this.duration = (this).source.duration - this.sourceStartTime
    }
  }

  getDefaultOptions (): AudioOptions {
    return {
      ...Object.getPrototypeOf(this).getDefaultOptions(),
      /**
       * @name module:layer.Audio#sourceStartTime
       * @type number
       * @desc Where in the media to start playing when the layer starts
       */
      sourceStartTime: 0,
      duration: undefined
    }
  }
}

export { Audio, AudioOptions }
