var etro = (function () {
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
     * @param target - a etro object
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
     * @param target - a etro object
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
     * @param target - a etro object
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
        __proto__: null,
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
     new etro.KeyFrame([time1, value1, interpolation1], [time2, value2])`
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
     * @param element - the etro object to which the property belongs to
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
            return "rgba(".concat(this.r, ", ").concat(this.g, ", ").concat(this.b, ", ").concat(this.a, ")");
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
            s += "".concat(this.size).concat(this.sizeUnit, " ");
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
        parseFontEl.setAttribute('style', "font: ".concat(str));
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
     * @deprecated Will be removed in the future (see issue #130)
     *
     * @param target - object to watch
     */
    function watchPublic(target) {
        var getPath = function (receiver, prop) {
            return (receiver === proxy ? '' : (paths.get(receiver) + '.')) + prop;
        };
        var callback = function (prop, val, receiver) {
            // Public API property updated, emit 'modify' event.
            publish(proxy, "".concat(target.type, ".change.modify"), { property: getPath(receiver, prop), newValue: val });
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
                // Cache dest before super.detach() unsets this.movie
                var dest = this.movie.actx.destination;
                _super.prototype.detach.call(this);
                this.audioNode.disconnect(dest);
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
                var type = "movie.change.layer.".concat(typeOfChange);
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
                return this._movie
                    ? this._movie.currentTime - this.startTime
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
    Base.prototype.publicExcludes = ['active'];
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
                    ? destWidth
                    : val(this, 'sourceWidth', this.currentTime);
            }, destHeight: function (destHeight) {
                /* eslint-disable eqeqeq */
                return destHeight != undefined
                    ? destHeight
                    : val(this, 'sourceHeight', this.currentTime);
            }, width: function (width) {
                /* eslint-disable eqeqeq */
                return width != undefined
                    ? width
                    : val(this, 'destWidth', this.currentTime);
            }, height: function (height) {
                /* eslint-disable eqeqeq */
                return height != undefined
                    ? height
                    : val(this, 'destHeight', this.currentTime);
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
        __proto__: null,
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
     * @deprecated All visual effects now inherit from `Visual` instead
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
                var type = "".concat(newThis._target.type, ".change.effect.modify");
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
     * Modifies the visual contents of a layer.
     */
    var Visual$1 = /** @class */ (function (_super) {
        __extends(Visual, _super);
        function Visual() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        // subclasses must implement apply
        /**
         * Apply this effect to a target at the given time
         *
         * @param target
         * @param reltime - the movie's current time relative to the layer
         * (will soon be replaced with an instance getter)
         * @abstract
         */
        Visual.prototype.apply = function (target, reltime) {
            _super.prototype.apply.call(this, target, reltime);
        };
        return Visual;
    }(Base$1));

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
                        throw new Error("Texture - uniform naming conflict: ".concat(name_1, "!"));
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
                 * the texture. In etro shader effects, the subclass passes the names of
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
                throw new Error("Invalid type: ".concat(outputType, " or value: ").concat(value));
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
                throw new Error("Invalid type: ".concat(outputType, " or value: ").concat(value));
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
    }(Visual$1));
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
    }(Visual$1));

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
    }(Visual$1));

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
                throw new Error("Invalid index ".concat(index));
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
    }(Visual$1));
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
        __proto__: null,
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
        get Transform () { return Transform; },
        Visual: Visual$1
    });

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
            this.actx = options.actx ||
                options.audioContext ||
                new AudioContext() ||
                // eslint-disable-next-line new-cap
                new window.webkitAudioContext();
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
                    _this._paused = true;
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
            // TODO: Is calling duration every frame bad for performance? (remember,
            // it's calling Array.reduce)
            var end = this.recording ? this._recordEndTime : this.duration;
            if (this.currentTime > end) {
                if (this.recording)
                    publish(this, 'movie.recordended', { movie: this });
                if (this.currentTime > this.duration)
                    publish(this, 'movie.ended', { movie: this, repeat: this.repeat });
                // TODO: only reset currentTime if repeating
                if (this.repeat) {
                    // Don't use setter, which publishes 'movie.seek'. Instead, update the
                    // value and publish a 'movie.timeupdate' event.
                    this._currentTime = 0;
                    publish(this, 'movie.timeupdate', { movie: this });
                }
                this._lastPlayed = performance.now();
                this._lastPlayedOffset = 0; // this.currentTime
                this._renderingFrame = false;
                // Stop playback or recording if done (except if it's playing and repeat
                // is true)
                if (!(!this.recording && this.repeat)) {
                    this._paused = true;
                    this._ended = true;
                    // Deactivate all layers
                    for (var i = 0; i < this.layers.length; i++)
                        if (Object.prototype.hasOwnProperty.call(this.layers, i)) {
                            var layer = this.layers[i];
                            // A layer that has been deleted before layers.length has been updated
                            // (see the layers proxy in the constructor).
                            if (!layer || !layer.active)
                                continue;
                            layer.stop();
                            layer.active = false;
                        }
                    if (done)
                        done();
                    return;
                }
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
            window.requestAnimationFrame(function () {
                _this._render(repeat, undefined, done);
            }); // TODO: research performance cost
        };
        Movie.prototype._updateCurrentTime = function (timestamp) {
            // If we're only instant-rendering (current frame only), it doens't matter
            // if it's paused or not.
            if (!this._renderingFrame) {
                // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
                var sinceLastPlayed = (timestamp - this._lastPlayed) / 1000;
                var currentTime = this._lastPlayedOffset + sinceLastPlayed; // don't use setter
                if (this.currentTime !== currentTime) {
                    this._currentTime = currentTime;
                    publish(this, 'movie.timeupdate', { movie: this });
                }
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
                if (this.autoRefresh)
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

    var etro = /*#__PURE__*/Object.freeze({
        __proto__: null,
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

    return etro;

}());
