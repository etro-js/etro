import { Dynamic, Color } from '../util';
import { Shader } from './shader';
export interface ChromaKeyOptions {
    target?: Dynamic<Color>;
    threshold?: Dynamic<number>;
    interpolate?: Dynamic<boolean>;
}
/**
 * Reduces alpha for pixels which are close to a specified target color
 */
export declare class ChromaKey extends Shader {
    target: Dynamic<Color>;
    threshold: Dynamic<number>;
    interpolate: Dynamic<boolean>;
    /**
     * @param [target={r: 0, g: 0, b: 0, a: 1}] - the color to remove
     * @param [threshold=0] - how much error to allow
     * @param [interpolate=false] - <code>true</code> to interpolate
     * the alpha channel, or <code>false</code> value for no smoothing (i.e. an
     * alpha of either 0 or 255)
     */
    constructor(options?: ChromaKeyOptions);
}
