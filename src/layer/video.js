import Visual from './visual.js'
import VisualSourceMixin from './visual-source.js'
import AudioSourceMixin from './audio-source.js'

// use mixins instead of `extend`ing two classes (which doens't work); see below class def
/**
 * @extends module:layer~Media
 */
class Video extends AudioSourceMixin(VisualSourceMixin(Visual)) {}

export default Video
