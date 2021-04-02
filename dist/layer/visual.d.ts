import { Base, BaseOptions } from './base';
import BaseEffect from '../effect/base';
interface VisualOptions extends BaseOptions {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    background?: string;
    border?: {
        color: string;
        thickness?: number;
    };
    opacity?: number;
}
/** Any layer that renders to a canvas */
declare class Visual extends Base {
    x: number;
    y: number;
    width: number;
    height: number;
    background: string;
    border: {
        color: string;
        thickness: number;
        opacity: number;
    };
    /**
     * The layer's rendering canvas
     * @type HTMLCanvasElement
     */
    readonly canvas: HTMLCanvasElement;
    /**
     * The context of {@link module:layer.Visual#canvas}
     * @type CanvasRenderingContext2D
     */
    readonly cctx: CanvasRenderingContext2D;
    readonly effects: BaseEffect[];
    private _effectsBack;
    /**
     * Creates a visual layer
     *
     * @param {object} options - various optional arguments
     * @param {number} [options.width=null] - the width of the entire layer
     * @param {number} [options.height=null] - the height of the entire layer
     * @param {number} [options.x=0] - the offset of the layer relative to the
     * movie
     * @param {number} [options.y=0] - the offset of the layer relative to the
     * movie
     * @param {string} [options.background=null] - the background color of the
     * layer, or <code>null</code>
     *  for a transparent background
     * @param {object} [options.border=null] - the layer's outline, or
     * <code>null</code> for no outline
     * @param {string} [options.border.color] - the outline's color; required for
     * a border
     * @param {string} [options.border.thickness=1] - the outline's weight
     * @param {number} [options.opacity=1] - the layer's opacity; <code>1</cod>
     * for full opacity and <code>0</code> for full transparency
     */
    constructor(options: VisualOptions);
    /**
     * Render visual output
     */
    render(): void;
    beginRender(): void;
    doRender(): void;
    endRender(): void;
    _applyEffects(): void;
    /**
     * Convienence method for <code>effects.push()</code>
     * @param {BaseEffect} effect
     * @return {module:layer.Visual} the layer (for chaining)
     */
    addEffect(effect: BaseEffect): Visual;
    getDefaultOptions(): VisualOptions;
}
export { Visual, VisualOptions };
