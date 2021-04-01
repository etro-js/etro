import { Visual } from '../layer';
import Movie from '../movie';
import { Shader } from './shader';
/**
 * Makes the target look pixelated
 */
declare class Pixelate extends Shader {
    pixelSize: number;
    /**
     * @param {number} pixelSize
     */
    constructor(pixelSize?: number);
    apply(target: Movie | Visual, reltime: number): void;
}
export default Pixelate;
