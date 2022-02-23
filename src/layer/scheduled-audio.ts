import { BaseAudio, BaseAudioOptions } from './base-audio'

type Constructor<T> = new (...args: unknown[]) => T

// Used to define return type for mixin, to prevent circular reference.
export type IScheduledAudio = BaseAudio

export type ScheduledAudioOptions = BaseAudioOptions

export function ScheduledAudioMixin<OptionsSuperclass extends BaseAudioOptions> (superclass: Constructor<BaseAudio>): Constructor<IScheduledAudio> {
  type MixedAudioSourceOptions = OptionsSuperclass & ScheduledAudioOptions

  class MixedScheduledAudio extends superclass {
    constructor (options: MixedAudioSourceOptions) {
      super(options)

      if (!(options.audioNode instanceof AudioScheduledSourceNode))
        throw new Error('audioNode for ScheduledAudio must be an AudioScheduledSourceNode')
    }

    start () {
      (this.audioNode as unknown as AudioScheduledSourceNode).start()
    }

    stop () {
      (this.audioNode as unknown as AudioScheduledSourceNode).stop()
    }
  }

  return MixedScheduledAudio
}

/**
 The layer for `AudioScheduledSourceNode`s
 */
export class ScheduledAudio extends ScheduledAudioMixin(BaseAudio) {}
