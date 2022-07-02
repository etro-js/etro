import { Base, BaseOptions } from './base';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface AudioSource extends Base {
    readonly source: HTMLMediaElement;
    readonly audioNode: AudioNode;
    playbackRate: number;
    /** The audio source node for the media */
    sourceStartTime: number;
}
interface AudioSourceOptions extends BaseOptions {
    source: HTMLMediaElement;
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
