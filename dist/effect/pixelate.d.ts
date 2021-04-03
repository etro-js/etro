import { Visual } from '../layer';
import Movie from '../movie';
import { Property } from '../util';
import { Shader } from './shader';
/**
 * Breaks the target up into squares of `pixelSize` by `pixelSize`
 */
declare class Pixelate extends Shader {
    pixelSize: Property<number>;
    /**
     * @param pixelSize
     */
    constructor(pixelSize?: Property<number>);
    apply(target: Movie | Visual, reltime: number): void;
}
export default Pixelate;
