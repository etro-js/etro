import { Movie } from '../movie'
import { subscribe } from '../event'
import { applyOptions, val } from '../util'
import { Base, BaseOptions } from './base'

// TODO: Make `duration` optional
interface AudioSourceOptions extends BaseOptions {
  /** HTML media element (an audio or video element) */
  source: HTMLAudioElement
  /** Seconds to skip ahead by */
  sourceStartTime?: number
  muted?: boolean
  volume?: number
  // TODO: Make this optional
  playbackRate: number
  onload?: (source: HTMLAudioElement, options: AudioSourceOptions) => void
}

/**
 * A layer that gets its audio from an HTMLAudioElement
 * @mixin AudioSourceMixin
 */
// TODO: Implement playback rate
// The generic is just for type-checking. The argument is for functionality
// (survives when compiled to javascript).
class AudioSource extends Base {
  /**
   * The raw html media element
   */
  readonly source: HTMLAudioElement

  private __startTime: number
  private _audioNode: AudioNode
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
  constructor (options: AudioSourceOptions) {
    if (!options.source)
      throw new Error('Property "source" is required in options')

    const onload = options.onload
    // Don't set as instance property
    delete options.onload

    // Set a default duration so that the super constructor doesn't throw an
    // error
    options.duration = options.duration || 0

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
    super.attach(movie)

    subscribe(movie, Movie.Event.SEEK, () => {
      if (this.currentTime < 0 || this.currentTime >= this.duration)
        return

      this.source.currentTime = this.currentTime + this.sourceStartTime
    })

    // TODO: on unattach?
    subscribe(movie, Movie.Event.AUDIO_DESTINATION_UPDATE, event => {
      // Connect to new destination if immediately connected to the existing
      // destination.
      if (this._connectedToDestination) {
        this.audioNode.disconnect(movie.actx.destination)
        this.audioNode.connect(event.destination)
      }
    })

    // connect to audiocontext
    this._audioNode = this.audioNode || movie.actx.createMediaElementSource(this.source)

    // Spy on connect and disconnect to remember if it connected to
    // actx.destination (for Movie#record).
    const oldConnect = this._audioNode.connect.bind(this.audioNode)
    this._audioNode.connect = <T extends AudioDestinationNode>(destination: T, outputIndex?: number, inputIndex?: number): AudioNode => {
      this._connectedToDestination = destination === movie.actx.destination
      return oldConnect(destination, outputIndex, inputIndex)
    }
    const oldDisconnect = this._audioNode.disconnect.bind(this.audioNode)
    this._audioNode.disconnect = <T extends AudioDestinationNode>(destination?: T | number, output?: number, input?: number): AudioNode => {
      if (this._connectedToDestination &&
      destination === movie.actx.destination)
        this._connectedToDestination = false

      return oldDisconnect(destination, output, input)
    }

    // Connect to actx.destination by default (can be rewired by user)
    this.audioNode.connect(movie.actx.destination)
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

  get ready (): boolean {
    // Typescript doesn't support `super.ready` when targeting es5
    const superProto = Object.getPrototypeOf(AudioSource.prototype)
    const superReady = Object.getOwnPropertyDescriptor(superProto, 'ready').get.call(this)
    return superReady && this.source.readyState >= 2
  }

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): AudioSourceOptions {
    return {
      ...super.getDefaultOptions(),
      source: undefined, // required
      sourceStartTime: 0,
      duration: undefined, // important to include undefined keys, for applyOptions
      muted: false,
      volume: 1,
      playbackRate: 1
    }
  }
}

export { AudioSource, AudioSourceOptions }
