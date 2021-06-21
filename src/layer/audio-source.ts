import { Movie } from '../movie'
import { subscribe } from '../event'
import { applyOptions, val } from '../util'
import { BaseAudio, BaseAudioOptions } from './base-audio-mixin'

type Constructor<T> = new (...args: unknown[]) => T

interface AudioSource extends BaseAudio {
  readonly source: HTMLMediaElement
  readonly audioNode: AudioNode
  playbackRate: number
  /** The audio source node for the media */
  sourceStartTime: number
}

interface AudioSourceOptions extends BaseAudioOptions {
  source: HTMLMediaElement
  sourceStartTime?: number
  muted?: boolean
  volume?: number
  playbackRate: number
  onload?: (source: HTMLMediaElement, options: AudioSourceOptions) => void
}

/**
 * A layer that gets its audio from an HTMLMediaElement
 * @mixin AudioSourceMixin
 */
// TODO: Implement playback rate
// The generic is just for type-checking. The argument is for functionality
// (survives when compiled to javascript).

function AudioSourceMixin<OptionsSuperclass extends BaseAudioOptions> (superclass: Constructor<BaseAudio>): Constructor<AudioSource> {
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
        if ((options.duration || (this.source.duration - this.sourceStartTime)) < 0)
          throw new Error('Invalid options.duration or options.sourceStartTime')

        this._unstretchedDuration = options.duration || (this.source.duration - this.sourceStartTime)
        this.duration = this._unstretchedDuration / (this.playbackRate)
        // onload will use `this`, and can't bind itself because it's before
        // super()
        onload && onload.bind(this)(this.source, options)
      }
      if (this.source.readyState >= 2)
        // this frame's data is available now
        load()
      else
        // when this frame's data is available
        this.source.addEventListener('loadedmetadata', load)

      this.source.addEventListener('durationchange', () => {
        this.duration = options.duration || (this.source.duration - this.sourceStartTime)
      })
    }

    attach (movie: Movie) {
      // 1 - Set audioNode for super.attach
      // If attach and detach were called prior to this, audioNode will be
      // cached. The web audio can't create multiple audio nodes for one media
      // element.
      this.audioNode = this.audioNode || movie.actx.createMediaElementSource(this.source)
      this.audioNode.connect(movie.actx.destination)

      // 2 - Call super.attach
      super.attach(movie)

      // 3 - Other attachment chores
      subscribe(movie, 'movie.seek', () => {
        if (this.currentTime < 0 || this.currentTime >= this.duration)
          return

        this.source.currentTime = this.currentTime + this.sourceStartTime
      })
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

    get playbackRate () {
      return this._playbackRate
    }

    set playbackRate (value) {
      this._playbackRate = value
      if (this._unstretchedDuration !== undefined)
        this.duration = this._unstretchedDuration / value
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

    getDefaultOptions (): MixedAudioSourceOptions {
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
  // Don't add 'source' to publicExcludes because when this class is mixed with
  // VisualSource, the video VisualSource#source cannot be excluded from
  // watchPublic.

  return MixedAudioSource
}

export { AudioSource, AudioSourceOptions, AudioSourceMixin }
