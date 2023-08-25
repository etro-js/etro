import { Movie } from '../movie'
import { subscribe } from '../event'
import { applyOptions, val } from '../util'
import { Base, BaseOptions } from './base'

type Constructor<T> = new (...args: unknown[]) => T

interface AudioSource extends Base {
  /** HTML media element (an audio or video element) */
  readonly source: HTMLAudioElement
  /** Audio source node for the media */
  readonly audioNode: AudioNode
  playbackRate: number
  /** Seconds to skip ahead by */
  sourceStartTime: number
}

interface AudioSourceOptions extends Omit<BaseOptions, 'duration'> {
  duration?: number
  /** HTML media element (an audio or video element) */
  source: HTMLMediaElement
  /** Seconds to skip ahead by */
  sourceStartTime?: number
  muted?: boolean
  volume?: number
  playbackRate?: number
  onload?: (source: HTMLMediaElement, options: AudioSourceOptions) => void
}

/**
 * A layer that gets its audio from an HTMLMediaElement
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
    private _audioNode: AudioNode
    private _sourceStartTime: number
    private _unstretchedDuration: number
    private _playbackRate: number
    private _initialized: boolean
    private _lastAudioDestination: AudioNode

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
      if (!options.source) {
        throw new Error('Property "source" is required in options')
      }

      const onload = options.onload
      // Don't set as instance property
      delete options.onload

      super({
        ...options,

        // Set a default duration so that the super constructor doesn't throw an
        // error
        duration: options.duration ?? 0
      })

      this._initialized = false
      this._sourceStartTime = options.sourceStartTime || 0
      applyOptions(options, this)

      const load = () => {
        if (options.duration < 0) {
          throw new Error('Invalid options.duration. It must be a non-negative value.')
        }

        if (this.sourceStartTime > this.source.duration) {
          throw new Error('options.sourceStartTime cannot exceed options.source.duration')
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

    async whenReady (): Promise<void> {
      await super.whenReady()
      if (this.source.readyState < 4) {
        await new Promise(resolve => {
          this.source.addEventListener('canplaythrough', resolve)
        })
      }
    }

    attach (movie: Movie) {
      super.attach(movie)

      // TODO: on unattach?
      subscribe(movie, 'audiodestinationupdate', event => {
        this.audioNode.disconnect(this._lastAudioDestination)
        this.audioNode.connect(event.destination)

        this._lastAudioDestination = event.destination
      })

      // connect to audiocontext
      this._audioNode = this.audioNode || movie.actx.createMediaElementSource(this.source)

      // Connect to actx.destination by default (can be rewired by user)
      this.audioNode.connect(movie.actx.destination)
      this._lastAudioDestination = movie.actx.destination
    }

    detach () {
      // Cache dest before super.detach() unsets this.movie
      const dest = this.movie.actx.destination
      super.detach()
      this.audioNode.disconnect(dest)
    }

    start () {
      this.source.currentTime = this.currentTime + this.sourceStartTime
      this.source.play()
    }

    seek (time: number): void {
      super.seek(time)

      if (isNaN(this.currentTime)) {
        this.source.currentTime = this.sourceStartTime
      } else {
        this.source.currentTime = this.currentTime + this.sourceStartTime
      }
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
      super.stop()

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
     * Time in the media at which the layer starts
     */
    get sourceStartTime () {
      return this._sourceStartTime
    }

    get ready (): boolean {
      // Typescript doesn't support `super.ready` when targeting es5
      const superReady = Object.getOwnPropertyDescriptor(superclass.prototype, 'ready').get.call(this)
      return superReady && this.source.readyState === 4
    }

    /**
     * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
     */
    getDefaultOptions () {
      return {
        ...superclass.prototype.getDefaultOptions(),
        source: undefined, // required
        sourceStartTime: 0,
        duration: undefined, // important to include undefined keys, for applyOptions
        muted: false,
        volume: 1,
        playbackRate: 1
      }
    }
  }

  return MixedAudioSource
}

export { AudioSource, AudioSourceOptions, AudioSourceMixin }
