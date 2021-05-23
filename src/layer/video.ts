import { Visual } from './visual'
import { VisualSourceOptions, VisualSourceMixin } from './visual-source'
import { BaseAudioMixin, BaseAudioOptions } from './base-audio-mixin'
import { AudioSourceOptions, AudioSourceMixin } from './audio-source'

type VideoOptions = VisualSourceOptions & AudioSourceOptions

// Intermediary mixins
const VisualSource = VisualSourceMixin<VisualSourceOptions>(Visual)
const VisualSourceWithAudio = BaseAudioMixin<BaseAudioOptions>(VisualSource)

// Final mixin
/**
 * @extends AudioSource
 * @extends VisualSource
 */
const Video = AudioSourceMixin<AudioSourceOptions>(VisualSourceWithAudio)

export { Video, VideoOptions }
