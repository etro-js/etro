import { Movie } from '../movie';
import { Audio as AudioLayer } from '../layer/index';
import { Base } from './base';
export interface AudioOptions {
}
/**
 * Base audio effect, modifies the audio output of a layer or movie
 */
export declare class Audio extends Base {
    inputNode: AudioNode;
    outputNode: AudioNode;
    attach(target: Movie | AudioLayer): void;
    /**
     * Apply this effect to a target at the given time
     *
     * @param target
     * @param reltime - the movie's current time relative to the layer
     * (will soon be replaced with an instance getter)
     * @abstract
     */
    apply(target: Movie | AudioLayer, reltime: number): void;
}
