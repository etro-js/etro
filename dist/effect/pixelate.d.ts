import { Visual } from '../layer';
import Movie from '../movie';
import { Dynamic } from '../util';
import { Shader } from './shader';
/**
 * Breaks the target up into squares of `pixelSize` by `pixelSize`
 */
declare class Pixelate extends Shader {
    pixelSize: Dynamic<number>;
    /**
     * @param pixelSize
     */
    constructor(pixelSize?: Dynamic<number>);
    apply(target: Movie | Visual, reltime: number): void;
}
export default Pixelate;
