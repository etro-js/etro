import { Base, BaseOptions } from './base';
declare type Constructor<T> = new (...args: unknown[]) => T;
export declare type BaseAudioOptions = BaseOptions;
export interface BaseAudio extends Base {
    audioNode: AudioNode;
}
export declare function BaseAudioMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Base>): Constructor<BaseAudio>;
export {};
