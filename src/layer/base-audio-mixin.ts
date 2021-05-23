import { subscribe } from '../event'
import { Movie } from '../movie'
import { Base, BaseOptions } from './base'

type Constructor<T> = new (...args: unknown[]) => T

export type BaseAudioOptions = BaseOptions

export interface BaseAudio extends Base {
  readonly audioNode: AudioNode
}

/*
 This mixin exists for AudioSourceMixin to extend. AudioSourceMixin exists so we
 Video can extend both AudioSource and VisualSource.
 */
export function BaseAudioMixin<OptionsSuperclass extends BaseOptions> (superclass: Constructor<Base>): Constructor<BaseAudio> {
  type MixedBaseAudioOptions = BaseAudioOptions & OptionsSuperclass

  class MixedBaseAudio extends superclass {
    private __audioNode: AudioNode
    private _connectedToDestination: boolean

    // Constructor with the right `options` type
    constructor (options: MixedBaseAudioOptions) { // eslint-disable-line no-useless-constructor
      super(options)
    }

    attach (movie: Movie) {
      super.attach(movie)

      // TODO: on unattach?
      subscribe(movie, 'movie.audiodestinationupdate', event => {
        // Connect to new destination if immeidately connected to the existing
        // destination.
        if (this._connectedToDestination) {
          this.audioNode.disconnect(movie.actx.destination)
          this.audioNode.connect(event.destination)
        }
      })
    }

    protected get _audioNode (): AudioNode {
      return this.__audioNode
    }

    protected set _audioNode (node: AudioNode) {
      if (this.movie === undefined)
        throw new Error('Must be attached to a movie to set _audioNode')

      const prevNode = this.__audioNode
      this.__audioNode = node

      if (node && node !== prevNode) {
        // Cache movie so we'll have it when detaching from it
        const movie = this.movie
        // connect to audiocontext
        // Spy on connect and disconnect to remember if it connected to
        // actx.destination (when we change the audio destination in Movie#record).
        // We need to figure out if we should even be changing the destination.
        const oldConnect = node.connect.bind(node)
        node.connect = <T extends AudioDestinationNode>(destination: T, outputIndex?: number, inputIndex?: number): AudioNode => {
          this._connectedToDestination = destination === movie.actx.destination
          return oldConnect(destination, outputIndex, inputIndex)
        }
        const oldDisconnect = node.disconnect.bind(node)
        node.disconnect = <T extends AudioDestinationNode>(destination?: T | number, output?: number, input?: number): AudioNode => {
          if (this._connectedToDestination && destination === movie.actx.destination)
            this._connectedToDestination = false

          return oldDisconnect(destination, output, input)
        }
      }
    }

    get audioNode () {
      return this._audioNode
    }
  }

  return MixedBaseAudio
}
