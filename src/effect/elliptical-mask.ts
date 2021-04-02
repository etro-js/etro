import Movie from '../movie'
import { val } from '../util'
import BaseEffect from './base'
import { Visual } from '../layer/index'

/**
 * Preserves an ellipse of the layer and clears the rest
 */
// TODO: Parent layer mask effects will make more complex masks easier
class EllipticalMask extends BaseEffect {
  x: number
  y: number
  radiusX: number
  radiusY: number
  rotation: number
  startAngle: number
  endAngle: number
  anticlockwise: boolean

  private _tmpCanvas
  private _tmpCtx

  constructor (
    x: number, y: number, radiusX: number, radiusY: number,
    rotation = 0, startAngle = 0, endAngle = 2 * Math.PI, anticlockwise = false
  ) {
    super()
    this.x = x
    this.y = y
    this.radiusX = radiusX
    this.radiusY = radiusY
    this.rotation = rotation
    this.startAngle = startAngle
    this.endAngle = endAngle
    this.anticlockwise = anticlockwise
    // for saving image data before clearing
    this._tmpCanvas = document.createElement('canvas')
    this._tmpCtx = this._tmpCanvas.getContext('2d')
  }

  apply (target: Movie | Visual, reltime: number): void {
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

export default EllipticalMask
