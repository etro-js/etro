import { Property } from '../util';
import { Shader } from './shader';
/**
 * Changes the brightness
 */
declare class Brightness extends Shader {
    brightness: Property<number>;
    /**
     * @param [brightness=0] - the value to add to each pixel's color
     * channels (between -255 and 255)
     */
    constructor(brightness?: Property<number>);
}
export default Brightness;
