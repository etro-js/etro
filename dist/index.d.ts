/**
 * The entry point
 * @module index
 */
import Movie from './movie';
import * as layers from './layer/index';
import * as effects from './effect/index';
import * as event from './event';
import * as util from './util';
declare const _default: {
    applyOptions(options: object, destObj: import("./object").default): void;
    clearCachedValues(movie: Movie): void;
    val(element: import("./object").default, path: string, time: number): any;
    linearInterp(x1: number | object, x2: number | object, t: number, objectKeys?: string[]): number | object;
    cosineInterp(x1: number | object, x2: number | object, t: number, objectKeys?: string[]): number | object;
    parseColor(str: string): util.Color;
    parseFont(str: string): util.Font;
    mapPixels(mapper: (pixels: Uint8ClampedArray, i: number) => void, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, flush?: boolean): void;
    watchPublic(target: import("./object").default): import("./object").default;
    KeyFrame: typeof util.KeyFrame;
    Color: typeof util.Color;
    Font: typeof util.Font;
    Movie: typeof Movie;
    layer: typeof layers;
    effect: typeof effects;
    event: typeof event;
};
export default _default;
