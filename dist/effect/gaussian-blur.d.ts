import { Stack } from './stack';
import { Shader } from './shader';
import { Movie } from '../movie';
import { Visual } from '../layer';
export interface GaussianBlurOptions {
    radius: number;
}
/**
 * Applies a Gaussian blur
 */
export declare class GaussianBlur extends Stack {
    constructor(options: GaussianBlurOptions);
}
/**
 * Shared class for both horizontal and vertical gaussian blur classes.
 */
declare class GaussianBlurComponent extends Shader {
    radius: number;
    shape: HTMLCanvasElement;
    private _radiusCache;
    /**
     * @param src - fragment source code (specific to which component -
     * horizontal or vertical)
     * @param radius - only integers are currently supported
     */
    constructor(options: {
        fragmentSource: string;
        radius: number;
    });
    apply(target: Movie | Visual, reltime: number): void;
    /**
     * Render Gaussian kernel to a canvas for use in shader.
     * @param kernel
     * @private
     *
     * @return
     */
    private static _render1DKernel;
    private static _gen1DKernel;
    private static _genPascalRow;
}
/**
 * Horizontal component of gaussian blur
 */
export declare class GaussianBlurHorizontal extends GaussianBlurComponent {
    /**
     * @param radius
     */
    constructor(options: GaussianBlurOptions);
}
/**
 * Vertical component of gaussian blur
 */
export declare class GaussianBlurVertical extends GaussianBlurComponent {
    /**
     * @param radius
     */
    constructor(options: GaussianBlurOptions);
}
export {};
