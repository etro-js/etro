import { Visual } from '../layer';
import { Movie } from '../movie';
import { Dynamic } from '../util';
import { Shader } from './shader';
export interface PixelateOptions {
    pixelSize?: Dynamic<number>;
}
/**
 * Breaks the target up into squares of `pixelSize` by `pixelSize`
 */
export declare class Pixelate extends Shader {
    pixelSize: Dynamic<number>;
    /**
     * @param pixelSize
     */
    constructor(options?: PixelateOptions);
    apply(target: Movie | Visual, reltime: number): void;
}
