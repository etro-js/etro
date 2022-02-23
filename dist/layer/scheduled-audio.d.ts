import { BaseAudio, BaseAudioOptions } from './base-audio';
declare type Constructor<T> = new (...args: unknown[]) => T;
export declare type IScheduledAudio = BaseAudio;
export declare type ScheduledAudioOptions = BaseAudioOptions;
export declare function ScheduledAudioMixin<OptionsSuperclass extends BaseAudioOptions>(superclass: Constructor<BaseAudio>): Constructor<IScheduledAudio>;
declare const ScheduledAudio_base: Constructor<BaseAudio>;
/**
 The layer for `AudioScheduledSourceNode`s
 */
export declare class ScheduledAudio extends ScheduledAudio_base {
}
export {};
