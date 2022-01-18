var vd = (function () {
    'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    /**
     * @module event
     */
    /**
     * An event type
     * @private
     */
    var TypeId = /** @class */ (function () {
        function TypeId(id) {
            this._parts = id.split('.');
        }
        TypeId.prototype.contains = function (other) {
            if (other._parts.length > this._parts.length)
                return false;
            for (var i = 0; i < other._parts.length; i++)
                if (other._parts[i] !== this._parts[i])
                    return false;
            return true;
        };
        TypeId.prototype.toString = function () {
            return this._parts.join('.');
        };
        return TypeId;
    }());
    /**
     * Listen for an event or category of events
     *
     * @param target - a vidar object
     * @param type - the id of the type (can contain subtypes, such as
     * "type.subtype")
     * @param listener
     */
    function subscribe(target, type, listener) {
        if (!listeners.has(target))
            listeners.set(target, []);
        listeners.get(target).push({ type: new TypeId(type), listener: listener });
    }
    /**
     * Remove an event listener
     *
     * @param target - a vidar object
     * @param type - the id of the type (can contain subtypes, such as
     * "type.subtype")
     * @param listener
     */
    function unsubscribe(target, listener) {
        // Make sure `listener` has been added with `subscribe`.
        if (!listeners.has(target) ||
            !listeners.get(target).map(function (pair) { return pair.listener; }).includes(listener))
            throw new Error('No matching event listener to remove');
        var removed = listeners.get(target)
            .filter(function (pair) { return pair.listener !== listener; });
        listeners.set(target, removed);
    }
    /**
     * Emits an event to all listeners
     *
     * @param target - a vidar object
     * @param type - the id of the type (can contain subtypes, such as
     * "type.subtype")
     * @param event - any additional event data
     */
    function publish(target, type, event) {
        event.target = target; // could be a proxy
        event.type = type;
        var t = new TypeId(type);
        if (!listeners.has(target))
            // No event fired
            return null;
        // Call event listeners for this event.
        var listenersForType = [];
        for (var i = 0; i < listeners.get(target).length; i++) {
            var item = listeners.get(target)[i];
            if (t.contains(item.type))
                listenersForType.push(item.listener);
        }
        for (var i = 0; i < listenersForType.length; i++) {
            var listener = listenersForType[i];
            listener(event);
        }
        return event;
    }
    var listeners = new WeakMap();

    var event = /*#__PURE__*/Object.freeze({
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        publish: publish
    });

    /**
     * @module util
     */
    /**
     * Gets the first matching property descriptor in the prototype chain, or
     * undefined.
     * @param obj
     * @param name
     */
    function getPropertyDescriptor(obj, name) {
        do {
            var propDesc = Object.getOwnPropertyDescriptor(obj, name);
            if (propDesc)
                return propDesc;
            obj = Object.getPrototypeOf(obj);
        } while (obj);
        return undefined;
    }
    /**
     * Merges `options` with `defaultOptions`, and then copies the properties with
     * the keys in `defaultOptions` from the merged object to `destObj`.
     *
     * @return
     */
    // TODO: Make methods like getDefaultOptions private
    function applyOptions(options, destObj) {
        var defaultOptions = destObj.getDefaultOptions();
        // Validate; make sure `keys` doesn't have any extraneous items
        for (var option in options)
            // eslint-disable-next-line no-prototype-builtins
            if (!defaultOptions.hasOwnProperty(option))
                throw new Error("Invalid option: '" + option + "'");
        // Merge options and defaultOptions
        options = __assign(__assign({}, defaultOptions), options);
        // Copy options
        for (var option in options) {
            var propDesc = getPropertyDescriptor(destObj, option);
            // Update the property as long as the property has not been set (unless if it has a setter)
            if (!propDesc || propDesc.set)
                destObj[option] = options[option];
        }
    }
    // This must be cleared at the start of each frame
    var valCache = new WeakMap();
    function cacheValue(element, path, value) {
        // Initiate movie cache
        if (!valCache.has(element.movie))
            valCache.set(element.movie, new WeakMap());
        var movieCache = valCache.get(element.movie);
        // Iniitate element cache
        if (!movieCache.has(element))
            movieCache.set(element, {});
        var elementCache = movieCache.get(element);
        // Cache the value
        elementCache[path] = value;
        return value;
    }
    function hasCachedValue(element, path) {
        return valCache.has(element.movie) &&
            valCache.get(element.movie).has(element) &&
            path in valCache.get(element.movie).get(element);
    }
    function getCachedValue(element, path) {
        return valCache.get(element.movie).get(element)[path];
    }
    function clearCachedValues(movie) {
        valCache.delete(movie);
    }
    /**
     * A keyframe set.
     *
     * Usage:
     * ```js
     new vd.KeyFrame([time1, value1, interpolation1], [time2, value2])`
     * ```
     * TypeScript users need to specify the type of the value as a type parameter.
     */
    var KeyFrame = /** @class */ (function () {
        function KeyFrame() {
            var value = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                value[_i] = arguments[_i];
            }
            this.value = value;
            this.interpolationKeys = [];
        }
        KeyFrame.prototype.withKeys = function (keys) {
            this.interpolationKeys = keys;
            return this;
        };
        KeyFrame.prototype.evaluate = function (time) {
            if (this.value.length === 0)
                throw new Error('Empty keyframe');
            if (time === undefined)
                throw new Error('|time| is undefined or null');
            var firstTime = this.value[0][0];
            if (time < firstTime)
                throw new Error('No keyframe point before |time|');
            // I think reduce are slow to do per-frame (or more)?
            for (var i = 0; i < this.value.length; i++) {
                var startTime = this.value[i][0];
                var startValue = this.value[i][1];
                var interpolate = this.value[i].length === 3 ? this.value[i][2] : linearInterp;
                if (i + 1 < this.value.length) {
                    var endTime = this.value[i + 1][0];
                    var endValue = this.value[i + 1][1];
                    if (startTime <= time && time < endTime)
                        // No need for endValue if it is flat interpolation
                        // TODO: support custom interpolation for 'other' types?
                        if (!(typeof startValue === 'number' || typeof endValue === 'object')) {
                            return startValue;
                        }
                        else if (typeof startValue !== typeof endValue) {
                            throw new Error('Type mismatch in keyframe values');
                        }
                        else {
                            // Interpolate
                            var percentProgress = (time - startTime) / (endTime - startTime);
                            return interpolate(startValue, // eslint-disable-line @typescript-eslint/ban-types
                            endValue, // eslint-disable-line @typescript-eslint/ban-types
                            percentProgress, this.interpolationKeys);
                        }
                }
                else {
                    // Repeat last value forever
                    return startValue;
                }
            }
        };
        return KeyFrame;
    }());
    /**
     * Computes a property.
     *
     * @param element - the vidar object to which the property belongs to
     * @param path - the dot-separated path to a property on `element`
     * @param time - time to calculate keyframes for, if necessary
     *
     * Note that only values used in keyframes that are numbers or objects
     * (including arrays) are interpolated. All other values are taken sequentially
     * with no interpolation. JavaScript will convert parsed colors, if created
     * correctly, to their string representations when assigned to a
     * CanvasRenderingContext2D property.
     */
    // TODO: Is this function efficient?
    // TODO: Update doc @params to allow for keyframes
    function val(element, path, time) {
        if (hasCachedValue(element, path))
            return getCachedValue(element, path);
        // Get property of element at path
        var pathParts = path.split('.');
        var property = element[pathParts.shift()];
        while (pathParts.length > 0)
            property = property[pathParts.shift()];
        // Property filter function
        var process = element.propertyFilters[path];
        var value;
        if (property instanceof KeyFrame)
            value = property.evaluate(time);
        else if (typeof property === 'function')
            value = property(element, time); // TODO? add more args
        else
            // Simple value
            value = property;
        return cacheValue(element, path, process ? process.call(element, value) : value);
    }
    /* export function floorInterp(x1, x2, t, objectKeys) {
        // https://stackoverflow.com/a/25835337/3783155 (TODO: preserve getters/setters, etc?)
        return !objectKeys ? x1 : objectKeys.reduce((a, x) => {
            if (x1.hasOwnProperty(x)) a[x] = o[x];  // ignore x2
            return a;
        }, Object.create(Object.getPrototypeOf(x1)));
    } */
    function linearInterp(x1, x2, t, objectKeys) {
        if (typeof x1 !== typeof x2)
            throw new Error('Type mismatch');
        if (typeof x1 !== 'number' && typeof x1 !== 'object')
            // Flat interpolation (floor)
            return x1;
        if (typeof x1 === 'object') { // to work with objects (including arrays)
            // TODO: make this code DRY
            if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2))
                throw new Error('Prototype mismatch');
            // Preserve prototype of objects
            var int = Object.create(Object.getPrototypeOf(x1));
            // Take the intersection of properties
            var keys = Object.keys(x1) || objectKeys; // TODO: reverse operands
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                // eslint-disable-next-line no-prototype-builtins
                if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key))
                    continue;
                int[key] = linearInterp(x1[key], x2[key], t);
            }
            return int;
        }
        return (1 - t) * x1 + t * x2;
    }
    function cosineInterp(x1, x2, t, objectKeys) {
        if (typeof x1 !== typeof x2)
            throw new Error('Type mismatch');
        if (typeof x1 !== 'number' && typeof x1 !== 'object')
            // Flat interpolation (floor)
            return x1;
        if (typeof x1 === 'object' && typeof x2 === 'object') { // to work with objects (including arrays)
            if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2))
                throw new Error('Prototype mismatch');
            // Preserve prototype of objects
            var int = Object.create(Object.getPrototypeOf(x1));
            // Take the intersection of properties
            var keys = Object.keys(x1) || objectKeys;
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                // eslint-disable-next-line no-prototype-builtins
                if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key))
                    continue;
                int[key] = cosineInterp(x1[key], x2[key], t);
            }
            return int;
        }
        var cos = Math.cos(Math.PI / 2 * t);
        return cos * x1 + (1 - cos) * x2;
    }
    /**
     * An RGBA color, for proper interpolation and shader effects
     */
    var Color = /** @class */ (function () {
        /**
         * @param r
         * @param g
         * @param b
         * @param a
         */
        function Color(r, g, b, a) {
            if (a === void 0) { a = 1.0; }
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }
        /**
         * Converts to a CSS color
         */
        Color.prototype.toString = function () {
            return "rgba(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
        };
        return Color;
    }());
    var parseColorCanvas = document.createElement('canvas');
    parseColorCanvas.width = parseColorCanvas.height = 1;
    var parseColorCtx = parseColorCanvas.getContext('2d');
    /**
     * Converts a CSS color string to a {@link Color} object representation.
     * @param str
     * @return the parsed color
     */
    function parseColor(str) {
        // TODO - find a better way to deal with the fact that invalid values of "col"
        // are ignored.
        parseColorCtx.clearRect(0, 0, 1, 1);
        parseColorCtx.fillStyle = str;
        parseColorCtx.fillRect(0, 0, 1, 1);
        var data = parseColorCtx.getImageData(0, 0, 1, 1).data;
        return new Color(data[0], data[1], data[2], data[3] / 255);
    }
    /**
     * A font, for proper interpolation
     */
    var Font = /** @class */ (function () {
        /**
         * @param size
         * @param family
         * @param sizeUnit
         */
        function Font(size, sizeUnit, family, style, variant, weight, stretch, lineHeight) {
            if (style === void 0) { style = 'normal'; }
            if (variant === void 0) { variant = 'normal'; }
            if (weight === void 0) { weight = 'normal'; }
            if (stretch === void 0) { stretch = 'normal'; }
            if (lineHeight === void 0) { lineHeight = 'normal'; }
            this.size = size;
            this.sizeUnit = sizeUnit;
            this.family = family;
            this.style = style;
            this.variant = variant;
            this.weight = weight;
            this.stretch = stretch;
            this.lineHeight = lineHeight;
        }
        /**
         * Converts to CSS font syntax
         * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
         */
        Font.prototype.toString = function () {
            var s = '';
            if (this.style !== 'normal')
                s += this.style + ' ';
            if (this.variant !== 'normal')
                s += this.variant + ' ';
            if (this.weight !== 'normal')
                s += this.weight + ' ';
            if (this.stretch !== 'normal')
                s += this.stretch + ' ';
            s += "" + this.size + this.sizeUnit + " ";
            if (this.lineHeight !== 'normal')
                s += this.lineHeight + ' ';
            s += this.family;
            return s;
        };
        return Font;
    }());
    var parseFontEl = document.createElement('div');
    /**
     * Converts a CSS font string to a {@link Font} object
     * representation.
     * @param str
     * @return the parsed font
     */
    function parseFont(str) {
        // Assign css string to html element
        parseFontEl.setAttribute('style', "font: " + str);
        var _a = parseFontEl.style, fontSize = _a.fontSize, fontFamily = _a.fontFamily, fontStyle = _a.fontStyle, fontVariant = _a.fontVariant, fontWeight = _a.fontWeight, lineHeight = _a.lineHeight;
        parseFontEl.removeAttribute('style');
        var size = parseFloat(fontSize);
        var sizeUnit = fontSize.substring(size.toString().length);
        return new Font(size, sizeUnit, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight);
    }
    /**
     * @param mapper
     * @param canvas
     * @param ctx
     * @param x
     * @param y
     * @param width
     * @param height
     * @param flush
     * @deprecated Use {@link effect.Shader} instead
     */
    function mapPixels(mapper, canvas, ctx, x, y, width, height, flush) {
        if (flush === void 0) { flush = true; }
        x = x || 0;
        y = y || 0;
        width = width || canvas.width;
        height = height || canvas.height;
        var frame = ctx.getImageData(x, y, width, height);
        for (var i = 0, l = frame.data.length; i < l; i += 4)
            mapper(frame.data, i);
        if (flush)
            ctx.putImageData(frame, x, y);
    }
    /**
     * <p>Emits "change" event when public properties updated, recursively.
     * <p>Must be called before any watchable properties are set, and only once in
     * the prototype chain.
     *
     * @param target - object to watch
     */
    function watchPublic(target) {
        var getPath = function (receiver, prop) {
            return (receiver === proxy ? '' : (paths.get(receiver) + '.')) + prop;
        };
        var callback = function (prop, val, receiver) {
            // Public API property updated, emit 'modify' event.
            publish(proxy, target.type + ".change.modify", { property: getPath(receiver, prop), newValue: val });
        };
        var canWatch = function (receiver, prop) { return !prop.startsWith('_') &&
            (receiver.publicExcludes === undefined || !receiver.publicExcludes.includes(prop)); };
        // The path to each child property (each is a unique proxy)
        var paths = new WeakMap();
        var handler = {
            set: function (obj, prop, val, receiver) {
                // Recurse
                if (typeof val === 'object' && val !== null && !paths.has(val) && canWatch(receiver, prop)) {
                    val = new Proxy(val, handler);
                    paths.set(val, getPath(receiver, prop));
                }
                // Set property or attribute
                // Search prototype chain for the closest setter
                var objProto = obj;
                while ((objProto = Object.getPrototypeOf(objProto))) {
                    var propDesc = Object.getOwnPropertyDescriptor(objProto, prop);
                    if (propDesc && propDesc.set) {
                        // Call setter, supplying proxy as this (fixes event bugs)
                        propDesc.set.call(receiver, val);
                        break;
                    }
                }
                if (!objProto)
                    // Couldn't find setter; set value on instance
                    obj[prop] = val;
                // Check if the property isn't blacklisted in publicExcludes.
                if (canWatch(receiver, prop))
                    callback(prop, val, receiver);
                return true;
            }
        };
        var proxy = new Proxy(target, handler);
        return proxy;
    }

    /**
     * A layer that gets its audio from an HTMLMediaElement
     * @mixin AudioSourceMixin
     */
    // TODO: Implement playback rate
    // The generic is just for type-checking. The argument is for functionality
    // (survives when compiled to javascript).
    function AudioSourceMixin(superclass) {
        var MixedAudioSource = /** @class */ (function (_super) {
            __extends(MixedAudioSource, _super);
            /**
             * @param options
             * @param options.source
             * @param options.onload
             * @param [options.sourceStartTime=0] - at what time in the audio
             * the layer starts
             * @param [options.duration=media.duration-options.sourceStartTime]
             * @param [options.muted=false]
             * @param [options.volume=1]
             * @param [options.playbackRate=1]
             */
            function MixedAudioSource(options) {
                var _this = this;
                var onload = options.onload;
                // Don't set as instance property
                delete options.onload;
                _this = _super.call(this, options) || this;
                _this._initialized = false;
                _this._sourceStartTime = options.sourceStartTime || 0;
                applyOptions(options, _this);
                var load = function () {
                    // TODO:              && ?
                    if ((options.duration || (_this.source.duration - _this.sourceStartTime)) < 0)
                        throw new Error('Invalid options.duration or options.sourceStartTime');
                    _this._unstretchedDuration = options.duration || (_this.source.duration - _this.sourceStartTime);
                    _this.duration = _this._unstretchedDuration / (_this.playbackRate);
                    // onload will use `this`, and can't bind itself because it's before
                    // super()
                    onload && onload.bind(_this)(_this.source, options);
                };
                if (_this.source.readyState >= 2)
                    // this frame's data is available now
                    load();
                else
                    // when this frame's data is available
                    _this.source.addEventListener('loadedmetadata', load);
                _this.source.addEventListener('durationchange', function () {
                    _this.duration = options.duration || (_this.source.duration - _this.sourceStartTime);
                });
                return _this;
            }
            MixedAudioSource.prototype.attach = function (movie) {
                var _this = this;
                _super.prototype.attach.call(this, movie);
                subscribe(movie, 'movie.seek', function () {
                    if (_this.currentTime < 0 || _this.currentTime >= _this.duration)
                        return;
                    _this.source.currentTime = _this.currentTime + _this.sourceStartTime;
                });
                // TODO: on unattach?
                subscribe(movie, 'movie.audiodestinationupdate', function (event) {
                    // Connect to new destination if immeidately connected to the existing
                    // destination.
                    if (_this._connectedToDestination) {
                        _this.audioNode.disconnect(movie.actx.destination);
                        _this.audioNode.connect(event.destination);
                    }
                });
                // connect to audiocontext
                this._audioNode = this.audioNode || movie.actx.createMediaElementSource(this.source);
                // Spy on connect and disconnect to remember if it connected to
                // actx.destination (for Movie#record).
                var oldConnect = this._audioNode.connect.bind(this.audioNode);
                this._audioNode.connect = function (destination, outputIndex, inputIndex) {
                    _this._connectedToDestination = destination === movie.actx.destination;
                    return oldConnect(destination, outputIndex, inputIndex);
                };
                var oldDisconnect = this._audioNode.disconnect.bind(this.audioNode);
                this._audioNode.disconnect = function (destination, output, input) {
                    if (_this._connectedToDestination &&
                        destination === movie.actx.destination)
                        _this._connectedToDestination = false;
                    return oldDisconnect(destination, output, input);
                };
                // Connect to actx.destination by default (can be rewired by user)
                this.audioNode.connect(movie.actx.destination);
            };
            MixedAudioSource.prototype.detach = function () {
                this.audioNode.disconnect(this.movie.actx.destination);
            };
            MixedAudioSource.prototype.start = function () {
                this.source.currentTime = this.currentTime + this.sourceStartTime;
                this.source.play();
            };
            MixedAudioSource.prototype.render = function () {
                _super.prototype.render.call(this);
                // TODO: implement Issue: Create built-in audio node to support built-in
                // audio nodes, as this does nothing rn
                this.source.muted = val(this, 'muted', this.currentTime);
                this.source.volume = val(this, 'volume', this.currentTime);
                this.source.playbackRate = val(this, 'playbackRate', this.currentTime);
            };
            MixedAudioSource.prototype.stop = function () {
                this.source.pause();
            };
            Object.defineProperty(MixedAudioSource.prototype, "audioNode", {
                /**
                 * The audio source node for the media
                 */
                get: function () {
                    return this._audioNode;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(MixedAudioSource.prototype, "playbackRate", {
                get: function () {
                    return this._playbackRate;
                },
                set: function (value) {
                    this._playbackRate = value;
                    if (this._unstretchedDuration !== undefined)
                        this.duration = this._unstretchedDuration / value;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(MixedAudioSource.prototype, "startTime", {
                get: function () {
                    return this.__startTime;
                },
                set: function (val) {
                    this.__startTime = val;
                    if (this._initialized) {
                        var mediaProgress = this.movie.currentTime - this.startTime;
                        this.source.currentTime = this.sourceStartTime + mediaProgress;
                    }
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(MixedAudioSource.prototype, "sourceStartTime", {
                /**
                 * Time in the media at which the layer starts
                 */
                get: function () {
                    return this._sourceStartTime;
                },
                set: function (val) {
                    this._sourceStartTime = val;
                    if (this._initialized) {
                        var mediaProgress = this.movie.currentTime - this.startTime;
                        this.source.currentTime = mediaProgress + this.sourceStartTime;
                    }
                },
                enumerable: false,
                configurable: true
            });
            MixedAudioSource.prototype.getDefaultOptions = function () {
                return __assign(__assign({}, superclass.prototype.getDefaultOptions()), { source: undefined, sourceStartTime: 0, duration: undefined, muted: false, volume: 1, playbackRate: 1 });
            };
            return MixedAudioSource;
        }(superclass));
        return MixedAudioSource;
    }

    /**
     * A layer outputs content for the movie
     */
    var Base = /** @class */ (function () {
        /**
         * Creates a new empty layer
         *
         * @param options
         * @param options.startTime - when to start the layer on the movie's
         * timeline
         * @param options.duration - how long the layer should last on the
         * movie's timeline
         */
        function Base(options) {
            // Set startTime and duration properties manually, because they are
            // readonly. applyOptions ignores readonly properties.
            this._startTime = options.startTime;
            this._duration = options.duration;
            // Proxy that will be returned by constructor (for sending 'modified'
            // events).
            var newThis = watchPublic(this);
            // Don't send updates when initializing, so use this instead of newThis
            applyOptions(options, this);
            // Whether this layer is currently being rendered
            this.active = false;
            this.enabled = true;
            this._occurrenceCount = 0; // no occurances in parent
            this._movie = null;
            // Propogate up to target
            subscribe(newThis, 'layer.change', function (event) {
                var typeOfChange = event.type.substring(event.type.lastIndexOf('.') + 1);
                var type = "movie.change.layer." + typeOfChange;
                publish(newThis._movie, type, __assign(__assign({}, event), { target: newThis._movie, type: type }));
            });
            return newThis;
        }
        /**
         * Attaches this layer to `movie` if not already attached.
         * @ignore
         */
        Base.prototype.tryAttach = function (movie) {
            if (this._occurrenceCount === 0)
                this.attach(movie);
            this._occurrenceCount++;
        };
        Base.prototype.attach = function (movie) {
            this._movie = movie;
        };
        /**
         * Dettaches this layer from its movie if the number of times `tryDetach` has
         * been called (including this call) equals the number of times `tryAttach`
         * has been called.
         *
         * @ignore
         */
        Base.prototype.tryDetach = function () {
            if (this.movie === null)
                throw new Error('No movie to detach from');
            this._occurrenceCount--;
            // If this layer occurs in another place in a `layers` array, do not unset
            // _movie. (For calling `unshift` on the `layers` proxy)
            if (this._occurrenceCount === 0)
                this.detach();
        };
        Base.prototype.detach = function () {
            this._movie = null;
        };
        /**
         * Called when the layer is activated
         */
        Base.prototype.start = function () { }; // eslint-disable-line @typescript-eslint/no-empty-function
        /**
         * Called when the movie renders and the layer is active
         */
        Base.prototype.render = function () { }; // eslint-disable-line @typescript-eslint/no-empty-function
        /**
        * Called when the layer is deactivated
         */
        Base.prototype.stop = function () { }; // eslint-disable-line @typescript-eslint/no-empty-function
        Object.defineProperty(Base.prototype, "parent", {
            // TODO: is this needed?
            get: function () {
                return this._movie;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Base.prototype, "startTime", {
            /**
             */
            get: function () {
                return this._startTime;
            },
            set: function (val) {
                this._startTime = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Base.prototype, "currentTime", {
            /**
             * The current time of the movie relative to this layer
             */
            get: function () {
                return this._movie ? this._movie.currentTime - this.startTime
                    : undefined;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Base.prototype, "duration", {
            /**
             */
            get: function () {
                return this._duration;
            },
            set: function (val) {
                this._duration = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Base.prototype, "movie", {
            get: function () {
                return this._movie;
            },
            enumerable: false,
            configurable: true
        });
        Base.prototype.getDefaultOptions = function () {
            return {
                startTime: undefined,
                duration: undefined // required
            };
        };
        return Base;
    }());
    // id for events (independent of instance, but easy to access when on prototype
    // chain)
    Base.prototype.type = 'layer';
    Base.prototype.publicExcludes = [];
    Base.prototype.propertyFilters = {};

    // TODO: rename to something more consistent with the naming convention of Visual and VisualSourceMixin
    /**
     * @extends AudioSource
     */
    var Audio = /** @class */ (function (_super) {
        __extends(Audio, _super);
        /**
         * Creates an audio layer
         */
        function Audio(options) {
            var _this = _super.call(this, options) || this;
            if (_this.duration === undefined)
                _this.duration = (_this).source.duration - _this.sourceStartTime;
            return _this;
        }
        Audio.prototype.getDefaultOptions = function () {
            return __assign(__assign({}, Object.getPrototypeOf(this).getDefaultOptions()), { 
                /**
                 * @name module:layer.Audio#sourceStartTime
                 * @desc Where in the media to start playing when the layer starts
                 */
                sourceStartTime: 0, duration: undefined });
        };
        return Audio;
    }(AudioSourceMixin(Base)));

    /** Any layer that renders to a canvas */
    var Visual = /** @class */ (function (_super) {
        __extends(Visual, _super);
        /**
         * Creates a visual layer
         */
        function Visual(options) {
            var _this = _super.call(this, options) || this;
            // Only validate extra if not subclassed, because if subclcass, there will
            // be extraneous options.
            applyOptions(options, _this);
            _this.canvas = document.createElement('canvas');
            _this.cctx = _this.canvas.getContext('2d');
            _this._effectsBack = [];
            _this.effects = new Proxy(_this._effectsBack, {
                deleteProperty: function (target, property) {
                    var value = target[property];
                    value.detach();
                    delete target[property];
                    return true;
                },
                set: function (target, property, value) {
                    if (!isNaN(Number(property))) {
                        // The property is a number (index)
                        if (target[property])
                            target[property].detach();
                        value.attach(_this);
                    }
                    target[property] = value;
                    return true;
                }
            });
            return _this;
        }
        /**
         * Render visual output
         */
        Visual.prototype.render = function () {
            // Prevent empty canvas errors if the width or height is 0
            var width = val(this, 'width', this.currentTime);
            var height = val(this, 'height', this.currentTime);
            if (width === 0 || height === 0)
                return;
            this.beginRender();
            this.doRender();
            this.endRender();
        };
        Visual.prototype.beginRender = function () {
            this.canvas.width = val(this, 'width', this.currentTime);
            this.canvas.height = val(this, 'height', this.currentTime);
            this.cctx.globalAlpha = val(this, 'opacity', this.currentTime);
        };
        Visual.prototype.doRender = function () {
            /*
             * If this.width or this.height is null, that means "take all available
             * screen space", so set it to this._move.width or this._movie.height,
             * respectively canvas.width & canvas.height are already interpolated
             */
            if (this.background) {
                this.cctx.fillStyle = val(this, 'background', this.currentTime);
                // (0, 0) relative to layer
                this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            var border = val(this, 'border', this.currentTime);
            if (border && border.color) {
                this.cctx.strokeStyle = border.color;
                // This is optional.. TODO: integrate this with defaultOptions
                this.cctx.lineWidth = border.thickness || 1;
            }
        };
        Visual.prototype.endRender = function () {
            var w = val(this, 'width', this.currentTime) || val(this.movie, 'width', this.movie.currentTime);
            var h = val(this, 'height', this.currentTime) || val(this.movie, 'height', this.movie.currentTime);
            if (w * h > 0)
                this._applyEffects();
            // else InvalidStateError for drawing zero-area image in some effects, right?
        };
        Visual.prototype._applyEffects = function () {
            for (var i = 0; i < this.effects.length; i++) {
                var effect = this.effects[i];
                if (effect && effect.enabled)
                    // Pass relative time
                    effect.apply(this, this.movie.currentTime - this.startTime);
            }
        };
        /**
         * Convienence method for <code>effects.push()</code>
         * @param effect
         * @return the layer (for chaining)
         */
        Visual.prototype.addEffect = function (effect) {
            this.effects.push(effect);
            return this;
        };
        Visual.prototype.getDefaultOptions = function () {
            return __assign(__assign({}, Base.prototype.getDefaultOptions()), { 
                /**
                 * @name module:layer.Visual#x
                 * @desc The offset of the layer relative to the movie
                 */
                x: 0, 
                /**
                 * @name module:layer.Visual#y
                 * @desc The offset of the layer relative to the movie
                 */
                y: 0, 
                /**
                 * @name module:layer.Visual#width
                 */
                width: null, 
                /**
                 * @name module:layer.Visual#height
                 */
                height: null, 
                /**
                 * @name module:layer.Visual#background
                 * @desc The CSS color code for the background, or <code>null</code> for
                 * transparency
                 */
                background: null, 
                /**
                 * @name module:layer.Visual#border
                 * @desc The CSS border style, or <code>null</code> for no border
                 */
                border: null, 
                /**
                 * @name module:layer.Visual#opacity
                 */
                opacity: 1 });
        };
        return Visual;
    }(Base));
    Visual.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['canvas', 'cctx', 'effects']);
    Visual.prototype.propertyFilters = __assign(__assign({}, Base.prototype.propertyFilters), { 
        /*
         * If this.width or this.height is null, that means "take all available screen
         * space", so set it to this._move.width or this._movie.height, respectively
         */
        width: function (width) {
            return width != undefined ? width : this._movie.width; // eslint-disable-line eqeqeq
        }, height: function (height) {
            return height != undefined ? height : this._movie.height; // eslint-disable-line eqeqeq
        } });

    /**
     * A layer that gets its image data from an HTML image or video element
     * @mixin VisualSourceMixin
     */
    function VisualSourceMixin(superclass) {
        var MixedVisualSource = /** @class */ (function (_super) {
            __extends(MixedVisualSource, _super);
            function MixedVisualSource(options) {
                var _this = _super.call(this, options) || this;
                applyOptions(options, _this);
                return _this;
            }
            MixedVisualSource.prototype.doRender = function () {
                // Clear/fill background
                _super.prototype.doRender.call(this);
                /*
                 * Source dimensions crop the image. Dest dimensions set the size that
                 * the image will be rendered at *on the layer*. Note that this is
                 * different than the layer dimensions (`this.width` and `this.height`).
                 * The main reason this distinction exists is so that an image layer can
                 * be rotated without being cropped (see iss #46).
                 */
                this.cctx.drawImage(this.source, val(this, 'sourceX', this.currentTime), val(this, 'sourceY', this.currentTime), val(this, 'sourceWidth', this.currentTime), val(this, 'sourceHeight', this.currentTime), 
                // `destX` and `destY` are relative to the layer
                val(this, 'destX', this.currentTime), val(this, 'destY', this.currentTime), val(this, 'destWidth', this.currentTime), val(this, 'destHeight', this.currentTime));
            };
            MixedVisualSource.prototype.getDefaultOptions = function () {
                return __assign(__assign({}, superclass.prototype.getDefaultOptions()), { source: undefined, sourceX: 0, sourceY: 0, sourceWidth: undefined, sourceHeight: undefined, destX: 0, destY: 0, destWidth: undefined, destHeight: undefined });
            };
            return MixedVisualSource;
        }(superclass));
        MixedVisualSource.prototype.propertyFilters = __assign(__assign({}, Visual.prototype.propertyFilters), { 
            /*
             * If no layer width was provided, fall back to the dest width.
             * If no dest width was provided, fall back to the source width.
             * If no source width was provided, fall back to `source.width`.
             */
            sourceWidth: function (sourceWidth) {
                // != instead of !== to account for `null`
                var width = this.source instanceof HTMLImageElement
                    ? this.source.width
                    : this.source.videoWidth;
                return sourceWidth != undefined ? sourceWidth : width; // eslint-disable-line eqeqeq
            }, sourceHeight: function (sourceHeight) {
                var height = this.source instanceof HTMLImageElement
                    ? this.source.height
                    : this.source.videoHeight;
                return sourceHeight != undefined ? sourceHeight : height; // eslint-disable-line eqeqeq
            }, destWidth: function (destWidth) {
                // I believe reltime is redundant, as element#currentTime can be used
                // instead. (TODO: fact check)
                /* eslint-disable eqeqeq */
                return destWidth != undefined
                    ? destWidth : val(this, 'sourceWidth', this.currentTime);
            }, destHeight: function (destHeight) {
                /* eslint-disable eqeqeq */
                return destHeight != undefined
                    ? destHeight : val(this, 'sourceHeight', this.currentTime);
            }, width: function (width) {
                /* eslint-disable eqeqeq */
                return width != undefined
                    ? width : val(this, 'destWidth', this.currentTime);
            }, height: function (height) {
                /* eslint-disable eqeqeq */
                return height != undefined
                    ? height : val(this, 'destHeight', this.currentTime);
            } });
        return MixedVisualSource;
    }

    var Image = /** @class */ (function (_super) {
        __extends(Image, _super);
        function Image() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Image;
    }(VisualSourceMixin(Visual)));

    var Text = /** @class */ (function (_super) {
        __extends(Text, _super);
        /**
         * Creates a new text layer
         */
        // TODO: add padding options
        // TODO: is textX necessary? it seems inconsistent, because you can't define
        // width/height directly for a text layer
        function Text(options) {
            var _this = 
            // Default to no (transparent) background
            _super.call(this, __assign({ background: null }, options)) || this;
            applyOptions(options, _this);
            return _this;
            // this._prevText = undefined;
            // // because the canvas context rounds font size, but we need to be more accurate
            // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
            // this._lastFont = undefined;
            // this._prevMaxWidth = undefined;
        }
        Text.prototype.doRender = function () {
            _super.prototype.doRender.call(this);
            var text = val(this, 'text', this.currentTime);
            var font = val(this, 'font', this.currentTime);
            var maxWidth = this.maxWidth ? val(this, 'maxWidth', this.currentTime) : undefined;
            // // properties that affect metrics
            // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
            //     this._updateMetrics(text, font, maxWidth);
            this.cctx.font = font;
            this.cctx.fillStyle = val(this, 'color', this.currentTime);
            this.cctx.textAlign = val(this, 'textAlign', this.currentTime);
            this.cctx.textBaseline = val(this, 'textBaseline', this.currentTime);
            this.cctx.direction = val(this, 'textDirection', this.currentTime);
            this.cctx.fillText(text, val(this, 'textX', this.currentTime), val(this, 'textY', this.currentTime), maxWidth);
            this._prevText = text;
            this._prevFont = font;
            this._prevMaxWidth = maxWidth;
        };
        // _updateMetrics(text, font, maxWidth) {
        //     // TODO calculate / measure for non-integer font.size values
        //     let metrics = Text._measureText(text, font, maxWidth);
        //     // TODO: allow user-specified/overwritten width/height
        //     this.width = /*this.width || */metrics.width;
        //     this.height = /*this.height || */metrics.height;
        // }
        // TODO: implement setters and getters that update dimensions!
        /* static _measureText(text, font, maxWidth) {
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
          } */
        Text.prototype.getDefaultOptions = function () {
            return __assign(__assign({}, Visual.prototype.getDefaultOptions()), { background: null, text: undefined, font: '10px sans-serif', color: '#fff', textX: 0, textY: 0, maxWidth: null, textAlign: 'start', textBaseline: 'top', textDirection: 'ltr' });
        };
        return Text;
    }(Visual));

    // Use mixins instead of `extend`ing two classes (which isn't supported by
    // JavaScript).
    /**
     * @extends AudioSource
     * @extends VisualSource
     */
    var Video = /** @class */ (function (_super) {
        __extends(Video, _super);
        function Video() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Video;
    }(AudioSourceMixin(VisualSourceMixin(Visual))));

    /**
     * @module layer
     */

    var index = /*#__PURE__*/Object.freeze({
        AudioSourceMixin: AudioSourceMixin,
        Audio: Audio,
        Base: Base,
        Image: Image,
        Text: Text,
        Video: Video,
        VisualSourceMixin: VisualSourceMixin,
        Visual: Visual
    });

    /**
     * Modifies the visual contents of a layer.
     */
    var Base$1 = /** @class */ (function () {
        function Base() {
            var newThis = watchPublic(this); // proxy that will be returned by constructor
            newThis.enabled = true;
            newThis._occurrenceCount = 0;
            newThis._target = null;
            // Propogate up to target
            subscribe(newThis, 'effect.change.modify', function (event) {
                if (!newThis._target)
                    return;
                var type = newThis._target.type + ".change.effect.modify";
                publish(newThis._target, type, __assign(__assign({}, event), { target: newThis._target, source: newThis, type: type }));
            });
            return newThis;
        }
        /**
         * Attaches this effect to `target` if not already attached.
         * @ignore
         */
        Base.prototype.tryAttach = function (target) {
            if (this._occurrenceCount === 0)
                this.attach(target);
            this._occurrenceCount++;
        };
        Base.prototype.attach = function (movie) {
            this._target = movie;
        };
        /**
         * Dettaches this effect from its target if the number of times `tryDetach`
         * has been called (including this call) equals the number of times
         * `tryAttach` has been called.
         *
         * @ignore
         */
        Base.prototype.tryDetach = function () {
            if (this._target === null)
                throw new Error('No movie to detach from');
            this._occurrenceCount--;
            // If this effect occurs in another place in the containing array, do not
            // unset _target. (For calling `unshift` on the `layers` proxy)
            if (this._occurrenceCount === 0)
                this.detach();
        };
        Base.prototype.detach = function () {
            this._target = null;
        };
        // subclasses must implement apply
        /**
         * Apply this effect to a target at the given time
         *
         * @param target
         * @param reltime - the movie's current time relative to the layer
         * (will soon be replaced with an instance getter)
         * @abstract
         */
        Base.prototype.apply = function (target, reltime) { }; // eslint-disable-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
        Object.defineProperty(Base.prototype, "currentTime", {
            /**
             * The current time of the target
             */
            get: function () {
                return this._target ? this._target.currentTime : undefined;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Base.prototype, "parent", {
            get: function () {
                return this._target;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Base.prototype, "movie", {
            get: function () {
                return this._target ? this._target.movie : undefined;
            },
            enumerable: false,
            configurable: true
        });
        Base.prototype.getDefaultOptions = function () {
            return {};
        };
        return Base;
    }());
    // id for events (independent of instance, but easy to access when on prototype
    // chain)
    Base$1.prototype.type = 'effect';
    Base$1.prototype.publicExcludes = [];
    Base$1.prototype.propertyFilters = {};

    /**
     * A hardware-accelerated pixel mapping using WebGL
     */
    // TODO: can `v_TextureCoord` be replaced by `gl_FragUV`?
    var Shader = /** @class */ (function (_super) {
        __extends(Shader, _super);
        /**
         * @param fragmentSrc
         * @param [userUniforms={}] - object mapping uniform id to an
         * options object or a string (if you only need to provide the uniforms'
         * type)
         * @param [userTextures=[]]
         * @param [sourceTextureOptions={}]
         */
        function Shader(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this) || this;
            // TODO: split up into multiple methods
            var fragmentSrc = options.fragmentSource || Shader._IDENTITY_FRAGMENT_SOURCE;
            var userUniforms = options.uniforms || {};
            var userTextures = options.textures || {};
            var sourceTextureOptions = options.sourceTextureOptions || {};
            var gl = _this._initGl();
            _this._program = Shader._initShaderProgram(gl, Shader._VERTEX_SOURCE, fragmentSrc);
            _this._buffers = Shader._initRectBuffers(gl);
            _this._initTextures(userUniforms, userTextures, sourceTextureOptions);
            _this._initAttribs();
            _this._initUniforms(userUniforms);
            return _this;
        }
        Shader.prototype._initGl = function () {
            this._canvas = document.createElement('canvas');
            var gl = this._canvas.getContext('webgl');
            if (gl === null)
                throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.');
            this._gl = gl;
            return gl;
        };
        Shader.prototype._initTextures = function (userUniforms, userTextures, sourceTextureOptions) {
            var gl = this._gl;
            var maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            if (userTextures.length > maxTextures)
                console.warn('Too many textures!');
            this._userTextures = {};
            for (var name_1 in userTextures) {
                var userOptions = userTextures[name_1];
                // Apply default options.
                var options = __assign(__assign({}, Shader._DEFAULT_TEXTURE_OPTIONS), userOptions);
                if (options.createUniform) {
                    /*
                     * Automatically, create a uniform with the same name as this texture,
                     * that points to it. This is an easy way for the user to use custom
                     * textures, without having to define multiple properties in the effect
                     * object.
                     */
                    if (userUniforms[name_1])
                        throw new Error("Texture - uniform naming conflict: " + name_1 + "!");
                    // Add this as a "user uniform".
                    userUniforms[name_1] = '1i'; // texture pointer
                }
                this._userTextures[name_1] = options;
            }
            this._sourceTextureOptions = __assign(__assign({}, Shader._DEFAULT_TEXTURE_OPTIONS), sourceTextureOptions);
        };
        Shader.prototype._initAttribs = function () {
            var gl = this._gl;
            this._attribLocations = {
                textureCoord: gl.getAttribLocation(this._program, 'a_TextureCoord')
                // a_VertexPosition ?? somehow it works without it though...
            };
        };
        Shader.prototype._initUniforms = function (userUniforms) {
            var gl = this._gl;
            this._uniformLocations = {
                source: gl.getUniformLocation(this._program, 'u_Source'),
                size: gl.getUniformLocation(this._program, 'u_Size')
            };
            // The options value can just be a string equal to the type of the variable,
            // for syntactic sugar. If this is the case, convert it to a real options
            // object.
            this._userUniforms = {};
            for (var name_2 in userUniforms) {
                var val_1 = userUniforms[name_2];
                this._userUniforms[name_2] = typeof val_1 === 'string' ? { type: val_1 } : val_1;
            }
            for (var unprefixed in userUniforms) {
                // property => u_Property
                var prefixed = 'u_' + unprefixed.charAt(0).toUpperCase() + (unprefixed.length > 1 ? unprefixed.slice(1) : '');
                this._uniformLocations[unprefixed] = gl.getUniformLocation(this._program, prefixed);
            }
        };
        // Not needed, right?
        /* watchWebGLOptions() {
              const pubChange = () => {
                  this.publish("change", {});
              };
              for (let name in this._userTextures) {
                  watch(this, name, pubChange);
              }
              for (let name in this._userUniforms) {
                  watch(this, name, pubChange);
              }
          } */
        Shader.prototype.apply = function (target, reltime) {
            this._checkDimensions(target);
            this._refreshGl();
            this._enablePositionAttrib();
            this._enableTexCoordAttrib();
            this._prepareTextures(target, reltime);
            this._gl.useProgram(this._program);
            this._prepareUniforms(target, reltime);
            this._draw(target);
        };
        Shader.prototype._checkDimensions = function (target) {
            var gl = this._gl;
            // TODO: Change target.canvas.width => target.width and see if it breaks
            // anything.
            if (this._canvas.width !== target.canvas.width || this._canvas.height !== target.canvas.height) { // (optimization)
                this._canvas.width = target.canvas.width;
                this._canvas.height = target.canvas.height;
                gl.viewport(0, 0, target.canvas.width, target.canvas.height);
            }
        };
        Shader.prototype._refreshGl = function () {
            var gl = this._gl;
            // Clear to black; fragments can be made transparent with the blendfunc
            // below.
            gl.clearColor(0, 0, 0, 1);
            // gl.clearDepth(1.0);         // clear everything
            // not sure why I can't multiply rgb by zero
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.SRC_ALPHA, gl.ONE, gl.ZERO);
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            // gl.depthFunc(gl.LEQUAL);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        };
        Shader.prototype._enablePositionAttrib = function () {
            var gl = this._gl;
            // Tell WebGL how to pull out the positions from buffer
            var numComponents = 2;
            // The data in the buffer is 32bit floats
            var type = gl.FLOAT;
            // Don't normalize
            var normalize = false;
            // How many bytes to get from one set of values to the next
            // 0 = use type and numComponents above
            var stride = 0;
            // How many bytes inside the buffer to start from
            var offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.position);
            gl.vertexAttribPointer(this._attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this._attribLocations.vertexPosition);
        };
        Shader.prototype._enableTexCoordAttrib = function () {
            var gl = this._gl;
            // tell webgl how to pull out the texture coordinates from buffer
            var numComponents = 2; // every coordinate composed of 2 values (uv)
            var type = gl.FLOAT; // the data in the buffer is 32 bit float
            var normalize = false; // don't normalize
            var stride = 0; // how many bytes to get from one set to the next
            var offset = 0; // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.textureCoord);
            gl.vertexAttribPointer(this._attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this._attribLocations.textureCoord);
        };
        Shader.prototype._prepareTextures = function (target, reltime) {
            var gl = this._gl;
            // TODO: figure out which properties should be private / public
            // Tell WebGL we want to affect texture unit 0
            // Call `activeTexture` before `_loadTexture` so it won't be bound to the
            // last active texture.
            gl.activeTexture(gl.TEXTURE0);
            this._inputTexture = Shader._loadTexture(gl, target.canvas, this._sourceTextureOptions);
            // Bind the texture to texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, this._inputTexture);
            var i = 0;
            for (var name_3 in this._userTextures) {
                var options = this._userTextures[name_3];
                /*
                 * Call `activeTexture` before `_loadTexture` so it won't be bound to the
                 * last active texture.
                 * TODO: investigate better implementation of `_loadTexture`
                 */
                gl.activeTexture(gl.TEXTURE0 + (Shader.INTERNAL_TEXTURE_UNITS + i)); // use the fact that TEXTURE0, TEXTURE1, ... are continuous
                var preparedTex = Shader._loadTexture(gl, val(this, name_3, reltime), options); // do it every frame to keep updated (I think you need to)
                gl.bindTexture(gl[options.target], preparedTex);
                i++;
            }
        };
        Shader.prototype._prepareUniforms = function (target, reltime) {
            var gl = this._gl;
            // Set the shader uniforms.
            // Tell the shader we bound the texture to texture unit 0.
            // All base (Shader class) uniforms are optional.
            if (this._uniformLocations.source)
                gl.uniform1i(this._uniformLocations.source, 0);
            // All base (Shader class) uniforms are optional.
            if (this._uniformLocations.size)
                gl.uniform2iv(this._uniformLocations.size, [target.canvas.width, target.canvas.height]);
            for (var unprefixed in this._userUniforms) {
                var options = this._userUniforms[unprefixed];
                var value = val(this, unprefixed, reltime);
                var preparedValue = this._prepareValue(value, options.type, reltime, options);
                var location_1 = this._uniformLocations[unprefixed];
                // haHA JavaScript (`options.type` is "1f", for instance)
                gl['uniform' + options.type](location_1, preparedValue);
            }
            gl.uniform1i(this._uniformLocations.test, 0);
        };
        Shader.prototype._draw = function (target) {
            var gl = this._gl;
            var offset = 0;
            var vertexCount = 4;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
            // clear the target, in case the effect outputs transparent pixels
            target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
            // copy internal image state onto target
            target.cctx.drawImage(this._canvas, 0, 0);
        };
        /**
         * Converts a value of a standard type for javascript to a standard type for
         * GLSL
         * @param value - the raw value to prepare
         * @param outputType - the WebGL type of |value|; example:
         * <code>1f</code> for a float
         * @param reltime - current time, relative to the target
         * @param [options] - Optional config
         */
        Shader.prototype._prepareValue = function (value, outputType, reltime, options) {
            if (options === void 0) { options = {}; }
            var def = options.defaultFloatComponent || 0;
            if (outputType === '1i') {
                /*
                 * Textures are passed to the shader by both providing the texture (with
                 * texImage2D) and setting the |sampler| uniform equal to the index of
                 * the texture. In vidar shader effects, the subclass passes the names of
                 * all the textures ot this base class, along with all the names of
                 * uniforms. By default, corresponding uniforms (with the same name) are
                 * created for each texture for ease of use. You can also define
                 * different texture properties in the javascript effect by setting it
                 * identical to the property with the passed texture name. In WebGL, it
                 * will be set to the same integer texture unit.
                 *
                 * To do this, test if |value| is identical to a texture. If so, set it
                 * to the texture's index, so the shader can use it.
                 */
                var i = 0;
                for (var name_4 in this._userTextures) {
                    var testValue = val(this, name_4, reltime);
                    if (value === testValue)
                        value = Shader.INTERNAL_TEXTURE_UNITS + i; // after the internal texture units
                    i++;
                }
            }
            if (outputType === '3fv') {
                // allow 4-component vectors; TODO: why?
                if (Array.isArray(value) && (value.length === 3 || value.length === 4))
                    return value;
                // kind of loose so this can be changed if needed
                if (typeof value === 'object')
                    return [
                        value.r !== undefined ? value.r : def,
                        value.g !== undefined ? value.g : def,
                        value.b !== undefined ? value.b : def
                    ];
                throw new Error("Invalid type: " + outputType + " or value: " + value);
            }
            if (outputType === '4fv') {
                if (Array.isArray(value) && value.length === 4)
                    return value;
                // kind of loose so this can be changed if needed
                if (typeof value === 'object')
                    return [
                        value.r !== undefined ? value.r : def,
                        value.g !== undefined ? value.g : def,
                        value.b !== undefined ? value.b : def,
                        value.a !== undefined ? value.a : def
                    ];
                throw new Error("Invalid type: " + outputType + " or value: " + value);
            }
            return value;
        };
        Shader._initRectBuffers = function (gl) {
            var position = [
                // the screen/canvas (output)
                -1.0, 1.0,
                1.0, 1.0,
                -1.0, -1.0,
                1.0, -1.0
            ];
            var textureCoord = [
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
        Shader._initBuffer = function (gl, data) {
            var buffer = gl.createBuffer();
            // Select the buffer as the one to apply buffer operations to from here out.
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
            return buffer;
        };
        /**
         * Creates a webgl texture from the source.
         * @param [options] - optional WebGL config for texture
         * @param [options.target=gl.TEXTURE_2D]
         * @param [options.level=0]
         * @param [options.internalFormat=gl.RGBA]
         * @param [options.srcFormat=gl.RGBA]
         * @param [options.srcType=gl.UNSIGNED_BYTE]
         * @param [options.wrapS=gl.CLAMP_TO_EDGE]
         * @param [options.wrapT=gl.CLAMP_TO_EDGE]
         * @param [options.minFilter=gl.LINEAR]
         * @param [options.magFilter=gl.LINEAR]
         */
        Shader._loadTexture = function (gl, source, options) {
            if (options === void 0) { options = {}; }
            // Apply default options, just in case.
            options = __assign(__assign({}, Shader._DEFAULT_TEXTURE_OPTIONS), options);
            // When creating the option, the user can't access `gl` so access it here.
            var target = gl[options.target];
            var level = options.level;
            var internalFormat = gl[options.internalFormat];
            var srcFormat = gl[options.srcFormat];
            var srcType = gl[options.srcType];
            var wrapS = gl[options.wrapS];
            var wrapT = gl[options.wrapT];
            var minFilter = gl[options.minFilter];
            var magFilter = gl[options.magFilter];
            // TODO: figure out how wrap-s and wrap-t interact with mipmaps
            // (for legacy support)
            // let wrapS = options.wrapS ? options.wrapS : gl.CLAMP_TO_EDGE,
            //     wrapT = options.wrapT ? options.wrapT : gl.CLAMP_TO_EDGE;
            var tex = gl.createTexture();
            gl.bindTexture(target, tex);
            // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true) // premultiply alpha
            // TODO: figure out how this works with layer width/height
            // TODO: support 3d textures (change texImage2D)
            // set to `source`
            gl.texImage2D(target, level, internalFormat, srcFormat, srcType, source);
            /*
             * WebGL1 has different requirements for power of 2 images vs non power of 2
             * images so check if the image is a power of 2 in both dimensions. Get
             * dimensions by using the fact that all valid inputs for texImage2D must have
             * `width` and `height` properties except videos, which have `videoWidth` and
             * `videoHeight` instead and `ArrayBufferView`, which is one dimensional (so
             * don't worry about mipmaps)
             */
            var w = target instanceof HTMLVideoElement ? target.videoWidth : target.width;
            var h = target instanceof HTMLVideoElement ? target.videoHeight : target.height;
            gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
            gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
            if ((w && isPowerOf2(w)) && (h && isPowerOf2(h))) {
                // Yes, it's a power of 2. All wrap modes are valid. Generate mips.
                gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
                gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
                gl.generateMipmap(target);
            }
            else {
                // No, it's not a power of 2. Turn off mips and set
                // wrapping to clamp to edge
                if (wrapS !== gl.CLAMP_TO_EDGE || wrapT !== gl.CLAMP_TO_EDGE)
                    console.warn('Wrap mode is not CLAMP_TO_EDGE for a non-power-of-two texture. Defaulting to CLAMP_TO_EDGE');
                gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
            return tex;
        };
        Shader._initShaderProgram = function (gl, vertexSrc, fragmentSrc) {
            var vertexShader = Shader._loadShader(gl, gl.VERTEX_SHADER, vertexSrc);
            var fragmentShader = Shader._loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
            var shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);
            // Check program creation status
            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                console.warn('Unable to link shader program: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }
            return shaderProgram;
        };
        Shader._loadShader = function (gl, type, source) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            // Check compile status
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.warn('An error occured compiling shader: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };
        /**
         * WebGL texture units consumed by {@link Shader}
         */
        Shader.INTERNAL_TEXTURE_UNITS = 1;
        Shader._DEFAULT_TEXTURE_OPTIONS = {
            createUniform: true,
            target: 'TEXTURE_2D',
            level: 0,
            internalFormat: 'RGBA',
            srcFormat: 'RGBA',
            srcType: 'UNSIGNED_BYTE',
            minFilter: 'LINEAR',
            magFilter: 'LINEAR',
            wrapS: 'CLAMP_TO_EDGE',
            wrapT: 'CLAMP_TO_EDGE'
        };
        Shader._VERTEX_SOURCE = "\n    attribute vec4 a_VertexPosition;\n    attribute vec2 a_TextureCoord;\n\n    varying highp vec2 v_TextureCoord;\n\n    void main() {\n        // no need for projection or model-view matrices, since we're just rendering a rectangle\n        // that fills the screen (see position values)\n        gl_Position = a_VertexPosition;\n        v_TextureCoord = a_TextureCoord;\n    }\n  ";
        Shader._IDENTITY_FRAGMENT_SOURCE = "\n    precision mediump float;\n\n    uniform sampler2D u_Source;\n\n    varying highp vec2 v_TextureCoord;\n\n    void main() {\n        gl_FragColor = texture2D(u_Source, v_TextureCoord);\n    }\n  ";
        return Shader;
    }(Base$1));
    // Shader.prototype.getpublicExcludes = () =>
    var isPowerOf2 = function (value) { return (value && (value - 1)) === 0; };

    /**
     * Changes the brightness
     */
    var Brightness = /** @class */ (function (_super) {
        __extends(Brightness, _super);
        /**
         * @param [brightness=0] - the value to add to each pixel's color
         * channels (between -255 and 255)
         */
        function Brightness(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, {
                fragmentSource: "\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform float u_Brightness;\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          vec4 color = texture2D(u_Source, v_TextureCoord);\n          vec3 rgb = clamp(color.rgb + u_Brightness / 255.0, 0.0, 1.0);\n          gl_FragColor = vec4(rgb, color.a);\n        }\n      ",
                uniforms: {
                    brightness: '1f'
                }
            }) || this;
            /**
             * The value to add to each pixel's color channels (between -255 and 255)
             */
            _this.brightness = options.brightness || 0;
            return _this;
        }
        return Brightness;
    }(Shader));

    /**
     * Multiplies each channel by a different factor
     */
    var Channels = /** @class */ (function (_super) {
        __extends(Channels, _super);
        /**
         * @param factors - channel factors, each defaulting to 1
         */
        function Channels(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, {
                fragmentSource: "\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform vec4 u_Factors;\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          vec4 color = texture2D(u_Source, v_TextureCoord);\n          gl_FragColor = clamp(u_Factors * color, 0.0, 1.0);\n        }\n      ",
                uniforms: {
                    factors: { type: '4fv', defaultFloatComponent: 1 }
                }
            }) || this;
            /**
             * Channel factors, each defaulting to 1
             */
            _this.factors = options.factors || {};
            return _this;
        }
        return Channels;
    }(Shader));

    /**
     * Reduces alpha for pixels which are close to a specified target color
     */
    var ChromaKey = /** @class */ (function (_super) {
        __extends(ChromaKey, _super);
        /**
         * @param [target={r: 0, g: 0, b: 0, a: 1}] - the color to remove
         * @param [threshold=0] - how much error to allow
         * @param [interpolate=false] - <code>true</code> to interpolate
         * the alpha channel, or <code>false</code> value for no smoothing (i.e. an
         * alpha of either 0 or 255)
         */
        // TODO: Use <code>smoothingSharpness</code>
        function ChromaKey(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, {
                fragmentSource: "\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform vec3 u_Target;\n        uniform float u_Threshold;\n        uniform bool u_Interpolate;\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          vec4 color = texture2D(u_Source, v_TextureCoord);\n          float alpha = color.a;\n          vec3 dist = abs(color.rgb - u_Target / 255.0);\n          if (!u_Interpolate) {\n            // Standard way that most video editors probably use (all-or-nothing method)\n            float thresh = u_Threshold / 255.0;\n            bool transparent = dist.r <= thresh && dist.g <= thresh && dist.b <= thresh;\n            if (transparent)\n              alpha = 0.0;\n          } else {\n            /*\n             better way IMHO:\n             Take the average of the absolute differences between the pixel and the target for each channel\n             */\n            float transparency = (dist.r + dist.g + dist.b) / 3.0;\n            // TODO: custom or variety of interpolation methods\n            alpha = transparency;\n          }\n          gl_FragColor = vec4(color.rgb, alpha);\n        }\n      ",
                uniforms: {
                    target: '3fv',
                    threshold: '1f',
                    interpolate: '1i'
                }
            }) || this;
            /**
             * The color to remove
             */
            _this.target = options.target || new Color(0, 0, 0);
            /**
             * How much error to allow
             */
            _this.threshold = options.threshold || 0;
            /**
             * <code>true<code> to interpolate the alpha channel, or <code>false<code>
             * for no smoothing (i.e. 255 or 0 alpha)
             */
            _this.interpolate = options.interpolate || false;
            return _this;
            // this.smoothingSharpness = smoothingSharpness;
        }
        return ChromaKey;
    }(Shader));

    /**
     * Changes the contrast by multiplying the RGB channels by a constant
     */
    var Contrast = /** @class */ (function (_super) {
        __extends(Contrast, _super);
        /**
         * @param [contrast=1] - the contrast multiplier
         */
        function Contrast(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, {
                fragmentSource: "\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform float u_Contrast;\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          vec4 color = texture2D(u_Source, v_TextureCoord);\n          vec3 rgb = clamp(u_Contrast * (color.rgb - 0.5) + 0.5, 0.0, 1.0);\n          gl_FragColor = vec4(rgb, color.a);\n        }\n      ",
                uniforms: {
                    contrast: '1f'
                }
            }) || this;
            /**
             * The contrast multiplier
             */
            _this.contrast = options.contrast || 1;
            return _this;
        }
        return Contrast;
    }(Shader));

    var EllipticalMaskOptions = /** @class */ (function () {
        function EllipticalMaskOptions() {
        }
        return EllipticalMaskOptions;
    }());
    /**
     * Preserves an ellipse of the layer and clears the rest
     */
    // TODO: Parent layer mask effects will make more complex masks easier
    var EllipticalMask = /** @class */ (function (_super) {
        __extends(EllipticalMask, _super);
        function EllipticalMask(options) {
            var _this = _super.call(this) || this;
            _this.x = options.x;
            _this.y = options.y;
            _this.radiusX = options.radiusX;
            _this.radiusY = options.radiusY;
            _this.rotation = options.rotation || 0;
            _this.startAngle = options.startAngle || 0;
            _this.endAngle = options.endAngle !== undefined ? options.endAngle : 2 * Math.PI;
            _this.anticlockwise = options.anticlockwise || false;
            // for saving image data before clearing
            _this._tmpCanvas = document.createElement('canvas');
            _this._tmpCtx = _this._tmpCanvas.getContext('2d');
            return _this;
        }
        EllipticalMask.prototype.apply = function (target, reltime) {
            var ctx = target.cctx;
            var canvas = target.canvas;
            var x = val(this, 'x', reltime);
            var y = val(this, 'y', reltime);
            var radiusX = val(this, 'radiusX', reltime);
            var radiusY = val(this, 'radiusY', reltime);
            var rotation = val(this, 'rotation', reltime);
            var startAngle = val(this, 'startAngle', reltime);
            var endAngle = val(this, 'endAngle', reltime);
            var anticlockwise = val(this, 'anticlockwise', reltime);
            this._tmpCanvas.width = target.canvas.width;
            this._tmpCanvas.height = target.canvas.height;
            this._tmpCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save(); // idk how to preserve clipping state without save/restore
            // create elliptical path and clip
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);
            ctx.closePath();
            ctx.clip();
            // render image with clipping state
            ctx.drawImage(this._tmpCanvas, 0, 0);
            ctx.restore();
        };
        return EllipticalMask;
    }(Base$1));

    /**
     * A sequence of effects to apply, treated as one effect. This can be useful
     * for defining reused effect sequences as one effect.
     */
    var Stack = /** @class */ (function (_super) {
        __extends(Stack, _super);
        function Stack(options) {
            var _this = _super.call(this) || this;
            _this._effectsBack = [];
            // TODO: Throw 'change' events in handlers
            _this.effects = new Proxy(_this._effectsBack, {
                deleteProperty: function (target, property) {
                    var value = target[property];
                    value.detach(); // Detach effect from movie
                    delete target[property];
                    return true;
                },
                set: function (target, property, value) {
                    // TODO: make sure type check works
                    if (!isNaN(Number(property))) { // if property is a number (index)
                        if (target[property])
                            target[property].detach(); // Detach old effect from movie
                        value.attach(this._target); // Attach effect to movie
                    }
                    target[property] = value;
                    return true;
                }
            });
            options.effects.forEach(function (effect) { return _this.effects.push(effect); });
            return _this;
            // TODO: Propogate 'change' events from children up
        }
        Stack.prototype.attach = function (movie) {
            _super.prototype.attach.call(this, movie);
            this.effects.filter(function (effect) { return !!effect; }).forEach(function (effect) {
                effect.detach();
                effect.attach(movie);
            });
        };
        Stack.prototype.detach = function () {
            _super.prototype.detach.call(this);
            this.effects.filter(function (effect) { return !!effect; }).forEach(function (effect) {
                effect.detach();
            });
        };
        Stack.prototype.apply = function (target, reltime) {
            for (var i = 0; i < this.effects.length; i++) {
                var effect = this.effects[i];
                if (!effect)
                    continue;
                effect.apply(target, reltime);
            }
        };
        /**
         * Convenience method for chaining
         * @param effect - the effect to append
         */
        Stack.prototype.addEffect = function (effect) {
            this.effects.push(effect);
            return this;
        };
        return Stack;
    }(Base$1));

    /**
     * Applies a Gaussian blur
     */
    // TODO: Improve performance
    // TODO: Make sure this is truly gaussian even though it doens't require a
    // standard deviation
    var GaussianBlur = /** @class */ (function (_super) {
        __extends(GaussianBlur, _super);
        function GaussianBlur(options) {
            // Divide into two shader effects (use the fact that gaussian blurring can
            // be split into components for performance benefits)
            return _super.call(this, {
                effects: [
                    new GaussianBlurHorizontal(options),
                    new GaussianBlurVertical(options)
                ]
            }) || this;
        }
        return GaussianBlur;
    }(Stack));
    /**
     * Shared class for both horizontal and vertical gaussian blur classes.
     */
    // TODO: If radius == 0, don't affect the image (right now, the image goes black).
    var GaussianBlurComponent = /** @class */ (function (_super) {
        __extends(GaussianBlurComponent, _super);
        /**
         * @param src - fragment source code (specific to which component -
         * horizontal or vertical)
         * @param radius - only integers are currently supported
         */
        function GaussianBlurComponent(options) {
            var _this = _super.call(this, {
                fragmentSource: options.fragmentSource,
                uniforms: {
                    radius: '1i'
                },
                textures: {
                    shape: { minFilter: 'NEAREST', magFilter: 'NEAREST' }
                }
            }) || this;
            /**
             */
            _this.radius = options.radius;
            _this._radiusCache = undefined;
            return _this;
        }
        GaussianBlurComponent.prototype.apply = function (target, reltime) {
            var radiusVal = val(this, 'radius', reltime);
            if (radiusVal !== this._radiusCache)
                // Regenerate gaussian distribution canvas.
                this.shape = GaussianBlurComponent._render1DKernel(GaussianBlurComponent._gen1DKernel(radiusVal));
            this._radiusCache = radiusVal;
            _super.prototype.apply.call(this, target, reltime);
        };
        /**
         * Render Gaussian kernel to a canvas for use in shader.
         * @param kernel
         * @private
         *
         * @return
         */
        GaussianBlurComponent._render1DKernel = function (kernel) {
            // TODO: Use Float32Array instead of canvas.
            // init canvas
            var canvas = document.createElement('canvas');
            canvas.width = kernel.length;
            canvas.height = 1; // 1-dimensional
            var ctx = canvas.getContext('2d');
            // draw to canvas
            var imageData = ctx.createImageData(canvas.width, canvas.height);
            for (var i = 0; i < kernel.length; i++) {
                imageData.data[4 * i + 0] = 255 * kernel[i]; // Use red channel to store distribution weights.
                imageData.data[4 * i + 1] = 0; // Clear all other channels.
                imageData.data[4 * i + 2] = 0;
                imageData.data[4 * i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        };
        GaussianBlurComponent._gen1DKernel = function (radius) {
            var pascal = GaussianBlurComponent._genPascalRow(2 * radius + 1);
            // don't use `reduce` and `map` (overhead?)
            var sum = 0;
            for (var i = 0; i < pascal.length; i++)
                sum += pascal[i];
            for (var i = 0; i < pascal.length; i++)
                pascal[i] /= sum;
            return pascal;
        };
        GaussianBlurComponent._genPascalRow = function (index) {
            if (index < 0)
                throw new Error("Invalid index " + index);
            var currRow = [1];
            for (var i = 1; i < index; i++) {
                var nextRow = [];
                nextRow.length = currRow.length + 1;
                // edges are always 1's
                nextRow[0] = nextRow[nextRow.length - 1] = 1;
                for (var j = 1; j < nextRow.length - 1; j++)
                    nextRow[j] = currRow[j - 1] + currRow[j];
                currRow = nextRow;
            }
            return currRow;
        };
        return GaussianBlurComponent;
    }(Shader));
    GaussianBlurComponent.prototype.publicExcludes = Shader.prototype.publicExcludes.concat(['shape']);
    /**
     * Horizontal component of gaussian blur
     */
    var GaussianBlurHorizontal = /** @class */ (function (_super) {
        __extends(GaussianBlurHorizontal, _super);
        /**
         * @param radius
         */
        function GaussianBlurHorizontal(options) {
            return _super.call(this, {
                fragmentSource: "\n        #define MAX_RADIUS 250\n\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform ivec2 u_Size;   // pixel dimensions of input and output\n        uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)\n        uniform int u_Radius;   // TODO: support floating-point radii\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          /*\n           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1\n           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)\n           * So, normalize by accumulating all the weights and dividing by that.\n           */\n          float totalWeight = 0.0;\n          vec4 avg = vec4(0.0);\n          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,\n          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.\n          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {\n            if (i >= 2 * u_Radius + 1)\n              break;  // GLSL can only use constants in for-loop declaration, so we break here.\n            // (2 * u_Radius + 1) is the width of u_Shape, by definition\n            float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format\n            totalWeight += weight;\n            vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(i - u_Radius, 0.0) / vec2(u_Size));\n            avg += weight * sample;\n          }\n          gl_FragColor = avg / totalWeight;\n        }\n      ",
                radius: options.radius
            }) || this;
        }
        return GaussianBlurHorizontal;
    }(GaussianBlurComponent));
    /**
     * Vertical component of gaussian blur
     */
    var GaussianBlurVertical = /** @class */ (function (_super) {
        __extends(GaussianBlurVertical, _super);
        /**
         * @param radius
         */
        function GaussianBlurVertical(options) {
            return _super.call(this, {
                fragmentSource: "\n        #define MAX_RADIUS 250\n\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform ivec2 u_Size;   // pixel dimensions of input and output\n        uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)\n        uniform int u_Radius;   // TODO: support floating-point radii\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          /*\n           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1\n           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)\n           * So, normalize by accumulating all the weights and dividing by that.\n           */\n          float totalWeight = 0.0;\n          vec4 avg = vec4(0.0);\n          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,\n          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.\n          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {\n            if (i >= 2 * u_Radius + 1)\n              break;  // GLSL can only use constants in for-loop declaration, so we break here.\n            // (2 * u_Radius + 1) is the width of u_Shape, by definition\n            float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format\n            totalWeight += weight;\n            vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(0.0, i - u_Radius) / vec2(u_Size));\n            avg += weight * sample;\n          }\n          gl_FragColor = avg / totalWeight;\n        }\n      ",
                radius: options.radius
            }) || this;
        }
        return GaussianBlurVertical;
    }(GaussianBlurComponent));

    /**
     * Converts the target to a grayscale image
     */
    var Grayscale = /** @class */ (function (_super) {
        __extends(Grayscale, _super);
        function Grayscale() {
            return _super.call(this, {
                fragmentSource: "\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform vec4 u_Factors;\n\n        varying highp vec2 v_TextureCoord;\n\n        float max3(float x, float y, float z) {\n          return max(x, max(y, z));\n        }\n\n        float min3(float x, float y, float z) {\n          return min(x, min(y, z));\n        }\n\n        void main() {\n          vec4 color = texture2D(u_Source, v_TextureCoord);\n          // Desaturate\n          float value = (max3(color.r, color.g, color.b) + min3(color.r, color.g, color.b)) / 2.0;\n          gl_FragColor = vec4(value, value, value, color.a);\n        }\n      "
            }) || this;
        }
        return Grayscale;
    }(Shader));

    /**
     * Breaks the target up into squares of `pixelSize` by `pixelSize`
     */
    // TODO: just resample with NEAREST interpolation? but how?
    var Pixelate = /** @class */ (function (_super) {
        __extends(Pixelate, _super);
        /**
         * @param pixelSize
         */
        function Pixelate(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, {
                fragmentSource: "\n        precision mediump float;\n\n        uniform sampler2D u_Source;\n        uniform ivec2 u_Size;\n        uniform int u_PixelSize;\n\n        varying highp vec2 v_TextureCoord;\n\n        void main() {\n          int ps = u_PixelSize;\n\n          // Snap to nearest block's center\n          vec2 loc = vec2(u_Size) * v_TextureCoord; // pixel-space\n          vec2 snappedLoc = float(ps) * floor(loc / float(ps));\n          vec2 centeredLoc = snappedLoc + vec2(float(u_PixelSize) / 2.0 + 0.5);\n          vec2 clampedLoc = clamp(centeredLoc, vec2(0.0), vec2(u_Size));\n          gl_FragColor = texture2D(u_Source, clampedLoc / vec2(u_Size));\n        }\n      ",
                uniforms: {
                    pixelSize: '1i'
                }
            }) || this;
            /**
             */
            _this.pixelSize = options.pixelSize || 1;
            return _this;
        }
        Pixelate.prototype.apply = function (target, reltime) {
            var ps = val(this, 'pixelSize', reltime);
            if (ps % 1 !== 0 || ps < 0)
                throw new Error('Pixel size must be a nonnegative integer');
            _super.prototype.apply.call(this, target, reltime);
        };
        return Pixelate;
    }(Shader));

    /**
     * Transforms a layer or movie using a transformation matrix. Use {@link
     * Transform.Matrix} to either A) calculate those values based on a series of
     * translations, scalings and rotations) or B) input the matrix values
     * directly, using the optional argument in the constructor.
     */
    var Transform = /** @class */ (function (_super) {
        __extends(Transform, _super);
        /**
         * @param matrix - matrix that determines how to transform the target
         */
        function Transform(options) {
            var _this = _super.call(this) || this;
            /**
             * How to transform the target
             */
            _this.matrix = options.matrix;
            _this._tmpMatrix = new Transform.Matrix();
            _this._tmpCanvas = document.createElement('canvas');
            _this._tmpCtx = _this._tmpCanvas.getContext('2d');
            return _this;
        }
        Transform.prototype.apply = function (target, reltime) {
            if (target.canvas.width !== this._tmpCanvas.width)
                this._tmpCanvas.width = target.canvas.width;
            if (target.canvas.height !== this._tmpCanvas.height)
                this._tmpCanvas.height = target.canvas.height;
            // Use data, since that's the underlying storage
            this._tmpMatrix.data = val(this, 'matrix.data', reltime);
            this._tmpCtx.setTransform(this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c, this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f);
            this._tmpCtx.drawImage(target.canvas, 0, 0);
            // Assume it was identity for now
            this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0);
            target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
            target.cctx.drawImage(this._tmpCanvas, 0, 0);
        };
        return Transform;
    }(Base$1));
    (function (Transform) {
        /**
         * @class
         * A 3x3 matrix for storing 2d transformations
         */
        var Matrix = /** @class */ (function () {
            function Matrix(data) {
                this.data = data || [
                    1, 0, 0,
                    0, 1, 0,
                    0, 0, 1
                ];
            }
            Matrix.prototype.identity = function () {
                for (var i = 0; i < this.data.length; i++)
                    this.data[i] = Matrix.IDENTITY.data[i];
                return this;
            };
            /**
             * @param x
             * @param y
             * @param [val]
             */
            Matrix.prototype.cell = function (x, y, val) {
                if (val !== undefined)
                    this.data[3 * y + x] = val;
                return this.data[3 * y + x];
            };
            Object.defineProperty(Matrix.prototype, "a", {
                /* For canvas context setTransform */
                get: function () {
                    return this.data[0];
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(Matrix.prototype, "b", {
                get: function () {
                    return this.data[3];
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(Matrix.prototype, "c", {
                get: function () {
                    return this.data[1];
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(Matrix.prototype, "d", {
                get: function () {
                    return this.data[4];
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(Matrix.prototype, "e", {
                get: function () {
                    return this.data[2];
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(Matrix.prototype, "f", {
                get: function () {
                    return this.data[5];
                },
                enumerable: false,
                configurable: true
            });
            /**
             * Combines <code>this</code> with another matrix <code>other</code>
             * @param other
             */
            Matrix.prototype.multiply = function (other) {
                // copy to temporary matrix to avoid modifying `this` while reading from it
                for (var x = 0; x < 3; x++)
                    for (var y = 0; y < 3; y++) {
                        var sum = 0;
                        for (var i = 0; i < 3; i++)
                            sum += this.cell(x, i) * other.cell(i, y);
                        Matrix._TMP_MATRIX.cell(x, y, sum);
                    }
                // copy data from TMP_MATRIX to this
                for (var i = 0; i < Matrix._TMP_MATRIX.data.length; i++)
                    this.data[i] = Matrix._TMP_MATRIX.data[i];
                return this;
            };
            /**
             * @param x
             * @param y
             */
            Matrix.prototype.translate = function (x, y) {
                this.multiply(new Matrix([
                    1, 0, x,
                    0, 1, y,
                    0, 0, 1
                ]));
                return this;
            };
            /**
             * @param x
             * @param y
             */
            Matrix.prototype.scale = function (x, y) {
                this.multiply(new Matrix([
                    x, 0, 0,
                    0, y, 0,
                    0, 0, 1
                ]));
                return this;
            };
            /**
             * @param a - the angle or rotation in radians
             */
            Matrix.prototype.rotate = function (a) {
                var c = Math.cos(a);
                var s = Math.sin(a);
                this.multiply(new Matrix([
                    c, s, 0,
                    -s, c, 0,
                    0, 0, 1
                ]));
                return this;
            };
            /**
             * The identity matrix
             */
            Matrix.IDENTITY = new Matrix();
            Matrix._TMP_MATRIX = new Matrix();
            return Matrix;
        }());
        Transform.Matrix = Matrix;
    })(Transform || (Transform = {}));

    /**
     * @module effect
     */

    var index$1 = /*#__PURE__*/Object.freeze({
        Base: Base$1,
        Brightness: Brightness,
        Channels: Channels,
        ChromaKey: ChromaKey,
        Contrast: Contrast,
        EllipticalMaskOptions: EllipticalMaskOptions,
        EllipticalMask: EllipticalMask,
        GaussianBlur: GaussianBlur,
        GaussianBlurHorizontal: GaussianBlurHorizontal,
        GaussianBlurVertical: GaussianBlurVertical,
        Grayscale: Grayscale,
        Pixelate: Pixelate,
        Shader: Shader,
        Stack: Stack,
        get Transform () { return Transform; }
    });

    const createExtendedExponentialRampToValueAutomationEvent = (value, endTime, insertTime) => {
        return { endTime, insertTime, type: 'exponentialRampToValue', value };
    };

    const createExtendedLinearRampToValueAutomationEvent = (value, endTime, insertTime) => {
        return { endTime, insertTime, type: 'linearRampToValue', value };
    };

    const createSetValueAutomationEvent = (value, startTime) => {
        return { startTime, type: 'setValue', value };
    };

    const createSetValueCurveAutomationEvent = (values, startTime, duration) => {
        return { duration, startTime, type: 'setValueCurve', values };
    };

    const getTargetValueAtTime = (time, valueAtStartTime, { startTime, target, timeConstant }) => {
        return target + (valueAtStartTime - target) * Math.exp((startTime - time) / timeConstant);
    };

    const isExponentialRampToValueAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'exponentialRampToValue';
    };

    const isLinearRampToValueAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'linearRampToValue';
    };

    const isAnyRampToValueAutomationEvent = (automationEvent) => {
        return isExponentialRampToValueAutomationEvent(automationEvent) || isLinearRampToValueAutomationEvent(automationEvent);
    };

    const isSetValueAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'setValue';
    };

    const isSetValueCurveAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'setValueCurve';
    };

    const getValueOfAutomationEventAtIndexAtTime = (automationEvents, index, time, defaultValue) => {
        const automationEvent = automationEvents[index];
        return automationEvent === undefined
            ? defaultValue
            : isAnyRampToValueAutomationEvent(automationEvent) || isSetValueAutomationEvent(automationEvent)
                ? automationEvent.value
                : isSetValueCurveAutomationEvent(automationEvent)
                    ? automationEvent.values[automationEvent.values.length - 1]
                    : getTargetValueAtTime(time, getValueOfAutomationEventAtIndexAtTime(automationEvents, index - 1, automationEvent.startTime, defaultValue), automationEvent);
    };

    const getEndTimeAndValueOfPreviousAutomationEvent = (automationEvents, index, currentAutomationEvent, nextAutomationEvent, defaultValue) => {
        return currentAutomationEvent === undefined
            ? [nextAutomationEvent.insertTime, defaultValue]
            : isAnyRampToValueAutomationEvent(currentAutomationEvent)
                ? [currentAutomationEvent.endTime, currentAutomationEvent.value]
                : isSetValueAutomationEvent(currentAutomationEvent)
                    ? [currentAutomationEvent.startTime, currentAutomationEvent.value]
                    : isSetValueCurveAutomationEvent(currentAutomationEvent)
                        ? [
                            currentAutomationEvent.startTime + currentAutomationEvent.duration,
                            currentAutomationEvent.values[currentAutomationEvent.values.length - 1]
                        ]
                        : [
                            currentAutomationEvent.startTime,
                            getValueOfAutomationEventAtIndexAtTime(automationEvents, index - 1, currentAutomationEvent.startTime, defaultValue)
                        ];
    };

    const isCancelAndHoldAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'cancelAndHold';
    };

    const isCancelScheduledValuesAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'cancelScheduledValues';
    };

    const getEventTime = (automationEvent) => {
        if (isCancelAndHoldAutomationEvent(automationEvent) || isCancelScheduledValuesAutomationEvent(automationEvent)) {
            return automationEvent.cancelTime;
        }
        if (isExponentialRampToValueAutomationEvent(automationEvent) || isLinearRampToValueAutomationEvent(automationEvent)) {
            return automationEvent.endTime;
        }
        return automationEvent.startTime;
    };

    const getExponentialRampValueAtTime = (time, startTime, valueAtStartTime, { endTime, value }) => {
        if (valueAtStartTime === value) {
            return value;
        }
        if ((0 < valueAtStartTime && 0 < value) || (valueAtStartTime < 0 && value < 0)) {
            return valueAtStartTime * (value / valueAtStartTime) ** ((time - startTime) / (endTime - startTime));
        }
        return 0;
    };

    const getLinearRampValueAtTime = (time, startTime, valueAtStartTime, { endTime, value }) => {
        return valueAtStartTime + ((time - startTime) / (endTime - startTime)) * (value - valueAtStartTime);
    };

    const interpolateValue = (values, theoreticIndex) => {
        const lowerIndex = Math.floor(theoreticIndex);
        const upperIndex = Math.ceil(theoreticIndex);
        if (lowerIndex === upperIndex) {
            return values[lowerIndex];
        }
        return (1 - (theoreticIndex - lowerIndex)) * values[lowerIndex] + (1 - (upperIndex - theoreticIndex)) * values[upperIndex];
    };

    const getValueCurveValueAtTime = (time, { duration, startTime, values }) => {
        const theoreticIndex = ((time - startTime) / duration) * (values.length - 1);
        return interpolateValue(values, theoreticIndex);
    };

    const isSetTargetAutomationEvent = (automationEvent) => {
        return automationEvent.type === 'setTarget';
    };

    class AutomationEventList {
        constructor(defaultValue) {
            this._automationEvents = [];
            this._currenTime = 0;
            this._defaultValue = defaultValue;
        }
        [Symbol.iterator]() {
            return this._automationEvents[Symbol.iterator]();
        }
        add(automationEvent) {
            const eventTime = getEventTime(automationEvent);
            if (isCancelAndHoldAutomationEvent(automationEvent) || isCancelScheduledValuesAutomationEvent(automationEvent)) {
                const index = this._automationEvents.findIndex((currentAutomationEvent) => {
                    if (isCancelScheduledValuesAutomationEvent(automationEvent) && isSetValueCurveAutomationEvent(currentAutomationEvent)) {
                        return currentAutomationEvent.startTime + currentAutomationEvent.duration >= eventTime;
                    }
                    return getEventTime(currentAutomationEvent) >= eventTime;
                });
                const removedAutomationEvent = this._automationEvents[index];
                if (index !== -1) {
                    this._automationEvents = this._automationEvents.slice(0, index);
                }
                if (isCancelAndHoldAutomationEvent(automationEvent)) {
                    const lastAutomationEvent = this._automationEvents[this._automationEvents.length - 1];
                    if (removedAutomationEvent !== undefined && isAnyRampToValueAutomationEvent(removedAutomationEvent)) {
                        if (isSetTargetAutomationEvent(lastAutomationEvent)) {
                            throw new Error('The internal list is malformed.');
                        }
                        const startTime = isSetValueCurveAutomationEvent(lastAutomationEvent)
                            ? lastAutomationEvent.startTime + lastAutomationEvent.duration
                            : getEventTime(lastAutomationEvent);
                        const startValue = isSetValueCurveAutomationEvent(lastAutomationEvent)
                            ? lastAutomationEvent.values[lastAutomationEvent.values.length - 1]
                            : lastAutomationEvent.value;
                        const value = isExponentialRampToValueAutomationEvent(removedAutomationEvent)
                            ? getExponentialRampValueAtTime(eventTime, startTime, startValue, removedAutomationEvent)
                            : getLinearRampValueAtTime(eventTime, startTime, startValue, removedAutomationEvent);
                        const truncatedAutomationEvent = isExponentialRampToValueAutomationEvent(removedAutomationEvent)
                            ? createExtendedExponentialRampToValueAutomationEvent(value, eventTime, this._currenTime)
                            : createExtendedLinearRampToValueAutomationEvent(value, eventTime, this._currenTime);
                        this._automationEvents.push(truncatedAutomationEvent);
                    }
                    if (lastAutomationEvent !== undefined && isSetTargetAutomationEvent(lastAutomationEvent)) {
                        this._automationEvents.push(createSetValueAutomationEvent(this.getValue(eventTime), eventTime));
                    }
                    if (lastAutomationEvent !== undefined &&
                        isSetValueCurveAutomationEvent(lastAutomationEvent) &&
                        lastAutomationEvent.startTime + lastAutomationEvent.duration > eventTime) {
                        this._automationEvents[this._automationEvents.length - 1] = createSetValueCurveAutomationEvent(new Float32Array([6, 7]), lastAutomationEvent.startTime, eventTime - lastAutomationEvent.startTime);
                    }
                }
            }
            else {
                const index = this._automationEvents.findIndex((currentAutomationEvent) => getEventTime(currentAutomationEvent) > eventTime);
                const previousAutomationEvent = index === -1 ? this._automationEvents[this._automationEvents.length - 1] : this._automationEvents[index - 1];
                if (previousAutomationEvent !== undefined &&
                    isSetValueCurveAutomationEvent(previousAutomationEvent) &&
                    getEventTime(previousAutomationEvent) + previousAutomationEvent.duration > eventTime) {
                    return false;
                }
                const persistentAutomationEvent = isExponentialRampToValueAutomationEvent(automationEvent)
                    ? createExtendedExponentialRampToValueAutomationEvent(automationEvent.value, automationEvent.endTime, this._currenTime)
                    : isLinearRampToValueAutomationEvent(automationEvent)
                        ? createExtendedLinearRampToValueAutomationEvent(automationEvent.value, eventTime, this._currenTime)
                        : automationEvent;
                if (index === -1) {
                    this._automationEvents.push(persistentAutomationEvent);
                }
                else {
                    if (isSetValueCurveAutomationEvent(automationEvent) &&
                        eventTime + automationEvent.duration > getEventTime(this._automationEvents[index])) {
                        return false;
                    }
                    this._automationEvents.splice(index, 0, persistentAutomationEvent);
                }
            }
            return true;
        }
        flush(time) {
            const index = this._automationEvents.findIndex((currentAutomationEvent) => getEventTime(currentAutomationEvent) > time);
            if (index > 1) {
                const remainingAutomationEvents = this._automationEvents.slice(index - 1);
                const firstRemainingAutomationEvent = remainingAutomationEvents[0];
                if (isSetTargetAutomationEvent(firstRemainingAutomationEvent)) {
                    remainingAutomationEvents.unshift(createSetValueAutomationEvent(getValueOfAutomationEventAtIndexAtTime(this._automationEvents, index - 2, firstRemainingAutomationEvent.startTime, this._defaultValue), firstRemainingAutomationEvent.startTime));
                }
                this._automationEvents = remainingAutomationEvents;
            }
        }
        getValue(time) {
            if (this._automationEvents.length === 0) {
                return this._defaultValue;
            }
            const indexOfNextEvent = this._automationEvents.findIndex((automationEvent) => getEventTime(automationEvent) > time);
            const nextAutomationEvent = this._automationEvents[indexOfNextEvent];
            const indexOfCurrentEvent = (indexOfNextEvent === -1 ? this._automationEvents.length : indexOfNextEvent) - 1;
            const currentAutomationEvent = this._automationEvents[indexOfCurrentEvent];
            if (currentAutomationEvent !== undefined &&
                isSetTargetAutomationEvent(currentAutomationEvent) &&
                (nextAutomationEvent === undefined ||
                    !isAnyRampToValueAutomationEvent(nextAutomationEvent) ||
                    nextAutomationEvent.insertTime > time)) {
                return getTargetValueAtTime(time, getValueOfAutomationEventAtIndexAtTime(this._automationEvents, indexOfCurrentEvent - 1, currentAutomationEvent.startTime, this._defaultValue), currentAutomationEvent);
            }
            if (currentAutomationEvent !== undefined &&
                isSetValueAutomationEvent(currentAutomationEvent) &&
                (nextAutomationEvent === undefined || !isAnyRampToValueAutomationEvent(nextAutomationEvent))) {
                return currentAutomationEvent.value;
            }
            if (currentAutomationEvent !== undefined &&
                isSetValueCurveAutomationEvent(currentAutomationEvent) &&
                (nextAutomationEvent === undefined ||
                    !isAnyRampToValueAutomationEvent(nextAutomationEvent) ||
                    currentAutomationEvent.startTime + currentAutomationEvent.duration > time)) {
                if (time < currentAutomationEvent.startTime + currentAutomationEvent.duration) {
                    return getValueCurveValueAtTime(time, currentAutomationEvent);
                }
                return currentAutomationEvent.values[currentAutomationEvent.values.length - 1];
            }
            if (currentAutomationEvent !== undefined &&
                isAnyRampToValueAutomationEvent(currentAutomationEvent) &&
                (nextAutomationEvent === undefined || !isAnyRampToValueAutomationEvent(nextAutomationEvent))) {
                return currentAutomationEvent.value;
            }
            if (nextAutomationEvent !== undefined && isExponentialRampToValueAutomationEvent(nextAutomationEvent)) {
                const [startTime, value] = getEndTimeAndValueOfPreviousAutomationEvent(this._automationEvents, indexOfCurrentEvent, currentAutomationEvent, nextAutomationEvent, this._defaultValue);
                return getExponentialRampValueAtTime(time, startTime, value, nextAutomationEvent);
            }
            if (nextAutomationEvent !== undefined && isLinearRampToValueAutomationEvent(nextAutomationEvent)) {
                const [startTime, value] = getEndTimeAndValueOfPreviousAutomationEvent(this._automationEvents, indexOfCurrentEvent, currentAutomationEvent, nextAutomationEvent, this._defaultValue);
                return getLinearRampValueAtTime(time, startTime, value, nextAutomationEvent);
            }
            return this._defaultValue;
        }
    }

    const createCancelAndHoldAutomationEvent = (cancelTime) => {
        return { cancelTime, type: 'cancelAndHold' };
    };

    const createCancelScheduledValuesAutomationEvent = (cancelTime) => {
        return { cancelTime, type: 'cancelScheduledValues' };
    };

    const createExponentialRampToValueAutomationEvent = (value, endTime) => {
        return { endTime, type: 'exponentialRampToValue', value };
    };

    const createLinearRampToValueAutomationEvent = (value, endTime) => {
        return { endTime, type: 'linearRampToValue', value };
    };

    const createSetTargetAutomationEvent = (target, startTime, timeConstant) => {
        return { startTime, target, timeConstant, type: 'setTarget' };
    };

    const createAbortError = () => new DOMException('', 'AbortError');

    const createAddActiveInputConnectionToAudioNode = (insertElementInSet) => {
        return (activeInputs, source, [output, input, eventListener], ignoreDuplicates) => {
            insertElementInSet(activeInputs[input], [source, output, eventListener], (activeInputConnection) => activeInputConnection[0] === source && activeInputConnection[1] === output, ignoreDuplicates);
        };
    };

    const createAddAudioNodeConnections = (audioNodeConnectionsStore) => {
        return (audioNode, audioNodeRenderer, nativeAudioNode) => {
            const activeInputs = [];
            for (let i = 0; i < nativeAudioNode.numberOfInputs; i += 1) {
                activeInputs.push(new Set());
            }
            audioNodeConnectionsStore.set(audioNode, {
                activeInputs,
                outputs: new Set(),
                passiveInputs: new WeakMap(),
                renderer: audioNodeRenderer
            });
        };
    };

    const createAddAudioParamConnections = (audioParamConnectionsStore) => {
        return (audioParam, audioParamRenderer) => {
            audioParamConnectionsStore.set(audioParam, { activeInputs: new Set(), passiveInputs: new WeakMap(), renderer: audioParamRenderer });
        };
    };

    const ACTIVE_AUDIO_NODE_STORE = new WeakSet();
    const AUDIO_NODE_CONNECTIONS_STORE = new WeakMap();
    const AUDIO_NODE_STORE = new WeakMap();
    const AUDIO_PARAM_CONNECTIONS_STORE = new WeakMap();
    const AUDIO_PARAM_STORE = new WeakMap();
    const CONTEXT_STORE = new WeakMap();
    const EVENT_LISTENERS = new WeakMap();
    const CYCLE_COUNTERS = new WeakMap();
    // This clunky name is borrowed from the spec. :-)
    const NODE_NAME_TO_PROCESSOR_CONSTRUCTOR_MAPS = new WeakMap();

    const handler = {
        construct() {
            return handler;
        }
    };
    const isConstructible = (constructible) => {
        try {
            const proxy = new Proxy(constructible, handler);
            new proxy(); // tslint:disable-line:no-unused-expression
        }
        catch {
            return false;
        }
        return true;
    };

    /*
     * This massive regex tries to cover all the following cases.
     *
     * import './path';
     * import defaultImport from './path';
     * import { namedImport } from './path';
     * import { namedImport as renamendImport } from './path';
     * import * as namespaceImport from './path';
     * import defaultImport, { namedImport } from './path';
     * import defaultImport, { namedImport as renamendImport } from './path';
     * import defaultImport, * as namespaceImport from './path';
     */
    const IMPORT_STATEMENT_REGEX = /^import(?:(?:[\s]+[\w]+|(?:[\s]+[\w]+[\s]*,)?[\s]*\{[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?(?:[\s]*,[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?)*[\s]*}|(?:[\s]+[\w]+[\s]*,)?[\s]*\*[\s]+as[\s]+[\w]+)[\s]+from)?(?:[\s]*)("([^"\\]|\\.)+"|'([^'\\]|\\.)+')(?:[\s]*);?/; // tslint:disable-line:max-line-length
    const splitImportStatements = (source, url) => {
        const importStatements = [];
        let sourceWithoutImportStatements = source.replace(/^[\s]+/, '');
        let result = sourceWithoutImportStatements.match(IMPORT_STATEMENT_REGEX);
        while (result !== null) {
            const unresolvedUrl = result[1].slice(1, -1);
            const importStatementWithResolvedUrl = result[0]
                .replace(/([\s]+)?;?$/, '')
                .replace(unresolvedUrl, new URL(unresolvedUrl, url).toString());
            importStatements.push(importStatementWithResolvedUrl);
            sourceWithoutImportStatements = sourceWithoutImportStatements.slice(result[0].length).replace(/^[\s]+/, '');
            result = sourceWithoutImportStatements.match(IMPORT_STATEMENT_REGEX);
        }
        return [importStatements.join(';'), sourceWithoutImportStatements];
    };

    const verifyParameterDescriptors = (parameterDescriptors) => {
        if (parameterDescriptors !== undefined && !Array.isArray(parameterDescriptors)) {
            throw new TypeError('The parameterDescriptors property of given value for processorCtor is not an array.');
        }
    };
    const verifyProcessorCtor = (processorCtor) => {
        if (!isConstructible(processorCtor)) {
            throw new TypeError('The given value for processorCtor should be a constructor.');
        }
        if (processorCtor.prototype === null || typeof processorCtor.prototype !== 'object') {
            throw new TypeError('The given value for processorCtor should have a prototype.');
        }
    };
    const createAddAudioWorkletModule = (cacheTestResult, createNotSupportedError, evaluateSource, exposeCurrentFrameAndCurrentTime, fetchSource, getNativeContext, getOrCreateBackupOfflineAudioContext, isNativeOfflineAudioContext, ongoingRequests, resolvedRequests, testAudioWorkletProcessorPostMessageSupport, window) => {
        return (context, moduleURL, options = { credentials: 'omit' }) => {
            const nativeContext = getNativeContext(context);
            // Bug #59: Safari does not implement the audioWorklet property.
            if (nativeContext.audioWorklet !== undefined) {
                return Promise.all([
                    fetchSource(moduleURL),
                    Promise.resolve(cacheTestResult(testAudioWorkletProcessorPostMessageSupport, testAudioWorkletProcessorPostMessageSupport))
                ]).then(([[source, absoluteUrl], isSupportingPostMessage]) => {
                    const [importStatements, sourceWithoutImportStatements] = splitImportStatements(source, absoluteUrl);
                    /*
                     * Bug #179: Firefox does not allow to transfer any buffer which has been passed to the process() method as an argument.
                     *
                     * This is the unminified version of the code used below.
                     *
                     * ```js
                     * class extends AudioWorkletProcessor {
                     *
                     *     __buffers = new WeakSet();
                     *
                     *     constructor () {
                     *         super();
                     *
                     *         this.port.postMessage = ((postMessage) => {
                     *             return (message, transferables) => {
                     *                 const filteredTransferables = (transferables)
                     *                     ? transferables.filter((transferable) => !this.__buffers.has(transferable))
                     *                     : transferables;
                     *
                     *                 return postMessage.call(this.port, message, filteredTransferables);
                     *              };
                     *         })(this.port.postMessage);
                     *     }
                     * }
                     * ```
                     */
                    const patchedSourceWithoutImportStatements = isSupportingPostMessage
                        ? sourceWithoutImportStatements
                        : sourceWithoutImportStatements.replace(/\s+extends\s+AudioWorkletProcessor\s*{/, ` extends (class extends AudioWorkletProcessor {__b=new WeakSet();constructor(){super();(p=>p.postMessage=(q=>(m,t)=>q.call(p,m,t?t.filter(u=>!this.__b.has(u)):t))(p.postMessage))(this.port)}}){`);
                    /*
                     * Bug #170: Chrome and Edge do call process() with an array with empty channelData for each input if no input is connected.
                     *
                     * Bug #179: Firefox does not allow to transfer any buffer which has been passed to the process() method as an argument.
                     *
                     * This is the unminified version of the code used below:
                     *
                     * ```js
                     * `${ importStatements };
                     * ((registerProcessor) => {${ sourceWithoutImportStatements }
                     * })((name, processorCtor) => registerProcessor(name, class extends processorCtor {
                     *
                     *     __collectBuffers = (array) => {
                     *         array.forEach((element) => this.__buffers.add(element.buffer));
                     *     };
                     *
                     *     process (inputs, outputs, parameters) {
                     *         inputs.forEach(this.__collectBuffers);
                     *         outputs.forEach(this.__collectBuffers);
                     *         this.__collectBuffers(Object.values(parameters));
                     *
                     *         return super.process(
                     *             (inputs.map((input) => input.some((channelData) => channelData.length === 0)) ? [ ] : input),
                     *             outputs,
                     *             parameters
                     *         );
                     *     }
                     *
                     * }))`
                     * ```
                     */
                    const memberDefinition = isSupportingPostMessage ? '' : '__c = (a) => a.forEach(e=>this.__b.add(e.buffer));';
                    const bufferRegistration = isSupportingPostMessage
                        ? ''
                        : 'i.forEach(this.__c);o.forEach(this.__c);this.__c(Object.values(p));';
                    const wrappedSource = `${importStatements};(registerProcessor=>{${patchedSourceWithoutImportStatements}
})((n,p)=>registerProcessor(n,class extends p{${memberDefinition}process(i,o,p){${bufferRegistration}return super.process(i.map(j=>j.some(k=>k.length===0)?[]:j),o,p)}}))`;
                    const blob = new Blob([wrappedSource], { type: 'application/javascript; charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    return nativeContext.audioWorklet
                        .addModule(url, options)
                        .then(() => {
                        if (isNativeOfflineAudioContext(nativeContext)) {
                            return;
                        }
                        // Bug #186: Chrome, Edge and Opera do not allow to create an AudioWorkletNode on a closed AudioContext.
                        const backupOfflineAudioContext = getOrCreateBackupOfflineAudioContext(nativeContext);
                        return backupOfflineAudioContext.audioWorklet.addModule(url, options);
                    })
                        .finally(() => URL.revokeObjectURL(url));
                });
            }
            const resolvedRequestsOfContext = resolvedRequests.get(context);
            if (resolvedRequestsOfContext !== undefined && resolvedRequestsOfContext.has(moduleURL)) {
                return Promise.resolve();
            }
            const ongoingRequestsOfContext = ongoingRequests.get(context);
            if (ongoingRequestsOfContext !== undefined) {
                const promiseOfOngoingRequest = ongoingRequestsOfContext.get(moduleURL);
                if (promiseOfOngoingRequest !== undefined) {
                    return promiseOfOngoingRequest;
                }
            }
            const promise = fetchSource(moduleURL)
                .then(([source, absoluteUrl]) => {
                const [importStatements, sourceWithoutImportStatements] = splitImportStatements(source, absoluteUrl);
                /*
                 * This is the unminified version of the code used below:
                 *
                 * ```js
                 * ${ importStatements };
                 * ((a, b) => {
                 *     (a[b] = a[b] || [ ]).push(
                 *         (AudioWorkletProcessor, global, registerProcessor, sampleRate, self, window) => {
                 *             ${ sourceWithoutImportStatements }
                 *         }
                 *     );
                 * })(window, '_AWGS');
                 * ```
                 */
                // tslint:disable-next-line:max-line-length
                const wrappedSource = `${importStatements};((a,b)=>{(a[b]=a[b]||[]).push((AudioWorkletProcessor,global,registerProcessor,sampleRate,self,window)=>{${sourceWithoutImportStatements}
})})(window,'_AWGS')`;
                // @todo Evaluating the given source code is a possible security problem.
                return evaluateSource(wrappedSource);
            })
                .then(() => {
                const evaluateAudioWorkletGlobalScope = window._AWGS.pop();
                if (evaluateAudioWorkletGlobalScope === undefined) {
                    // Bug #182 Chrome, Edge and Opera do throw an instance of a SyntaxError instead of a DOMException.
                    throw new SyntaxError();
                }
                exposeCurrentFrameAndCurrentTime(nativeContext.currentTime, nativeContext.sampleRate, () => evaluateAudioWorkletGlobalScope(class AudioWorkletProcessor {
                }, undefined, (name, processorCtor) => {
                    if (name.trim() === '') {
                        throw createNotSupportedError();
                    }
                    const nodeNameToProcessorConstructorMap = NODE_NAME_TO_PROCESSOR_CONSTRUCTOR_MAPS.get(nativeContext);
                    if (nodeNameToProcessorConstructorMap !== undefined) {
                        if (nodeNameToProcessorConstructorMap.has(name)) {
                            throw createNotSupportedError();
                        }
                        verifyProcessorCtor(processorCtor);
                        verifyParameterDescriptors(processorCtor.parameterDescriptors);
                        nodeNameToProcessorConstructorMap.set(name, processorCtor);
                    }
                    else {
                        verifyProcessorCtor(processorCtor);
                        verifyParameterDescriptors(processorCtor.parameterDescriptors);
                        NODE_NAME_TO_PROCESSOR_CONSTRUCTOR_MAPS.set(nativeContext, new Map([[name, processorCtor]]));
                    }
                }, nativeContext.sampleRate, undefined, undefined));
            });
            if (ongoingRequestsOfContext === undefined) {
                ongoingRequests.set(context, new Map([[moduleURL, promise]]));
            }
            else {
                ongoingRequestsOfContext.set(moduleURL, promise);
            }
            promise
                .then(() => {
                const rslvdRqstsFCntxt = resolvedRequests.get(context);
                if (rslvdRqstsFCntxt === undefined) {
                    resolvedRequests.set(context, new Set([moduleURL]));
                }
                else {
                    rslvdRqstsFCntxt.add(moduleURL);
                }
            })
                .finally(() => {
                const ngngRqstsFCntxt = ongoingRequests.get(context);
                if (ngngRqstsFCntxt !== undefined) {
                    ngngRqstsFCntxt.delete(moduleURL);
                }
            });
            return promise;
        };
    };

    const getValueForKey = (map, key) => {
        const value = map.get(key);
        if (value === undefined) {
            throw new Error('A value with the given key could not be found.');
        }
        return value;
    };

    const pickElementFromSet = (set, predicate) => {
        const matchingElements = Array.from(set).filter(predicate);
        if (matchingElements.length > 1) {
            throw Error('More than one element was found.');
        }
        if (matchingElements.length === 0) {
            throw Error('No element was found.');
        }
        const [matchingElement] = matchingElements;
        set.delete(matchingElement);
        return matchingElement;
    };

    const deletePassiveInputConnectionToAudioNode = (passiveInputs, source, output, input) => {
        const passiveInputConnections = getValueForKey(passiveInputs, source);
        const matchingConnection = pickElementFromSet(passiveInputConnections, (passiveInputConnection) => passiveInputConnection[0] === output && passiveInputConnection[1] === input);
        if (passiveInputConnections.size === 0) {
            passiveInputs.delete(source);
        }
        return matchingConnection;
    };

    const getEventListenersOfAudioNode = (audioNode) => {
        return getValueForKey(EVENT_LISTENERS, audioNode);
    };

    const setInternalStateToActive = (audioNode) => {
        if (ACTIVE_AUDIO_NODE_STORE.has(audioNode)) {
            throw new Error('The AudioNode is already stored.');
        }
        ACTIVE_AUDIO_NODE_STORE.add(audioNode);
        getEventListenersOfAudioNode(audioNode).forEach((eventListener) => eventListener(true));
    };

    const isAudioWorkletNode = (audioNode) => {
        return 'port' in audioNode;
    };

    const setInternalStateToPassive = (audioNode) => {
        if (!ACTIVE_AUDIO_NODE_STORE.has(audioNode)) {
            throw new Error('The AudioNode is not stored.');
        }
        ACTIVE_AUDIO_NODE_STORE.delete(audioNode);
        getEventListenersOfAudioNode(audioNode).forEach((eventListener) => eventListener(false));
    };

    // Set the internalState of the audioNode to 'passive' if it is not an AudioWorkletNode and if it has no 'active' input connections.
    const setInternalStateToPassiveWhenNecessary = (audioNode, activeInputs) => {
        if (!isAudioWorkletNode(audioNode) && activeInputs.every((connections) => connections.size === 0)) {
            setInternalStateToPassive(audioNode);
        }
    };

    const createAddConnectionToAudioNode = (addActiveInputConnectionToAudioNode, addPassiveInputConnectionToAudioNode, connectNativeAudioNodeToNativeAudioNode, deleteActiveInputConnectionToAudioNode, disconnectNativeAudioNodeFromNativeAudioNode, getAudioNodeConnections, getAudioNodeTailTime, getEventListenersOfAudioNode, getNativeAudioNode, insertElementInSet, isActiveAudioNode, isPartOfACycle, isPassiveAudioNode) => {
        const tailTimeTimeoutIds = new WeakMap();
        return (source, destination, output, input, isOffline) => {
            const { activeInputs, passiveInputs } = getAudioNodeConnections(destination);
            const { outputs } = getAudioNodeConnections(source);
            const eventListeners = getEventListenersOfAudioNode(source);
            const eventListener = (isActive) => {
                const nativeDestinationAudioNode = getNativeAudioNode(destination);
                const nativeSourceAudioNode = getNativeAudioNode(source);
                if (isActive) {
                    const partialConnection = deletePassiveInputConnectionToAudioNode(passiveInputs, source, output, input);
                    addActiveInputConnectionToAudioNode(activeInputs, source, partialConnection, false);
                    if (!isOffline && !isPartOfACycle(source)) {
                        connectNativeAudioNodeToNativeAudioNode(nativeSourceAudioNode, nativeDestinationAudioNode, output, input);
                    }
                    if (isPassiveAudioNode(destination)) {
                        setInternalStateToActive(destination);
                    }
                }
                else {
                    const partialConnection = deleteActiveInputConnectionToAudioNode(activeInputs, source, output, input);
                    addPassiveInputConnectionToAudioNode(passiveInputs, input, partialConnection, false);
                    if (!isOffline && !isPartOfACycle(source)) {
                        disconnectNativeAudioNodeFromNativeAudioNode(nativeSourceAudioNode, nativeDestinationAudioNode, output, input);
                    }
                    const tailTime = getAudioNodeTailTime(destination);
                    if (tailTime === 0) {
                        if (isActiveAudioNode(destination)) {
                            setInternalStateToPassiveWhenNecessary(destination, activeInputs);
                        }
                    }
                    else {
                        const tailTimeTimeoutId = tailTimeTimeoutIds.get(destination);
                        if (tailTimeTimeoutId !== undefined) {
                            clearTimeout(tailTimeTimeoutId);
                        }
                        tailTimeTimeoutIds.set(destination, setTimeout(() => {
                            if (isActiveAudioNode(destination)) {
                                setInternalStateToPassiveWhenNecessary(destination, activeInputs);
                            }
                        }, tailTime * 1000));
                    }
                }
            };
            if (insertElementInSet(outputs, [destination, output, input], (outputConnection) => outputConnection[0] === destination && outputConnection[1] === output && outputConnection[2] === input, true)) {
                eventListeners.add(eventListener);
                if (isActiveAudioNode(source)) {
                    addActiveInputConnectionToAudioNode(activeInputs, source, [output, input, eventListener], true);
                }
                else {
                    addPassiveInputConnectionToAudioNode(passiveInputs, input, [source, output, eventListener], true);
                }
                return true;
            }
            return false;
        };
    };

    const createAddPassiveInputConnectionToAudioNode = (insertElementInSet) => {
        return (passiveInputs, input, [source, output, eventListener], ignoreDuplicates) => {
            const passiveInputConnections = passiveInputs.get(source);
            if (passiveInputConnections === undefined) {
                passiveInputs.set(source, new Set([[output, input, eventListener]]));
            }
            else {
                insertElementInSet(passiveInputConnections, [output, input, eventListener], (passiveInputConnection) => passiveInputConnection[0] === output && passiveInputConnection[1] === input, ignoreDuplicates);
            }
        };
    };

    const createAddSilentConnection = (createNativeGainNode) => {
        return (nativeContext, nativeAudioScheduledSourceNode) => {
            const nativeGainNode = createNativeGainNode(nativeContext, {
                channelCount: 1,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete',
                gain: 0
            });
            nativeAudioScheduledSourceNode.connect(nativeGainNode).connect(nativeContext.destination);
            const disconnect = () => {
                nativeAudioScheduledSourceNode.removeEventListener('ended', disconnect);
                nativeAudioScheduledSourceNode.disconnect(nativeGainNode);
                nativeGainNode.disconnect();
            };
            nativeAudioScheduledSourceNode.addEventListener('ended', disconnect);
        };
    };

    const DEFAULT_OPTIONS = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        fftSize: 2048,
        maxDecibels: -30,
        minDecibels: -100,
        smoothingTimeConstant: 0.8
    };
    const createAnalyserNodeConstructor = (audionNodeConstructor, createAnalyserNodeRenderer, createIndexSizeError, createNativeAnalyserNode, getNativeContext, isNativeOfflineAudioContext) => {
        return class AnalyserNode extends audionNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
                const nativeAnalyserNode = createNativeAnalyserNode(nativeContext, mergedOptions);
                const analyserNodeRenderer = ((isNativeOfflineAudioContext(nativeContext) ? createAnalyserNodeRenderer() : null));
                super(context, false, nativeAnalyserNode, analyserNodeRenderer);
                this._nativeAnalyserNode = nativeAnalyserNode;
            }
            get fftSize() {
                return this._nativeAnalyserNode.fftSize;
            }
            set fftSize(value) {
                this._nativeAnalyserNode.fftSize = value;
            }
            get frequencyBinCount() {
                return this._nativeAnalyserNode.frequencyBinCount;
            }
            get maxDecibels() {
                return this._nativeAnalyserNode.maxDecibels;
            }
            set maxDecibels(value) {
                // Bug #118: Safari does not throw an error if maxDecibels is not more than minDecibels.
                const maxDecibels = this._nativeAnalyserNode.maxDecibels;
                this._nativeAnalyserNode.maxDecibels = value;
                if (!(value > this._nativeAnalyserNode.minDecibels)) {
                    this._nativeAnalyserNode.maxDecibels = maxDecibels;
                    throw createIndexSizeError();
                }
            }
            get minDecibels() {
                return this._nativeAnalyserNode.minDecibels;
            }
            set minDecibels(value) {
                // Bug #118: Safari does not throw an error if maxDecibels is not more than minDecibels.
                const minDecibels = this._nativeAnalyserNode.minDecibels;
                this._nativeAnalyserNode.minDecibels = value;
                if (!(this._nativeAnalyserNode.maxDecibels > value)) {
                    this._nativeAnalyserNode.minDecibels = minDecibels;
                    throw createIndexSizeError();
                }
            }
            get smoothingTimeConstant() {
                return this._nativeAnalyserNode.smoothingTimeConstant;
            }
            set smoothingTimeConstant(value) {
                this._nativeAnalyserNode.smoothingTimeConstant = value;
            }
            getByteFrequencyData(array) {
                this._nativeAnalyserNode.getByteFrequencyData(array);
            }
            getByteTimeDomainData(array) {
                this._nativeAnalyserNode.getByteTimeDomainData(array);
            }
            getFloatFrequencyData(array) {
                this._nativeAnalyserNode.getFloatFrequencyData(array);
            }
            getFloatTimeDomainData(array) {
                this._nativeAnalyserNode.getFloatTimeDomainData(array);
            }
        };
    };

    const isOwnedByContext = (nativeAudioNode, nativeContext) => {
        return nativeAudioNode.context === nativeContext;
    };

    const createAnalyserNodeRendererFactory = (createNativeAnalyserNode, getNativeAudioNode, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeAnalyserNodes = new WeakMap();
            const createAnalyserNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeAnalyserNode = getNativeAudioNode(proxy);
                // If the initially used nativeAnalyserNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeAnalyserNodeIsOwnedByContext = isOwnedByContext(nativeAnalyserNode, nativeOfflineAudioContext);
                if (!nativeAnalyserNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeAnalyserNode.channelCount,
                        channelCountMode: nativeAnalyserNode.channelCountMode,
                        channelInterpretation: nativeAnalyserNode.channelInterpretation,
                        fftSize: nativeAnalyserNode.fftSize,
                        maxDecibels: nativeAnalyserNode.maxDecibels,
                        minDecibels: nativeAnalyserNode.minDecibels,
                        smoothingTimeConstant: nativeAnalyserNode.smoothingTimeConstant
                    };
                    nativeAnalyserNode = createNativeAnalyserNode(nativeOfflineAudioContext, options);
                }
                renderedNativeAnalyserNodes.set(nativeOfflineAudioContext, nativeAnalyserNode);
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeAnalyserNode, trace);
                return nativeAnalyserNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeAnalyserNode = renderedNativeAnalyserNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeAnalyserNode !== undefined) {
                        return Promise.resolve(renderedNativeAnalyserNode);
                    }
                    return createAnalyserNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const testAudioBufferCopyChannelMethodsOutOfBoundsSupport = (nativeAudioBuffer) => {
        try {
            nativeAudioBuffer.copyToChannel(new Float32Array(1), 0, -1);
        }
        catch {
            return false;
        }
        return true;
    };

    const createIndexSizeError = () => new DOMException('', 'IndexSizeError');

    const wrapAudioBufferGetChannelDataMethod = (audioBuffer) => {
        audioBuffer.getChannelData = ((getChannelData) => {
            return (channel) => {
                try {
                    return getChannelData.call(audioBuffer, channel);
                }
                catch (err) {
                    if (err.code === 12) {
                        throw createIndexSizeError();
                    }
                    throw err;
                }
            };
        })(audioBuffer.getChannelData);
    };

    const DEFAULT_OPTIONS$1 = {
        numberOfChannels: 1
    };
    const createAudioBufferConstructor = (audioBufferStore, cacheTestResult, createNotSupportedError, nativeAudioBufferConstructor, nativeOfflineAudioContextConstructor, testNativeAudioBufferConstructorSupport, wrapAudioBufferCopyChannelMethods, wrapAudioBufferCopyChannelMethodsOutOfBounds) => {
        let nativeOfflineAudioContext = null;
        return class AudioBuffer {
            constructor(options) {
                if (nativeOfflineAudioContextConstructor === null) {
                    throw new Error('Missing the native OfflineAudioContext constructor.');
                }
                const { length, numberOfChannels, sampleRate } = { ...DEFAULT_OPTIONS$1, ...options };
                if (nativeOfflineAudioContext === null) {
                    nativeOfflineAudioContext = new nativeOfflineAudioContextConstructor(1, 1, 44100);
                }
                /*
                 * Bug #99: Firefox does not throw a NotSupportedError when the numberOfChannels is zero. But it only does it when using the
                 * factory function. But since Firefox also supports the constructor everything should be fine.
                 */
                const audioBuffer = nativeAudioBufferConstructor !== null &&
                    cacheTestResult(testNativeAudioBufferConstructorSupport, testNativeAudioBufferConstructorSupport)
                    ? new nativeAudioBufferConstructor({ length, numberOfChannels, sampleRate })
                    : nativeOfflineAudioContext.createBuffer(numberOfChannels, length, sampleRate);
                // Bug #99: Safari does not throw an error when the numberOfChannels is zero.
                if (audioBuffer.numberOfChannels === 0) {
                    throw createNotSupportedError();
                }
                // Bug #5: Safari does not support copyFromChannel() and copyToChannel().
                // Bug #100: Safari does throw a wrong error when calling getChannelData() with an out-of-bounds value.
                if (typeof audioBuffer.copyFromChannel !== 'function') {
                    wrapAudioBufferCopyChannelMethods(audioBuffer);
                    wrapAudioBufferGetChannelDataMethod(audioBuffer);
                    // Bug #157: Firefox does not allow the bufferOffset to be out-of-bounds.
                }
                else if (!cacheTestResult(testAudioBufferCopyChannelMethodsOutOfBoundsSupport, () => testAudioBufferCopyChannelMethodsOutOfBoundsSupport(audioBuffer))) {
                    wrapAudioBufferCopyChannelMethodsOutOfBounds(audioBuffer);
                }
                audioBufferStore.add(audioBuffer);
                /*
                 * This does violate all good pratices but it is necessary to allow this AudioBuffer to be used with native
                 * (Offline)AudioContexts.
                 */
                return audioBuffer;
            }
            static [Symbol.hasInstance](instance) {
                return ((instance !== null && typeof instance === 'object' && Object.getPrototypeOf(instance) === AudioBuffer.prototype) ||
                    audioBufferStore.has(instance));
            }
        };
    };

    const MOST_NEGATIVE_SINGLE_FLOAT = -3.4028234663852886e38;
    const MOST_POSITIVE_SINGLE_FLOAT = -MOST_NEGATIVE_SINGLE_FLOAT;

    const isActiveAudioNode = (audioNode) => ACTIVE_AUDIO_NODE_STORE.has(audioNode);

    const DEFAULT_OPTIONS$2 = {
        buffer: null,
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        // Bug #149: Safari does not yet support the detune AudioParam.
        loop: false,
        loopEnd: 0,
        loopStart: 0,
        playbackRate: 1
    };
    const createAudioBufferSourceNodeConstructor = (audioNodeConstructor, createAudioBufferSourceNodeRenderer, createAudioParam, createInvalidStateError, createNativeAudioBufferSourceNode, getNativeContext, isNativeOfflineAudioContext, wrapEventListener) => {
        return class AudioBufferSourceNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$2, ...options };
                const nativeAudioBufferSourceNode = createNativeAudioBufferSourceNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const audioBufferSourceNodeRenderer = ((isOffline ? createAudioBufferSourceNodeRenderer() : null));
                super(context, false, nativeAudioBufferSourceNode, audioBufferSourceNodeRenderer);
                this._audioBufferSourceNodeRenderer = audioBufferSourceNodeRenderer;
                this._isBufferNullified = false;
                this._isBufferSet = mergedOptions.buffer !== null;
                this._nativeAudioBufferSourceNode = nativeAudioBufferSourceNode;
                this._onended = null;
                // Bug #73: Safari does not export the correct values for maxValue and minValue.
                this._playbackRate = createAudioParam(this, isOffline, nativeAudioBufferSourceNode.playbackRate, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
            }
            get buffer() {
                if (this._isBufferNullified) {
                    return null;
                }
                return this._nativeAudioBufferSourceNode.buffer;
            }
            set buffer(value) {
                this._nativeAudioBufferSourceNode.buffer = value;
                // Bug #72: Only Chrome, Edge & Opera do not allow to reassign the buffer yet.
                if (value !== null) {
                    if (this._isBufferSet) {
                        throw createInvalidStateError();
                    }
                    this._isBufferSet = true;
                }
            }
            get loop() {
                return this._nativeAudioBufferSourceNode.loop;
            }
            set loop(value) {
                this._nativeAudioBufferSourceNode.loop = value;
            }
            get loopEnd() {
                return this._nativeAudioBufferSourceNode.loopEnd;
            }
            set loopEnd(value) {
                this._nativeAudioBufferSourceNode.loopEnd = value;
            }
            get loopStart() {
                return this._nativeAudioBufferSourceNode.loopStart;
            }
            set loopStart(value) {
                this._nativeAudioBufferSourceNode.loopStart = value;
            }
            get onended() {
                return this._onended;
            }
            set onended(value) {
                const wrappedListener = typeof value === 'function' ? wrapEventListener(this, value) : null;
                this._nativeAudioBufferSourceNode.onended = wrappedListener;
                const nativeOnEnded = this._nativeAudioBufferSourceNode.onended;
                this._onended = nativeOnEnded !== null && nativeOnEnded === wrappedListener ? value : nativeOnEnded;
            }
            get playbackRate() {
                return this._playbackRate;
            }
            start(when = 0, offset = 0, duration) {
                this._nativeAudioBufferSourceNode.start(when, offset, duration);
                if (this._audioBufferSourceNodeRenderer !== null) {
                    this._audioBufferSourceNodeRenderer.start = duration === undefined ? [when, offset] : [when, offset, duration];
                }
                if (this.context.state !== 'closed') {
                    setInternalStateToActive(this);
                    const resetInternalStateToPassive = () => {
                        this._nativeAudioBufferSourceNode.removeEventListener('ended', resetInternalStateToPassive);
                        if (isActiveAudioNode(this)) {
                            setInternalStateToPassive(this);
                        }
                    };
                    this._nativeAudioBufferSourceNode.addEventListener('ended', resetInternalStateToPassive);
                }
            }
            stop(when = 0) {
                this._nativeAudioBufferSourceNode.stop(when);
                if (this._audioBufferSourceNodeRenderer !== null) {
                    this._audioBufferSourceNodeRenderer.stop = when;
                }
            }
        };
    };

    const createAudioBufferSourceNodeRendererFactory = (connectAudioParam, createNativeAudioBufferSourceNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeAudioBufferSourceNodes = new WeakMap();
            let start = null;
            let stop = null;
            const createAudioBufferSourceNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeAudioBufferSourceNode = getNativeAudioNode(proxy);
                /*
                 * If the initially used nativeAudioBufferSourceNode was not constructed on the same OfflineAudioContext it needs to be created
                 * again.
                 */
                const nativeAudioBufferSourceNodeIsOwnedByContext = isOwnedByContext(nativeAudioBufferSourceNode, nativeOfflineAudioContext);
                if (!nativeAudioBufferSourceNodeIsOwnedByContext) {
                    const options = {
                        buffer: nativeAudioBufferSourceNode.buffer,
                        channelCount: nativeAudioBufferSourceNode.channelCount,
                        channelCountMode: nativeAudioBufferSourceNode.channelCountMode,
                        channelInterpretation: nativeAudioBufferSourceNode.channelInterpretation,
                        // Bug #149: Safari does not yet support the detune AudioParam.
                        loop: nativeAudioBufferSourceNode.loop,
                        loopEnd: nativeAudioBufferSourceNode.loopEnd,
                        loopStart: nativeAudioBufferSourceNode.loopStart,
                        playbackRate: nativeAudioBufferSourceNode.playbackRate.value
                    };
                    nativeAudioBufferSourceNode = createNativeAudioBufferSourceNode(nativeOfflineAudioContext, options);
                    if (start !== null) {
                        nativeAudioBufferSourceNode.start(...start);
                    }
                    if (stop !== null) {
                        nativeAudioBufferSourceNode.stop(stop);
                    }
                }
                renderedNativeAudioBufferSourceNodes.set(nativeOfflineAudioContext, nativeAudioBufferSourceNode);
                if (!nativeAudioBufferSourceNodeIsOwnedByContext) {
                    // Bug #149: Safari does not yet support the detune AudioParam.
                    await renderAutomation(nativeOfflineAudioContext, proxy.playbackRate, nativeAudioBufferSourceNode.playbackRate, trace);
                }
                else {
                    // Bug #149: Safari does not yet support the detune AudioParam.
                    await connectAudioParam(nativeOfflineAudioContext, proxy.playbackRate, nativeAudioBufferSourceNode.playbackRate, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeAudioBufferSourceNode, trace);
                return nativeAudioBufferSourceNode;
            };
            return {
                set start(value) {
                    start = value;
                },
                set stop(value) {
                    stop = value;
                },
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeAudioBufferSourceNode = renderedNativeAudioBufferSourceNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeAudioBufferSourceNode !== undefined) {
                        return Promise.resolve(renderedNativeAudioBufferSourceNode);
                    }
                    return createAudioBufferSourceNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const isAudioBufferSourceNode = (audioNode) => {
        return 'playbackRate' in audioNode;
    };

    const isBiquadFilterNode = (audioNode) => {
        return 'frequency' in audioNode && 'gain' in audioNode;
    };

    const isConstantSourceNode = (audioNode) => {
        return 'offset' in audioNode;
    };

    const isGainNode = (audioNode) => {
        return !('frequency' in audioNode) && 'gain' in audioNode;
    };

    const isOscillatorNode = (audioNode) => {
        return 'detune' in audioNode && 'frequency' in audioNode;
    };

    const isStereoPannerNode = (audioNode) => {
        return 'pan' in audioNode;
    };

    const getAudioNodeConnections = (audioNode) => {
        return getValueForKey(AUDIO_NODE_CONNECTIONS_STORE, audioNode);
    };

    const getAudioParamConnections = (audioParam) => {
        return getValueForKey(AUDIO_PARAM_CONNECTIONS_STORE, audioParam);
    };

    const deactivateActiveAudioNodeInputConnections = (audioNode, trace) => {
        const { activeInputs } = getAudioNodeConnections(audioNode);
        activeInputs.forEach((connections) => connections.forEach(([source]) => {
            if (!trace.includes(audioNode)) {
                deactivateActiveAudioNodeInputConnections(source, [...trace, audioNode]);
            }
        }));
        const audioParams = isAudioBufferSourceNode(audioNode)
            ? [
                // Bug #149: Safari does not yet support the detune AudioParam.
                audioNode.playbackRate
            ]
            : isAudioWorkletNode(audioNode)
                ? Array.from(audioNode.parameters.values())
                : isBiquadFilterNode(audioNode)
                    ? [audioNode.Q, audioNode.detune, audioNode.frequency, audioNode.gain]
                    : isConstantSourceNode(audioNode)
                        ? [audioNode.offset]
                        : isGainNode(audioNode)
                            ? [audioNode.gain]
                            : isOscillatorNode(audioNode)
                                ? [audioNode.detune, audioNode.frequency]
                                : isStereoPannerNode(audioNode)
                                    ? [audioNode.pan]
                                    : [];
        for (const audioParam of audioParams) {
            const audioParamConnections = getAudioParamConnections(audioParam);
            if (audioParamConnections !== undefined) {
                audioParamConnections.activeInputs.forEach(([source]) => deactivateActiveAudioNodeInputConnections(source, trace));
            }
        }
        if (isActiveAudioNode(audioNode)) {
            setInternalStateToPassive(audioNode);
        }
    };

    const deactivateAudioGraph = (context) => {
        deactivateActiveAudioNodeInputConnections(context.destination, []);
    };

    const isValidLatencyHint = (latencyHint) => {
        return (latencyHint === undefined ||
            typeof latencyHint === 'number' ||
            (typeof latencyHint === 'string' && (latencyHint === 'balanced' || latencyHint === 'interactive' || latencyHint === 'playback')));
    };

    const createAudioContextConstructor = (baseAudioContextConstructor, createInvalidStateError, createNotSupportedError, createUnknownError, mediaElementAudioSourceNodeConstructor, mediaStreamAudioDestinationNodeConstructor, mediaStreamAudioSourceNodeConstructor, mediaStreamTrackAudioSourceNodeConstructor, nativeAudioContextConstructor) => {
        return class AudioContext extends baseAudioContextConstructor {
            constructor(options = {}) {
                if (nativeAudioContextConstructor === null) {
                    throw new Error('Missing the native AudioContext constructor.');
                }
                const nativeAudioContext = new nativeAudioContextConstructor(options);
                // Bug #131 Safari returns null when there are four other AudioContexts running already.
                if (nativeAudioContext === null) {
                    throw createUnknownError();
                }
                // Bug #51 Only Chrome, Edge and Opera throw an error if the given latencyHint is invalid.
                if (!isValidLatencyHint(options.latencyHint)) {
                    throw new TypeError(`The provided value '${options.latencyHint}' is not a valid enum value of type AudioContextLatencyCategory.`);
                }
                // Bug #150 Safari does not support setting the sampleRate.
                if (options.sampleRate !== undefined && nativeAudioContext.sampleRate !== options.sampleRate) {
                    throw createNotSupportedError();
                }
                super(nativeAudioContext, 2);
                const { latencyHint } = options;
                const { sampleRate } = nativeAudioContext;
                // @todo The values for 'balanced', 'interactive' and 'playback' are just copied from Chrome's implementation.
                this._baseLatency =
                    typeof nativeAudioContext.baseLatency === 'number'
                        ? nativeAudioContext.baseLatency
                        : latencyHint === 'balanced'
                            ? 512 / sampleRate
                            : latencyHint === 'interactive' || latencyHint === undefined
                                ? 256 / sampleRate
                                : latencyHint === 'playback'
                                    ? 1024 / sampleRate
                                    : /*
                                       * @todo The min (256) and max (16384) values are taken from the allowed bufferSize values of a
                                       * ScriptProcessorNode.
                                       */
                                        (Math.max(2, Math.min(128, Math.round((latencyHint * sampleRate) / 128))) * 128) / sampleRate;
                this._nativeAudioContext = nativeAudioContext;
                // Bug #188: Safari will set the context's state to 'interrupted' in case the user switches tabs.
                if (nativeAudioContextConstructor.name === 'webkitAudioContext') {
                    this._nativeGainNode = nativeAudioContext.createGain();
                    this._nativeOscillatorNode = nativeAudioContext.createOscillator();
                    this._nativeGainNode.gain.value = 1e-37;
                    this._nativeOscillatorNode.connect(this._nativeGainNode).connect(nativeAudioContext.destination);
                    this._nativeOscillatorNode.start();
                }
                else {
                    this._nativeGainNode = null;
                    this._nativeOscillatorNode = null;
                }
                this._state = null;
                /*
                 * Bug #34: Chrome, Edge and Opera pretend to be running right away, but fire an onstatechange event when the state actually
                 * changes to 'running'.
                 */
                if (nativeAudioContext.state === 'running') {
                    this._state = 'suspended';
                    const revokeState = () => {
                        if (this._state === 'suspended') {
                            this._state = null;
                        }
                        nativeAudioContext.removeEventListener('statechange', revokeState);
                    };
                    nativeAudioContext.addEventListener('statechange', revokeState);
                }
            }
            get baseLatency() {
                return this._baseLatency;
            }
            get state() {
                return this._state !== null ? this._state : this._nativeAudioContext.state;
            }
            close() {
                // Bug #35: Firefox does not throw an error if the AudioContext was closed before.
                if (this.state === 'closed') {
                    return this._nativeAudioContext.close().then(() => {
                        throw createInvalidStateError();
                    });
                }
                // Bug #34: If the state was set to suspended before it should be revoked now.
                if (this._state === 'suspended') {
                    this._state = null;
                }
                return this._nativeAudioContext.close().then(() => {
                    if (this._nativeGainNode !== null && this._nativeOscillatorNode !== null) {
                        this._nativeOscillatorNode.stop();
                        this._nativeGainNode.disconnect();
                        this._nativeOscillatorNode.disconnect();
                    }
                    deactivateAudioGraph(this);
                });
            }
            createMediaElementSource(mediaElement) {
                return new mediaElementAudioSourceNodeConstructor(this, { mediaElement });
            }
            createMediaStreamDestination() {
                return new mediaStreamAudioDestinationNodeConstructor(this);
            }
            createMediaStreamSource(mediaStream) {
                return new mediaStreamAudioSourceNodeConstructor(this, { mediaStream });
            }
            createMediaStreamTrackSource(mediaStreamTrack) {
                return new mediaStreamTrackAudioSourceNodeConstructor(this, { mediaStreamTrack });
            }
            resume() {
                if (this._state === 'suspended') {
                    return new Promise((resolve, reject) => {
                        const resolvePromise = () => {
                            this._nativeAudioContext.removeEventListener('statechange', resolvePromise);
                            if (this._nativeAudioContext.state === 'running') {
                                resolve();
                            }
                            else {
                                this.resume().then(resolve, reject);
                            }
                        };
                        this._nativeAudioContext.addEventListener('statechange', resolvePromise);
                    });
                }
                return this._nativeAudioContext.resume().catch((err) => {
                    // Bug #55: Chrome, Edge and Opera do throw an InvalidAccessError instead of an InvalidStateError.
                    // Bug #56: Safari invokes the catch handler but without an error.
                    if (err === undefined || err.code === 15) {
                        throw createInvalidStateError();
                    }
                    throw err;
                });
            }
            suspend() {
                return this._nativeAudioContext.suspend().catch((err) => {
                    // Bug #56: Safari invokes the catch handler but without an error.
                    if (err === undefined) {
                        throw createInvalidStateError();
                    }
                    throw err;
                });
            }
        };
    };

    const createAudioDestinationNodeConstructor = (audioNodeConstructor, createAudioDestinationNodeRenderer, createIndexSizeError, createInvalidStateError, createNativeAudioDestinationNode, getNativeContext, isNativeOfflineAudioContext, renderInputsOfAudioNode) => {
        return class AudioDestinationNode extends audioNodeConstructor {
            constructor(context, channelCount) {
                const nativeContext = getNativeContext(context);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const nativeAudioDestinationNode = createNativeAudioDestinationNode(nativeContext, channelCount, isOffline);
                const audioDestinationNodeRenderer = ((isOffline ? createAudioDestinationNodeRenderer(renderInputsOfAudioNode) : null));
                super(context, false, nativeAudioDestinationNode, audioDestinationNodeRenderer);
                this._isNodeOfNativeOfflineAudioContext = isOffline;
                this._nativeAudioDestinationNode = nativeAudioDestinationNode;
            }
            get channelCount() {
                return this._nativeAudioDestinationNode.channelCount;
            }
            set channelCount(value) {
                // Bug #52: Chrome, Edge, Opera & Safari do not throw an exception at all.
                // Bug #54: Firefox does throw an IndexSizeError.
                if (this._isNodeOfNativeOfflineAudioContext) {
                    throw createInvalidStateError();
                }
                // Bug #47: The AudioDestinationNode in Safari does not initialize the maxChannelCount property correctly.
                if (value > this._nativeAudioDestinationNode.maxChannelCount) {
                    throw createIndexSizeError();
                }
                this._nativeAudioDestinationNode.channelCount = value;
            }
            get channelCountMode() {
                return this._nativeAudioDestinationNode.channelCountMode;
            }
            set channelCountMode(value) {
                // Bug #53: No browser does throw an exception yet.
                if (this._isNodeOfNativeOfflineAudioContext) {
                    throw createInvalidStateError();
                }
                this._nativeAudioDestinationNode.channelCountMode = value;
            }
            get maxChannelCount() {
                return this._nativeAudioDestinationNode.maxChannelCount;
            }
        };
    };

    const createAudioDestinationNodeRenderer = (renderInputsOfAudioNode) => {
        let nativeAudioDestinationNodePromise = null;
        const createAudioDestinationNode = async (proxy, nativeOfflineAudioContext, trace) => {
            const nativeAudioDestinationNode = nativeOfflineAudioContext.destination;
            await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeAudioDestinationNode, trace);
            return nativeAudioDestinationNode;
        };
        return {
            render(proxy, nativeOfflineAudioContext, trace) {
                if (nativeAudioDestinationNodePromise === null) {
                    nativeAudioDestinationNodePromise = createAudioDestinationNode(proxy, nativeOfflineAudioContext, trace);
                }
                return nativeAudioDestinationNodePromise;
            }
        };
    };

    const createAudioListenerFactory = (createAudioParam, createNativeChannelMergerNode, createNativeConstantSourceNode, createNativeScriptProcessorNode, isNativeOfflineAudioContext) => {
        return (context, nativeContext) => {
            const nativeListener = nativeContext.listener;
            // Bug #117: Only Chrome, Edge & Opera support the new interface already.
            const createFakeAudioParams = () => {
                const channelMergerNode = createNativeChannelMergerNode(nativeContext, {
                    channelCount: 1,
                    channelCountMode: 'explicit',
                    channelInterpretation: 'speakers',
                    numberOfInputs: 9
                });
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const scriptProcessorNode = createNativeScriptProcessorNode(nativeContext, 256, 9, 0);
                const createFakeAudioParam = (input, value) => {
                    const constantSourceNode = createNativeConstantSourceNode(nativeContext, {
                        channelCount: 1,
                        channelCountMode: 'explicit',
                        channelInterpretation: 'discrete',
                        offset: value
                    });
                    constantSourceNode.connect(channelMergerNode, 0, input);
                    // @todo This should be stopped when the context is closed.
                    constantSourceNode.start();
                    Object.defineProperty(constantSourceNode.offset, 'defaultValue', {
                        get() {
                            return value;
                        }
                    });
                    /*
                     * Bug #62 & #74: Safari does not support ConstantSourceNodes and does not export the correct values for maxValue and
                     * minValue for GainNodes.
                     */
                    return createAudioParam({ context }, isOffline, constantSourceNode.offset, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                };
                let lastOrientation = [0, 0, -1, 0, 1, 0];
                let lastPosition = [0, 0, 0];
                // tslint:disable-next-line:deprecation
                scriptProcessorNode.onaudioprocess = ({ inputBuffer }) => {
                    const orientation = [
                        inputBuffer.getChannelData(0)[0],
                        inputBuffer.getChannelData(1)[0],
                        inputBuffer.getChannelData(2)[0],
                        inputBuffer.getChannelData(3)[0],
                        inputBuffer.getChannelData(4)[0],
                        inputBuffer.getChannelData(5)[0]
                    ];
                    if (orientation.some((value, index) => value !== lastOrientation[index])) {
                        nativeListener.setOrientation(...orientation); // tslint:disable-line:deprecation
                        lastOrientation = orientation;
                    }
                    const positon = [
                        inputBuffer.getChannelData(6)[0],
                        inputBuffer.getChannelData(7)[0],
                        inputBuffer.getChannelData(8)[0]
                    ];
                    if (positon.some((value, index) => value !== lastPosition[index])) {
                        nativeListener.setPosition(...positon); // tslint:disable-line:deprecation
                        lastPosition = positon;
                    }
                };
                channelMergerNode.connect(scriptProcessorNode);
                return {
                    forwardX: createFakeAudioParam(0, 0),
                    forwardY: createFakeAudioParam(1, 0),
                    forwardZ: createFakeAudioParam(2, -1),
                    positionX: createFakeAudioParam(6, 0),
                    positionY: createFakeAudioParam(7, 0),
                    positionZ: createFakeAudioParam(8, 0),
                    upX: createFakeAudioParam(3, 0),
                    upY: createFakeAudioParam(4, 1),
                    upZ: createFakeAudioParam(5, 0)
                };
            };
            const { forwardX, forwardY, forwardZ, positionX, positionY, positionZ, upX, upY, upZ } = nativeListener.forwardX === undefined ? createFakeAudioParams() : nativeListener;
            return {
                get forwardX() {
                    return forwardX;
                },
                get forwardY() {
                    return forwardY;
                },
                get forwardZ() {
                    return forwardZ;
                },
                get positionX() {
                    return positionX;
                },
                get positionY() {
                    return positionY;
                },
                get positionZ() {
                    return positionZ;
                },
                get upX() {
                    return upX;
                },
                get upY() {
                    return upY;
                },
                get upZ() {
                    return upZ;
                }
            };
        };
    };

    const isAudioNode = (audioNodeOrAudioParam) => {
        return 'context' in audioNodeOrAudioParam;
    };

    const isAudioNodeOutputConnection = (outputConnection) => {
        return isAudioNode(outputConnection[0]);
    };

    const insertElementInSet = (set, element, predicate, ignoreDuplicates) => {
        for (const lmnt of set) {
            if (predicate(lmnt)) {
                if (ignoreDuplicates) {
                    return false;
                }
                throw Error('The set contains at least one similar element.');
            }
        }
        set.add(element);
        return true;
    };

    const addActiveInputConnectionToAudioParam = (activeInputs, source, [output, eventListener], ignoreDuplicates) => {
        insertElementInSet(activeInputs, [source, output, eventListener], (activeInputConnection) => activeInputConnection[0] === source && activeInputConnection[1] === output, ignoreDuplicates);
    };

    const addPassiveInputConnectionToAudioParam = (passiveInputs, [source, output, eventListener], ignoreDuplicates) => {
        const passiveInputConnections = passiveInputs.get(source);
        if (passiveInputConnections === undefined) {
            passiveInputs.set(source, new Set([[output, eventListener]]));
        }
        else {
            insertElementInSet(passiveInputConnections, [output, eventListener], (passiveInputConnection) => passiveInputConnection[0] === output, ignoreDuplicates);
        }
    };

    const isNativeAudioNodeFaker = (nativeAudioNodeOrNativeAudioNodeFaker) => {
        return 'inputs' in nativeAudioNodeOrNativeAudioNodeFaker;
    };

    const connectNativeAudioNodeToNativeAudioNode = (nativeSourceAudioNode, nativeDestinationAudioNode, output, input) => {
        if (isNativeAudioNodeFaker(nativeDestinationAudioNode)) {
            const fakeNativeDestinationAudioNode = nativeDestinationAudioNode.inputs[input];
            nativeSourceAudioNode.connect(fakeNativeDestinationAudioNode, output, 0);
            return [fakeNativeDestinationAudioNode, output, 0];
        }
        nativeSourceAudioNode.connect(nativeDestinationAudioNode, output, input);
        return [nativeDestinationAudioNode, output, input];
    };

    const deleteActiveInputConnection = (activeInputConnections, source, output) => {
        for (const activeInputConnection of activeInputConnections) {
            if (activeInputConnection[0] === source && activeInputConnection[1] === output) {
                activeInputConnections.delete(activeInputConnection);
                return activeInputConnection;
            }
        }
        return null;
    };

    const deleteActiveInputConnectionToAudioParam = (activeInputs, source, output) => {
        return pickElementFromSet(activeInputs, (activeInputConnection) => activeInputConnection[0] === source && activeInputConnection[1] === output);
    };

    const deleteEventListenerOfAudioNode = (audioNode, eventListener) => {
        const eventListeners = getEventListenersOfAudioNode(audioNode);
        if (!eventListeners.delete(eventListener)) {
            throw new Error('Missing the expected event listener.');
        }
    };

    const deletePassiveInputConnectionToAudioParam = (passiveInputs, source, output) => {
        const passiveInputConnections = getValueForKey(passiveInputs, source);
        const matchingConnection = pickElementFromSet(passiveInputConnections, (passiveInputConnection) => passiveInputConnection[0] === output);
        if (passiveInputConnections.size === 0) {
            passiveInputs.delete(source);
        }
        return matchingConnection;
    };

    const disconnectNativeAudioNodeFromNativeAudioNode = (nativeSourceAudioNode, nativeDestinationAudioNode, output, input) => {
        if (isNativeAudioNodeFaker(nativeDestinationAudioNode)) {
            nativeSourceAudioNode.disconnect(nativeDestinationAudioNode.inputs[input], output, 0);
        }
        else {
            nativeSourceAudioNode.disconnect(nativeDestinationAudioNode, output, input);
        }
    };

    const getNativeAudioNode = (audioNode) => {
        return getValueForKey(AUDIO_NODE_STORE, audioNode);
    };

    const getNativeAudioParam = (audioParam) => {
        return getValueForKey(AUDIO_PARAM_STORE, audioParam);
    };

    const isPartOfACycle = (audioNode) => {
        return CYCLE_COUNTERS.has(audioNode);
    };

    const isPassiveAudioNode = (audioNode) => {
        return !ACTIVE_AUDIO_NODE_STORE.has(audioNode);
    };

    const testAudioNodeDisconnectMethodSupport = (nativeAudioContext) => {
        return new Promise((resolve) => {
            const analyzer = nativeAudioContext.createScriptProcessor(256, 1, 1);
            const dummy = nativeAudioContext.createGain();
            // Bug #95: Safari does not play one sample buffers.
            const ones = nativeAudioContext.createBuffer(1, 2, 44100);
            const channelData = ones.getChannelData(0);
            channelData[0] = 1;
            channelData[1] = 1;
            const source = nativeAudioContext.createBufferSource();
            source.buffer = ones;
            source.loop = true;
            source.connect(analyzer).connect(nativeAudioContext.destination);
            source.connect(dummy);
            source.disconnect(dummy);
            // tslint:disable-next-line:deprecation
            analyzer.onaudioprocess = (event) => {
                const chnnlDt = event.inputBuffer.getChannelData(0);
                if (Array.prototype.some.call(chnnlDt, (sample) => sample === 1)) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
                source.stop();
                analyzer.onaudioprocess = null; // tslint:disable-line:deprecation
                source.disconnect(analyzer);
                analyzer.disconnect(nativeAudioContext.destination);
            };
            source.start();
        });
    };

    const visitEachAudioNodeOnce = (cycles, visitor) => {
        const counts = new Map();
        for (const cycle of cycles) {
            for (const audioNode of cycle) {
                const count = counts.get(audioNode);
                counts.set(audioNode, count === undefined ? 1 : count + 1);
            }
        }
        counts.forEach((count, audioNode) => visitor(audioNode, count));
    };

    const isNativeAudioNode = (nativeAudioNodeOrAudioParam) => {
        return 'context' in nativeAudioNodeOrAudioParam;
    };

    const wrapAudioNodeDisconnectMethod = (nativeAudioNode) => {
        const connections = new Map();
        nativeAudioNode.connect = ((connect) => {
            // tslint:disable-next-line:invalid-void
            return (destination, output = 0, input = 0) => {
                const returnValue = isNativeAudioNode(destination) ? connect(destination, output, input) : connect(destination, output);
                // Save the new connection only if the calls to connect above didn't throw an error.
                const connectionsToDestination = connections.get(destination);
                if (connectionsToDestination === undefined) {
                    connections.set(destination, [{ input, output }]);
                }
                else {
                    if (connectionsToDestination.every((connection) => connection.input !== input || connection.output !== output)) {
                        connectionsToDestination.push({ input, output });
                    }
                }
                return returnValue;
            };
        })(nativeAudioNode.connect.bind(nativeAudioNode));
        nativeAudioNode.disconnect = ((disconnect) => {
            return (destinationOrOutput, output, input) => {
                disconnect.apply(nativeAudioNode);
                if (destinationOrOutput === undefined) {
                    connections.clear();
                }
                else if (typeof destinationOrOutput === 'number') {
                    for (const [destination, connectionsToDestination] of connections) {
                        const filteredConnections = connectionsToDestination.filter((connection) => connection.output !== destinationOrOutput);
                        if (filteredConnections.length === 0) {
                            connections.delete(destination);
                        }
                        else {
                            connections.set(destination, filteredConnections);
                        }
                    }
                }
                else if (connections.has(destinationOrOutput)) {
                    if (output === undefined) {
                        connections.delete(destinationOrOutput);
                    }
                    else {
                        const connectionsToDestination = connections.get(destinationOrOutput);
                        if (connectionsToDestination !== undefined) {
                            const filteredConnections = connectionsToDestination.filter((connection) => connection.output !== output && (connection.input !== input || input === undefined));
                            if (filteredConnections.length === 0) {
                                connections.delete(destinationOrOutput);
                            }
                            else {
                                connections.set(destinationOrOutput, filteredConnections);
                            }
                        }
                    }
                }
                for (const [destination, connectionsToDestination] of connections) {
                    connectionsToDestination.forEach((connection) => {
                        if (isNativeAudioNode(destination)) {
                            nativeAudioNode.connect(destination, connection.output, connection.input);
                        }
                        else {
                            nativeAudioNode.connect(destination, connection.output);
                        }
                    });
                }
            };
        })(nativeAudioNode.disconnect);
    };

    const addConnectionToAudioParamOfAudioContext = (source, destination, output, isOffline) => {
        const { activeInputs, passiveInputs } = getAudioParamConnections(destination);
        const { outputs } = getAudioNodeConnections(source);
        const eventListeners = getEventListenersOfAudioNode(source);
        const eventListener = (isActive) => {
            const nativeAudioNode = getNativeAudioNode(source);
            const nativeAudioParam = getNativeAudioParam(destination);
            if (isActive) {
                const partialConnection = deletePassiveInputConnectionToAudioParam(passiveInputs, source, output);
                addActiveInputConnectionToAudioParam(activeInputs, source, partialConnection, false);
                if (!isOffline && !isPartOfACycle(source)) {
                    nativeAudioNode.connect(nativeAudioParam, output);
                }
            }
            else {
                const partialConnection = deleteActiveInputConnectionToAudioParam(activeInputs, source, output);
                addPassiveInputConnectionToAudioParam(passiveInputs, partialConnection, false);
                if (!isOffline && !isPartOfACycle(source)) {
                    nativeAudioNode.disconnect(nativeAudioParam, output);
                }
            }
        };
        if (insertElementInSet(outputs, [destination, output], (outputConnection) => outputConnection[0] === destination && outputConnection[1] === output, true)) {
            eventListeners.add(eventListener);
            if (isActiveAudioNode(source)) {
                addActiveInputConnectionToAudioParam(activeInputs, source, [output, eventListener], true);
            }
            else {
                addPassiveInputConnectionToAudioParam(passiveInputs, [source, output, eventListener], true);
            }
            return true;
        }
        return false;
    };
    const deleteInputConnectionOfAudioNode = (source, destination, output, input) => {
        const { activeInputs, passiveInputs } = getAudioNodeConnections(destination);
        const activeInputConnection = deleteActiveInputConnection(activeInputs[input], source, output);
        if (activeInputConnection === null) {
            const passiveInputConnection = deletePassiveInputConnectionToAudioNode(passiveInputs, source, output, input);
            return [passiveInputConnection[2], false];
        }
        return [activeInputConnection[2], true];
    };
    const deleteInputConnectionOfAudioParam = (source, destination, output) => {
        const { activeInputs, passiveInputs } = getAudioParamConnections(destination);
        const activeInputConnection = deleteActiveInputConnection(activeInputs, source, output);
        if (activeInputConnection === null) {
            const passiveInputConnection = deletePassiveInputConnectionToAudioParam(passiveInputs, source, output);
            return [passiveInputConnection[1], false];
        }
        return [activeInputConnection[2], true];
    };
    const deleteInputsOfAudioNode = (source, isOffline, destination, output, input) => {
        const [listener, isActive] = deleteInputConnectionOfAudioNode(source, destination, output, input);
        if (listener !== null) {
            deleteEventListenerOfAudioNode(source, listener);
            if (isActive && !isOffline && !isPartOfACycle(source)) {
                disconnectNativeAudioNodeFromNativeAudioNode(getNativeAudioNode(source), getNativeAudioNode(destination), output, input);
            }
        }
        if (isActiveAudioNode(destination)) {
            const { activeInputs } = getAudioNodeConnections(destination);
            setInternalStateToPassiveWhenNecessary(destination, activeInputs);
        }
    };
    const deleteInputsOfAudioParam = (source, isOffline, destination, output) => {
        const [listener, isActive] = deleteInputConnectionOfAudioParam(source, destination, output);
        if (listener !== null) {
            deleteEventListenerOfAudioNode(source, listener);
            if (isActive && !isOffline && !isPartOfACycle(source)) {
                getNativeAudioNode(source).disconnect(getNativeAudioParam(destination), output);
            }
        }
    };
    const deleteAnyConnection = (source, isOffline) => {
        const audioNodeConnectionsOfSource = getAudioNodeConnections(source);
        const destinations = [];
        for (const outputConnection of audioNodeConnectionsOfSource.outputs) {
            if (isAudioNodeOutputConnection(outputConnection)) {
                deleteInputsOfAudioNode(source, isOffline, ...outputConnection);
            }
            else {
                deleteInputsOfAudioParam(source, isOffline, ...outputConnection);
            }
            destinations.push(outputConnection[0]);
        }
        audioNodeConnectionsOfSource.outputs.clear();
        return destinations;
    };
    const deleteConnectionAtOutput = (source, isOffline, output) => {
        const audioNodeConnectionsOfSource = getAudioNodeConnections(source);
        const destinations = [];
        for (const outputConnection of audioNodeConnectionsOfSource.outputs) {
            if (outputConnection[1] === output) {
                if (isAudioNodeOutputConnection(outputConnection)) {
                    deleteInputsOfAudioNode(source, isOffline, ...outputConnection);
                }
                else {
                    deleteInputsOfAudioParam(source, isOffline, ...outputConnection);
                }
                destinations.push(outputConnection[0]);
                audioNodeConnectionsOfSource.outputs.delete(outputConnection);
            }
        }
        return destinations;
    };
    const deleteConnectionToDestination = (source, isOffline, destination, output, input) => {
        const audioNodeConnectionsOfSource = getAudioNodeConnections(source);
        return Array.from(audioNodeConnectionsOfSource.outputs)
            .filter((outputConnection) => outputConnection[0] === destination &&
            (output === undefined || outputConnection[1] === output) &&
            (input === undefined || outputConnection[2] === input))
            .map((outputConnection) => {
            if (isAudioNodeOutputConnection(outputConnection)) {
                deleteInputsOfAudioNode(source, isOffline, ...outputConnection);
            }
            else {
                deleteInputsOfAudioParam(source, isOffline, ...outputConnection);
            }
            audioNodeConnectionsOfSource.outputs.delete(outputConnection);
            return outputConnection[0];
        });
    };
    const createAudioNodeConstructor = (addAudioNodeConnections, addConnectionToAudioNode, cacheTestResult, createIncrementCycleCounter, createIndexSizeError, createInvalidAccessError, createNotSupportedError, decrementCycleCounter, detectCycles, eventTargetConstructor, getNativeContext, isNativeAudioContext, isNativeAudioNode, isNativeAudioParam, isNativeOfflineAudioContext) => {
        return class AudioNode extends eventTargetConstructor {
            constructor(context, isActive, nativeAudioNode, audioNodeRenderer) {
                super(nativeAudioNode);
                this._context = context;
                this._nativeAudioNode = nativeAudioNode;
                const nativeContext = getNativeContext(context);
                // Bug #12: Safari does not support to disconnect a specific destination.
                if (isNativeAudioContext(nativeContext) &&
                    true !==
                        cacheTestResult(testAudioNodeDisconnectMethodSupport, () => {
                            return testAudioNodeDisconnectMethodSupport(nativeContext);
                        })) {
                    wrapAudioNodeDisconnectMethod(nativeAudioNode);
                }
                AUDIO_NODE_STORE.set(this, nativeAudioNode);
                EVENT_LISTENERS.set(this, new Set());
                if (context.state !== 'closed' && isActive) {
                    setInternalStateToActive(this);
                }
                addAudioNodeConnections(this, audioNodeRenderer, nativeAudioNode);
            }
            get channelCount() {
                return this._nativeAudioNode.channelCount;
            }
            set channelCount(value) {
                this._nativeAudioNode.channelCount = value;
            }
            get channelCountMode() {
                return this._nativeAudioNode.channelCountMode;
            }
            set channelCountMode(value) {
                this._nativeAudioNode.channelCountMode = value;
            }
            get channelInterpretation() {
                return this._nativeAudioNode.channelInterpretation;
            }
            set channelInterpretation(value) {
                this._nativeAudioNode.channelInterpretation = value;
            }
            get context() {
                return this._context;
            }
            get numberOfInputs() {
                return this._nativeAudioNode.numberOfInputs;
            }
            get numberOfOutputs() {
                return this._nativeAudioNode.numberOfOutputs;
            }
            // tslint:disable-next-line:invalid-void
            connect(destination, output = 0, input = 0) {
                // Bug #174: Safari does expose a wrong numberOfOutputs for MediaStreamAudioDestinationNodes.
                if (output < 0 || output >= this._nativeAudioNode.numberOfOutputs) {
                    throw createIndexSizeError();
                }
                const nativeContext = getNativeContext(this._context);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                if (isNativeAudioNode(destination) || isNativeAudioParam(destination)) {
                    throw createInvalidAccessError();
                }
                if (isAudioNode(destination)) {
                    const nativeDestinationAudioNode = getNativeAudioNode(destination);
                    try {
                        const connection = connectNativeAudioNodeToNativeAudioNode(this._nativeAudioNode, nativeDestinationAudioNode, output, input);
                        const isPassive = isPassiveAudioNode(this);
                        if (isOffline || isPassive) {
                            this._nativeAudioNode.disconnect(...connection);
                        }
                        if (this.context.state !== 'closed' && !isPassive && isPassiveAudioNode(destination)) {
                            setInternalStateToActive(destination);
                        }
                    }
                    catch (err) {
                        // Bug #41: Safari does not throw the correct exception so far.
                        if (err.code === 12) {
                            throw createInvalidAccessError();
                        }
                        throw err;
                    }
                    const isNewConnectionToAudioNode = addConnectionToAudioNode(this, destination, output, input, isOffline);
                    // Bug #164: Only Firefox detects cycles so far.
                    if (isNewConnectionToAudioNode) {
                        const cycles = detectCycles([this], destination);
                        visitEachAudioNodeOnce(cycles, createIncrementCycleCounter(isOffline));
                    }
                    return destination;
                }
                const nativeAudioParam = getNativeAudioParam(destination);
                /*
                 * Bug #73, #147 & #153: Safari does not support to connect an input signal to the playbackRate AudioParam of an
                 * AudioBufferSourceNode. This can't be easily detected and that's why the outdated name property is used here to identify
                 * Safari. In addition to that the maxValue property is used to only detect the affected versions below v14.0.2.
                 */
                if (nativeAudioParam.name === 'playbackRate' && nativeAudioParam.maxValue === 1024) {
                    throw createNotSupportedError();
                }
                try {
                    this._nativeAudioNode.connect(nativeAudioParam, output);
                    if (isOffline || isPassiveAudioNode(this)) {
                        this._nativeAudioNode.disconnect(nativeAudioParam, output);
                    }
                }
                catch (err) {
                    // Bug #58: Only Firefox does throw an InvalidStateError yet.
                    if (err.code === 12) {
                        throw createInvalidAccessError();
                    }
                    throw err;
                }
                const isNewConnectionToAudioParam = addConnectionToAudioParamOfAudioContext(this, destination, output, isOffline);
                // Bug #164: Only Firefox detects cycles so far.
                if (isNewConnectionToAudioParam) {
                    const cycles = detectCycles([this], destination);
                    visitEachAudioNodeOnce(cycles, createIncrementCycleCounter(isOffline));
                }
            }
            disconnect(destinationOrOutput, output, input) {
                let destinations;
                const nativeContext = getNativeContext(this._context);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                if (destinationOrOutput === undefined) {
                    destinations = deleteAnyConnection(this, isOffline);
                }
                else if (typeof destinationOrOutput === 'number') {
                    if (destinationOrOutput < 0 || destinationOrOutput >= this.numberOfOutputs) {
                        throw createIndexSizeError();
                    }
                    destinations = deleteConnectionAtOutput(this, isOffline, destinationOrOutput);
                }
                else {
                    if (output !== undefined && (output < 0 || output >= this.numberOfOutputs)) {
                        throw createIndexSizeError();
                    }
                    if (isAudioNode(destinationOrOutput) && input !== undefined && (input < 0 || input >= destinationOrOutput.numberOfInputs)) {
                        throw createIndexSizeError();
                    }
                    destinations = deleteConnectionToDestination(this, isOffline, destinationOrOutput, output, input);
                    if (destinations.length === 0) {
                        throw createInvalidAccessError();
                    }
                }
                // Bug #164: Only Firefox detects cycles so far.
                for (const destination of destinations) {
                    const cycles = detectCycles([this], destination);
                    visitEachAudioNodeOnce(cycles, decrementCycleCounter);
                }
            }
        };
    };

    const createAudioParamFactory = (addAudioParamConnections, audioParamAudioNodeStore, audioParamStore, createAudioParamRenderer, createCancelAndHoldAutomationEvent, createCancelScheduledValuesAutomationEvent, createExponentialRampToValueAutomationEvent, createLinearRampToValueAutomationEvent, createSetTargetAutomationEvent, createSetValueAutomationEvent, createSetValueCurveAutomationEvent, nativeAudioContextConstructor, setValueAtTimeUntilPossible) => {
        return (audioNode, isAudioParamOfOfflineAudioContext, nativeAudioParam, maxValue = null, minValue = null) => {
            const automationEventList = new AutomationEventList(nativeAudioParam.defaultValue);
            const audioParamRenderer = isAudioParamOfOfflineAudioContext ? createAudioParamRenderer(automationEventList) : null;
            const audioParam = {
                get defaultValue() {
                    return nativeAudioParam.defaultValue;
                },
                get maxValue() {
                    return maxValue === null ? nativeAudioParam.maxValue : maxValue;
                },
                get minValue() {
                    return minValue === null ? nativeAudioParam.minValue : minValue;
                },
                get value() {
                    return nativeAudioParam.value;
                },
                set value(value) {
                    nativeAudioParam.value = value;
                    // Bug #98: Firefox & Safari do not yet treat the value setter like a call to setValueAtTime().
                    audioParam.setValueAtTime(value, audioNode.context.currentTime);
                },
                cancelAndHoldAtTime(cancelTime) {
                    // Bug #28: Firefox & Safari do not yet implement cancelAndHoldAtTime().
                    if (typeof nativeAudioParam.cancelAndHoldAtTime === 'function') {
                        if (audioParamRenderer === null) {
                            automationEventList.flush(audioNode.context.currentTime);
                        }
                        automationEventList.add(createCancelAndHoldAutomationEvent(cancelTime));
                        nativeAudioParam.cancelAndHoldAtTime(cancelTime);
                    }
                    else {
                        const previousLastEvent = Array.from(automationEventList).pop();
                        if (audioParamRenderer === null) {
                            automationEventList.flush(audioNode.context.currentTime);
                        }
                        automationEventList.add(createCancelAndHoldAutomationEvent(cancelTime));
                        const currentLastEvent = Array.from(automationEventList).pop();
                        nativeAudioParam.cancelScheduledValues(cancelTime);
                        if (previousLastEvent !== currentLastEvent && currentLastEvent !== undefined) {
                            if (currentLastEvent.type === 'exponentialRampToValue') {
                                nativeAudioParam.exponentialRampToValueAtTime(currentLastEvent.value, currentLastEvent.endTime);
                            }
                            else if (currentLastEvent.type === 'linearRampToValue') {
                                nativeAudioParam.linearRampToValueAtTime(currentLastEvent.value, currentLastEvent.endTime);
                            }
                            else if (currentLastEvent.type === 'setValue') {
                                nativeAudioParam.setValueAtTime(currentLastEvent.value, currentLastEvent.startTime);
                            }
                            else if (currentLastEvent.type === 'setValueCurve') {
                                nativeAudioParam.setValueCurveAtTime(currentLastEvent.values, currentLastEvent.startTime, currentLastEvent.duration);
                            }
                        }
                    }
                    return audioParam;
                },
                cancelScheduledValues(cancelTime) {
                    if (audioParamRenderer === null) {
                        automationEventList.flush(audioNode.context.currentTime);
                    }
                    automationEventList.add(createCancelScheduledValuesAutomationEvent(cancelTime));
                    nativeAudioParam.cancelScheduledValues(cancelTime);
                    return audioParam;
                },
                exponentialRampToValueAtTime(value, endTime) {
                    // Bug #45: Safari does not throw an error yet.
                    if (value === 0) {
                        throw new RangeError();
                    }
                    // Bug #187: Safari does not throw an error yet.
                    if (!Number.isFinite(endTime) || endTime < 0) {
                        throw new RangeError();
                    }
                    if (audioParamRenderer === null) {
                        automationEventList.flush(audioNode.context.currentTime);
                    }
                    automationEventList.add(createExponentialRampToValueAutomationEvent(value, endTime));
                    nativeAudioParam.exponentialRampToValueAtTime(value, endTime);
                    return audioParam;
                },
                linearRampToValueAtTime(value, endTime) {
                    if (audioParamRenderer === null) {
                        automationEventList.flush(audioNode.context.currentTime);
                    }
                    automationEventList.add(createLinearRampToValueAutomationEvent(value, endTime));
                    nativeAudioParam.linearRampToValueAtTime(value, endTime);
                    return audioParam;
                },
                setTargetAtTime(target, startTime, timeConstant) {
                    if (audioParamRenderer === null) {
                        automationEventList.flush(audioNode.context.currentTime);
                    }
                    automationEventList.add(createSetTargetAutomationEvent(target, startTime, timeConstant));
                    nativeAudioParam.setTargetAtTime(target, startTime, timeConstant);
                    return audioParam;
                },
                setValueAtTime(value, startTime) {
                    if (audioParamRenderer === null) {
                        automationEventList.flush(audioNode.context.currentTime);
                    }
                    automationEventList.add(createSetValueAutomationEvent(value, startTime));
                    nativeAudioParam.setValueAtTime(value, startTime);
                    return audioParam;
                },
                setValueCurveAtTime(values, startTime, duration) {
                    // Bug 183: Safari only accepts a Float32Array.
                    const convertedValues = values instanceof Float32Array ? values : new Float32Array(values);
                    /*
                     * Bug #152: Safari does not correctly interpolate the values of the curve.
                     * @todo Unfortunately there is no way to test for this behavior in a synchronous fashion which is why testing for the
                     * existence of the webkitAudioContext is used as a workaround here.
                     */
                    if (nativeAudioContextConstructor !== null && nativeAudioContextConstructor.name === 'webkitAudioContext') {
                        const endTime = startTime + duration;
                        const sampleRate = audioNode.context.sampleRate;
                        const firstSample = Math.ceil(startTime * sampleRate);
                        const lastSample = Math.floor(endTime * sampleRate);
                        const numberOfInterpolatedValues = lastSample - firstSample;
                        const interpolatedValues = new Float32Array(numberOfInterpolatedValues);
                        for (let i = 0; i < numberOfInterpolatedValues; i += 1) {
                            const theoreticIndex = ((convertedValues.length - 1) / duration) * ((firstSample + i) / sampleRate - startTime);
                            const lowerIndex = Math.floor(theoreticIndex);
                            const upperIndex = Math.ceil(theoreticIndex);
                            interpolatedValues[i] =
                                lowerIndex === upperIndex
                                    ? convertedValues[lowerIndex]
                                    : (1 - (theoreticIndex - lowerIndex)) * convertedValues[lowerIndex] +
                                        (1 - (upperIndex - theoreticIndex)) * convertedValues[upperIndex];
                        }
                        if (audioParamRenderer === null) {
                            automationEventList.flush(audioNode.context.currentTime);
                        }
                        automationEventList.add(createSetValueCurveAutomationEvent(interpolatedValues, startTime, duration));
                        nativeAudioParam.setValueCurveAtTime(interpolatedValues, startTime, duration);
                        const timeOfLastSample = lastSample / sampleRate;
                        if (timeOfLastSample < endTime) {
                            setValueAtTimeUntilPossible(audioParam, interpolatedValues[interpolatedValues.length - 1], timeOfLastSample);
                        }
                        setValueAtTimeUntilPossible(audioParam, convertedValues[convertedValues.length - 1], endTime);
                    }
                    else {
                        if (audioParamRenderer === null) {
                            automationEventList.flush(audioNode.context.currentTime);
                        }
                        automationEventList.add(createSetValueCurveAutomationEvent(convertedValues, startTime, duration));
                        nativeAudioParam.setValueCurveAtTime(convertedValues, startTime, duration);
                    }
                    return audioParam;
                }
            };
            audioParamStore.set(audioParam, nativeAudioParam);
            audioParamAudioNodeStore.set(audioParam, audioNode);
            addAudioParamConnections(audioParam, audioParamRenderer);
            return audioParam;
        };
    };

    const createAudioParamRenderer = (automationEventList) => {
        return {
            replay(audioParam) {
                for (const automationEvent of automationEventList) {
                    if (automationEvent.type === 'exponentialRampToValue') {
                        const { endTime, value } = automationEvent;
                        audioParam.exponentialRampToValueAtTime(value, endTime);
                    }
                    else if (automationEvent.type === 'linearRampToValue') {
                        const { endTime, value } = automationEvent;
                        audioParam.linearRampToValueAtTime(value, endTime);
                    }
                    else if (automationEvent.type === 'setTarget') {
                        const { startTime, target, timeConstant } = automationEvent;
                        audioParam.setTargetAtTime(target, startTime, timeConstant);
                    }
                    else if (automationEvent.type === 'setValue') {
                        const { startTime, value } = automationEvent;
                        audioParam.setValueAtTime(value, startTime);
                    }
                    else if (automationEvent.type === 'setValueCurve') {
                        const { duration, startTime, values } = automationEvent;
                        audioParam.setValueCurveAtTime(values, startTime, duration);
                    }
                    else {
                        throw new Error("Can't apply an unknown automation.");
                    }
                }
            }
        };
    };

    const createBaseAudioContextConstructor = (addAudioWorkletModule, analyserNodeConstructor, audioBufferConstructor, audioBufferSourceNodeConstructor, biquadFilterNodeConstructor, channelMergerNodeConstructor, channelSplitterNodeConstructor, constantSourceNodeConstructor, convolverNodeConstructor, decodeAudioData, delayNodeConstructor, dynamicsCompressorNodeConstructor, gainNodeConstructor, iIRFilterNodeConstructor, minimalBaseAudioContextConstructor, oscillatorNodeConstructor, pannerNodeConstructor, periodicWaveConstructor, stereoPannerNodeConstructor, waveShaperNodeConstructor) => {
        return class BaseAudioContext extends minimalBaseAudioContextConstructor {
            constructor(_nativeContext, numberOfChannels) {
                super(_nativeContext, numberOfChannels);
                this._nativeContext = _nativeContext;
                this._audioWorklet =
                    addAudioWorkletModule === undefined
                        ? undefined
                        : {
                            addModule: (moduleURL, options) => {
                                return addAudioWorkletModule(this, moduleURL, options);
                            }
                        };
            }
            get audioWorklet() {
                return this._audioWorklet;
            }
            createAnalyser() {
                return new analyserNodeConstructor(this);
            }
            createBiquadFilter() {
                return new biquadFilterNodeConstructor(this);
            }
            createBuffer(numberOfChannels, length, sampleRate) {
                return new audioBufferConstructor({ length, numberOfChannels, sampleRate });
            }
            createBufferSource() {
                return new audioBufferSourceNodeConstructor(this);
            }
            createChannelMerger(numberOfInputs = 6) {
                return new channelMergerNodeConstructor(this, { numberOfInputs });
            }
            createChannelSplitter(numberOfOutputs = 6) {
                return new channelSplitterNodeConstructor(this, { numberOfOutputs });
            }
            createConstantSource() {
                return new constantSourceNodeConstructor(this);
            }
            createConvolver() {
                return new convolverNodeConstructor(this);
            }
            createDelay(maxDelayTime = 1) {
                return new delayNodeConstructor(this, { maxDelayTime });
            }
            createDynamicsCompressor() {
                return new dynamicsCompressorNodeConstructor(this);
            }
            createGain() {
                return new gainNodeConstructor(this);
            }
            createIIRFilter(feedforward, feedback) {
                return new iIRFilterNodeConstructor(this, { feedback, feedforward });
            }
            createOscillator() {
                return new oscillatorNodeConstructor(this);
            }
            createPanner() {
                return new pannerNodeConstructor(this);
            }
            createPeriodicWave(real, imag, constraints = { disableNormalization: false }) {
                return new periodicWaveConstructor(this, { ...constraints, imag, real });
            }
            createStereoPanner() {
                return new stereoPannerNodeConstructor(this);
            }
            createWaveShaper() {
                return new waveShaperNodeConstructor(this);
            }
            decodeAudioData(audioData, successCallback, errorCallback) {
                return decodeAudioData(this._nativeContext, audioData)
                    .then((audioBuffer) => {
                    if (typeof successCallback === 'function') {
                        successCallback(audioBuffer);
                    }
                    return audioBuffer;
                })
                    .catch((err) => {
                    if (typeof errorCallback === 'function') {
                        errorCallback(err);
                    }
                    throw err;
                });
            }
        };
    };

    const DEFAULT_OPTIONS$3 = {
        Q: 1,
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        detune: 0,
        frequency: 350,
        gain: 0,
        type: 'lowpass'
    };
    const createBiquadFilterNodeConstructor = (audioNodeConstructor, createAudioParam, createBiquadFilterNodeRenderer, createInvalidAccessError, createNativeBiquadFilterNode, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class BiquadFilterNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$3, ...options };
                const nativeBiquadFilterNode = createNativeBiquadFilterNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const biquadFilterNodeRenderer = (isOffline ? createBiquadFilterNodeRenderer() : null);
                super(context, false, nativeBiquadFilterNode, biquadFilterNodeRenderer);
                // Bug #80: Safari does not export the correct values for maxValue and minValue.
                this._Q = createAudioParam(this, isOffline, nativeBiquadFilterNode.Q, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                // Bug #78: Firefox & Safari do not export the correct values for maxValue and minValue.
                this._detune = createAudioParam(this, isOffline, nativeBiquadFilterNode.detune, 1200 * Math.log2(MOST_POSITIVE_SINGLE_FLOAT), -1200 * Math.log2(MOST_POSITIVE_SINGLE_FLOAT));
                // Bug #77: Firefox & Safari do not export the correct value for minValue.
                this._frequency = createAudioParam(this, isOffline, nativeBiquadFilterNode.frequency, context.sampleRate / 2, 0);
                // Bug #79: Firefox & Safari do not export the correct values for maxValue and minValue.
                this._gain = createAudioParam(this, isOffline, nativeBiquadFilterNode.gain, 40 * Math.log10(MOST_POSITIVE_SINGLE_FLOAT), MOST_NEGATIVE_SINGLE_FLOAT);
                this._nativeBiquadFilterNode = nativeBiquadFilterNode;
                // @todo Determine a meaningful tail-time instead of just using one second.
                setAudioNodeTailTime(this, 1);
            }
            get detune() {
                return this._detune;
            }
            get frequency() {
                return this._frequency;
            }
            get gain() {
                return this._gain;
            }
            get Q() {
                return this._Q;
            }
            get type() {
                return this._nativeBiquadFilterNode.type;
            }
            set type(value) {
                this._nativeBiquadFilterNode.type = value;
            }
            getFrequencyResponse(frequencyHz, magResponse, phaseResponse) {
                // Bug #189: Safari does throw an InvalidStateError.
                try {
                    this._nativeBiquadFilterNode.getFrequencyResponse(frequencyHz, magResponse, phaseResponse);
                }
                catch (err) {
                    if (err.code === 11) {
                        throw createInvalidAccessError();
                    }
                    throw err;
                }
                // Bug #68: Safari does not throw an error if the parameters differ in their length.
                if (frequencyHz.length !== magResponse.length || magResponse.length !== phaseResponse.length) {
                    throw createInvalidAccessError();
                }
            }
        };
    };

    const createBiquadFilterNodeRendererFactory = (connectAudioParam, createNativeBiquadFilterNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeBiquadFilterNodes = new WeakMap();
            const createBiquadFilterNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeBiquadFilterNode = getNativeAudioNode(proxy);
                /*
                 * If the initially used nativeBiquadFilterNode was not constructed on the same OfflineAudioContext it needs to be created
                 * again.
                 */
                const nativeBiquadFilterNodeIsOwnedByContext = isOwnedByContext(nativeBiquadFilterNode, nativeOfflineAudioContext);
                if (!nativeBiquadFilterNodeIsOwnedByContext) {
                    const options = {
                        Q: nativeBiquadFilterNode.Q.value,
                        channelCount: nativeBiquadFilterNode.channelCount,
                        channelCountMode: nativeBiquadFilterNode.channelCountMode,
                        channelInterpretation: nativeBiquadFilterNode.channelInterpretation,
                        detune: nativeBiquadFilterNode.detune.value,
                        frequency: nativeBiquadFilterNode.frequency.value,
                        gain: nativeBiquadFilterNode.gain.value,
                        type: nativeBiquadFilterNode.type
                    };
                    nativeBiquadFilterNode = createNativeBiquadFilterNode(nativeOfflineAudioContext, options);
                }
                renderedNativeBiquadFilterNodes.set(nativeOfflineAudioContext, nativeBiquadFilterNode);
                if (!nativeBiquadFilterNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.Q, nativeBiquadFilterNode.Q, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.detune, nativeBiquadFilterNode.detune, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.frequency, nativeBiquadFilterNode.frequency, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.gain, nativeBiquadFilterNode.gain, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.Q, nativeBiquadFilterNode.Q, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.detune, nativeBiquadFilterNode.detune, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.frequency, nativeBiquadFilterNode.frequency, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.gain, nativeBiquadFilterNode.gain, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeBiquadFilterNode, trace);
                return nativeBiquadFilterNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeBiquadFilterNode = renderedNativeBiquadFilterNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeBiquadFilterNode !== undefined) {
                        return Promise.resolve(renderedNativeBiquadFilterNode);
                    }
                    return createBiquadFilterNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createCacheTestResult = (ongoingTests, testResults) => {
        return (tester, test) => {
            const cachedTestResult = testResults.get(tester);
            if (cachedTestResult !== undefined) {
                return cachedTestResult;
            }
            const ongoingTest = ongoingTests.get(tester);
            if (ongoingTest !== undefined) {
                return ongoingTest;
            }
            try {
                const synchronousTestResult = test();
                if (synchronousTestResult instanceof Promise) {
                    ongoingTests.set(tester, synchronousTestResult);
                    return synchronousTestResult
                        .catch(() => false)
                        .then((finalTestResult) => {
                        ongoingTests.delete(tester);
                        testResults.set(tester, finalTestResult);
                        return finalTestResult;
                    });
                }
                testResults.set(tester, synchronousTestResult);
                return synchronousTestResult;
            }
            catch {
                testResults.set(tester, false);
                return false;
            }
        };
    };

    const DEFAULT_OPTIONS$4 = {
        channelCount: 1,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
        numberOfInputs: 6
    };
    const createChannelMergerNodeConstructor = (audioNodeConstructor, createChannelMergerNodeRenderer, createNativeChannelMergerNode, getNativeContext, isNativeOfflineAudioContext) => {
        return class ChannelMergerNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$4, ...options };
                const nativeChannelMergerNode = createNativeChannelMergerNode(nativeContext, mergedOptions);
                const channelMergerNodeRenderer = ((isNativeOfflineAudioContext(nativeContext) ? createChannelMergerNodeRenderer() : null));
                super(context, false, nativeChannelMergerNode, channelMergerNodeRenderer);
            }
        };
    };

    const createChannelMergerNodeRendererFactory = (createNativeChannelMergerNode, getNativeAudioNode, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeAudioNodes = new WeakMap();
            const createAudioNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeAudioNode = getNativeAudioNode(proxy);
                // If the initially used nativeAudioNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeAudioNodeIsOwnedByContext = isOwnedByContext(nativeAudioNode, nativeOfflineAudioContext);
                if (!nativeAudioNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeAudioNode.channelCount,
                        channelCountMode: nativeAudioNode.channelCountMode,
                        channelInterpretation: nativeAudioNode.channelInterpretation,
                        numberOfInputs: nativeAudioNode.numberOfInputs
                    };
                    nativeAudioNode = createNativeChannelMergerNode(nativeOfflineAudioContext, options);
                }
                renderedNativeAudioNodes.set(nativeOfflineAudioContext, nativeAudioNode);
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeAudioNode, trace);
                return nativeAudioNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeAudioNode = renderedNativeAudioNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeAudioNode !== undefined) {
                        return Promise.resolve(renderedNativeAudioNode);
                    }
                    return createAudioNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const DEFAULT_OPTIONS$5 = {
        channelCount: 6,
        channelCountMode: 'explicit',
        channelInterpretation: 'discrete',
        numberOfOutputs: 6
    };
    const createChannelSplitterNodeConstructor = (audioNodeConstructor, createChannelSplitterNodeRenderer, createNativeChannelSplitterNode, getNativeContext, isNativeOfflineAudioContext, sanitizeChannelSplitterOptions) => {
        return class ChannelSplitterNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = sanitizeChannelSplitterOptions({ ...DEFAULT_OPTIONS$5, ...options });
                const nativeChannelSplitterNode = createNativeChannelSplitterNode(nativeContext, mergedOptions);
                const channelSplitterNodeRenderer = ((isNativeOfflineAudioContext(nativeContext) ? createChannelSplitterNodeRenderer() : null));
                super(context, false, nativeChannelSplitterNode, channelSplitterNodeRenderer);
            }
        };
    };

    const createChannelSplitterNodeRendererFactory = (createNativeChannelSplitterNode, getNativeAudioNode, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeAudioNodes = new WeakMap();
            const createAudioNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeAudioNode = getNativeAudioNode(proxy);
                // If the initially used nativeAudioNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeAudioNodeIsOwnedByContext = isOwnedByContext(nativeAudioNode, nativeOfflineAudioContext);
                if (!nativeAudioNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeAudioNode.channelCount,
                        channelCountMode: nativeAudioNode.channelCountMode,
                        channelInterpretation: nativeAudioNode.channelInterpretation,
                        numberOfOutputs: nativeAudioNode.numberOfOutputs
                    };
                    nativeAudioNode = createNativeChannelSplitterNode(nativeOfflineAudioContext, options);
                }
                renderedNativeAudioNodes.set(nativeOfflineAudioContext, nativeAudioNode);
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeAudioNode, trace);
                return nativeAudioNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeAudioNode = renderedNativeAudioNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeAudioNode !== undefined) {
                        return Promise.resolve(renderedNativeAudioNode);
                    }
                    return createAudioNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createConnectAudioParam = (renderInputsOfAudioParam) => {
        return (nativeOfflineAudioContext, audioParam, nativeAudioParam, trace) => {
            return renderInputsOfAudioParam(audioParam, nativeOfflineAudioContext, nativeAudioParam, trace);
        };
    };

    const createConnectedNativeAudioBufferSourceNodeFactory = (createNativeAudioBufferSourceNode) => {
        return (nativeContext, nativeAudioNode) => {
            const nativeAudioBufferSourceNode = createNativeAudioBufferSourceNode(nativeContext, {
                buffer: null,
                channelCount: 2,
                channelCountMode: 'max',
                channelInterpretation: 'speakers',
                loop: false,
                loopEnd: 0,
                loopStart: 0,
                playbackRate: 1
            });
            const nativeAudioBuffer = nativeContext.createBuffer(1, 2, 44100);
            nativeAudioBufferSourceNode.buffer = nativeAudioBuffer;
            nativeAudioBufferSourceNode.loop = true;
            nativeAudioBufferSourceNode.connect(nativeAudioNode);
            nativeAudioBufferSourceNode.start();
            return () => {
                nativeAudioBufferSourceNode.stop();
                nativeAudioBufferSourceNode.disconnect(nativeAudioNode);
            };
        };
    };

    const DEFAULT_OPTIONS$6 = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        offset: 1
    };
    const createConstantSourceNodeConstructor = (audioNodeConstructor, createAudioParam, createConstantSourceNodeRendererFactory, createNativeConstantSourceNode, getNativeContext, isNativeOfflineAudioContext, wrapEventListener) => {
        return class ConstantSourceNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$6, ...options };
                const nativeConstantSourceNode = createNativeConstantSourceNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const constantSourceNodeRenderer = ((isOffline ? createConstantSourceNodeRendererFactory() : null));
                super(context, false, nativeConstantSourceNode, constantSourceNodeRenderer);
                this._constantSourceNodeRenderer = constantSourceNodeRenderer;
                this._nativeConstantSourceNode = nativeConstantSourceNode;
                /*
                 * Bug #62 & #74: Safari does not support ConstantSourceNodes and does not export the correct values for maxValue and minValue
                 * for GainNodes.
                 */
                this._offset = createAudioParam(this, isOffline, nativeConstantSourceNode.offset, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                this._onended = null;
            }
            get offset() {
                return this._offset;
            }
            get onended() {
                return this._onended;
            }
            set onended(value) {
                const wrappedListener = typeof value === 'function' ? wrapEventListener(this, value) : null;
                this._nativeConstantSourceNode.onended = wrappedListener;
                const nativeOnEnded = this._nativeConstantSourceNode.onended;
                this._onended = nativeOnEnded !== null && nativeOnEnded === wrappedListener ? value : nativeOnEnded;
            }
            start(when = 0) {
                this._nativeConstantSourceNode.start(when);
                if (this._constantSourceNodeRenderer !== null) {
                    this._constantSourceNodeRenderer.start = when;
                }
                if (this.context.state !== 'closed') {
                    setInternalStateToActive(this);
                    const resetInternalStateToPassive = () => {
                        this._nativeConstantSourceNode.removeEventListener('ended', resetInternalStateToPassive);
                        if (isActiveAudioNode(this)) {
                            setInternalStateToPassive(this);
                        }
                    };
                    this._nativeConstantSourceNode.addEventListener('ended', resetInternalStateToPassive);
                }
            }
            stop(when = 0) {
                this._nativeConstantSourceNode.stop(when);
                if (this._constantSourceNodeRenderer !== null) {
                    this._constantSourceNodeRenderer.stop = when;
                }
            }
        };
    };

    const createConstantSourceNodeRendererFactory = (connectAudioParam, createNativeConstantSourceNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeConstantSourceNodes = new WeakMap();
            let start = null;
            let stop = null;
            const createConstantSourceNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeConstantSourceNode = getNativeAudioNode(proxy);
                /*
                 * If the initially used nativeConstantSourceNode was not constructed on the same OfflineAudioContext it needs to be created
                 * again.
                 */
                const nativeConstantSourceNodeIsOwnedByContext = isOwnedByContext(nativeConstantSourceNode, nativeOfflineAudioContext);
                if (!nativeConstantSourceNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeConstantSourceNode.channelCount,
                        channelCountMode: nativeConstantSourceNode.channelCountMode,
                        channelInterpretation: nativeConstantSourceNode.channelInterpretation,
                        offset: nativeConstantSourceNode.offset.value
                    };
                    nativeConstantSourceNode = createNativeConstantSourceNode(nativeOfflineAudioContext, options);
                    if (start !== null) {
                        nativeConstantSourceNode.start(start);
                    }
                    if (stop !== null) {
                        nativeConstantSourceNode.stop(stop);
                    }
                }
                renderedNativeConstantSourceNodes.set(nativeOfflineAudioContext, nativeConstantSourceNode);
                if (!nativeConstantSourceNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.offset, nativeConstantSourceNode.offset, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.offset, nativeConstantSourceNode.offset, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeConstantSourceNode, trace);
                return nativeConstantSourceNode;
            };
            return {
                set start(value) {
                    start = value;
                },
                set stop(value) {
                    stop = value;
                },
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeConstantSourceNode = renderedNativeConstantSourceNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeConstantSourceNode !== undefined) {
                        return Promise.resolve(renderedNativeConstantSourceNode);
                    }
                    return createConstantSourceNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createConvertNumberToUnsignedLong = (unit32Array) => {
        return (value) => {
            unit32Array[0] = value;
            return unit32Array[0];
        };
    };

    const DEFAULT_OPTIONS$7 = {
        buffer: null,
        channelCount: 2,
        channelCountMode: 'clamped-max',
        channelInterpretation: 'speakers',
        disableNormalization: false
    };
    const createConvolverNodeConstructor = (audioNodeConstructor, createConvolverNodeRenderer, createNativeConvolverNode, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class ConvolverNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$7, ...options };
                const nativeConvolverNode = createNativeConvolverNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const convolverNodeRenderer = (isOffline ? createConvolverNodeRenderer() : null);
                super(context, false, nativeConvolverNode, convolverNodeRenderer);
                this._isBufferNullified = false;
                this._nativeConvolverNode = nativeConvolverNode;
                if (mergedOptions.buffer !== null) {
                    setAudioNodeTailTime(this, mergedOptions.buffer.duration);
                }
            }
            get buffer() {
                if (this._isBufferNullified) {
                    return null;
                }
                return this._nativeConvolverNode.buffer;
            }
            set buffer(value) {
                this._nativeConvolverNode.buffer = value;
                // Bug #115: Safari does not allow to set the buffer to null.
                if (value === null && this._nativeConvolverNode.buffer !== null) {
                    const nativeContext = this._nativeConvolverNode.context;
                    this._nativeConvolverNode.buffer = nativeContext.createBuffer(1, 1, 44100);
                    this._isBufferNullified = true;
                    setAudioNodeTailTime(this, 0);
                }
                else {
                    this._isBufferNullified = false;
                    setAudioNodeTailTime(this, this._nativeConvolverNode.buffer === null ? 0 : this._nativeConvolverNode.buffer.duration);
                }
            }
            get normalize() {
                return this._nativeConvolverNode.normalize;
            }
            set normalize(value) {
                this._nativeConvolverNode.normalize = value;
            }
        };
    };

    const createConvolverNodeRendererFactory = (createNativeConvolverNode, getNativeAudioNode, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeConvolverNodes = new WeakMap();
            const createConvolverNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeConvolverNode = getNativeAudioNode(proxy);
                // If the initially used nativeConvolverNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeConvolverNodeIsOwnedByContext = isOwnedByContext(nativeConvolverNode, nativeOfflineAudioContext);
                if (!nativeConvolverNodeIsOwnedByContext) {
                    const options = {
                        buffer: nativeConvolverNode.buffer,
                        channelCount: nativeConvolverNode.channelCount,
                        channelCountMode: nativeConvolverNode.channelCountMode,
                        channelInterpretation: nativeConvolverNode.channelInterpretation,
                        disableNormalization: !nativeConvolverNode.normalize
                    };
                    nativeConvolverNode = createNativeConvolverNode(nativeOfflineAudioContext, options);
                }
                renderedNativeConvolverNodes.set(nativeOfflineAudioContext, nativeConvolverNode);
                if (isNativeAudioNodeFaker(nativeConvolverNode)) {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeConvolverNode.inputs[0], trace);
                }
                else {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeConvolverNode, trace);
                }
                return nativeConvolverNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeConvolverNode = renderedNativeConvolverNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeConvolverNode !== undefined) {
                        return Promise.resolve(renderedNativeConvolverNode);
                    }
                    return createConvolverNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createDataCloneError = () => new DOMException('', 'DataCloneError');

    const detachArrayBuffer = (arrayBuffer) => {
        const { port1, port2 } = new MessageChannel();
        return new Promise((resolve) => {
            port2.onmessage = () => {
                port1.close();
                port2.close();
                resolve();
            };
            port1.postMessage(arrayBuffer, [arrayBuffer]);
        });
    };

    const createDecodeAudioData = (audioBufferStore, cacheTestResult, createDataCloneError, createEncodingError, detachedArrayBuffers, getNativeContext, isNativeContext, testAudioBufferCopyChannelMethodsOutOfBoundsSupport, testPromiseSupport, wrapAudioBufferCopyChannelMethods, wrapAudioBufferCopyChannelMethodsOutOfBounds) => {
        return (anyContext, audioData) => {
            const nativeContext = isNativeContext(anyContext) ? anyContext : getNativeContext(anyContext);
            // Bug #43: Only Chrome, Edge and Opera do throw a DataCloneError.
            if (detachedArrayBuffers.has(audioData)) {
                const err = createDataCloneError();
                return Promise.reject(err);
            }
            // The audioData parameter maybe of a type which can't be added to a WeakSet.
            try {
                detachedArrayBuffers.add(audioData);
            }
            catch {
                // Ignore errors.
            }
            // Bug #21: Safari does not support promises yet.
            if (cacheTestResult(testPromiseSupport, () => testPromiseSupport(nativeContext))) {
                return nativeContext.decodeAudioData(audioData).then((audioBuffer) => {
                    // Bug #157: Firefox does not allow the bufferOffset to be out-of-bounds.
                    if (!cacheTestResult(testAudioBufferCopyChannelMethodsOutOfBoundsSupport, () => testAudioBufferCopyChannelMethodsOutOfBoundsSupport(audioBuffer))) {
                        wrapAudioBufferCopyChannelMethodsOutOfBounds(audioBuffer);
                    }
                    audioBufferStore.add(audioBuffer);
                    return audioBuffer;
                });
            }
            // Bug #21: Safari does not return a Promise yet.
            return new Promise((resolve, reject) => {
                const complete = async () => {
                    // Bug #133: Safari does neuter the ArrayBuffer.
                    try {
                        await detachArrayBuffer(audioData);
                    }
                    catch {
                        // Ignore errors.
                    }
                };
                const fail = (err) => {
                    reject(err);
                    complete();
                };
                // Bug #26: Safari throws a synchronous error.
                try {
                    // Bug #1: Safari requires a successCallback.
                    nativeContext.decodeAudioData(audioData, (audioBuffer) => {
                        // Bug #5: Safari does not support copyFromChannel() and copyToChannel().
                        // Bug #100: Safari does throw a wrong error when calling getChannelData() with an out-of-bounds value.
                        if (typeof audioBuffer.copyFromChannel !== 'function') {
                            wrapAudioBufferCopyChannelMethods(audioBuffer);
                            wrapAudioBufferGetChannelDataMethod(audioBuffer);
                        }
                        audioBufferStore.add(audioBuffer);
                        complete().then(() => resolve(audioBuffer));
                    }, (err) => {
                        // Bug #4: Safari returns null instead of an error.
                        if (err === null) {
                            fail(createEncodingError());
                        }
                        else {
                            fail(err);
                        }
                    });
                }
                catch (err) {
                    fail(err);
                }
            });
        };
    };

    const createDecrementCycleCounter = (connectNativeAudioNodeToNativeAudioNode, cycleCounters, getAudioNodeConnections, getNativeAudioNode, getNativeAudioParam, getNativeContext, isActiveAudioNode, isNativeOfflineAudioContext) => {
        return (audioNode, count) => {
            const cycleCounter = cycleCounters.get(audioNode);
            if (cycleCounter === undefined) {
                throw new Error('Missing the expected cycle count.');
            }
            const nativeContext = getNativeContext(audioNode.context);
            const isOffline = isNativeOfflineAudioContext(nativeContext);
            if (cycleCounter === count) {
                cycleCounters.delete(audioNode);
                if (!isOffline && isActiveAudioNode(audioNode)) {
                    const nativeSourceAudioNode = getNativeAudioNode(audioNode);
                    const { outputs } = getAudioNodeConnections(audioNode);
                    for (const output of outputs) {
                        if (isAudioNodeOutputConnection(output)) {
                            const nativeDestinationAudioNode = getNativeAudioNode(output[0]);
                            connectNativeAudioNodeToNativeAudioNode(nativeSourceAudioNode, nativeDestinationAudioNode, output[1], output[2]);
                        }
                        else {
                            const nativeDestinationAudioParam = getNativeAudioParam(output[0]);
                            nativeSourceAudioNode.connect(nativeDestinationAudioParam, output[1]);
                        }
                    }
                }
            }
            else {
                cycleCounters.set(audioNode, cycleCounter - count);
            }
        };
    };

    const DEFAULT_OPTIONS$8 = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        delayTime: 0,
        maxDelayTime: 1
    };
    const createDelayNodeConstructor = (audioNodeConstructor, createAudioParam, createDelayNodeRenderer, createNativeDelayNode, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class DelayNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$8, ...options };
                const nativeDelayNode = createNativeDelayNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const delayNodeRenderer = (isOffline ? createDelayNodeRenderer(mergedOptions.maxDelayTime) : null);
                super(context, false, nativeDelayNode, delayNodeRenderer);
                this._delayTime = createAudioParam(this, isOffline, nativeDelayNode.delayTime);
                setAudioNodeTailTime(this, mergedOptions.maxDelayTime);
            }
            get delayTime() {
                return this._delayTime;
            }
        };
    };

    const createDelayNodeRendererFactory = (connectAudioParam, createNativeDelayNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return (maxDelayTime) => {
            const renderedNativeDelayNodes = new WeakMap();
            const createDelayNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeDelayNode = getNativeAudioNode(proxy);
                // If the initially used nativeDelayNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeDelayNodeIsOwnedByContext = isOwnedByContext(nativeDelayNode, nativeOfflineAudioContext);
                if (!nativeDelayNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeDelayNode.channelCount,
                        channelCountMode: nativeDelayNode.channelCountMode,
                        channelInterpretation: nativeDelayNode.channelInterpretation,
                        delayTime: nativeDelayNode.delayTime.value,
                        maxDelayTime
                    };
                    nativeDelayNode = createNativeDelayNode(nativeOfflineAudioContext, options);
                }
                renderedNativeDelayNodes.set(nativeOfflineAudioContext, nativeDelayNode);
                if (!nativeDelayNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.delayTime, nativeDelayNode.delayTime, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.delayTime, nativeDelayNode.delayTime, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeDelayNode, trace);
                return nativeDelayNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeDelayNode = renderedNativeDelayNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeDelayNode !== undefined) {
                        return Promise.resolve(renderedNativeDelayNode);
                    }
                    return createDelayNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createDeleteActiveInputConnectionToAudioNode = (pickElementFromSet) => {
        return (activeInputs, source, output, input) => {
            return pickElementFromSet(activeInputs[input], (activeInputConnection) => activeInputConnection[0] === source && activeInputConnection[1] === output);
        };
    };

    const isDelayNode = (audioNode) => {
        return 'delayTime' in audioNode;
    };

    const createDetectCycles = (audioParamAudioNodeStore, getAudioNodeConnections, getValueForKey) => {
        return function detectCycles(chain, nextLink) {
            const audioNode = isAudioNode(nextLink) ? nextLink : getValueForKey(audioParamAudioNodeStore, nextLink);
            if (isDelayNode(audioNode)) {
                return [];
            }
            if (chain[0] === audioNode) {
                return [chain];
            }
            if (chain.includes(audioNode)) {
                return [];
            }
            const { outputs } = getAudioNodeConnections(audioNode);
            return Array.from(outputs)
                .map((outputConnection) => detectCycles([...chain, audioNode], outputConnection[0]))
                .reduce((mergedCycles, nestedCycles) => mergedCycles.concat(nestedCycles), []);
        };
    };

    const DEFAULT_OPTIONS$9 = {
        attack: 0.003,
        channelCount: 2,
        channelCountMode: 'clamped-max',
        channelInterpretation: 'speakers',
        knee: 30,
        ratio: 12,
        release: 0.25,
        threshold: -24
    };
    const createDynamicsCompressorNodeConstructor = (audioNodeConstructor, createAudioParam, createDynamicsCompressorNodeRenderer, createNativeDynamicsCompressorNode, createNotSupportedError, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class DynamicsCompressorNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$9, ...options };
                const nativeDynamicsCompressorNode = createNativeDynamicsCompressorNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const dynamicsCompressorNodeRenderer = (isOffline ? createDynamicsCompressorNodeRenderer() : null);
                super(context, false, nativeDynamicsCompressorNode, dynamicsCompressorNodeRenderer);
                this._attack = createAudioParam(this, isOffline, nativeDynamicsCompressorNode.attack);
                this._knee = createAudioParam(this, isOffline, nativeDynamicsCompressorNode.knee);
                this._nativeDynamicsCompressorNode = nativeDynamicsCompressorNode;
                this._ratio = createAudioParam(this, isOffline, nativeDynamicsCompressorNode.ratio);
                this._release = createAudioParam(this, isOffline, nativeDynamicsCompressorNode.release);
                this._threshold = createAudioParam(this, isOffline, nativeDynamicsCompressorNode.threshold);
                setAudioNodeTailTime(this, 0.006);
            }
            get attack() {
                return this._attack;
            }
            // Bug #108: Safari allows a channelCount of three and above which is why the getter and setter needs to be overwritten here.
            get channelCount() {
                return this._nativeDynamicsCompressorNode.channelCount;
            }
            set channelCount(value) {
                const previousChannelCount = this._nativeDynamicsCompressorNode.channelCount;
                this._nativeDynamicsCompressorNode.channelCount = value;
                if (value > 2) {
                    this._nativeDynamicsCompressorNode.channelCount = previousChannelCount;
                    throw createNotSupportedError();
                }
            }
            /*
             * Bug #109: Only Chrome, Firefox and Opera disallow a channelCountMode of 'max' yet which is why the getter and setter needs to be
             * overwritten here.
             */
            get channelCountMode() {
                return this._nativeDynamicsCompressorNode.channelCountMode;
            }
            set channelCountMode(value) {
                const previousChannelCount = this._nativeDynamicsCompressorNode.channelCountMode;
                this._nativeDynamicsCompressorNode.channelCountMode = value;
                if (value === 'max') {
                    this._nativeDynamicsCompressorNode.channelCountMode = previousChannelCount;
                    throw createNotSupportedError();
                }
            }
            get knee() {
                return this._knee;
            }
            get ratio() {
                return this._ratio;
            }
            get reduction() {
                // Bug #111: Safari returns an AudioParam instead of a number.
                if (typeof this._nativeDynamicsCompressorNode.reduction.value === 'number') {
                    return this._nativeDynamicsCompressorNode.reduction.value;
                }
                return this._nativeDynamicsCompressorNode.reduction;
            }
            get release() {
                return this._release;
            }
            get threshold() {
                return this._threshold;
            }
        };
    };

    const createDynamicsCompressorNodeRendererFactory = (connectAudioParam, createNativeDynamicsCompressorNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeDynamicsCompressorNodes = new WeakMap();
            const createDynamicsCompressorNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeDynamicsCompressorNode = getNativeAudioNode(proxy);
                /*
                 * If the initially used nativeDynamicsCompressorNode was not constructed on the same OfflineAudioContext it needs to be
                 * created again.
                 */
                const nativeDynamicsCompressorNodeIsOwnedByContext = isOwnedByContext(nativeDynamicsCompressorNode, nativeOfflineAudioContext);
                if (!nativeDynamicsCompressorNodeIsOwnedByContext) {
                    const options = {
                        attack: nativeDynamicsCompressorNode.attack.value,
                        channelCount: nativeDynamicsCompressorNode.channelCount,
                        channelCountMode: nativeDynamicsCompressorNode.channelCountMode,
                        channelInterpretation: nativeDynamicsCompressorNode.channelInterpretation,
                        knee: nativeDynamicsCompressorNode.knee.value,
                        ratio: nativeDynamicsCompressorNode.ratio.value,
                        release: nativeDynamicsCompressorNode.release.value,
                        threshold: nativeDynamicsCompressorNode.threshold.value
                    };
                    nativeDynamicsCompressorNode = createNativeDynamicsCompressorNode(nativeOfflineAudioContext, options);
                }
                renderedNativeDynamicsCompressorNodes.set(nativeOfflineAudioContext, nativeDynamicsCompressorNode);
                if (!nativeDynamicsCompressorNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.attack, nativeDynamicsCompressorNode.attack, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.knee, nativeDynamicsCompressorNode.knee, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.ratio, nativeDynamicsCompressorNode.ratio, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.release, nativeDynamicsCompressorNode.release, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.threshold, nativeDynamicsCompressorNode.threshold, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.attack, nativeDynamicsCompressorNode.attack, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.knee, nativeDynamicsCompressorNode.knee, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.ratio, nativeDynamicsCompressorNode.ratio, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.release, nativeDynamicsCompressorNode.release, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.threshold, nativeDynamicsCompressorNode.threshold, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeDynamicsCompressorNode, trace);
                return nativeDynamicsCompressorNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeDynamicsCompressorNode = renderedNativeDynamicsCompressorNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeDynamicsCompressorNode !== undefined) {
                        return Promise.resolve(renderedNativeDynamicsCompressorNode);
                    }
                    return createDynamicsCompressorNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createEncodingError = () => new DOMException('', 'EncodingError');

    const createEvaluateSource = (window) => {
        return (source) => new Promise((resolve, reject) => {
            if (window === null) {
                // Bug #182 Chrome, Edge and Opera do throw an instance of a SyntaxError instead of a DOMException.
                reject(new SyntaxError());
                return;
            }
            const head = window.document.head;
            if (head === null) {
                // Bug #182 Chrome, Edge and Opera do throw an instance of a SyntaxError instead of a DOMException.
                reject(new SyntaxError());
            }
            else {
                const script = window.document.createElement('script');
                // @todo Safari doesn't like URLs with a type of 'application/javascript; charset=utf-8'.
                const blob = new Blob([source], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                const originalOnErrorHandler = window.onerror;
                const removeErrorEventListenerAndRevokeUrl = () => {
                    window.onerror = originalOnErrorHandler;
                    URL.revokeObjectURL(url);
                };
                window.onerror = (message, src, lineno, colno, error) => {
                    // @todo Edge thinks the source is the one of the html document.
                    if (src === url || (src === window.location.href && lineno === 1 && colno === 1)) {
                        removeErrorEventListenerAndRevokeUrl();
                        reject(error);
                        return false;
                    }
                    if (originalOnErrorHandler !== null) {
                        return originalOnErrorHandler(message, src, lineno, colno, error);
                    }
                };
                script.onerror = () => {
                    removeErrorEventListenerAndRevokeUrl();
                    // Bug #182 Chrome, Edge and Opera do throw an instance of a SyntaxError instead of a DOMException.
                    reject(new SyntaxError());
                };
                script.onload = () => {
                    removeErrorEventListenerAndRevokeUrl();
                    resolve();
                };
                script.src = url;
                script.type = 'module';
                head.appendChild(script);
            }
        });
    };

    const createEventTargetConstructor = (wrapEventListener) => {
        return class EventTarget {
            constructor(_nativeEventTarget) {
                this._nativeEventTarget = _nativeEventTarget;
                this._listeners = new WeakMap();
            }
            addEventListener(type, listener, options) {
                if (listener !== null) {
                    let wrappedEventListener = this._listeners.get(listener);
                    if (wrappedEventListener === undefined) {
                        wrappedEventListener = wrapEventListener(this, listener);
                        if (typeof listener === 'function') {
                            this._listeners.set(listener, wrappedEventListener);
                        }
                    }
                    this._nativeEventTarget.addEventListener(type, wrappedEventListener, options);
                }
            }
            dispatchEvent(event) {
                return this._nativeEventTarget.dispatchEvent(event);
            }
            removeEventListener(type, listener, options) {
                const wrappedEventListener = listener === null ? undefined : this._listeners.get(listener);
                this._nativeEventTarget.removeEventListener(type, wrappedEventListener === undefined ? null : wrappedEventListener, options);
            }
        };
    };

    const createExposeCurrentFrameAndCurrentTime = (window) => {
        return (currentTime, sampleRate, fn) => {
            Object.defineProperties(window, {
                currentFrame: {
                    configurable: true,
                    get() {
                        return Math.round(currentTime * sampleRate);
                    }
                },
                currentTime: {
                    configurable: true,
                    get() {
                        return currentTime;
                    }
                }
            });
            try {
                return fn();
            }
            finally {
                if (window !== null) {
                    delete window.currentFrame;
                    delete window.currentTime;
                }
            }
        };
    };

    const createFetchSource = (createAbortError) => {
        return async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return [await response.text(), response.url];
                }
            }
            catch {
                // Ignore errors.
            } // tslint:disable-line:no-empty
            throw createAbortError();
        };
    };

    const DEFAULT_OPTIONS$a = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        gain: 1
    };
    const createGainNodeConstructor = (audioNodeConstructor, createAudioParam, createGainNodeRenderer, createNativeGainNode, getNativeContext, isNativeOfflineAudioContext) => {
        return class GainNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$a, ...options };
                const nativeGainNode = createNativeGainNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const gainNodeRenderer = (isOffline ? createGainNodeRenderer() : null);
                super(context, false, nativeGainNode, gainNodeRenderer);
                // Bug #74: Safari does not export the correct values for maxValue and minValue.
                this._gain = createAudioParam(this, isOffline, nativeGainNode.gain, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
            }
            get gain() {
                return this._gain;
            }
        };
    };

    const createGainNodeRendererFactory = (connectAudioParam, createNativeGainNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeGainNodes = new WeakMap();
            const createGainNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeGainNode = getNativeAudioNode(proxy);
                // If the initially used nativeGainNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeGainNodeIsOwnedByContext = isOwnedByContext(nativeGainNode, nativeOfflineAudioContext);
                if (!nativeGainNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeGainNode.channelCount,
                        channelCountMode: nativeGainNode.channelCountMode,
                        channelInterpretation: nativeGainNode.channelInterpretation,
                        gain: nativeGainNode.gain.value
                    };
                    nativeGainNode = createNativeGainNode(nativeOfflineAudioContext, options);
                }
                renderedNativeGainNodes.set(nativeOfflineAudioContext, nativeGainNode);
                if (!nativeGainNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.gain, nativeGainNode.gain, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.gain, nativeGainNode.gain, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeGainNode, trace);
                return nativeGainNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeGainNode = renderedNativeGainNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeGainNode !== undefined) {
                        return Promise.resolve(renderedNativeGainNode);
                    }
                    return createGainNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createGetAudioNodeRenderer = (getAudioNodeConnections) => {
        return (audioNode) => {
            const audioNodeConnections = getAudioNodeConnections(audioNode);
            if (audioNodeConnections.renderer === null) {
                throw new Error('Missing the renderer of the given AudioNode in the audio graph.');
            }
            return audioNodeConnections.renderer;
        };
    };

    const createGetAudioNodeTailTime = (audioNodeTailTimeStore) => {
        return (audioNode) => { var _a; return (_a = audioNodeTailTimeStore.get(audioNode)) !== null && _a !== void 0 ? _a : 0; };
    };

    const createGetAudioParamRenderer = (getAudioParamConnections) => {
        return (audioParam) => {
            const audioParamConnections = getAudioParamConnections(audioParam);
            if (audioParamConnections.renderer === null) {
                throw new Error('Missing the renderer of the given AudioParam in the audio graph.');
            }
            return audioParamConnections.renderer;
        };
    };

    const createInvalidStateError = () => new DOMException('', 'InvalidStateError');

    const createGetNativeContext = (contextStore) => {
        return (context) => {
            const nativeContext = contextStore.get(context);
            if (nativeContext === undefined) {
                throw createInvalidStateError();
            }
            return (nativeContext);
        };
    };

    const createGetOrCreateBackupOfflineAudioContext = (backupOfflineAudioContextStore, nativeOfflineAudioContextConstructor) => {
        return (nativeContext) => {
            let backupOfflineAudioContext = backupOfflineAudioContextStore.get(nativeContext);
            if (backupOfflineAudioContext !== undefined) {
                return backupOfflineAudioContext;
            }
            if (nativeOfflineAudioContextConstructor === null) {
                throw new Error('Missing the native OfflineAudioContext constructor.');
            }
            backupOfflineAudioContext = new nativeOfflineAudioContextConstructor(1, 1, 8000);
            backupOfflineAudioContextStore.set(nativeContext, backupOfflineAudioContext);
            return backupOfflineAudioContext;
        };
    };

    const createInvalidAccessError = () => new DOMException('', 'InvalidAccessError');

    const wrapIIRFilterNodeGetFrequencyResponseMethod = (nativeIIRFilterNode) => {
        nativeIIRFilterNode.getFrequencyResponse = ((getFrequencyResponse) => {
            return (frequencyHz, magResponse, phaseResponse) => {
                if (frequencyHz.length !== magResponse.length || magResponse.length !== phaseResponse.length) {
                    throw createInvalidAccessError();
                }
                return getFrequencyResponse.call(nativeIIRFilterNode, frequencyHz, magResponse, phaseResponse);
            };
        })(nativeIIRFilterNode.getFrequencyResponse);
    };

    const DEFAULT_OPTIONS$b = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers'
    };
    const createIIRFilterNodeConstructor = (audioNodeConstructor, createNativeIIRFilterNode, createIIRFilterNodeRenderer, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class IIRFilterNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const mergedOptions = { ...DEFAULT_OPTIONS$b, ...options };
                const nativeIIRFilterNode = createNativeIIRFilterNode(nativeContext, isOffline ? null : context.baseLatency, mergedOptions);
                const iirFilterNodeRenderer = ((isOffline ? createIIRFilterNodeRenderer(mergedOptions.feedback, mergedOptions.feedforward) : null));
                super(context, false, nativeIIRFilterNode, iirFilterNodeRenderer);
                // Bug #23 & #24: FirefoxDeveloper does not throw an InvalidAccessError.
                // @todo Write a test which allows other browsers to remain unpatched.
                wrapIIRFilterNodeGetFrequencyResponseMethod(nativeIIRFilterNode);
                this._nativeIIRFilterNode = nativeIIRFilterNode;
                // @todo Determine a meaningful tail-time instead of just using one second.
                setAudioNodeTailTime(this, 1);
            }
            getFrequencyResponse(frequencyHz, magResponse, phaseResponse) {
                return this._nativeIIRFilterNode.getFrequencyResponse(frequencyHz, magResponse, phaseResponse);
            }
        };
    };

    // This implementation as shamelessly inspired by source code of
    // tslint:disable-next-line:max-line-length
    // {@link https://chromium.googlesource.com/chromium/src.git/+/master/third_party/WebKit/Source/platform/audio/IIRFilter.cpp|Chromium's IIRFilter}.
    const filterBuffer = (feedback, feedbackLength, feedforward, feedforwardLength, minLength, xBuffer, yBuffer, bufferIndex, bufferLength, input, output) => {
        const inputLength = input.length;
        let i = bufferIndex;
        for (let j = 0; j < inputLength; j += 1) {
            let y = feedforward[0] * input[j];
            for (let k = 1; k < minLength; k += 1) {
                const x = (i - k) & (bufferLength - 1); // tslint:disable-line:no-bitwise
                y += feedforward[k] * xBuffer[x];
                y -= feedback[k] * yBuffer[x];
            }
            for (let k = minLength; k < feedforwardLength; k += 1) {
                y += feedforward[k] * xBuffer[(i - k) & (bufferLength - 1)]; // tslint:disable-line:no-bitwise
            }
            for (let k = minLength; k < feedbackLength; k += 1) {
                y -= feedback[k] * yBuffer[(i - k) & (bufferLength - 1)]; // tslint:disable-line:no-bitwise
            }
            xBuffer[i] = input[j];
            yBuffer[i] = y;
            i = (i + 1) & (bufferLength - 1); // tslint:disable-line:no-bitwise
            output[j] = y;
        }
        return i;
    };

    const filterFullBuffer = (renderedBuffer, nativeOfflineAudioContext, feedback, feedforward) => {
        const convertedFeedback = feedback instanceof Float64Array ? feedback : new Float64Array(feedback);
        const convertedFeedforward = feedforward instanceof Float64Array ? feedforward : new Float64Array(feedforward);
        const feedbackLength = convertedFeedback.length;
        const feedforwardLength = convertedFeedforward.length;
        const minLength = Math.min(feedbackLength, feedforwardLength);
        if (convertedFeedback[0] !== 1) {
            for (let i = 0; i < feedbackLength; i += 1) {
                convertedFeedforward[i] /= convertedFeedback[0];
            }
            for (let i = 1; i < feedforwardLength; i += 1) {
                convertedFeedback[i] /= convertedFeedback[0];
            }
        }
        const bufferLength = 32;
        const xBuffer = new Float32Array(bufferLength);
        const yBuffer = new Float32Array(bufferLength);
        const filteredBuffer = nativeOfflineAudioContext.createBuffer(renderedBuffer.numberOfChannels, renderedBuffer.length, renderedBuffer.sampleRate);
        const numberOfChannels = renderedBuffer.numberOfChannels;
        for (let i = 0; i < numberOfChannels; i += 1) {
            const input = renderedBuffer.getChannelData(i);
            const output = filteredBuffer.getChannelData(i);
            xBuffer.fill(0);
            yBuffer.fill(0);
            filterBuffer(convertedFeedback, feedbackLength, convertedFeedforward, feedforwardLength, minLength, xBuffer, yBuffer, 0, bufferLength, input, output);
        }
        return filteredBuffer;
    };
    const createIIRFilterNodeRendererFactory = (createNativeAudioBufferSourceNode, getNativeAudioNode, nativeOfflineAudioContextConstructor, renderInputsOfAudioNode, renderNativeOfflineAudioContext) => {
        return (feedback, feedforward) => {
            const renderedNativeAudioNodes = new WeakMap();
            let filteredBufferPromise = null;
            const createAudioNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeAudioBufferSourceNode = null;
                let nativeIIRFilterNode = getNativeAudioNode(proxy);
                // If the initially used nativeIIRFilterNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeIIRFilterNodeIsOwnedByContext = isOwnedByContext(nativeIIRFilterNode, nativeOfflineAudioContext);
                // Bug #9: Safari does not support IIRFilterNodes.
                if (nativeOfflineAudioContext.createIIRFilter === undefined) {
                    nativeAudioBufferSourceNode = createNativeAudioBufferSourceNode(nativeOfflineAudioContext, {
                        buffer: null,
                        channelCount: 2,
                        channelCountMode: 'max',
                        channelInterpretation: 'speakers',
                        loop: false,
                        loopEnd: 0,
                        loopStart: 0,
                        playbackRate: 1
                    });
                }
                else if (!nativeIIRFilterNodeIsOwnedByContext) {
                    // @todo TypeScript defines the parameters of createIIRFilter() as arrays of numbers.
                    nativeIIRFilterNode = nativeOfflineAudioContext.createIIRFilter(feedforward, feedback);
                }
                renderedNativeAudioNodes.set(nativeOfflineAudioContext, nativeAudioBufferSourceNode === null ? nativeIIRFilterNode : nativeAudioBufferSourceNode);
                if (nativeAudioBufferSourceNode !== null) {
                    if (filteredBufferPromise === null) {
                        if (nativeOfflineAudioContextConstructor === null) {
                            throw new Error('Missing the native OfflineAudioContext constructor.');
                        }
                        const partialOfflineAudioContext = new nativeOfflineAudioContextConstructor(
                        // Bug #47: The AudioDestinationNode in Safari gets not initialized correctly.
                        proxy.context.destination.channelCount, 
                        // Bug #17: Safari does not yet expose the length.
                        proxy.context.length, nativeOfflineAudioContext.sampleRate);
                        filteredBufferPromise = (async () => {
                            await renderInputsOfAudioNode(proxy, partialOfflineAudioContext, partialOfflineAudioContext.destination, trace);
                            const renderedBuffer = await renderNativeOfflineAudioContext(partialOfflineAudioContext);
                            return filterFullBuffer(renderedBuffer, nativeOfflineAudioContext, feedback, feedforward);
                        })();
                    }
                    const filteredBuffer = await filteredBufferPromise;
                    nativeAudioBufferSourceNode.buffer = filteredBuffer;
                    nativeAudioBufferSourceNode.start(0);
                    return nativeAudioBufferSourceNode;
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeIIRFilterNode, trace);
                return nativeIIRFilterNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeAudioNode = renderedNativeAudioNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeAudioNode !== undefined) {
                        return Promise.resolve(renderedNativeAudioNode);
                    }
                    return createAudioNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createIncrementCycleCounterFactory = (cycleCounters, disconnectNativeAudioNodeFromNativeAudioNode, getAudioNodeConnections, getNativeAudioNode, getNativeAudioParam, isActiveAudioNode) => {
        return (isOffline) => {
            return (audioNode, count) => {
                const cycleCounter = cycleCounters.get(audioNode);
                if (cycleCounter === undefined) {
                    if (!isOffline && isActiveAudioNode(audioNode)) {
                        const nativeSourceAudioNode = getNativeAudioNode(audioNode);
                        const { outputs } = getAudioNodeConnections(audioNode);
                        for (const output of outputs) {
                            if (isAudioNodeOutputConnection(output)) {
                                const nativeDestinationAudioNode = getNativeAudioNode(output[0]);
                                disconnectNativeAudioNodeFromNativeAudioNode(nativeSourceAudioNode, nativeDestinationAudioNode, output[1], output[2]);
                            }
                            else {
                                const nativeDestinationAudioParam = getNativeAudioParam(output[0]);
                                nativeSourceAudioNode.disconnect(nativeDestinationAudioParam, output[1]);
                            }
                        }
                    }
                    cycleCounters.set(audioNode, count);
                }
                else {
                    cycleCounters.set(audioNode, cycleCounter + count);
                }
            };
        };
    };

    const createIsNativeAudioContext = (nativeAudioContextConstructor) => {
        return (anything) => {
            return nativeAudioContextConstructor !== null && anything instanceof nativeAudioContextConstructor;
        };
    };

    const createIsNativeAudioNode = (window) => {
        return (anything) => {
            return window !== null && typeof window.AudioNode === 'function' && anything instanceof window.AudioNode;
        };
    };

    const createIsNativeAudioParam = (window) => {
        return (anything) => {
            return window !== null && typeof window.AudioParam === 'function' && anything instanceof window.AudioParam;
        };
    };

    const createIsNativeContext = (isNativeAudioContext, isNativeOfflineAudioContext) => {
        return (anything) => {
            return isNativeAudioContext(anything) || isNativeOfflineAudioContext(anything);
        };
    };

    const createIsNativeOfflineAudioContext = (nativeOfflineAudioContextConstructor) => {
        return (anything) => {
            return nativeOfflineAudioContextConstructor !== null && anything instanceof nativeOfflineAudioContextConstructor;
        };
    };

    const createIsSecureContext = (window) => window !== null && window.isSecureContext;

    const createMediaElementAudioSourceNodeConstructor = (audioNodeConstructor, createNativeMediaElementAudioSourceNode, getNativeContext, isNativeOfflineAudioContext) => {
        return class MediaElementAudioSourceNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const nativeMediaElementAudioSourceNode = createNativeMediaElementAudioSourceNode(nativeContext, options);
                // Bug #171: Safari allows to create a MediaElementAudioSourceNode with an OfflineAudioContext.
                if (isNativeOfflineAudioContext(nativeContext)) {
                    throw TypeError();
                }
                super(context, true, nativeMediaElementAudioSourceNode, null);
                this._nativeMediaElementAudioSourceNode = nativeMediaElementAudioSourceNode;
            }
            get mediaElement() {
                return this._nativeMediaElementAudioSourceNode.mediaElement;
            }
        };
    };

    const DEFAULT_OPTIONS$c = {
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers'
    };
    const createMediaStreamAudioDestinationNodeConstructor = (audioNodeConstructor, createNativeMediaStreamAudioDestinationNode, getNativeContext, isNativeOfflineAudioContext) => {
        return class MediaStreamAudioDestinationNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                // Bug #173: Safari allows to create a MediaStreamAudioDestinationNode with an OfflineAudioContext.
                if (isNativeOfflineAudioContext(nativeContext)) {
                    throw new TypeError();
                }
                const mergedOptions = { ...DEFAULT_OPTIONS$c, ...options };
                const nativeMediaStreamAudioDestinationNode = createNativeMediaStreamAudioDestinationNode(nativeContext, mergedOptions);
                super(context, false, nativeMediaStreamAudioDestinationNode, null);
                this._nativeMediaStreamAudioDestinationNode = nativeMediaStreamAudioDestinationNode;
            }
            get stream() {
                return this._nativeMediaStreamAudioDestinationNode.stream;
            }
        };
    };

    const createMediaStreamAudioSourceNodeConstructor = (audioNodeConstructor, createNativeMediaStreamAudioSourceNode, getNativeContext, isNativeOfflineAudioContext) => {
        return class MediaStreamAudioSourceNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const nativeMediaStreamAudioSourceNode = createNativeMediaStreamAudioSourceNode(nativeContext, options);
                // Bug #172: Safari allows to create a MediaStreamAudioSourceNode with an OfflineAudioContext.
                if (isNativeOfflineAudioContext(nativeContext)) {
                    throw new TypeError();
                }
                super(context, true, nativeMediaStreamAudioSourceNode, null);
                this._nativeMediaStreamAudioSourceNode = nativeMediaStreamAudioSourceNode;
            }
            get mediaStream() {
                return this._nativeMediaStreamAudioSourceNode.mediaStream;
            }
        };
    };

    const createMediaStreamTrackAudioSourceNodeConstructor = (audioNodeConstructor, createNativeMediaStreamTrackAudioSourceNode, getNativeContext) => {
        return class MediaStreamTrackAudioSourceNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const nativeMediaStreamTrackAudioSourceNode = createNativeMediaStreamTrackAudioSourceNode(nativeContext, options);
                super(context, true, nativeMediaStreamTrackAudioSourceNode, null);
            }
        };
    };

    const createMinimalBaseAudioContextConstructor = (audioDestinationNodeConstructor, createAudioListener, eventTargetConstructor, isNativeOfflineAudioContext, unrenderedAudioWorkletNodeStore, wrapEventListener) => {
        return class MinimalBaseAudioContext extends eventTargetConstructor {
            constructor(_nativeContext, numberOfChannels) {
                super(_nativeContext);
                this._nativeContext = _nativeContext;
                CONTEXT_STORE.set(this, _nativeContext);
                if (isNativeOfflineAudioContext(_nativeContext)) {
                    unrenderedAudioWorkletNodeStore.set(_nativeContext, new Set());
                }
                this._destination = new audioDestinationNodeConstructor(this, numberOfChannels);
                this._listener = createAudioListener(this, _nativeContext);
                this._onstatechange = null;
            }
            get currentTime() {
                return this._nativeContext.currentTime;
            }
            get destination() {
                return this._destination;
            }
            get listener() {
                return this._listener;
            }
            get onstatechange() {
                return this._onstatechange;
            }
            set onstatechange(value) {
                const wrappedListener = typeof value === 'function' ? wrapEventListener(this, value) : null;
                this._nativeContext.onstatechange = wrappedListener;
                const nativeOnStateChange = this._nativeContext.onstatechange;
                this._onstatechange =
                    nativeOnStateChange !== null && nativeOnStateChange === wrappedListener
                        ? value
                        : nativeOnStateChange;
            }
            get sampleRate() {
                return this._nativeContext.sampleRate;
            }
            get state() {
                return this._nativeContext.state;
            }
        };
    };

    const testPromiseSupport = (nativeContext) => {
        // This 12 numbers represent the 48 bytes of an empty WAVE file with a single sample.
        const uint32Array = new Uint32Array([1179011410, 40, 1163280727, 544501094, 16, 131073, 44100, 176400, 1048580, 1635017060, 4, 0]);
        try {
            // Bug #1: Safari requires a successCallback.
            const promise = nativeContext.decodeAudioData(uint32Array.buffer, () => {
                // Ignore the success callback.
            });
            if (promise === undefined) {
                return false;
            }
            promise.catch(() => {
                // Ignore rejected errors.
            });
            return true;
        }
        catch {
            // Ignore errors.
        }
        return false;
    };

    const createMonitorConnections = (insertElementInSet, isNativeAudioNode) => {
        return (nativeAudioNode, whenConnected, whenDisconnected) => {
            const connections = new Set();
            nativeAudioNode.connect = ((connect) => {
                // tslint:disable-next-line:invalid-void
                return (destination, output = 0, input = 0) => {
                    const wasDisconnected = connections.size === 0;
                    if (isNativeAudioNode(destination)) {
                        // @todo TypeScript cannot infer the overloaded signature with 3 arguments yet.
                        connect.call(nativeAudioNode, destination, output, input);
                        insertElementInSet(connections, [destination, output, input], (connection) => connection[0] === destination && connection[1] === output && connection[2] === input, true);
                        if (wasDisconnected) {
                            whenConnected();
                        }
                        return destination;
                    }
                    connect.call(nativeAudioNode, destination, output);
                    insertElementInSet(connections, [destination, output], (connection) => connection[0] === destination && connection[1] === output, true);
                    if (wasDisconnected) {
                        whenConnected();
                    }
                    return;
                };
            })(nativeAudioNode.connect);
            nativeAudioNode.disconnect = ((disconnect) => {
                return (destinationOrOutput, output, input) => {
                    const wasConnected = connections.size > 0;
                    if (destinationOrOutput === undefined) {
                        disconnect.apply(nativeAudioNode);
                        connections.clear();
                    }
                    else if (typeof destinationOrOutput === 'number') {
                        // @todo TypeScript cannot infer the overloaded signature with 1 argument yet.
                        disconnect.call(nativeAudioNode, destinationOrOutput);
                        for (const connection of connections) {
                            if (connection[1] === destinationOrOutput) {
                                connections.delete(connection);
                            }
                        }
                    }
                    else {
                        if (isNativeAudioNode(destinationOrOutput)) {
                            // @todo TypeScript cannot infer the overloaded signature with 3 arguments yet.
                            disconnect.call(nativeAudioNode, destinationOrOutput, output, input);
                        }
                        else {
                            // @todo TypeScript cannot infer the overloaded signature with 2 arguments yet.
                            disconnect.call(nativeAudioNode, destinationOrOutput, output);
                        }
                        for (const connection of connections) {
                            if (connection[0] === destinationOrOutput &&
                                (output === undefined || connection[1] === output) &&
                                (input === undefined || connection[2] === input)) {
                                connections.delete(connection);
                            }
                        }
                    }
                    const isDisconnected = connections.size === 0;
                    if (wasConnected && isDisconnected) {
                        whenDisconnected();
                    }
                };
            })(nativeAudioNode.disconnect);
            return nativeAudioNode;
        };
    };

    const assignNativeAudioNodeOption = (nativeAudioNode, options, option) => {
        const value = options[option];
        if (value !== undefined && value !== nativeAudioNode[option]) {
            nativeAudioNode[option] = value;
        }
    };

    const assignNativeAudioNodeOptions = (nativeAudioNode, options) => {
        assignNativeAudioNodeOption(nativeAudioNode, options, 'channelCount');
        assignNativeAudioNodeOption(nativeAudioNode, options, 'channelCountMode');
        assignNativeAudioNodeOption(nativeAudioNode, options, 'channelInterpretation');
    };

    const testAnalyserNodeGetFloatTimeDomainDataMethodSupport = (nativeAnalyserNode) => {
        return typeof nativeAnalyserNode.getFloatTimeDomainData === 'function';
    };

    const wrapAnalyserNodeGetFloatTimeDomainDataMethod = (nativeAnalyserNode) => {
        nativeAnalyserNode.getFloatTimeDomainData = (array) => {
            const byteTimeDomainData = new Uint8Array(array.length);
            nativeAnalyserNode.getByteTimeDomainData(byteTimeDomainData);
            const length = Math.max(byteTimeDomainData.length, nativeAnalyserNode.fftSize);
            for (let i = 0; i < length; i += 1) {
                array[i] = (byteTimeDomainData[i] - 128) * 0.0078125;
            }
            return array;
        };
    };

    const createNativeAnalyserNodeFactory = (cacheTestResult, createIndexSizeError) => {
        return (nativeContext, options) => {
            const nativeAnalyserNode = nativeContext.createAnalyser();
            // Bug #37: Firefox does not create an AnalyserNode with the default properties.
            assignNativeAudioNodeOptions(nativeAnalyserNode, options);
            // Bug #118: Safari does not throw an error if maxDecibels is not more than minDecibels.
            if (!(options.maxDecibels > options.minDecibels)) {
                throw createIndexSizeError();
            }
            assignNativeAudioNodeOption(nativeAnalyserNode, options, 'fftSize');
            assignNativeAudioNodeOption(nativeAnalyserNode, options, 'maxDecibels');
            assignNativeAudioNodeOption(nativeAnalyserNode, options, 'minDecibels');
            assignNativeAudioNodeOption(nativeAnalyserNode, options, 'smoothingTimeConstant');
            // Bug #36: Safari does not support getFloatTimeDomainData() yet.
            if (!cacheTestResult(testAnalyserNodeGetFloatTimeDomainDataMethodSupport, () => testAnalyserNodeGetFloatTimeDomainDataMethodSupport(nativeAnalyserNode))) {
                wrapAnalyserNodeGetFloatTimeDomainDataMethod(nativeAnalyserNode);
            }
            return nativeAnalyserNode;
        };
    };

    const createNativeAudioBufferConstructor = (window) => {
        if (window === null) {
            return null;
        }
        if (window.hasOwnProperty('AudioBuffer')) {
            return window.AudioBuffer;
        }
        return null;
    };

    const assignNativeAudioNodeAudioParamValue = (nativeAudioNode, options, audioParam) => {
        const value = options[audioParam];
        if (value !== undefined && value !== nativeAudioNode[audioParam].value) {
            nativeAudioNode[audioParam].value = value;
        }
    };

    const wrapAudioBufferSourceNodeStartMethodConsecutiveCalls = (nativeAudioBufferSourceNode) => {
        nativeAudioBufferSourceNode.start = ((start) => {
            let isScheduled = false;
            return (when = 0, offset = 0, duration) => {
                if (isScheduled) {
                    throw createInvalidStateError();
                }
                start.call(nativeAudioBufferSourceNode, when, offset, duration);
                isScheduled = true;
            };
        })(nativeAudioBufferSourceNode.start);
    };

    const wrapAudioScheduledSourceNodeStartMethodNegativeParameters = (nativeAudioScheduledSourceNode) => {
        nativeAudioScheduledSourceNode.start = ((start) => {
            return (when = 0, offset = 0, duration) => {
                if ((typeof duration === 'number' && duration < 0) || offset < 0 || when < 0) {
                    throw new RangeError("The parameters can't be negative.");
                }
                // @todo TypeScript cannot infer the overloaded signature with 3 arguments yet.
                start.call(nativeAudioScheduledSourceNode, when, offset, duration);
            };
        })(nativeAudioScheduledSourceNode.start);
    };

    const wrapAudioScheduledSourceNodeStopMethodNegativeParameters = (nativeAudioScheduledSourceNode) => {
        nativeAudioScheduledSourceNode.stop = ((stop) => {
            return (when = 0) => {
                if (when < 0) {
                    throw new RangeError("The parameter can't be negative.");
                }
                stop.call(nativeAudioScheduledSourceNode, when);
            };
        })(nativeAudioScheduledSourceNode.stop);
    };

    const createNativeAudioBufferSourceNodeFactory = (addSilentConnection, cacheTestResult, testAudioBufferSourceNodeStartMethodConsecutiveCallsSupport, testAudioBufferSourceNodeStartMethodOffsetClampingSupport, testAudioBufferSourceNodeStopMethodNullifiedBufferSupport, testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport, testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, wrapAudioBufferSourceNodeStartMethodOffsetClampling, wrapAudioBufferSourceNodeStopMethodNullifiedBuffer, wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls) => {
        return (nativeContext, options) => {
            const nativeAudioBufferSourceNode = nativeContext.createBufferSource();
            assignNativeAudioNodeOptions(nativeAudioBufferSourceNode, options);
            assignNativeAudioNodeAudioParamValue(nativeAudioBufferSourceNode, options, 'playbackRate');
            assignNativeAudioNodeOption(nativeAudioBufferSourceNode, options, 'buffer');
            // Bug #149: Safari does not yet support the detune AudioParam.
            assignNativeAudioNodeOption(nativeAudioBufferSourceNode, options, 'loop');
            assignNativeAudioNodeOption(nativeAudioBufferSourceNode, options, 'loopEnd');
            assignNativeAudioNodeOption(nativeAudioBufferSourceNode, options, 'loopStart');
            // Bug #69: Safari does allow calls to start() of an already scheduled AudioBufferSourceNode.
            if (!cacheTestResult(testAudioBufferSourceNodeStartMethodConsecutiveCallsSupport, () => testAudioBufferSourceNodeStartMethodConsecutiveCallsSupport(nativeContext))) {
                wrapAudioBufferSourceNodeStartMethodConsecutiveCalls(nativeAudioBufferSourceNode);
            }
            // Bug #154 & #155: Safari does not handle offsets which are equal to or greater than the duration of the buffer.
            if (!cacheTestResult(testAudioBufferSourceNodeStartMethodOffsetClampingSupport, () => testAudioBufferSourceNodeStartMethodOffsetClampingSupport(nativeContext))) {
                wrapAudioBufferSourceNodeStartMethodOffsetClampling(nativeAudioBufferSourceNode);
            }
            // Bug #162: Safari does throw an error when stop() is called on an AudioBufferSourceNode which has no buffer assigned to it.
            if (!cacheTestResult(testAudioBufferSourceNodeStopMethodNullifiedBufferSupport, () => testAudioBufferSourceNodeStopMethodNullifiedBufferSupport(nativeContext))) {
                wrapAudioBufferSourceNodeStopMethodNullifiedBuffer(nativeAudioBufferSourceNode, nativeContext);
            }
            // Bug #44: Safari does not throw a RangeError yet.
            if (!cacheTestResult(testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, () => testAudioScheduledSourceNodeStartMethodNegativeParametersSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStartMethodNegativeParameters(nativeAudioBufferSourceNode);
            }
            // Bug #19: Safari does not ignore calls to stop() of an already stopped AudioBufferSourceNode.
            if (!cacheTestResult(testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport, () => testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls(nativeAudioBufferSourceNode, nativeContext);
            }
            // Bug #44: Only Firefox does not throw a RangeError yet.
            if (!cacheTestResult(testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, () => testAudioScheduledSourceNodeStopMethodNegativeParametersSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStopMethodNegativeParameters(nativeAudioBufferSourceNode);
            }
            // Bug #175: Safari will not fire an ended event if the AudioBufferSourceNode is unconnected.
            addSilentConnection(nativeContext, nativeAudioBufferSourceNode);
            return nativeAudioBufferSourceNode;
        };
    };

    const createNativeAudioContextConstructor = (window) => {
        if (window === null) {
            return null;
        }
        if (window.hasOwnProperty('AudioContext')) {
            return window.AudioContext;
        }
        return window.hasOwnProperty('webkitAudioContext') ? window.webkitAudioContext : null;
    };

    const createNativeAudioDestinationNodeFactory = (createNativeGainNode, overwriteAccessors) => {
        return (nativeContext, channelCount, isNodeOfNativeOfflineAudioContext) => {
            const nativeAudioDestinationNode = nativeContext.destination;
            // Bug #132: Safari does not have the correct channelCount.
            if (nativeAudioDestinationNode.channelCount !== channelCount) {
                try {
                    nativeAudioDestinationNode.channelCount = channelCount;
                }
                catch {
                    // Bug #169: Safari throws an error on each attempt to change the channelCount.
                }
            }
            // Bug #83: Safari does not have the correct channelCountMode.
            if (isNodeOfNativeOfflineAudioContext && nativeAudioDestinationNode.channelCountMode !== 'explicit') {
                nativeAudioDestinationNode.channelCountMode = 'explicit';
            }
            // Bug #47: The AudioDestinationNode in Safari does not initialize the maxChannelCount property correctly.
            if (nativeAudioDestinationNode.maxChannelCount === 0) {
                Object.defineProperty(nativeAudioDestinationNode, 'maxChannelCount', {
                    value: channelCount
                });
            }
            // Bug #168: No browser does yet have an AudioDestinationNode with an output.
            const gainNode = createNativeGainNode(nativeContext, {
                channelCount,
                channelCountMode: nativeAudioDestinationNode.channelCountMode,
                channelInterpretation: nativeAudioDestinationNode.channelInterpretation,
                gain: 1
            });
            overwriteAccessors(gainNode, 'channelCount', (get) => () => get.call(gainNode), (set) => (value) => {
                set.call(gainNode, value);
                try {
                    nativeAudioDestinationNode.channelCount = value;
                }
                catch (err) {
                    // Bug #169: Safari throws an error on each attempt to change the channelCount.
                    if (value > nativeAudioDestinationNode.maxChannelCount) {
                        throw err;
                    }
                }
            });
            overwriteAccessors(gainNode, 'channelCountMode', (get) => () => get.call(gainNode), (set) => (value) => {
                set.call(gainNode, value);
                nativeAudioDestinationNode.channelCountMode = value;
            });
            overwriteAccessors(gainNode, 'channelInterpretation', (get) => () => get.call(gainNode), (set) => (value) => {
                set.call(gainNode, value);
                nativeAudioDestinationNode.channelInterpretation = value;
            });
            Object.defineProperty(gainNode, 'maxChannelCount', {
                get: () => nativeAudioDestinationNode.maxChannelCount
            });
            // @todo This should be disconnected when the context is closed.
            gainNode.connect(nativeAudioDestinationNode);
            return gainNode;
        };
    };

    const createNativeAudioWorkletNodeConstructor = (window) => {
        if (window === null) {
            return null;
        }
        return window.hasOwnProperty('AudioWorkletNode') ? window.AudioWorkletNode : null;
    };

    const computeBufferSize = (baseLatency, sampleRate) => {
        if (baseLatency === null) {
            return 512;
        }
        return Math.max(512, Math.min(16384, Math.pow(2, Math.round(Math.log2(baseLatency * sampleRate)))));
    };

    const createNativeBiquadFilterNode = (nativeContext, options) => {
        const nativeBiquadFilterNode = nativeContext.createBiquadFilter();
        assignNativeAudioNodeOptions(nativeBiquadFilterNode, options);
        assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'Q');
        assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'detune');
        assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'frequency');
        assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'gain');
        assignNativeAudioNodeOption(nativeBiquadFilterNode, options, 'type');
        return nativeBiquadFilterNode;
    };

    const createNativeChannelMergerNodeFactory = (nativeAudioContextConstructor, wrapChannelMergerNode) => {
        return (nativeContext, options) => {
            const nativeChannelMergerNode = nativeContext.createChannelMerger(options.numberOfInputs);
            /*
             * Bug #20: Safari requires a connection of any kind to treat the input signal correctly.
             * @todo Unfortunately there is no way to test for this behavior in a synchronous fashion which is why testing for the existence of
             * the webkitAudioContext is used as a workaround here.
             */
            if (nativeAudioContextConstructor !== null && nativeAudioContextConstructor.name === 'webkitAudioContext') {
                wrapChannelMergerNode(nativeContext, nativeChannelMergerNode);
            }
            assignNativeAudioNodeOptions(nativeChannelMergerNode, options);
            return nativeChannelMergerNode;
        };
    };

    const wrapChannelSplitterNode = (channelSplitterNode) => {
        const channelCount = channelSplitterNode.numberOfOutputs;
        // Bug #97: Safari does not throw an error when attempting to change the channelCount to something other than its initial value.
        Object.defineProperty(channelSplitterNode, 'channelCount', {
            get: () => channelCount,
            set: (value) => {
                if (value !== channelCount) {
                    throw createInvalidStateError();
                }
            }
        });
        // Bug #30: Safari does not throw an error when attempting to change the channelCountMode to something other than explicit.
        Object.defineProperty(channelSplitterNode, 'channelCountMode', {
            get: () => 'explicit',
            set: (value) => {
                if (value !== 'explicit') {
                    throw createInvalidStateError();
                }
            }
        });
        // Bug #32: Safari does not throw an error when attempting to change the channelInterpretation to something other than discrete.
        Object.defineProperty(channelSplitterNode, 'channelInterpretation', {
            get: () => 'discrete',
            set: (value) => {
                if (value !== 'discrete') {
                    throw createInvalidStateError();
                }
            }
        });
    };

    const createNativeChannelSplitterNode = (nativeContext, options) => {
        const nativeChannelSplitterNode = nativeContext.createChannelSplitter(options.numberOfOutputs);
        // Bug #96: Safari does not have the correct channelCount.
        // Bug #29: Safari does not have the correct channelCountMode.
        // Bug #31: Safari does not have the correct channelInterpretation.
        assignNativeAudioNodeOptions(nativeChannelSplitterNode, options);
        // Bug #29, #30, #31, #32, #96 & #97: Only Chrome, Edge, Firefox & Opera partially support the spec yet.
        wrapChannelSplitterNode(nativeChannelSplitterNode);
        return nativeChannelSplitterNode;
    };

    const createNativeConstantSourceNodeFactory = (addSilentConnection, cacheTestResult, createNativeConstantSourceNodeFaker, testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, testAudioScheduledSourceNodeStopMethodNegativeParametersSupport) => {
        return (nativeContext, options) => {
            // Bug #62: Safari does not support ConstantSourceNodes.
            if (nativeContext.createConstantSource === undefined) {
                return createNativeConstantSourceNodeFaker(nativeContext, options);
            }
            const nativeConstantSourceNode = nativeContext.createConstantSource();
            assignNativeAudioNodeOptions(nativeConstantSourceNode, options);
            assignNativeAudioNodeAudioParamValue(nativeConstantSourceNode, options, 'offset');
            // Bug #44: Safari does not throw a RangeError yet.
            if (!cacheTestResult(testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, () => testAudioScheduledSourceNodeStartMethodNegativeParametersSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStartMethodNegativeParameters(nativeConstantSourceNode);
            }
            // Bug #44: Only Firefox does not throw a RangeError yet.
            if (!cacheTestResult(testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, () => testAudioScheduledSourceNodeStopMethodNegativeParametersSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStopMethodNegativeParameters(nativeConstantSourceNode);
            }
            // Bug #175: Safari will not fire an ended event if the ConstantSourceNode is unconnected.
            addSilentConnection(nativeContext, nativeConstantSourceNode);
            return nativeConstantSourceNode;
        };
    };

    const interceptConnections = (original, interceptor) => {
        original.connect = interceptor.connect.bind(interceptor);
        original.disconnect = interceptor.disconnect.bind(interceptor);
        return original;
    };

    const createNativeConstantSourceNodeFakerFactory = (addSilentConnection, createNativeAudioBufferSourceNode, createNativeGainNode, monitorConnections) => {
        return (nativeContext, { offset, ...audioNodeOptions }) => {
            const audioBuffer = nativeContext.createBuffer(1, 2, 44100);
            const audioBufferSourceNode = createNativeAudioBufferSourceNode(nativeContext, {
                buffer: null,
                channelCount: 2,
                channelCountMode: 'max',
                channelInterpretation: 'speakers',
                loop: false,
                loopEnd: 0,
                loopStart: 0,
                playbackRate: 1
            });
            const gainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, gain: offset });
            // Bug #5: Safari does not support copyFromChannel() and copyToChannel().
            const channelData = audioBuffer.getChannelData(0);
            // Bug #95: Safari does not play or loop one sample buffers.
            channelData[0] = 1;
            channelData[1] = 1;
            audioBufferSourceNode.buffer = audioBuffer;
            audioBufferSourceNode.loop = true;
            const nativeConstantSourceNodeFaker = {
                get bufferSize() {
                    return undefined;
                },
                get channelCount() {
                    return gainNode.channelCount;
                },
                set channelCount(value) {
                    gainNode.channelCount = value;
                },
                get channelCountMode() {
                    return gainNode.channelCountMode;
                },
                set channelCountMode(value) {
                    gainNode.channelCountMode = value;
                },
                get channelInterpretation() {
                    return gainNode.channelInterpretation;
                },
                set channelInterpretation(value) {
                    gainNode.channelInterpretation = value;
                },
                get context() {
                    return gainNode.context;
                },
                get inputs() {
                    return [];
                },
                get numberOfInputs() {
                    return audioBufferSourceNode.numberOfInputs;
                },
                get numberOfOutputs() {
                    return gainNode.numberOfOutputs;
                },
                get offset() {
                    return gainNode.gain;
                },
                get onended() {
                    return audioBufferSourceNode.onended;
                },
                set onended(value) {
                    audioBufferSourceNode.onended = value;
                },
                addEventListener(...args) {
                    return audioBufferSourceNode.addEventListener(args[0], args[1], args[2]);
                },
                dispatchEvent(...args) {
                    return audioBufferSourceNode.dispatchEvent(args[0]);
                },
                removeEventListener(...args) {
                    return audioBufferSourceNode.removeEventListener(args[0], args[1], args[2]);
                },
                start(when = 0) {
                    audioBufferSourceNode.start.call(audioBufferSourceNode, when);
                },
                stop(when = 0) {
                    audioBufferSourceNode.stop.call(audioBufferSourceNode, when);
                }
            };
            const whenConnected = () => audioBufferSourceNode.connect(gainNode);
            const whenDisconnected = () => audioBufferSourceNode.disconnect(gainNode);
            // Bug #175: Safari will not fire an ended event if the AudioBufferSourceNode is unconnected.
            addSilentConnection(nativeContext, audioBufferSourceNode);
            return monitorConnections(interceptConnections(nativeConstantSourceNodeFaker, gainNode), whenConnected, whenDisconnected);
        };
    };

    const createNativeConvolverNodeFactory = (createNotSupportedError, overwriteAccessors) => {
        return (nativeContext, options) => {
            const nativeConvolverNode = nativeContext.createConvolver();
            assignNativeAudioNodeOptions(nativeConvolverNode, options);
            // The normalize property needs to be set before setting the buffer.
            if (options.disableNormalization === nativeConvolverNode.normalize) {
                nativeConvolverNode.normalize = !options.disableNormalization;
            }
            assignNativeAudioNodeOption(nativeConvolverNode, options, 'buffer');
            // Bug #113: Safari does allow to set the channelCount to a value larger than 2.
            if (options.channelCount > 2) {
                throw createNotSupportedError();
            }
            overwriteAccessors(nativeConvolverNode, 'channelCount', (get) => () => get.call(nativeConvolverNode), (set) => (value) => {
                if (value > 2) {
                    throw createNotSupportedError();
                }
                return set.call(nativeConvolverNode, value);
            });
            // Bug #114: Safari allows to set the channelCountMode to 'max'.
            if (options.channelCountMode === 'max') {
                throw createNotSupportedError();
            }
            overwriteAccessors(nativeConvolverNode, 'channelCountMode', (get) => () => get.call(nativeConvolverNode), (set) => (value) => {
                if (value === 'max') {
                    throw createNotSupportedError();
                }
                return set.call(nativeConvolverNode, value);
            });
            return nativeConvolverNode;
        };
    };

    const createNativeDelayNode = (nativeContext, options) => {
        const nativeDelayNode = nativeContext.createDelay(options.maxDelayTime);
        assignNativeAudioNodeOptions(nativeDelayNode, options);
        assignNativeAudioNodeAudioParamValue(nativeDelayNode, options, 'delayTime');
        return nativeDelayNode;
    };

    const createNativeDynamicsCompressorNodeFactory = (createNotSupportedError) => {
        return (nativeContext, options) => {
            const nativeDynamicsCompressorNode = nativeContext.createDynamicsCompressor();
            assignNativeAudioNodeOptions(nativeDynamicsCompressorNode, options);
            // Bug #108: Safari allows a channelCount of three and above.
            if (options.channelCount > 2) {
                throw createNotSupportedError();
            }
            // Bug #109: Only Chrome, Firefox and Opera disallow a channelCountMode of 'max'.
            if (options.channelCountMode === 'max') {
                throw createNotSupportedError();
            }
            assignNativeAudioNodeAudioParamValue(nativeDynamicsCompressorNode, options, 'attack');
            assignNativeAudioNodeAudioParamValue(nativeDynamicsCompressorNode, options, 'knee');
            assignNativeAudioNodeAudioParamValue(nativeDynamicsCompressorNode, options, 'ratio');
            assignNativeAudioNodeAudioParamValue(nativeDynamicsCompressorNode, options, 'release');
            assignNativeAudioNodeAudioParamValue(nativeDynamicsCompressorNode, options, 'threshold');
            return nativeDynamicsCompressorNode;
        };
    };

    const createNativeGainNode = (nativeContext, options) => {
        const nativeGainNode = nativeContext.createGain();
        assignNativeAudioNodeOptions(nativeGainNode, options);
        assignNativeAudioNodeAudioParamValue(nativeGainNode, options, 'gain');
        return nativeGainNode;
    };

    const createNativeIIRFilterNodeFactory = (createNativeIIRFilterNodeFaker) => {
        return (nativeContext, baseLatency, options) => {
            // Bug #9: Safari does not support IIRFilterNodes.
            if (nativeContext.createIIRFilter === undefined) {
                return createNativeIIRFilterNodeFaker(nativeContext, baseLatency, options);
            }
            // @todo TypeScript defines the parameters of createIIRFilter() as arrays of numbers.
            const nativeIIRFilterNode = nativeContext.createIIRFilter(options.feedforward, options.feedback);
            assignNativeAudioNodeOptions(nativeIIRFilterNode, options);
            return nativeIIRFilterNode;
        };
    };

    function divide(a, b) {
        const denominator = b[0] * b[0] + b[1] * b[1];
        return [(a[0] * b[0] + a[1] * b[1]) / denominator, (a[1] * b[0] - a[0] * b[1]) / denominator];
    }
    function multiply(a, b) {
        return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    }
    function evaluatePolynomial(coefficient, z) {
        let result = [0, 0];
        for (let i = coefficient.length - 1; i >= 0; i -= 1) {
            result = multiply(result, z);
            result[0] += coefficient[i];
        }
        return result;
    }
    const createNativeIIRFilterNodeFakerFactory = (createInvalidAccessError, createInvalidStateError, createNativeScriptProcessorNode, createNotSupportedError) => {
        return (nativeContext, baseLatency, { channelCount, channelCountMode, channelInterpretation, feedback, feedforward }) => {
            const bufferSize = computeBufferSize(baseLatency, nativeContext.sampleRate);
            const convertedFeedback = feedback instanceof Float64Array ? feedback : new Float64Array(feedback);
            const convertedFeedforward = feedforward instanceof Float64Array ? feedforward : new Float64Array(feedforward);
            const feedbackLength = convertedFeedback.length;
            const feedforwardLength = convertedFeedforward.length;
            const minLength = Math.min(feedbackLength, feedforwardLength);
            if (feedbackLength === 0 || feedbackLength > 20) {
                throw createNotSupportedError();
            }
            if (convertedFeedback[0] === 0) {
                throw createInvalidStateError();
            }
            if (feedforwardLength === 0 || feedforwardLength > 20) {
                throw createNotSupportedError();
            }
            if (convertedFeedforward[0] === 0) {
                throw createInvalidStateError();
            }
            if (convertedFeedback[0] !== 1) {
                for (let i = 0; i < feedforwardLength; i += 1) {
                    convertedFeedforward[i] /= convertedFeedback[0];
                }
                for (let i = 1; i < feedbackLength; i += 1) {
                    convertedFeedback[i] /= convertedFeedback[0];
                }
            }
            const scriptProcessorNode = createNativeScriptProcessorNode(nativeContext, bufferSize, channelCount, channelCount);
            scriptProcessorNode.channelCount = channelCount;
            scriptProcessorNode.channelCountMode = channelCountMode;
            scriptProcessorNode.channelInterpretation = channelInterpretation;
            const bufferLength = 32;
            const bufferIndexes = [];
            const xBuffers = [];
            const yBuffers = [];
            for (let i = 0; i < channelCount; i += 1) {
                bufferIndexes.push(0);
                const xBuffer = new Float32Array(bufferLength);
                const yBuffer = new Float32Array(bufferLength);
                xBuffer.fill(0);
                yBuffer.fill(0);
                xBuffers.push(xBuffer);
                yBuffers.push(yBuffer);
            }
            // tslint:disable-next-line:deprecation
            scriptProcessorNode.onaudioprocess = (event) => {
                const inputBuffer = event.inputBuffer;
                const outputBuffer = event.outputBuffer;
                const numberOfChannels = inputBuffer.numberOfChannels;
                for (let i = 0; i < numberOfChannels; i += 1) {
                    const input = inputBuffer.getChannelData(i);
                    const output = outputBuffer.getChannelData(i);
                    bufferIndexes[i] = filterBuffer(convertedFeedback, feedbackLength, convertedFeedforward, feedforwardLength, minLength, xBuffers[i], yBuffers[i], bufferIndexes[i], bufferLength, input, output);
                }
            };
            const nyquist = nativeContext.sampleRate / 2;
            const nativeIIRFilterNodeFaker = {
                get bufferSize() {
                    return bufferSize;
                },
                get channelCount() {
                    return scriptProcessorNode.channelCount;
                },
                set channelCount(value) {
                    scriptProcessorNode.channelCount = value;
                },
                get channelCountMode() {
                    return scriptProcessorNode.channelCountMode;
                },
                set channelCountMode(value) {
                    scriptProcessorNode.channelCountMode = value;
                },
                get channelInterpretation() {
                    return scriptProcessorNode.channelInterpretation;
                },
                set channelInterpretation(value) {
                    scriptProcessorNode.channelInterpretation = value;
                },
                get context() {
                    return scriptProcessorNode.context;
                },
                get inputs() {
                    return [scriptProcessorNode];
                },
                get numberOfInputs() {
                    return scriptProcessorNode.numberOfInputs;
                },
                get numberOfOutputs() {
                    return scriptProcessorNode.numberOfOutputs;
                },
                addEventListener(...args) {
                    // @todo Dissallow adding an audioprocess listener.
                    return scriptProcessorNode.addEventListener(args[0], args[1], args[2]);
                },
                dispatchEvent(...args) {
                    return scriptProcessorNode.dispatchEvent(args[0]);
                },
                getFrequencyResponse(frequencyHz, magResponse, phaseResponse) {
                    if (frequencyHz.length !== magResponse.length || magResponse.length !== phaseResponse.length) {
                        throw createInvalidAccessError();
                    }
                    const length = frequencyHz.length;
                    for (let i = 0; i < length; i += 1) {
                        const omega = -Math.PI * (frequencyHz[i] / nyquist);
                        const z = [Math.cos(omega), Math.sin(omega)];
                        const numerator = evaluatePolynomial(convertedFeedforward, z);
                        const denominator = evaluatePolynomial(convertedFeedback, z);
                        const response = divide(numerator, denominator);
                        magResponse[i] = Math.sqrt(response[0] * response[0] + response[1] * response[1]);
                        phaseResponse[i] = Math.atan2(response[1], response[0]);
                    }
                },
                removeEventListener(...args) {
                    return scriptProcessorNode.removeEventListener(args[0], args[1], args[2]);
                }
            };
            return interceptConnections(nativeIIRFilterNodeFaker, scriptProcessorNode);
        };
    };

    const createNativeMediaElementAudioSourceNode = (nativeAudioContext, options) => {
        return nativeAudioContext.createMediaElementSource(options.mediaElement);
    };

    const createNativeMediaStreamAudioDestinationNode = (nativeAudioContext, options) => {
        const nativeMediaStreamAudioDestinationNode = nativeAudioContext.createMediaStreamDestination();
        assignNativeAudioNodeOptions(nativeMediaStreamAudioDestinationNode, options);
        // Bug #174: Safari does expose a wrong numberOfOutputs.
        if (nativeMediaStreamAudioDestinationNode.numberOfOutputs === 1) {
            Object.defineProperty(nativeMediaStreamAudioDestinationNode, 'numberOfOutputs', { get: () => 0 });
        }
        return nativeMediaStreamAudioDestinationNode;
    };

    const createNativeMediaStreamAudioSourceNode = (nativeAudioContext, { mediaStream }) => {
        const audioStreamTracks = mediaStream.getAudioTracks();
        /*
         * Bug #151: Safari does not use the audio track as input anymore if it gets removed from the mediaStream after construction.
         * Bug #159: Safari picks the first audio track if the MediaStream has more than one audio track.
         */
        audioStreamTracks.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const filteredAudioStreamTracks = audioStreamTracks.slice(0, 1);
        const nativeMediaStreamAudioSourceNode = nativeAudioContext.createMediaStreamSource(new MediaStream(filteredAudioStreamTracks));
        /*
         * Bug #151 & #159: The given mediaStream gets reconstructed before it gets passed to the native node which is why the accessor needs
         * to be overwritten as it would otherwise expose the reconstructed version.
         */
        Object.defineProperty(nativeMediaStreamAudioSourceNode, 'mediaStream', { value: mediaStream });
        return nativeMediaStreamAudioSourceNode;
    };

    const createNativeMediaStreamTrackAudioSourceNodeFactory = (createInvalidStateError, isNativeOfflineAudioContext) => {
        return (nativeAudioContext, { mediaStreamTrack }) => {
            // Bug #121: Only Firefox does yet support the MediaStreamTrackAudioSourceNode.
            if (typeof nativeAudioContext.createMediaStreamTrackSource === 'function') {
                return nativeAudioContext.createMediaStreamTrackSource(mediaStreamTrack);
            }
            const mediaStream = new MediaStream([mediaStreamTrack]);
            const nativeMediaStreamAudioSourceNode = nativeAudioContext.createMediaStreamSource(mediaStream);
            // Bug #120: Firefox does not throw an error if the mediaStream has no audio track.
            if (mediaStreamTrack.kind !== 'audio') {
                throw createInvalidStateError();
            }
            // Bug #172: Safari allows to create a MediaStreamAudioSourceNode with an OfflineAudioContext.
            if (isNativeOfflineAudioContext(nativeAudioContext)) {
                throw new TypeError();
            }
            return nativeMediaStreamAudioSourceNode;
        };
    };

    const createNativeOfflineAudioContextConstructor = (window) => {
        if (window === null) {
            return null;
        }
        if (window.hasOwnProperty('OfflineAudioContext')) {
            return window.OfflineAudioContext;
        }
        return window.hasOwnProperty('webkitOfflineAudioContext') ? window.webkitOfflineAudioContext : null;
    };

    const createNativeOscillatorNodeFactory = (addSilentConnection, cacheTestResult, testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport, testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls) => {
        return (nativeContext, options) => {
            const nativeOscillatorNode = nativeContext.createOscillator();
            assignNativeAudioNodeOptions(nativeOscillatorNode, options);
            assignNativeAudioNodeAudioParamValue(nativeOscillatorNode, options, 'detune');
            assignNativeAudioNodeAudioParamValue(nativeOscillatorNode, options, 'frequency');
            if (options.periodicWave !== undefined) {
                nativeOscillatorNode.setPeriodicWave(options.periodicWave);
            }
            else {
                assignNativeAudioNodeOption(nativeOscillatorNode, options, 'type');
            }
            // Bug #44: Only Chrome, Edge & Opera throw a RangeError yet.
            if (!cacheTestResult(testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, () => testAudioScheduledSourceNodeStartMethodNegativeParametersSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStartMethodNegativeParameters(nativeOscillatorNode);
            }
            // Bug #19: Safari does not ignore calls to stop() of an already stopped AudioBufferSourceNode.
            if (!cacheTestResult(testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport, () => testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls(nativeOscillatorNode, nativeContext);
            }
            // Bug #44: Only Firefox does not throw a RangeError yet.
            if (!cacheTestResult(testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, () => testAudioScheduledSourceNodeStopMethodNegativeParametersSupport(nativeContext))) {
                wrapAudioScheduledSourceNodeStopMethodNegativeParameters(nativeOscillatorNode);
            }
            // Bug #175: Safari will not fire an ended event if the OscillatorNode is unconnected.
            addSilentConnection(nativeContext, nativeOscillatorNode);
            return nativeOscillatorNode;
        };
    };

    const createNativePannerNodeFactory = (createNativePannerNodeFaker) => {
        return (nativeContext, options) => {
            const nativePannerNode = nativeContext.createPanner();
            // Bug #124: Safari does not support modifying the orientation and the position with AudioParams.
            if (nativePannerNode.orientationX === undefined) {
                return createNativePannerNodeFaker(nativeContext, options);
            }
            assignNativeAudioNodeOptions(nativePannerNode, options);
            assignNativeAudioNodeAudioParamValue(nativePannerNode, options, 'orientationX');
            assignNativeAudioNodeAudioParamValue(nativePannerNode, options, 'orientationY');
            assignNativeAudioNodeAudioParamValue(nativePannerNode, options, 'orientationZ');
            assignNativeAudioNodeAudioParamValue(nativePannerNode, options, 'positionX');
            assignNativeAudioNodeAudioParamValue(nativePannerNode, options, 'positionY');
            assignNativeAudioNodeAudioParamValue(nativePannerNode, options, 'positionZ');
            assignNativeAudioNodeOption(nativePannerNode, options, 'coneInnerAngle');
            assignNativeAudioNodeOption(nativePannerNode, options, 'coneOuterAngle');
            assignNativeAudioNodeOption(nativePannerNode, options, 'coneOuterGain');
            assignNativeAudioNodeOption(nativePannerNode, options, 'distanceModel');
            assignNativeAudioNodeOption(nativePannerNode, options, 'maxDistance');
            assignNativeAudioNodeOption(nativePannerNode, options, 'panningModel');
            assignNativeAudioNodeOption(nativePannerNode, options, 'refDistance');
            assignNativeAudioNodeOption(nativePannerNode, options, 'rolloffFactor');
            return nativePannerNode;
        };
    };

    const createNativePannerNodeFakerFactory = (connectNativeAudioNodeToNativeAudioNode, createInvalidStateError, createNativeChannelMergerNode, createNativeGainNode, createNativeScriptProcessorNode, createNativeWaveShaperNode, createNotSupportedError, disconnectNativeAudioNodeFromNativeAudioNode, monitorConnections) => {
        return (nativeContext, { coneInnerAngle, coneOuterAngle, coneOuterGain, distanceModel, maxDistance, orientationX, orientationY, orientationZ, panningModel, positionX, positionY, positionZ, refDistance, rolloffFactor, ...audioNodeOptions }) => {
            const pannerNode = nativeContext.createPanner();
            // Bug #125: Safari does not throw an error yet.
            if (audioNodeOptions.channelCount > 2) {
                throw createNotSupportedError();
            }
            // Bug #126: Safari does not throw an error yet.
            if (audioNodeOptions.channelCountMode === 'max') {
                throw createNotSupportedError();
            }
            assignNativeAudioNodeOptions(pannerNode, audioNodeOptions);
            const SINGLE_CHANNEL_OPTIONS = {
                channelCount: 1,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete'
            };
            const channelMergerNode = createNativeChannelMergerNode(nativeContext, {
                ...SINGLE_CHANNEL_OPTIONS,
                channelInterpretation: 'speakers',
                numberOfInputs: 6
            });
            const inputGainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, gain: 1 });
            const orientationXGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 1 });
            const orientationYGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            const orientationZGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            const positionXGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            const positionYGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            const positionZGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            const scriptProcessorNode = createNativeScriptProcessorNode(nativeContext, 256, 6, 1);
            const waveShaperNode = createNativeWaveShaperNode(nativeContext, {
                ...SINGLE_CHANNEL_OPTIONS,
                curve: new Float32Array([1, 1]),
                oversample: 'none'
            });
            let lastOrientation = [orientationX, orientationY, orientationZ];
            let lastPosition = [positionX, positionY, positionZ];
            // tslint:disable-next-line:deprecation
            scriptProcessorNode.onaudioprocess = ({ inputBuffer }) => {
                const orientation = [
                    inputBuffer.getChannelData(0)[0],
                    inputBuffer.getChannelData(1)[0],
                    inputBuffer.getChannelData(2)[0]
                ];
                if (orientation.some((value, index) => value !== lastOrientation[index])) {
                    pannerNode.setOrientation(...orientation); // tslint:disable-line:deprecation
                    lastOrientation = orientation;
                }
                const positon = [
                    inputBuffer.getChannelData(3)[0],
                    inputBuffer.getChannelData(4)[0],
                    inputBuffer.getChannelData(5)[0]
                ];
                if (positon.some((value, index) => value !== lastPosition[index])) {
                    pannerNode.setPosition(...positon); // tslint:disable-line:deprecation
                    lastPosition = positon;
                }
            };
            Object.defineProperty(orientationYGainNode.gain, 'defaultValue', { get: () => 0 });
            Object.defineProperty(orientationZGainNode.gain, 'defaultValue', { get: () => 0 });
            Object.defineProperty(positionXGainNode.gain, 'defaultValue', { get: () => 0 });
            Object.defineProperty(positionYGainNode.gain, 'defaultValue', { get: () => 0 });
            Object.defineProperty(positionZGainNode.gain, 'defaultValue', { get: () => 0 });
            const nativePannerNodeFaker = {
                get bufferSize() {
                    return undefined;
                },
                get channelCount() {
                    return pannerNode.channelCount;
                },
                set channelCount(value) {
                    // Bug #125: Safari does not throw an error yet.
                    if (value > 2) {
                        throw createNotSupportedError();
                    }
                    inputGainNode.channelCount = value;
                    pannerNode.channelCount = value;
                },
                get channelCountMode() {
                    return pannerNode.channelCountMode;
                },
                set channelCountMode(value) {
                    // Bug #126: Safari does not throw an error yet.
                    if (value === 'max') {
                        throw createNotSupportedError();
                    }
                    inputGainNode.channelCountMode = value;
                    pannerNode.channelCountMode = value;
                },
                get channelInterpretation() {
                    return pannerNode.channelInterpretation;
                },
                set channelInterpretation(value) {
                    inputGainNode.channelInterpretation = value;
                    pannerNode.channelInterpretation = value;
                },
                get coneInnerAngle() {
                    return pannerNode.coneInnerAngle;
                },
                set coneInnerAngle(value) {
                    pannerNode.coneInnerAngle = value;
                },
                get coneOuterAngle() {
                    return pannerNode.coneOuterAngle;
                },
                set coneOuterAngle(value) {
                    pannerNode.coneOuterAngle = value;
                },
                get coneOuterGain() {
                    return pannerNode.coneOuterGain;
                },
                set coneOuterGain(value) {
                    // Bug #127: Safari does not throw an InvalidStateError yet.
                    if (value < 0 || value > 1) {
                        throw createInvalidStateError();
                    }
                    pannerNode.coneOuterGain = value;
                },
                get context() {
                    return pannerNode.context;
                },
                get distanceModel() {
                    return pannerNode.distanceModel;
                },
                set distanceModel(value) {
                    pannerNode.distanceModel = value;
                },
                get inputs() {
                    return [inputGainNode];
                },
                get maxDistance() {
                    return pannerNode.maxDistance;
                },
                set maxDistance(value) {
                    // Bug #128: Safari does not throw an error yet.
                    if (value < 0) {
                        throw new RangeError();
                    }
                    pannerNode.maxDistance = value;
                },
                get numberOfInputs() {
                    return pannerNode.numberOfInputs;
                },
                get numberOfOutputs() {
                    return pannerNode.numberOfOutputs;
                },
                get orientationX() {
                    return orientationXGainNode.gain;
                },
                get orientationY() {
                    return orientationYGainNode.gain;
                },
                get orientationZ() {
                    return orientationZGainNode.gain;
                },
                get panningModel() {
                    return pannerNode.panningModel;
                },
                set panningModel(value) {
                    pannerNode.panningModel = value;
                },
                get positionX() {
                    return positionXGainNode.gain;
                },
                get positionY() {
                    return positionYGainNode.gain;
                },
                get positionZ() {
                    return positionZGainNode.gain;
                },
                get refDistance() {
                    return pannerNode.refDistance;
                },
                set refDistance(value) {
                    // Bug #129: Safari does not throw an error yet.
                    if (value < 0) {
                        throw new RangeError();
                    }
                    pannerNode.refDistance = value;
                },
                get rolloffFactor() {
                    return pannerNode.rolloffFactor;
                },
                set rolloffFactor(value) {
                    // Bug #130: Safari does not throw an error yet.
                    if (value < 0) {
                        throw new RangeError();
                    }
                    pannerNode.rolloffFactor = value;
                },
                addEventListener(...args) {
                    return inputGainNode.addEventListener(args[0], args[1], args[2]);
                },
                dispatchEvent(...args) {
                    return inputGainNode.dispatchEvent(args[0]);
                },
                removeEventListener(...args) {
                    return inputGainNode.removeEventListener(args[0], args[1], args[2]);
                }
            };
            if (coneInnerAngle !== nativePannerNodeFaker.coneInnerAngle) {
                nativePannerNodeFaker.coneInnerAngle = coneInnerAngle;
            }
            if (coneOuterAngle !== nativePannerNodeFaker.coneOuterAngle) {
                nativePannerNodeFaker.coneOuterAngle = coneOuterAngle;
            }
            if (coneOuterGain !== nativePannerNodeFaker.coneOuterGain) {
                nativePannerNodeFaker.coneOuterGain = coneOuterGain;
            }
            if (distanceModel !== nativePannerNodeFaker.distanceModel) {
                nativePannerNodeFaker.distanceModel = distanceModel;
            }
            if (maxDistance !== nativePannerNodeFaker.maxDistance) {
                nativePannerNodeFaker.maxDistance = maxDistance;
            }
            if (orientationX !== nativePannerNodeFaker.orientationX.value) {
                nativePannerNodeFaker.orientationX.value = orientationX;
            }
            if (orientationY !== nativePannerNodeFaker.orientationY.value) {
                nativePannerNodeFaker.orientationY.value = orientationY;
            }
            if (orientationZ !== nativePannerNodeFaker.orientationZ.value) {
                nativePannerNodeFaker.orientationZ.value = orientationZ;
            }
            if (panningModel !== nativePannerNodeFaker.panningModel) {
                nativePannerNodeFaker.panningModel = panningModel;
            }
            if (positionX !== nativePannerNodeFaker.positionX.value) {
                nativePannerNodeFaker.positionX.value = positionX;
            }
            if (positionY !== nativePannerNodeFaker.positionY.value) {
                nativePannerNodeFaker.positionY.value = positionY;
            }
            if (positionZ !== nativePannerNodeFaker.positionZ.value) {
                nativePannerNodeFaker.positionZ.value = positionZ;
            }
            if (refDistance !== nativePannerNodeFaker.refDistance) {
                nativePannerNodeFaker.refDistance = refDistance;
            }
            if (rolloffFactor !== nativePannerNodeFaker.rolloffFactor) {
                nativePannerNodeFaker.rolloffFactor = rolloffFactor;
            }
            if (lastOrientation[0] !== 1 || lastOrientation[1] !== 0 || lastOrientation[2] !== 0) {
                pannerNode.setOrientation(...lastOrientation); // tslint:disable-line:deprecation
            }
            if (lastPosition[0] !== 0 || lastPosition[1] !== 0 || lastPosition[2] !== 0) {
                pannerNode.setPosition(...lastPosition); // tslint:disable-line:deprecation
            }
            const whenConnected = () => {
                inputGainNode.connect(pannerNode);
                // Bug #119: Safari does not fully support the WaveShaperNode.
                connectNativeAudioNodeToNativeAudioNode(inputGainNode, waveShaperNode, 0, 0);
                waveShaperNode.connect(orientationXGainNode).connect(channelMergerNode, 0, 0);
                waveShaperNode.connect(orientationYGainNode).connect(channelMergerNode, 0, 1);
                waveShaperNode.connect(orientationZGainNode).connect(channelMergerNode, 0, 2);
                waveShaperNode.connect(positionXGainNode).connect(channelMergerNode, 0, 3);
                waveShaperNode.connect(positionYGainNode).connect(channelMergerNode, 0, 4);
                waveShaperNode.connect(positionZGainNode).connect(channelMergerNode, 0, 5);
                channelMergerNode.connect(scriptProcessorNode).connect(nativeContext.destination);
            };
            const whenDisconnected = () => {
                inputGainNode.disconnect(pannerNode);
                // Bug #119: Safari does not fully support the WaveShaperNode.
                disconnectNativeAudioNodeFromNativeAudioNode(inputGainNode, waveShaperNode, 0, 0);
                waveShaperNode.disconnect(orientationXGainNode);
                orientationXGainNode.disconnect(channelMergerNode);
                waveShaperNode.disconnect(orientationYGainNode);
                orientationYGainNode.disconnect(channelMergerNode);
                waveShaperNode.disconnect(orientationZGainNode);
                orientationZGainNode.disconnect(channelMergerNode);
                waveShaperNode.disconnect(positionXGainNode);
                positionXGainNode.disconnect(channelMergerNode);
                waveShaperNode.disconnect(positionYGainNode);
                positionYGainNode.disconnect(channelMergerNode);
                waveShaperNode.disconnect(positionZGainNode);
                positionZGainNode.disconnect(channelMergerNode);
                channelMergerNode.disconnect(scriptProcessorNode);
                scriptProcessorNode.disconnect(nativeContext.destination);
            };
            return monitorConnections(interceptConnections(nativePannerNodeFaker, pannerNode), whenConnected, whenDisconnected);
        };
    };

    const createNativePeriodicWaveFactory = (createIndexSizeError) => {
        return (nativeContext, { disableNormalization, imag, real }) => {
            // Bug #180: Safari does not allow to use ordinary arrays.
            const convertedImag = imag instanceof Float32Array ? imag : new Float32Array(imag);
            const convertedReal = real instanceof Float32Array ? real : new Float32Array(real);
            const nativePeriodicWave = nativeContext.createPeriodicWave(convertedReal, convertedImag, { disableNormalization });
            // Bug #181: Safari does not throw an IndexSizeError so far if the given arrays have less than two values.
            if (Array.from(imag).length < 2) {
                throw createIndexSizeError();
            }
            return nativePeriodicWave;
        };
    };

    const createNativeScriptProcessorNode = (nativeContext, bufferSize, numberOfInputChannels, numberOfOutputChannels) => {
        return nativeContext.createScriptProcessor(bufferSize, numberOfInputChannels, numberOfOutputChannels);
    };

    const createNativeStereoPannerNodeFactory = (createNativeStereoPannerNodeFaker, createNotSupportedError) => {
        return (nativeContext, options) => {
            const channelCountMode = options.channelCountMode;
            /*
             * Bug #105: The channelCountMode of 'clamped-max' should be supported. However it is not possible to write a polyfill for Safari
             * which supports it and therefore it can't be supported at all.
             */
            if (channelCountMode === 'clamped-max') {
                throw createNotSupportedError();
            }
            // Bug #105: Safari does not support the StereoPannerNode.
            if (nativeContext.createStereoPanner === undefined) {
                return createNativeStereoPannerNodeFaker(nativeContext, options);
            }
            const nativeStereoPannerNode = nativeContext.createStereoPanner();
            assignNativeAudioNodeOptions(nativeStereoPannerNode, options);
            assignNativeAudioNodeAudioParamValue(nativeStereoPannerNode, options, 'pan');
            /*
             * Bug #105: The channelCountMode of 'clamped-max' should be supported. However it is not possible to write a polyfill for Safari
             * which supports it and therefore it can't be supported at all.
             */
            Object.defineProperty(nativeStereoPannerNode, 'channelCountMode', {
                get: () => channelCountMode,
                set: (value) => {
                    if (value !== channelCountMode) {
                        throw createNotSupportedError();
                    }
                }
            });
            return nativeStereoPannerNode;
        };
    };

    const createNativeStereoPannerNodeFakerFactory = (createNativeChannelMergerNode, createNativeChannelSplitterNode, createNativeGainNode, createNativeWaveShaperNode, createNotSupportedError, monitorConnections) => {
        // The curve has a size of 14bit plus 1 value to have an exact representation for zero. This value has been determined experimentally.
        const CURVE_SIZE = 16385;
        const DC_CURVE = new Float32Array([1, 1]);
        const HALF_PI = Math.PI / 2;
        const SINGLE_CHANNEL_OPTIONS = { channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'discrete' };
        const SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS = { ...SINGLE_CHANNEL_OPTIONS, oversample: 'none' };
        const buildInternalGraphForMono = (nativeContext, inputGainNode, panGainNode, channelMergerNode) => {
            const leftWaveShaperCurve = new Float32Array(CURVE_SIZE);
            const rightWaveShaperCurve = new Float32Array(CURVE_SIZE);
            for (let i = 0; i < CURVE_SIZE; i += 1) {
                const x = (i / (CURVE_SIZE - 1)) * HALF_PI;
                leftWaveShaperCurve[i] = Math.cos(x);
                rightWaveShaperCurve[i] = Math.sin(x);
            }
            const leftGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const leftWaveShaperNode = (createNativeWaveShaperNode(nativeContext, { ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS, curve: leftWaveShaperCurve }));
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const panWaveShaperNode = (createNativeWaveShaperNode(nativeContext, { ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS, curve: DC_CURVE }));
            const rightGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const rightWaveShaperNode = (createNativeWaveShaperNode(nativeContext, { ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS, curve: rightWaveShaperCurve }));
            return {
                connectGraph() {
                    inputGainNode.connect(leftGainNode);
                    inputGainNode.connect(panWaveShaperNode.inputs === undefined ? panWaveShaperNode : panWaveShaperNode.inputs[0]);
                    inputGainNode.connect(rightGainNode);
                    panWaveShaperNode.connect(panGainNode);
                    panGainNode.connect(leftWaveShaperNode.inputs === undefined ? leftWaveShaperNode : leftWaveShaperNode.inputs[0]);
                    panGainNode.connect(rightWaveShaperNode.inputs === undefined ? rightWaveShaperNode : rightWaveShaperNode.inputs[0]);
                    leftWaveShaperNode.connect(leftGainNode.gain);
                    rightWaveShaperNode.connect(rightGainNode.gain);
                    leftGainNode.connect(channelMergerNode, 0, 0);
                    rightGainNode.connect(channelMergerNode, 0, 1);
                },
                disconnectGraph() {
                    inputGainNode.disconnect(leftGainNode);
                    inputGainNode.disconnect(panWaveShaperNode.inputs === undefined ? panWaveShaperNode : panWaveShaperNode.inputs[0]);
                    inputGainNode.disconnect(rightGainNode);
                    panWaveShaperNode.disconnect(panGainNode);
                    panGainNode.disconnect(leftWaveShaperNode.inputs === undefined ? leftWaveShaperNode : leftWaveShaperNode.inputs[0]);
                    panGainNode.disconnect(rightWaveShaperNode.inputs === undefined ? rightWaveShaperNode : rightWaveShaperNode.inputs[0]);
                    leftWaveShaperNode.disconnect(leftGainNode.gain);
                    rightWaveShaperNode.disconnect(rightGainNode.gain);
                    leftGainNode.disconnect(channelMergerNode, 0, 0);
                    rightGainNode.disconnect(channelMergerNode, 0, 1);
                }
            };
        };
        const buildInternalGraphForStereo = (nativeContext, inputGainNode, panGainNode, channelMergerNode) => {
            const leftInputForLeftOutputWaveShaperCurve = new Float32Array(CURVE_SIZE);
            const leftInputForRightOutputWaveShaperCurve = new Float32Array(CURVE_SIZE);
            const rightInputForLeftOutputWaveShaperCurve = new Float32Array(CURVE_SIZE);
            const rightInputForRightOutputWaveShaperCurve = new Float32Array(CURVE_SIZE);
            const centerIndex = Math.floor(CURVE_SIZE / 2);
            for (let i = 0; i < CURVE_SIZE; i += 1) {
                if (i > centerIndex) {
                    const x = ((i - centerIndex) / (CURVE_SIZE - 1 - centerIndex)) * HALF_PI;
                    leftInputForLeftOutputWaveShaperCurve[i] = Math.cos(x);
                    leftInputForRightOutputWaveShaperCurve[i] = Math.sin(x);
                    rightInputForLeftOutputWaveShaperCurve[i] = 0;
                    rightInputForRightOutputWaveShaperCurve[i] = 1;
                }
                else {
                    const x = (i / (CURVE_SIZE - 1 - centerIndex)) * HALF_PI;
                    leftInputForLeftOutputWaveShaperCurve[i] = 1;
                    leftInputForRightOutputWaveShaperCurve[i] = 0;
                    rightInputForLeftOutputWaveShaperCurve[i] = Math.cos(x);
                    rightInputForRightOutputWaveShaperCurve[i] = Math.sin(x);
                }
            }
            const channelSplitterNode = createNativeChannelSplitterNode(nativeContext, {
                channelCount: 2,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete',
                numberOfOutputs: 2
            });
            const leftInputForLeftOutputGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const leftInputForLeftOutputWaveShaperNode = createNativeWaveShaperNode(nativeContext, {
                ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS,
                curve: leftInputForLeftOutputWaveShaperCurve
            });
            const leftInputForRightOutputGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const leftInputForRightOutputWaveShaperNode = createNativeWaveShaperNode(nativeContext, {
                ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS,
                curve: leftInputForRightOutputWaveShaperCurve
            });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const panWaveShaperNode = (createNativeWaveShaperNode(nativeContext, { ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS, curve: DC_CURVE }));
            const rightInputForLeftOutputGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const rightInputForLeftOutputWaveShaperNode = createNativeWaveShaperNode(nativeContext, {
                ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS,
                curve: rightInputForLeftOutputWaveShaperCurve
            });
            const rightInputForRightOutputGainNode = createNativeGainNode(nativeContext, { ...SINGLE_CHANNEL_OPTIONS, gain: 0 });
            // Bug #119: Safari does not fully support the WaveShaperNode.
            const rightInputForRightOutputWaveShaperNode = createNativeWaveShaperNode(nativeContext, {
                ...SINGLE_CHANNEL_WAVE_SHAPER_OPTIONS,
                curve: rightInputForRightOutputWaveShaperCurve
            });
            return {
                connectGraph() {
                    inputGainNode.connect(channelSplitterNode);
                    inputGainNode.connect(panWaveShaperNode.inputs === undefined ? panWaveShaperNode : panWaveShaperNode.inputs[0]);
                    channelSplitterNode.connect(leftInputForLeftOutputGainNode, 0);
                    channelSplitterNode.connect(leftInputForRightOutputGainNode, 0);
                    channelSplitterNode.connect(rightInputForLeftOutputGainNode, 1);
                    channelSplitterNode.connect(rightInputForRightOutputGainNode, 1);
                    panWaveShaperNode.connect(panGainNode);
                    panGainNode.connect(leftInputForLeftOutputWaveShaperNode.inputs === undefined
                        ? leftInputForLeftOutputWaveShaperNode
                        : leftInputForLeftOutputWaveShaperNode.inputs[0]);
                    panGainNode.connect(leftInputForRightOutputWaveShaperNode.inputs === undefined
                        ? leftInputForRightOutputWaveShaperNode
                        : leftInputForRightOutputWaveShaperNode.inputs[0]);
                    panGainNode.connect(rightInputForLeftOutputWaveShaperNode.inputs === undefined
                        ? rightInputForLeftOutputWaveShaperNode
                        : rightInputForLeftOutputWaveShaperNode.inputs[0]);
                    panGainNode.connect(rightInputForRightOutputWaveShaperNode.inputs === undefined
                        ? rightInputForRightOutputWaveShaperNode
                        : rightInputForRightOutputWaveShaperNode.inputs[0]);
                    leftInputForLeftOutputWaveShaperNode.connect(leftInputForLeftOutputGainNode.gain);
                    leftInputForRightOutputWaveShaperNode.connect(leftInputForRightOutputGainNode.gain);
                    rightInputForLeftOutputWaveShaperNode.connect(rightInputForLeftOutputGainNode.gain);
                    rightInputForRightOutputWaveShaperNode.connect(rightInputForRightOutputGainNode.gain);
                    leftInputForLeftOutputGainNode.connect(channelMergerNode, 0, 0);
                    rightInputForLeftOutputGainNode.connect(channelMergerNode, 0, 0);
                    leftInputForRightOutputGainNode.connect(channelMergerNode, 0, 1);
                    rightInputForRightOutputGainNode.connect(channelMergerNode, 0, 1);
                },
                disconnectGraph() {
                    inputGainNode.disconnect(channelSplitterNode);
                    inputGainNode.disconnect(panWaveShaperNode.inputs === undefined ? panWaveShaperNode : panWaveShaperNode.inputs[0]);
                    channelSplitterNode.disconnect(leftInputForLeftOutputGainNode, 0);
                    channelSplitterNode.disconnect(leftInputForRightOutputGainNode, 0);
                    channelSplitterNode.disconnect(rightInputForLeftOutputGainNode, 1);
                    channelSplitterNode.disconnect(rightInputForRightOutputGainNode, 1);
                    panWaveShaperNode.disconnect(panGainNode);
                    panGainNode.disconnect(leftInputForLeftOutputWaveShaperNode.inputs === undefined
                        ? leftInputForLeftOutputWaveShaperNode
                        : leftInputForLeftOutputWaveShaperNode.inputs[0]);
                    panGainNode.disconnect(leftInputForRightOutputWaveShaperNode.inputs === undefined
                        ? leftInputForRightOutputWaveShaperNode
                        : leftInputForRightOutputWaveShaperNode.inputs[0]);
                    panGainNode.disconnect(rightInputForLeftOutputWaveShaperNode.inputs === undefined
                        ? rightInputForLeftOutputWaveShaperNode
                        : rightInputForLeftOutputWaveShaperNode.inputs[0]);
                    panGainNode.disconnect(rightInputForRightOutputWaveShaperNode.inputs === undefined
                        ? rightInputForRightOutputWaveShaperNode
                        : rightInputForRightOutputWaveShaperNode.inputs[0]);
                    leftInputForLeftOutputWaveShaperNode.disconnect(leftInputForLeftOutputGainNode.gain);
                    leftInputForRightOutputWaveShaperNode.disconnect(leftInputForRightOutputGainNode.gain);
                    rightInputForLeftOutputWaveShaperNode.disconnect(rightInputForLeftOutputGainNode.gain);
                    rightInputForRightOutputWaveShaperNode.disconnect(rightInputForRightOutputGainNode.gain);
                    leftInputForLeftOutputGainNode.disconnect(channelMergerNode, 0, 0);
                    rightInputForLeftOutputGainNode.disconnect(channelMergerNode, 0, 0);
                    leftInputForRightOutputGainNode.disconnect(channelMergerNode, 0, 1);
                    rightInputForRightOutputGainNode.disconnect(channelMergerNode, 0, 1);
                }
            };
        };
        const buildInternalGraph = (nativeContext, channelCount, inputGainNode, panGainNode, channelMergerNode) => {
            if (channelCount === 1) {
                return buildInternalGraphForMono(nativeContext, inputGainNode, panGainNode, channelMergerNode);
            }
            if (channelCount === 2) {
                return buildInternalGraphForStereo(nativeContext, inputGainNode, panGainNode, channelMergerNode);
            }
            throw createNotSupportedError();
        };
        return (nativeContext, { channelCount, channelCountMode, pan, ...audioNodeOptions }) => {
            if (channelCountMode === 'max') {
                throw createNotSupportedError();
            }
            const channelMergerNode = createNativeChannelMergerNode(nativeContext, {
                ...audioNodeOptions,
                channelCount: 1,
                channelCountMode,
                numberOfInputs: 2
            });
            const inputGainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, channelCount, channelCountMode, gain: 1 });
            const panGainNode = createNativeGainNode(nativeContext, {
                channelCount: 1,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete',
                gain: pan
            });
            let { connectGraph, disconnectGraph } = buildInternalGraph(nativeContext, channelCount, inputGainNode, panGainNode, channelMergerNode);
            Object.defineProperty(panGainNode.gain, 'defaultValue', { get: () => 0 });
            Object.defineProperty(panGainNode.gain, 'maxValue', { get: () => 1 });
            Object.defineProperty(panGainNode.gain, 'minValue', { get: () => -1 });
            const nativeStereoPannerNodeFakerFactory = {
                get bufferSize() {
                    return undefined;
                },
                get channelCount() {
                    return inputGainNode.channelCount;
                },
                set channelCount(value) {
                    if (inputGainNode.channelCount !== value) {
                        if (isConnected) {
                            disconnectGraph();
                        }
                        ({ connectGraph, disconnectGraph } = buildInternalGraph(nativeContext, value, inputGainNode, panGainNode, channelMergerNode));
                        if (isConnected) {
                            connectGraph();
                        }
                    }
                    inputGainNode.channelCount = value;
                },
                get channelCountMode() {
                    return inputGainNode.channelCountMode;
                },
                set channelCountMode(value) {
                    if (value === 'clamped-max' || value === 'max') {
                        throw createNotSupportedError();
                    }
                    inputGainNode.channelCountMode = value;
                },
                get channelInterpretation() {
                    return inputGainNode.channelInterpretation;
                },
                set channelInterpretation(value) {
                    inputGainNode.channelInterpretation = value;
                },
                get context() {
                    return inputGainNode.context;
                },
                get inputs() {
                    return [inputGainNode];
                },
                get numberOfInputs() {
                    return inputGainNode.numberOfInputs;
                },
                get numberOfOutputs() {
                    return inputGainNode.numberOfOutputs;
                },
                get pan() {
                    return panGainNode.gain;
                },
                addEventListener(...args) {
                    return inputGainNode.addEventListener(args[0], args[1], args[2]);
                },
                dispatchEvent(...args) {
                    return inputGainNode.dispatchEvent(args[0]);
                },
                removeEventListener(...args) {
                    return inputGainNode.removeEventListener(args[0], args[1], args[2]);
                }
            };
            let isConnected = false;
            const whenConnected = () => {
                connectGraph();
                isConnected = true;
            };
            const whenDisconnected = () => {
                disconnectGraph();
                isConnected = false;
            };
            return monitorConnections(interceptConnections(nativeStereoPannerNodeFakerFactory, channelMergerNode), whenConnected, whenDisconnected);
        };
    };

    const createNativeWaveShaperNodeFactory = (createConnectedNativeAudioBufferSourceNode, createInvalidStateError, createNativeWaveShaperNodeFaker, isDCCurve, monitorConnections, nativeAudioContextConstructor, overwriteAccessors) => {
        return (nativeContext, options) => {
            const nativeWaveShaperNode = nativeContext.createWaveShaper();
            /*
             * Bug #119: Safari does not correctly map the values.
             * @todo Unfortunately there is no way to test for this behavior in a synchronous fashion which is why testing for the existence of
             * the webkitAudioContext is used as a workaround here. Testing for the automationRate property is necessary because this workaround
             * isn't necessary anymore since v14.0.2 of Safari.
             */
            if (nativeAudioContextConstructor !== null &&
                nativeAudioContextConstructor.name === 'webkitAudioContext' &&
                nativeContext.createGain().gain.automationRate === undefined) {
                return createNativeWaveShaperNodeFaker(nativeContext, options);
            }
            assignNativeAudioNodeOptions(nativeWaveShaperNode, options);
            const curve = options.curve === null || options.curve instanceof Float32Array ? options.curve : new Float32Array(options.curve);
            // Bug #104: Chrome, Edge and Opera will throw an InvalidAccessError when the curve has less than two samples.
            if (curve !== null && curve.length < 2) {
                throw createInvalidStateError();
            }
            // Only values of type Float32Array can be assigned to the curve property.
            assignNativeAudioNodeOption(nativeWaveShaperNode, { curve }, 'curve');
            assignNativeAudioNodeOption(nativeWaveShaperNode, options, 'oversample');
            let disconnectNativeAudioBufferSourceNode = null;
            let isConnected = false;
            overwriteAccessors(nativeWaveShaperNode, 'curve', (get) => () => get.call(nativeWaveShaperNode), (set) => (value) => {
                set.call(nativeWaveShaperNode, value);
                if (isConnected) {
                    if (isDCCurve(value) && disconnectNativeAudioBufferSourceNode === null) {
                        disconnectNativeAudioBufferSourceNode = createConnectedNativeAudioBufferSourceNode(nativeContext, nativeWaveShaperNode);
                    }
                    else if (!isDCCurve(value) && disconnectNativeAudioBufferSourceNode !== null) {
                        disconnectNativeAudioBufferSourceNode();
                        disconnectNativeAudioBufferSourceNode = null;
                    }
                }
                return value;
            });
            const whenConnected = () => {
                isConnected = true;
                if (isDCCurve(nativeWaveShaperNode.curve)) {
                    disconnectNativeAudioBufferSourceNode = createConnectedNativeAudioBufferSourceNode(nativeContext, nativeWaveShaperNode);
                }
            };
            const whenDisconnected = () => {
                isConnected = false;
                if (disconnectNativeAudioBufferSourceNode !== null) {
                    disconnectNativeAudioBufferSourceNode();
                    disconnectNativeAudioBufferSourceNode = null;
                }
            };
            return monitorConnections(nativeWaveShaperNode, whenConnected, whenDisconnected);
        };
    };

    const createNativeWaveShaperNodeFakerFactory = (createConnectedNativeAudioBufferSourceNode, createInvalidStateError, createNativeGainNode, isDCCurve, monitorConnections) => {
        return (nativeContext, { curve, oversample, ...audioNodeOptions }) => {
            const negativeWaveShaperNode = nativeContext.createWaveShaper();
            const positiveWaveShaperNode = nativeContext.createWaveShaper();
            assignNativeAudioNodeOptions(negativeWaveShaperNode, audioNodeOptions);
            assignNativeAudioNodeOptions(positiveWaveShaperNode, audioNodeOptions);
            const inputGainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, gain: 1 });
            const invertGainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, gain: -1 });
            const outputGainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, gain: 1 });
            const revertGainNode = createNativeGainNode(nativeContext, { ...audioNodeOptions, gain: -1 });
            let disconnectNativeAudioBufferSourceNode = null;
            let isConnected = false;
            let unmodifiedCurve = null;
            const nativeWaveShaperNodeFaker = {
                get bufferSize() {
                    return undefined;
                },
                get channelCount() {
                    return negativeWaveShaperNode.channelCount;
                },
                set channelCount(value) {
                    inputGainNode.channelCount = value;
                    invertGainNode.channelCount = value;
                    negativeWaveShaperNode.channelCount = value;
                    outputGainNode.channelCount = value;
                    positiveWaveShaperNode.channelCount = value;
                    revertGainNode.channelCount = value;
                },
                get channelCountMode() {
                    return negativeWaveShaperNode.channelCountMode;
                },
                set channelCountMode(value) {
                    inputGainNode.channelCountMode = value;
                    invertGainNode.channelCountMode = value;
                    negativeWaveShaperNode.channelCountMode = value;
                    outputGainNode.channelCountMode = value;
                    positiveWaveShaperNode.channelCountMode = value;
                    revertGainNode.channelCountMode = value;
                },
                get channelInterpretation() {
                    return negativeWaveShaperNode.channelInterpretation;
                },
                set channelInterpretation(value) {
                    inputGainNode.channelInterpretation = value;
                    invertGainNode.channelInterpretation = value;
                    negativeWaveShaperNode.channelInterpretation = value;
                    outputGainNode.channelInterpretation = value;
                    positiveWaveShaperNode.channelInterpretation = value;
                    revertGainNode.channelInterpretation = value;
                },
                get context() {
                    return negativeWaveShaperNode.context;
                },
                get curve() {
                    return unmodifiedCurve;
                },
                set curve(value) {
                    // Bug #102: Safari does not throw an InvalidStateError when the curve has less than two samples.
                    if (value !== null && value.length < 2) {
                        throw createInvalidStateError();
                    }
                    if (value === null) {
                        negativeWaveShaperNode.curve = value;
                        positiveWaveShaperNode.curve = value;
                    }
                    else {
                        const curveLength = value.length;
                        const negativeCurve = new Float32Array(curveLength + 2 - (curveLength % 2));
                        const positiveCurve = new Float32Array(curveLength + 2 - (curveLength % 2));
                        negativeCurve[0] = value[0];
                        positiveCurve[0] = -value[curveLength - 1];
                        const length = Math.ceil((curveLength + 1) / 2);
                        const centerIndex = (curveLength + 1) / 2 - 1;
                        for (let i = 1; i < length; i += 1) {
                            const theoreticIndex = (i / length) * centerIndex;
                            const lowerIndex = Math.floor(theoreticIndex);
                            const upperIndex = Math.ceil(theoreticIndex);
                            negativeCurve[i] =
                                lowerIndex === upperIndex
                                    ? value[lowerIndex]
                                    : (1 - (theoreticIndex - lowerIndex)) * value[lowerIndex] +
                                        (1 - (upperIndex - theoreticIndex)) * value[upperIndex];
                            positiveCurve[i] =
                                lowerIndex === upperIndex
                                    ? -value[curveLength - 1 - lowerIndex]
                                    : -((1 - (theoreticIndex - lowerIndex)) * value[curveLength - 1 - lowerIndex]) -
                                        (1 - (upperIndex - theoreticIndex)) * value[curveLength - 1 - upperIndex];
                        }
                        negativeCurve[length] = curveLength % 2 === 1 ? value[length - 1] : (value[length - 2] + value[length - 1]) / 2;
                        negativeWaveShaperNode.curve = negativeCurve;
                        positiveWaveShaperNode.curve = positiveCurve;
                    }
                    unmodifiedCurve = value;
                    if (isConnected) {
                        if (isDCCurve(unmodifiedCurve) && disconnectNativeAudioBufferSourceNode === null) {
                            disconnectNativeAudioBufferSourceNode = createConnectedNativeAudioBufferSourceNode(nativeContext, inputGainNode);
                        }
                        else if (disconnectNativeAudioBufferSourceNode !== null) {
                            disconnectNativeAudioBufferSourceNode();
                            disconnectNativeAudioBufferSourceNode = null;
                        }
                    }
                },
                get inputs() {
                    return [inputGainNode];
                },
                get numberOfInputs() {
                    return negativeWaveShaperNode.numberOfInputs;
                },
                get numberOfOutputs() {
                    return negativeWaveShaperNode.numberOfOutputs;
                },
                get oversample() {
                    return negativeWaveShaperNode.oversample;
                },
                set oversample(value) {
                    negativeWaveShaperNode.oversample = value;
                    positiveWaveShaperNode.oversample = value;
                },
                addEventListener(...args) {
                    return inputGainNode.addEventListener(args[0], args[1], args[2]);
                },
                dispatchEvent(...args) {
                    return inputGainNode.dispatchEvent(args[0]);
                },
                removeEventListener(...args) {
                    return inputGainNode.removeEventListener(args[0], args[1], args[2]);
                }
            };
            if (curve !== null) {
                // Only values of type Float32Array can be assigned to the curve property.
                nativeWaveShaperNodeFaker.curve = curve instanceof Float32Array ? curve : new Float32Array(curve);
            }
            if (oversample !== nativeWaveShaperNodeFaker.oversample) {
                nativeWaveShaperNodeFaker.oversample = oversample;
            }
            const whenConnected = () => {
                inputGainNode.connect(negativeWaveShaperNode).connect(outputGainNode);
                inputGainNode.connect(invertGainNode).connect(positiveWaveShaperNode).connect(revertGainNode).connect(outputGainNode);
                isConnected = true;
                if (isDCCurve(unmodifiedCurve)) {
                    disconnectNativeAudioBufferSourceNode = createConnectedNativeAudioBufferSourceNode(nativeContext, inputGainNode);
                }
            };
            const whenDisconnected = () => {
                inputGainNode.disconnect(negativeWaveShaperNode);
                negativeWaveShaperNode.disconnect(outputGainNode);
                inputGainNode.disconnect(invertGainNode);
                invertGainNode.disconnect(positiveWaveShaperNode);
                positiveWaveShaperNode.disconnect(revertGainNode);
                revertGainNode.disconnect(outputGainNode);
                isConnected = false;
                if (disconnectNativeAudioBufferSourceNode !== null) {
                    disconnectNativeAudioBufferSourceNode();
                    disconnectNativeAudioBufferSourceNode = null;
                }
            };
            return monitorConnections(interceptConnections(nativeWaveShaperNodeFaker, outputGainNode), whenConnected, whenDisconnected);
        };
    };

    const createNotSupportedError = () => new DOMException('', 'NotSupportedError');

    const DEFAULT_OPTIONS$d = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        detune: 0,
        frequency: 440,
        periodicWave: undefined,
        type: 'sine'
    };
    const createOscillatorNodeConstructor = (audioNodeConstructor, createAudioParam, createNativeOscillatorNode, createOscillatorNodeRenderer, getNativeContext, isNativeOfflineAudioContext, wrapEventListener) => {
        return class OscillatorNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$d, ...options };
                const nativeOscillatorNode = createNativeOscillatorNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const oscillatorNodeRenderer = (isOffline ? createOscillatorNodeRenderer() : null);
                const nyquist = context.sampleRate / 2;
                super(context, false, nativeOscillatorNode, oscillatorNodeRenderer);
                // Bug #81: Firefox & Safari do not export the correct values for maxValue and minValue.
                this._detune = createAudioParam(this, isOffline, nativeOscillatorNode.detune, 153600, -153600);
                // Bug #76: Safari does not export the correct values for maxValue and minValue.
                this._frequency = createAudioParam(this, isOffline, nativeOscillatorNode.frequency, nyquist, -nyquist);
                this._nativeOscillatorNode = nativeOscillatorNode;
                this._onended = null;
                this._oscillatorNodeRenderer = oscillatorNodeRenderer;
                if (this._oscillatorNodeRenderer !== null && mergedOptions.periodicWave !== undefined) {
                    this._oscillatorNodeRenderer.periodicWave =
                        mergedOptions.periodicWave;
                }
            }
            get detune() {
                return this._detune;
            }
            get frequency() {
                return this._frequency;
            }
            get onended() {
                return this._onended;
            }
            set onended(value) {
                const wrappedListener = typeof value === 'function' ? wrapEventListener(this, value) : null;
                this._nativeOscillatorNode.onended = wrappedListener;
                const nativeOnEnded = this._nativeOscillatorNode.onended;
                this._onended = nativeOnEnded !== null && nativeOnEnded === wrappedListener ? value : nativeOnEnded;
            }
            get type() {
                return this._nativeOscillatorNode.type;
            }
            set type(value) {
                this._nativeOscillatorNode.type = value;
                if (this._oscillatorNodeRenderer !== null) {
                    this._oscillatorNodeRenderer.periodicWave = null;
                }
            }
            setPeriodicWave(periodicWave) {
                this._nativeOscillatorNode.setPeriodicWave(periodicWave);
                if (this._oscillatorNodeRenderer !== null) {
                    this._oscillatorNodeRenderer.periodicWave = periodicWave;
                }
            }
            start(when = 0) {
                this._nativeOscillatorNode.start(when);
                if (this._oscillatorNodeRenderer !== null) {
                    this._oscillatorNodeRenderer.start = when;
                }
                if (this.context.state !== 'closed') {
                    setInternalStateToActive(this);
                    const resetInternalStateToPassive = () => {
                        this._nativeOscillatorNode.removeEventListener('ended', resetInternalStateToPassive);
                        if (isActiveAudioNode(this)) {
                            setInternalStateToPassive(this);
                        }
                    };
                    this._nativeOscillatorNode.addEventListener('ended', resetInternalStateToPassive);
                }
            }
            stop(when = 0) {
                this._nativeOscillatorNode.stop(when);
                if (this._oscillatorNodeRenderer !== null) {
                    this._oscillatorNodeRenderer.stop = when;
                }
            }
        };
    };

    const createOscillatorNodeRendererFactory = (connectAudioParam, createNativeOscillatorNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeOscillatorNodes = new WeakMap();
            let periodicWave = null;
            let start = null;
            let stop = null;
            const createOscillatorNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeOscillatorNode = getNativeAudioNode(proxy);
                // If the initially used nativeOscillatorNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeOscillatorNodeIsOwnedByContext = isOwnedByContext(nativeOscillatorNode, nativeOfflineAudioContext);
                if (!nativeOscillatorNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeOscillatorNode.channelCount,
                        channelCountMode: nativeOscillatorNode.channelCountMode,
                        channelInterpretation: nativeOscillatorNode.channelInterpretation,
                        detune: nativeOscillatorNode.detune.value,
                        frequency: nativeOscillatorNode.frequency.value,
                        periodicWave: periodicWave === null ? undefined : periodicWave,
                        type: nativeOscillatorNode.type
                    };
                    nativeOscillatorNode = createNativeOscillatorNode(nativeOfflineAudioContext, options);
                    if (start !== null) {
                        nativeOscillatorNode.start(start);
                    }
                    if (stop !== null) {
                        nativeOscillatorNode.stop(stop);
                    }
                }
                renderedNativeOscillatorNodes.set(nativeOfflineAudioContext, nativeOscillatorNode);
                if (!nativeOscillatorNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.detune, nativeOscillatorNode.detune, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.frequency, nativeOscillatorNode.frequency, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.detune, nativeOscillatorNode.detune, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.frequency, nativeOscillatorNode.frequency, trace);
                }
                await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeOscillatorNode, trace);
                return nativeOscillatorNode;
            };
            return {
                set periodicWave(value) {
                    periodicWave = value;
                },
                set start(value) {
                    start = value;
                },
                set stop(value) {
                    stop = value;
                },
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeOscillatorNode = renderedNativeOscillatorNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeOscillatorNode !== undefined) {
                        return Promise.resolve(renderedNativeOscillatorNode);
                    }
                    return createOscillatorNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const DEFAULT_OPTIONS$e = {
        channelCount: 2,
        channelCountMode: 'clamped-max',
        channelInterpretation: 'speakers',
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0,
        distanceModel: 'inverse',
        maxDistance: 10000,
        orientationX: 1,
        orientationY: 0,
        orientationZ: 0,
        panningModel: 'equalpower',
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        refDistance: 1,
        rolloffFactor: 1
    };
    const createPannerNodeConstructor = (audioNodeConstructor, createAudioParam, createNativePannerNode, createPannerNodeRenderer, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class PannerNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$e, ...options };
                const nativePannerNode = createNativePannerNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const pannerNodeRenderer = (isOffline ? createPannerNodeRenderer() : null);
                super(context, false, nativePannerNode, pannerNodeRenderer);
                this._nativePannerNode = nativePannerNode;
                // Bug #74: Safari does not export the correct values for maxValue and minValue.
                this._orientationX = createAudioParam(this, isOffline, nativePannerNode.orientationX, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                this._orientationY = createAudioParam(this, isOffline, nativePannerNode.orientationY, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                this._orientationZ = createAudioParam(this, isOffline, nativePannerNode.orientationZ, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                this._positionX = createAudioParam(this, isOffline, nativePannerNode.positionX, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                this._positionY = createAudioParam(this, isOffline, nativePannerNode.positionY, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                this._positionZ = createAudioParam(this, isOffline, nativePannerNode.positionZ, MOST_POSITIVE_SINGLE_FLOAT, MOST_NEGATIVE_SINGLE_FLOAT);
                // @todo Determine a meaningful tail-time instead of just using one second.
                setAudioNodeTailTime(this, 1);
            }
            get coneInnerAngle() {
                return this._nativePannerNode.coneInnerAngle;
            }
            set coneInnerAngle(value) {
                this._nativePannerNode.coneInnerAngle = value;
            }
            get coneOuterAngle() {
                return this._nativePannerNode.coneOuterAngle;
            }
            set coneOuterAngle(value) {
                this._nativePannerNode.coneOuterAngle = value;
            }
            get coneOuterGain() {
                return this._nativePannerNode.coneOuterGain;
            }
            set coneOuterGain(value) {
                this._nativePannerNode.coneOuterGain = value;
            }
            get distanceModel() {
                return this._nativePannerNode.distanceModel;
            }
            set distanceModel(value) {
                this._nativePannerNode.distanceModel = value;
            }
            get maxDistance() {
                return this._nativePannerNode.maxDistance;
            }
            set maxDistance(value) {
                this._nativePannerNode.maxDistance = value;
            }
            get orientationX() {
                return this._orientationX;
            }
            get orientationY() {
                return this._orientationY;
            }
            get orientationZ() {
                return this._orientationZ;
            }
            get panningModel() {
                return this._nativePannerNode.panningModel;
            }
            set panningModel(value) {
                this._nativePannerNode.panningModel = value;
            }
            get positionX() {
                return this._positionX;
            }
            get positionY() {
                return this._positionY;
            }
            get positionZ() {
                return this._positionZ;
            }
            get refDistance() {
                return this._nativePannerNode.refDistance;
            }
            set refDistance(value) {
                this._nativePannerNode.refDistance = value;
            }
            get rolloffFactor() {
                return this._nativePannerNode.rolloffFactor;
            }
            set rolloffFactor(value) {
                this._nativePannerNode.rolloffFactor = value;
            }
        };
    };

    const createPannerNodeRendererFactory = (connectAudioParam, createNativeChannelMergerNode, createNativeConstantSourceNode, createNativeGainNode, createNativePannerNode, getNativeAudioNode, nativeOfflineAudioContextConstructor, renderAutomation, renderInputsOfAudioNode, renderNativeOfflineAudioContext) => {
        return () => {
            const renderedNativeAudioNodes = new WeakMap();
            let renderedBufferPromise = null;
            const createAudioNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeGainNode = null;
                let nativePannerNode = getNativeAudioNode(proxy);
                const commonAudioNodeOptions = {
                    channelCount: nativePannerNode.channelCount,
                    channelCountMode: nativePannerNode.channelCountMode,
                    channelInterpretation: nativePannerNode.channelInterpretation
                };
                const commonNativePannerNodeOptions = {
                    ...commonAudioNodeOptions,
                    coneInnerAngle: nativePannerNode.coneInnerAngle,
                    coneOuterAngle: nativePannerNode.coneOuterAngle,
                    coneOuterGain: nativePannerNode.coneOuterGain,
                    distanceModel: nativePannerNode.distanceModel,
                    maxDistance: nativePannerNode.maxDistance,
                    panningModel: nativePannerNode.panningModel,
                    refDistance: nativePannerNode.refDistance,
                    rolloffFactor: nativePannerNode.rolloffFactor
                };
                // If the initially used nativePannerNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativePannerNodeIsOwnedByContext = isOwnedByContext(nativePannerNode, nativeOfflineAudioContext);
                // Bug #124: Safari does not support modifying the orientation and the position with AudioParams.
                if ('bufferSize' in nativePannerNode) {
                    nativeGainNode = createNativeGainNode(nativeOfflineAudioContext, { ...commonAudioNodeOptions, gain: 1 });
                }
                else if (!nativePannerNodeIsOwnedByContext) {
                    const options = {
                        ...commonNativePannerNodeOptions,
                        orientationX: nativePannerNode.orientationX.value,
                        orientationY: nativePannerNode.orientationY.value,
                        orientationZ: nativePannerNode.orientationZ.value,
                        positionX: nativePannerNode.positionX.value,
                        positionY: nativePannerNode.positionY.value,
                        positionZ: nativePannerNode.positionZ.value
                    };
                    nativePannerNode = createNativePannerNode(nativeOfflineAudioContext, options);
                }
                renderedNativeAudioNodes.set(nativeOfflineAudioContext, nativeGainNode === null ? nativePannerNode : nativeGainNode);
                if (nativeGainNode !== null) {
                    if (renderedBufferPromise === null) {
                        if (nativeOfflineAudioContextConstructor === null) {
                            throw new Error('Missing the native OfflineAudioContext constructor.');
                        }
                        const partialOfflineAudioContext = new nativeOfflineAudioContextConstructor(6, 
                        // Bug #17: Safari does not yet expose the length.
                        proxy.context.length, nativeOfflineAudioContext.sampleRate);
                        const nativeChannelMergerNode = createNativeChannelMergerNode(partialOfflineAudioContext, {
                            channelCount: 1,
                            channelCountMode: 'explicit',
                            channelInterpretation: 'speakers',
                            numberOfInputs: 6
                        });
                        nativeChannelMergerNode.connect(partialOfflineAudioContext.destination);
                        renderedBufferPromise = (async () => {
                            const nativeConstantSourceNodes = await Promise.all([
                                proxy.orientationX,
                                proxy.orientationY,
                                proxy.orientationZ,
                                proxy.positionX,
                                proxy.positionY,
                                proxy.positionZ
                            ].map(async (audioParam, index) => {
                                const nativeConstantSourceNode = createNativeConstantSourceNode(partialOfflineAudioContext, {
                                    channelCount: 1,
                                    channelCountMode: 'explicit',
                                    channelInterpretation: 'discrete',
                                    offset: index === 0 ? 1 : 0
                                });
                                await renderAutomation(partialOfflineAudioContext, audioParam, nativeConstantSourceNode.offset, trace);
                                return nativeConstantSourceNode;
                            }));
                            for (let i = 0; i < 6; i += 1) {
                                nativeConstantSourceNodes[i].connect(nativeChannelMergerNode, 0, i);
                                nativeConstantSourceNodes[i].start(0);
                            }
                            return renderNativeOfflineAudioContext(partialOfflineAudioContext);
                        })();
                    }
                    const renderedBuffer = await renderedBufferPromise;
                    const inputGainNode = createNativeGainNode(nativeOfflineAudioContext, { ...commonAudioNodeOptions, gain: 1 });
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, inputGainNode, trace);
                    const channelDatas = [];
                    for (let i = 0; i < renderedBuffer.numberOfChannels; i += 1) {
                        channelDatas.push(renderedBuffer.getChannelData(i));
                    }
                    let lastOrientation = [channelDatas[0][0], channelDatas[1][0], channelDatas[2][0]];
                    let lastPosition = [channelDatas[3][0], channelDatas[4][0], channelDatas[5][0]];
                    let gateGainNode = createNativeGainNode(nativeOfflineAudioContext, { ...commonAudioNodeOptions, gain: 1 });
                    let partialPannerNode = createNativePannerNode(nativeOfflineAudioContext, {
                        ...commonNativePannerNodeOptions,
                        orientationX: lastOrientation[0],
                        orientationY: lastOrientation[1],
                        orientationZ: lastOrientation[2],
                        positionX: lastPosition[0],
                        positionY: lastPosition[1],
                        positionZ: lastPosition[2]
                    });
                    inputGainNode.connect(gateGainNode).connect(partialPannerNode.inputs[0]);
                    partialPannerNode.connect(nativeGainNode);
                    for (let i = 128; i < renderedBuffer.length; i += 128) {
                        const orientation = [channelDatas[0][i], channelDatas[1][i], channelDatas[2][i]];
                        const positon = [channelDatas[3][i], channelDatas[4][i], channelDatas[5][i]];
                        if (orientation.some((value, index) => value !== lastOrientation[index]) ||
                            positon.some((value, index) => value !== lastPosition[index])) {
                            lastOrientation = orientation;
                            lastPosition = positon;
                            const currentTime = i / nativeOfflineAudioContext.sampleRate;
                            gateGainNode.gain.setValueAtTime(0, currentTime);
                            gateGainNode = createNativeGainNode(nativeOfflineAudioContext, { ...commonAudioNodeOptions, gain: 0 });
                            partialPannerNode = createNativePannerNode(nativeOfflineAudioContext, {
                                ...commonNativePannerNodeOptions,
                                orientationX: lastOrientation[0],
                                orientationY: lastOrientation[1],
                                orientationZ: lastOrientation[2],
                                positionX: lastPosition[0],
                                positionY: lastPosition[1],
                                positionZ: lastPosition[2]
                            });
                            gateGainNode.gain.setValueAtTime(1, currentTime);
                            inputGainNode.connect(gateGainNode).connect(partialPannerNode.inputs[0]);
                            partialPannerNode.connect(nativeGainNode);
                        }
                    }
                    return nativeGainNode;
                }
                if (!nativePannerNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.orientationX, nativePannerNode.orientationX, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.orientationY, nativePannerNode.orientationY, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.orientationZ, nativePannerNode.orientationZ, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.positionX, nativePannerNode.positionX, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.positionY, nativePannerNode.positionY, trace);
                    await renderAutomation(nativeOfflineAudioContext, proxy.positionZ, nativePannerNode.positionZ, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.orientationX, nativePannerNode.orientationX, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.orientationY, nativePannerNode.orientationY, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.orientationZ, nativePannerNode.orientationZ, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.positionX, nativePannerNode.positionX, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.positionY, nativePannerNode.positionY, trace);
                    await connectAudioParam(nativeOfflineAudioContext, proxy.positionZ, nativePannerNode.positionZ, trace);
                }
                if (isNativeAudioNodeFaker(nativePannerNode)) {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativePannerNode.inputs[0], trace);
                }
                else {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativePannerNode, trace);
                }
                return nativePannerNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeGainNodeOrNativePannerNode = renderedNativeAudioNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeGainNodeOrNativePannerNode !== undefined) {
                        return Promise.resolve(renderedNativeGainNodeOrNativePannerNode);
                    }
                    return createAudioNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const DEFAULT_OPTIONS$f = {
        disableNormalization: false
    };
    const createPeriodicWaveConstructor = (createNativePeriodicWave, getNativeContext, periodicWaveStore, sanitizePeriodicWaveOptions) => {
        return class PeriodicWave {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = sanitizePeriodicWaveOptions({ ...DEFAULT_OPTIONS$f, ...options });
                const periodicWave = createNativePeriodicWave(nativeContext, mergedOptions);
                periodicWaveStore.add(periodicWave);
                // This does violate all good pratices but it is used here to simplify the handling of periodic waves.
                return periodicWave;
            }
            static [Symbol.hasInstance](instance) {
                return ((instance !== null && typeof instance === 'object' && Object.getPrototypeOf(instance) === PeriodicWave.prototype) ||
                    periodicWaveStore.has(instance));
            }
        };
    };

    const createRenderAutomation = (getAudioParamRenderer, renderInputsOfAudioParam) => {
        return (nativeOfflineAudioContext, audioParam, nativeAudioParam, trace) => {
            const audioParamRenderer = getAudioParamRenderer(audioParam);
            audioParamRenderer.replay(nativeAudioParam);
            return renderInputsOfAudioParam(audioParam, nativeOfflineAudioContext, nativeAudioParam, trace);
        };
    };

    const createRenderInputsOfAudioNode = (getAudioNodeConnections, getAudioNodeRenderer, isPartOfACycle) => {
        return async (audioNode, nativeOfflineAudioContext, nativeAudioNode, trace) => {
            const audioNodeConnections = getAudioNodeConnections(audioNode);
            const nextTrace = [...trace, audioNode];
            await Promise.all(audioNodeConnections.activeInputs
                .map((connections, input) => Array.from(connections)
                .filter(([source]) => !nextTrace.includes(source))
                .map(async ([source, output]) => {
                const audioNodeRenderer = getAudioNodeRenderer(source);
                const renderedNativeAudioNode = await audioNodeRenderer.render(source, nativeOfflineAudioContext, nextTrace);
                const destination = audioNode.context.destination;
                if (!isPartOfACycle(source) && (audioNode !== destination || !isPartOfACycle(audioNode))) {
                    renderedNativeAudioNode.connect(nativeAudioNode, output, input);
                }
            }))
                .reduce((allRenderingPromises, renderingPromises) => [...allRenderingPromises, ...renderingPromises], []));
        };
    };

    const createRenderInputsOfAudioParam = (getAudioNodeRenderer, getAudioParamConnections, isPartOfACycle) => {
        return async (audioParam, nativeOfflineAudioContext, nativeAudioParam, trace) => {
            const audioParamConnections = getAudioParamConnections(audioParam);
            await Promise.all(Array.from(audioParamConnections.activeInputs).map(async ([source, output]) => {
                const audioNodeRenderer = getAudioNodeRenderer(source);
                const renderedNativeAudioNode = await audioNodeRenderer.render(source, nativeOfflineAudioContext, trace);
                if (!isPartOfACycle(source)) {
                    renderedNativeAudioNode.connect(nativeAudioParam, output);
                }
            }));
        };
    };

    const createRenderNativeOfflineAudioContext = (cacheTestResult, createNativeGainNode, createNativeScriptProcessorNode, testOfflineAudioContextCurrentTimeSupport) => {
        return (nativeOfflineAudioContext) => {
            // Bug #21: Safari does not support promises yet.
            if (cacheTestResult(testPromiseSupport, () => testPromiseSupport(nativeOfflineAudioContext))) {
                // Bug #158: Chrome and Edge do not advance currentTime if it is not accessed while rendering the audio.
                return Promise.resolve(cacheTestResult(testOfflineAudioContextCurrentTimeSupport, testOfflineAudioContextCurrentTimeSupport)).then((isOfflineAudioContextCurrentTimeSupported) => {
                    if (!isOfflineAudioContextCurrentTimeSupported) {
                        const scriptProcessorNode = createNativeScriptProcessorNode(nativeOfflineAudioContext, 512, 0, 1);
                        nativeOfflineAudioContext.oncomplete = () => {
                            scriptProcessorNode.onaudioprocess = null; // tslint:disable-line:deprecation
                            scriptProcessorNode.disconnect();
                        };
                        scriptProcessorNode.onaudioprocess = () => nativeOfflineAudioContext.currentTime; // tslint:disable-line:deprecation
                        scriptProcessorNode.connect(nativeOfflineAudioContext.destination);
                    }
                    return nativeOfflineAudioContext.startRendering();
                });
            }
            return new Promise((resolve) => {
                // Bug #48: Safari does not render an OfflineAudioContext without any connected node.
                const gainNode = createNativeGainNode(nativeOfflineAudioContext, {
                    channelCount: 1,
                    channelCountMode: 'explicit',
                    channelInterpretation: 'discrete',
                    gain: 0
                });
                nativeOfflineAudioContext.oncomplete = (event) => {
                    gainNode.disconnect();
                    resolve(event.renderedBuffer);
                };
                gainNode.connect(nativeOfflineAudioContext.destination);
                nativeOfflineAudioContext.startRendering();
            });
        };
    };

    const createSetAudioNodeTailTime = (audioNodeTailTimeStore) => {
        return (audioNode, tailTime) => audioNodeTailTimeStore.set(audioNode, tailTime);
    };

    const DEFAULT_OPTIONS$g = {
        channelCount: 2,
        /*
         * Bug #105: The channelCountMode should be 'clamped-max' according to the spec but is set to 'explicit' to achieve consistent
         * behavior.
         */
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
        pan: 0
    };
    const createStereoPannerNodeConstructor = (audioNodeConstructor, createAudioParam, createNativeStereoPannerNode, createStereoPannerNodeRenderer, getNativeContext, isNativeOfflineAudioContext) => {
        return class StereoPannerNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$g, ...options };
                const nativeStereoPannerNode = createNativeStereoPannerNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const stereoPannerNodeRenderer = (isOffline ? createStereoPannerNodeRenderer() : null);
                super(context, false, nativeStereoPannerNode, stereoPannerNodeRenderer);
                this._pan = createAudioParam(this, isOffline, nativeStereoPannerNode.pan);
            }
            get pan() {
                return this._pan;
            }
        };
    };

    const createStereoPannerNodeRendererFactory = (connectAudioParam, createNativeStereoPannerNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeStereoPannerNodes = new WeakMap();
            const createStereoPannerNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeStereoPannerNode = getNativeAudioNode(proxy);
                /*
                 * If the initially used nativeStereoPannerNode was not constructed on the same OfflineAudioContext it needs to be created
                 * again.
                 */
                const nativeStereoPannerNodeIsOwnedByContext = isOwnedByContext(nativeStereoPannerNode, nativeOfflineAudioContext);
                if (!nativeStereoPannerNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeStereoPannerNode.channelCount,
                        channelCountMode: nativeStereoPannerNode.channelCountMode,
                        channelInterpretation: nativeStereoPannerNode.channelInterpretation,
                        pan: nativeStereoPannerNode.pan.value
                    };
                    nativeStereoPannerNode = createNativeStereoPannerNode(nativeOfflineAudioContext, options);
                }
                renderedNativeStereoPannerNodes.set(nativeOfflineAudioContext, nativeStereoPannerNode);
                if (!nativeStereoPannerNodeIsOwnedByContext) {
                    await renderAutomation(nativeOfflineAudioContext, proxy.pan, nativeStereoPannerNode.pan, trace);
                }
                else {
                    await connectAudioParam(nativeOfflineAudioContext, proxy.pan, nativeStereoPannerNode.pan, trace);
                }
                if (isNativeAudioNodeFaker(nativeStereoPannerNode)) {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeStereoPannerNode.inputs[0], trace);
                }
                else {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeStereoPannerNode, trace);
                }
                return nativeStereoPannerNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeStereoPannerNode = renderedNativeStereoPannerNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeStereoPannerNode !== undefined) {
                        return Promise.resolve(renderedNativeStereoPannerNode);
                    }
                    return createStereoPannerNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    // Bug #33: Safari exposes an AudioBuffer but it can't be used as a constructor.
    const createTestAudioBufferConstructorSupport = (nativeAudioBufferConstructor) => {
        return () => {
            if (nativeAudioBufferConstructor === null) {
                return false;
            }
            try {
                new nativeAudioBufferConstructor({ length: 1, sampleRate: 44100 }); // tslint:disable-line:no-unused-expression
            }
            catch {
                return false;
            }
            return true;
        };
    };

    // Bug #179: Firefox does not allow to transfer any buffer which has been passed to the process() method as an argument.
    const createTestAudioWorkletProcessorPostMessageSupport = (nativeAudioWorkletNodeConstructor, nativeOfflineAudioContextConstructor) => {
        return async () => {
            // Bug #61: If there is no native AudioWorkletNode it gets faked and therefore it is no problem if the it doesn't exist.
            if (nativeAudioWorkletNodeConstructor === null) {
                return true;
            }
            if (nativeOfflineAudioContextConstructor === null) {
                return false;
            }
            const blob = new Blob(['class A extends AudioWorkletProcessor{process(i){this.port.postMessage(i,[i[0][0].buffer])}}registerProcessor("a",A)'], {
                type: 'application/javascript; charset=utf-8'
            });
            const offlineAudioContext = new nativeOfflineAudioContextConstructor(1, 128, 8000);
            const url = URL.createObjectURL(blob);
            let isEmittingMessageEvents = false;
            let isEmittingProcessorErrorEvents = false;
            try {
                await offlineAudioContext.audioWorklet.addModule(url);
                const audioWorkletNode = new nativeAudioWorkletNodeConstructor(offlineAudioContext, 'a', { numberOfOutputs: 0 });
                const oscillator = offlineAudioContext.createOscillator();
                audioWorkletNode.port.onmessage = () => (isEmittingMessageEvents = true);
                audioWorkletNode.onprocessorerror = () => (isEmittingProcessorErrorEvents = true);
                oscillator.connect(audioWorkletNode);
                await offlineAudioContext.startRendering();
            }
            catch {
                // Ignore errors.
            }
            finally {
                URL.revokeObjectURL(url);
            }
            return isEmittingMessageEvents && !isEmittingProcessorErrorEvents;
        };
    };

    const createTestOfflineAudioContextCurrentTimeSupport = (createNativeGainNode, nativeOfflineAudioContextConstructor) => {
        return () => {
            if (nativeOfflineAudioContextConstructor === null) {
                return Promise.resolve(false);
            }
            const nativeOfflineAudioContext = new nativeOfflineAudioContextConstructor(1, 1, 44100);
            // Bug #48: Safari does not render an OfflineAudioContext without any connected node.
            const gainNode = createNativeGainNode(nativeOfflineAudioContext, {
                channelCount: 1,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete',
                gain: 0
            });
            // Bug #21: Safari does not support promises yet.
            return new Promise((resolve) => {
                nativeOfflineAudioContext.oncomplete = () => {
                    gainNode.disconnect();
                    resolve(nativeOfflineAudioContext.currentTime !== 0);
                };
                nativeOfflineAudioContext.startRendering();
            });
        };
    };

    const createUnknownError = () => new DOMException('', 'UnknownError');

    const DEFAULT_OPTIONS$h = {
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        curve: null,
        oversample: 'none'
    };
    const createWaveShaperNodeConstructor = (audioNodeConstructor, createInvalidStateError, createNativeWaveShaperNode, createWaveShaperNodeRenderer, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime) => {
        return class WaveShaperNode extends audioNodeConstructor {
            constructor(context, options) {
                const nativeContext = getNativeContext(context);
                const mergedOptions = { ...DEFAULT_OPTIONS$h, ...options };
                const nativeWaveShaperNode = createNativeWaveShaperNode(nativeContext, mergedOptions);
                const isOffline = isNativeOfflineAudioContext(nativeContext);
                const waveShaperNodeRenderer = (isOffline ? createWaveShaperNodeRenderer() : null);
                // @todo Add a mechanism to only switch a WaveShaperNode to active while it is connected.
                super(context, true, nativeWaveShaperNode, waveShaperNodeRenderer);
                this._isCurveNullified = false;
                this._nativeWaveShaperNode = nativeWaveShaperNode;
                // @todo Determine a meaningful tail-time instead of just using one second.
                setAudioNodeTailTime(this, 1);
            }
            get curve() {
                if (this._isCurveNullified) {
                    return null;
                }
                return this._nativeWaveShaperNode.curve;
            }
            set curve(value) {
                // Bug #103: Safari does not allow to set the curve to null.
                if (value === null) {
                    this._isCurveNullified = true;
                    this._nativeWaveShaperNode.curve = new Float32Array([0, 0]);
                }
                else {
                    // Bug #102: Safari does not throw an InvalidStateError when the curve has less than two samples.
                    // Bug #104: Chrome, Edge and Opera will throw an InvalidAccessError when the curve has less than two samples.
                    if (value.length < 2) {
                        throw createInvalidStateError();
                    }
                    this._isCurveNullified = false;
                    this._nativeWaveShaperNode.curve = value;
                }
            }
            get oversample() {
                return this._nativeWaveShaperNode.oversample;
            }
            set oversample(value) {
                this._nativeWaveShaperNode.oversample = value;
            }
        };
    };

    const createWaveShaperNodeRendererFactory = (createNativeWaveShaperNode, getNativeAudioNode, renderInputsOfAudioNode) => {
        return () => {
            const renderedNativeWaveShaperNodes = new WeakMap();
            const createWaveShaperNode = async (proxy, nativeOfflineAudioContext, trace) => {
                let nativeWaveShaperNode = getNativeAudioNode(proxy);
                // If the initially used nativeWaveShaperNode was not constructed on the same OfflineAudioContext it needs to be created again.
                const nativeWaveShaperNodeIsOwnedByContext = isOwnedByContext(nativeWaveShaperNode, nativeOfflineAudioContext);
                if (!nativeWaveShaperNodeIsOwnedByContext) {
                    const options = {
                        channelCount: nativeWaveShaperNode.channelCount,
                        channelCountMode: nativeWaveShaperNode.channelCountMode,
                        channelInterpretation: nativeWaveShaperNode.channelInterpretation,
                        curve: nativeWaveShaperNode.curve,
                        oversample: nativeWaveShaperNode.oversample
                    };
                    nativeWaveShaperNode = createNativeWaveShaperNode(nativeOfflineAudioContext, options);
                }
                renderedNativeWaveShaperNodes.set(nativeOfflineAudioContext, nativeWaveShaperNode);
                if (isNativeAudioNodeFaker(nativeWaveShaperNode)) {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeWaveShaperNode.inputs[0], trace);
                }
                else {
                    await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeWaveShaperNode, trace);
                }
                return nativeWaveShaperNode;
            };
            return {
                render(proxy, nativeOfflineAudioContext, trace) {
                    const renderedNativeWaveShaperNode = renderedNativeWaveShaperNodes.get(nativeOfflineAudioContext);
                    if (renderedNativeWaveShaperNode !== undefined) {
                        return Promise.resolve(renderedNativeWaveShaperNode);
                    }
                    return createWaveShaperNode(proxy, nativeOfflineAudioContext, trace);
                }
            };
        };
    };

    const createWindow = () => (typeof window === 'undefined' ? null : window);

    const createWrapAudioBufferCopyChannelMethods = (convertNumberToUnsignedLong, createIndexSizeError) => {
        return (audioBuffer) => {
            audioBuffer.copyFromChannel = (destination, channelNumberAsNumber, bufferOffsetAsNumber = 0) => {
                const bufferOffset = convertNumberToUnsignedLong(bufferOffsetAsNumber);
                const channelNumber = convertNumberToUnsignedLong(channelNumberAsNumber);
                if (channelNumber >= audioBuffer.numberOfChannels) {
                    throw createIndexSizeError();
                }
                const audioBufferLength = audioBuffer.length;
                const channelData = audioBuffer.getChannelData(channelNumber);
                const destinationLength = destination.length;
                for (let i = bufferOffset < 0 ? -bufferOffset : 0; i + bufferOffset < audioBufferLength && i < destinationLength; i += 1) {
                    destination[i] = channelData[i + bufferOffset];
                }
            };
            audioBuffer.copyToChannel = (source, channelNumberAsNumber, bufferOffsetAsNumber = 0) => {
                const bufferOffset = convertNumberToUnsignedLong(bufferOffsetAsNumber);
                const channelNumber = convertNumberToUnsignedLong(channelNumberAsNumber);
                if (channelNumber >= audioBuffer.numberOfChannels) {
                    throw createIndexSizeError();
                }
                const audioBufferLength = audioBuffer.length;
                const channelData = audioBuffer.getChannelData(channelNumber);
                const sourceLength = source.length;
                for (let i = bufferOffset < 0 ? -bufferOffset : 0; i + bufferOffset < audioBufferLength && i < sourceLength; i += 1) {
                    channelData[i + bufferOffset] = source[i];
                }
            };
        };
    };

    const createWrapAudioBufferCopyChannelMethodsOutOfBounds = (convertNumberToUnsignedLong) => {
        return (audioBuffer) => {
            audioBuffer.copyFromChannel = ((copyFromChannel) => {
                return (destination, channelNumberAsNumber, bufferOffsetAsNumber = 0) => {
                    const bufferOffset = convertNumberToUnsignedLong(bufferOffsetAsNumber);
                    const channelNumber = convertNumberToUnsignedLong(channelNumberAsNumber);
                    if (bufferOffset < audioBuffer.length) {
                        return copyFromChannel.call(audioBuffer, destination, channelNumber, bufferOffset);
                    }
                };
            })(audioBuffer.copyFromChannel);
            audioBuffer.copyToChannel = ((copyToChannel) => {
                return (source, channelNumberAsNumber, bufferOffsetAsNumber = 0) => {
                    const bufferOffset = convertNumberToUnsignedLong(bufferOffsetAsNumber);
                    const channelNumber = convertNumberToUnsignedLong(channelNumberAsNumber);
                    if (bufferOffset < audioBuffer.length) {
                        return copyToChannel.call(audioBuffer, source, channelNumber, bufferOffset);
                    }
                };
            })(audioBuffer.copyToChannel);
        };
    };

    const createWrapAudioBufferSourceNodeStopMethodNullifiedBuffer = (overwriteAccessors) => {
        return (nativeAudioBufferSourceNode, nativeContext) => {
            const nullifiedBuffer = nativeContext.createBuffer(1, 1, 44100);
            if (nativeAudioBufferSourceNode.buffer === null) {
                nativeAudioBufferSourceNode.buffer = nullifiedBuffer;
            }
            overwriteAccessors(nativeAudioBufferSourceNode, 'buffer', (get) => () => {
                const value = get.call(nativeAudioBufferSourceNode);
                return value === nullifiedBuffer ? null : value;
            }, (set) => (value) => {
                return set.call(nativeAudioBufferSourceNode, value === null ? nullifiedBuffer : value);
            });
        };
    };

    const createWrapChannelMergerNode = (createInvalidStateError, monitorConnections) => {
        return (nativeContext, channelMergerNode) => {
            // Bug #15: Safari does not return the default properties.
            channelMergerNode.channelCount = 1;
            channelMergerNode.channelCountMode = 'explicit';
            // Bug #16: Safari does not throw an error when setting a different channelCount or channelCountMode.
            Object.defineProperty(channelMergerNode, 'channelCount', {
                get: () => 1,
                set: () => {
                    throw createInvalidStateError();
                }
            });
            Object.defineProperty(channelMergerNode, 'channelCountMode', {
                get: () => 'explicit',
                set: () => {
                    throw createInvalidStateError();
                }
            });
            // Bug #20: Safari requires a connection of any kind to treat the input signal correctly.
            const audioBufferSourceNode = nativeContext.createBufferSource();
            const whenConnected = () => {
                const length = channelMergerNode.numberOfInputs;
                for (let i = 0; i < length; i += 1) {
                    audioBufferSourceNode.connect(channelMergerNode, 0, i);
                }
            };
            const whenDisconnected = () => audioBufferSourceNode.disconnect(channelMergerNode);
            monitorConnections(channelMergerNode, whenConnected, whenDisconnected);
        };
    };

    const isDCCurve = (curve) => {
        if (curve === null) {
            return false;
        }
        const length = curve.length;
        if (length % 2 !== 0) {
            return curve[Math.floor(length / 2)] !== 0;
        }
        return curve[length / 2 - 1] + curve[length / 2] !== 0;
    };

    const overwriteAccessors = (object, property, createGetter, createSetter) => {
        let prototype = Object.getPrototypeOf(object);
        while (!prototype.hasOwnProperty(property)) {
            prototype = Object.getPrototypeOf(prototype);
        }
        const { get, set } = Object.getOwnPropertyDescriptor(prototype, property);
        Object.defineProperty(object, property, { get: createGetter(get), set: createSetter(set) });
    };

    const sanitizeChannelSplitterOptions = (options) => {
        return { ...options, channelCount: options.numberOfOutputs };
    };

    const sanitizePeriodicWaveOptions = (options) => {
        const { imag, real } = options;
        if (imag === undefined) {
            if (real === undefined) {
                return { ...options, imag: [0, 0], real: [0, 0] };
            }
            return { ...options, imag: Array.from(real, () => 0), real };
        }
        if (real === undefined) {
            return { ...options, imag, real: Array.from(imag, () => 0) };
        }
        return { ...options, imag, real };
    };

    const setValueAtTimeUntilPossible = (audioParam, value, startTime) => {
        try {
            audioParam.setValueAtTime(value, startTime);
        }
        catch (err) {
            if (err.code !== 9) {
                throw err;
            }
            setValueAtTimeUntilPossible(audioParam, value, startTime + 1e-7);
        }
    };

    const testAudioBufferSourceNodeStartMethodConsecutiveCallsSupport = (nativeContext) => {
        const nativeAudioBufferSourceNode = nativeContext.createBufferSource();
        nativeAudioBufferSourceNode.start();
        try {
            nativeAudioBufferSourceNode.start();
        }
        catch {
            return true;
        }
        return false;
    };

    const testAudioBufferSourceNodeStartMethodOffsetClampingSupport = (nativeContext) => {
        const nativeAudioBufferSourceNode = nativeContext.createBufferSource();
        const nativeAudioBuffer = nativeContext.createBuffer(1, 1, 44100);
        nativeAudioBufferSourceNode.buffer = nativeAudioBuffer;
        try {
            nativeAudioBufferSourceNode.start(0, 1);
        }
        catch {
            return false;
        }
        return true;
    };

    const testAudioBufferSourceNodeStopMethodNullifiedBufferSupport = (nativeContext) => {
        const nativeAudioBufferSourceNode = nativeContext.createBufferSource();
        nativeAudioBufferSourceNode.start();
        try {
            nativeAudioBufferSourceNode.stop();
        }
        catch {
            return false;
        }
        return true;
    };

    const testAudioScheduledSourceNodeStartMethodNegativeParametersSupport = (nativeContext) => {
        const nativeAudioBufferSourceNode = nativeContext.createOscillator();
        try {
            nativeAudioBufferSourceNode.start(-1);
        }
        catch (err) {
            return err instanceof RangeError;
        }
        return false;
    };

    const testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport = (nativeContext) => {
        const nativeAudioBuffer = nativeContext.createBuffer(1, 1, 44100);
        const nativeAudioBufferSourceNode = nativeContext.createBufferSource();
        nativeAudioBufferSourceNode.buffer = nativeAudioBuffer;
        nativeAudioBufferSourceNode.start();
        nativeAudioBufferSourceNode.stop();
        try {
            nativeAudioBufferSourceNode.stop();
            return true;
        }
        catch {
            return false;
        }
    };

    const testAudioScheduledSourceNodeStopMethodNegativeParametersSupport = (nativeContext) => {
        const nativeAudioBufferSourceNode = nativeContext.createOscillator();
        try {
            nativeAudioBufferSourceNode.stop(-1);
        }
        catch (err) {
            return err instanceof RangeError;
        }
        return false;
    };

    const wrapAudioBufferSourceNodeStartMethodOffsetClamping = (nativeAudioBufferSourceNode) => {
        nativeAudioBufferSourceNode.start = ((start) => {
            return (when = 0, offset = 0, duration) => {
                const buffer = nativeAudioBufferSourceNode.buffer;
                // Bug #154: Safari does not clamp the offset if it is equal to or greater than the duration of the buffer.
                const clampedOffset = buffer === null ? offset : Math.min(buffer.duration, offset);
                // Bug #155: Safari does not handle the offset correctly if it would cause the buffer to be not be played at all.
                if (buffer !== null && clampedOffset > buffer.duration - 0.5 / nativeAudioBufferSourceNode.context.sampleRate) {
                    start.call(nativeAudioBufferSourceNode, when, 0, 0);
                }
                else {
                    start.call(nativeAudioBufferSourceNode, when, clampedOffset, duration);
                }
            };
        })(nativeAudioBufferSourceNode.start);
    };

    const wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls = (nativeAudioScheduledSourceNode, nativeContext) => {
        const nativeGainNode = nativeContext.createGain();
        nativeAudioScheduledSourceNode.connect(nativeGainNode);
        const disconnectGainNode = ((disconnect) => {
            return () => {
                // @todo TypeScript cannot infer the overloaded signature with 1 argument yet.
                disconnect.call(nativeAudioScheduledSourceNode, nativeGainNode);
                nativeAudioScheduledSourceNode.removeEventListener('ended', disconnectGainNode);
            };
        })(nativeAudioScheduledSourceNode.disconnect);
        nativeAudioScheduledSourceNode.addEventListener('ended', disconnectGainNode);
        interceptConnections(nativeAudioScheduledSourceNode, nativeGainNode);
        nativeAudioScheduledSourceNode.stop = ((stop) => {
            let isStopped = false;
            return (when = 0) => {
                if (isStopped) {
                    try {
                        stop.call(nativeAudioScheduledSourceNode, when);
                    }
                    catch {
                        nativeGainNode.gain.setValueAtTime(0, when);
                    }
                }
                else {
                    stop.call(nativeAudioScheduledSourceNode, when);
                    isStopped = true;
                }
            };
        })(nativeAudioScheduledSourceNode.stop);
    };

    const wrapEventListener = (target, eventListener) => {
        return (event) => {
            const descriptor = { value: target };
            Object.defineProperties(event, {
                currentTarget: descriptor,
                target: descriptor
            });
            if (typeof eventListener === 'function') {
                return eventListener.call(target, event);
            }
            return eventListener.handleEvent.call(target, event);
        };
    };

    const addActiveInputConnectionToAudioNode = createAddActiveInputConnectionToAudioNode(insertElementInSet);
    const addPassiveInputConnectionToAudioNode = createAddPassiveInputConnectionToAudioNode(insertElementInSet);
    const deleteActiveInputConnectionToAudioNode = createDeleteActiveInputConnectionToAudioNode(pickElementFromSet);
    const audioNodeTailTimeStore = new WeakMap();
    const getAudioNodeTailTime = createGetAudioNodeTailTime(audioNodeTailTimeStore);
    const cacheTestResult = createCacheTestResult(new Map(), new WeakMap());
    const window$1 = createWindow();
    const createNativeAnalyserNode = createNativeAnalyserNodeFactory(cacheTestResult, createIndexSizeError);
    const getAudioNodeRenderer = createGetAudioNodeRenderer(getAudioNodeConnections);
    const renderInputsOfAudioNode = createRenderInputsOfAudioNode(getAudioNodeConnections, getAudioNodeRenderer, isPartOfACycle);
    const createAnalyserNodeRenderer = createAnalyserNodeRendererFactory(createNativeAnalyserNode, getNativeAudioNode, renderInputsOfAudioNode);
    const getNativeContext = createGetNativeContext(CONTEXT_STORE);
    const nativeOfflineAudioContextConstructor = createNativeOfflineAudioContextConstructor(window$1);
    const isNativeOfflineAudioContext = createIsNativeOfflineAudioContext(nativeOfflineAudioContextConstructor);
    const audioParamAudioNodeStore = new WeakMap();
    const eventTargetConstructor = createEventTargetConstructor(wrapEventListener);
    const nativeAudioContextConstructor = createNativeAudioContextConstructor(window$1);
    const isNativeAudioContext = createIsNativeAudioContext(nativeAudioContextConstructor);
    const isNativeAudioNode$1 = createIsNativeAudioNode(window$1);
    const isNativeAudioParam = createIsNativeAudioParam(window$1);
    const audioNodeConstructor = createAudioNodeConstructor(createAddAudioNodeConnections(AUDIO_NODE_CONNECTIONS_STORE), createAddConnectionToAudioNode(addActiveInputConnectionToAudioNode, addPassiveInputConnectionToAudioNode, connectNativeAudioNodeToNativeAudioNode, deleteActiveInputConnectionToAudioNode, disconnectNativeAudioNodeFromNativeAudioNode, getAudioNodeConnections, getAudioNodeTailTime, getEventListenersOfAudioNode, getNativeAudioNode, insertElementInSet, isActiveAudioNode, isPartOfACycle, isPassiveAudioNode), cacheTestResult, createIncrementCycleCounterFactory(CYCLE_COUNTERS, disconnectNativeAudioNodeFromNativeAudioNode, getAudioNodeConnections, getNativeAudioNode, getNativeAudioParam, isActiveAudioNode), createIndexSizeError, createInvalidAccessError, createNotSupportedError, createDecrementCycleCounter(connectNativeAudioNodeToNativeAudioNode, CYCLE_COUNTERS, getAudioNodeConnections, getNativeAudioNode, getNativeAudioParam, getNativeContext, isActiveAudioNode, isNativeOfflineAudioContext), createDetectCycles(audioParamAudioNodeStore, getAudioNodeConnections, getValueForKey), eventTargetConstructor, getNativeContext, isNativeAudioContext, isNativeAudioNode$1, isNativeAudioParam, isNativeOfflineAudioContext);
    const analyserNodeConstructor = createAnalyserNodeConstructor(audioNodeConstructor, createAnalyserNodeRenderer, createIndexSizeError, createNativeAnalyserNode, getNativeContext, isNativeOfflineAudioContext);
    const audioBufferStore = new WeakSet();
    const nativeAudioBufferConstructor = createNativeAudioBufferConstructor(window$1);
    const convertNumberToUnsignedLong = createConvertNumberToUnsignedLong(new Uint32Array(1));
    const wrapAudioBufferCopyChannelMethods = createWrapAudioBufferCopyChannelMethods(convertNumberToUnsignedLong, createIndexSizeError);
    const wrapAudioBufferCopyChannelMethodsOutOfBounds = createWrapAudioBufferCopyChannelMethodsOutOfBounds(convertNumberToUnsignedLong);
    const audioBufferConstructor = createAudioBufferConstructor(audioBufferStore, cacheTestResult, createNotSupportedError, nativeAudioBufferConstructor, nativeOfflineAudioContextConstructor, createTestAudioBufferConstructorSupport(nativeAudioBufferConstructor), wrapAudioBufferCopyChannelMethods, wrapAudioBufferCopyChannelMethodsOutOfBounds);
    const addSilentConnection = createAddSilentConnection(createNativeGainNode);
    const renderInputsOfAudioParam = createRenderInputsOfAudioParam(getAudioNodeRenderer, getAudioParamConnections, isPartOfACycle);
    const connectAudioParam = createConnectAudioParam(renderInputsOfAudioParam);
    const createNativeAudioBufferSourceNode = createNativeAudioBufferSourceNodeFactory(addSilentConnection, cacheTestResult, testAudioBufferSourceNodeStartMethodConsecutiveCallsSupport, testAudioBufferSourceNodeStartMethodOffsetClampingSupport, testAudioBufferSourceNodeStopMethodNullifiedBufferSupport, testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport, testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, wrapAudioBufferSourceNodeStartMethodOffsetClamping, createWrapAudioBufferSourceNodeStopMethodNullifiedBuffer(overwriteAccessors), wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls);
    const renderAutomation = createRenderAutomation(createGetAudioParamRenderer(getAudioParamConnections), renderInputsOfAudioParam);
    const createAudioBufferSourceNodeRenderer = createAudioBufferSourceNodeRendererFactory(connectAudioParam, createNativeAudioBufferSourceNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const createAudioParam = createAudioParamFactory(createAddAudioParamConnections(AUDIO_PARAM_CONNECTIONS_STORE), audioParamAudioNodeStore, AUDIO_PARAM_STORE, createAudioParamRenderer, createCancelAndHoldAutomationEvent, createCancelScheduledValuesAutomationEvent, createExponentialRampToValueAutomationEvent, createLinearRampToValueAutomationEvent, createSetTargetAutomationEvent, createSetValueAutomationEvent, createSetValueCurveAutomationEvent, nativeAudioContextConstructor, setValueAtTimeUntilPossible);
    const audioBufferSourceNodeConstructor = createAudioBufferSourceNodeConstructor(audioNodeConstructor, createAudioBufferSourceNodeRenderer, createAudioParam, createInvalidStateError, createNativeAudioBufferSourceNode, getNativeContext, isNativeOfflineAudioContext, wrapEventListener);
    const audioDestinationNodeConstructor = createAudioDestinationNodeConstructor(audioNodeConstructor, createAudioDestinationNodeRenderer, createIndexSizeError, createInvalidStateError, createNativeAudioDestinationNodeFactory(createNativeGainNode, overwriteAccessors), getNativeContext, isNativeOfflineAudioContext, renderInputsOfAudioNode);
    const createBiquadFilterNodeRenderer = createBiquadFilterNodeRendererFactory(connectAudioParam, createNativeBiquadFilterNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const setAudioNodeTailTime = createSetAudioNodeTailTime(audioNodeTailTimeStore);
    const biquadFilterNodeConstructor = createBiquadFilterNodeConstructor(audioNodeConstructor, createAudioParam, createBiquadFilterNodeRenderer, createInvalidAccessError, createNativeBiquadFilterNode, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const monitorConnections = createMonitorConnections(insertElementInSet, isNativeAudioNode$1);
    const wrapChannelMergerNode = createWrapChannelMergerNode(createInvalidStateError, monitorConnections);
    const createNativeChannelMergerNode = createNativeChannelMergerNodeFactory(nativeAudioContextConstructor, wrapChannelMergerNode);
    const createChannelMergerNodeRenderer = createChannelMergerNodeRendererFactory(createNativeChannelMergerNode, getNativeAudioNode, renderInputsOfAudioNode);
    const channelMergerNodeConstructor = createChannelMergerNodeConstructor(audioNodeConstructor, createChannelMergerNodeRenderer, createNativeChannelMergerNode, getNativeContext, isNativeOfflineAudioContext);
    const createChannelSplitterNodeRenderer = createChannelSplitterNodeRendererFactory(createNativeChannelSplitterNode, getNativeAudioNode, renderInputsOfAudioNode);
    const channelSplitterNodeConstructor = createChannelSplitterNodeConstructor(audioNodeConstructor, createChannelSplitterNodeRenderer, createNativeChannelSplitterNode, getNativeContext, isNativeOfflineAudioContext, sanitizeChannelSplitterOptions);
    const createNativeConstantSourceNodeFaker = createNativeConstantSourceNodeFakerFactory(addSilentConnection, createNativeAudioBufferSourceNode, createNativeGainNode, monitorConnections);
    const createNativeConstantSourceNode = createNativeConstantSourceNodeFactory(addSilentConnection, cacheTestResult, createNativeConstantSourceNodeFaker, testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, testAudioScheduledSourceNodeStopMethodNegativeParametersSupport);
    const createConstantSourceNodeRenderer = createConstantSourceNodeRendererFactory(connectAudioParam, createNativeConstantSourceNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const constantSourceNodeConstructor = createConstantSourceNodeConstructor(audioNodeConstructor, createAudioParam, createConstantSourceNodeRenderer, createNativeConstantSourceNode, getNativeContext, isNativeOfflineAudioContext, wrapEventListener);
    const createNativeConvolverNode = createNativeConvolverNodeFactory(createNotSupportedError, overwriteAccessors);
    const createConvolverNodeRenderer = createConvolverNodeRendererFactory(createNativeConvolverNode, getNativeAudioNode, renderInputsOfAudioNode);
    const convolverNodeConstructor = createConvolverNodeConstructor(audioNodeConstructor, createConvolverNodeRenderer, createNativeConvolverNode, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const createDelayNodeRenderer = createDelayNodeRendererFactory(connectAudioParam, createNativeDelayNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const delayNodeConstructor = createDelayNodeConstructor(audioNodeConstructor, createAudioParam, createDelayNodeRenderer, createNativeDelayNode, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const createNativeDynamicsCompressorNode = createNativeDynamicsCompressorNodeFactory(createNotSupportedError);
    const createDynamicsCompressorNodeRenderer = createDynamicsCompressorNodeRendererFactory(connectAudioParam, createNativeDynamicsCompressorNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const dynamicsCompressorNodeConstructor = createDynamicsCompressorNodeConstructor(audioNodeConstructor, createAudioParam, createDynamicsCompressorNodeRenderer, createNativeDynamicsCompressorNode, createNotSupportedError, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const createGainNodeRenderer = createGainNodeRendererFactory(connectAudioParam, createNativeGainNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const gainNodeConstructor = createGainNodeConstructor(audioNodeConstructor, createAudioParam, createGainNodeRenderer, createNativeGainNode, getNativeContext, isNativeOfflineAudioContext);
    const createNativeIIRFilterNodeFaker = createNativeIIRFilterNodeFakerFactory(createInvalidAccessError, createInvalidStateError, createNativeScriptProcessorNode, createNotSupportedError);
    const renderNativeOfflineAudioContext = createRenderNativeOfflineAudioContext(cacheTestResult, createNativeGainNode, createNativeScriptProcessorNode, createTestOfflineAudioContextCurrentTimeSupport(createNativeGainNode, nativeOfflineAudioContextConstructor));
    const createIIRFilterNodeRenderer = createIIRFilterNodeRendererFactory(createNativeAudioBufferSourceNode, getNativeAudioNode, nativeOfflineAudioContextConstructor, renderInputsOfAudioNode, renderNativeOfflineAudioContext);
    const createNativeIIRFilterNode = createNativeIIRFilterNodeFactory(createNativeIIRFilterNodeFaker);
    const iIRFilterNodeConstructor = createIIRFilterNodeConstructor(audioNodeConstructor, createNativeIIRFilterNode, createIIRFilterNodeRenderer, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const createAudioListener = createAudioListenerFactory(createAudioParam, createNativeChannelMergerNode, createNativeConstantSourceNode, createNativeScriptProcessorNode, isNativeOfflineAudioContext);
    const unrenderedAudioWorkletNodeStore = new WeakMap();
    const minimalBaseAudioContextConstructor = createMinimalBaseAudioContextConstructor(audioDestinationNodeConstructor, createAudioListener, eventTargetConstructor, isNativeOfflineAudioContext, unrenderedAudioWorkletNodeStore, wrapEventListener);
    const createNativeOscillatorNode = createNativeOscillatorNodeFactory(addSilentConnection, cacheTestResult, testAudioScheduledSourceNodeStartMethodNegativeParametersSupport, testAudioScheduledSourceNodeStopMethodConsecutiveCallsSupport, testAudioScheduledSourceNodeStopMethodNegativeParametersSupport, wrapAudioScheduledSourceNodeStopMethodConsecutiveCalls);
    const createOscillatorNodeRenderer = createOscillatorNodeRendererFactory(connectAudioParam, createNativeOscillatorNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const oscillatorNodeConstructor = createOscillatorNodeConstructor(audioNodeConstructor, createAudioParam, createNativeOscillatorNode, createOscillatorNodeRenderer, getNativeContext, isNativeOfflineAudioContext, wrapEventListener);
    const createConnectedNativeAudioBufferSourceNode = createConnectedNativeAudioBufferSourceNodeFactory(createNativeAudioBufferSourceNode);
    const createNativeWaveShaperNodeFaker = createNativeWaveShaperNodeFakerFactory(createConnectedNativeAudioBufferSourceNode, createInvalidStateError, createNativeGainNode, isDCCurve, monitorConnections);
    const createNativeWaveShaperNode = createNativeWaveShaperNodeFactory(createConnectedNativeAudioBufferSourceNode, createInvalidStateError, createNativeWaveShaperNodeFaker, isDCCurve, monitorConnections, nativeAudioContextConstructor, overwriteAccessors);
    const createNativePannerNodeFaker = createNativePannerNodeFakerFactory(connectNativeAudioNodeToNativeAudioNode, createInvalidStateError, createNativeChannelMergerNode, createNativeGainNode, createNativeScriptProcessorNode, createNativeWaveShaperNode, createNotSupportedError, disconnectNativeAudioNodeFromNativeAudioNode, monitorConnections);
    const createNativePannerNode = createNativePannerNodeFactory(createNativePannerNodeFaker);
    const createPannerNodeRenderer = createPannerNodeRendererFactory(connectAudioParam, createNativeChannelMergerNode, createNativeConstantSourceNode, createNativeGainNode, createNativePannerNode, getNativeAudioNode, nativeOfflineAudioContextConstructor, renderAutomation, renderInputsOfAudioNode, renderNativeOfflineAudioContext);
    const pannerNodeConstructor = createPannerNodeConstructor(audioNodeConstructor, createAudioParam, createNativePannerNode, createPannerNodeRenderer, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const createNativePeriodicWave = createNativePeriodicWaveFactory(createIndexSizeError);
    const periodicWaveConstructor = createPeriodicWaveConstructor(createNativePeriodicWave, getNativeContext, new WeakSet(), sanitizePeriodicWaveOptions);
    const nativeStereoPannerNodeFakerFactory = createNativeStereoPannerNodeFakerFactory(createNativeChannelMergerNode, createNativeChannelSplitterNode, createNativeGainNode, createNativeWaveShaperNode, createNotSupportedError, monitorConnections);
    const createNativeStereoPannerNode = createNativeStereoPannerNodeFactory(nativeStereoPannerNodeFakerFactory, createNotSupportedError);
    const createStereoPannerNodeRenderer = createStereoPannerNodeRendererFactory(connectAudioParam, createNativeStereoPannerNode, getNativeAudioNode, renderAutomation, renderInputsOfAudioNode);
    const stereoPannerNodeConstructor = createStereoPannerNodeConstructor(audioNodeConstructor, createAudioParam, createNativeStereoPannerNode, createStereoPannerNodeRenderer, getNativeContext, isNativeOfflineAudioContext);
    const createWaveShaperNodeRenderer = createWaveShaperNodeRendererFactory(createNativeWaveShaperNode, getNativeAudioNode, renderInputsOfAudioNode);
    const waveShaperNodeConstructor = createWaveShaperNodeConstructor(audioNodeConstructor, createInvalidStateError, createNativeWaveShaperNode, createWaveShaperNodeRenderer, getNativeContext, isNativeOfflineAudioContext, setAudioNodeTailTime);
    const isSecureContext = createIsSecureContext(window$1);
    const exposeCurrentFrameAndCurrentTime = createExposeCurrentFrameAndCurrentTime(window$1);
    const backupOfflineAudioContextStore = new WeakMap();
    const getOrCreateBackupOfflineAudioContext = createGetOrCreateBackupOfflineAudioContext(backupOfflineAudioContextStore, nativeOfflineAudioContextConstructor);
    const nativeAudioWorkletNodeConstructor = createNativeAudioWorkletNodeConstructor(window$1);
    // The addAudioWorkletModule() function is only available in a SecureContext.
    const addAudioWorkletModule = isSecureContext
        ? createAddAudioWorkletModule(cacheTestResult, createNotSupportedError, createEvaluateSource(window$1), exposeCurrentFrameAndCurrentTime, createFetchSource(createAbortError), getNativeContext, getOrCreateBackupOfflineAudioContext, isNativeOfflineAudioContext, new WeakMap(), new WeakMap(), createTestAudioWorkletProcessorPostMessageSupport(nativeAudioWorkletNodeConstructor, nativeOfflineAudioContextConstructor), 
        // @todo window is guaranteed to be defined because isSecureContext checks that as well.
        window$1)
        : undefined;
    const isNativeContext = createIsNativeContext(isNativeAudioContext, isNativeOfflineAudioContext);
    const decodeAudioData = createDecodeAudioData(audioBufferStore, cacheTestResult, createDataCloneError, createEncodingError, new WeakSet(), getNativeContext, isNativeContext, testAudioBufferCopyChannelMethodsOutOfBoundsSupport, testPromiseSupport, wrapAudioBufferCopyChannelMethods, wrapAudioBufferCopyChannelMethodsOutOfBounds);
    const baseAudioContextConstructor = createBaseAudioContextConstructor(addAudioWorkletModule, analyserNodeConstructor, audioBufferConstructor, audioBufferSourceNodeConstructor, biquadFilterNodeConstructor, channelMergerNodeConstructor, channelSplitterNodeConstructor, constantSourceNodeConstructor, convolverNodeConstructor, decodeAudioData, delayNodeConstructor, dynamicsCompressorNodeConstructor, gainNodeConstructor, iIRFilterNodeConstructor, minimalBaseAudioContextConstructor, oscillatorNodeConstructor, pannerNodeConstructor, periodicWaveConstructor, stereoPannerNodeConstructor, waveShaperNodeConstructor);
    const mediaElementAudioSourceNodeConstructor = createMediaElementAudioSourceNodeConstructor(audioNodeConstructor, createNativeMediaElementAudioSourceNode, getNativeContext, isNativeOfflineAudioContext);
    const mediaStreamAudioDestinationNodeConstructor = createMediaStreamAudioDestinationNodeConstructor(audioNodeConstructor, createNativeMediaStreamAudioDestinationNode, getNativeContext, isNativeOfflineAudioContext);
    const mediaStreamAudioSourceNodeConstructor = createMediaStreamAudioSourceNodeConstructor(audioNodeConstructor, createNativeMediaStreamAudioSourceNode, getNativeContext, isNativeOfflineAudioContext);
    const createNativeMediaStreamTrackAudioSourceNode = createNativeMediaStreamTrackAudioSourceNodeFactory(createInvalidStateError, isNativeOfflineAudioContext);
    const mediaStreamTrackAudioSourceNodeConstructor = createMediaStreamTrackAudioSourceNodeConstructor(audioNodeConstructor, createNativeMediaStreamTrackAudioSourceNode, getNativeContext);
    const audioContextConstructor = createAudioContextConstructor(baseAudioContextConstructor, createInvalidStateError, createNotSupportedError, createUnknownError, mediaElementAudioSourceNodeConstructor, mediaStreamAudioDestinationNodeConstructor, mediaStreamAudioSourceNodeConstructor, mediaStreamTrackAudioSourceNodeConstructor, nativeAudioContextConstructor);

    /**
     * @module movie
     */
    var MovieOptions = /** @class */ (function () {
        function MovieOptions() {
        }
        return MovieOptions;
    }());
    /**
     * The movie contains everything included in the render.
     *
     * Implements a pub/sub system.
     */
    // TODO: Implement event "durationchange", and more
    // TODO: Add width and height options
    // TODO: Make record option to make recording video output to the user while
    // it's recording
    // TODO: rename renderingFrame -> refreshing
    var Movie = /** @class */ (function () {
        /**
         * Creates a new movie.
         */
        function Movie(options) {
            // TODO: move into multiple methods!
            // Set actx option manually, because it's readonly.
            this.actx = options.actx || options.audioContext || new audioContextConstructor();
            delete options.actx;
            // Proxy that will be returned by constructor
            var newThis = watchPublic(this);
            // Set canvas option manually, because it's readonly.
            this._canvas = options.canvas;
            delete options.canvas;
            // Don't send updates when initializing, so use this instead of newThis:
            this._cctx = this.canvas.getContext('2d'); // TODO: make private?
            applyOptions(options, this);
            var that = newThis;
            this._effectsBack = [];
            this.effects = new Proxy(newThis._effectsBack, {
                deleteProperty: function (target, property) {
                    // Refresh screen when effect is removed, if the movie isn't playing
                    // already.
                    var value = target[property];
                    value.tryDetach();
                    delete target[property];
                    publish(that, 'movie.change.effect.remove', { effect: value });
                    return true;
                },
                set: function (target, property, value) {
                    // Check if property is an number (an index)
                    if (!isNaN(Number(property))) {
                        if (target[property]) {
                            publish(that, 'movie.change.effect.remove', {
                                effect: target[property]
                            });
                            target[property].tryDetach();
                        }
                        // Attach effect to movie
                        value.tryAttach(that);
                        target[property] = value;
                        // Refresh screen when effect is set, if the movie isn't playing
                        // already.
                        publish(that, 'movie.change.effect.add', { effect: value });
                    }
                    else {
                        target[property] = value;
                    }
                    return true;
                }
            });
            this._layersBack = [];
            this.layers = new Proxy(newThis._layersBack, {
                deleteProperty: function (target, property) {
                    var oldDuration = this.duration;
                    var value = target[property];
                    value.tryDetach(that);
                    delete target[property];
                    var current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration;
                    if (current)
                        publish(that, 'movie.change.layer.remove', { layer: value });
                    publish(that, 'movie.change.duration', { oldDuration: oldDuration });
                    return true;
                },
                set: function (target, property, value) {
                    var oldDuration = this.duration;
                    // Check if property is an number (an index)
                    if (!isNaN(Number(property))) {
                        if (target[property]) {
                            publish(that, 'movie.change.layer.remove', {
                                layer: target[property]
                            });
                            target[property].tryDetach();
                        }
                        // Attach layer to movie
                        value.tryAttach(that);
                        target[property] = value;
                        // Refresh screen when a relevant layer is added or removed
                        var current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration;
                        if (current)
                            publish(that, 'movie.change.layer.add', { layer: value });
                        publish(that, 'movie.change.duration', { oldDuration: oldDuration });
                    }
                    else {
                        target[property] = value;
                    }
                    return true;
                }
            });
            this._paused = true;
            this._ended = false;
            // This variable helps prevent multiple frame-rendering loops at the same
            // time (see `render`). It's only applicable when rendering.
            this._renderingFrame = false;
            this.currentTime = 0;
            // For recording
            this._mediaRecorder = null;
            // -1 works well in inequalities
            // The last time `play` was called
            this._lastPlayed = -1;
            // What was `currentTime` when `play` was called
            this._lastPlayedOffset = -1;
            // newThis._updateInterval = 0.1; // time in seconds between each "timeupdate" event
            // newThis._lastUpdate = -1;
            if (newThis.autoRefresh)
                newThis.refresh(); // render single frame on creation
            // Subscribe to own event "change" (child events propogate up)
            subscribe(newThis, 'movie.change', function () {
                if (newThis.autoRefresh && !newThis.rendering)
                    newThis.refresh();
            });
            // Subscribe to own event "ended"
            subscribe(newThis, 'movie.recordended', function () {
                if (newThis.recording) {
                    newThis._mediaRecorder.requestData();
                    newThis._mediaRecorder.stop();
                }
            });
            return newThis;
        }
        /**
         * Plays the movie
         * @return fulfilled when the movie is done playing, never fails
         */
        Movie.prototype.play = function () {
            var _this = this;
            return new Promise(function (resolve) {
                if (!_this.paused)
                    throw new Error('Already playing');
                _this._paused = _this._ended = false;
                _this._lastPlayed = performance.now();
                _this._lastPlayedOffset = _this.currentTime;
                if (!_this.renderingFrame)
                    // Not rendering (and not playing), so play.
                    _this._render(true, undefined, resolve);
                // Stop rendering frame if currently doing so, because playing has higher
                // priority. This will effect the next _render call.
                _this._renderingFrame = false;
                publish(_this, 'movie.play', {});
            });
        };
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
        // TEST: *support recording that plays back with audio!*
        // TODO: figure out how to do offline recording (faster than realtime).
        // TODO: improve recording performance to increase frame rate?
        Movie.prototype.record = function (options) {
            var _this = this;
            if (options.video === false && options.audio === false)
                throw new Error('Both video and audio cannot be disabled');
            if (!this.paused)
                throw new Error('Cannot record movie while already playing or recording');
            var mimeType = options.type || 'video/webm';
            if (MediaRecorder && MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mimeType))
                throw new Error('Please pass a valid MIME type for the exported video');
            return new Promise(function (resolve, reject) {
                var canvasCache = _this.canvas;
                // Record on a temporary canvas context
                _this._canvas = document.createElement('canvas');
                _this.canvas.width = canvasCache.width;
                _this.canvas.height = canvasCache.height;
                _this._cctx = _this.canvas.getContext('2d');
                // frame blobs
                var recordedChunks = [];
                // Combine image + audio, or just pick one
                var tracks = [];
                if (options.video !== false) {
                    var visualStream = _this.canvas.captureStream(options.frameRate);
                    tracks = tracks.concat(visualStream.getTracks());
                }
                // Check if there's a layer that's an instance of an AudioSourceMixin
                // (Audio or Video)
                var hasMediaTracks = _this.layers.some(function (layer) { return layer instanceof Audio || layer instanceof Video; });
                // If no media tracks present, don't include an audio stream, because
                // Chrome doesn't record silence when an audio stream is present.
                if (hasMediaTracks && options.audio !== false) {
                    var audioDestination = _this.actx.createMediaStreamDestination();
                    var audioStream = audioDestination.stream;
                    tracks = tracks.concat(audioStream.getTracks());
                    publish(_this, 'movie.audiodestinationupdate', { movie: _this, destination: audioDestination });
                }
                var stream = new MediaStream(tracks);
                var mediaRecorderOptions = __assign(__assign({}, (options.mediaRecorderOptions || {})), { mimeType: mimeType });
                var mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
                mediaRecorder.ondataavailable = function (event) {
                    // if (this._paused) reject(new Error("Recording was interrupted"));
                    if (event.data.size > 0)
                        recordedChunks.push(event.data);
                };
                // TODO: publish to movie, not layers
                mediaRecorder.onstop = function () {
                    _this._ended = true;
                    _this._canvas = canvasCache;
                    _this._cctx = _this.canvas.getContext('2d');
                    publish(_this, 'movie.audiodestinationupdate', { movie: _this, destination: _this.actx.destination });
                    _this._mediaRecorder = null;
                    // Construct the exported video out of all the frame blobs.
                    resolve(new Blob(recordedChunks, {
                        type: mimeType
                    }));
                };
                mediaRecorder.onerror = reject;
                mediaRecorder.start();
                _this._mediaRecorder = mediaRecorder;
                _this._recordEndTime = options.duration ? _this.currentTime + options.duration : _this.duration;
                _this.play();
                publish(_this, 'movie.record', { options: options });
            });
        };
        /**
         * Stops the movie, without reseting the playback position
         * @return the movie (for chaining)
         */
        Movie.prototype.pause = function () {
            this._paused = true;
            // Deactivate all layers
            for (var i = 0; i < this.layers.length; i++)
                if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
                    var layer = this.layers[i];
                    layer.stop();
                    layer.active = false;
                }
            publish(this, 'movie.pause', {});
            return this;
        };
        /**
         * Stops playback and resets the playback position
         * @return the movie (for chaining)
         */
        Movie.prototype.stop = function () {
            this.pause();
            this.currentTime = 0;
            return this;
        };
        /**
         * @param [timestamp=performance.now()]
         * @param [done=undefined] - called when done playing or when the current frame is loaded
         * @private
         */
        Movie.prototype._render = function (repeat, timestamp, done) {
            var _this = this;
            if (timestamp === void 0) { timestamp = performance.now(); }
            if (done === void 0) { done = undefined; }
            clearCachedValues(this);
            if (!this.rendering) {
                // (!this.paused || this._renderingFrame) is true so it's playing or it's
                // rendering a single frame.
                if (done)
                    done();
                return;
            }
            this._updateCurrentTime(timestamp);
            var recordingEnd = this.recording ? this._recordEndTime : this.duration;
            var recordingEnded = this.currentTime > recordingEnd;
            if (recordingEnded)
                publish(this, 'movie.recordended', { movie: this });
            // Bad for performance? (remember, it's calling Array.reduce)
            var end = this.duration;
            var ended = this.currentTime > end;
            if (ended) {
                publish(this, 'movie.ended', { movie: this, repeat: this.repeat });
                // TODO: only reset currentTime if repeating
                this._currentTime = 0; // don't use setter
                publish(this, 'movie.timeupdate', { movie: this });
                this._lastPlayed = performance.now();
                this._lastPlayedOffset = 0; // this.currentTime
                this._renderingFrame = false;
                if (!this.repeat || this.recording) {
                    this._ended = true;
                    // Deactivate all layers
                    for (var i = 0; i < this.layers.length; i++)
                        if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
                            var layer = this.layers[i];
                            // A layer that has been deleted before layers.length has been updated
                            // (see the layers proxy in the constructor).
                            if (!layer)
                                continue;
                            layer.stop();
                            layer.active = false;
                        }
                }
            }
            // Stop playback or recording if done
            if (recordingEnded || (ended && !this.repeat)) {
                if (done)
                    done();
                return;
            }
            // Do render
            this._renderBackground(timestamp);
            var frameFullyLoaded = this._renderLayers();
            this._applyEffects();
            if (frameFullyLoaded)
                publish(this, 'movie.loadeddata', { movie: this });
            // If didn't load in this instant, repeatedly frame-render until frame is
            // loaded.
            // If the expression below is false, don't publish an event, just silently
            // stop render loop.
            if (!repeat || (this._renderingFrame && frameFullyLoaded)) {
                this._renderingFrame = false;
                if (done)
                    done();
                return;
            }
            window.requestAnimationFrame(function (timestamp) {
                _this._render(repeat, timestamp);
            }); // TODO: research performance cost
        };
        Movie.prototype._updateCurrentTime = function (timestamp) {
            // If we're only instant-rendering (current frame only), it doens't matter
            // if it's paused or not.
            if (!this._renderingFrame) {
                // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
                var sinceLastPlayed = (timestamp - this._lastPlayed) / 1000;
                this._currentTime = this._lastPlayedOffset + sinceLastPlayed; // don't use setter
                publish(this, 'movie.timeupdate', { movie: this });
                // this._lastUpdate = timestamp;
                // }
            }
        };
        Movie.prototype._renderBackground = function (timestamp) {
            this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            var background = val(this, 'background', timestamp);
            if (background) { // TODO: check val'd result
                this.cctx.fillStyle = background;
                this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        };
        /**
         * @return whether or not video frames are loaded
         * @param [timestamp=performance.now()]
         * @private
         */
        Movie.prototype._renderLayers = function () {
            var frameFullyLoaded = true;
            for (var i = 0; i < this.layers.length; i++) {
                if (!Object.prototype.hasOwnProperty.call(this.layers, i))
                    continue;
                var layer = this.layers[i];
                // A layer that has been deleted before layers.length has been updated
                // (see the layers proxy in the constructor).
                if (!layer)
                    continue;
                var reltime = this.currentTime - layer.startTime;
                // Cancel operation if layer disabled or outside layer time interval
                if (!val(layer, 'enabled', reltime) ||
                    // TODO                                                    > or >= ?
                    this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
                    // Layer is not active.
                    // If only rendering this frame, we are not "starting" the layer.
                    if (layer.active && !this._renderingFrame) {
                        // TODO: make a `deactivate()` method?
                        layer.stop();
                        layer.active = false;
                    }
                    continue;
                }
                // If only rendering this frame, we are not "starting" the layer
                if (!layer.active && val(layer, 'enabled', reltime) && !this._renderingFrame) {
                    // TODO: make an `activate()` method?
                    layer.start();
                    layer.active = true;
                }
                // if the layer has an input file
                if ('source' in layer)
                    frameFullyLoaded = frameFullyLoaded && layer.source.readyState >= 2;
                layer.render();
                // if the layer has visual component
                if (layer instanceof Visual) {
                    var canvas = layer.canvas;
                    // layer.canvas.width and layer.canvas.height should already be interpolated
                    // if the layer has an area (else InvalidStateError from canvas)
                    if (canvas.width * canvas.height > 0)
                        this.cctx.drawImage(canvas, val(layer, 'x', reltime), val(layer, 'y', reltime), canvas.width, canvas.height);
                }
            }
            return frameFullyLoaded;
        };
        Movie.prototype._applyEffects = function () {
            for (var i = 0; i < this.effects.length; i++) {
                var effect = this.effects[i];
                // An effect that has been deleted before effects.length has been updated
                // (see the effectsproxy in the constructor).
                if (!effect)
                    continue;
                effect.apply(this, this.currentTime);
            }
        };
        /**
         * Refreshes the screen (only use this if auto-refresh is disabled)
         * @return - resolves when the frame is loaded
         */
        Movie.prototype.refresh = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this._renderingFrame = true;
                _this._render(false, undefined, resolve);
            });
        };
        /**
         * Convienence method
         */
        Movie.prototype._publishToLayers = function (type, event) {
            for (var i = 0; i < this.layers.length; i++)
                if (Object.prototype.hasOwnProperty.call(this.layers, i))
                    publish(this.layers[i], type, event);
        };
        Object.defineProperty(Movie.prototype, "rendering", {
            /**
             * If the movie is playing, recording or refreshing
             */
            get: function () {
                return !this.paused || this._renderingFrame;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "renderingFrame", {
            /**
             * If the movie is refreshing current frame
             */
            get: function () {
                return this._renderingFrame;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "recording", {
            /**
             * If the movie is recording
             */
            get: function () {
                return !!this._mediaRecorder;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "duration", {
            /**
             * The combined duration of all layers
             */
            // TODO: dirty flag?
            get: function () {
                return this.layers.reduce(function (end, layer) { return Math.max(layer.startTime + layer.duration, end); }, 0);
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Convienence method for <code>layers.push()</code>
         * @param layer
         * @return the movie
         */
        Movie.prototype.addLayer = function (layer) {
            this.layers.push(layer);
            return this;
        };
        /**
         * Convienence method for <code>effects.push()</code>
         * @param effect
         * @return the movie
         */
        Movie.prototype.addEffect = function (effect) {
            this.effects.push(effect);
            return this;
        };
        Object.defineProperty(Movie.prototype, "paused", {
            /**
             */
            get: function () {
                return this._paused;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "ended", {
            /**
             * If the playback position is at the end of the movie
             */
            get: function () {
                return this._ended;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "currentTime", {
            /**
             * The current playback position
             */
            get: function () {
                return this._currentTime;
            },
            set: function (time) {
                this._currentTime = time;
                publish(this, 'movie.seek', {});
                // Render single frame to match new time
                this.refresh();
            },
            enumerable: false,
            configurable: true
        });
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
        // TODO: Refresh if only auto-refreshing is enabled
        Movie.prototype.setCurrentTime = function (time, refresh) {
            var _this = this;
            if (refresh === void 0) { refresh = true; }
            return new Promise(function (resolve, reject) {
                _this._currentTime = time;
                publish(_this, 'movie.seek', {});
                if (refresh)
                    // Pass promise callbacks to `refresh`
                    _this.refresh().then(resolve).catch(reject);
                else
                    resolve();
            });
        };
        Object.defineProperty(Movie.prototype, "canvas", {
            /**
             * The rendering canvas
             */
            get: function () {
                return this._canvas;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "cctx", {
            /**
             * The rendering canvas's context
             */
            get: function () {
                return this._cctx;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "width", {
            /**
             * The width of the rendering canvas
             */
            get: function () {
                return this.canvas.width;
            },
            set: function (width) {
                this.canvas.width = width;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "height", {
            /**
             * The height of the rendering canvas
             */
            get: function () {
                return this.canvas.height;
            },
            set: function (height) {
                this.canvas.height = height;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Movie.prototype, "movie", {
            get: function () {
                return this;
            },
            enumerable: false,
            configurable: true
        });
        Movie.prototype.getDefaultOptions = function () {
            return {
                canvas: undefined,
                _actx: new audioContextConstructor(),
                /**
                 * @name module:movie#background
                 * @desc The css color for the background, or <code>null</code> for transparency
                 */
                background: '#000',
                /**
                 * @name module:movie#repeat
                 */
                repeat: false,
                /**
                 * @name module:movie#autoRefresh
                 * @desc Whether to refresh when changes are made that would effect the current frame
                 */
                autoRefresh: true
            };
        };
        return Movie;
    }());
    // id for events (independent of instance, but easy to access when on prototype chain)
    Movie.prototype.type = 'movie';
    // TODO: refactor so we don't need to explicitly exclude some of these
    Movie.prototype.publicExcludes = ['canvas', 'cctx', 'actx', 'layers', 'effects'];
    Movie.prototype.propertyFilters = {};

    /*
     * Typedoc can't handle default exports. To let users import default export and
     * make typedoc work, this module exports everything as named exports. Then,
     * ./index imports everything from this module and exports it as a default
     * export. Typedoc uses this file, and rollup and NPM use ./index
     */

    var vd = /*#__PURE__*/Object.freeze({
        layer: index,
        effect: index$1,
        event: event,
        MovieOptions: MovieOptions,
        Movie: Movie,
        applyOptions: applyOptions,
        clearCachedValues: clearCachedValues,
        KeyFrame: KeyFrame,
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

    /**
     * The entry point
     * @module index
     */

    return vd;

}());
