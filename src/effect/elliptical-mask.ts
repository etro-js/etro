import { Movie } from '../movie'
import { Dynamic, val } from '../util'
import { Visual } from './visual'
import { Visual as VisualLayer } from '../layer/index'

export class EllipticalMaskOptions {
  x: Dynamic<number>
  y: Dynamic<number>
  radiusX: Dynamic<number>
  radiusY: Dynamic<number>
  rotation?: Dynamic<number>
  startAngle?: Dynamic<number>
  endAngle?: Dynamic<number>
  anticlockwise?: Dynamic<boolean>
}

/**
 * Preserves an ellipse of the layer and clears the rest
 */
// TODO: Parent layer mask effects will make more complex masks easier
export class EllipticalMask extends Visual {
  x: Dynamic<number>
  y: Dynamic<number>
  radiusX: Dynamic<number>
  radiusY: Dynamic<number>
  rotation: Dynamic<number>
  startAngle: Dynamic<number>
  endAngle: Dynamic<number>
  anticlockwise: Dynamic<boolean>

  private _tmpCanvas
  private _tmpCtx

  constructor (options: EllipticalMaskOptions) {
    super()
    this.x = options.x
    this.y = options.y
    this.radiusX = options.radiusX
    this.radiusY = options.radiusY
    this.rotation = options.rotation || 0
    this.startAngle = options.startAngle || 0
    this.endAngle = options.endAngle !== undefined ? options.endAngle : 2 * Math.PI
    this.anticlockwise = options.anticlockwise || false
    // for saving image data before clearing
    this._tmpCanvas = document.createElement('canvas')
    this._tmpCtx = this._tmpCanvas.getContext('2d')
  }

  apply (target: Movie | VisualLayer, reltime: number): void {
    const ctx = target.cctx
    const canvas = target.canvas
    const x = val(this, 'x', reltime)
    const y = val(this, 'y', reltime)
    const radiusX = val(this, 'radiusX', reltime)
    const radiusY = val(this, 'radiusY', reltime)
    const rotation = val(this, 'rotation', reltime)
    const startAngle = val(this, 'startAngle', reltime)
    const endAngle = val(this, 'endAngle', reltime)
    const anticlockwise = val(this, 'anticlockwise', reltime)
    this._tmpCanvas.width = target.canvas.width
    this._tmpCanvas.height = target.canvas.height
    this._tmpCtx.drawImage(canvas, 0, 0)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save() // idk how to preserve clipping state without save/restore
    // create elliptical path and clip
    ctx.beginPath()
    ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise)
    ctx.closePath()
    ctx.clip()
    // render image with clipping state
    ctx.drawImage(this._tmpCanvas, 0, 0)
    ctx.restore()
  }
}
