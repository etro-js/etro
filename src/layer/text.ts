import { val, applyOptions } from '../util'
import { Visual, VisualOptions } from './visual'

interface TextOptions extends VisualOptions {
  text: string
  font?: string
  color?: string
  textX?: number
  textY?: number
  maxWidth?: number
  textAlign?: string
  textBaseline?: string
  textDirection?: string
}

class Text extends Visual {
  text: string
  font: string
  color: string
  textX: number
  textY: number
  maxWidth: number
  textAlign: string
  textBaseline: string
  textDirection: string

  private _prevText: string
  private _prevFont: string
  private _prevMaxWidth: number

  /**
   * Creates a new text layer
   *
   * @param {object} options - various optional arguments
   * @param {string} options.text - the text to display
   * @param {string} [options.font="10px sans-serif"]
   * @param {string} [options.color="#fff"]
   * @param {number} [options.textX=0] - the text's horizontal offset relative
   * to the layer
   * @param {number} [options.textY=0] - the text's vertical offset relative to
   * the layer
   * @param {number} [options.maxWidth=null] - the maximum width of a line of
   * text
   * @param {string} [options.textAlign="start"] - horizontal align
   * @param {string} [options.textBaseline="top"] - vertical align
   * @param {string} [options.textDirection="ltr"] - the text direction
   *
   */
  // TODO: add padding options
  // TODO: is textX necessary? it seems inconsistent, because you can't define
  // width/height directly for a text layer
  constructor (options: TextOptions) {
    // Default to no (transparent) background
    super({ background: null, ...options })
    applyOptions(options, this)

    // this._prevText = undefined;
    // // because the canvas context rounds font size, but we need to be more accurate
    // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
    // this._lastFont = undefined;
    // this._prevMaxWidth = undefined;
  }

  doRender (): void {
    super.doRender()
    const text = val(this, 'text', this.currentTime); const font = val(this, 'font', this.currentTime)
    const maxWidth = this.maxWidth ? val(this, 'maxWidth', this.currentTime) : undefined
    // // properties that affect metrics
    // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
    //     this._updateMetrics(text, font, maxWidth);

    this.cctx.font = font
    this.cctx.fillStyle = val(this, 'color', this.currentTime)
    this.cctx.textAlign = val(this, 'textAlign', this.currentTime)
    this.cctx.textBaseline = val(this, 'textBaseline', this.currentTime)
    this.cctx.direction = val(this, 'textDirection', this.currentTime)
    this.cctx.fillText(
      text, val(this, 'textX', this.currentTime), val(this, 'textY', this.currentTime),
      maxWidth
    )

    this._prevText = text
    this._prevFont = font
    this._prevMaxWidth = maxWidth
  }

  // _updateMetrics(text, font, maxWidth) {
  //     // TODO calculate / measure for non-integer font.size values
  //     let metrics = Text._measureText(text, font, maxWidth);
  //     // TODO: allow user-specified/overwritten width/height
  //     this.width = /*this.width || */metrics.width;
  //     this.height = /*this.height || */metrics.height;
  // }

  // TODO: implement setters and getters that update dimensions!

  /* static _measureText(text, font, maxWidth) {
        // TODO: fix too much bottom padding
        const s = document.createElement("span");
        s.textContent = text;
        s.style.font = font;
        s.style.padding = "0";
        if (maxWidth) s.style.maxWidth = maxWidth;
        document.body.appendChild(s);
        const metrics = {width: s.offsetWidth, height: s.offsetHeight};
        document.body.removeChild(s);
        return metrics;
    } */

  getDefaultOptions (): TextOptions {
    return {
      ...Visual.prototype.getDefaultOptions(),
      background: null,
      text: undefined, // required
      /**
       * @name module:layer.Text#font
       * @type string
       * @desc The CSS font to render with
       */
      font: '10px sans-serif',
      /**
       * @name module:layer.Text#font
       * @type string
       * @desc The CSS color to render with
       */
      color: '#fff',
      /**
       * @name module:layer.Text#textX
       * @type number
       * @desc Offset of the text relative to the layer
       */
      textX: 0,
      /**
       * @name module:layer.Text#textY
       * @type number
       * @desc Offset of the text relative to the layer
       */
      textY: 0,
      /**
       * @name module:layer.Text#maxWidth
       * @type number
       */
      maxWidth: null,
      /**
       * @name module:layer.Text#textAlign
       * @type string
       * @desc The horizontal alignment
       * @see [<code>CanvasRenderingContext2D#textAlign</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign}
       */
      textAlign: 'start',
      /**
       * @name module:layer.Text#textAlign
       * @type string
       * @desc the vertical alignment
       * @see [<code>CanvasRenderingContext2D#textBaseline</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
       */
      textBaseline: 'top',
      /**
       * @name module:layer.Text#textDirection
       * @type string
       * @see [<code>CanvasRenderingContext2D#direction</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
       */
      textDirection: 'ltr'
    }
  }
}

export { Text, TextOptions }
