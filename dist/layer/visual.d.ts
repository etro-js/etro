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
     * The context of {@link Visual#canvas}
     */
    readonly cctx: CanvasRenderingContext2D;
    readonly effects: BaseEffect[];
    private _effectsBack;
    /**
     * Creates a visual layer
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
