import { Color } from '../util';
import { Shader } from './shader';
/**
 * Reduces alpha for pixels which are close to a specified target color
 */
declare class ChromaKey extends Shader {
    target: Color;
    threshold: number;
    interpolate: boolean;
    /**
     * @param [target={r: 0, g: 0, b: 0}] - the color to
     * remove
     * @param [threshold=0] - how much error is allowed
     * @param [interpolate=false] - <code>true</code> to interpolate
     * the alpha channel, or <code>false</code> value for no smoothing (i.e. an
     * alpha of either 0 or 255)
     * @param [smoothingSharpness=0] - a modifier to lessen the
     * smoothing range, if applicable
     */
    constructor(target?: {
        r: number;
        g: number;
        b: number;
        a: number;
    }, threshold?: number, interpolate?: boolean);
}
export default ChromaKey;
