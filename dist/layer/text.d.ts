import { Property } from '../util';
import { Visual, VisualOptions } from './visual';
interface TextOptions extends VisualOptions {
    text: Property<string>;
    font?: Property<string>;
    color?: Property<string>;
    /** The text's horizontal offset from the layer */
    textX?: Property<number>;
    /** The text's vertical offset from the layer */
    textY?: Property<number>;
    maxWidth?: Property<number>;
    /**
     * @desc The horizontal alignment
     * @see [`CanvasRenderingContext2D#textAlign<`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign)
     */
    textAlign?: Property<string>;
    /**
     * @desc The vertical alignment
     * @see [`CanvasRenderingContext2D#textBaseline`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textBaseline?: Property<string>;
    /**
     * @see [`CanvasRenderingContext2D#direction`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textDirection?: Property<string>;
}
declare class Text extends Visual {
    text: Property<string>;
    font: Property<string>;
    color: Property<string>;
    /** The text's horizontal offset from the layer */
    textX: Property<number>;
    /** The text's vertical offset from the layer */
    textY: Property<number>;
    maxWidth: Property<number>;
    /**
     * @desc The horizontal alignment
     * @see [`CanvasRenderingContext2D#textAlign<`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign)
     */
    textAlign: Property<string>;
    /**
     * @desc The vertical alignment
     * @see [`CanvasRenderingContext2D#textBaseline`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textBaseline: Property<string>;
    /**
     * @see [`CanvasRenderingContext2D#direction`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline)
     */
    textDirection: Property<string>;
    private _prevText;
    private _prevFont;
    private _prevMaxWidth;
    /**
     * Creates a new text layer
     */
    constructor(options: TextOptions);
    doRender(): void;
    getDefaultOptions(): TextOptions;
}
export { Text, TextOptions };
