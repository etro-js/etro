import { Dynamic } from '../util';
import { BaseAudio, BaseAudioOptions } from './base-audio';
import { IScheduledAudio, ScheduledAudioOptions } from './scheduled-audio';
declare type Constructor<T> = new (...args: unknown[]) => T;
export interface IOscillator extends IScheduledAudio {
    frequency: Dynamic<number>;
    detune: Dynamic<number>;
    waveformType: Dynamic<string>;
}
export interface OscillatorOptions extends Omit<ScheduledAudioOptions, 'audioNode'> {
    frequency: Dynamic<number>;
    detune: Dynamic<number>;
    waveformType: Dynamic<string>;
}
export declare function OscillatorMixin<OptionsSuperclass extends BaseAudioOptions>(superclass: Constructor<BaseAudio>): Constructor<IOscillator>;
declare const Oscillator_base: Constructor<IOscillator>;
/**
 The layer for `AudioScheduledSourceNode`s
 */
export declare class Oscillator extends Oscillator_base {
    frequency: Dynamic<number>;
    detune: Dynamic<number>;
    waveformType: Dynamic<string>;
}
export {};
