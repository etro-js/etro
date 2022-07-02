import { Dynamic } from '../util';
import { Shader } from './shader';
export interface ContrastOptions {
    contrast?: Dynamic<number>;
}
/**
 * Changes the contrast by multiplying the RGB channels by a constant
 */
export declare class Contrast extends Shader {
    contrast: Dynamic<number>;
    /**
     * @param [contrast=1] - the contrast multiplier
     */
    constructor(options?: ContrastOptions);
}
