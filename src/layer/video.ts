import { Visual } from './visual'
import { VisualSourceOptions, VisualSourceMixin } from './visual-source'
import { AudioSourceOptions, AudioSourceMixin } from './audio-source'

type VideoOptions = VisualSourceOptions & AudioSourceOptions

// Use mixins instead of `extend`ing two classes (which isn't supported by
// JavaScript).
/**
 * @extends AudioSource
 * @extends VisualSource
 */
class Video extends AudioSourceMixin(VisualSourceMixin(Visual)) {}

export { Video, VideoOptions }
