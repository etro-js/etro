import { AudioSourceOptions } from './audio-source';
declare type AudioOptions = AudioSourceOptions;
declare const Audio_base: new (...args: unknown[]) => import("./audio-source").AudioSource;
/**
 * @extends module:layer~Media
 */
declare class Audio extends Audio_base {
    /**
     * Creates an audio layer
     *
     * @param options
     */
    constructor(options: AudioOptions);
    getDefaultOptions(): AudioOptions;
}
export { Audio, AudioOptions };
