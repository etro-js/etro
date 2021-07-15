import { Dynamic } from '../util';
import { Movie } from '../movie';
import { Audio as AudioLayer } from '../layer';
import { Audio, AudioOptions } from './audio';
export interface VolumeOptions extends AudioOptions {
    volume: Dynamic<number>;
}
export declare class Volume extends Audio {
    volume: Dynamic<number>;
    private volumeNode;
    constructor(options: VolumeOptions);
    attach(target: Movie | AudioLayer): void;
    detach(): void;
    apply(target: Movie | AudioLayer, reltime: number): void;
}
