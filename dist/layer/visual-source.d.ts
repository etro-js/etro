import { Property } from '../util';
import { Base, BaseOptions } from './base';
import { Visual, VisualOptions } from './visual';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface VisualSource extends Base {
    readonly source: HTMLImageElement | HTMLVideoElement;
}
interface VisualSourceOptions extends VisualOptions {
    source: HTMLImageElement | HTMLVideoElement;
    sourceX?: Property<number>;
    sourceY?: Property<number>;
    sourceWidth?: Property<number>;
    sourceHeight?: Property<number>;
    destX?: Property<number>;
    destY?: Property<number>;
    destWidth?: Property<number>;
    destHeight?: Property<number>;
}
/**
 * Image or video
 * @mixin VisualSourceMixin
 */
declare function VisualSourceMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Visual>): Constructor<VisualSource>;
export { VisualSource, VisualSourceOptions, VisualSourceMixin };
