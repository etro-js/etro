import { Dynamic } from '../util';
import { Shader } from './shader';
/**
 * Changes the brightness
 */
declare class Brightness extends Shader {
    brightness: Dynamic<number>;
    /**
     * @param [brightness=0] - the value to add to each pixel's color
     * channels (between -255 and 255)
     */
    constructor(brightness?: Dynamic<number>);
}
export default Brightness;
