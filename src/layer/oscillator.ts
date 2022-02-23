import { Movie } from '../movie'
import { applyOptions, Dynamic, val } from '../util'
import { BaseAudio, BaseAudioOptions } from './base-audio'
import { IScheduledAudio, ScheduledAudio, ScheduledAudioOptions } from './scheduled-audio'

type Constructor<T> = new (...args: unknown[]) => T

// Used to define return type for mixin, to prevent circular reference.
export interface IOscillator extends IScheduledAudio {
  frequency: Dynamic<number>
  detune: Dynamic<number>
  waveformType: Dynamic<string>
}

export interface OscillatorOptions extends Omit<ScheduledAudioOptions, 'audioNode'> {
  frequency: Dynamic<number>
  detune: Dynamic<number>
  waveformType: Dynamic<string>
}

export function OscillatorMixin<OptionsSuperclass extends BaseAudioOptions> (superclass: Constructor<BaseAudio>): Constructor<IOscillator> {
  type MixedOscillatorOptions = OptionsSuperclass & OscillatorOptions

  class MixedOscillator extends superclass {
    frequency: Dynamic<number>
    detune: Dynamic<number>
    waveformType: Dynamic<string>

    constructor (options: MixedOscillatorOptions) {
      super(options)
      applyOptions(options, this)

      if (!(options.audioNode instanceof OscillatorNode))
        throw new Error('audioNode for Oscillator must be an OscillatorNode')
    }

    attach (movie: Movie) {
      this.audioNode = movie.actx.createOscillator()
      this._updateAudioParams()
    }

    detach () {
      // The audio node is associated with the movie; when detached, remove it.
      this.audioNode = null
    }

    render () {
      super.render()

      // Copy dynamic values to audio params every frame
      this._updateAudioParams()
    }

    private _updateAudioParams () {
      const node = this.audioNode as unknown as OscillatorNode
      node.frequency.value = val(this, 'frequency', this.currentTime)
      node.detune.value = val(this, 'detune', this.currentTime)
      node.type = val(this, 'waveformType', this.currentTime)
    }

    getDefaultOptions (): OscillatorOptions {
      // Copied from web audio node defaults
      return {
        ...super.getDefaultOptions(),
        frequency: 440,
        detune: 0,
        waveformType: 'sine'
      }
    }
  }

  return MixedOscillator
}

/**
 The layer for `AudioScheduledSourceNode`s
 */
export class Oscillator extends OscillatorMixin(ScheduledAudio) {
  frequency: Dynamic<number>
  detune: Dynamic<number>
  waveformType: Dynamic<string>
}
