/**
 * @module movie
 */
import { Dynamic } from './util';
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
    background?: Dynamic<string>;
    repeat?: boolean;
    /** Call `refresh` when the user changes a property on the movie or any of its layers or effects */
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
     * @deprecated Auto-refresh will be removed in the future (see issue #130).
     */
    publicExcludes: string[];
    propertyFilters: Record<string, <T>(value: T) => T>;
    repeat: boolean;
    /**
     * Call `refresh` when the user changes a property on the movie or any of its
     * layers or effects
     *
     * @deprecated Auto-refresh will be removed in the future. If you want to
     * refresh the canvas, call `refresh`. See issue #130.
     */
    autoRefresh: boolean;
    /** The background color of the movie as a cSS string */
    background: Dynamic<string>;
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
     * @param frameRate
     * @param [options.video=true] - whether to include video in recording
     * @param [options.audio=true] - whether to include audio in recording
     * @param [options.mediaRecorderOptions=undefined] - options to pass to the <code>MediaRecorder</code>
     * @param [options.type='video/webm'] - MIME type for exported video
     *  constructor
     * @return resolves when done recording, rejects when internal media recorder errors
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
     * Stops the movie, without reseting the playback position
     * @return the movie (for chaining)
     */
    pause(): Movie;
    /**
     * Stops playback and resets the playback position
     * @return the movie (for chaining)
     */
    stop(): Movie;
    /**
     * @param [timestamp=performance.now()]
     * @param [done=undefined] - called when done playing or when the current frame is loaded
     * @private
     */
    private _render;
    private _updateCurrentTime;
    private _renderBackground;
    /**
     * @return whether or not video frames are loaded
     * @param [timestamp=performance.now()]
     * @private
     */
    private _renderLayers;
    private _applyEffects;
    /**
     * Refreshes the screen (only use this if auto-refresh is disabled)
     * @return - resolves when the frame is loaded
     */
    refresh(): Promise<null>;
    /**
     * Convienence method
     */
    private _publishToLayers;
    /**
     * If the movie is playing, recording or refreshing
     */
    get rendering(): boolean;
    /**
     * If the movie is refreshing current frame
     */
    get renderingFrame(): boolean;
    /**
     * If the movie is recording
     */
    get recording(): boolean;
    /**
     * The combined duration of all layers
     */
    get duration(): number;
    /**
     * Convienence method for <code>layers.push()</code>
     * @param layer
     * @return the movie
     */
    addLayer(layer: BaseLayer): Movie;
    /**
     * Convienence method for <code>effects.push()</code>
     * @param effect
     * @return the movie
     */
    addEffect(effect: BaseEffect): Movie;
    /**
     */
    get paused(): boolean;
    /**
     * If the playback position is at the end of the movie
     */
    get ended(): boolean;
    /**
     * The current playback position
     */
    get currentTime(): number;
    set currentTime(time: number);
    /**
     * Sets the current playback position. This is a more powerful version of
     * `set currentTime`.
     *
     * @param time - the new cursor's time value in seconds
     * @param [refresh=true] - whether to render a single frame
     * @return resolves when the current frame is rendered if
     * <code>refresh</code> is true, otherwise resolves immediately
     *
     */
    setCurrentTime(time: number, refresh?: boolean): Promise<void>;
    /**
     * The rendering canvas
     */
    get canvas(): HTMLCanvasElement;
    /**
     * The rendering canvas's context
     */
    get cctx(): CanvasRenderingContext2D;
    /**
     * The width of the rendering canvas
     */
    get width(): number;
    set width(width: number);
    /**
     * The height of the rendering canvas
     */
    get height(): number;
    set height(height: number);
    get movie(): Movie;
    getDefaultOptions(): MovieOptions;
}
