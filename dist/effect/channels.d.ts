import { Shader } from './shader';
/**
 * Multiplies each channel by a different factor
 */
declare class Channels extends Shader {
    factors: {
        r?: number;
        b?: number;
        g?: number;
    };
    /**
     * @param {module:util.Color} factors - channel factors, each defaulting to 1
     */
    constructor(factors?: Partial<{
        r: number;
        g: number;
        b: number;
    }>);
}
export default Channels;
