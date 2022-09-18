import EtroObject from '../object';
import { Movie } from '../movie';
interface BaseOptions {
    /** The time in the movie at which this layer starts */
    startTime: number;
    duration: number;
}
/**
 * A layer outputs content for the movie
 */
declare class Base implements EtroObject {
    type: string;
    publicExcludes: string[];
    propertyFilters: Record<string, <T>(value: T) => T>;
    enabled: boolean;
    /**
     * If the attached movie's playback position is in this layer
     */
    active: boolean;
    /**
     * The number of times this layer has been attached to a movie minus the
     * number of times it's been detached. (Used for the movie's array proxy with
     * `unshift`)
     */
    private _occurrenceCount;
    private _startTime;
    private _duration;
    private _movie;
    /**
     * Creates a new empty layer
     *
     * @param options
     * @param options.startTime - when to start the layer on the movie's
     * timeline
     * @param options.duration - how long the layer should last on the
     * movie's timeline
     */
    constructor(options: BaseOptions);
    /**
     * Attaches this layer to `movie` if not already attached.
     * @ignore
     */
    tryAttach(movie: Movie): void;
    attach(movie: Movie): void;
    /**
     * Dettaches this layer from its movie if the number of times `tryDetach` has
     * been called (including this call) equals the number of times `tryAttach`
     * has been called.
     *
     * @ignore
     */
    tryDetach(): void;
    detach(): void;
    /**
     * Called when the layer is activated
     */
    start(): void;
    /**
     * Called when the movie renders and the layer is active
     */
    render(): void;
    /**
    * Called when the layer is deactivated
     */
    stop(): void;
    get parent(): Movie;
    /**
     */
    get startTime(): number;
    set startTime(val: number);
    /**
     * The current time of the movie relative to this layer
     */
    get currentTime(): number;
    /**
     */
    get duration(): number;
    set duration(val: number);
    /** `true` if this layer is ready to be render, `false` otherwise */
    get ready(): boolean;
    get movie(): Movie;
    /**
     * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
     */
    getDefaultOptions(): BaseOptions;
}
export { Base, BaseOptions };
