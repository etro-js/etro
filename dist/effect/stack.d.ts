import Movie from '../movie';
import { Base } from './base';
import { Visual } from '../layer';
export interface StackOptions {
    effects: Base[];
}
/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
export declare class Stack extends Base {
    readonly effects: Base[];
    private _effectsBack;
    constructor(options: StackOptions);
    attach(movie: Movie): void;
    detach(): void;
    apply(target: Movie | Visual, reltime: number): void;
    /**
     * Convenience method for chaining
     * @param effect - the effect to append
     */
    addEffect(effect: Base): Stack;
}
