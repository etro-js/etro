import { Property } from '../util';
import { Base, BaseOptions } from './base';
import { Visual, VisualOptions } from './visual';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface VisualSource extends Base {
    readonly source: HTMLImageElement | HTMLVideoElement;
}
interface VisualSourceOptions extends VisualOptions {
    source: HTMLImageElement | HTMLVideoElement;
    /** What part of {@link source} to render */
    sourceX?: Property<number>;
    /** What part of {@link source} to render */
    sourceY?: Property<number>;
    /** What part of {@link source} to render, or undefined for the entire width */
    sourceWidth?: Property<number>;
    /** What part of {@link source} to render, or undefined for the entire height */
    sourceHeight?: Property<number>;
    /** Where to render {@link source} onto the layer */
    destX?: Property<number>;
    /** Where to render {@link source} onto the layer */
    destY?: Property<number>;
    /** Where to render {@link source} onto the layer, or undefined to fill the layer's width */
    destWidth?: Property<number>;
    /** Where to render {@link source} onto the layer, or undefined to fill the layer's height */
    destHeight?: Property<number>;
}
/**
 * A layer that gets its image data from an HTML image or video element
 * @mixin VisualSourceMixin
 */
declare function VisualSourceMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Visual>): Constructor<VisualSource>;
export { VisualSource, VisualSourceOptions, VisualSourceMixin };
