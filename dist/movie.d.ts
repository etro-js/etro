/**
 * @module movie
 */
import { Dynamic, Color } from './util';
import { Base as BaseLayer } from './layer/index';
import { Base as BaseEffect } from './effect/index';
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
    interface HTMLCanvasElement {
        captureStream(frameRate?: number): MediaStream;
    }
}
export declare class MovieOptions {
    /** The html canvas element to use for playback */
    canvas: HTMLCanvasElement;
    /** The audio context to use for playback, defaults to a new audio context */
    actx?: AudioContext;
    /** @deprecated Use <code>actx</code> instead */
    audioContext?: AudioContext;
    /** The background color of the movie as a cSS string */
    background?: Dynamic<Color>;
    repeat?: boolean;
    /**
     * Call `refresh` when the user changes a property on the movie or any of its layers or effects
     *
     * @deprecated Auto-refresh will be removed in the future. If you want to
     * refresh the canvas, call `refresh`. See
     * {@link https://github.com/etro-js/etro/issues/130}
     */
    autoRefresh?: boolean;
}
/**
 * The movie contains everything included in the render.
 *
 * Implements a pub/sub system.
 */
export declare class Movie {
    type: string;
    /**
     * @deprecated Auto-refresh will be removed in the future. If you want to
     * refresh the canvas, call `refresh`. See
     * {@link https://github.com/etro-js/etro/issues/130}
     */
    publicExcludes: string[];
    propertyFilters: Record<string, <T>(value: T) => T>;
    repeat: boolean;
    /**
     * Call `refresh` when the user changes a property on the movie or any of its
     * layers or effects
     *
     * @deprecated Auto-refresh will be removed in the future. If you want to
     * refresh the canvas, call `refresh`. See
     * {@link https://github.com/etro-js/etro/issues/130}
     */
    autoRefresh: boolean;
    /** The background color of the movie as a cSS string */
    background: Dynamic<Color>;
    /** The audio context to which audio output is sent during playback */
    readonly actx: AudioContext;
    readonly effects: BaseEffect[];
    readonly layers: BaseLayer[];
    private _canvas;
    private _cctx;
    private _effectsBack;
    private _layersBack;
    private _currentTime;
    private _paused;
    private _ended;
    private _renderingFrame;
    private _recordEndTime;
    private _mediaRecorder;
    private _lastPlayed;
    private _lastPlayedOffset;
    /**
     * Creates a new movie.
     */
    constructor(options: MovieOptions);
    /**
     * Plays the movie
     * @return fulfilled when the movie is done playing, never fails
     */
    play(): Promise<void>;
    /**
     * Plays the movie in the background and records it
     *
     * @param options
     * @param [options.frameRate] - Video frame rate
     * @param [options.video=true] - whether to include video in recording
     * @param [options.audio=true] - whether to include audio in recording
     * @param [options.mediaRecorderOptions=undefined] - Options to pass to the
     * `MediaRecorder` constructor
     * @param [options.type='video/webm'] - MIME type for exported video
     * @return resolves when done recording, rejects when media recorder errors
     */
    record(options: {
        frameRate: number;
        duration?: number;
        type?: string;
        video?: boolean;
        audio?: boolean;
        mediaRecorderOptions?: Record<string, unknown>;
    }): Promise<Blob>;
    /**
     * Stops the movie without reseting the playback position
     * @return The movie
     */
    pause(): Movie;
    /**
     * Stops playback and resets the playback position
     * @return The movie
     */
    stop(): Movie;
    /**
     * @param [timestamp=performance.now()]
     * @param [done=undefined] - Called when done playing or when the current
     * frame is loaded
     */
    private _render;
    private _updateCurrentTime;
    private _renderBackground;
    /**
     * @param [timestamp=performance.now()]
     */
    private _renderLayers;
    private _applyEffects;
    /**
     * Refreshes the screen
     *
     * Only use this if auto-refresh is disabled
     *
     * @return - Promise that resolves when the frame is loaded
     */
    refresh(): Promise<null>;
    /**
     * Convienence method
     */
    private _publishToLayers;
    /**
     * `true` if the movie is playing, recording or refreshing
     */
    get rendering(): boolean;
    /**
     * `true` if the movie is refreshing the current frame
     */
    get renderingFrame(): boolean;
    /**
     * `true` if the movie is recording
     */
    get recording(): boolean;
    /**
     * The duration of the movie in seconds
     *
     * Calculated from the end time of the last layer
     */
    get duration(): number;
    /**
     * Convienence method for `layers.push()`
     * @param layer
     * @return the movie
     */
    addLayer(layer: BaseLayer): Movie;
    /**
     * Convienence method for `effects.push()`
     * @param effect
     * @return the movie
     */
    addEffect(effect: BaseEffect): Movie;
    /**
     * `true` if the movie is paused
     */
    get paused(): boolean;
    /**
     * `true` if the playback position is at the end of the movie
     */
    get ended(): boolean;
    /**
     * The current playback position in seconds
     */
    get currentTime(): number;
    /**
      * Sets the current playback position in seconds and publishes a
      * `movie.seek` event.
      *
      * @param time - The new playback position
     */
    set currentTime(time: number);
    /**
     * Sets the current playback position.
     *
     * @param time - The new time in seconds
     * @param [refresh=true] - Render a single frame?
     * @return Promise that resolves when the current frame is rendered if
     * `refresh` is true; otherwise resolves immediately.
     *
     */
    setCurrentTime(time: number, refresh?: boolean): Promise<void>;
    /**
     * `true` if the movie is ready for playback
     */
    get ready(): boolean;
    /**
     * The HTML canvas element used for rendering
     */
    get canvas(): HTMLCanvasElement;
    /**
     * The canvas context used for rendering
     */
    get cctx(): CanvasRenderingContext2D;
    /**
     * The width of the output canvas
     */
    get width(): number;
    set width(width: number);
    /**
     * The height of the output canvas
     */
    get height(): number;
    set height(height: number);
    /**
     * @return The movie
     */
    get movie(): Movie;
    /**
     * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
     */
    getDefaultOptions(): MovieOptions;
}
