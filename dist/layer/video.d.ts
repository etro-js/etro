import { VisualSourceOptions } from './visual-source';
import { AudioSourceOptions } from './audio-source';
declare type VideoOptions = VisualSourceOptions & AudioSourceOptions;
/**
 * @extends AudioSource
 * @extends VisualSource
 */
declare const Video: new (...args: unknown[]) => import("./audio-source").AudioSource;
export { Video, VideoOptions };
