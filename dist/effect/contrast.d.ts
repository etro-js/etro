import { Property } from '../util';
import { Shader } from './shader';
/**
 * Changes the contrast
 */
declare class Contrast extends Shader {
    contrast: Property<number>;
    /**
     * @param [contrast=1] - the contrast multiplier
     */
    constructor(contrast?: Property<number>);
}
export default Contrast;
