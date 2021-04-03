import { Property } from '../util';
import { Shader } from './shader';
/**
 * Changes the contrast by multiplying the RGB channels by a constant
 */
declare class Contrast extends Shader {
    contrast: Property<number>;
    /**
     * @param [contrast=1] - the contrast multiplier
     */
    constructor(contrast?: Property<number>);
}
export default Contrast;
