import { Dynamic } from '../util';
import { Shader } from './shader';
/**
 * Changes the contrast by multiplying the RGB channels by a constant
 */
declare class Contrast extends Shader {
    contrast: Dynamic<number>;
    /**
     * @param [contrast=1] - the contrast multiplier
     */
    constructor(contrast?: Dynamic<number>);
}
export default Contrast;
