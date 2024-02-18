import { Visual as VisualLayer } from '../layer/index'
import { Movie } from '../movie'
import { val, Dynamic } from '../util'
import { Visual } from './visual'

export interface TransformOptions {
  matrix: Dynamic<Transform.Matrix> // eslint-disable-line no-use-before-define
}

/**
 * Transforms a layer or movie using a transformation matrix. Use {@link
 * Transform.Matrix} to either A) calculate those values based on a series of
 * translations, scalings and rotations) or B) input the matrix values
 * directly, using the optional argument in the constructor.
 */
class Transform extends Visual {
  /** Matrix that determines how to transform the target */
  matrix: Dynamic<Transform.Matrix> // eslint-disable-line no-use-before-define

  private _tmpMatrix: Transform.Matrix // eslint-disable-line no-use-before-define
  private _tmpCanvas: HTMLCanvasElement
  private _tmpCtx: CanvasRenderingContext2D

  /**
   * @param matrix - matrix that determines how to transform the target
   */
  constructor (options: TransformOptions) {
    super()
    /**
     * How to transform the target
     */
    this.matrix = options.matrix
    this._tmpMatrix = new Transform.Matrix()
    this._tmpCanvas = document.createElement('canvas')
    this._tmpCtx = this._tmpCanvas.getContext('2d')
  }

  apply (target: Movie | VisualLayer, reltime: number): void {
    if (target.canvas.width !== this._tmpCanvas.width) {
      this._tmpCanvas.width = target.canvas.width
    }

    if (target.canvas.height !== this._tmpCanvas.height) {
      this._tmpCanvas.height = target.canvas.height
    }

    // Use data, since that's the underlying storage
    this._tmpMatrix.data = val(this, 'matrix', reltime).data

    this._tmpCtx.setTransform(
      this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c,
      this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f
    )
    this._tmpCtx.drawImage(target.canvas, 0, 0)
    // Assume it was identity for now
    this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0)
    target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height)
    target.cctx.drawImage(this._tmpCanvas, 0, 0)
  }
}

namespace Transform { // eslint-disable-line @typescript-eslint/no-namespace

  /**
   * @class
   * A 3x3 matrix for storing 2d transformations
   */
  export class Matrix {
    /**
     * The identity matrix
     */
    static IDENTITY = new Matrix()
    private static _TMP_MATRIX = new Matrix()

    data: number[]

    constructor (data?: number[]) {
      this.data = data || [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ]
    }

    identity (): Matrix {
      for (let i = 0; i < this.data.length; i++) {
        this.data[i] = Matrix.IDENTITY.data[i]
      }

      return this
    }

    /**
     * @param x
     * @param y
     * @param [val]
     */
    cell (x: number, y: number, val?: number): number {
      if (val !== undefined) {
        this.data[3 * y + x] = val
      }

      return this.data[3 * y + x]
    }

    /* For canvas context setTransform */
    get a (): number {
      return this.data[0]
    }

    get b (): number {
      return this.data[3]
    }

    get c (): number {
      return this.data[1]
    }

    get d (): number {
      return this.data[4]
    }

    get e (): number {
      return this.data[2]
    }

    get f (): number {
      return this.data[5]
    }

    /**
     * Combines <code>this</code> with another matrix <code>other</code>
     * @param other
     */
    multiply (other: Matrix): Matrix {
      // copy to temporary matrix to avoid modifying `this` while reading from it
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          let sum = 0
          for (let i = 0; i < 3; i++) {
            sum += this.cell(x, i) * other.cell(i, y)
          }

          Matrix._TMP_MATRIX.cell(x, y, sum)
        }
      }

      // copy data from TMP_MATRIX to this
      for (let i = 0; i < Matrix._TMP_MATRIX.data.length; i++) {
        this.data[i] = Matrix._TMP_MATRIX.data[i]
      }

      return this
    }

    /**
     * @param x
     * @param y
     */
    translate (x: number, y: number): Matrix {
      this.multiply(new Matrix([
        1, 0, x,
        0, 1, y,
        0, 0, 1
      ]))

      return this
    }

    /**
     * @param x
     * @param y
     */
    scale (x: number, y: number): Matrix {
      this.multiply(new Matrix([
        x, 0, 0,
        0, y, 0,
        0, 0, 1
      ]))

      return this
    }

    /**
     * @param a - the angle or rotation in radians
     */
    rotate (a: number): Matrix {
      const c = Math.cos(a); const s = Math.sin(a)
      this.multiply(new Matrix([
        c, s, 0,
        -s, c, 0,
        0, 0, 1
      ]))

      return this
    }
  }
}

export { Transform }
