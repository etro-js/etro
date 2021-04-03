import { Property } from '../util';
import { Base, BaseOptions } from './base';
import BaseEffect from '../effect/base';
interface VisualOptions extends BaseOptions {
    x?: Property<number>;
    y?: Property<number>;
    width?: Property<number>;
    height?: Property<number>;
    background?: Property<string>;
    border?: Property<{
        color: string;
        thickness?: number;
    }>;
    opacity?: Property<number>;
}
/** Any layer that renders to a canvas */
declare class Visual extends Base {
    x: Property<number>;
    y: Property<number>;
    width: Property<number>;
    height: Property<number>;
    background: Property<string>;
    border: Property<{
        color: string;
        thickness: number;
    }>;
    opacity: Property<number>;
    /**
     * The layer's rendering canvas
     */
    readonly canvas: HTMLCanvasElement;
    /**
     * The context of {@link module:layer.Visual#canvas}
     */
    readonly cctx: CanvasRenderingContext2D;
    readonly effects: BaseEffect[];
    private _effectsBack;
    /**
     * Creates a visual layer
     *
     * @param options - various optional arguments
     * @param [options.width=null] - the width of the entire layer
     * @param [options.height=null] - the height of the entire layer
     * @param [options.x=0] - the offset of the layer relative to the
     * movie
     * @param [options.y=0] - the offset of the layer relative to the
     * movie
     * @param [options.background=null] - the background color of the
     * layer, or <code>null</code>
     *  for a transparent background
     * @param [options.border=null] - the layer's outline, or
     * <code>null</code> for no outline
     * @param [options.border.color] - the outline's color; required for
     * a border
     * @param [options.border.thickness=1] - the outline's weight
     * @param [options.opacity=1] - the layer's opacity; <code>1</cod>
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
     * @param effect
     * @return the layer (for chaining)
     */
    addEffect(effect: BaseEffect): Visual;
    getDefaultOptions(): VisualOptions;
}
export { Visual, VisualOptions };
