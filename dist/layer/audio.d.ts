import { AudioSourceOptions } from './audio-source';
declare type AudioOptions = AudioSourceOptions;
declare const Audio_base: new (...args: unknown[]) => import("./audio-source").AudioSource;
/**
 * Layer for an HTML audio element
 * @extends AudioSource
 */
declare class Audio extends Audio_base {
    /**
     * Creates an audio layer
     */
    constructor(options: AudioOptions);
    /**
     * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
     */
    getDefaultOptions(): AudioOptions;
}
export { Audio, AudioOptions };
