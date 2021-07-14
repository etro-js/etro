import { Dynamic, val } from '../util'
import { Movie } from '../movie'
import { Audio as AudioLayer } from '../layer'
import { Audio, AudioOptions } from './audio'

export interface VolumeOptions extends AudioOptions {
  volume: Dynamic<number>
}

export class Volume extends Audio {
  volume: Dynamic<number>
  private volumeNode: GainNode

  constructor (options: VolumeOptions) {
    super()

    this.volume = options.volume
  }

  attach (target: Movie | AudioLayer): void {
    super.attach(target)

    this.volumeNode = this.volumeNode || target.movie.actx.createGain()
    this.volumeNode.gain.value = val(this, 'volume', this.currentTime)

    this.inputNode.connect(this.volumeNode)
    this.volumeNode.connect(this.outputNode)
  }

  detach (): void {
    super.detach()

    this.inputNode.disconnect(this.volumeNode)
    this.volumeNode.disconnect(this.outputNode)
  }

  apply (target: Movie | AudioLayer, reltime: number): void {
    super.apply(target, reltime)

    this.volumeNode.gain.value = val(this, 'volume', this.currentTime)
  }
}
Volume.prototype.publicExcludes = Audio.prototype.publicExcludes.concat(['volumeNode'])
