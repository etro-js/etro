import { Dynamic } from '../util';
import { Shader } from './shader';
export interface ChannelsOptions {
    factors?: Dynamic<{
        r?: number;
        g?: number;
        b?: number;
    }>;
}
/**
 * Multiplies each channel by a different factor
 */
export declare class Channels extends Shader {
    factors: Dynamic<{
        r?: number;
        b?: number;
        g?: number;
    }>;
    /**
     * @param factors - channel factors, each defaulting to 1
     */
    constructor(options?: ChannelsOptions);
}
