/**
 * @module movie
 */
import { Base as BaseLayer } from './layer/index';
import { Base as BaseEffect } from './effect/index';
declare global {
    interface HTMLCanvasElement {
        captureStream(frameRate?: number): MediaStream;
    }
}
declare class MovieOptions {
    canvas: HTMLCanvasElement;
    audioContext?: AudioContext;
    background?: string;
    repeat?: boolean;
    autoRefresh?: boolean;
}
/**
 * Contains all layers and movie information<br> Implements a sub/pub system
 *
 */
export default class Movie {
    type: string;
    publicExcludes: string[];
    propertyFilters: Record<string, <T>(value: T) => T>;
    repeat: boolean;
    autoRefresh: boolean;
    background: string;
    /**
     * The audio context to which audio output is sent
     */
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
    private _mediaRecorder;
    private _lastPlayed;
    private _lastPlayedOffset;
    /**
     * Creates a new Vidar project.
     *
     * @param {object} options
     * @param {HTMLCanvasElement} options.canvas - the canvas to render to
     * @param {BaseAudioContext} [options.audioContext=new AudioContext()] - the
     * audio context to send audio output to
     * @param {string} [options.background="#000"] - the background color of the
     * movie, or <code>null</code> for a transparent background
     * @param {boolean} [options.repeat=false] - whether to loop playbackjs
     * @param {boolean} [options.autoRefresh=true] - whether to call `.refresh()`
     * when created and when active layers are added/removed
     */
    constructor(options: MovieOptions);
    /**
     * Plays the movie
     * @return {Promise} fulfilled when the movie is done playing, never fails
     */
    play(): Promise<void>;
    /**
     * Plays the movie in the background and records it
     *
     * @param {object} options
     * @param {number} framerate
     * @param {boolean} [options.video=true] - whether to include video in recording
     * @param {boolean} [options.audio=true] - whether to include audio in recording
     * @param {object} [options.mediaRecorderOptions=undefined] - options to pass to the <code>MediaRecorder</code>
     * @param {string} [options.type='video/webm'] - MIME type for exported video
     *  constructor
     * @return {Promise} resolves when done recording, rejects when internal media recorder errors
     */
    record(options: {
        framerate: number;
        type?: string;
        video?: boolean;
        audio?: boolean;
        mediaRecorderOptions?: Record<string, unknown>;
    }): Promise<Blob>;
    /**
     * Stops the movie, without reseting the playback position
     * @return {Movie} the movie (for chaining)
     */
    pause(): Movie;
    /**
     * Stops playback and resets the playback position
     * @return {Movie} the movie (for chaining)
     */
    stop(): Movie;
    /**
     * @param {number} [timestamp=performance.now()]
     * @param {function} [done=undefined] - called when done playing or when the current frame is loaded
     * @private
     */
    private _render;
    private _updateCurrentTime;
    private _renderBackground;
    /**
     * @return {boolean} whether or not video frames are loaded
     * @param {number} [timestamp=performance.now()]
     * @private
     */
    private _renderLayers;
    private _applyEffects;
    /**
     * Refreshes the screen (only use this if auto-refresh is disabled)
     * @return {Promise} - resolves when the frame is loaded
     */
    refresh(): Promise<null>;
    /**
     * Convienence method
     * @todo Make private
     */
    private _publishToLayers;
    /**
     * If the movie is playing, recording or refreshing
     * @type boolean
     */
    get rendering(): boolean;
    /**
     * If the movie is refreshing current frame
     * @type boolean
     */
    get renderingFrame(): boolean;
    /**
     * If the movie is recording
     * @type boolean
     */
    get recording(): boolean;
    /**
     * The combined duration of all layers
     * @type number
     */
    get duration(): number;
    /**
     * Convienence method for <code>layers.push()</code>
     * @param {BaseLayer} layer
     * @return {Movie} the movie
     */
    addLayer(layer: BaseLayer): Movie;
    /**
     * Convienence method for <code>effects.push()</code>
     * @param {BaseEffect} effect
     * @return {Movie} the movie
     */
    addEffect(effect: BaseEffect): Movie;
    /**
     * @type boolean
     */
    get paused(): boolean;
    /**
     * If the playback position is at the end of the movie
     * @type boolean
     */
    get ended(): boolean;
    /**
     * The current playback position
     * @type number
     */
    get currentTime(): number;
    set currentTime(time: number);
    /**
     * Sets the current playback position. This is a more powerful version of
     * `set currentTime`.
     *
     * @param {number} time - the new cursor's time value in seconds
     * @param {boolean} [refresh=true] - whether to render a single frame
     * @return {Promise} resolves when the current frame is rendered if
     * <code>refresh</code> is true, otherwise resolves immediately
     *
     */
    setCurrentTime(time: number, refresh?: boolean): Promise<void>;
    /**
     * The rendering canvas
     * @type HTMLCanvasElement
     */
    get canvas(): HTMLCanvasElement;
    /**
     * The rendering canvas's context
     * @type CanvasRenderingContext2D
     */
    get cctx(): CanvasRenderingContext2D;
    /**
     * The width of the rendering canvas
     * @type number
     */
    get width(): number;
    set width(width: number);
    /**
     * The height of the rendering canvas
     * @type number
     */
    get height(): number;
    set height(height: number);
    get movie(): Movie;
    getDefaultOptions(): MovieOptions & {
        _actx: AudioContext;
    };
}
export {};
