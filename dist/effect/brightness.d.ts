import { Dynamic } from '../util';
import { Shader } from './shader';
export interface BrightnessOptions {
    brightness?: Dynamic<number>;
}
/**
 * Changes the brightness
 */
export declare class Brightness extends Shader {
    brightness: Dynamic<number>;
    /**
     * @param [brightness=0] - the value to add to each pixel's color
     * channels (between -255 and 255)
     */
    constructor(options?: BrightnessOptions);
}
