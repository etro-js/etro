/**
 * @module util
 */
import VidarObject from './object';
import Movie from './movie';
/**
 * Merges `options` with `defaultOptions`, and then copies the properties with
 * the keys in `defaultOptions` from the merged object to `destObj`.
 *
 * @return
 */
export declare function applyOptions(options: object, destObj: VidarObject): void;
export declare function clearCachedValues(movie: Movie): void;
export declare class KeyFrame<T> {
    value: unknown[][];
    interpolationKeys: string[];
    constructor(...value: T[][]);
    withKeys(keys: string[]): KeyFrame<T>;
    evaluate(time: number): T;
}
/**
 * Calculates the value of keyframe set <code>property</code> at
 * <code>time</code> if <code>property</code> is an array, or returns
 * <code>property</code>, assuming that it's a number.
 *
 * @param property - value or map of time-to-value
 * pairs for keyframes
 * @param element - the object to which the property belongs
 * @param time - time to calculate keyframes for, if necessary
 *
 * Note that only values used in keyframes that numbers or objects (including
 * arrays) are interpolated. All other values are taken sequentially with no
 * interpolation. JavaScript will convert parsed colors, if created correctly,
 * to their string representations when assigned to a CanvasRenderingContext2D
 * property.
 *
 * @typedef {Object} module:util.KeyFrames
 * @property {function} interpolate - the function to interpolate between
 * keyframes, defaults to {@link module:util.linearInterp}
 * @property {string[]} interpolationKeys - keys to interpolate for objects,
 * defaults to all own enumerable properties
 */
export declare function val(element: VidarObject, path: string, time: number): any;
export declare function linearInterp(x1: number | object, x2: number | object, t: number, objectKeys?: string[]): number | object;
export declare function cosineInterp(x1: number | object, x2: number | object, t: number, objectKeys?: string[]): number | object;
/**
 * An RGBA color, for proper interpolation and shader effects
 */
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    /**
     * @param r
     * @param g
     * @param b
     * @param a
     */
    constructor(r: number, g: number, b: number, a?: number);
    /**
     * Converts to a CSS color
     */
    toString(): string;
}
/**
 * Converts a CSS color string to a {@link module:util.Color} object
 * representation.
 * @param str
 * @return the parsed color
 */
export declare function parseColor(str: string): Color;
/**
 * A font, for proper interpolation
 */
export declare class Font {
    size: number;
    sizeUnit: string;
    family: string;
    style: string;
    variant: string;
    weight: string;
    stretch: string;
    lineHeight: string;
    /**
     * @param size
     * @param family
     * @param sizeUnit
     */
    constructor(size: number, sizeUnit: string, family: string, style?: string, variant?: string, weight?: string, stretch?: string, lineHeight?: string);
    /**
     * Converts to CSS font syntax
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
     */
    toString(): string;
}
/**
 * Converts a CSS font string to a {@link module:util.Font} object
 * representation.
 * @param str
 * @return the parsed font
 */
export declare function parseFont(str: string): Font;
/**
 * @param mapper
 * @param canvas
 * @param ctx
 * @param x
 * @param y
 * @param width
 * @param height
 * @param flush
 * @deprecated Use {@link effect.Shader} instead
 */
export declare function mapPixels(mapper: (pixels: Uint8ClampedArray, i: number) => void, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, flush?: boolean): void;
/**
 * <p>Emits "change" event when public properties updated, recursively.
 * <p>Must be called before any watchable properties are set, and only once in
 * the prototype chain.
 *
 * @param target - object to watch
 */
export declare function watchPublic(target: VidarObject): VidarObject;
