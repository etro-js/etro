import { Base } from './base'
import { BaseAudioMixin } from './base-audio-mixin'

export { BaseAudioOptions } from './base-audio-mixin'
export class BaseAudio extends BaseAudioMixin(Base) {}
