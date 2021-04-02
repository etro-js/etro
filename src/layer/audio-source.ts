import { AudioContext, IAudioNode, IAudioDestinationNode } from 'standardized-audio-context'
import Movie from '../movie'
import { subscribe } from '../event'
import { applyOptions, val } from '../util'
import { Base, BaseOptions } from './base'

type Constructor<T> = new (...args: unknown[]) => T

interface AudioSource extends Base {
  readonly source: HTMLMediaElement
  readonly audioNode: IAudioNode<AudioContext>
  playbackRate: number
  sourceStartTime: number
}

interface AudioSourceOptions extends BaseOptions {
  source: HTMLMediaElement
  sourceStartTime?: number
  muted?: boolean
  volume?: number
  playbackRate: number
  onload?: (source: HTMLMediaElement, options: AudioSourceOptions) => void
}

/**
 * Video or audio
 * @mixin AudioSourceMixin
 */
// TODO: Implement playback rate
// The generic is just for type-checking. The argument is for functionality
// (survives when compiled to javascript).

function AudioSourceMixin<OptionsSuperclass extends BaseOptions> (superclass: Constructor<Base>): Constructor<AudioSource> {
  type MixedAudioSourceOptions = OptionsSuperclass & AudioSourceOptions

  class MixedAudioSource extends superclass {
    /**
     * The raw html media element
     */
    readonly source: HTMLMediaElement

    private __startTime: number
    private _audioNode: IAudioNode<AudioContext>
    private _sourceStartTime: number
    private _unstretchedDuration: number
    private _playbackRate: number
    private _initialized: boolean
    private _connectedToDestination: boolean

    /**
     * @param options
     * @param options.source
     * @param options.onload
     * @param [options.sourceStartTime=0] - at what time in the audio
     * the layer starts
     * @param [options.duration=media.duration-options.sourceStartTime]
     * @param [options.muted=false]
     * @param [options.volume=1]
     * @param [options.playbackRate=1]
     */
    constructor (options: MixedAudioSourceOptions) {
      const onload = options.onload
      // Don't set as instance property
      delete options.onload
      super(options)
      this._initialized = false
      this._sourceStartTime = options.sourceStartTime || 0
      applyOptions(options, this)

      const load = () => {
        // TODO:              && ?
        if ((options.duration || (this.source.duration - this.sourceStartTime)) < 0) {
          throw new Error('Invalid options.duration or options.sourceStartTime')
        }
        this._unstretchedDuration = options.duration || (this.source.duration - this.sourceStartTime)
        this.duration = this._unstretchedDuration / (this.playbackRate)
        // onload will use `this`, and can't bind itself because it's before
        // super()
        onload && onload.bind(this)(this.source, options)
      }
      if (this.source.readyState >= 2) {
        // this frame's data is available now
        load()
      } else {
        // when this frame's data is available
        this.source.addEventListener('loadedmetadata', load)
      }
      this.source.addEventListener('durationchange', () => {
        this.duration = options.duration || (this.source.duration - this.sourceStartTime)
      })
    }

    attach (movie: Movie) {
      super.attach(movie)

      subscribe(movie, 'movie.seek', () => {
        const time = movie.currentTime
        if (time < this.startTime || time >= this.startTime + this.duration) {
          return
        }
        this.source.currentTime = time - this.startTime
      })

      // TODO: on unattach?
      subscribe(movie, 'movie.audiodestinationupdate', event => {
        // Connect to new destination if immeidately connected to the existing
        // destination.
        if (this._connectedToDestination) {
          this.audioNode.disconnect(movie.actx.destination)
          this.audioNode.connect(event.destination)
        }
      })

      // connect to audiocontext
      this._audioNode = movie.actx.createMediaElementSource(this.source)

      // Spy on connect and disconnect to remember if it connected to
      // actx.destination (for Movie#record).
      const oldConnect = this._audioNode.connect.bind(this.audioNode)
      this._audioNode.connect = <T extends IAudioDestinationNode<AudioContext>>(destination: T, outputIndex?: number, inputIndex?: number): AudioNode => {
        this._connectedToDestination = destination === movie.actx.destination
        return oldConnect(destination, outputIndex, inputIndex)
      }
      const oldDisconnect = this._audioNode.disconnect.bind(this.audioNode)
      this._audioNode.disconnect = <T extends IAudioDestinationNode<AudioContext>>(destination?: T | number, output?: number, input?: number): AudioNode => {
        if (this._connectedToDestination &&
        destination === movie.actx.destination) {
          this._connectedToDestination = false
        }
        return oldDisconnect(destination, output, input)
      }

      // Connect to actx.destination by default (can be rewired by user)
      this.audioNode.connect(movie.actx.destination)
    }

    start () {
      this.source.currentTime = this.currentTime + this.sourceStartTime
      this.source.play()
    }

    render () {
      super.render()
      // TODO: implement Issue: Create built-in audio node to support built-in
      // audio nodes, as this does nothing rn
      this.source.muted = val(this, 'muted', this.currentTime)
      this.source.volume = val(this, 'volume', this.currentTime)
      this.source.playbackRate = val(this, 'playbackRate', this.currentTime)
    }

    stop () {
      this.source.pause()
    }

    /**
     * The audio source node for the media
     */
    get audioNode () {
      return this._audioNode
    }

    get playbackRate () {
      return this._playbackRate
    }

    set playbackRate (value) {
      this._playbackRate = value
      if (this._unstretchedDuration !== undefined) {
        this.duration = this._unstretchedDuration / value
      }
    }

    get startTime () {
      return this.__startTime
    }

    set startTime (val) {
      this.__startTime = val
      if (this._initialized) {
        const mediaProgress = this.movie.currentTime - this.startTime
        this.source.currentTime = this.sourceStartTime + mediaProgress
      }
    }

    set sourceStartTime (val) {
      this._sourceStartTime = val
      if (this._initialized) {
        const mediaProgress = this.movie.currentTime - this.startTime
        this.source.currentTime = mediaProgress + this.sourceStartTime
      }
    }

    /**
     * Timestamp in the media where the layer starts at
     */
    get sourceStartTime () {
      return this._sourceStartTime
    }

    getDefaultOptions (): MixedAudioSourceOptions {
      return {
        ...superclass.prototype.getDefaultOptions(),
        source: undefined, // required
        /**
         * @name module:layer~Media#sourceStartTime
         * @desc Timestamp in the media where the layer starts at
         */
        sourceStartTime: 0,
        /**
         * @name module:layer~Media#duration
         */
        duration: undefined, // important to include undefined keys, for applyOptions
        /**
         * @name module:layer~Media#muted
         */
        muted: false,
        /**
         * @name module:layer~Media#volume
         */
        volume: 1,
        /**
         * @name module:layer~Media#playbackRate
         */
        playbackRate: 1
      }
    }
  }

  return MixedAudioSource
}

export { AudioSource, AudioSourceOptions, AudioSourceMixin }
