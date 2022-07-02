import { VisualSourceOptions } from './visual-source';
declare type ImageOptions = VisualSourceOptions;
declare const Image_base: new (...args: unknown[]) => import("./visual-source").VisualSource;
declare class Image extends Image_base {
}
export { Image, ImageOptions };
