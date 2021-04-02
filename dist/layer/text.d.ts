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
     * @param options - various optional arguments
     * @param options.text - the text to display
     * @param [options.font="10px sans-serif"]
     * @param [options.color="#fff"]
     * @param [options.textX=0] - the text's horizontal offset relative
     * to the layer
     * @param [options.textY=0] - the text's vertical offset relative to
     * the layer
     * @param [options.maxWidth=null] - the maximum width of a line of
     * text
     * @param [options.textAlign="start"] - horizontal align
     * @param [options.textBaseline="top"] - vertical align
     * @param [options.textDirection="ltr"] - the text direction
     *
     */
    constructor(options: TextOptions);
    doRender(): void;
    getDefaultOptions(): TextOptions;
}
export { Text, TextOptions };
