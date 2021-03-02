import { Base, BaseOptions } from './base';
import { Visual, VisualOptions } from './visual';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface VisualSource extends Base {
    readonly source: HTMLImageElement | HTMLVideoElement;
}
interface VisualSourceOptions extends VisualOptions {
    source: HTMLImageElement | HTMLVideoElement;
    sourceX?: number;
    sourceY?: number;
    sourceWidth?: number;
    sourceHeight?: number;
    destX?: number;
    destY?: number;
    destWidth?: number;
    destHeight?: number;
}
/**
 * Image or video
 * @mixin VisualSourceMixin
 */
declare function VisualSourceMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Visual>): Constructor<VisualSource>;
export { VisualSource, VisualSourceOptions, VisualSourceMixin };
