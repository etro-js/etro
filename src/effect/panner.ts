import { Dynamic, val } from '../util'
import { Movie } from '../movie'
import { Audio as AudioLayer } from '../layer'
import { Audio, AudioOptions } from './audio'

export interface PannerOptions extends AudioOptions {
  pan: Dynamic<number>
}

export class Panner extends Audio {
  pan: Dynamic<number>
  private pannerNode: StereoPannerNode

  constructor (options: PannerOptions) {
    super()

    this.pan = options.pan
  }

  attach (target: Movie | AudioLayer): void {
    super.attach(target)

    this.pannerNode = this.pannerNode || target.movie.actx.createStereoPanner()
    this.pannerNode.pan.value = val(this, 'pan', this.currentTime)

    this.inputNode.connect(this.pannerNode)
    this.pannerNode.connect(this.outputNode)
  }

  detach (): void {
    super.detach()

    this.inputNode.disconnect(this.pannerNode)
    this.pannerNode.disconnect(this.outputNode)
  }

  apply (target: Movie | AudioLayer, reltime: number): void {
    super.apply(target, reltime)

    this.pannerNode.pan.value = val(this, 'pan', this.currentTime)
  }
}
Panner.prototype.publicExcludes = Audio.prototype.publicExcludes.concat(['pannerNode'])
