import { Base, BaseOptions } from './base';
declare type Constructor<T> = new (...args: unknown[]) => T;
export interface IBaseAudio extends Base {
    audioNode?: AudioNode;
}
export interface BaseAudioOptions extends BaseOptions {
    audioNode?: AudioNode;
}
export declare function BaseAudioMixin<OptionsSuperclass extends BaseOptions>(superclass: Constructor<Base>): Constructor<IBaseAudio>;
declare const BaseAudio_base: Constructor<IBaseAudio>;
export declare class BaseAudio extends BaseAudio_base {
}
export {};
