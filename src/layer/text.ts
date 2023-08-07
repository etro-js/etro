import { Dynamic, val, applyOptions, Color, parseColor } from '../util'
import { Visual, VisualOptions } from './visual'

enum TextStrokePosition {
  Inside,
  Center,
  Outside,
}

interface TextOptions extends VisualOptions {
  text: Dynamic<string>
  font?: Dynamic<string>
  color?: Dynamic<Color>
  /** The text's horizontal offset from the layer */
  textX?: Dynamic<number>
  /** The text's vertical offset from the layer */
  textY?: Dynamic<number>
  maxWidth?: Dynamic<number>
  /**
   * @desc The horizontal alignment
   * @see [`CanvasRenderingContext2D#textAlign<`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign)
   */
  textAlign?: Dynamic<string>
  /**
   * @desc The vertical alignment
   * @see [`CanvasRenderingContext2D#textBaseline`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
   */
  textBaseline?: Dynamic<string>
  /**
   * @see [`CanvasRenderingContext2D#direction`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
   */
  textDirection?: Dynamic<string>

  textStroke?: Dynamic<{
    color: Color,
    position?: TextStrokePosition
    thickness?: number
  }>
}

class Text extends Visual {
  text: Dynamic<string>
  font: Dynamic<string>
  color: Dynamic<Color>
  /** The text's horizontal offset from the layer */
  textX: Dynamic<number>
  /** The text's vertical offset from the layer */
  textY: Dynamic<number>
  maxWidth: Dynamic<number>
  /**
   * @desc The horizontal alignment
   * @see [`CanvasRenderingContext2D#textAlign<`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign)
   */
  textAlign: Dynamic<string>
  /**
   * @desc The vertical alignment
   * @see [`CanvasRenderingContext2D#textBaseline`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
   */
  textBaseline: Dynamic<string>
  /**
   * @see [`CanvasRenderingContext2D#direction`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
   */
  textDirection: Dynamic<string>
  textStroke?: Dynamic<{
    color: Color,
    position?: TextStrokePosition
    thickness?: number
  }>

  private _prevText: string
  private _prevFont: string
  private _prevMaxWidth: number

  /**
   * Creates a new text layer
   */
  // TODO: add padding options
  // TODO: is textX necessary? it seems inconsistent, because you can't define
  // width/height directly for a text layer
  constructor (options: TextOptions) {
    if (!options.text) {
      throw new Error('Property "text" is required in TextOptions')
    }

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

    const textStroke = val(this, 'textStroke', this.currentTime)
    if (textStroke) {
      this.cctx.strokeStyle = textStroke.color
      this.cctx.lineWidth = textStroke.thickness ?? 1
      const position = textStroke.position ?? 'outer'
      // Save the globalCompositeOperation, we have to revert it after stroking the text.
      const globalCompositionOperation = this.cctx.globalCompositeOperation
      switch (position) {
        case TextStrokePosition.Inside:
          this.cctx.globalCompositeOperation = 'source-atop'
          this.cctx.lineWidth *= 2
          break
        case TextStrokePosition.Center:
          break
        case TextStrokePosition.Outside:
          this.cctx.globalCompositeOperation = 'destination-over'
          this.cctx.lineWidth *= 2
          break
      }
      this.cctx.strokeText(
        text,
        val(this, 'textX', this.currentTime),
        val(this, 'textY', this.currentTime),
        maxWidth
      )
      this.cctx.globalCompositeOperation = globalCompositionOperation
    }

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

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions (): TextOptions {
    return {
      ...Visual.prototype.getDefaultOptions(),
      background: null,
      text: undefined, // required
      font: '10px sans-serif',
      color: parseColor('#fff'),
      textX: 0,
      textY: 0,
      maxWidth: null,
      textAlign: 'start',
      textBaseline: 'top',
      textDirection: 'ltr',
      textStroke: null
    }
  }
}

export { Text, TextOptions, TextStrokePosition }
