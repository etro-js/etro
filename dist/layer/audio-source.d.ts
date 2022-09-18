import { Base, BaseOptions } from './base';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface AudioSource extends Base {
    /** HTML media element (an audio or video element) */
    readonly source: HTMLMediaElement;
    /** Audio source node for the media */
    readonly audioNode: AudioNode;
    playbackRate: number;
    /** Seconds to skip ahead by */
    sourceStartTime: number;
}
interface AudioSourceOptions extends BaseOptions {
    /** HTML media element (an audio or video element) */
    source: HTMLMediaElement;
    /** Seconds to skip ahead by */
    sourceStartTime?: number;
    muted?: boolean;
    volume?: number;
    playbackRate: number;
    onload?: (source: HTMLMediaElement, options: AudioSourceOptions) => void;
}
/**
 * A layer that gets its audio from an HTMLMediaElement
 * @mixin AudioSourceMixin
 */
declare function AudioSourceMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Base>): Constructor<AudioSource>;
export { AudioSource, AudioSourceOptions, AudioSourceMixin };
