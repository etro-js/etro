var mv = (function () {
    'use strict';

    /**
     * @param {string} str
     * @return {object} the parsed color
     */
    function parseColor(str) {
        // TODO: support HSL colors
        let channels, alpha;
        if (str.startsWith("#")) {
            str = str.substring(1);
            let stride = str.length === 6 || str.length === 8 ? 2 : 1;
            if (stride === 1) str = str
                .split("")
                .reduce((color, channel) => color + channel + channel, "");
            alpha = str.length % 4 === 0;
            channels = str.match(/.{2}/g).map(hex => parseInt(hex, 16));
        } else if (str.startsWith("rgb")) {
            alpha = str[3] === "a"; // as in 'rgba'
            str = str.substring(str.indexOf("("), str.indexOf(")"));
            channels = str.split(",").map(dec => parseInt(dec));
        } else {
            throw `Invalid color string: ${str}`;
        }

        return {r: channels[0], g: channels[1], b: channels[2], a: alpha ? channels[3] : 255};
    }

    function linearInterp(x1, x2, t) {
        return (1-t) * x1 + t * x2;
    }
    function cosineInterp(x1, x2, t) {
        let cos = Math.cos(Math.PI / 2 * t);
        return cos * x1 + (1-cos) * x2;
    }

    class Interface {
        /**
         * @param {function[]} methods
         */
        constructor(methods) {
            this.methods = methods;
        }

        /**
         * @param {object} object - literally any object
         */
        apply(object) {
            for (let name in this.methods) {
                if (!this.methods.hasOwnProperty(name)) continue;
                object[name] = this.methods[name];
            }
        }
    }

    const Eventable = new Interface({
        /*_*/subscribe: function(type, callback) {   // should always be public
            let callbacks = this._callbacks || (this._callbacks = {});
            (this._callbacks[type] || (this._callbacks[type] = [])).push(callback);
        },
        _publish: function(type, event) {
            if (!this._callbacks || !this._callbacks[type]) return;
            for (let i=0,l=this._callbacks[type].length; i<l; i++) {
                let callback = this._callbacks[type][i];
                callback(event);
            }
            return event;
        }
    });

    var util = /*#__PURE__*/Object.freeze({
        parseColor: parseColor,
        linearInterp: linearInterp,
        cosineInterp: cosineInterp,
        Interface: Interface,
        Eventable: Eventable
    });

    // TODO: use AudioContext to do more audio stuff
    // NOTE: The `options` argument is for optional arguments :]

    /**
     * Contains all layers and movie information
     * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
     *
     * TODO: implement event "durationchange", and more
     */
    class Movie {
        constructor(canvas, options={}) {
            this.canvas = canvas;
            this.cctx = canvas.getContext("2d");
            this.actx = new AudioContext();
            this.background = options.background || "#000";
            this.repeat = options.repeat || false;
            this.effects = [];
            this._mediaRecorder = null; // for recording
            this.subscribe("end", () => {
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
                    if (!isNaN(property)) // if property is a number (i.e. an index)
                        value._publish("attach", {movie: that});
                    target[property] = value;
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

        play() {
            this._paused = false;
            this._lastPlayed = performance.now();
            this._lastPlayedOffset = this.currentTime;
            this._render();
        }

        // TODO: figure out a way to record faster than playing
        /**
         * Start recording
         *
         * @param {number} framerate
         * @param {object} [options={}] - options to pass to the <code>MediaRecorder</code> constructor
         */
        record(framerate, options={}) {
            if (!this.paused) throw "Cannot record movie while playing";
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
                let mediaRecorder = new MediaRecorder(stream, options);
                this._publishToLayers("audiodestinationupdate", {movie: this, destination: audioDestination});
                mediaRecorder.ondataavailable = event => {
                    // if (this._paused) reject(new Error("Recording was interrupted"));
                    if (event.data.size > 0)
                        recordedChunks.push(event.data);
                };
                mediaRecorder.onstop = () => {
                    this._ended = true;
                    // construct super-Blob
                    resolve(new Blob(recordedChunks, {"type" : "audio/ogg; codecs=opus"}));  // this is the exported video as a blob!
                    this.canvas = canvasCache;
                    this.cctx = this.canvas.getContext("2d");
                    this._publishToLayers(
                        "audiodestinationupdate",
                        {movie: this, destination: this.actx.destination}
                    );
                    this._mediaRecorder = null;
                };
                mediaRecorder.onerror = reject;

                mediaRecorder.start();
                this._mediaRecorder = mediaRecorder;
                this.play();
            });
        }

        pause() {
            this._paused = true;
            // disable all layers
            let event = {movie: this};
            for (let i=0; i<this.layers.length; i++) {
                let layer = this.layers[i];
                layer._publish("stop", event);
                layer.active = false;
            }
        }

        stop() {
            this.pause();
            this.currentTime = 0;   // use setter?
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
                this._publish("end", {movie: this, repeat: this.repeat});
                this._currentTime = 0;  // don"t use setter
                this._publish("timeupdate", {movie: this});
                this._lastPlayed = performance.now();
                this._lastPlayedOffset = 0; // this.currentTime
                if (!this.repeat) {
                    this._ended = true;
                    this.pause();   // clear paused switch and disable all layers
                }
                return;
            }

            // do render
            this._renderBackground();
            let instantFullyLoaded = this._renderLayers(instant, timestamp);
            this._applyEffects();

            // if instant didn't load, repeatedly frame-render until frame is loaded
            // if the expression below is false, don"t publish an event, just silently stop render loop
            if (!instant || (instant && !instantFullyLoaded))
                window.requestAnimationFrame(timestamp => { this._render(instant, timestamp); });
        }
        _updateCurrentTime(instant, timestamp) {
            // if we"re only instant-rendering (current frame only), it doens"t matter if it"s paused or not
            if (!instant) {
            // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
                let sinceLastPlayed = (timestamp - this._lastPlayed) / 1000;
                this._currentTime = this._lastPlayedOffset + sinceLastPlayed;   // don"t use setter
                this._publish("timeupdate", {movie: this});
                // this._lastUpdate = timestamp;
            // }
            }
        }
        _renderBackground() {
            this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.background) {
                this.cctx.fillStyle = this.background;
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
                if (this.currentTime < layer.startTime || this.currentTime >= layer.startTime + layer.duration) {
                    // outside time interval
                    // if only rendering this frame (instant==true), we are not "starting" the layer
                    if (layer.active && !instant) {
                        layer._publish("stop", {movie: this});
                        layer.active = false;
                    }
                    continue;
                }
                // if only rendering this frame, we are not "starting" the layer
                if (!layer.active && !instant) {
                    layer._publish("start", {movie: this});
                    layer.active = true;
                }

                if (layer.source)
                    instantFullyLoaded = instantFullyLoaded && layer.source.readyState >= 2;    // frame loaded
                layer._render();
                this.cctx.drawImage(layer.canvas, layer.x, layer.y, layer.width, layer.height);
            }

            return instantFullyLoaded;
        }
        _applyEffects() {
            for (let i=0; i<this.effects.length; i++) {
                let effect = this.effects[i];
                effect(this);
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

        get recording() { return !!this._mediaRecorder; }

        get duration() {
            return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0);
        }
        get layers() { return this._layers; }   // (proxy)
        addLayer(layer) { this.layers.push(layer); return this; }   // convienence method
        get paused() { return this._paused; }   // readonly (from the outside)
        get currentTime() { return this._currentTime; }
        set currentTime(time) {
            this._currentTime = time;
            this._publish("seek", {movie: this});
            this.refresh(); // render single frame to match new time
        }

        get width() { return this.canvas.width; }
        get height() { return this.canvas.height; }
        set width(width) { this.canvas.width = width; }
        set height(height) { this.canvas.height = height; }
    }
    Eventable.apply(Movie.prototype);

    /**
     * All layers have a
     * - start time
     * - duration
     * - background color
     * - list of effects
     * - an "active" flag
     */
    class Layer {
        /**
         * Creates a new empty layer
         *
         * @param {number} startTime - when to start the layer on the movie"s timeline
         * @param {number} duration - how long the layer should last on the movie"s timeline
         * @param {number} width - the width of the entire layer
         * @param {number} height - the height of the entire layer
         * @param {object} [options] - various optional arguments
         * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
         * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
         * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
         *  for a transparent background
         * @param {object} [options.border=null] - the layer"s outline, or <code>null</code> for no outline
         * @param {string} [options.border.color] - the outline"s color; required for a border
         * @param {string} [options.border.thickness=1] - the outline"s weight
         * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
         *  and <code>0</code> for full transparency
         */
        constructor(startTime, duration, width, height, options={}) {
            this.startTime = startTime;
            this.duration = duration;

            this.x = options.x || 0;
            this.y = options.y || 0;

            this.effects = [];
            this.active = false;   // whether this layer is currently being rendered

            this.background = options.background || null;
            this.border = options.border || null;
            this.opacity = options.opacity || 1;

            this.canvas = document.createElement("canvas");
            this.canvas.width = width;
            this.canvas.height = height;
            this.cctx = this.canvas.getContext("2d");

            // on attach to movie
            this.subscribe("attach", event => {
                this._movie = event.movie;
            });
        }

        /** "Use" layer */
        _render() {
            this._beginRender();
            this._doRender();
            this._endRender();
        }
        _beginRender() {
            // this.cctx.save();     trying to improve performance, uncomment if necessary
            this.cctx.globalAlpha = this.opacity;
        }
        _doRender() {
            this.cctx.clearRect(0, 0, this.width, this.height);      // (0, 0) relative to layer
            if (this.background) {
                this.cctx.fillStyle = this.background;
                this.cctx.fillRect(0, 0, this.width, this.height);  // (0, 0) relative to layer
            }
            if (this.border && this.border.color) {
                this.cctx.strokeStyle = this.border.color;
                this.cctx.lineWidth = this.border.thickness || 1;    // this is optional
            }
        }
        _endRender() {
            this._applyEffects();
            // this.cctx.restore();      trying to perfect performance, uncomment if necessary
        }

        _applyEffects() {
            for (let i=0; i<this.effects.length; i++) {
                let effect = this.effects[i];
                effect.apply(this, this._movie);
            }
        }

        addEffect(effect) { this.effects.push(effect); return this; }

        get width() { return this.canvas.width; }
        get height() { return this.canvas.height; }
        set width(val) { this.canvas.width = val; }
        set height(val) { this.canvas.height = val; }
    }

    Eventable.apply(Layer.prototype);

    class TextLayer extends Layer {
        /**
         * Creates a new text layer
         *
         * @param {number} startTime
         * @param {number} duration
         * @param {string} text - the text to display
         * @param {object} [options] - various optional arguments
         * @param {string} [options.font="10px sans-serif"]
         * @param {string} [options.color="#fff"]
         * @param {number} [options.textX=0] - the text's horizontal offset relative to the layer
         * @param {number} [options.textY=0] - the text's vertical offset relative to the layer
         * @param {number} [options.maxWidth=null] - the maximum width of a line of text
         * @param {number} [options.textAlign="start"] - horizontal align
         * @param {number} [options.textBaseLine="alphabetic"] - vertical align
         */
        constructor(startTime, duration, text, options={}) {
            let tmpCanvas = document.createElement("canvas"),
                tmpCtx = tmpCanvas.getContext("2d");
            if (options.font) tmpCtx.font = options.font;   // or else use default font
            let metrics = tmpCtx.measureText(text);
            super(startTime, duration, metrics.width, metrics.height, options);

            this.font = tmpCtx.font;    // works with default font, too
            this.color = options.color || "#fff";
            this.textX = options.textX || 0;
            this.textY = options.textY || 0;
            this.maxWidth = options.maxWidth || null;
            this.textAlign = options.textAlign || "start";
            this.textBaseLine = options.textBaseLine || "alphabetic";
        }

        _doRender() {
            super._doRender();
            this.cctx.font = this.font;
            this.cctx.fillStyle = this.color;
            this.cctx.textAlign = this.textAlign;
            this.cctx.textBaseLine = this.textBaseLine;
            this.cctx.fillText(
                this.text, this.textX, this.textY, this.maxWidth !== null ? this.maxWidth : undefined
            );
        }
    }

    // TODO: make VisualMediaLayer or something as superclass for image and video? probably not

    class ImageLayer extends Layer {
        /**
         * Creates a new image layer
         *
         * @param {number} startTime
         * @param {number} duration
         * @param {HTMLImageElement} media
         * @param {object} [options]
         * @param {number} [options.clipX=0] - where to place the left edge of the image
         * @param {number} [options.clipY=0] - where to place the top edge of the image
         * @param {number} [options.clipWidth=0] - where to place the right edge of the image
         *  (relative to <code>options.clipX</code>)
         * @param {number} [options.clipHeight=0] - where to place the top edge of the image
         *  (relative to <code>options.clipY</code>)
         * @param {number} [options.mediaX=0] - where to place the image horizonally relative to the layer
         * @param {number} [options.mediaY=0] - where to place the image vertically relative to the layer
         */
        constructor(startTime, duration, media, options={}) {
            super(startTime, duration, options.width || 0, options.height || 0, options);  // wait to set width & height
            this.media = media;
            // clipX... => how much to show of this.media
            this.clipX = options.clipX || 0;
            this.clipY = options.clipY || 0;
            this.clipWidth = options.clipWidth;
            this.clipHeight = options.clipHeight;
            // mediaX... => how to project this.media onto the canvas
            this.mediaX = options.mediaX || 0;
            this.mediaY = options.mediaY || 0;

            const load = () => {
                this.width = this.mediaWidth = this.width || this.media.width;
                this.height = this.mediaHeight = this.height || this.media.height;
                this.clipWidth = this.clipWidth || media.width;
                this.clipHeight = this.clipHeight || media.height;
            };
            if (media.complete) load();
            else media.addEventListener("load", load);
        }

        _doRender() {
            super._doRender();  // clear/fill background
            this.cctx.drawImage(
                this.media,
                this.clipX, this.clipY, this.clipWidth, this.clipHeight,
                // this.mediaX and this.mediaY are relative to layer; ik it's weird to pass mediaX in for destX
                this.mediaX, this.mediaY, this.media.width, this.media.height
            );
        }
    }

    /**
     * Any layer that has audio extends this class;
     * Audio and video
     */
    class MediaLayer extends Layer {
        /**
         * @param {number} startTime
         * @param {HTMLVideoElement} media
         * @param {object} [options]
         * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
         * @param {numer} [options.duration=media.duration-options.mediaStartTime]
         * @param {boolean} [options.muted=false]
         * @param {number} [options.volume=1]
         * @param {number} [options.speed=1] - the audio's playerback rate
         */
        constructor(startTime, media, width, height, onload, options={}) {
            super(startTime, 0, width, height, options);
            this.media = media;
            this._mediaStartTime = options.mediaStartTime || 0;
            this.muted = options.muted || false;
            this.volume = options.volume || 1;
            this.speed = options.speed || 1;

            const load = () => {
                if ((options.duration || (media.duration-this.mediaStartTime)) < 0)
                    throw "Invalid options.duration or options.mediaStartTime";
                this.duration = options.duration || (media.duration-this.mediaStartTime);
                // onload will use `this`, and can't bind itself because it's before super()
                onload && onload.bind(this)(media, options);
            };
            if (media.readyState >= 2) load(); // this frame's data is available now
            else media.addEventListener("canplay", load);    // when this frame's data is available

            this.subscribe("attach", event => {
                event.movie.subscribe("seek", event => {
                    let time = event.movie.currentTime;
                    if (time < this.startTime || time >= this.startTime + this.duration) return;
                    this.media.currentTime = time - this.startTime;
                });
                // connect to audiocontext
                this.source = event.movie.actx.createMediaElementSource(this.media);
                this.source.connect(event.movie.actx.destination);
            });
            this.subscribe("audiodestinationupdate", event => {
                // reset destination
                this.source.disconnect();
                this.source.connect(event.destination);
            });
            this.subscribe("start", () => {
                this.media.currentTime = this.mediaStartTime;
                this.media.play();
            });
            this.subscribe("stop", () => {
                this.media.pause();
            });
        }

        set mediaStartTime(startTime) {
            this.startTime = startTime;
            let mediaProgress = this._movie.currentTime - this.startTime;
            this.media.currentTime = mediaProgress + this.mediaStartTime;
        }
        get mediaStartTime() { return this._mediaStartTime; }

        set muted(muted) { this.media.muted = muted; }
        set volume(volume) { this.media.volume = volume; }
        set speed(speed) { this.media.speed = speed; }

        get muted() { return this.media.muted; }
        get volume() { return this.media.volume; }
        get speed() { return this.media.speed; }
    }

    class VideoLayer extends MediaLayer {
        /**
         * Creates a new video layer
         *
         * @param {number} startTime
         * @param {HTMLVideoElement} media
         * @param {object} [options]
         * @param {number} [options.mediaStartTime=0] - at what time in the video the layer starts
         * @param {numer} [options.duration=media.duration-options.mediaStartTime]
         * @param {number} [options.clipX=0] - where to place the left edge of the image
         * @param {number} [options.clipY=0] - where to place the top edge of the image
         * @param {number} [options.clipWidth=0] - where to place the right edge of the image
         *  (relative to <code>options.clipX</code>)
         * @param {number} [options.clipHeight=0] - where to place the top edge of the image
         *  (relative to <code>options.clipY</code>)
         * @param {number} [options.mediaX=0] - where to place the image horizonally relative to the layer
         * @param {number} [options.mediaY=0] - where to place the image vertically relative to the layer
         */
        constructor(startTime, media, options={}) {
            super(startTime, media, 0, 0, function(media, options) { // using function to prevent |this| error
                // by default, the layer size and the video output size are the same
                this.width = this.mediaWidth = options.width || media.videoWidth;
                this.height = this.mediaHeight = options.height || media.videoHeight;
                this.clipWidth = options.clipWidth || media.videoWidth;
                this.clipHeight = options.clipHeight || media.videoHeight;
            }, options); // fill in the zeros once loaded
            // clipX... => how much to show of this.media
            this.clipX = options.clipX || 0;
            this.clipY = options.clipY || 0;
            // mediaX... => how to project this.media onto the canvas
            this.mediaX = options.mediaX || 0;
            this.mediaY = options.mediaY || 0;
        }

        _doRender() {
            super._doRender();
            this.cctx.drawImage(this.media,
                this.clipX, this.clipY, this.clipWidth, this.clipHeight,
                this.mediaX, this.mediaY, this.width, this.height); // relative to layer
        }
    }

    class AudioLayer extends MediaLayer {
        /**
         * Creates an audio layer
         *
         * @param {number} startTime
         * @param {HTMLAudioElement} media
         * @param {object} [options]
         */
        constructor(startTime, media, options={}) {
            // fill in the zero once loaded, no width or height (will raise error)
            super(startTime, media, -1, -1, null, options);
        }

        /* Do not render anything */
        _beginRender() {}
        _doRender() {}
        _endRender() {}
    }

    var layer = /*#__PURE__*/Object.freeze({
        Layer: Layer,
        TextLayer: TextLayer,
        ImageLayer: ImageLayer,
        MediaLayer: MediaLayer,
        VideoLayer: VideoLayer,
        AudioLayer: AudioLayer
    });

    class Effect {
        // subclasses must implement apply
        apply(renderer) {
            throw "No overriding method found or super.apply was called";
        }
    }

    // TODO: investigate why an effect might run once in the beginning even if its layer isn't at the beginning
    // TODO: implement keyframes :]]]]

    /* UTIL */
    function map(mapper, canvas, ctx, x, y, width, height, flush=true) {
        x = x || 0;
        y = y || 0;
        width = width || canvas.width;
        height = height || canvas.height;
        let frame = ctx.getImageData(x, y, width, height);
        for (let i=0,l=frame.data.length; i<l; i+=4)
            mapper(frame.data, i);
        if (flush) ctx.putImageData(frame, x, y);
    }

    /* COLOR & TRANSPARENCY */
    class Transparency extends Effect {
        constructor(opacity=0.5) {
            super();
            this.opacity = opacity;
        }
        apply(target) {
            map((data, start) => { data[start+3] = this.opacity * 255; }, target.canvas, target.cctx);
        }
    }

    class Brightness extends Effect {
        constructor(brightness=1.0) {
            super();
            this.brightness = brightness;
        }
        apply(target) {
            map((data, start) => {
                for (let i=0; i<3; i++) data[start+i] *= this.brightness;
            }, target.canvas, target.cctx);
        }
    }

    class Contrast extends Effect {
        constructor(contrast=1.0) {
            super();
            this.contrast = contrast;
        }
        apply(target) {
            map((data, start) => {
                for (let i=0; i<3; i++) data[start+i] = this.contrast * (data[start+i] - 128) + 128;
            }, target.canvas, target.cctx);
        }
    }

    /**
     * Multiplies each channel by a constant
     */
    class Channels extends Effect {
        constructor(channels) {
            super();
            this.r = channels.r || 1.0;
            this.g = channels.g || 1.0;
            this.b = channels.b || 1.0;
            this.a = channels.a || 1.0;
        }
        apply(target) {
            map((data, start) => {
                data[start+0] *= this.r;
                data[start+1] *= this.g;
                data[start+2] *= this.b;
                data[start+3] *= this.a;
            }, target.canvas, target.cctx);
        }
    }

    class ChromaKey extends Effect {
        /**
         * @param {Color} [target={r: 0, g: 0, b: 0}] - the color to target
         * @param {number} [threshold=0] - how much error is allowed
         * @param {boolean|string} [smoothing=false] - the smoothing mode; support values:
         *  <ul>
         *      <li><code>"linear"</code></li>
         *      <li><code>"cosine"</code></li>
         *      <li><code>false</code> to disable smoothing</li>
         *  </ul>
         * @param {number} [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable
         */
        // TODO: use smoothingSharpness
        constructor(target={r: 0, g: 0, b: 0}, threshold=0, smoothing=false, smoothingSharpness=0) {
            super();
            this.target = target;
            this.threshold = threshold;
            this.smoothing = smoothing;
            this.smoothingSharpness = smoothingSharpness;
        }
        apply(target) {
            map((data, start) => {
                let r = data[start+0];
                let g = data[start+1];
                let b = data[start+2];
                if (!this.smoothing) {
                    // standard dumb way that most video editors do it (all-or-nothing method)
                    let transparent = (Math.abs(r - this.target.r) <= threshold)
                        && (Math.abs(g - this.target.g) <= threshold)
                        && (Math.abs(b - this.target.b) <= threshold);
                    if (transparent) data[start+3] = 0;
                } else {
                    /*
                        better way IMHO:
                        Take the average of the absolute differences between the pixel and the target for each channel
                    */
                    let dr = Math.abs(r - this.target.r);
                    let dg = Math.abs(g - this.target.g);
                    let db = Math.abs(b - this.target.b);
                    let transparency = (dr + dg + db) / 3;
                    switch (this.smoothing) {
                        case "linear": { break; }
                        case "cosine": { transparency = cosineInterp(0, 255, transparency/255); break; }
                        default: { throw "Invalid smoothing type"; }
                    }
                    data[start+3] = transparency;
                }
            }, target.canvas, target.cctx);
        }
    }

    /* BLUR */
    // TODO: make sure this is truly gaussian even though it doens't require a standard deviation
    // TODO: improve performance and/or make more powerful
    class GuassianBlur extends Effect {
        constructor(radius) {
            if (radius % 2 !== 1 || radius <= 0) throw "Radius should be an odd natural number";
            super();
            this.radius = radius;
        }
        apply(target) {
            // TODO: get rid of tmpCanvas and just take advantage of image data's immutability
            let tmpCanvas = document.createElement("canvas"),
                tmpCtx = tmpCanvas.getContext("2d");
            tmpCanvas.width = target.canvas.width;
            tmpCanvas.height = target.canvas.height;
            let imageData = target.cctx.getImageData(0, 0, target.canvas.width, target.canvas.height);
            let tmpImageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
            // only one dimension (either x or y) of the kernel
            let kernel = gen1DKernel(this.radius);
            let kernelStart = -(this.radius-1) / 2, kernelEnd = -kernelStart;
            // vertical pass
            for (let x=0; x<tmpCanvas.width; x++) {
                for (let y=0; y<tmpCanvas.height; y++) {
                    let r=0, g=0, b=0, a=imageData.data[4*(tmpCanvas.width*y+x)+3];
                    // apply kernel
                    for (let kernelY=kernelStart; kernelY<=kernelEnd; kernelY++) {
                        if (y+kernelY >= tmpCanvas.height) break;
                        let kernelIndex = kernelY - kernelStart; // actual array index (not y-coordinate)
                        let weight = kernel[kernelIndex];
                        let ki = 4*(tmpCanvas.width*(y+kernelY)+x);
                        r += weight * imageData.data[ki + 0];
                        g += weight * imageData.data[ki + 1];
                        b += weight * imageData.data[ki + 2];
                    }
                    let i = 4*(tmpCanvas.width*y+x);
                    tmpImageData.data[i + 0] = r;
                    tmpImageData.data[i + 1] = g;
                    tmpImageData.data[i + 2] = b;
                    tmpImageData.data[i + 3] = a;
                }
            }
            imageData = tmpImageData;   // pipe the previous ouput to the input of the following code
            tmpImageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);    // create new output space
            // horizontal pass
            for (let y=0; y<tmpCanvas.height; y++) {
                for (let x=0; x<tmpCanvas.width; x++) {
                    let r=0, g=0, b=0, a=imageData.data[4*(tmpCanvas.width*y+x)+3];
                    // apply kernel
                    for (let kernelX=kernelStart; kernelX<=kernelEnd; kernelX++) {
                        if (x+kernelX >= tmpCanvas.width) break;
                        let kernelIndex = kernelX - kernelStart; // actual array index (not y-coordinate)
                        let weight = kernel[kernelIndex];
                        let ki = 4 * (tmpCanvas.width*y+(x+kernelX));
                        r += weight * imageData.data[ki + 0];
                        g += weight * imageData.data[ki + 1];
                        b += weight * imageData.data[ki + 2];
                    }
                    let i = 4*(tmpCanvas.width*y+x);
                    tmpImageData.data[i + 0] = r;
                    tmpImageData.data[i + 1] = g;
                    tmpImageData.data[i + 2] = b;
                    tmpImageData.data[i + 3] = a;
                }
            }
            target.cctx.putImageData(tmpImageData, 0, 0);
        }
    }
    function gen1DKernel(radius) {
        let pascal = genPascalRow(radius);
        // don't use `reduce` and `map` (overhead?)
        let sum = 0;
        for (let i=0; i<pascal.length; i++)
            sum += pascal[i];
        for (let i=0; i<pascal.length; i++)
            pascal[i] /= sum;
        return pascal;
    }
    function genPascalRow(index) {
        if (index < 0) throw `Invalid index ${index}`;
        let currRow = [1];
        for (let i=1; i<index; i++) {
            let nextRow = [];
            nextRow.length = currRow.length + 1;
            // edges are always 1's
            nextRow[0] = nextRow[nextRow.length-1] = 1;
            for (let j=1; j<nextRow.length-1; j++)
                nextRow[j] = currRow[j-1] + currRow[j];
            currRow = nextRow;
        }
        return currRow;
    }

    // TODO: implement directional blur
    // TODO: implement radial blur
    // TODO: implement zoom blur

    /* DISTORTION */
    class Transform {
        constructor(matrix) {
            this.matrix = matrix;
            this.tmpCanvas = document.createElement("canvas");
            this.tmpCtx = this.tmpCanvas.getContext("2d");
        }

        apply(target) {
            if (target.canvas.width !== this.tmpCanvas.width) this.tmpCanvas.width = target.canvas.width;
            if (target.canvas.height !== this.tmpCanvas.height) this.tmpCanvas.height = target.canvas.height;
            this.tmpCtx.setTransform(
                this.matrix.a, this.matrix.b, this.matrix.c,
                this.matrix.d, this.matrix.e, this.matrix.f,
            );
            this.tmpCtx.drawImage(target.canvas, 0, 0);
            // Assume it was identity for now
            this.tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1);
            target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
            target.cctx.drawImage(this.tmpCanvas, 0, 0);
        }
    }
    /** @class
     * A 3x3 matrix for storing 2d transformations
     */
    Transform.Matrix = class Matrix {
        constructor(data) {
            this.data = data || [
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ];
        }

        identity() {
            for (let i=0; i<this.data.length; i++)
                this.data[i] = Transform.Matrix.IDENTITY.data[i];

            return this;
        }

        /**
         * @param {number} x
         * @param {number} y
         * @param {number} [val]
         */
        cell(x, y, val) {
            if (val !== undefined) this.data[3*y + x] = val;
            return this.data[3*y + x];
        }

        /* For canvas context setTransform */
        get a() { return this.data[0]; }
        get b() { return this.data[3]; }
        get c() { return this.data[1]; }
        get d() { return this.data[4]; }
        get e() { return this.data[2]; }
        get f() { return this.data[5]; }

        multiply(other) {
            // copy to temporary matrix to avoid modifying `this` while reading from it
            // http://www.informit.com/articles/article.aspx?p=98117&seqNum=4
            for (let x=0; x<3; x++) {
                for (let y=0; y<3; y++) {
                    let sum = 0;
                    for (let i=0; i<3; i++)
                        sum += this.cell(x, i) * other.cell(i, y);
                    TMP_MATRIX.cell(x, y, sum);
                }
            }
            // copy data from TMP_MATRIX to this
            for (let i=0; i<TMP_MATRIX.data.length; i++)
                this.data[i] = TMP_MATRIX.data[i];
            return this;
        }

        translate(x, y) {
            this.multiply(new Transform.Matrix([
                1, 0, 0,
                0, 1, 0,
                x, y, 1
            ]));

            return this;
        }

        scale(x, y) {
            this.multiply(new Transform.Matrix([
                x, 0, 0,
                0, y, 0,
                0, 0, 1
            ]));

            return this;
        }

        rotate(a) {
            let c = Math.cos(a), s = Math.sin(a);
            this.multiply(new Transform.Matrix([
                c, s, 0,
               -s, c, 0,
                0, 0, 1
            ]));

            return this;
        }
    };
    Transform.Matrix.IDENTITY = new Transform.Matrix();
    const TMP_MATRIX = new Transform.Matrix();

    // TODO: when using AudioContext, support reverb

    var effects = /*#__PURE__*/Object.freeze({
        Transparency: Transparency,
        Brightness: Brightness,
        Contrast: Contrast,
        Channels: Channels,
        ChromaKey: ChromaKey,
        GuassianBlur: GuassianBlur,
        Transform: Transform
    });

    var main = {
        Movie: Movie,
        ...layer,
        Effect: Effect,
        ...util,
        effects: effects    // add effects as as a property of export
    };

    return main;

}());
