import { Base } from './base'
import { Visual as VisualLayer } from '../layer'
import { Movie } from '../movie'
import { Color, Dynamic, KeyFrame, val } from '../util'

export interface FadeInOptions {
  duration: number
  color: Color
}

export class FadeIn extends Base {
  color: Dynamic<Color>
  readonly duration: number

  private _cacheCtx: CanvasRenderingContext2D
  private _effectOpacity: Dynamic<number>

  constructor (options: FadeInOptions) {
    super()

    this.duration = options.duration
    this.color = options.color
    this._cacheCtx = document.createElement('canvas')
      .getContext('2d')
    this._effectOpacity = new KeyFrame<number>([0, 0], [options.duration, 1])
  }

  apply (target: VisualLayer | Movie): void {
    console.log(target.currentTime)
    // Only relevant during the beginning of the target
    if (target.currentTime > this.duration)
      return

    this._cacheCtx.canvas.width = target.canvas.width
    this._cacheCtx.canvas.height = target.canvas.height
    this._cacheCtx
      .drawImage(target.canvas, 0, 0, target.canvas.width, target.canvas.height)

    target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height)
    const color = val(this, 'color', this.currentTime)
    if (color) {
      target.cctx.fillStyle = val(this, 'color', this.currentTime)
      target.cctx.fillRect(0, 0, target.canvas.width, target.canvas.height)
    }
    target.cctx.globalAlpha = val(this, '_effectOpacity', this.currentTime)
    console.log(target.cctx.globalAlpha, target.cctx.globalCompositeOperation)
    target.cctx.drawImage(this._cacheCtx.canvas, 0, 0)
  }
}
