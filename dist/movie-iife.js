var mv = (function () {
    'use strict';

    /**
     * @return {boolean} <code>true</code> if <code>property</code> is a non-array object and all of its own
     *  property keys are numbers or <code>"interpolate"</code> or <code>"interpolationKeys"</code>, and
     * <code>false</code>  otherwise.
     */
    function isKeyFrames(property) {
        if ((typeof property !== "object" || property === null) || Array.isArray(property)) return false;
        // is reduce slow? I think it is
        let keys = Object.keys(property);   // own propeties
        for (let i=0; i<keys.length; i++) {
            let key = keys[i];
            // convert key to number, because object keys are always converted to strings
            if (+key === NaN && !(key === "interpolate" || key === "interpolationKeys"))
                return false;
        }
        return true;
    }

    /**
     * Calculates the value of keyframe set <code>property</code> at <code>time</code> if
     * <code>property</code> is an array, or returns <code>property</code>, assuming that it's a number.
     *
     * @param {(*|object)} property - value or map of time-to-value pairs for keyframes
     * @param {function} [property.interpolate=linearInterp] - the function to interpolate between keyframes
     * @param {string[]} [property.interpolationKeys] - keys to interpolate for objects
     * @param {number} [time] - time to calculate keyframes for, if necessary
     *
     * Note that only values used in keyframes that numbers or objects (including arrays) are interpolated.
     * All other values are taken sequentially with no interpolation. JavaScript will convert parsed colors,
     * if created correctly, to their string representations when assigned to a CanvasRenderingContext2D property
     * (I'm pretty sure).
     */
    // TODO: is this function efficient??
    // TODO: update doc @params to allow for keyframes
    function val(property, time) {
        if (!isKeyFrames(property)) return property;
        // if (Object.keys(property).length === 0) throw "Empty key frame set"; // this will never be executed
        if (time == undefined) throw "|time| is undefined or null";
        // I think .reduce and such are slow to do per-frame (or more)?
        // lower is the max beneath time, upper is the min above time
        let lowerTime = 0, upperTime = Infinity,
            lowerValue = null, upperValue = null;    // default values for the inequalities
        for (let keyTime in property) {
            let keyValue = property[keyTime];
            keyTime = +keyTime; // valueOf to convert to number

            if (lowerTime <= keyTime && keyTime <= time) {
                lowerValue = keyValue;
                lowerTime = keyTime;
            }
            if (time <= keyTime && keyTime <= upperTime) {
                upperValue = keyValue;
                upperTime = keyTime;
            }
        }
        if (lowerValue === null) throw `No keyframes located before or at time ${time}.`;
        // no need for upperValue if it is flat interpolation
        if (!(typeof lowerValue === "number" || typeof lowerValue === "object")) return lowerValue;

        if (upperValue === null) throw `No keyframes located after or at time ${time}.`;
        if (typeof lowerValue !== typeof upperValue) throw "Type mismatch in keyframe values";

        // interpolate
        // the following should mean that there is a key frame *at* |time|; prevents division by zero below
        if (upperTime === lowerTime) return upperValue;
        let progress = time - lowerTime, percentProgress = progress / (upperTime - lowerTime);
        const interpolate = property.interpolate || linearInterp;
        return interpolate(lowerValue, upperValue, percentProgress, property.interpolationKeys);
    }

    /*export function floorInterp(x1, x2, t, objectKeys) {
        // https://stackoverflow.com/a/25835337/3783155 (TODO: preserve getters/setters, etc?)
        return !objectKeys ? x1 : objectKeys.reduce((a, x) => {
            if (x1.hasOwnProperty(x)) a[x] = o[x];  // ignore x2
            return a;
        }, Object.create(Object.getPrototypeOf(x1)));
    }*/

    function linearInterp(x1, x2, t, objectKeys) {
        if (typeof x1 !== typeof x2) throw "Type mismatch";
        if (typeof x1 !== "number" && typeof x1 !== "object") return x1;    // flat interpolation (floor)
        if (typeof x1 === "object") { // to work with objects (including arrays)
            // TODO: make this code DRY
            if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) throw "Prototype mismatch";
            let int = Object.create(Object.getPrototypeOf(x1)); // preserve prototype of objects
            // only take the union of properties
            let keys = Object.keys(x1) || objectKeys;
            for (let i=0; i<keys.length; i++) {
                let key = keys[i];
                // (only take the union of properties)
                if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) continue;
                int[key] = linearInterp(x1[key], x2[key], t);
            }
            return int;
        }
        return (1-t) * x1 + t * x2;
    }
    function cosineInterp(x1, x2, t, objectKeys) {
        if (typeof x1 !== typeof x2) throw "Type mismatch";
        if (typeof x1 !== "number" && typeof x1 !== "object") return x1;    // flat interpolation (floor)
        if (typeof x1 === "object" && typeof x2 === "object") { // to work with objects (including arrays)
            if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) throw "Prototype mismatch";
            let int = Object.create(Object.getPrototypeOf(x1)); // preserve prototype of objects
            // only take the union of properties
            let keys = Object.keys(x1) || objectKeys;
            for (let i=0; i<keys.length; i++) {
                let key = keys[i];
                // (only take the union of properties)
                if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) continue;
                int[key] = cosineInterp(x1[key], x2[key], t);
            }
            return int;
        }
        let cos = Math.cos(Math.PI / 2 * t);
        return cos * x1 + (1-cos) * x2;
    }

    class Color {
        constructor(r, g, b, a=255) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }

        toString() {
            return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
        }
    }

    /**
     * Converts a hex, <code>rgb</code>, or <code>rgba</code> color string to an object representation.
     * Mostly used in image processing effects.
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

        return new Color(channels[0], channels[1], channels[2], alpha ? channels[3] : 255);
    }

    class Font {
        constructor(size, family, sizeUnit="px") {
            this.size = size;
            this.family = family;
            this.sizeUnit = sizeUnit;
        }

        toString() {
            return `${this.size}${this.sizeUnit} ${this.family}`;
        }
    }

    function parseFont(str) {
        const split = str.split(" ");
        if (split.length !== 2) throw `Invalid font '${str}'`;
        const sizeWithUnit = split[0], family = split[1],
            size = parseFloat(sizeWithUnit), sizeUnit = sizeWithUnit.substring(size.toString().length);
        return new Font(size, family, sizeUnit);
    }

    /*
     * Attempts to solve the diamond inheritance problem using mixins
     * See {@link http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/}<br>
     *
     * <strong>Note that the caller has to explicitly update the class value and as well as the class's property
     * <code>constructor</code> to its prototype's constructor.</strong><br>
     *
     * This throws an error when composing functions with return values; unless if the composed function is a
     * constructor, which is handled specially.
     *
     * Note that all properties must be functions for this to work as expected.
     *
     * If the destination and source have the methods with the same name (key), assign a new function
     * that calls both with the given arguments. The arguments list passed to each subfunction will be the
     * argument list that was called to the composite function.
     *
     * This function only works with functions, getters and setters.
     *
     * TODO: make a lot more robust
     * TODO: rethink my ways... this is evil
     */
    /*export function extendProto(destination, source) {
        for (let name in source) {
            const extendMethod = (sourceDescriptor, which) => {
                let sourceFn = sourceDescriptor[which],
                    origDestDescriptor = Object.getOwnPropertyDescriptor(destination, name),
                    origDestFn = origDestDescriptor ? origDestDescriptor[which] : undefined;
                let destFn = !origDestFn ? sourceFn : function compositeMethod() {   // `function` or `()` ?
                    try {
                        // |.apply()| because we're seperating the method from the object, so return the value
                        // of |this| back to the function
                        let r1 = origDestFn.apply(this, arguments),
                            r2 = sourceFn.apply(this, arguments);
                        if (r1 || r2) throw "Return value in composite method"; // null will slip by ig
                    } catch (e) {
                        if (e.toString() === "TypeError: class constructors must be invoked with |new|") {
                            let inst = new origDestFn(...arguments);
                            sourceFn.apply(inst, arguments);
                            return inst;
                        } else throw e;
                    }
                };

                let destDescriptor = {...sourceDescriptor}; // shallow clone
                destDescriptor[which] = destFn;
                Object.defineProperty(destination, name, destDescriptor);
            };

            let descriptor = Object.getOwnPropertyDescriptor(source, name);
            if (descriptor) {   // if hasOwnProperty
                if (descriptor.get) extendMethod(descriptor, 'get');
                if (descriptor.set) extendMethod(descriptor, 'set');
                if (descriptor.value) extendMethod(descriptor, 'value');
            }
        }
    }*/

    class PubSub {
        /*_*/subscribe(type, callback) {   // should always be public
            let callbacks = this._callbacks || (this._callbacks = {});
            (this._callbacks[type] || (this._callbacks[type] = [])).push(callback);
        }
        _publish(type, event) {
            if (!this._callbacks || !this._callbacks[type]) return;
            for (let i=0,l=this._callbacks[type].length; i<l; i++)
                this._callbacks[type][i](event);
            return event;
        }
    }

    var util = /*#__PURE__*/Object.freeze({
        val: val,
        linearInterp: linearInterp,
        cosineInterp: cosineInterp,
        Color: Color,
        parseColor: parseColor,
        Font: Font,
        parseFont: parseFont,
        PubSub: PubSub
    });

    // NOTE: The `options` argument is for optional arguments :]

    /**
     * Contains all layers and movie information
     * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
     *
     * TODO: implement event "durationchange", and more
     */
    class Movie extends PubSub {
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
            this._paused = false;
            this._lastPlayed = performance.now();
            this._lastPlayedOffset = this.currentTime;
            this._render();
            return this;
        }

        // TODO: figure out a way to record faster than playing
        // TODO: improve recording performance to increase frame rate
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
                this._publish("end", {movie: this, repeat: this.repeat});
                this._currentTime = 0;  // don't use setter
                this._publish("timeupdate", {movie: this});
                this._lastPlayed = performance.now();
                this._lastPlayedOffset = 0; // this.currentTime
                if (!this.repeat || this.recording) {
                    this._ended = true;
                    this.pause();   // clear paused switch and disable all layers
                }
                return;
            }

            // do render
            this._renderBackground(timestamp);
            let instantFullyLoaded = this._renderLayers(instant, timestamp);
            this._applyEffects();

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
                this.cctx.fillStyle = val(this.background, timestamp);
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
                        layer._active = false;
                    }
                    continue;
                }
                // if only rendering this frame, we are not "starting" the layer
                if (!layer.active && !instant) {
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
                            val(layer.x, reltime), val(layer.y, reltime), layer.canvas.width, layer.canvas.height
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

    // TODO: implement "layer masks", like GIMP
    // TODO: add aligning options, like horizontal and vertical align modes

    /**
     * All layers have a
     * - start time
     * - duration
     * - background color
     * - list of effects
     * - an "active" flag
     */
    class Base extends PubSub {
        /**
         * Creates a new empty layer
         *
         * @param {number} startTime - when to start the layer on the movie"s timeline
         * @param {number} duration - how long the layer should last on the movie"s timeline
         */
        constructor(startTime, duration, options={}) {  // rn, options isn't used but I'm keeping it here
            super();
            this._startTime = startTime;
            this._duration = duration;

            this._active = false;   // whether this layer is currently being rendered

            // on attach to movie
            this.subscribe("attach", event => {
                this._movie = event.movie;
            });
        }

        /** Generic step function */
        _render() {}

        get active () { return this._active; }  // readonly
        get startTime() { return this._startTime; }
        set startTime(val$$1) { this._startTime = val$$1; }
        get duration() { return this._duration; }
        set duration(val$$1) { this._duration = val$$1; }
    }

    /** Any layer that renders to a canvas */
    class Visual extends Base {
        /**
         * Creates a visual layer
         *
         * @param {number} startTime - when to start the layer on the movie"s timeline
         * @param {number} duration - how long the layer should last on the movie"s timeline
         * @param {number} [options.width=null] - the width of the entire layer
         * @param {number} [options.height=null] - the height of the entire layer
         * @param {object} [options] - various optional arguments
         * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
         * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
         * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
         *  for a transparent background
         * @param {object} [options.border=null] - the layer's outline, or <code>null</code> for no outline
         * @param {string} [options.border.color] - the outline's color; required for a border
         * @param {string} [options.border.thickness=1] - the outline's weight
         * @param {number} [options.opacity=1] - the layer's opacity; <code>1</cod> for full opacity
         *  and <code>0</code> for full transparency
         */
        constructor(startTime, duration, options={}) {
            super(startTime, duration, options);
            this.x = options.x || 0;    // IDEA: make these required arguments
            this.y = options.y || 0;
            this.width = options.width || null;
            this.height = options.height || null;

            this.effects = [];

            this.background = options.background || null;
            this.border = options.border || null;
            this.opacity = options.opacity || 1;

            this.canvas = document.createElement("canvas");
            this.cctx = this.canvas.getContext("2d");
        }

        /** Render visual output */
        _render(reltime) {
            this._beginRender(reltime);
            this._doRender(reltime);
            this._endRender(reltime);
        }
        _beginRender(reltime) {
            // if this.width or this.height is null, that means "take all available screen space", so set it to
            // this._move.width or this._movie.height, respectively
            this.canvas.width = val(this.width, reltime) || this._movie.width;
            this.canvas.height = val(this.height, reltime) || this._movie.height;
            this.cctx.globalAlpha = val(this.opacity, reltime);
        }
        _doRender(reltime) {
            // canvas.width & canvas.height are already interpolated
            this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height);      // (0, 0) relative to layer
            if (this.background) {
                this.cctx.fillStyle = val(this.background, reltime);
                this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height);  // (0, 0) relative to layer
            }
            if (this.border && this.border.color) {
                this.cctx.strokeStyle = val(this.border.color, reltime);
                this.cctx.lineWidth = val(this.border.thickness, reltime) || 1;    // this is optional
            }
        }
        _endRender() {
            if (this.canvas.width * this.canvas.height > 0) this._applyEffects();
            // else InvalidStateError for drawing zero-area image in some effects, right?
        }

        _applyEffects() {
            for (let i=0; i<this.effects.length; i++) {
                let effect = this.effects[i];
                effect.apply(this, this._movie.currentTime - this.startTime);   // pass relative time
            }
        }

        addEffect(effect) { this.effects.push(effect); return this; }
    }

    class Text extends Visual {
        // TODO: is textX necessary? it seems inconsistent, because you can't define width/height directly for a text layer
        /**
         * Creates a new text layer
         *
         * @param {number} startTime
         * @param {number} duration
         * @param {string} text - the text to display
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
         * @param {string} [options.font="10px sans-serif"]
         * @param {string} [options.color="#fff"]
         * //@param {number} [options.width=textWidth] - the value to override width with
         * //@param {number} [options.height=textHeight] - the value to override height with
         * @param {number} [options.textX=0] - the text's horizontal offset relative to the layer
         * @param {number} [options.textY=0] - the text's vertical offset relative to the layer
         * @param {number} [options.maxWidth=null] - the maximum width of a line of text
         * @param {string} [options.textAlign="start"] - horizontal align
         * @param {string} [options.textBaseline="top"] - vertical align
         * @param {string} [options.textDirection="ltr"] - the text direction
         * TODO: add padding options
         */
        constructor(startTime, duration, text, options={}) {
            options.background = options.background || null;
            super(startTime, duration, options);  // fill in zeros in |_doRender|

            this.text = text;
            this.font = options.font || "10px sans-serif";
            this.color = options.color || "#fff";
            this.textX = options.textX || 0;
            this.textY = options.textY || 0;
            this.maxWidth = options.maxWidth || null;
            this.textAlign = options.textAlign || "start";
            this.textBaseline = options.textBaseline || "top";
            this.textDirection = options.textDirection || "ltr";

            // this._prevText = undefined;
            // // because the canvas context rounds font size, but we need to be more accurate
            // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
            // this._lastFont = undefined;
            // this._prevMaxWidth = undefined;
        }

        _doRender(reltime) {
            super._doRender(reltime);
            const text = val(this.text, reltime), font = val(this.font, reltime),
                maxWidth = this.maxWidth ? val(this.maxWidth, reltime) : undefined;
            // // properties that affect metrics
            // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
            //     this._updateMetrics(text, font, maxWidth);

            this.cctx.font = font;
            this.cctx.fillStyle = val(this.color, reltime);
            this.cctx.textAlign = val(this.textAlign, reltime);
            this.cctx.textBaseline = val(this.textBaseline, reltime);
            this.cctx.textDirection = val(this.textDirection, reltime);
            this.cctx.fillText(
                text, val(this.textX, reltime), val(this.textY, reltime),
                maxWidth
            );

            this._prevText = text;
            this._prevFont = font;
            this._prevMaxWidth = maxWidth;
        }

        // _updateMetrics(text, font, maxWidth) {
        //     // TODO calculate / measure for non-integer font.size values
        //     let metrics = Text._measureText(text, font, maxWidth);
        //     // TODO: allow user-specified/overwritten width/height
        //     this.width = /*this.width || */metrics.width;
        //     this.height = /*this.height || */metrics.height;
        // }

        // TODO: implement setters and getters that update dimensions!

        /*static _measureText(text, font, maxWidth) {
            // TODO: fix too much bottom padding
            const s = document.createElement("span");
            s.textContent = text;
            s.style.font = font;
            s.style.padding = "0";
            if (maxWidth) s.style.maxWidth = maxWidth;
            document.body.appendChild(s);
            const metrics = {width: s.offsetWidth, height: s.offsetHeight};
            document.body.removeChild(s);
            return metrics;
        }*/
    }

    class Image extends Visual {
        /**
         * Creates a new image layer
         *
         * @param {number} startTime
         * @param {number} duration
         * @param {HTMLImageElement} media
         * @param {object} [options]
         * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
         * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
         * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
         *  for a transparent background
         * @param {object} [options.border=null] - the layer"s outline, or <code>null</code> for no outline
         * @param {string} [options.border.color] - the outline"s color; required for a border
         * @param {string} [options.border.thickness=1] - the outline"s weight
         * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
         *  and <code>0</code> for full transparency
         * @param {number} [options.clipX=0] - where to place the left edge of the image
         * @param {number} [options.clipY=0] - where to place the top edge of the image
         * @param {number} [options.clipWidth=0] - where to place the right edge of the image
         *  (relative to <code>options.clipX</code>)
         * @param {number} [options.clipHeight=0] - where to place the top edge of the image
         *  (relative to <code>options.clipY</code>)
         * @param {number} [options.imageX=0] - where to place the image horizonally relative to the layer
         * @param {number} [options.imageY=0] - where to place the image vertically relative to the layer
         */
        constructor(startTime, duration, image, options={}) {
            super(startTime, duration, options);    // wait to set width & height
            this.image = image;
            // clipX... => how much to show of this.image
            this.clipX = options.clipX || 0;
            this.clipY = options.clipY || 0;
            this.clipWidth = options.clipWidth;
            this.clipHeight = options.clipHeight;
            // imageX... => how to project this.image onto the canvas
            this.imageX = options.imageX || 0;
            this.imageY = options.imageY || 0;

            const load = () => {
                this.width = this.imageWidth = this.width || this.image.width;
                this.height = this.imageHeight = this.height || this.image.height;
                this.clipWidth = this.clipWidth || image.width;
                this.clipHeight = this.clipHeight || image.height;
            };
            if (image.complete) load();
            else image.addEventListener("load", load);
        }

        _doRender(reltime) {
            super._doRender(reltime);  // clear/fill background
            this.cctx.drawImage(
                this.image,
                val(this.clipX, reltime), val(this.clipY, reltime),
                val(this.clipWidth, reltime), val(this.clipHeight, reltime),
                // this.imageX and this.imageY are relative to layer
                val(this.imageX, reltime), val(this.imageY, reltime),
                val(this.imageWidth, reltime), val(this.imageHeight, reltime)
            );
        }
    }

    /**
     * Any layer that has audio extends this class;
     * Audio and video
     *
     * Special class that is the second super in a diamond inheritance pattern.
     * No need to extend BaseLayer, because the prototype is already handled by the calling class.
     * The calling class will use these methods using `Media.{method name}.call(this, {args...})`.
     */
    class Media {
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
        constructor_(startTime, media, onload, options={}) {
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
            // TODO: on unattach?
            this.subscribe("audiodestinationupdate", event => {
                // reset destination
                this.source.disconnect();
                this.source.connect(event.destination);
            });
            this.subscribe("start", () => {
                this.media.currentTime = this._movie.currentTime + this.mediaStartTime;
                this.media.play();
            });
            this.subscribe("stop", () => {
                this.media.pause();
            });
        }

        _render(reltime) {
            // even interpolate here
            this.media.muted = val(this.muted, reltime);
            this.media.volume = val(this.volume, reltime);
            this.media.speed = val(this.speed, reltime);
        }

        get startTime() { return this._startTime; }
        set startTime(val$$1) {
            super.startTime = val$$1;
            let mediaProgress = this._movie.currentTime - this.startTime;
            this.media.currentTime = mediaProgress + this.mediaStartTime;
        }

        set mediaStartTime(val$$1) {
            this._mediaStartTime = val$$1;
            let mediaProgress = this._movie.currentTime - this.startTime;
            this.media.currentTime = mediaProgress + this.mediaStartTime;
        }
        get mediaStartTime() { return this._mediaStartTime; }
    }
    // use mixins instead of `extend`ing two classes (which doens't work); see below class def
    class Video extends Visual {
        /**
         * Creates a new video layer
         *
         * @param {number} startTime
         * @param {HTMLVideoElement} media
         * @param {object} [options]
         * @param {number} startTime
         * @param {HTMLVideoElement} media
         * @param {object} [options]
         * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
         * @param {numer} [options.duration=media.duration-options.mediaStartTime]
         * @param {boolean} [options.muted=false]
         * @param {number} [options.volume=1]
         * @param {number} [options.speed=1] - the audio's playerback rate
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
            // fill in the zeros once loaded
            super(startTime, 0, options);
            // a DIAMOND super!!                                using function to prevent |this| error
            Media.prototype.constructor_.call(this, startTime, media, function(media, options) {
                // by default, the layer size and the video output size are the same
                this.width = this.mediaWidth = options.width || media.videoWidth;
                this.height = this.mediaHeight = options.height || media.videoHeight;
                this.clipWidth = options.clipWidth || media.videoWidth;
                this.clipHeight = options.clipHeight || media.videoHeight;
            }, options);
            // clipX... => how much to show of this.media
            this.clipX = options.clipX || 0;
            this.clipY = options.clipY || 0;
            // mediaX... => how to project this.media onto the canvas
            this.mediaX = options.mediaX || 0;
            this.mediaY = options.mediaY || 0;
        }

        _doRender(reltime) {
            super._doRender();
            this.cctx.drawImage(this.media,
                val(this.clipX, reltime), val(this.clipY, reltime),
                val(this.clipWidth, reltime), val(this.clipHeight, reltime),
                val(this.mediaX, reltime), val(this.mediaY, reltime),    // relative to layer
                val(this.mediaWidth, reltime), val(this.mediaHeight, reltime));
        }

        // "inherited" from Media (TODO!: find a better way to mine the diamond pattern)
        // GET RID OF THIS PATTERN!! This is **ugly**!!
        get startTime() {
            return Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
                .get.call(this);
        }
        set startTime(val$$1) {
            Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
                .set.call(this, val$$1);
        }
        get mediaStartTime() {
            return Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
                .get.call(this);
        }
        set mediaStartTime(val$$1) {
            Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
                .set.call(this, val$$1);
        }
    }

    class Audio extends Base {
        /**
         * Creates an audio layer
         *
         * @param {number} startTime
         * @param {HTMLAudioElement} media
         * @param {object} [options]
         * @param {number} startTime
         * @param {HTMLVideoElement} media
         * @param {object} [options]
         * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
         * @param {numer} [options.duration=media.duration-options.mediaStartTime]
         * @param {boolean} [options.muted=false]
         * @param {number} [options.volume=1]
         * @param {number} [options.speed=1] - the audio's playerback rate
         */
        constructor(startTime, media, options={}) {
            // fill in the zero once loaded, no width or height (will raise error)
            super(startTime, 0, -1, -1, options);   // TODO: -1 or 0?
            Media.prototype.constructor_.call(this, startTime, media, null, options);
        }

        /* Do not render anything */
        _beginRender() {}
        _doRender() {}
        _endRender() {}

        // "inherited" from Media (TODO!: find a better way to mine the diamond pattern)
        // GET RID OF THIS PATTERN!! This is **ugly**!!
        get startTime() {
            return Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
                .get.call(this);
        }
        set startTime(val$$1) {
            Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
                .set.call(this, val$$1);
        }
        get mediaStartTime() {
            return Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
                .get.call(this);
        }
        set mediaStartTime(val$$1) {
            Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
                .set.call(this, val$$1);
        }
    }

    var layers = /*#__PURE__*/Object.freeze({
        Base: Base,
        Visual: Visual,
        Text: Text,
        Image: Image,
        Media: Media,
        Video: Video,
        Audio: Audio
    });

    // TODO: investigate why an effect might run once in the beginning even if its layer isn't at the beginning

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

    /**
     * Any effect that modifies the visual contents of a layer.
     *
     * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
     * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
     * different module.</em>
     */
    class Base$1 {
        // subclasses must implement apply
        apply(target, time) {
            throw "No overriding method found or super.apply was called";
        }
    }

    /* COLOR & TRANSPARENCY */
    /** Changes the brightness */
    class Brightness extends Base$1 {
        constructor(brightness=1.0) {
            super();
            this.brightness = brightness;
        }
        apply(target, time) {
            const brightness = val(this.brightness, time);
            map((data, start) => {
                for (let i=0; i<3; i++) data[start+i] *= brightness;
            }, target.canvas, target.cctx);
        }
    }

    /** Changes the contrast */
    class Contrast extends Base$1 {
        constructor(contrast=1.0) {
            super();
            this.contrast = contrast;
        }
        apply(target, time) {
            const contrast = val(this.contrast, time);
            map((data, start) => {
                for (let i=0; i<3; i++) data[start+i] = contrast * (data[start+i] - 128) + 128;
            }, target.canvas, target.cctx);
        }
    }

    /**
     * Multiplies each channel by a different constant
     */
    class Channels extends Base$1 {
        constructor(factors) {
            super();
            this.factors = factors;
        }
        apply(target, time) {
            const factors = val(this.factors, time);
            if (factors.a > 1 || (factors.r < 0 || factors.g < 0 || factors.b < 0 || factors.a < 0))
                throw "Invalid channel factors";
            map((data, start) => {
                data[start+0] *= factors.r || 1;    // do default's here to account for keyframes
                data[start+1] *= factors.g || 1;
                data[start+2] *= factors.b || 1;
                data[start+3] *= factors.a || 1;
            }, target.canvas, target.cctx);
        }
    }

    /**
     * Reduces alpha for pixels which, by some criterion, are close to a specified target color
     */
    class ChromaKey extends Base$1 {
        /**
         * @param {Color} [target={r: 0, g: 0, b: 0}] - the color to target
         * @param {number} [threshold=0] - how much error is allowed
         * @param {boolean|function} [interpolate=null] - the function used to interpolate the alpha channel,
         *  creating an anti-aliased alpha effect, or a falsy value for no smoothing (i.e. 255 or 0 alpha)
         * (@param {number} [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable)
         */
        // TODO: use smoothingSharpness
        constructor(targetColor={r: 0, g: 0, b: 0}, threshold=0, interpolate=null/*, smoothingSharpness=0*/) {
            super();
            this.targetColor = target;
            this.threshold = threshold;
            this.interpolate = interpolate;
            // this.smoothingSharpness = smoothingSharpness;
        }
        apply(target, time) {
            const targetColor = val(this.targetColor, time), threshold = val(this.threshold, time),
                interpolate = val(this.interpolate, time),
                smoothingSharpness = val(this.smoothingSharpness, time);
            map((data, start) => {
                let r = data[start+0];
                let g = data[start+1];
                let b = data[start+2];
                if (!interpolate) {
                    // standard dumb way that most video editors probably do it (all-or-nothing method)
                    let transparent = (Math.abs(r - targetColor.r) <= threshold)
                        && (Math.abs(g - targetColor.g) <= threshold)
                        && (Math.abs(b - targetColor.b) <= threshold);
                    if (transparent) data[start+3] = 0;
                } else {
                    /*
                        better way IMHO:
                        Take the average of the absolute differences between the pixel and the target for each channel
                    */
                    let dr = Math.abs(r - targetColor.r);
                    let dg = Math.abs(g - targetColor.g);
                    let db = Math.abs(b - targetColor.b);
                    let transparency = (dr + dg + db) / 3;
                    transparency = interpolate(0, 255, transparency/255);  // TODO: test
                    data[start+3] = transparency;
                }
            }, target.canvas, target.cctx);
        }
    }

    /* BLUR */
    // TODO: make sure this is truly gaussian even though it doens't require a standard deviation
    // TODO: improve performance and/or make more powerful
    /** Applies a Guassian blur */
    class GuassianBlur extends Base$1 {
        constructor(radius) {
            if (radius % 2 !== 1 || radius <= 0) throw "Radius should be an odd natural number";
            super();
            this.radius = radius;
            // TODO: get rid of tmpCanvas and just take advantage of image data's immutability
            this._tmpCanvas = document.createElement("canvas");
            this._tmpCtx = this._tmpCanvas.getContext("2d");
        }
        apply(target, time) {
            if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
            if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
            const radius = val(this.radius, time);

            let imageData = target.cctx.getImageData(0, 0, target.canvas.width, target.canvas.height);
            let tmpImageData = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
            // only one dimension (either x or y) of the kernel
            let kernel = gen1DKernel(Math.round(radius));
            let kernelStart = -(radius-1) / 2, kernelEnd = -kernelStart;
            // vertical pass
            for (let x=0; x<this._tmpCanvas.width; x++) {
                for (let y=0; y<this._tmpCanvas.height; y++) {
                    let r=0, g=0, b=0, a=imageData.data[4*(this._tmpCanvas.width*y+x)+3];
                    // apply kernel
                    for (let kernelY=kernelStart; kernelY<=kernelEnd; kernelY++) {
                        if (y+kernelY >= this._tmpCanvas.height) break;
                        let kernelIndex = kernelY - kernelStart; // actual array index (not y-coordinate)
                        let weight = kernel[kernelIndex];
                        let ki = 4*(this._tmpCanvas.width*(y+kernelY)+x);
                        r += weight * imageData.data[ki + 0];
                        g += weight * imageData.data[ki + 1];
                        b += weight * imageData.data[ki + 2];
                    }
                    let i = 4*(this._tmpCanvas.width*y+x);
                    tmpImageData.data[i + 0] = r;
                    tmpImageData.data[i + 1] = g;
                    tmpImageData.data[i + 2] = b;
                    tmpImageData.data[i + 3] = a;
                }
            }
            imageData = tmpImageData;   // pipe the previous ouput to the input of the following code
            tmpImageData = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);    // create new output space
            // horizontal pass
            for (let y=0; y<this._tmpCanvas.height; y++) {
                for (let x=0; x<this._tmpCanvas.width; x++) {
                    let r=0, g=0, b=0, a=imageData.data[4*(this._tmpCanvas.width*y+x)+3];
                    // apply kernel
                    for (let kernelX=kernelStart; kernelX<=kernelEnd; kernelX++) {
                        if (x+kernelX >= this._tmpCanvas.width) break;
                        let kernelIndex = kernelX - kernelStart; // actual array index (not y-coordinate)
                        let weight = kernel[kernelIndex];
                        let ki = 4 * (this._tmpCanvas.width*y+(x+kernelX));
                        r += weight * imageData.data[ki + 0];
                        g += weight * imageData.data[ki + 1];
                        b += weight * imageData.data[ki + 2];
                    }
                    let i = 4*(this._tmpCanvas.width*y+x);
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
    /**
     * Transforms a layer or movie using a transformation matrix. Use {@link Transform.Matrix}
     * to either A) calculate those values based on a series of translations, scalings and rotations)
     * or B) input the matrix values directly, using the optional argument in the constructor.
     */
    class Transform {
        /**
         * @param {Transform.Matrix} matrix - how to transform the target
         */
        constructor(matrix) {
            this.matrix = matrix;
            this._tmpMatrix = new Transform.Matrix();
            this._tmpCanvas = document.createElement("canvas");
            this._tmpCtx = this._tmpCanvas.getContext("2d");
        }

        apply(target, time) {
            if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
            if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
            this._tmpMatrix.data = val(this.matrix.data, time); // use data, since that's the underlying storage

            this._tmpCtx.setTransform(
                this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c,
                this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f
            );
            this._tmpCtx.drawImage(target.canvas, 0, 0);
            // Assume it was identity for now
            this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1);
            target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
            target.cctx.drawImage(this._tmpCanvas, 0, 0);
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
        cell(x, y, val$$1) {
            if (val$$1 !== undefined) this.data[3*y + x] = val$$1;
            return this.data[3*y + x];
        }

        /* For canvas context setTransform */
        get a() { return this.data[0]; }
        get b() { return this.data[3]; }
        get c() { return this.data[1]; }
        get d() { return this.data[4]; }
        get e() { return this.data[2]; }
        get f() { return this.data[5]; }

        /** Combines <code>this</code> with another matrix <code>other</code> */
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

        /**
         * @param {number} a - the angle or rotation in radians
         */
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

    // TODO: layer masks will make much more complex masks possible
    /** Preserves an ellipse of the layer and clears the rest */
    class EllipticalMask extends Base$1 {
        constructor(x, y, radiusX, radiusY, rotation=0, startAngle=0, endAngle=2*Math.PI, anticlockwise=false) {
            super();
            this.x = x;
            this.y = y;
            this.radiusX = radiusX;
            this.radiusY = radiusY;
            this.rotation = rotation;
            this.startAngle = startAngle;
            this.endAngle = endAngle;
            this.anticlockwise = anticlockwise;
            // for saving image data before clearing
            this._tmpCanvas = document.createElement("canvas");
            this._tmpCtx = this._tmpCanvas.getContext("2d");
        }
        apply(target, time) {
            const ctx = target.cctx, canvas = target.canvas;
            const x = val(this.x, time), y = val(this.y, time),
                radiusX = val(this.radiusX, time), radiusY = val(this.radiusY, time),
                rotation = val(this.rotation, time),
                startAngle = val(this.startAngle, time), endAngle = val(this.endAngle, time),
                anticlockwise = val(this.anticlockwise, time);
            this._tmpCanvas.width = target.canvas.width;
            this._tmpCanvas.height = target.canvas.height;
            this._tmpCtx.drawImage(canvas, 0, 0);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();  // idk how to preserve clipping state without save/restore
            // create elliptical path and clip
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);
            ctx.closePath();
            ctx.clip();
            // render image with clipping state
            ctx.drawImage(this._tmpCanvas, 0, 0);
            ctx.restore();
        }
    }

    var effects = /*#__PURE__*/Object.freeze({
        Base: Base$1,
        Brightness: Brightness,
        Contrast: Contrast,
        Channels: Channels,
        ChromaKey: ChromaKey,
        GuassianBlur: GuassianBlur,
        Transform: Transform,
        EllipticalMask: EllipticalMask
    });

    /* The entry point */

    var index = {
        Movie: Movie,
        layer: layers,
        effect: effects,
        ...util
    };

    return index;

}());
