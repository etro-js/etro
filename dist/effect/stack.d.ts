import Movie from '../movie';
import BaseEffect from './base';
import { Visual } from '../layer';
/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
declare class Stack extends BaseEffect {
    readonly effects: BaseEffect[];
    private _effectsBack;
    constructor(effects: BaseEffect[]);
    attach(movie: Movie): void;
    detach(): void;
    apply(target: Movie | Visual, reltime: number): void;
    /**
     * Convenience method for chaining
     * @param {module:effect.Base} effect - the effect to append
     */
    addEffect(effect: BaseEffect): Stack;
}
export default Stack;
