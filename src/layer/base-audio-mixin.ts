import { subscribe } from '../event'
import { Movie } from '../movie'
import { Base, BaseOptions } from './base'

type Constructor<T> = new (...args: unknown[]) => T

export type BaseAudioOptions = BaseOptions

export interface BaseAudio extends Base {
  audioNode: AudioNode
}

/*
 This mixin exists for AudioSourceMixin to extend. AudioSourceMixin exists so we
 Video can extend both AudioSource and VisualSource.
 */
export function BaseAudioMixin<OptionsSuperclass extends BaseOptions> (superclass: Constructor<Base>): Constructor<BaseAudio> {
  type MixedBaseAudioOptions = BaseAudioOptions & OptionsSuperclass

  class MixedBaseAudio extends superclass {
    audioNode: AudioNode

    // Constructor with the right `options` type
    constructor (options: MixedBaseAudioOptions) { // eslint-disable-line no-useless-constructor
      super(options)
    }

    attach (movie: Movie) {
      super.attach(movie)

      // TODO: on unattach?
      subscribe(movie, 'movie.audiodestinationupdate', event => {
        this.audioNode.disconnect(movie.actx.destination)
        this.audioNode.connect(event.destination)
      })
    }
  }
  // watchPublic and publicExcludes should only care about properties that can
  // effect the screen, not the audio (because it's used to call `refresh`).
  MixedBaseAudio.prototype.publicExcludes = superclass.prototype.publicExcludes.concat(['audioNode'])

  return MixedBaseAudio
}
