import Base from './base.js'
import AudioSourceMixin from './audio-source.js'

/**
 * @extends module:layer~Media
 */
class Audio extends AudioSourceMixin(Base) {
  /**
   * Creates an audio layer
   *
   * @param {object} options
   */
  constructor (options = {}) {
    // fill in the zero once loaded, no width or height (will raise error)
    super(options)
    if (this.duration === undefined) {
      this.duration = this.source.duration - this.sourceStartTime
    }
  }

  getDefaultOptions () {
    return {
      ...Object.getPrototypeOf(this).getDefaultOptions(), // let's not call AudioSourceMixin again
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

export default Audio
