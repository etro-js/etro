import { Movie } from '../movie';
import { Visual } from './visual';
import { Visual as VisualLayer } from '../layer';
export interface StackOptions {
    effects: Visual[];
}
/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
export declare class Stack extends Visual {
    readonly effects: Visual[];
    private _effectsBack;
    constructor(options: StackOptions);
    attach(movie: Movie): void;
    detach(): void;
    apply(target: Movie | VisualLayer, reltime: number): void;
    /**
     * Convenience method for chaining
     * @param effect - the effect to append
     */
    addEffect(effect: Visual): Stack;
}
