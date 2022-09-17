import { Dynamic } from '../util';
import { Visual, VisualOptions } from './visual';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface VisualSource extends Visual {
    readonly source: HTMLImageElement | HTMLVideoElement;
    /** What part of {@link source} to render */
    sourceX: Dynamic<number>;
    /** What part of {@link source} to render */
    sourceY: Dynamic<number>;
    /** What part of {@link source} to render, or undefined for the entire width */
    sourceWidth: Dynamic<number>;
    /** What part of {@link source} to render, or undefined for the entire height */
    sourceHeight: Dynamic<number>;
    /** Where to render {@link source} onto the layer */
    destX: Dynamic<number>;
    /** Where to render {@link source} onto the layer */
    destY: Dynamic<number>;
    /** Where to render {@link source} onto the layer, or undefined to fill the layer's width */
    destWidth: Dynamic<number>;
    /** Where to render {@link source} onto the layer, or undefined to fill the layer's height */
    destHeight: Dynamic<number>;
}
interface VisualSourceOptions extends VisualOptions {
    source: HTMLImageElement | HTMLVideoElement;
    /** What part of {@link source} to render */
    sourceX?: Dynamic<number>;
    /** What part of {@link source} to render */
    sourceY?: Dynamic<number>;
    /** What part of {@link source} to render, or undefined for the entire width */
    sourceWidth?: Dynamic<number>;
    /** What part of {@link source} to render, or undefined for the entire height */
    sourceHeight?: Dynamic<number>;
    /** Where to render {@link source} onto the layer */
    destX?: Dynamic<number>;
    /** Where to render {@link source} onto the layer */
    destY?: Dynamic<number>;
    /** Where to render {@link source} onto the layer, or undefined to fill the layer's width */
    destWidth?: Dynamic<number>;
    /** Where to render {@link source} onto the layer, or undefined to fill the layer's height */
    destHeight?: Dynamic<number>;
}
/**
 * A layer that gets its image data from an HTML image or video element
 * @mixin VisualSourceMixin
 */
declare function VisualSourceMixin<OptionsSuperclass extends VisualOptions>(superclass: Constructor<Visual>): Constructor<VisualSource>;
export { VisualSource, VisualSourceOptions, VisualSourceMixin };
