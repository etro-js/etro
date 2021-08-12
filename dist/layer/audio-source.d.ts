import { BaseAudio, BaseAudioOptions } from './base-audio';
declare type Constructor<T> = new (...args: unknown[]) => T;
interface AudioSource extends BaseAudio {
    readonly source: HTMLMediaElement;
    playbackRate: number;
    /** The audio source node for the media */
    sourceStartTime: number;
}
interface AudioSourceOptions extends BaseAudioOptions {
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
declare function AudioSourceMixin<OptionsSuperclass extends BaseAudioOptions>(superclass: Constructor<BaseAudio>): Constructor<AudioSource>;
export { AudioSource, AudioSourceOptions, AudioSourceMixin };
