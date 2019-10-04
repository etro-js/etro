import {subscribe, _publish} from "./event.js";
import {val, applyOptions, watchPublic} from "./util.js";

// NOTE: The `options` argument is for optional arguments :]
// TODO: make record option to make recording video output to the user while it's recording

/**
 * Contains all layers and movie information
 * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
 *
 * TODO: implement event "durationchange", and more
 * TODO: add width and height options
 */
export default class Movie {
    /**
     * Creates a new <code>Movie</code> instance (project)
     *
     * @param {HTMLCanvasElement} canvas - the canvas to display image data on
     * @param {object} [options] - various optional arguments
     * @param {BaseAudioContext} [options.audioContext=new AudioContext()]
     * @param {string} [options.background="#000"] - the background color of the movijse,
     *  or <code>null</code> for a transparent background
     * @param {boolean} [options.repeat=false] - whether to loop playbackjs
     * @param {boolean} [options.autoRefresh=true] - whether to call `.refresh()` on init and when relevant layers
     *  are added/removed
     */
    constructor(canvas, options={}) {
        // Rename audioContext -> _actx
        if ("audioContext" in options) {
            options._actx = options.audioContext;
        }
        delete options.audioContext;

        const newThis = watchPublic(this);  // proxy that will be returned by constructor
        // Don't send updates when initializing, so use this instead of newThis:
        // output canvas
        this._canvas = canvas;
        // output canvas context
        this._cctx = canvas.getContext("2d");    // TODO: make private?
        applyOptions(options, this);

        // proxy arrays
        const that = newThis;

        this._effectsBack = [];
        this._effects = new Proxy(newThis._effectsBack, {
            apply: function(target, thisArg, argumentsList) {
                return thisArg[target].apply(newThis, argumentsList);
            },
            deleteProperty: function(target, property) {
                // Refresh screen when effect is removed, if the movie isn't playing already.
                const value = target[property];
                _publish(that, "movie.change.effect.remove", {source: value});
                _publish(target[property], "effect.detach", {source: that});
                delete target[property];
                return true;
            },
            set: function(target, property, value) {
                if (!isNaN(property)) {  // if property is an number (index)
                    if (target[property]) {
                        delete target[property];    // call deleteProperty
                    }
                    _publish(value, "effect.attach", {source: that});   // Attach effect to movie (first)
                    // Refresh screen when effect is set, if the movie isn't playing already.
                    _publish(that, "movie.change.effect.add", {source: value});
                }
                target[property] = value;
                return true;
            }
        });

        this._layersBack = [];
        this._layers = new Proxy(newThis._layersBack, {
            apply: function(target, thisArg, argumentsList) {
                return thisArg[target].apply(newThis, argumentsList);
            },
            deleteProperty: function(target, property) {
                const value = target[property];
                const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration;
                if (current) {
                    _publish(that, "movie.change.layer.remove", {source: value});
                }
                delete target[property];
                return true;
            },
            set: function(target, property, value) {
                target[property] = value;
                if (!isNaN(property)) {  // if property is an number (index)
                    _publish(value, "layer.attach", {movie: that});   // Attach layer to movie (first)
                    // Refresh screen when a relevant layer is added or removed
                    const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration;
                    if (current) {
                        _publish(that, "movie.change.layer.add", {source: that});
                    }
                }
                return true;
            }
        });
        this._paused = true;
        this._ended = false;
        // to prevent multiple frame-rendering loops at the same time (see `render`)
        this._renderingFrame = false;   // only applicable when rendering
        this._currentTime = 0;

        this._mediaRecorder = null; // for recording

        // NOTE: -1 works well in inequalities
        this._lastPlayed = -1;    // the last time `play` was called
        this._lastPlayedOffset = -1; // what was `currentTime` when `play` was called
        // newThis._updateInterval = 0.1; // time in seconds between each "timeupdate" event
        // newThis._lastUpdate = -1;

        if (newThis.autoRefresh) {
            newThis.refresh(); // render single frame on init
        }

        // Subscribe to own event "change" (child events propogate up)
        subscribe(newThis, "movie.change", () => {
            if (newThis.autoRefresh && !newThis.rendering) {
                newThis.refresh();
            }
        });

        // Subscribe to own event "ended"
        subscribe(newThis, "movie.ended", () => {
            if (newThis.recording) {
                newThis._mediaRecorder.requestData();  // I shouldn't have to call newThis right? err
                newThis._mediaRecorder.stop();
            }
        });

        return newThis;
    }

    /**
     * Starts playback
     * @return {Promise} fulfilled when done playing, never fails
     */
    play() {
        return new Promise((resolve, reject) => {
            if (!this.paused) {
                throw "Already playing";
            }

            this._paused = this._ended = false;
            this._lastPlayed = performance.now();
            this._lastPlayedOffset = this.currentTime;

            if (!this._renderingFrame) {
                // Not rendering (and not playing), so play
                this._render(undefined, resolve);
            }
            // Stop rendering frame if currently doing so, because playing has higher priority.
            this._renderingFrame = false;   // this will effect the next _render call
        });
    }

    // TEST: *support recording that plays back with audio!*
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
        if (!this.paused) throw "Cannot record movie while already playing or recording";
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
            this._publishToLayers("movie.audiodestinationupdate", {movie: this, destination: audioDestination});
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
                    "movie.audiodestinationupdate",
                    {movie: this, destination: this.actx.destination}
                );
                this._mediaRecorder = null;
                // construct super-blob
                // this is the exported video as a blob!
                resolve(new Blob(recordedChunks, {"type": "video/webm"}/*, {"type" : "audio/ogg; codecs=opus"}*/));
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
            _publish(layer, "layer.stop", event);
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
     // * @param {boolean} [instant=false] - whether or not to only update image data for current frame and do
     // *  nothing else
     * @param {number} [timestamp=performance.now()]
     */
    _render(timestamp=performance.now(), done=undefined) {
        if (!this.rendering) {
            // (!this.paused || this._renderingFrame) is true (it's playing or it's rendering a single frame)
            done && done();
            return;
        }

        this._updateCurrentTime(timestamp);
        // bad for performance? (remember, it's calling Array.reduce)
        let end = this.duration,
            ended = this.currentTime >= end;
        if (ended) {
            _publish(this, "movie.ended", {movie: this, repeat: this.repeat});
            this._currentTime = 0;  // don't use setter
            _publish(this, "movie.timeupdate", {movie: this});
            this._lastPlayed = performance.now();
            this._lastPlayedOffset = 0; // this.currentTime
            this._renderingFrame = false;
            if (!this.repeat || this.recording) {
                this._ended = true;
                // disable all layers
                let event = {movie: this};
                for (let i=0; i<this.layers.length; i++) {
                    let layer = this.layers[i];
                    _publish(layer, "layer.stop", event);
                    layer._active = false;
                }
            }
            done && done();
            return;
        }

        // do render
        this._renderBackground(timestamp);
        let frameFullyLoaded = this._renderLayers(timestamp);
        this._applyEffects();

        if (frameFullyLoaded) _publish(this, "movie.loadeddata", {movie: this});

        // if instant didn't load, repeatedly frame-render until frame is loaded
        // if the expression below is false, don't publish an event, just silently stop render loop
        if (this._renderingFrame && frameFullyLoaded) {
            this._renderingFrame = false;
            done && done();
            return;
        }

        window.requestAnimationFrame(timestamp => { this._render(timestamp); });   // TODO: research performance cost
    }
    _updateCurrentTime(timestamp) {
        // if we're only instant-rendering (current frame only), it doens't matter if it's paused or not
        if (!this._renderingFrame) {
        // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
            let sinceLastPlayed = (timestamp - this._lastPlayed) / 1000;
            this._currentTime = this._lastPlayedOffset + sinceLastPlayed;   // don't use setter
            _publish(this, "movie.timeupdate", {movie: this});
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
    _renderLayers(timestamp) {
        let frameFullyLoaded = true;
        for (let i=0; i<this.layers.length; i++) {
            let layer = this.layers[i];
            // Cancel operation if outside layer time interval
            //                                                         > or >= ?
            if (this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
                // outside time interval
                // if only rendering this frame (instant==true), we are not "starting" the layer
                if (layer.active && !this._renderingFrame) {
                    // TODO: make a `deactivate()` method?
                    // console.log("stop");
                    _publish(layer, "layer.stop", {movie: this});
                    layer._active = false;
                }
                continue;
            }
            // if only rendering this frame, we are not "starting" the layer
            if (!layer.active && !this._renderingFrame) {
                // TODO: make an `activate()` method?
                // console.log("start");
                _publish(layer, "layer.start", {movie: this});
                layer._active = true;
            }

            if (layer.media)
                frameFullyLoaded = frameFullyLoaded && layer.media.readyState >= 2;    // frame loaded
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

        return frameFullyLoaded;
    }
    _applyEffects() {
        for (let i=0; i<this.effects.length; i++) {
            let effect = this.effects[i];
            effect.apply(this, this.currentTime);
        }
    }

    /**
     * Refreshes the screen (should be called after a visual change in state).
     * @return {Promise} - `resolve` is called after the time it takes to load the frame.
     */
    refresh() {
        if (this.rendering) {
            throw "Cannot refresh frame while already rendering";
        }

        return new Promise((resolve, reject) => {
            this._renderingFrame = true;
            this._render(undefined, resolve);
        });
    }

    /** Convienence method */
    _publishToLayers(type, event) {
        for (let i=0; i<this.layers.length; i++) {
            _publish(this.layers[i], type, event);
        }
    }

    get rendering() { return !this.paused || this._renderingFrame; }
    get renderingFrame() { return this._renderingFrame; }
    // TODO: think about writing a renderingFrame setter
    /** @return <code>true</code> if the video is currently recording and <code>false</code> otherwise */
    get recording() { return !!this._mediaRecorder; }

    get duration() {    // TODO: dirty flag?
        return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0);
    }
    get layers() { return this._layers; }   // (proxy)
    /** Convienence method */
    addLayer(layer) { this.layers.push(layer); return this; }
    get effects() {
        return this._effects;    // private (because it's a proxy)
    }
    /** Convienence method */
    addEffect(effect) { this.effects.push(effect); return this; }
    get paused() { return this._paused; }   // readonly (from the outside)
    get ended() { return this._ended; }   // readonly (from the outside)
    /** Gets the current playback position */
    get currentTime() { return this._currentTime; }

    /**
     * Sets the current playback position. This is a more powerful version of `set currentTime`.
     * @param {number) time - the new cursor's time value in seconds
     * @param {boolean} refresh - whether to render a single frame to match new time or not
     */
    setCurrentTime(time, refresh=true) {
        return new Promise((resolve, reject) => {
            this._currentTime = time;
            _publish(this, "movie.seek", {movie: this});
            if (refresh) this.refresh().then(resolve).catch(reject);    // pass promise callbacks to `refresh`
            else resolve();
        });
    }
    /** Sets the current playback position */
    set currentTime(time) {
        this._currentTime = time;
        _publish(this, "movie.seek", {movie: this});
        this.refresh(); // render single frame to match new time
    }

    get canvas() { return this._canvas; }
    get cctx() { return this._cctx; }
    get actx() { return this._actx; }

    /** Gets the width of the attached canvas */
    get width() { return this.canvas.width; }
    /** Gets the height of the attached canvas */
    get height() { return this.canvas.height; }
    /** Sets the width of the attached canvas */
    set width(width) { this.canvas.width = width; }
    /** Sets the height of the attached canvas */
    set height(height) { this.canvas.height = height; }
}

// id for events (independent of instance, but easy to access when on prototype chain)
Movie.prototype._type = "movie";
Movie.prototype.getDefaultOptions = function() {
    return {
        _actx: new AudioContext(),
        background: "#000",
        repeat: false,
        autoRefresh: true
    };
};
// TODO: refactor so we don't need to explicitly exclude some of these
Movie.prototype._publicExcludes = ["canvas", "cctx", "actx", "layers", "effects"];
