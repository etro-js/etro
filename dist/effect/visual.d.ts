import { Movie } from '../movie';
import { Visual as VisualLayer } from '../layer/index';
import { Base } from './base';
/**
 * Modifies the visual contents of a layer.
 */
export declare class Visual extends Base {
    /**
     * Apply this effect to a target at the given time
     *
     * @param target
     * @param reltime - the movie's current time relative to the layer
     * (will soon be replaced with an instance getter)
     * @abstract
     */
    apply(target: Movie | VisualLayer, reltime: number): void;
}
