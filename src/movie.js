import {val, PubSub} from "./util.js";

// NOTE: The `options` argument is for optional arguments :]

/**
 * Contains all layers and movie information
 * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
 *
 * TODO: implement event "durationchange", and more
 */
export default class Movie extends PubSub {
    /**
     * Creates a new <code>Movie</code> instance (project)
     *
     * @param {HTMLCanvasElement} canvas - the canvas to display image data on
     * @param {object} [options] - various optional arguments
     * @param {BaseAudioContext} [options.audioContext=new AudioContext()]
     * @param {string} [options.background="#000"] - the background color of the movie,
     *  or <code>null</code> for a transparent background
     * @param {boolean} [options.repeat=false] - whether to loop playback
     */
    constructor(canvas, options={}) {
        super();
        this.canvas = canvas;
        this.cctx = canvas.getContext("2d");
        this.actx = options.audioContext || new AudioContext();
        this.background = options.background || "#000";
        this.repeat = options.repeat || false;
        this.effects = [];
        this._mediaRecorder = null; // for recording
        this.subscribe("ended", () => {
            if (this.recording) {
                this._mediaRecorder.requestData();  // I shouldn't have to call this right? err
                this._mediaRecorder.stop();
            }
        });

        this._layersBack = [];
        let that = this;
        this._layers = new Proxy(this._layersBack, {
            apply: function(target, thisArg, argumentsList) {
                return thisArg[target].apply(this, argumentsList);
            },
            deleteProperty: function(target, property) {
                return true;
            },
            set: function(target, property, value, receiver) {
                target[property] = value;
                if (!isNaN(property)) {  // if property is an number (index)
                    if (value)  // if element is added to array (TODO: confirm)
                        value._publish("attach", {movie: that});
                    //refresh screen when a layer is added or removed (TODO: do it when a layer is *modified*)
                    that.refresh(); // render "one" frame
                }
                return true;
            }
        });
        this._paused = this._ended = false;
        this._currentTime = 0;

        // NOTE: -1 works well in inequalities
        this._lastPlayed = -1;    // the last time `play` was called
        this._lastPlayedOffset = -1; // what was `currentTime` when `play` was called
        // this._updateInterval = 0.1; // time in seconds between each "timeupdate" event
        // this._lastUpdate = -1;

        this.refresh(); // render single frame on init
    }

    /**
     * Starts playback
     */
    play() {
        this._paused = this._ended = false;
        this._lastPlayed = performance.now();
        this._lastPlayedOffset = this.currentTime;
        this._render();
        return this;
    }

    // TODO: *support recording that plays back with audio!*
    // TODO: figure out a way to record faster than playing (i.e. not in real time)
    // TODO: improve recording performance to increase frame rate?
    /**
     * Starts playback with recording
     *
     * @param {number} framerate
     * @param {object} [mediaRecorderOptions={}] - options to pass to the <code>MediaRecorder</code>
     *  constructor
     */
    record(framerate, mediaRecorderOptions={}) {
        if (!this.paused) throw "Cannot record movie while playing or recording";
        return new Promise((resolve, reject) => {
            // https://developers.google.com/web/updates/2016/01/mediarecorder
            this._paused = this._ended = false;
            let canvasCache = this.canvas;
            // record on a temporary canvas context
            this.canvas = document.createElement("canvas");
            this.canvas.width = canvasCache.width;
            this.canvas.height = canvasCache.height;
            this.cctx = this.canvas.getContext("2d");

            let recordedChunks = [];    // frame blobs
            let visualStream = this.canvas.captureStream(framerate),
                audioDestination = this.actx.createMediaStreamDestination(),
                audioStream = audioDestination.stream,
                // combine image + audio
                stream = new MediaStream([...visualStream.getTracks(), ...audioStream.getTracks()]);
            let mediaRecorder = new MediaRecorder(visualStream, mediaRecorderOptions);
            this._publishToLayers("audiodestinationupdate", {movie: this, destination: audioDestination});
            mediaRecorder.ondataavailable = event => {
                // if (this._paused) reject(new Error("Recording was interrupted"));
                if (event.data.size > 0)
                    recordedChunks.push(event.data);
            };
            mediaRecorder.onstop = () => {
                this._ended = true;
                this.canvas = canvasCache;
                this.cctx = this.canvas.getContext("2d");
                this._publishToLayers(
                    "audiodestinationupdate",
                    {movie: this, destination: this.actx.destination}
                );
                this._mediaRecorder = null;
                // construct super-blob
                // this is the exported video as a blob!
                resolve(new Blob(recordedChunks/*, {"type" : "audio/ogg; codecs=opus"}*/));
            };
            mediaRecorder.onerror = reject;

            mediaRecorder.start();
            this._mediaRecorder = mediaRecorder;
            this.play();
        });
    }

    /**
     * Stops playback without reseting the playback position (<code>currentTime</code>)
     */
    pause() {
        this._paused = true;
        // disable all layers
        let event = {movie: this};
        for (let i=0; i<this.layers.length; i++) {
            let layer = this.layers[i];
            layer._publish("stop", event);
            layer._active = false;
        }
        return this;
    }

    /**
     * Stops playback and resets the playback position (<code>currentTime</code>)
     */
    stop() {
        this.pause();
        this.currentTime = 0;   // use setter?
        return this;
    }

    /**
     * @param {boolean} [instant=false] - whether or not to only update image data for current frame and do
     *  nothing else
     * @param {number} [timestamp=performance.now()]
     */
    _render(instant=false, timestamp=performance.now()) {
        if (this.paused && !instant) return;

        this._updateCurrentTime(instant, timestamp);
        // bad for performance? (remember, it's calling Array.reduce)
        let end = this.duration,
            ended = this.currentTime >= end;
        if (ended) {
            this._publish("ended", {movie: this, repeat: this.repeat});
            this._currentTime = 0;  // don't use setter
            this._publish("timeupdate", {movie: this});
            this._lastPlayed = performance.now();
            this._lastPlayedOffset = 0; // this.currentTime
            if (!this.repeat || this.recording) {
                this._ended = true;
                // disable all layers
                let event = {movie: this};
                for (let i=0; i<this.layers.length; i++) {
                    let layer = this.layers[i];
                    layer._publish("stop", event);
                    layer._active = false;
                }
            }
            return;
        }

        // do render
        this._renderBackground(timestamp);
        let instantFullyLoaded = this._renderLayers(instant, timestamp);
        this._applyEffects();

        if (instantFullyLoaded) this._publish("loadeddata", {movie: this});

        // if instant didn't load, repeatedly frame-render until frame is loaded
        // if the expression below is false, don't publish an event, just silently stop render loop
        if (!instant || (instant && !instantFullyLoaded))
            window.requestAnimationFrame(timestamp => { this._render(instant, timestamp); });
    }
    _updateCurrentTime(instant, timestamp) {
        // if we're only instant-rendering (current frame only), it doens't matter if it's paused or not
        if (!instant) {
        // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
            let sinceLastPlayed = (timestamp - this._lastPlayed) / 1000;
            this._currentTime = this._lastPlayedOffset + sinceLastPlayed;   // don't use setter
            this._publish("timeupdate", {movie: this});
            // this._lastUpdate = timestamp;
        // }
        }
    }
    _renderBackground(timestamp) {
        this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.background) {
            this.cctx.fillStyle = val(this.background, this, timestamp);
            this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    /**
     * @return {boolean} whether or not video frames are loaded
     * @param {number} [timestamp=performance.now()]
     */
    _renderLayers(instant, timestamp) {
        let instantFullyLoaded = true;
        for (let i=0; i<this.layers.length; i++) {
            let layer = this.layers[i];
            // Cancel operation if outside layer time interval
            //                                                         > or >= ?
            if (this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
                // outside time interval
                // if only rendering this frame (instant==true), we are not "starting" the layer
                if (layer.active && !instant) {
                    // TODO: make a `deactivate()` method?
                    layer._publish("stop", {movie: this});
                    layer._active = false;
                }
                continue;
            }
            // if only rendering this frame, we are not "starting" the layer
            if (!layer.active && !instant) {
                // TODO: make an `activate()` method?
                layer._publish("start", {movie: this});
                layer._active = true;
            }

            if (layer.media)
                instantFullyLoaded = instantFullyLoaded && layer.media.readyState >= 2;    // frame loaded
            let reltime = this.currentTime - layer.startTime;
            layer._render(reltime);   // pass relative time for convenience

            // if the layer has visual component
            if (layer.canvas) {
                // layer.canvas.width and layer.canvas.height should already be interpolated
                // if the layer has an area (else InvalidStateError from canvas)
                if (layer.canvas.width * layer.canvas.height > 0) {
                    this.cctx.drawImage(layer.canvas,
                        val(layer.x, layer, reltime), val(layer.y, layer, reltime), layer.canvas.width, layer.canvas.height
                    );
                }
            }
        }

        return instantFullyLoaded;
    }
    _applyEffects() {
        for (let i=0; i<this.effects.length; i++) {
            let effect = this.effects[i];
            effect(this, this.currentTime);
        }
    }

    refresh() {
        this._render(true);
    }

    /** Convienence method */
    _publishToLayers(type, event) {
        for (let i=0; i<this.layers.length; i++) {
            this.layers[i]._publish(type, event);
        }
    }

    /** @return <code>true</code> if the video is currently recording and <code>false</code> otherwise */
    get recording() { return !!this._mediaRecorder; }

    get duration() {    // TODO: dirty flag?
        return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0);
    }
    get layers() { return this._layers; }   // (proxy)
    /** Convienence method */
    addLayer(layer) { this.layers.push(layer); return this; }   // convienence method
    get paused() { return this._paused; }   // readonly (from the outside)
    /** Gets the current playback position */
    get currentTime() { return this._currentTime; }
    /** Sets the current playback position */
    set currentTime(time) {
        this._currentTime = time;
        this._publish("seek", {movie: this});
        this.refresh(); // render single frame to match new time
    }

    /** Gets the width of the attached canvas */
    get width() { return this.canvas.width; }
    /** Gets the height of the attached canvas */
    get height() { return this.canvas.height; }
    /** Sets the width of the attached canvas */
    set width(width) { this.canvas.width = width; }
    /** Sets the height of the attached canvas */
    set height(height) { this.canvas.height = height; }
}
