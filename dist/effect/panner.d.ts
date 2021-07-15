import { Dynamic } from '../util';
import { Movie } from '../movie';
import { Audio as AudioLayer } from '../layer';
import { Audio, AudioOptions } from './audio';
export interface PannerOptions extends AudioOptions {
    pan: Dynamic<number>;
}
export declare class Panner extends Audio {
    pan: Dynamic<number>;
    private pannerNode;
    constructor(options: PannerOptions);
    attach(target: Movie | AudioLayer): void;
    detach(): void;
    apply(target: Movie | AudioLayer, reltime: number): void;
}
