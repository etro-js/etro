import { Base, BaseOptions } from './base';
declare type Constructor<T> = new (...args: unknown[]) => T;
export interface BaseAudioOptions extends BaseOptions {
    audioNode?: AudioNode;
}
export interface BaseAudio extends Base {
    audioNode: AudioNode;
}
export declare function BaseAudioMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Base>): Constructor<BaseAudio>;
export {};
