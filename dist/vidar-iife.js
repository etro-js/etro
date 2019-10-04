var vd = (function () {
    'use strict';

    const listeners = new WeakMap();

    class TypeId {
        constructor(id) {
            this.parts = id.split(".");
        }

        contains(other) {
            if (other.length > this.length) {
                return false;
            }

            for (let i = 0; i < other.parts.length; i++) {
                if (other.parts[i] !== this.parts[i]) {
                    return false;
                }
            }
            return true;
        }

        toString() {
            return this.parts.join(".");
        }
    }

    /**
     * Emits an event to all listeners
     *
     * @param {object} target - a Vidar object
     * @param {string} type - the id of the type (can contain subtypes, such as "type.subtype")
     * @param {function} listener
     */
    function subscribe(target, type, listener) {
        if (!listeners.has(target))
            listeners.set(target, []);

        listeners.get(target).push(
            {type: new TypeId(type), listener}
        );
    }

    /**
     * Emits an event to all listeners
     *
     * @param {object} target - a Vidar object
     * @param {string} type - the id of the type (can contain subtypes, such as "type.subtype")
     * @param {object} event - any additional event data
     */
    function _publish(target, type, event) {
        event.target = target;  // could be a proxy
        event.type = type;

        const t = new TypeId(type);

        if (!listeners.has(target))
            return;

        const listenersForType = [];
        for (let i = 0; i < listeners.get(target).length; i++) {
            let item = listeners.get(target)[i];
            if (t.contains(item.type))
                listenersForType.push(item.listener);
        }

        for (let i = 0; i < listenersForType.length; i++) {
            let listener = listenersForType[i];
            listener(event);
        }
    }

    var event = /*#__PURE__*/Object.freeze({
        subscribe: subscribe,
        _publish: _publish
    });

    // TODO: make methods like getDefaultOptions private
    /**
     * Merges `options` with `defaultOptions`, and then copies the properties with the keys in `defaultOptions`
     *  from the merged object to `destObj`.
     *
     * @return {undefined}
     */
    function applyOptions(options, destObj) {
        let defaultOptions = destObj.getDefaultOptions();

        // validate; make sure `keys` doesn't have any extraneous items
        for (let option in options) {
            if (!defaultOptions.hasOwnProperty(option)) throw "Invalid option: '" + option + "'";
        }

        // merge options and defaultOptions
        options = {...defaultOptions, ...options};

        // copy options
        for (let option in options) {
            if (!(option in destObj)) {
                destObj[option] = options[option];
            }
        }
    }

    // https://stackoverflow.com/a/8024294/3783155
    /**
     * Get all inherited keys
     * @param {object} obj
     * @param {boolean} excludeObjectClass - don't add properties of the <code>Object</code> prototype
     */
    function getAllPropertyNames(obj, excludeObjectClass) {
        let props = [];
        do {
            props = props.concat(Object.getOwnPropertyNames(obj));
        } while ((obj = Object.getPrototypeOf(obj)) && (excludeObjectClass ? obj.constructor.name !== "Object" : true));
        return props;
    }

    /**
     * @return {boolean} <code>true</code> if <code>property</code> is a non-array object and all of its own
     *  property keys are numbers or <code>"interpolate"</code> or <code>"interpolationKeys"</code>, and
     * <code>false</code>  otherwise.
     */
    function isKeyFrames(property) {
        if ((typeof property !== "object" || property === null) || Array.isArray(property)) return false;
        // is reduce slow? I think it is
        // let keys = Object.keys(property);   // own propeties
        let keys = getAllPropertyNames(property, true);    // includes non-enumerable properties (except that of `Object`)
        for (let i=0; i<keys.length; i++) {
            let key = keys[i];
            // convert key to number, because object keys are always converted to strings
            if (isNaN(key) && !(key === "interpolate" || key === "interpolationKeys"))
                return false;
        }
        // If it's an empty object, don't treat is as keyframe set.
        // https://stackoverflow.com/a/32108184/3783155
        let isEmpty = property.constructor === Object && Object.entries(property).length === 0;
        return !isEmpty;
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
    function val(property, element, time) {
        if (isKeyFrames(property)) {
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
            // TODO: support custom interpolation for 'other' types
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
        } else if (typeof property == "function") {
            return property(element, time);  // TODO? add more args
        } else {
            return property; // "primitive" value
        }
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

    // https://stackoverflow.com/a/19366389/3783155
    function memoize(factory, ctx) {
        let cache = {};
        return key => {
            if (!(key in cache)) cache[key] = factory.call(ctx, key);
            return cache[key];
        };
    }
    /**
     * Converts a CSS color string to a <code>Color</code> object representation.
     * Mostly used in keyframes and image processing effects.
     * @param {string} str
     * @return {object} the parsed color
     */
    const parseColor = (function() {
        let canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        let ctx = canvas.getContext("2d");
        // TODO - find a better way to cope with the fact that invalid
        //        values of "col" are ignored
        return memoize(str => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = str;
            ctx.fillRect(0, 0, 1, 1);
            return new Color(...ctx.getImageData(0, 0, 1, 1).data);
        });
    })();

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

    // TODO: remove this function
    function mapPixels(mapper, canvas, ctx, x, y, width, height, flush=true) {
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
     * <p>Emit "change" event when direct public properties updated. Should be called after
     * all prototype methods are defined in class and after all public properties are
     * initialized in constructor.
     * <p>Must be called before any watchable properties are set.
     *
     * @param {object} target - object to watch
     */
    // TODO: watch recursively, like arrays and custom objects
    function watchPublic(target) {
        const getPath = (obj, prop) =>
            (obj === target ? "" : (target.__watchPublicPath + ".")) + prop;

        const callback = function(obj, prop, val) {
            // Public API property updated, emit 'modify' event.
            _publish(proxy, `${obj._type}.change.modify`, {property: getPath(obj, prop), newValue: val});
        };
        const check = prop => !(prop.startsWith("_") || target._publicExcludes.includes(prop));

        const handler = {
            set(obj, prop, val) {
                // Recurse
                if (typeof val === "object" && val !== null && !val.__watchPublicPath && check(prop)) {
                    val = new Proxy(val, handler);
                    val.__watchPublicPath = getPath(obj, prop);
                }

                const was = prop in obj;
                obj[prop] = val;
                // Check if it already existed and if it's a valid property to watch, if on root object
                if (obj !== target || (was && check(prop)))
                    callback(obj, prop, val);
                return true;
            }
        };

        const proxy = new Proxy(target, handler);
        return proxy;
    }

    var util = /*#__PURE__*/Object.freeze({
        applyOptions: applyOptions,
        val: val,
        linearInterp: linearInterp,
        cosineInterp: cosineInterp,
        Color: Color,
        parseColor: parseColor,
        Font: Font,
        parseFont: parseFont,
        mapPixels: mapPixels,
        watchPublic: watchPublic
    });

    // NOTE: The `options` argument is for optional arguments :]
    // TODO: make record option to make recording video output to the user while it's recording

    /**
     * Contains all layers and movie information
     * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
     *
     * TODO: implement event "durationchange", and more
     * TODO: add width and height options
     */
    class Movie {
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

    // TODO: implement "layer masks", like GIMP
    // TODO: add aligning options, like horizontal and vertical align modes

    /**
     * All layers have a
     * - start time
     * - duration
     * - list of effects
     * - an "active" flag
     */
    class Base {
        /**
         * Creates a new empty layer
         *
         * @param {number} startTime - when to start the layer on the movie"s timeline
         * @param {number} duration - how long the layer should last on the movie"s timeline
         */
        constructor(startTime, duration, options={}) {  // rn, options isn't used but I'm keeping it here
            const newThis = watchPublic(this);  // proxy that will be returned by constructor
            // Don't send updates when initializing, so use this instead of newThis:
            applyOptions(options, this);  // no options rn, but just to stick to protocol

            this._startTime = startTime;
            this._duration = duration;

            this._active = false;   // whether newThis layer is currently being rendered

            // on attach to movie
            subscribe(newThis, "layer.attach", event => {
                newThis._movie = event.movie;
            });

            // Propogate up to target
            subscribe(newThis, "layer.change", event => {
                const typeOfChange = event.type.substring(event.type.lastIndexOf(".") + 1);
                const type = `movie.change.layer.${typeOfChange}`;
                _publish(newThis._movie, type, {...event, target: newThis._movie, source: event.source || newThis, type});
            });

            return newThis;
        }

        /** Generic step function */
        _render() {}

        get _parent() { return this._movie; }

        get active () { return this._active; }  // readonly
        get startTime() { return this._startTime; }
        set startTime(val) { this._startTime = val; }
        get duration() { return this._duration; }
        set duration(val) { this._duration = val; }
    }
    // id for events (independent of instance, but easy to access when on prototype chain)
    Base.prototype._type = "layer";

    Base.prototype.getDefaultOptions = function() {
        return {};
    };
    Base.prototype._publicExcludes = [];

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
            // only validate extra if not subclassed, because if subclcass, there will be extraneous options
            applyOptions(options, this);

            this._canvas = document.createElement("canvas");
            this._cctx = this.canvas.getContext("2d");

            this._effectsBack = [];
            let that = this;
            this._effects = new Proxy(this._effectsBack, {
                apply: function(target, thisArg, argumentsList) {
                    return thisArg[target].apply(this, argumentsList);
                },
                deleteProperty: function(target, property) {
                    return true;
                },
                set: function(target, property, value, receiver) {
                    target[property] = value;
                    if (!isNaN(property)) {  // if property is an number (index)
                        _publish(value, "effect.attach", {source: that});
                    }
                    return true;
                }
            });
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
            let w = val(this.width || this._movie.width, this, reltime),
                h = val(this.height || this._movie.height, this, reltime);
            this.canvas.width = w;
            this.canvas.height = h;
            this.cctx.globalAlpha = val(this.opacity, this, reltime);
        }
        _doRender(reltime) {
            // if this.width or this.height is null, that means "take all available screen space", so set it to
            // this._move.width or this._movie.height, respectively
            // canvas.width & canvas.height are already interpolated
            if (this.background) {
                this.cctx.fillStyle = val(this.background, this, reltime);
                this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height);  // (0, 0) relative to layer
            }
            if (this.border && this.border.color) {
                this.cctx.strokeStyle = val(this.border.color, this, reltime);
                this.cctx.lineWidth = val(this.border.thickness, this, reltime) || 1;    // this is optional.. TODO: integrate this with defaultOptions
            }
        }
        _endRender(reltime) {
            let w = val(this.width || this._movie.width, this, reltime),
                h = val(this.height || this._movie.height, this, reltime);
            if (w * h > 0)
                this._applyEffects();
            // else InvalidStateError for drawing zero-area image in some effects, right?
        }

        _applyEffects() {
            for (let i=0; i<this.effects.length; i++) {
                let effect = this.effects[i];
                effect.apply(this, this._movie.currentTime - this.startTime);   // pass relative time
            }
        }

        addEffect(effect) { this.effects.push(effect); return this; }

        get canvas() {
            return this._canvas;
        }
        get cctx() {
            return this._cctx;
        }

        get effects() {
            return this._effects;    // priavte (because it's a proxy)
        }
    }
    // TODO: move these inside class declaration?
    Visual.prototype.getDefaultOptions = function() {
        return {
            ...Base.prototype.getDefaultOptions(),
            x: 0, y: 0, width: null, height: null, background: null, border: null, opacity: 1
        };
    };
    Visual.prototype._publicExcludes = Base.prototype._publicExcludes.concat(["canvas", "cctx", "effects"]);

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
            //                          default to no (transparent) background
            super(startTime, duration, {background: null, ...options});  // fill in zeros in |_doRender|
            applyOptions(options, this);

            this.text = text;

            // this._prevText = undefined;
            // // because the canvas context rounds font size, but we need to be more accurate
            // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
            // this._lastFont = undefined;
            // this._prevMaxWidth = undefined;
        }

        _doRender(reltime) {
            super._doRender(reltime);
            const text = val(this.text, this, reltime), font = val(this.font, this, reltime),
                maxWidth = this.maxWidth ? val(this.maxWidth, this, reltime) : undefined;
            // // properties that affect metrics
            // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
            //     this._updateMetrics(text, font, maxWidth);

            this.cctx.font = font;
            this.cctx.fillStyle = val(this.color, this, reltime);
            this.cctx.textAlign = val(this.textAlign, this, reltime);
            this.cctx.textBaseline = val(this.textBaseline, this, reltime);
            this.cctx.textDirection = val(this.textDirection, this, reltime);
            this.cctx.fillText(
                text, val(this.textX, this, reltime), val(this.textY, this, reltime),
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
    Text.prototype.getDefaultOptions = function() {
        return {
            ...Visual.prototype.getDefaultOptions(),
            background: null,
            font: "10px sans-serif", color: "#fff",
            textX: 0, textY: 0, maxWidth: null,
            textAlign: "start", textBaseline: "top", textDirection: "ltr"
        };
    };

    class Image extends Visual {
        /**
         * Creates a new image layer
         *
         * @param {number} startTime
         * @param {number} duration
         * @param {HTMLImageElement} image
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
            applyOptions(options, this);
            // clipX... => how much to show of this.image
            // imageX... => how to project this.image onto the canvas
            this._image = image;

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
                val(this.clipX, this, reltime), val(this.clipY, this, reltime),
                val(this.clipWidth, this, reltime), val(this.clipHeight, this, reltime),
                // this.imageX and this.imageY are relative to layer
                val(this.imageX, this, reltime), val(this.imageY, this, reltime),
                val(this.imageWidth, this, reltime), val(this.imageHeight, this, reltime)
            );
        }

        get image() { return this._image; }
    }
    Image.prototype.getDefaultOptions = function() {
        return {
            ...Visual.prototype.getDefaultOptions(),
            clipX: 0, clipY: 0, clipWidth: undefined, clipHeight: undefined, imageX: 0, imageY: 0
        };
    };

    /**
     * Any layer that can be <em>played</em> individually extends this class;
     * Audio and Video
     */
    // https://web.archive.org/web/20190111044453/http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
    // TODO: implement playback rate
    const MediaMixin = superclass => {
        if (superclass !== Base && superclass !== Visual) {
            throw "Media can only extend Base and Visual";
        }

        class Media extends superclass {
            /**
             * @param {number} startTime
             * @param {HTMLVideoElement} media
             * @param {object} [options]
             * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
             * @param {numer} [options.duration=media.duration-options.mediaStartTime]
             * @param {boolean} [options.muted=false]
             * @param {number} [options.volume=1]
             * @param {number} [options.playbackRate=1]
             */
            constructor(startTime, media, onload, options={}) {
                super(startTime, 0, options);   // works with both Base and Visual
                this._initialized = false;
                this._media = media;
                this._mediaStartTime = options.mediaStartTime || 0;
                applyOptions(options, this);

                const load = () => {
                    // TODO:              && ?
                    if ((options.duration || (media.duration-this.mediaStartTime)) < 0)
                        throw "Invalid options.duration or options.mediaStartTime";
                    this.duration = options.duration || (media.duration-this.mediaStartTime);
                    // onload will use `this`, and can't bind itself because it's before super()
                    onload && onload.bind(this)(media, options);
                };
                if (media.readyState >= 2) load(); // this frame's data is available now
                else media.addEventListener("canplay", load);    // when this frame's data is available

                subscribe(this, "layer.attach", event => {
                    subscribe(event.movie, "movie.seek", event => {
                        let time = event.movie.currentTime;
                        if (time < this.startTime || time >= this.startTime + this.duration) return;
                        this.media.currentTime = time - this.startTime;
                    });
                    // connect to audiocontext
                    this._source = event.movie.actx.createMediaElementSource(this.media);
                    this.source.connect(event.movie.actx.destination);
                });
                // TODO: on unattach?
                subscribe(this, "movie.audiodestinationupdate", event => {
                    // reset destination
                    this.source.disconnect();
                    this.source.connect(event.destination);
                });
                subscribe(this, "layer.start", () => {
                    this.media.currentTime = this.mediaStartTime;
                    this.media.play();
                });
                subscribe(this, "layer.stop", () => {
                    this.media.pause();
                });
            }

            _render(reltime) {
                super._render(reltime);
                // even interpolate here
                // TODO: implement Issue: Create built-in audio node to support built-in audio nodes, as this does nothing rn
                this.media.muted = val(this.muted, this, reltime);
                this.media.volume = val(this.volume, this, reltime);
                this.media.playbackRate = val(this.playbackRate, this, reltime);
            }

            get media() { return this._media; }
            get source() { return this._source; }

            get startTime() { return this._startTime; }
            set startTime(val) {
                this._startTime = val;
                if (this._initialized) {
                    let mediaProgress = this._movie.currentTime - this.startTime;
                    this.media.currentTime = this.mediaStartTime + mediaProgress;
                }
            }

            set mediaStartTime(val) {
                this._mediaStartTime = val;
                if (this._initialized) {
                    let mediaProgress = this._movie.currentTime - this.startTime;
                    this.media.currentTime = mediaProgress + this.mediaStartTime;
                }
            }
            get mediaStartTime() { return this._mediaStartTime; }
        }    Media.prototype.getDefaultOptions = function() {
            return {
                ...superclass.prototype.getDefaultOptions(),
                mediaStartTime: 0, duration: undefined, // important to include undefined keys, for applyOptions
                muted: false, volume: 1, playbackRate: 1
            };
        };

        return Media;   // custom mixin class
    };

    // use mixins instead of `extend`ing two classes (which doens't work); see below class def
    class Video extends MediaMixin(Visual) {
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
            super(startTime, media, function() {
                this.width = this.mediaWidth = options.width || media.videoWidth;
                this.height = this.mediaHeight = options.height || media.videoHeight;
                this.clipWidth = options.clipWidth || media.videoWidth;
                this.clipHeight = options.clipHeight || media.videoHeight;
            }, options);
            // clipX... => how much to show of this.media
            // mediaX... => how to project this.media onto the canvas
            applyOptions(options, this);
            if (this.duration === undefined) this.duration = media.duration - this.mediaStartTime;
        }

        _doRender(reltime) {
            super._doRender();
            this.cctx.drawImage(this.media,
                val(this.clipX, this, reltime), val(this.clipY, this, reltime),
                val(this.clipWidth, this, reltime), val(this.clipHeight, this, reltime),
                val(this.mediaX, this, reltime), val(this.mediaY, this, reltime),    // relative to layer
                val(this.mediaWidth, this, reltime), val(this.mediaHeight, this, reltime));
        }
    }
    Video.prototype.getDefaultOptions = function() {
        return {
            ...Object.getPrototypeOf(this).getDefaultOptions(), // let's not call MediaMixin again
            clipX: 0, clipY: 0, mediaX: 0, mediaY: 0, mediaWidth: undefined, mediaHeight: undefined
        };
    };

    class Audio extends MediaMixin(Base) {
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
            super(startTime, media, null, options);
            applyOptions(options, this);
            if (this.duration === undefined) this.duration = media.duration - this.mediaStartTime;
        }
    }
    Audio.prototype.getDefaultOptions = function() {
        return {
            ...Object.getPrototypeOf(this).getDefaultOptions(), // let's not call MediaMixin again
            mediaStartTime: 0, duration: undefined
        };
    };

    var layers = /*#__PURE__*/Object.freeze({
        Base: Base,
        Visual: Visual,
        Text: Text,
        Image: Image,
        MediaMixin: MediaMixin,
        Video: Video,
        Audio: Audio
    });

    // TODO: investigate why an effect might run once in the beginning even if its layer isn't at the beginning

    /**
     * Any effect that modifies the visual contents of a layer.
     *
     * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
     * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
     * different module.</em>
     */
    class Base$1 {
        constructor() {
            const newThis = watchPublic(this);  // proxy that will be returned by constructor

            subscribe(newThis, "effect.attach", event => {
                newThis._target = event.layer || event.movie;  // either one or the other (depending on the event caller)
            });

            // Propogate up to target
            subscribe(newThis, "effect.change.modify", event => {
                if (!newThis._target) {
                    return;
                }
                const type = `${newThis._target._type}.change.effect.modify`;
                _publish(newThis._target, type, {...event, target: newThis._target, source: newThis, type});
            });

            return newThis;
        }

        // subclasses must implement apply
        apply(target, reltime) {
            throw "No overriding method found or super.apply was called";
        }

        get _parent() { return this._target; }
    }
    // id for events (independent of instance, but easy to access when on prototype chain)
    Base$1.prototype._type = "effect";
    Base$1.prototype._publicExcludes = [];

    /**
     * A sequence of effects to apply, treated as one effect. This can be useful for defining reused effect sequences as one effect.
     */
    class Stack extends Base$1 {
        constructor(effects) {
            super();
            this.effects = effects;
        }

        /**
         * Convenience method for chaining
         * @param {Base} effect - the effect to append
         */
        addEffect(effect) {
            this.effects.push(effect);
            return this;
        }

        apply(target, reltime) {
            for (let i = 0; i < this.effects.length; i++) {
                let effect = this.effects[i];
                effect.apply(target, reltime);
            }
        }
    }

    // TODO: can `v_TextureCoord` be replaced by `gl_FragUV`?
    class Shader extends Base$1 {
        /**
         * @param {string} fragmentSrc
         * @param {object} [userUniforms={}]
         * @param {object[]} [userTextures=[]]
         * @param {object} [sourceTextureOptions={}]
         */
        constructor(fragmentSrc=Shader._IDENTITY_FRAGMENT_SOURCE, userUniforms={}, userTextures=[], sourceTextureOptions={}) {
            super();
            // TODO: split up into multiple methods

            // Init WebGL
            this._canvas = document.createElement("canvas");
            const gl = this._canvas.getContext("webgl");
            if (gl === null) {
                throw "Unable to initialize WebGL. Your browser or machine may not support it.";
            }

            this._program = Shader._initShaderProgram(gl, Shader._VERTEX_SOURCE, fragmentSrc);
            this._buffers = Shader._initRectBuffers(gl);

            let maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            if (userTextures.length > maxTextures) {
                console.warn("Too many textures!");
            }
            this._userTextures = {};
            for (let name in userTextures) {
                const userOptions = userTextures[name];
                // Apply default options.
                const options = {...Shader._DEFAULT_TEXTURE_OPTIONS, ...userOptions};

                if (options.createUniform) {
                    // Automatically, create a uniform with the same name as this texture, that points to it.
                    // This is an easy way for the user to use custom textures, without having to define multiple properties in the effect object.
                    if (userUniforms[name]) {
                        throw `Texture - uniform naming conflict: ${name}!`;
                    }
                    // Add this as a "user uniform".
                    userUniforms[name] = "1i";  // texture pointer
                }
                this._userTextures[name] = options;
            }
            this._sourceTextureOptions = {...Shader._DEFAULT_TEXTURE_OPTIONS, ...sourceTextureOptions};

            this._attribLocations = {
                textureCoord: gl.getAttribLocation(this._program, "a_TextureCoord")
            };

            this._uniformLocations = {
                // modelViewMatrix: gl.getUniformLocation(this._program, "u_ModelViewMatrix"),
                source: gl.getUniformLocation(this._program, "u_Source"),
                size: gl.getUniformLocation(this._program, "u_Size")
            };
            // The options value can just be a string equal to the type of the variable, for syntactic sugar.
            //  If this is the case, convert it to a real options object.
            this._userUniforms = {};
            for (let name in userUniforms) {
                let val = userUniforms[name];
                this._userUniforms[name] = typeof val === "string" ? {type: val} : val;
            }
            for (let unprefixed in userUniforms) {
                // property => u_Property
                let prefixed = "u_" + unprefixed.charAt(0).toUpperCase() + (unprefixed.length > 1 ? unprefixed.slice(1) : "");
                this._uniformLocations[unprefixed] = gl.getUniformLocation(this._program, prefixed);
            }

            this._gl = gl;
        }

        // Not needed, right?
        /*watchWebGLOptions() {
            const pubChange = () => {
                this._publish("change", {});
            };
            for (let name in this._userTextures) {
                watch(this, name, pubChange);
            }
            for (let name in this._userUniforms) {
                watch(this, name, pubChange);
            }
        }*/

        apply(target, reltime) {
            // TODO: split up into multiple methods
            const gl = this._gl;

            // TODO: Change target.canvas.width => target.width and see if it breaks anything.
            if (this._canvas.width !== target.canvas.width || this._canvas.height !== target.canvas.height) {   // (optimization)
                this._canvas.width = target.canvas.width;
                this._canvas.height = target.canvas.height;

                gl.viewport(0, 0, target.canvas.width, target.canvas.height);
            }

            gl.clearColor(0, 0, 0, 0);  // clear to transparency; TODO: test
            // gl.clearDepth(1.0);         // clear everything
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);        // gl.depthFunc(gl.LEQUAL);

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Tell WebGL how to pull out the positions from buffer
            {
                const numComponents = 2;
                const type = gl.FLOAT;    // the data in the buffer is 32bit floats
                const normalize = false;  // don't normalize
                const stride = 0;         // how many bytes to get from one set of values to the next
                                          // 0 = use type and numComponents above
                const offset = 0;         // how many bytes inside the buffer to start from
                gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.position);
                gl.vertexAttribPointer(
                    this._attribLocations.vertexPosition,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset);
                gl.enableVertexAttribArray(
                    this._attribLocations.vertexPosition);
            }

            // tell webgl how to pull out the texture coordinates from buffer
            {
                const numComponents = 2; // every coordinate composed of 2 values (uv)
                const type = gl.FLOAT; // the data in the buffer is 32 bit float
                const normalize = false; // don't normalize
                const stride = 0; // how many bytes to get from one set to the next
                const offset = 0; // how many bytes inside the buffer to start from
                gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.textureCoord);
                gl.vertexAttribPointer(this._attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
                gl.enableVertexAttribArray(this._attribLocations.textureCoord);
            }

            // TODO: figure out which properties should be private / public

            // Tell WebGL we want to affect texture unit 0
            // Call `activeTexture` before `_loadTexture` so it won't be bound to the last active texture.
            gl.activeTexture(gl.TEXTURE0);
            this._inputTexture = Shader._loadTexture(gl, target.canvas);
            // Bind the texture to texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, this._inputTexture);

            {
                let i = 0;
                for (let name in this._userTextures) {
                    let options = this._userTextures[name];
                    let source = this[name];
                    // Call `activeTexture` before `_loadTexture` so it won't be bound to the last active texture.
                    // TODO: investigate better implementation of `_loadTexture`
                    gl.activeTexture(gl.TEXTURE0 + Shader.INTERNAL_TEXTURE_UNITS + i);  // use the fact that TEXTURE0, TEXTURE1, ... are continuous
                    let preparedTex = Shader._loadTexture(gl, val(source, this, reltime), options); // do it every frame to keep updated (I think you need to)
                    gl.bindTexture(gl[options.target], preparedTex);
                }
            }

            gl.useProgram(this._program);

            // Set the shader uniforms

            // Tell the shader we bound the texture to texture unit 0
            if (this._uniformLocations.source)  // All base (Shader class) uniforms are optional
                gl.uniform1i(this._uniformLocations.source, 0);

            if (this._uniformLocations.size)    // All base (Shader class) uniforms are optional
                gl.uniform2iv(this._uniformLocations.size, [target.width, target.height]);

            for (let unprefixed in this._userUniforms) {
                let options = this._userUniforms[unprefixed];
                let value = val(this[unprefixed], this, reltime);
                let preparedValue = this._prepareValue(val(value, this, reltime), options.type, reltime, options);
                let location = this._uniformLocations[unprefixed];
                gl["uniform" + options.type](location, preparedValue);    // haHA JavaScript (`options.type` is "1f", for instance)
            }
            gl.uniform1i(this._uniformLocations.test, 0);

            {
                const offset = 0;
                const vertexCount = 4;
                gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
            }

            /*let ctx = target.cctx || target._movie.cctx,    // always render to movie canvas
                movie = target instanceof Movie ? target : target._movie,
                x = val(target.x) || 0,  // layer offset
                y = val(target.y) || 0,  // layer offset
                width = val(target.width || movie.width),
                height = val(target.height || movie.height);

            // copy internal image state onto movie
            ctx.drawImage(this._canvas, x, y, width, height);*/

            // clear the target, in case the effect outputs transparent pixels
            target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
            // copy internal image state onto target
            target.cctx.drawImage(this._canvas, 0, 0);
        }

        /**
         * Converts a value of a standard type for javascript to a standard type for GLSL
         * @param value - the raw value to prepare
         * @param outputType - the WebGL type of |value|; example: <code>1f</code> for a float
         * @param {object} [options] - Optional config
         */
        _prepareValue(value, outputType, reltime, options={}) {
            let def = options.defaultFloatComponent || 0;
            if (outputType === "1i") {
                /*
                 * Textures are passed to the shader by both providing the texture (with texImage2D)
                 * and setting the |sampler| uniform equal to the index of the texture.
                 * In vidar.js shader effects, the subclass passes the names of all the textures ot this base class,
                 * along with all the names of uniforms. By default, corresponding uniforms (with the same name) are
                 * created for each texture for ease of use. You can also define different texture properties in the
                 * javascript effect by setting it identical to the property with the passed texture name.
                 * In WebGL, it will be set to the same integer texture unit.
                 *
                 * To do this, test if |value| is identical to a texture.
                 * If so, set it to the texture's index, so the shader can use it.
                 */
                let i = 0;
                for (let name in this._userTextures) {
                    const testValue = val(this[name], this, reltime);
                    if (value === testValue) {
                        value = Shader.INTERNAL_TEXTURE_UNITS + i;  // after the internal texture units
                    }
                    i++;
                }
            }

            if (outputType === "3fv") {
                if (Array.isArray(value) && (value.length === 3 || value.length === 4))  // allow 4-component vectors; TODO: why?
                    return value;
                if (typeof value === "object")  // kind of loose so this can be changed if needed
                    return [
                        value.r != undefined ? value.r : def,
                        value.g != undefined ? value.g : def,
                        value.b != undefined ? value.b : def
                    ];

                throw `Invalid type: ${outputType} or value: ${value}`;
            }

            if (outputType === "4fv") {
                if (Array.isArray(value) && value.length === 4)
                    return value;
                if (typeof value === "object")  // kind of loose so this can be changed if needed
                    return [
                        value.r != undefined ? value.r : def,
                        value.g != undefined ? value.g : def,
                        value.b != undefined ? value.b : def,
                        value.a != undefined ? value.a : def
                    ];

                throw `Invalid type: ${outputType} or value: ${value}`;
            }

            return value;
        }
    }
    // Shader.prototype.get_publicExcludes = () =>
    Shader._initRectBuffers = gl => {
        const position = [
            // the screen/canvas (output)
            -1.0,  1.0,
             1.0,  1.0,
            -1.0, -1.0,
             1.0, -1.0
        ];
        const textureCoord = [
            // the texture/canvas (input)
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0
        ];

        return {
            position: Shader._initBuffer(gl, position),
            textureCoord: Shader._initBuffer(gl, textureCoord)
        };
    };
    /**
     * Creates the quad covering the screen
     */
    Shader._initBuffer = (gl, data) => {
        const buffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

        return buffer;
    };
    /**
     * Creates a webgl texture from the source.
     * @param {object} [options] - optional WebGL config for texture
     * @param {number} [options.target=gl.TEXTURE_2D]
     * @param {number} [options.level=0]
     * @param {number} [options.internalFormat=gl.RGBA]
     * @param {number} [options.srcFormat=gl.RGBA]
     * @param {number} [options.srcType=gl.UNSIGNED_BYTE]
     * @param {number} [options.minFilter=gl.LINEAR]
     * @param {number} [options.magFilter=gl.LINEAR]
     */
    Shader._loadTexture = (gl, source, options={}) => {
        options = {...Shader._DEFAULT_TEXTURE_OPTIONS, ...options}; // Apply default options, just in case.
        const target = gl[options.target],  // When creating the option, the user can't access `gl` so access it here.
            level = options.level,
            internalFormat = gl[options.internalFormat],
            srcFormat = gl[options.srcFormat],
            srcType = gl[options.srcType],
            minFilter = gl[options.minFilter],
            magFilter = gl[options.magFilter];
        // TODO: figure out how wrap-s and wrap-t interact with mipmaps
        // (for legacy support)
        // let wrapS = options.wrapS ? options.wrapS : gl.CLAMP_TO_EDGE,
        //     wrapT = options.wrapT ? options.wrapT : gl.CLAMP_TO_EDGE;

        const tex = gl.createTexture();
        gl.bindTexture(target, tex);

        // TODO: figure out how this works with layer width/height

        // TODO: support 3d textures (change texImage2D)
        // set to `source`
        gl.texImage2D(target, level, internalFormat, srcFormat, srcType, source);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        // Get dimensions by using the fact that all valid inputs for
        // texImage2D must have `width` and `height` properties except
        // videos, which have `videoWidth` and `videoHeight` instead
        // and `ArrayBufferView`, which is one dimensional (so don't
        // worry about mipmaps)
        const w = target instanceof HTMLVideoElement ? target.videoWidth : target.width,
            h = target instanceof HTMLVideoElement ? target.videoHeight : target.height;
        if ((w && isPowerOf2(w)) && (h && isPowerOf2(h))) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(target);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
            gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
        }

        return tex;
    };
    const isPowerOf2 = value => (value && (value - 1)) === 0;
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
    Shader._initShaderProgram = (gl, vertexSrc, fragmentSrc) => {
        const vertexShader = Shader._loadShader(gl, gl.VERTEX_SHADER, vertexSrc);
        const fragmentShader = Shader._loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        // check program creation status
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.warn("Unable to link shader program: " + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    };
    Shader._loadShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // check compile status
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn("An error occured compiling shader: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    };
    Shader.INTERNAL_TEXTURE_UNITS = 1;
    Shader._DEFAULT_TEXTURE_OPTIONS = {
        createUniform: true,
        target: "TEXTURE_2D",
        level: 0,
        internalFormat: "RGBA",
        srcFormat: "RGBA",
        srcType: "UNSIGNED_BYTE",
        minFilter: "LINEAR",
        magFilter: "LINEAR"
    };
    Shader._VERTEX_SOURCE = `
    attribute vec4 a_VertexPosition;
    attribute vec2 a_TextureCoord;

    varying highp vec2 v_TextureCoord;

    void main() {
        // no need for projection or model-view matrices, since we're just rendering a rectangle
        // that fills the screen (see position values)
        gl_Position = a_VertexPosition;
        v_TextureCoord = a_TextureCoord;
    }
`;
    Shader._IDENTITY_FRAGMENT_SOURCE = `
    precision mediump float;

    uniform sampler2D u_Source;
    uniform float u_Brightness;

    varying highp vec2 v_TextureCoord;

    void main() {
        gl_FragColor = texture2D(u_Source, v_TextureCoord);
    }
`;

    /* COLOR & TRANSPARENCY */
    // TODO: move shader source code to external .js files (with exports)

    /** Changes the brightness */
    class Brightness extends Shader {
        /**
         * @param {number} brightness - The value to add to each pixel [-255, 255]
         */
        constructor(brightness=0.0) {
            super(`
            precision mediump float;

            uniform sampler2D u_Source;
            uniform float u_Brightness;

            varying highp vec2 v_TextureCoord;

            void main() {
                vec4 color = texture2D(u_Source, v_TextureCoord);
                vec3 rgb = clamp(color.rgb + u_Brightness / 255.0, 0.0, 1.0);
                gl_FragColor = vec4(rgb, color.a);
            }
        `, {
                brightness: "1f"
            });
            this.brightness = brightness;
        }
    }

    /** Changes the contrast */
    class Contrast extends Shader {
        constructor(contrast=1.0) {
            super(`
            precision mediump float;

            uniform sampler2D u_Source;
            uniform float u_Contrast;

            varying highp vec2 v_TextureCoord;

            void main() {
                vec4 color = texture2D(u_Source, v_TextureCoord);
                vec3 rgb = clamp(u_Contrast * (color.rgb - 0.5) + 0.5, 0.0, 1.0);
                gl_FragColor = vec4(rgb, color.a);
            }
        `, {
                contrast: "1f"
            });
            this.contrast = contrast;
        }
    }

    /**
     * Multiplies each channel by a different constant
     */
    class Channels extends Shader {
        constructor(factors={}) {
            super(`
            precision mediump float;

            uniform sampler2D u_Source;
            uniform vec4 u_Factors;

            varying highp vec2 v_TextureCoord;

            void main() {
                vec4 color = texture2D(u_Source, v_TextureCoord);
                gl_FragColor = clamp(u_Factors * color, 0.0, 1.0);
            }
        `, {
                factors: {type: "4fv", defaultFloatComponent: 1}
            });
            // default values of 1, because we're multiplying
            this.factors = factors;
        }
    }

    /**
     * Reduces alpha for pixels which, by some criterion, are close to a specified target color
     */
    class ChromaKey extends Shader {
        /**
         * @param {Color} [target={r: 0, g: 0, b: 0}] - the color to target
         * @param {number} [threshold=0] - how much error is allowed
         * @param {boolean} [interpolate=false] - true to interpolate the alpha channel,
         *  creating an anti-aliased alpha effect, or false value for no smoothing (i.e. 255 or 0 alpha)
         * (@param {number} [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable)
         */
        // TODO: use smoothingSharpness
        constructor(target={r: 0, g: 0, b: 0}, threshold=0, interpolate=false/*, smoothingSharpness=0*/) {
            super(`
            precision mediump float;

            uniform sampler2D u_Source;
            uniform vec3 u_Target;
            uniform float u_Threshold;
            uniform bool u_Interpolate;

            varying highp vec2 v_TextureCoord;

            void main() {
                vec4 color = texture2D(u_Source, v_TextureCoord);
                float alpha = color.a;
                vec3 dist = abs(color.rgb - u_Target / 255.0);
                if (!u_Interpolate) {
                    // Standard way that most video editors probably use (all-or-nothing method)
                    float thresh = u_Threshold / 255.0;
                    bool transparent = dist.r <= thresh && dist.g <= thresh && dist.b <= thresh;
                    if (transparent)
                        alpha = 0.0;
                } else {
                    /*
                        better way IMHO:
                        Take the average of the absolute differences between the pixel and the target for each channel
                    */
                    float transparency = (dist.r + dist.g + dist.b) / 3.0;
                    // TODO: custom or variety of interpolation methods
                    alpha = transparency;
                }
                gl_FragColor = vec4(color.rgb, alpha);
            }
        `, {
                target: "3fv",
                threshold: "1f",
                interpolate: "1i"
            });
            this.target = target;
            this.threshold = threshold;
            this.interpolate = interpolate;
            // this.smoothingSharpness = smoothingSharpness;
        }
    }

    /* BLUR */
    // TODO: make sure this is truly gaussian even though it doens't require a standard deviation
    // TODO: improve performance and/or make more powerful
    /** Applies a Gaussian blur */
    class GaussianBlur extends Stack {
        constructor(radius) {
            // Divide into two shader effects (use the fact that gaussian blurring can be split into components for performance benefits)
            super([
                new GaussianBlurHorizontal(radius),
                new GaussianBlurVertical(radius)
            ]);
        }
    }
    /**
     * Render Gaussian kernel to a canvas for use in shader.
     * @param {number[]} kernel
     *
     * @return {HTMLCanvasElement}
     */
    GaussianBlur.render1DKernel = kernel => {
        // TODO: Use Float32Array instead of canvas.
        // init canvas
        const canvas = document.createElement("canvas");
        canvas.width = kernel.length;
        canvas.height = 1;  // 1-dimensional
        const ctx = canvas.getContext("2d");

        // draw to canvas
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < kernel.length; i++) {
            imageData.data[4 * i + 0] = 255 * kernel[i];  // Use red channel to store distribution weights.
            imageData.data[4 * i + 1] = 0;          // Clear all other channels.
            imageData.data[4 * i + 2] = 0;
            imageData.data[4 * i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    };
    GaussianBlur.gen1DKernel = radius => {
        let pascal = GaussianBlur.genPascalRow(2 * radius + 1);
        // don't use `reduce` and `map` (overhead?)
        let sum = 0;
        for (let i=0; i<pascal.length; i++)
            sum += pascal[i];
        for (let i=0; i<pascal.length; i++)
            pascal[i] /= sum;
        return pascal;
    };
    GaussianBlur.genPascalRow = index => {
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
    };

    /**
     * Shared class for both horizontal and vertical gaussian blur classes. Its purpose is for less repeated code.
     */
    class GaussianBlurComponent extends Shader {
        /**
         * @param {string} src - fragment src code specific to which component (horizontal or vertical)
         * @param {number} radius
         */
        constructor(src, radius) {
            super(src, {
                "radius": "1i"
            }, {
                "shape": { minFilter: "NEAREST", magFilter: "NEAREST" }
            });
            this.radius = radius;
            this._radiusCache = undefined;
        }

        apply(target, reltime) {
            let radiusVal = val(this.radius, this, reltime);
            if (radiusVal !== this._radiusCache) {
                // Regenerate gaussian distribution.
                this.shape = GaussianBlur.render1DKernel(
                    GaussianBlur.gen1DKernel(radiusVal)
                );  // distribution canvas
            }
            this._radiusCache = radiusVal;

            super.apply(target, reltime);
        }
    }

    class GaussianBlurHorizontal extends GaussianBlurComponent {
        // TODO: If radius == 0, don't affect the image (right now, the image goes black).
        constructor(radius) {
            super(`
            #define MAX_RADIUS 250

            precision mediump float;

            uniform sampler2D u_Source;
            uniform ivec2 u_Size;   // pixel dimensions of input and output
            uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
            uniform int u_Radius;   // TODO: support floating-point radii

            varying highp vec2 v_TextureCoord;

            void main() {
                vec4 avg = vec4(0.0);
                // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
                // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
                for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
                    if (i >= 2 * u_Radius + 1)
                        break;  // GLSL can only use constants in for-loop declaration, so we break here.
                    // u_Radius is the width of u_Shape, by definition
                    float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.0)).r;   // TODO: use single-channel format
                    vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(i - u_Radius, 0.0) / vec2(u_Size));
                    avg += weight * sample;
                }
                gl_FragColor = avg;
            }
        `, radius);
        }
    }
    class GaussianBlurVertical extends GaussianBlurComponent {
        constructor(radius) {
            super(`
            #define MAX_RADIUS 250

            precision mediump float;

            uniform sampler2D u_Source;
            uniform ivec2 u_Size;   // pixel dimensions of input and output
            uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
            uniform int u_Radius;   // TODO: support floating-point radii

            varying highp vec2 v_TextureCoord;

            void main() {
                vec4 avg = vec4(0.0);
                // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
                // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
                for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
                    if (i >= 2 * u_Radius + 1)
                        break;  // GLSL can only use constants in for-loop declaration, so we break here.
                    // u_Radius is the width of u_Shape, by definition
                    float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.0)).r;   // TODO: use single-channel format
                    vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(0.0, i - u_Radius) / vec2(u_Size));
                    avg += weight * sample;
                }
                gl_FragColor = avg;
            }
        `, radius);
        }
    }

    // TODO: just resample with NEAREST interpolation? but how?
    /** Makes the target look pixelated */
    class Pixelate extends Shader {
        constructor(pixelSize=1) {
            super(`
            precision mediump float;

            uniform sampler2D u_Source;
            uniform ivec2 u_Size;
            uniform int u_PixelSize;

            varying highp vec2 v_TextureCoord;

            void main() {
                // Floor to nearest pixel (times pixel size), not nearest edge of screen
                ivec2 loc = ivec2(vec2(u_Size) * v_TextureCoord);   // screen location

                int ps = u_PixelSize;
                vec2 flooredTexCoord = float(ps) * floor(vec2(loc) / float(ps))
                    / vec2(u_Size);
                gl_FragColor = texture2D(u_Source, flooredTexCoord);
            }
        `, {
                pixelSize: "1i"
            });
            this.pixelSize = pixelSize;
        }

        apply(target, reltime) {
            const ps = val(this.pixelSize, target, reltime);
            if (ps % 1 !== 0 || ps < 0)
                throw "Pixel size must be a nonnegative integer";

            super.apply(target, reltime);
        }
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
    class Transform extends Base$1 {
        /**
         * @param {Transform.Matrix} matrix - how to transform the target
         */
        constructor(matrix) {
            super();
            this.matrix = matrix;
            this._tmpMatrix = new Transform.Matrix();
            this._tmpCanvas = document.createElement("canvas");
            this._tmpCtx = this._tmpCanvas.getContext("2d");
        }

        apply(target, reltime) {
            if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
            if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
            this._tmpMatrix.data = val(this.matrix.data, target, reltime); // use data, since that's the underlying storage

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
                1, 0, x,
                0, 1, y,
                0, 0, 1
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
        apply(target, reltime) {
            const ctx = target.cctx, canvas = target.canvas;
            const x = val(this.x, target, reltime), y = val(this.y, target, reltime),
                radiusX = val(this.radiusX, target, reltime), radiusY = val(this.radiusY, target, reltime),
                rotation = val(this.rotation, target, reltime),
                startAngle = val(this.startAngle, target, reltime), endAngle = val(this.endAngle, target, reltime),
                anticlockwise = val(this.anticlockwise, target, reltime);
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
        Stack: Stack,
        Shader: Shader,
        Brightness: Brightness,
        Contrast: Contrast,
        Channels: Channels,
        ChromaKey: ChromaKey,
        GaussianBlur: GaussianBlur,
        GaussianBlurHorizontal: GaussianBlurHorizontal,
        GaussianBlurVertical: GaussianBlurVertical,
        Pixelate: Pixelate,
        Transform: Transform,
        EllipticalMask: EllipticalMask
    });

    /* The entry point */

    var index = {
        Movie: Movie,
        layer: layers,
        effect: effects,
        event,
        ...util
    };

    return index;

}());
