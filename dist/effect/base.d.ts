import { Movie } from '../movie';
import { Base as BaseLayer } from '../layer/index';
import BaseObject from '../object';
/**
 * Modifies the visual contents of a layer.
 */
export declare class Base implements BaseObject {
    type: string;
    publicExcludes: string[];
    propertyFilters: Record<string, <T>(value: T) => T>;
    enabled: boolean;
    private _target;
    /**
     * The number of times this effect has been attached to a target minus the
     * number of times it's been detached. (Used for the target's array proxy with
     * `unshift`)
     */
    private _occurrenceCount;
    constructor();
    /**
     * Attaches this effect to `target` if not already attached.
     * @ignore
     */
    tryAttach(target: Movie | BaseLayer): void;
    attach(movie: Movie | BaseLayer): void;
    /**
     * Dettaches this effect from its target if the number of times `tryDetach`
     * has been called (including this call) equals the number of times
     * `tryAttach` has been called.
     *
     * @ignore
     */
    tryDetach(): void;
    detach(): void;
    /**
     * Apply this effect to a target at the given time
     *
     * @param target
     * @param reltime - the movie's current time relative to the layer
     * (will soon be replaced with an instance getter)
     * @abstract
     */
    apply(target: Movie | BaseLayer, reltime: number): void;
    /**
     * The current time of the target
     */
    get currentTime(): number;
    get parent(): Movie | BaseLayer;
    get movie(): Movie;
    getDefaultOptions(): Record<string, unknown>;
}
