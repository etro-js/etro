import { Dynamic, Color } from '../util';
import { Base, BaseOptions } from './base';
import { Visual as VisualEffect } from '../effect/visual';
interface VisualOptions extends BaseOptions {
    x?: Dynamic<number>;
    y?: Dynamic<number>;
    width?: Dynamic<number>;
    height?: Dynamic<number>;
    background?: Dynamic<Color>;
    border?: Dynamic<{
        color: Color;
        thickness?: number;
    }>;
    opacity?: Dynamic<number>;
}
/** Any layer that renders to a canvas */
declare class Visual extends Base {
    x: Dynamic<number>;
    y: Dynamic<number>;
    width: Dynamic<number>;
    height: Dynamic<number>;
    background: Dynamic<Color>;
    border: Dynamic<{
        color: Color;
        thickness: number;
    }>;
    opacity: Dynamic<number>;
    /**
     * The layer's rendering canvas
     */
    readonly canvas: HTMLCanvasElement;
    /**
     * The context of {@link Visual#canvas}
     */
    readonly cctx: CanvasRenderingContext2D;
    readonly effects: VisualEffect[];
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
    addEffect(effect: VisualEffect): Visual;
    get ready(): boolean;
    /**
     * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
     */
    getDefaultOptions(): VisualOptions;
}
export { Visual, VisualOptions };
