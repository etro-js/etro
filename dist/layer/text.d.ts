import { Dynamic, Color } from '../util';
import { Visual, VisualOptions } from './visual';
interface TextOptions extends VisualOptions {
    text: Dynamic<string>;
    font?: Dynamic<string>;
    color?: Dynamic<Color>;
    /** The text's horizontal offset from the layer */
    textX?: Dynamic<number>;
    /** The text's vertical offset from the layer */
    textY?: Dynamic<number>;
    maxWidth?: Dynamic<number>;
    /**
     * @desc The horizontal alignment
     * @see [`CanvasRenderingContext2D#textAlign<`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign)
     */
    textAlign?: Dynamic<string>;
    /**
     * @desc The vertical alignment
     * @see [`CanvasRenderingContext2D#textBaseline`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textBaseline?: Dynamic<string>;
    /**
     * @see [`CanvasRenderingContext2D#direction`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textDirection?: Dynamic<string>;
}
declare class Text extends Visual {
    text: Dynamic<string>;
    font: Dynamic<string>;
    color: Dynamic<Color>;
    /** The text's horizontal offset from the layer */
    textX: Dynamic<number>;
    /** The text's vertical offset from the layer */
    textY: Dynamic<number>;
    maxWidth: Dynamic<number>;
    /**
     * @desc The horizontal alignment
     * @see [`CanvasRenderingContext2D#textAlign<`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign)
     */
    textAlign: Dynamic<string>;
    /**
     * @desc The vertical alignment
     * @see [`CanvasRenderingContext2D#textBaseline`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textBaseline: Dynamic<string>;
    /**
     * @see [`CanvasRenderingContext2D#direction`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textDirection: Dynamic<string>;
    private _prevText;
    private _prevFont;
    private _prevMaxWidth;
    /**
     * Creates a new text layer
     */
    constructor(options: TextOptions);
    doRender(): void;
    /**
     * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
     */
    getDefaultOptions(): TextOptions;
}
export { Text, TextOptions };
