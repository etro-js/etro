import { Visual, VisualOptions } from './visual';
interface TextOptions extends VisualOptions {
    text: string;
    font?: string;
    color?: string;
    textX?: number;
    textY?: number;
    maxWidth?: number;
    textAlign?: string;
    textBaseline?: string;
    textDirection?: string;
}
declare class Text extends Visual {
    text: string;
    font: string;
    color: string;
    textX: number;
    textY: number;
    maxWidth: number;
    textAlign: string;
    textBaseline: string;
    textDirection: string;
    private _prevText;
    private _prevFont;
    private _prevMaxWidth;
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
    constructor(options: TextOptions);
    doRender(): void;
    getDefaultOptions(): TextOptions;
}
export { Text, TextOptions };
