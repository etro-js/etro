import Movie from '../movie';
import { Visual } from '../layer/index';
import BaseObject from '../object';
/**
 * Modifies the visual contents of a layer.
 */
declare class Base implements BaseObject {
    type: string;
    publicExcludes: string[];
    propertyFilters: Record<string, <T>(value: T) => T>;
    enabled: boolean;
    private _target;
    constructor();
    attach(target: Movie | Visual): void;
    detach(): void;
    /**
     * Apply this effect to a target at the given time
     *
     * @param target
     * @param reltime - the movie's current time relative to the layer
     * (will soon be replaced with an instance getter)
     * @abstract
     */
    apply(target: Movie | Visual, reltime: number): void;
    /**
     * The current time of the target
     */
    get currentTime(): number;
    get parent(): Movie | Visual;
    get movie(): Movie;
    getDefaultOptions(): Record<string, unknown>;
}
export default Base;
