var vd = (function () {
  'use strict';

  /**
   * @module event
   */

  const listeners = new WeakMap();

  /**
   * An event type
   * @private
   */
  class TypeId {
    constructor (id) {
      this.parts = id.split('.');
    }

    contains (other) {
      if (other.length > this.length) {
        return false
      }

      for (let i = 0; i < other.parts.length; i++) {
        if (other.parts[i] !== this.parts[i]) {
          return false
        }
      }
      return true
    }

    toString () {
      return this.parts.join('.')
    }
  }

  /**
   * Emits an event to all listeners
   *
   * @param {object} target - a vidar object
   * @param {string} type - the id of the type (can contain subtypes, such as
   * "type.subtype")
   * @param {function} listener
   */
  function subscribe (target, type, listener) {
    if (!listeners.has(target)) {
      listeners.set(target, []);
    }

    listeners.get(target).push(
      { type: new TypeId(type), listener }
    );
  }

  /**
   * Emits an event to all listeners
   *
   * @param {object} target - a vidar object
   * @param {string} type - the id of the type (can contain subtypes, such as
   * "type.subtype")
   * @param {object} event - any additional event data
   */
  function publish (target, type, event) {
    event.target = target; // could be a proxy
    event.type = type;

    const t = new TypeId(type);

    if (!listeners.has(target)) {
      // No event fired
      return null
    }

    // Call event listeners for this event.
    const listenersForType = [];
    for (let i = 0; i < listeners.get(target).length; i++) {
      const item = listeners.get(target)[i];
      if (t.contains(item.type)) {
        listenersForType.push(item.listener);
      }
    }

    for (let i = 0; i < listenersForType.length; i++) {
      const listener = listenersForType[i];
      listener(event);
    }

    return event
  }

  var event = /*#__PURE__*/Object.freeze({
    subscribe: subscribe,
    publish: publish
  });

  /**
   * @module util
   */

  /**
   * Gets the first matching property descriptor in the prototype chain, or
   * undefined.
   * @param {Object} obj
   * @param {string|Symbol} name
   */
  function getPropertyDescriptor (obj, name) {
    do {
      const propDesc = Object.getOwnPropertyDescriptor(obj, name);
      if (propDesc) {
        return propDesc
      }
      obj = Object.getPrototypeOf(obj);
    } while (obj)
    return undefined
  }

  /**
   * Merges `options` with `defaultOptions`, and then copies the properties with
   * the keys in `defaultOptions` from the merged object to `destObj`.
   *
   * @return {undefined}
   */
  // TODO: Make methods like getDefaultOptions private
  function applyOptions (options, destObj) {
    const defaultOptions = destObj.getDefaultOptions();

    // Validate; make sure `keys` doesn't have any extraneous items
    for (const option in options) {
      // eslint-disable-next-line no-prototype-builtins
      if (!defaultOptions.hasOwnProperty(option)) {
        throw new Error("Invalid option: '" + option + "'")
      }
    }

    // Merge options and defaultOptions
    options = { ...defaultOptions, ...options };

    // Copy options
    for (const option in options) {
      const propDesc = getPropertyDescriptor(destObj, option);
      // Update the property as long as the property has not been set (unless if it has a setter)
      if (!propDesc || propDesc.set) {
        destObj[option] = options[option];
      }
    }
  }

  // This must be cleared at the start of each frame
  const valCache = new WeakMap();
  function cacheValue (element, path, value) {
    // Initiate movie cache
    if (!valCache.has(element.movie)) {
      valCache.set(element.movie, new WeakMap());
    }
    const movieCache = valCache.get(element.movie);

    // Iniitate element cache
    if (!movieCache.has(element)) {
      movieCache.set(element, {});
    }
    const elementCache = movieCache.get(element);

    // Cache the value
    elementCache[path] = value;
    return value
  }
  function hasCachedValue (element, path) {
    return valCache.has(element.movie) &&
      valCache.get(element.movie).has(element) &&
      path in valCache.get(element.movie).get(element)
  }
  function getCachedValue (element, path) {
    return valCache.get(element.movie).get(element)[path]
  }
  function clearCachedValues (movie) {
    valCache.delete(movie);
  }

  class KeyFrame {
    constructor (...value) {
      this.value = value;
    }

    withKeys (keys) {
      this.interpolationKeys = keys;
      return this
    }

    evaluate (time) {
      if (this.value.length === 0) {
        throw new Error('Empty keyframe')
      }
      if (time === undefined) {
        throw new Error('|time| is undefined or null')
      }
      const firstTime = this.value[0][0];
      if (time < firstTime) {
        throw new Error('No keyframe point before |time|')
      }
      // I think reduce are slow to do per-frame (or more)?
      for (let i = 0; i < this.value.length; i++) {
        const [startTime, startValue, interpolate = linearInterp] = this.value[i];
        if (i + 1 < this.value.length) {
          const endTime = this.value[i + 1][0];
          const endValue = this.value[i + 1][1];
          if (startTime <= time && time < endTime) {
            // No need for endValue if it is flat interpolation
            // TODO: support custom interpolation for 'other' types?
            if (!(typeof startValue === 'number' || typeof endValue === 'object')) {
              return startValue
            } else if (typeof startValue !== typeof endValue) {
              throw new Error('Type mismatch in keyframe values')
            } else {
              // Interpolate
              const percentProgress = (time - startTime) / (endTime - startTime);
              return interpolate(startValue, endValue, percentProgress, this.interpolationKeys)
            }
          }
        } else {
          // Repeat last value forever
          return startValue
        }
      }
    }
  }

  /**
   * Calculates the value of keyframe set <code>property</code> at
   * <code>time</code> if <code>property</code> is an array, or returns
   * <code>property</code>, assuming that it's a number.
   *
   * @param {(*|module:util.KeyFrames)} property - value or map of time-to-value
   * pairs for keyframes
   * @param {object} element - the object to which the property belongs
   * @param {number} time - time to calculate keyframes for, if necessary
   *
   * Note that only values used in keyframes that numbers or objects (including
   * arrays) are interpolated. All other values are taken sequentially with no
   * interpolation. JavaScript will convert parsed colors, if created correctly,
   * to their string representations when assigned to a CanvasRenderingContext2D
   * property.
   *
   * @typedef {Object} module:util.KeyFrames
   * @property {function} interpolate - the function to interpolate between
   * keyframes, defaults to {@link module:util.linearInterp}
   * @property {string[]} interpolationKeys - keys to interpolate for objects,
   * defaults to all own enumerable properties
   */
  // TODO: Is this function efficient?
  // TODO: Update doc @params to allow for keyframes
  function val (element, path, time) {
    if (hasCachedValue(element, path)) {
      return getCachedValue(element, path)
    }

    // Get property of element at path
    const pathParts = path.split('.');
    let property = element;
    while (pathParts.length > 0) {
      property = property[pathParts.shift()];
    }
    // Property filter function
    const process = element.propertyFilters[path];

    let value;
    if (property instanceof KeyFrame) {
      value = property.evaluate(time);
    } else if (typeof property === 'function') {
      value = property(element, time); // TODO? add more args
    } else {
      // Simple value
      value = property;
    }
    return cacheValue(element, path, process ? process.call(element, value) : value)
  }

  /* export function floorInterp(x1, x2, t, objectKeys) {
      // https://stackoverflow.com/a/25835337/3783155 (TODO: preserve getters/setters, etc?)
      return !objectKeys ? x1 : objectKeys.reduce((a, x) => {
          if (x1.hasOwnProperty(x)) a[x] = o[x];  // ignore x2
          return a;
      }, Object.create(Object.getPrototypeOf(x1)));
  } */

  function linearInterp (x1, x2, t, objectKeys) {
    if (typeof x1 !== typeof x2) {
      throw new Error('Type mismatch')
    }
    if (typeof x1 !== 'number' && typeof x1 !== 'object') {
      // Flat interpolation (floor)
      return x1
    }
    if (typeof x1 === 'object') { // to work with objects (including arrays)
      // TODO: make this code DRY
      if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) {
        throw new Error('Prototype mismatch')
      }
      // Preserve prototype of objects
      const int = Object.create(Object.getPrototypeOf(x1));
      // Take the intersection of properties
      const keys = Object.keys(x1) || objectKeys;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        // eslint-disable-next-line no-prototype-builtins
        if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
          continue
        }
        int[key] = linearInterp(x1[key], x2[key], t);
      }
      return int
    }
    return (1 - t) * x1 + t * x2
  }

  function cosineInterp (x1, x2, t, objectKeys) {
    if (typeof x1 !== typeof x2) {
      throw new Error('Type mismatch')
    }
    if (typeof x1 !== 'number' && typeof x1 !== 'object') {
      // Flat interpolation (floor)
      return x1
    }
    if (typeof x1 === 'object' && typeof x2 === 'object') { // to work with objects (including arrays)
      if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) {
        throw new Error('Prototype mismatch')
      }
      // Preserve prototype of objects
      const int = Object.create(Object.getPrototypeOf(x1));
      // Take the intersection of properties
      const keys = Object.keys(x1) || objectKeys;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        // eslint-disable-next-line no-prototype-builtins
        if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
          continue
        }
        int[key] = cosineInterp(x1[key], x2[key], t);
      }
      return int
    }
    const cos = Math.cos(Math.PI / 2 * t);
    return cos * x1 + (1 - cos) * x2
  }

  /**
   * An RGBA color, for proper interpolation and shader effects
   */
  class Color {
    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    constructor (r, g, b, a = 1.0) {
      /** @type number */
      this.r = r;
      /** @type number */
      this.g = g;
      /** @type number */
      this.b = b;
      /** @type number */
      this.a = a;
    }

    /**
     * Converts to a CSS color
     */
    toString () {
      return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
    }
  }

  const parseColorCanvas = document.createElement('canvas');
  parseColorCanvas.width = parseColorCanvas.height = 1;
  const parseColorCtx = parseColorCanvas.getContext('2d');
  /**
   * Converts a CSS color string to a {@link module:util.Color} object
   * representation.
   * @param {string} str
   * @return {module:util.Color} the parsed color
   */
  function parseColor (str) {
    // TODO - find a better way to deal with the fact that invalid values of "col"
    // are ignored.
    parseColorCtx.clearRect(0, 0, 1, 1);
    parseColorCtx.fillStyle = str;
    parseColorCtx.fillRect(0, 0, 1, 1);
    const data = parseColorCtx.getImageData(0, 0, 1, 1).data;
    return new Color(data[0], data[1], data[2], data[3] / 255)
  }

  /**
   * A font, for proper interpolation
   */
  class Font {
    /**
     * @param {number} size
     * @param {string} family
     * @param {string} sizeUnit
     */
    constructor (size, sizeUnit, family, style = 'normal', variant = 'normal',
      weight = 'normal', stretch = 'normal', lineHeight = 'normal') {
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
    toString () {
      let s = '';
      if (this.style !== 'normal') s += this.style + ' ';
      if (this.variant !== 'normal') s += this.variant + ' ';
      if (this.weight !== 'normal') s += this.weight + ' ';
      if (this.stretch !== 'normal') s += this.stretch + ' ';
      s += `${this.size}${this.sizeUnit} `;
      if (this.lineHeight !== 'normal') s += this.lineHeight + ' ';
      s += this.family;

      return s
    }
  }

  const parseFontEl = document.createElement('div');
  /**
   * Converts a CSS font string to a {@link module:util.Font} object
   * representation.
   * @param {string} str
   * @return {module:util.Font} the parsed font
   */
  function parseFont (str) {
    // Assign css string to html element
    parseFontEl.setAttribute('style', `font: ${str}`);
    const {
      fontSize, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight
    } = parseFontEl.style;
    parseFontEl.removeAttribute('style');

    const size = parseFloat(fontSize);
    const sizeUnit = fontSize.substring(size.toString().length);
    return new Font(size, sizeUnit, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight)
  }

  /**
   * @param {*} mapper
   * @param {*} canvas
   * @param {*} ctx
   * @param {*} x
   * @param {*} y
   * @param {*} width
   * @param {*} height
   * @param {*} flush
   * @deprecated Use {@link effect.Shader} instead
   */
  function mapPixels (mapper, canvas, ctx, x, y, width, height, flush = true) {
    x = x || 0;
    y = y || 0;
    width = width || canvas.width;
    height = height || canvas.height;
    const frame = ctx.getImageData(x, y, width, height);
    for (let i = 0, l = frame.data.length; i < l; i += 4) {
      mapper(frame.data, i);
    }
    if (flush) {
      ctx.putImageData(frame, x, y);
    }
  }

  /**
   * <p>Emits "change" event when public properties updated, recursively.
   * <p>Must be called before any watchable properties are set, and only once in
   * the prototype chain.
   *
   * @param {object} target - object to watch
   */
  function watchPublic (target) {
    const getPath = (receiver, prop) =>
      (receiver === proxy ? '' : (paths.get(receiver) + '.')) + prop;
    const callback = function (prop, val, receiver) {
      // Public API property updated, emit 'modify' event.
      publish(proxy, `${target.type}.change.modify`, { property: getPath(receiver, prop), newValue: val });
    };
    const check = prop => !(prop.startsWith('_') || target.publicExcludes.includes(prop));

    // The path to each child property (each is a unique proxy)
    const paths = new WeakMap();

    const handler = {
      set (obj, prop, val, receiver) {
        // Recurse
        if (typeof val === 'object' && val !== null && !paths.has(val) && check(prop)) {
          val = new Proxy(val, handler);
          paths.set(val, getPath(receiver, prop));
        }

        const was = prop in obj;
        // Set property or attribute
        // Search prototype chain for the closest setter
        let objProto = obj;
        while ((objProto = Object.getPrototypeOf(objProto))) {
          const propDesc = Object.getOwnPropertyDescriptor(objProto, prop);
          if (propDesc && propDesc.set) {
            // Call setter, supplying proxy as this (fixes event bugs)
            propDesc.set.call(receiver, val);
            break
          }
        }
        if (!objProto) {
          // Couldn't find setter; set value on instance
          obj[prop] = val;
        }
        // Check if it already existed and if it's a valid property to watch, if
        // on root object.
        if (obj !== target || (was && check(prop))) {
          callback(prop, val, receiver);
        }
        return true
      }
    };

    const proxy = new Proxy(target, handler);
    return proxy
  }

  var util = /*#__PURE__*/Object.freeze({
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
   * A layer outputs content for the movie
   */
  class Base {
    /**
     * Creates a new empty layer
     *
     * @param {object} options
     * @param {number} options.startTime - when to start the layer on the movie's
     * timeline
     * @param {number} options.duration - how long the layer should last on the
     * movie's timeline
     */
    constructor (options) {
      // Set startTime and duration properties manually, because they are
      // readonly. applyOptions ignores readonly properties.
      this._startTime = options.startTime;
      this._duration = options.duration;

      // Proxy that will be returned by constructor (for sending 'modified'
      // events).
      const newThis = watchPublic(this);
      // Don't send updates when initializing, so use this instead of newThis
      applyOptions(options, this);

      // Whether this layer is currently being rendered
      this._active = false;
      this.enabled = true;

      this._movie = null;

      // Propogate up to target
      subscribe(newThis, 'layer.change', event => {
        const typeOfChange = event.type.substring(event.type.lastIndexOf('.') + 1);
        const type = `movie.change.layer.${typeOfChange}`;
        publish(newThis._movie, type, { ...event, target: newThis._movie, type });
      });

      return newThis
    }

    attach (movie) {
      this._movie = movie;
    }

    detach () {
      this._movie = null;
    }

    /**
     * Called when the layer is activated
     */
    start () {}

    /**
     * Called when the movie renders and the layer is active
     */
    render () {}

    /**
    * Called when the layer is deactivated
     */
    stop () {}

    get parent () {
      return this._movie
    }

    /**
     * If the attached movie's playback position is in this layer
     * @type boolean
     */
    get active () {
      return this._active
    }

    /**
     * @type number
     */
    get startTime () {
      return this._startTime
    }

    set startTime (val) {
      this._startTime = val;
    }

    /**
     * The current time of the movie relative to this layer
     * @type number
     */
    get currentTime () {
      return this._movie ? this._movie.currentTime - this.startTime
        : undefined
    }

    /**
     * @type number
     */
    get duration () {
      return this._duration
    }

    set duration (val) {
      this._duration = val;
    }

    get movie () {
      return this._movie
    }

    getDefaultOptions () {
      return {
        startTime: undefined, // required
        duration: undefined // required
      }
    }
  }
  // id for events (independent of instance, but easy to access when on prototype
  // chain)
  Base.prototype.type = 'layer';
  Base.prototype.publicExcludes = [];
  Base.prototype.propertyFilters = {};

  /**
   * Video or audio
   * @mixin AudioSourceMixin
   */
  // TODO: Implement playback rate
  const AudioSourceMixin = superclass => {
    if (superclass !== Base && !(superclass.prototype instanceof Base)) {
      throw new Error('AudioSourceMixin can only be applied to subclasses of Base')
    }

    class Media extends superclass {
      /**
       * @param {object} options
       * @param {HTMLVideoElement} options.source
       * @param {function} options.onload
       * @param {number} [options.sourceStartTime=0] - at what time in the audio
       * the layer starts
       * @param {numer} [options.duration=media.duration-options.sourceStartTime]
       * @param {boolean} [options.muted=false]
       * @param {number} [options.volume=1]
       * @param {number} [options.playbackRate=1]
       */
      constructor (options = {}) {
        const onload = options.onload;
        // Don't set as instance property
        delete options.onload;
        super(options);
        this._initialized = false;
        // Set media manually, because it's readonly.
        this._source = options.source;
        this._sourceStartTime = options.sourceStartTime || 0;
        applyOptions(options, this);

        const load = () => {
          // TODO:              && ?
          if ((options.duration || (this.source.duration - this.sourceStartTime)) < 0) {
            throw new Error('Invalid options.duration or options.sourceStartTime')
          }
          this._unstretchedDuration = options.duration || (this.source.duration - this.sourceStartTime);
          this.duration = this._unstretchedDuration / (this.playbackRate);
          // onload will use `this`, and can't bind itself because it's before
          // super()
          onload && onload.bind(this)(this.source, options);
        };
        if (this.source.readyState >= 2) {
          // this frame's data is available now
          load();
        } else {
          // when this frame's data is available
          this.source.addEventListener('loadedmetadata', load);
        }
        this.source.addEventListener('durationchange', () => {
          this.duration = options.duration || (this.source.duration - this.sourceStartTime);
        });
      }

      attach (movie) {
        super.attach(movie);

        subscribe(movie, 'movie.seek', () => {
          const time = movie.currentTime;
          if (time < this.startTime || time >= this.startTime + this.duration) {
            return
          }
          this.source.currentTime = time - this.startTime;
        });

        // TODO: on unattach?
        subscribe(movie, 'movie.audiodestinationupdate', event => {
          // Connect to new destination if immeidately connected to the existing
          // destination.
          if (this._connectedToDestination) {
            this.audioNode.disconnect(movie.actx.destination);
            this.audioNode.connect(event.destination);
          }
        });

        // connect to audiocontext
        this._audioNode = movie.actx.createMediaElementSource(this.source);

        // Spy on connect and disconnect to remember if it connected to
        // actx.destination (for Movie#record).
        const oldConnect = this._audioNode.connect.bind(this.audioNode);
        this._audioNode.connect = (destination, outputIndex, inputIndex) => {
          this._connectedToDestination = destination === movie.actx.destination;
          return oldConnect(destination, outputIndex, inputIndex)
        };
        const oldDisconnect = this._audioNode.disconnect.bind(this.audioNode);
        this._audioNode.disconnect = (destination, output, input) => {
          if (this.connectedToDestination &&
          destination === movie.actx.destination) {
            this._connectedToDestination = false;
          }
          return oldDisconnect(destination, output, input)
        };

        // Connect to actx.destination by default (can be rewired by user)
        this.audioNode.connect(movie.actx.destination);
      }

      start (reltime) {
        this.source.currentTime = reltime + this.sourceStartTime;
        this.source.play();
      }

      render (reltime) {
        super.render(reltime);
        // TODO: implement Issue: Create built-in audio node to support built-in
        // audio nodes, as this does nothing rn
        this.source.muted = val(this, 'muted', reltime);
        this.source.volume = val(this, 'volume', reltime);
        this.source.playbackRate = val(this, 'playbackRate', reltime);
      }

      stop () {
        this.source.pause();
      }

      /**
       * The raw html media element
       * @type HTMLMediaElement
       */
      get source () {
        return this._source
      }

      /**
       * The audio source node for the media
       * @type MediaStreamAudioSourceNode
       */
      get audioNode () {
        return this._audioNode
      }

      get playbackRate () {
        return this._playbackRate
      }

      set playbackRate (value) {
        this._playbackRate = value;
        if (this._unstretchedDuration !== undefined) {
          this.duration = this._unstretchedDuration / value;
        }
      }

      get startTime () {
        return this._startTime
      }

      set startTime (val) {
        this._startTime = val;
        if (this._initialized) {
          const mediaProgress = this._movie.currentTime - this.startTime;
          this.source.currentTime = this.sourceStartTime + mediaProgress;
        }
      }

      set sourceStartTime (val) {
        this._sourceStartTime = val;
        if (this._initialized) {
          const mediaProgress = this._movie.currentTime - this.startTime;
          this.source.currentTime = mediaProgress + this.sourceStartTime;
        }
      }

      /**
       * Timestamp in the media where the layer starts at
       * @type number
       */
      get sourceStartTime () {
        return this._sourceStartTime
      }

      getDefaultOptions () {
        return {
          ...superclass.prototype.getDefaultOptions(),
          source: undefined, // required
          /**
           * @name module:layer~Media#sourceStartTime
           * @type number
           * @desc Timestamp in the media where the layer starts at
           */
          sourceStartTime: 0,
          /**
           * @name module:layer~Media#duration
           * @type number
           */
          duration: undefined, // important to include undefined keys, for applyOptions
          /**
           * @name module:layer~Media#muted
           * @type boolean
           */
          muted: false,
          /**
           * @name module:layer~Media#volume
           * @type number
           */
          volume: 1,
          /**
           * @name module:layer~Media#playbackRate
           * @type number
           * @todo <strong>Implement</strong>
           */
          playbackRate: 1
        }
      }
    }
    return Media // custom mixin class
  };

  /**
   * @extends module:layer~Media
   */
  class Audio extends AudioSourceMixin(Base) {
    /**
     * Creates an audio layer
     *
     * @param {object} options
     */
    constructor (options = {}) {
      super(options);
      if (this.duration === undefined) {
        this.duration = this.source.duration - this.sourceStartTime;
      }
    }

    getDefaultOptions () {
      return {
        ...Object.getPrototypeOf(this).getDefaultOptions(),
        /**
         * @name module:layer.Audio#sourceStartTime
         * @type number
         * @desc Where in the media to start playing when the layer starts
         */
        sourceStartTime: 0,
        duration: undefined
      }
    }
  }

  /** Any layer that renders to a canvas */
  class Visual extends Base {
    /**
     * Creates a visual layer
     *
     * @param {object} options - various optional arguments
     * @param {number} [options.width=null] - the width of the entire layer
     * @param {number} [options.height=null] - the height of the entire layer
     * @param {number} [options.x=0] - the offset of the layer relative to the
     * movie
     * @param {number} [options.y=0] - the offset of the layer relative to the
     * movie
     * @param {string} [options.background=null] - the background color of the
     * layer, or <code>null</code>
     *  for a transparent background
     * @param {object} [options.border=null] - the layer's outline, or
     * <code>null</code> for no outline
     * @param {string} [options.border.color] - the outline's color; required for
     * a border
     * @param {string} [options.border.thickness=1] - the outline's weight
     * @param {number} [options.opacity=1] - the layer's opacity; <code>1</cod>
     * for full opacity and <code>0</code> for full transparency
     */
    constructor (options) {
      super(options);
      // Only validate extra if not subclassed, because if subclcass, there will
      // be extraneous options.
      applyOptions(options, this);

      this._canvas = document.createElement('canvas');
      this._vctx = this.canvas.getContext('2d');

      this._effectsBack = [];
      const that = this;
      this._effects = new Proxy(this._effectsBack, {
        apply: function (target, thisArg, argumentsList) {
          return thisArg[target].apply(this, argumentsList)
        },
        deleteProperty: function (target, property) {
          const value = target[property];
          value.detach();
          delete target[property];
          return true
        },
        set: function (target, property, value, receiver) {
          if (!isNaN(property)) {
            // The property is a number (index)
            if (target[property]) {
              target[property].detach();
            }
            value.attach(that);
          }
          target[property] = value;
          return true
        }
      });
    }

    /**
     * Render visual output
     */
    render (reltime) {
      this.beginRender(reltime);
      this.doRender(reltime);
      this.endRender(reltime);
    }

    beginRender (reltime) {
      this.canvas.width = val(this, 'width', reltime);
      this.canvas.height = val(this, 'height', reltime);
      this.vctx.globalAlpha = val(this, 'opacity', reltime);
    }

    doRender (reltime) {
      /*
       * If this.width or this.height is null, that means "take all available
       * screen space", so set it to this._move.width or this._movie.height,
       * respectively canvas.width & canvas.height are already interpolated
       */
      if (this.background) {
        this.vctx.fillStyle = val(this, 'background', reltime);
        // (0, 0) relative to layer
        this.vctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      if (this.border && this.border.color) {
        this.vctx.strokeStyle = val(this, 'border.color', reltime);
        // This is optional.. TODO: integrate this with defaultOptions
        this.vctx.lineWidth = val(this, 'border.thickness', reltime) || 1;
      }
    }

    endRender (reltime) {
      const w = val(this, 'width', reltime) || val(this._movie, 'width', this.startTime + reltime);
      const h = val(this, 'height', reltime) || val(this._movie, 'height', this.startTime + reltime);
      if (w * h > 0) {
        this._applyEffects();
      }
      // else InvalidStateError for drawing zero-area image in some effects, right?
    }

    _applyEffects () {
      for (let i = 0; i < this.effects.length; i++) {
        const effect = this.effects[i];
        if (effect.enabled) {
          // Pass relative time
          effect.apply(this, this._movie.currentTime - this.startTime);
        }
      }
    }

    /**
     * Convienence method for <code>effects.push()</code>
     * @param {BaseEffect} effect
     * @return {module:layer.Visual} the layer (for chaining)
     */
    addEffect (effect) {
      this.effects.push(effect); return this
    }

    /**
     * The layer's rendering canvas
     * @type HTMLCanvasElement
     */
    get canvas () {
      return this._canvas
    }

    /**
     * The context of {@link module:layer.Visual#canvas}
     * @type CanvasRenderingContext2D
     */
    get vctx () {
      return this._vctx
    }

    /**
     * @type effect.Base[]
     */
    get effects () {
      // Private because it's a proxy
      return this._effects
    }

    getDefaultOptions () {
      return {
        ...Base.prototype.getDefaultOptions(),
        /**
         * @name module:layer.Visual#x
         * @type number
         * @desc The offset of the layer relative to the movie
         */
        x: 0,
        /**
         * @name module:layer.Visual#y
         * @type number
         * @desc The offset of the layer relative to the movie
         */
        y: 0,
        /**
         * @name module:layer.Visual#width
         * @type number
         */
        width: null,
        /**
         * @name module:layer.Visual#height
         * @type number
         */
        height: null,
        /**
         * @name module:layer.Visual#background
         * @type string
         * @desc The CSS color code for the background, or <code>null</code> for
         * transparency
         */
        background: null,
        /**
         * @name module:layer.Visual#border
         * @type string
         * @desc The CSS border style, or <code>null</code> for no border
         */
        border: null,
        /**
         * @name module:layer.Visual#opacity
         * @type number
         */
        opacity: 1
      }
    }
  }
  Visual.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['canvas', 'vctx', 'effects']);
  Visual.prototype.propertyFilters = {
    ...Base.propertyFilters,
    /*
     * If this.width or this.height is null, that means "take all available screen
     * space", so set it to this._move.width or this._movie.height, respectively
     */
    width: function (width) {
      return width != undefined ? width : this._movie.width // eslint-disable-line eqeqeq
    },
    height: function (height) {
      return height != undefined ? height : this._movie.height // eslint-disable-line eqeqeq
    }
  };

  /**
   * Image or video
   * @mixin VisualSourceMixin
   */
  const VisualSourceMixin = superclass => {
    if (superclass !== Visual && !(superclass.prototype instanceof Visual)) {
      throw new Error('VisualSourceMixin can only be applied to subclasses of Visual')
    }

    class VisualSource extends superclass {
      /**
       * @param {number} startTime
       * @param {number} endTime
       * @param {(HTMLImageElement|HTMLVideoElement)} media
       * @param {object} [options]
       * @param {number} [options.sourceX=0] - image source x
       * @param {number} [options.sourceY=0] - image source y
       * @param {number} [options.sourceWidth=undefined] - image source width, or
       * <code>undefined</code> to fill the entire layer
       * @param {number} [options.sourceHeight=undefined] - image source height,
       * or <code>undefined</code> to fill the entire layer
       * @param {number} [options.destX=0] - offset of the image relative to the
       * layer
       * @param {number} [options.destY=0] - offset of the image relative to the
       * layer
       * @param {number} [options.destWidth=undefined] - width to render the
       * image at
       * @param {number} [options.destHeight=undefined] - height to render the
       * image at
       */
      constructor (options) {
        super(options);
        // Set readonly property manually
        this._source = options.source;
        applyOptions(options, this);
      }

      doRender (reltime) {
        // Clear/fill background
        super.doRender(reltime);

        /*
         * Source dimensions crop the image. Dest dimensions set the size that
         * the image will be rendered at *on the layer*. Note that this is
         * different than the layer dimensions (`this.width` and `this.height`).
         * The main reason this distinction exists is so that an image layer can
         * be rotated without being cropped (see iss #46).
         */
        this.vctx.drawImage(
          this.source,
          val(this, 'sourceX', reltime), val(this, 'sourceY', reltime),
          val(this, 'sourceWidth', reltime), val(this, 'sourceHeight', reltime),
          // `destX` and `destY` are relative to the layer
          val(this, 'destX', reltime), val(this, 'destY', reltime),
          val(this, 'destWidth', reltime), val(this, 'destHeight', reltime)
        );
      }

      /**
       * The raw html media element
       * @type HTMLMediaElement
       */
      get source () {
        return this._source
      }

      getDefaultOptions () {
        return {
          ...superclass.prototype.getDefaultOptions(),
          source: undefined, // required
          /**
           * @name module:layer.VisualSource#sourceX
           * @type number
           */
          sourceX: 0,
          /**
           * @name module:layer.VisualSource#sourceY
           * @type number
           */
          sourceY: 0,
          /**
           * @name module:layer.VisualSource#sourceWidth
           * @type number
           * @desc How much to render of the source, or <code>undefined</code> to
           * render the entire width
           */
          sourceWidth: undefined,
          /**
           * @name module:layer.VisualSource#sourceHeight
           * @type number
           * @desc How much to render of the source, or <code>undefined</code> to
           * render the entire height
           */
          sourceHeight: undefined,
          /**
           * @name module:layer.VisualSource#destX
           * @type number
           */
          destX: 0,
          /**
           * @name module:layer.VisualSource#destY
           * @type number
           */
          destY: 0,
          /**
           * @name module:layer.VisualSource#destWidth
           * @type number
           * @desc Width to render the source at, or <code>undefined</code> to
           * use the layer's width
           */
          destWidth: undefined,
          /**
           * @name module:layer.VisualSource#destHeight
           * @type number
           * @desc Height to render the source at, or <code>undefined</code> to
           * use the layer's height
           */
          destHeight: undefined
        }
      }
    }  VisualSource.prototype.propertyFilters = {
      ...Visual.propertyFilters,

      /*
       * If no layer width was provided, fall back to the dest width.
       * If no dest width was provided, fall back to the source width.
       * If no source width was provided, fall back to `source.width`.
       */
      sourceWidth: function (sourceWidth) {
        // != instead of !== to account for `null`
        const width = this.source instanceof HTMLImageElement
          ? this.source.width
          : this.source.videoWidth;
        return sourceWidth != undefined ? sourceWidth : width // eslint-disable-line eqeqeq
      },
      sourceHeight: function (sourceHeight) {
        const height = this.source instanceof HTMLImageElement
          ? this.source.height
          : this.source.videoHeight;
        return sourceHeight != undefined ? sourceHeight : height // eslint-disable-line eqeqeq
      },
      destWidth: function (destWidth) {
        // I believe reltime is redundant, as element#currentTime can be used
        // instead. (TODO: fact check)
        /* eslint-disable eqeqeq */
        return destWidth != undefined
          ? destWidth : val(this, 'sourceWidth', this.currentTime)
      },
      destHeight: function (destHeight) {
        /* eslint-disable eqeqeq */
        return destHeight != undefined
          ? destHeight : val(this, 'sourceHeight', this.currentTime)
      },
      width: function (width) {
        /* eslint-disable eqeqeq */
        return width != undefined
          ? width : val(this, 'destWidth', this.currentTime)
      },
      height: function (height) {
        /* eslint-disable eqeqeq */
        return height != undefined
          ? height : val(this, 'destHeight', this.currentTime)
      }
    };

    return VisualSource
  };

  class Image extends VisualSourceMixin(Visual) {}

  class Text extends Visual {
    /**
     * Creates a new text layer
     *
     * @param {object} options - various optional arguments
     * @param {string} options.text - the text to display
     * @param {string} [options.font="10px sans-serif"]
     * @param {string} [options.color="#fff"]
     * @param {number} [options.textX=0] - the text's horizontal offset relative
     * to the layer
     * @param {number} [options.textY=0] - the text's vertical offset relative to
     * the layer
     * @param {number} [options.maxWidth=null] - the maximum width of a line of
     * text
     * @param {string} [options.textAlign="start"] - horizontal align
     * @param {string} [options.textBaseline="top"] - vertical align
     * @param {string} [options.textDirection="ltr"] - the text direction
     *
     */
    // TODO: add padding options
    // TODO: is textX necessary? it seems inconsistent, because you can't define
    // width/height directly for a text layer
    constructor (options = {}) {
      // Default to no (transparent) background
      super({ background: null, ...options });
      applyOptions(options, this);

      // this._prevText = undefined;
      // // because the canvas context rounds font size, but we need to be more accurate
      // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
      // this._lastFont = undefined;
      // this._prevMaxWidth = undefined;
    }

    doRender (reltime) {
      super.doRender(reltime);
      const text = val(this, 'text', reltime); const font = val(this, 'font', reltime);
      const maxWidth = this.maxWidth ? val(this, 'maxWidth', reltime) : undefined;
      // // properties that affect metrics
      // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
      //     this._updateMetrics(text, font, maxWidth);

      this.vctx.font = font;
      this.vctx.fillStyle = val(this, 'color', reltime);
      this.vctx.textAlign = val(this, 'textAlign', reltime);
      this.vctx.textBaseline = val(this, 'textBaseline', reltime);
      this.vctx.textDirection = val(this, 'textDirection', reltime);
      this.vctx.fillText(
        text, val(this, 'textX', reltime), val(this, 'textY', reltime),
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

    getDefaultOptions () {
      return {
        ...Visual.prototype.getDefaultOptions(),
        background: null,
        text: undefined, // required
        /**
         * @name module:layer.Text#font
         * @type string
         * @desc The CSS font to render with
         */
        font: '10px sans-serif',
        /**
         * @name module:layer.Text#font
         * @type string
         * @desc The CSS color to render with
         */
        color: '#fff',
        /**
         * @name module:layer.Text#textX
         * @type number
         * @desc Offset of the text relative to the layer
         */
        textX: 0,
        /**
         * @name module:layer.Text#textY
         * @type number
         * @desc Offset of the text relative to the layer
         */
        textY: 0,
        /**
         * @name module:layer.Text#maxWidth
         * @type number
         */
        maxWidth: null,
        /**
         * @name module:layer.Text#textAlign
         * @type string
         * @desc The horizontal alignment
         * @see [<code>CanvasRenderingContext2D#textAlign</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign}
         */
        textAlign: 'start',
        /**
         * @name module:layer.Text#textAlign
         * @type string
         * @desc the vertical alignment
         * @see [<code>CanvasRenderingContext2D#textBaseline</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
         */
        textBaseline: 'top',
        /**
         * @name module:layer.Text#textDirection
         * @type string
         * @see [<code>CanvasRenderingContext2D#direction</code>]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
         */
        textDirection: 'ltr'
      }
    }
  }

  // Use mixins instead of `extend`ing two classes (which isn't supported by
  // JavaScript).
  /**
   * @extends module:layer~Media
   */
  class Video extends AudioSourceMixin(VisualSourceMixin(Visual)) {}

  /**
   * @module layer
   */

  var layers = /*#__PURE__*/Object.freeze({
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
   * @module movie
   */

  /**
   * Contains all layers and movie information<br> Implements a sub/pub system
   *
   */
  // TODO: Implement event "durationchange", and more
  // TODO: Add width and height options
  // TODO: Make record option to make recording video output to the user while
  // it's recording
  // TODO: rename renderingFrame -> refreshing
  class Movie {
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
    constructor (options) {
      // TODO: move into multiple methods!
      // Rename audioContext -> _actx
      if ('audioContext' in options) {
        options._actx = options.audioContext;
      }
      delete options.audioContext; // TODO: move up a line :P

      // Proxy that will be returned by constructor
      const newThis = watchPublic(this);
      // Set canvas option manually, because it's readonly.
      this._canvas = options.canvas;
      delete options.canvas;
      // Don't send updates when initializing, so use this instead of newThis:
      this._vctx = this.canvas.getContext('2d'); // TODO: make private?
      applyOptions(options, this);

      const that = newThis;

      this._effectsBack = [];
      this._effects = new Proxy(newThis._effectsBack, {
        apply: function (target, thisArg, argumentsList) {
          return thisArg[target].apply(newThis, argumentsList)
        },
        deleteProperty: function (target, property) {
          // Refresh screen when effect is removed, if the movie isn't playing
          // already.
          const value = target[property];
          publish(that, 'movie.change.effect.remove', { effect: value });
          value.detach();
          delete target[property];
          return true
        },
        set: function (target, property, value) {
          // Check if property is an number (an index)
          if (!isNaN(property)) {
            if (target[property]) {
              publish(that, 'movie.change.effect.remove', {
                effect: target[property]
              });
              target[property].detach();
            }
            // Attach effect to movie
            value.attach(that);
            // Refresh screen when effect is set, if the movie isn't playing
            // already.
            publish(that, 'movie.change.effect.add', { effect: value });
          }
          target[property] = value;
          return true
        }
      });

      this._layersBack = [];
      this._layers = new Proxy(newThis._layersBack, {
        apply: function (target, thisArg, argumentsList) {
          return thisArg[target].apply(newThis, argumentsList)
        },
        deleteProperty: function (target, property) {
          const oldDuration = this.duration;
          const value = target[property];
          value.detach(that);
          const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration;
          if (current) {
            publish(that, 'movie.change.layer.remove', { layer: value });
          }
          publish(that, 'movie.change.duration', { oldDuration });
          delete target[property];
          return true
        },
        set: function (target, property, value) {
          const oldDuration = this.duration;
          // Check if property is an number (an index)
          if (!isNaN(property)) {
            if (target[property]) {
              publish(that, 'movie.change.layer.remove', {
                layer: target[property]
              });
              target[property].detach();
            }
            // Attach layer to movie
            value.attach(that);
            // Refresh screen when a relevant layer is added or removed
            const current = that.currentTime >= value.startTime && that.currentTime < value.startTime + value.duration;
            if (current) {
              publish(that, 'movie.change.layer.add', { layer: value });
            }
            publish(that, 'movie.change.duration', { oldDuration });
          }
          target[property] = value;
          return true
        }
      });
      this._paused = true;
      this._ended = false;
      // This variable helps prevent multiple frame-rendering loops at the same
      // time (see `render`). It's only applicable when rendering.
      this._renderingFrame = false;
      this._currentTime = 0;

      // For recording
      this._mediaRecorder = null;

      // -1 works well in inequalities
      // The last time `play` was called
      this._lastPlayed = -1;
      // What was `currentTime` when `play` was called
      this._lastPlayedOffset = -1;
      // newThis._updateInterval = 0.1; // time in seconds between each "timeupdate" event
      // newThis._lastUpdate = -1;

      if (newThis.autoRefresh) {
        newThis.refresh(); // render single frame on creation
      }

      // Subscribe to own event "change" (child events propogate up)
      subscribe(newThis, 'movie.change', () => {
        if (newThis.autoRefresh && !newThis.rendering) {
          newThis.refresh();
        }
      });

      // Subscribe to own event "ended"
      subscribe(newThis, 'movie.ended', () => {
        if (newThis.recording) {
          newThis._mediaRecorder.requestData();
          newThis._mediaRecorder.stop();
        }
      });

      return newThis
    }

    /**
     * Plays the movie
     * @return {Promise} fulfilled when the movie is done playing, never fails
     */
    play () {
      return new Promise((resolve, reject) => {
        if (!this.paused) {
          throw new Error('Already playing')
        }

        this._paused = this._ended = false;
        this._lastPlayed = performance.now();
        this._lastPlayedOffset = this.currentTime;

        if (!this._renderingFrame) {
          // Not rendering (and not playing), so play.
          this._render(true, undefined, resolve);
        }
        // Stop rendering frame if currently doing so, because playing has higher
        // priority. This will effect the next _render call.
        this._renderingFrame = false;

        publish(this, 'movie.play', {});
      })
    }

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
    // TEST: *support recording that plays back with audio!*
    // TODO: figure out how to do offline recording (faster than realtime).
    // TODO: improve recording performance to increase frame rate?
    record (options) {
      if (options.video === false && options.audio === false) {
        throw new Error('Both video and audio cannot be disabled')
      }

      if (!this.paused) {
        throw new Error('Cannot record movie while already playing or recording')
      }
      return new Promise((resolve, reject) => {
        const canvasCache = this.canvas;
        // Record on a temporary canvas context
        this._canvas = document.createElement('canvas');
        this.canvas.width = canvasCache.width;
        this.canvas.height = canvasCache.height;
        this._vctx = this.canvas.getContext('2d');

        // frame blobs
        const recordedChunks = [];
        // Combine image + audio, or just pick one
        let tracks = [];
        if (options.video !== false) {
          const visualStream = this.canvas.captureStream(options.framerate);
          tracks = tracks.concat(visualStream.getTracks());
        }
        // Check if there's a layer that's an instance of an AudioSourceMixin
        // (Audio or Video)
        const hasMediaTracks = this.layers.some(layer => layer instanceof Audio || layer instanceof Video);
        // If no media tracks present, don't include an audio stream, because
        // Chrome doesn't record silence when an audio stream is present.
        if (hasMediaTracks && options.audio !== false) {
          const audioDestination = this.actx.createMediaStreamDestination();
          const audioStream = audioDestination.stream;
          tracks = tracks.concat(audioStream.getTracks());
          publish(this, 'movie.audiodestinationupdate',
            { movie: this, destination: this.actx.destination }
          );
        }
        const stream = new MediaStream(tracks);
        const mediaRecorder = new MediaRecorder(stream, options.mediaRecorderOptions);
        mediaRecorder.ondataavailable = event => {
          // if (this._paused) reject(new Error("Recording was interrupted"));
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };
        // TODO: publish to movie, not layers
        mediaRecorder.onstop = () => {
          this._ended = true;
          this._canvas = canvasCache;
          this._vctx = this.canvas.getContext('2d');
          publish(this, 'movie.audiodestinationupdate',
            { movie: this, destination: this.actx.destination }
          );
          this._mediaRecorder = null;
          // Construct the exported video out of all the frame blobs.
          resolve(
            new Blob(recordedChunks, {
              type: options.type || 'video/webm'
            })
          );
        };
        mediaRecorder.onerror = reject;

        mediaRecorder.start();
        this._mediaRecorder = mediaRecorder;
        this.play();
        publish(this, 'movie.record', { options });
      })
    }

    /**
     * Stops the movie, without reseting the playback position
     * @return {Movie} the movie (for chaining)
     */
    pause () {
      this._paused = true;
      // Deactivate all layers
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        layer.stop(this.currentTime - layer.startTime);
        layer._active = false;
      }
      publish(this, 'movie.pause', {});
      return this
    }

    /**
     * Stops playback and resets the playback position
     * @return {Movie} the movie (for chaining)
     */
    stop () {
      this.pause();
      this.currentTime = 0;
      return this
    }

    /**
     * @param {number} [timestamp=performance.now()]
     * @param {function} [done=undefined] - called when done playing or when the current frame is loaded
     * @private
     */
    _render (repeat, timestamp = performance.now(), done = undefined) {
      clearCachedValues(this);

      if (!this.rendering) {
        // (!this.paused || this._renderingFrame) is true so it's playing or it's
        // rendering a single frame.
        done && done();
        return
      }

      this._updateCurrentTime(timestamp);
      // Bad for performance? (remember, it's calling Array.reduce)
      const end = this.duration;
      const ended = this.currentTime >= end;
      if (ended) {
        publish(this, 'movie.ended', { movie: this, repeat: this.repeat });
        this._currentTime = 0; // don't use setter
        publish(this, 'movie.timeupdate', { movie: this });
        this._lastPlayed = performance.now();
        this._lastPlayedOffset = 0; // this.currentTime
        this._renderingFrame = false;
        if (!this.repeat || this.recording) {
          this._ended = true;
          // Deactivate all layers
          for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            layer.stop(this.currentTime - layer.startTime);
            layer._active = false;
          }
        }
        done && done();
        return
      }

      // Do render
      this._renderBackground(timestamp);
      const frameFullyLoaded = this._renderLayers(timestamp);
      this._applyEffects();

      if (frameFullyLoaded) {
        publish(this, 'movie.loadeddata', { movie: this });
      }

      // If didn't load in this instant, repeatedly frame-render until frame is
      // loaded.
      // If the expression below is false, don't publish an event, just silently
      // stop render loop.
      if (!repeat || (this._renderingFrame && frameFullyLoaded)) {
        this._renderingFrame = false;
        done && done();
        return
      }

      window.requestAnimationFrame(timestamp => {
        this._render(repeat, timestamp);
      }); // TODO: research performance cost
    }

    _updateCurrentTime (timestamp) {
      // If we're only instant-rendering (current frame only), it doens't matter
      // if it's paused or not.
      if (!this._renderingFrame) {
        // if ((timestamp - this._lastUpdate) >= this._updateInterval) {
        const sinceLastPlayed = (timestamp - this._lastPlayed) / 1000;
        this._currentTime = this._lastPlayedOffset + sinceLastPlayed; // don't use setter
        publish(this, 'movie.timeupdate', { movie: this });
        // this._lastUpdate = timestamp;
        // }
      }
    }

    _renderBackground (timestamp) {
      this.vctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.background) { // TODO: check val'd result
        this.vctx.fillStyle = val(this, 'background', timestamp);
        this.vctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    /**
     * @return {boolean} whether or not video frames are loaded
     * @param {number} [timestamp=performance.now()]
     * @private
     */
    _renderLayers (timestamp) {
      let frameFullyLoaded = true;
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        const reltime = this.currentTime - layer.startTime;
        // Cancel operation if layer disabled or outside layer time interval
        if (!val(layer, 'enabled', reltime) ||
          // TODO                                                    > or >= ?
          this.currentTime < layer.startTime || this.currentTime > layer.startTime + layer.duration) {
          // Layer is not active.
          // If only rendering this frame, we are not "starting" the layer.
          if (layer.active && !this._renderingFrame) {
            // TODO: make a `deactivate()` method?
            layer.stop(reltime);
            layer._active = false;
          }
          continue
        }
        // If only rendering this frame, we are not "starting" the layer
        if (!layer.active && val(layer, 'enabled', reltime) && !this._renderingFrame) {
          // TODO: make an `activate()` method?
          layer.start(reltime);
          layer._active = true;
        }

        // if the layer has an audio source
        if (layer.source) {
          frameFullyLoaded = frameFullyLoaded && layer.source.readyState >= 2;
        }
        layer.render(reltime);

        // if the layer has visual component
        if (layer.canvas) {
          // layer.canvas.width and layer.canvas.height should already be interpolated
          // if the layer has an area (else InvalidStateError from canvas)
          if (layer.canvas.width * layer.canvas.height > 0) {
            this.vctx.drawImage(layer.canvas,
              val(layer, 'x', reltime), val(layer, 'y', reltime), layer.canvas.width, layer.canvas.height
            );
          }
        }
      }

      return frameFullyLoaded
    }

    _applyEffects () {
      for (let i = 0; i < this.effects.length; i++) {
        const effect = this.effects[i];
        effect.apply(this, this.currentTime);
      }
    }

    /**
     * Refreshes the screen (only use this if auto-refresh is disabled)
     * @return {Promise} - resolves when the frame is loaded
     */
    refresh () {
      return new Promise((resolve, reject) => {
        this._renderingFrame = true;
        this._render(false, undefined, resolve);
      })
    }

    /**
     * Convienence method
     * @todo Make private
     */
    publishToLayers (type, event) {
      for (let i = 0; i < this.layers.length; i++) {
        publish(this.layers[i], type, event);
      }
    }

    /**
     * If the movie is playing, recording or refreshing
     * @type boolean
     */
    get rendering () {
      return !this.paused || this._renderingFrame
    }

    /**
     * If the movie is refreshing current frame
     * @type boolean
     */
    get renderingFrame () {
      return this._renderingFrame
    }

    /**
     * If the movie is recording
     * @type boolean
     */
    get recording () {
      return !!this._mediaRecorder
    }

    /**
     * The combined duration of all layers
     * @type number
     */
    // TODO: dirty flag?
    get duration () {
      return this.layers.reduce((end, layer) => Math.max(layer.startTime + layer.duration, end), 0)
    }

    /**
     * @type layer.Base[]
     */
    get layers () {
      return this._layers
    }

    /**
     * Convienence method for <code>layers.push()</code>
     * @param {BaseLayer} layer
     * @return {Movie} the movie
     */
    addLayer (layer) {
      this.layers.push(layer); return this
    }

    /**
     * @type effect.Base[]
     */
    // Private because it's a proxy (so it can't be overwritten).
    get effects () {
      return this._effects
    }

    /**
     * Convienence method for <code>effects.push()</code>
     * @param {BaseEffect} effect
     * @return {Movie} the movie
     */
    addEffect (effect) {
      this.effects.push(effect); return this
    }

    /**
     * @type boolean
     */
    get paused () {
      return this._paused
    }

    /**
     * If the playback position is at the end of the movie
     * @type boolean
     */
    get ended () {
      return this._ended
    }

    /**
     * The current playback position
     * @type number
     */
    get currentTime () {
      return this._currentTime
    }

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
    // TODO: Refresh if only auto-refreshing is enabled
    setCurrentTime (time, refresh = true) {
      return new Promise((resolve, reject) => {
        this._currentTime = time;
        publish(this, 'movie.seek', {});
        if (refresh) {
          // Pass promise callbacks to `refresh`
          this.refresh().then(resolve).catch(reject);
        } else {
          resolve();
        }
      })
    }

    set currentTime (time) {
      this._currentTime = time;
      publish(this, 'movie.seek', {});
      // Render single frame to match new time
      this.refresh();
    }

    /**
     * The rendering canvas
     * @type HTMLCanvasElement
     */
    get canvas () {
      return this._canvas
    }

    /**
     * The rendering canvas's context
     * @type CanvasRenderingContext2D
     */
    get vctx () {
      return this._vctx
    }

    /**
     * The audio context to which audio output is sent
     * @type BaseAudioContext
     */
    get actx () {
      return this._actx
    }

    /**
     * The width of the rendering canvas
     * @type number
     */
    get width () {
      return this.canvas.width
    }

    /**
     * The height of the rendering canvas
     * @type number
     */
    get height () {
      return this.canvas.height
    }

    set width (width) {
      this.canvas.width = width;
    }

    set height (height) {
      this.canvas.height = height;
    }

    get movie () {
      return this
    }

    getDefaultOptions () {
      return {
        canvas: undefined, // required
        _actx: new AudioContext(),
        /**
         * @name module:movie#background
         * @type string
         * @desc The css color for the background, or <code>null</code> for transparency
         */
        background: '#000',
        /**
         * @name module:movie#repeat
         * @type boolean
         */
        repeat: false,
        /**
         * @name module:movie#autoRefresh
         * @type boolean
         * @desc Whether to refresh when changes are made that would effect the current frame
         */
        autoRefresh: true
      }
    }
  }

  // id for events (independent of instance, but easy to access when on prototype chain)
  Movie.prototype.type = 'movie';
  // TODO: refactor so we don't need to explicitly exclude some of these
  Movie.prototype.publicExcludes = ['canvas', 'vctx', 'actx', 'layers', 'effects'];
  Movie.prototype.propertyFilters = {};

  /**
   * Modifies the visual contents of a layer.
   *
   * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
   * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
   * different module.</em>
   */
  class Base$1 {
    constructor () {
      const newThis = watchPublic(this); // proxy that will be returned by constructor

      newThis.enabled = true;
      newThis._target = null;

      // Propogate up to target
      subscribe(newThis, 'effect.change.modify', event => {
        if (!newThis._target) {
          return
        }
        const type = `${newThis._target.type}.change.effect.modify`;
        publish(newThis._target, type, { ...event, target: newThis._target, source: newThis, type });
      });

      return newThis
    }

    attach (target) {
      this._target = target;
    }

    detach () {
      this._target = null;
    }

    // subclasses must implement apply
    /**
     * Apply this effect to a target at the given time
     *
     * @param {module:movie|module:layer.Base} target
     * @param {number} reltime - the movie's current time relative to the layer
     * (will soon be replaced with an instance getter)
     * @abstract
     */
    apply (target, reltime) {
      throw new Error('No overriding method found or super.apply was called')
    }

    /**
     * The current time of the target
     * @type number
     */
    get currentTime () {
      return this._target ? this._target.currentTime : undefined
    }

    get parent () {
      return this._target
    }

    get movie () {
      return this._target ? this._target.movie : undefined
    }
  }
  // id for events (independent of instance, but easy to access when on prototype
  // chain)
  Base$1.prototype.type = 'effect';
  Base$1.prototype.publicExcludes = [];
  Base$1.prototype.propertyFilters = {};

  /**
   * A hardware-accelerated pixel mapping
   */
  // TODO: can `v_TextureCoord` be replaced by `gl_FragUV`?
  class Shader extends Base$1 {
    /**
     * @param {string} fragmentSrc
     * @param {object} [userUniforms={}]
     * @param {object[]} [userTextures=[]]
     * @param {object} [sourceTextureOptions={}]
     */
    constructor (fragmentSrc = Shader._IDENTITY_FRAGMENT_SOURCE, userUniforms = {}, userTextures = [], sourceTextureOptions = {}) {
      super();
      // TODO: split up into multiple methods

      const gl = this._initGl();
      this._program = Shader._initShaderProgram(gl, Shader._VERTEX_SOURCE, fragmentSrc);
      this._buffers = Shader._initRectBuffers(gl);

      this._initTextures(userUniforms, userTextures, sourceTextureOptions);
      this._initAttribs();
      this._initUniforms(userUniforms);
    }

    _initGl () {
      this._canvas = document.createElement('canvas');
      const gl = this._canvas.getContext('webgl');
      if (gl === null) {
        throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
      }
      this._gl = gl;
      return gl
    }

    _initTextures (userUniforms, userTextures, sourceTextureOptions) {
      const gl = this._gl;
      const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
      if (userTextures.length > maxTextures) {
        console.warn('Too many textures!');
      }
      this._userTextures = {};
      for (const name in userTextures) {
        const userOptions = userTextures[name];
        // Apply default options.
        const options = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...userOptions };

        if (options.createUniform) {
          /*
           * Automatically, create a uniform with the same name as this texture,
           * that points to it. This is an easy way for the user to use custom
           * textures, without having to define multiple properties in the effect
           * object.
           */
          if (userUniforms[name]) {
            throw new Error(`Texture - uniform naming conflict: ${name}!`)
          }
          // Add this as a "user uniform".
          userUniforms[name] = '1i'; // texture pointer
        }
        this._userTextures[name] = options;
      }
      this._sourceTextureOptions = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...sourceTextureOptions };
    }

    _initAttribs () {
      const gl = this._gl;
      this._attribLocations = {
        textureCoord: gl.getAttribLocation(this._program, 'a_TextureCoord')
        // a_VertexPosition ?? somehow it works without it though...
      };
    }

    _initUniforms (userUniforms) {
      const gl = this._gl;
      this._uniformLocations = {
        source: gl.getUniformLocation(this._program, 'u_Source'),
        size: gl.getUniformLocation(this._program, 'u_Size')
      };
      // The options value can just be a string equal to the type of the variable,
      // for syntactic sugar. If this is the case, convert it to a real options
      // object.
      this._userUniforms = {};
      for (const name in userUniforms) {
        const val = userUniforms[name];
        this._userUniforms[name] = typeof val === 'string' ? { type: val } : val;
      }
      for (const unprefixed in userUniforms) {
        // property => u_Property
        const prefixed = 'u_' + unprefixed.charAt(0).toUpperCase() + (unprefixed.length > 1 ? unprefixed.slice(1) : '');
        this._uniformLocations[unprefixed] = gl.getUniformLocation(this._program, prefixed);
      }
    }

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

    apply (target, reltime) {
      this._checkDimensions(target);
      this._refreshGl();

      this._enablePositionAttrib();
      this._enableTexCoordAttrib();
      this._prepareTextures(target, reltime);

      this._gl.useProgram(this._program);

      this._prepareUniforms(target, reltime);

      this._draw(target);
    }

    _checkDimensions (target) {
      const gl = this._gl;
      // TODO: Change target.canvas.width => target.width and see if it breaks
      // anything.
      if (this._canvas.width !== target.canvas.width || this._canvas.height !== target.canvas.height) { // (optimization)
        this._canvas.width = target.canvas.width;
        this._canvas.height = target.canvas.height;

        gl.viewport(0, 0, target.canvas.width, target.canvas.height);
      }
    }

    _refreshGl () {
      const gl = this._gl;
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
    }

    _enablePositionAttrib () {
      const gl = this._gl;
      // Tell WebGL how to pull out the positions from buffer
      const numComponents = 2;
      // The data in the buffer is 32bit floats
      const type = gl.FLOAT;
      // Don't normalize
      const normalize = false;
      // How many bytes to get from one set of values to the next
      // 0 = use type and numComponents above
      const stride = 0;
      // How many bytes inside the buffer to start from
      const offset = 0;
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

    _enableTexCoordAttrib () {
      const gl = this._gl;
      // tell webgl how to pull out the texture coordinates from buffer
      const numComponents = 2; // every coordinate composed of 2 values (uv)
      const type = gl.FLOAT; // the data in the buffer is 32 bit float
      const normalize = false; // don't normalize
      const stride = 0; // how many bytes to get from one set to the next
      const offset = 0; // how many bytes inside the buffer to start from
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.textureCoord);
      gl.vertexAttribPointer(this._attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
      gl.enableVertexAttribArray(this._attribLocations.textureCoord);
    }

    _prepareTextures (target, reltime) {
      const gl = this._gl;
      // TODO: figure out which properties should be private / public

      // Tell WebGL we want to affect texture unit 0
      // Call `activeTexture` before `_loadTexture` so it won't be bound to the
      // last active texture.
      gl.activeTexture(gl.TEXTURE0);
      this._inputTexture = Shader._loadTexture(gl, target.canvas, this._sourceTextureOptions);
      // Bind the texture to texture unit 0
      gl.bindTexture(gl.TEXTURE_2D, this._inputTexture);

      let i = 0;
      for (const name in this._userTextures) {
        const options = this._userTextures[name];
        /*
         * Call `activeTexture` before `_loadTexture` so it won't be bound to the
         * last active texture.
         * TODO: investigate better implementation of `_loadTexture`
         */
        gl.activeTexture(gl.TEXTURE0 + (Shader.INTERNAL_TEXTURE_UNITS + i)); // use the fact that TEXTURE0, TEXTURE1, ... are continuous
        const preparedTex = Shader._loadTexture(gl, val(this, name, reltime), options); // do it every frame to keep updated (I think you need to)
        gl.bindTexture(gl[options.target], preparedTex);
        i++;
      }
    }

    _prepareUniforms (target, reltime) {
      const gl = this._gl;
      // Set the shader uniforms.

      // Tell the shader we bound the texture to texture unit 0.
      // All base (Shader class) uniforms are optional.
      if (this._uniformLocations.source) {
        gl.uniform1i(this._uniformLocations.source, 0);
      }

      // All base (Shader class) uniforms are optional.
      if (this._uniformLocations.size) {
        gl.uniform2iv(this._uniformLocations.size, [target.canvas.width, target.canvas.height]);
      }

      for (const unprefixed in this._userUniforms) {
        const options = this._userUniforms[unprefixed];
        const value = val(this, unprefixed, reltime);
        const preparedValue = this._prepareValue(value, options.type, reltime, options);
        const location = this._uniformLocations[unprefixed];
        // haHA JavaScript (`options.type` is "1f", for instance)
        gl['uniform' + options.type](location, preparedValue);
      }
      gl.uniform1i(this._uniformLocations.test, 0);
    }

    _draw (target) {
      const gl = this._gl;

      const offset = 0;
      const vertexCount = 4;
      gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

      // clear the target, in case the effect outputs transparent pixels
      target.vctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
      // copy internal image state onto target
      target.vctx.drawImage(this._canvas, 0, 0);
    }

    /**
     * Converts a value of a standard type for javascript to a standard type for
     * GLSL
     * @param value - the raw value to prepare
     * @param {string} outputType - the WebGL type of |value|; example:
     * <code>1f</code> for a float
     * @param {number} reltime - current time, relative to the target
     * @param {object} [options] - Optional config
     */
    _prepareValue (value, outputType, reltime, options = {}) {
      const def = options.defaultFloatComponent || 0;
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
        let i = 0;
        for (const name in this._userTextures) {
          const testValue = val(this, name, reltime);
          if (value === testValue) {
            value = Shader.INTERNAL_TEXTURE_UNITS + i; // after the internal texture units
          }
          i++;
        }
      }

      if (outputType === '3fv') {
        // allow 4-component vectors; TODO: why?
        if (Array.isArray(value) && (value.length === 3 || value.length === 4)) {
          return value
        }
        // kind of loose so this can be changed if needed
        if (typeof value === 'object') {
          return [
            value.r !== undefined ? value.r : def,
            value.g !== undefined ? value.g : def,
            value.b !== undefined ? value.b : def
          ]
        }

        throw new Error(`Invalid type: ${outputType} or value: ${value}`)
      }

      if (outputType === '4fv') {
        if (Array.isArray(value) && value.length === 4) {
          return value
        }
        // kind of loose so this can be changed if needed
        if (typeof value === 'object') {
          return [
            value.r !== undefined ? value.r : def,
            value.g !== undefined ? value.g : def,
            value.b !== undefined ? value.b : def,
            value.a !== undefined ? value.a : def
          ]
        }

        throw new Error(`Invalid type: ${outputType} or value: ${value}`)
      }

      return value
    }
  }
  // Shader.prototype.getpublicExcludes = () =>
  Shader._initRectBuffers = gl => {
    const position = [
      // the screen/canvas (output)
      -1.0, 1.0,
      1.0, 1.0,
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
    }
  };
  /**
   * Creates the quad covering the screen
   */
  Shader._initBuffer = (gl, data) => {
    const buffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    return buffer
  };
  /**
   * Creates a webgl texture from the source.
   * @param {object} [options] - optional WebGL config for texture
   * @param {number} [options.target=gl.TEXTURE_2D]
   * @param {number} [options.level=0]
   * @param {number} [options.internalFormat=gl.RGBA]
   * @param {number} [options.srcFormat=gl.RGBA]
   * @param {number} [options.srcType=gl.UNSIGNED_BYTE]
   * @param {number} [options.wrapS=gl.CLAMP_TO_EDGE]
   * @param {number} [options.wrapT=gl.CLAMP_TO_EDGE]
   * @param {number} [options.minFilter=gl.LINEAR]
   * @param {number} [options.magFilter=gl.LINEAR]
   */
  Shader._loadTexture = (gl, source, options = {}) => {
    // Apply default options, just in case.
    options = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...options };
    // When creating the option, the user can't access `gl` so access it here.
    const target = gl[options.target];
    const level = options.level;
    const internalFormat = gl[options.internalFormat];
    const srcFormat = gl[options.srcFormat];
    const srcType = gl[options.srcType];
    const wrapS = gl[options.wrapS];
    const wrapT = gl[options.wrapT];
    const minFilter = gl[options.minFilter];
    const magFilter = gl[options.magFilter];
    // TODO: figure out how wrap-s and wrap-t interact with mipmaps
    // (for legacy support)
    // let wrapS = options.wrapS ? options.wrapS : gl.CLAMP_TO_EDGE,
    //     wrapT = options.wrapT ? options.wrapT : gl.CLAMP_TO_EDGE;

    const tex = gl.createTexture();
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
    const w = target instanceof HTMLVideoElement ? target.videoWidth : target.width;
    const h = target instanceof HTMLVideoElement ? target.videoHeight : target.height;
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
    if ((w && isPowerOf2(w)) && (h && isPowerOf2(h))) {
      // Yes, it's a power of 2. All wrap modes are valid. Generate mips.
      gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
      gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
      gl.generateMipmap(target);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      if (wrapS !== gl.CLAMP_TO_EDGE || wrapT !== gl.CLAMP_TO_EDGE) {
        console.warn('Wrap mode is not CLAMP_TO_EDGE for a non-power-of-two texture. Defaulting to CLAMP_TO_EDGE');
      }
      gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    return tex
  };
  const isPowerOf2 = value => (value && (value - 1)) === 0;
  Shader._initShaderProgram = (gl, vertexSrc, fragmentSrc) => {
    const vertexShader = Shader._loadShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = Shader._loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // Check program creation status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.warn('Unable to link shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null
    }

    return shaderProgram
  };
  Shader._loadShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Check compile status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('An error occured compiling shader: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null
    }

    return shader
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

  varying highp vec2 v_TextureCoord;

  void main() {
      gl_FragColor = texture2D(u_Source, v_TextureCoord);
  }
`;

  /**
   * Changes the brightness
   */
  class Brightness extends Shader {
    /**
     * @param {number} [brightness=0] - the value to add to each pixel's color
     * channels (between -255 and 255)
     */
    constructor (brightness = 0.0) {
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
        brightness: '1f'
      });
      /**
       * The value to add to each pixel's color channels (between -255 and 255)
       * @type number
       */
      this.brightness = brightness;
    }
  }

  /**
   * Multiplies each channel by a different factor
   */
  class Channels extends Shader {
    /**
     * @param {module:util.Color} factors - channel factors, each defaulting to 1
     */
    constructor (factors = {}) {
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
        factors: { type: '4fv', defaultFloatComponent: 1 }
      });

      /**
       * Channel factors, each defaulting to 1
       * @type module:util.Color
       */
      this.factors = factors;
    }
  }

  /**
   * Reduces alpha for pixels which are close to a specified target color
   */
  class ChromaKey extends Shader {
    /**
     * @param {module:util.Color} [target={r: 0, g: 0, b: 0}] - the color to
     * remove
     * @param {number} [threshold=0] - how much error is allowed
     * @param {boolean} [interpolate=false] - <code>true</code> to interpolate
     * the alpha channel, or <code>false</code> value for no smoothing (i.e. an
     * alpha of either 0 or 255)
     * @param {number} [smoothingSharpness=0] - a modifier to lessen the
     * smoothing range, if applicable
     */
    // TODO: Use <code>smoothingSharpness</code>
    constructor (target = { r: 0, g: 0, b: 0 }, threshold = 0, interpolate = false/*, smoothingSharpness=0 */) {
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
        target: '3fv',
        threshold: '1f',
        interpolate: '1i'
      });
      /**
       * The color to remove
       * @type module:util.Color
       */
      this.target = target;
      /**
       * How much error is alloed
       * @type number
       */
      this.threshold = threshold;
      /**
       * True value to interpolate the alpha channel,
       *  or false value for no smoothing (i.e. 255 or 0 alpha)
       * @type boolean
       */
      this.interpolate = interpolate;
      // this.smoothingSharpness = smoothingSharpness;
    }
  }

  /**
   * Changes the contrast
   */
  class Contrast extends Shader {
    /**
     * @param {number} [contrast=1] - the contrast multiplier
     */
    constructor (contrast = 1.0) {
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
        contrast: '1f'
      });
      /**
       * The contrast multiplier
       * @type number
       */
      this.contrast = contrast;
    }
  }

  /**
   * Preserves an ellipse of the layer and clears the rest
   */
  // TODO: Parent layer mask effects will make more complex masks easier
  class EllipticalMask extends Base$1 {
    constructor (x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = 2 * Math.PI, anticlockwise = false) {
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
      this._tmpCanvas = document.createElement('canvas');
      this._tmpCtx = this._tmpCanvas.getContext('2d');
    }

    apply (target, reltime) {
      const ctx = target.vctx;
      const canvas = target.canvas;
      const x = val(this, 'x', reltime);
      const y = val(this, 'y', reltime);
      const radiusX = val(this, 'radiusX', reltime);
      const radiusY = val(this, 'radiusY', reltime);
      const rotation = val(this, 'rotation', reltime);
      const startAngle = val(this, 'startAngle', reltime);
      const endAngle = val(this, 'endAngle', reltime);
      const anticlockwise = val(this, 'anticlockwise', reltime);
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
    }
  }

  /**
   * A sequence of effects to apply, treated as one effect. This can be useful
   * for defining reused effect sequences as one effect.
   */
  class Stack extends Base$1 {
    constructor (effects) {
      super();

      this._effectsBack = [];
      this._effects = new Proxy(this._effectsBack, {
        apply: function (target, thisArg, argumentsList) {
          return thisArg[target].apply(this, argumentsList)
        },
        deleteProperty: function (target, property) {
          const value = target[property];
          value.detach(); // Detach effect from movie
          delete target[property];
          return true
        },
        set: function (target, property, value) {
          if (!isNaN(property)) { // if property is a number (index)
            if (target[property]) {
              target[property].detach(); // Detach old effect from movie
            }
            value.attach(this._target); // Attach effect to movie
          }
          target[property] = value;
          return true
        }
      });
      effects.forEach(effect => this.effects.push(effect));
    }

    attach (movie) {
      super.attach(movie);
      this.effects.forEach(effect => {
        effect.detach();
        effect.attach(movie);
      });
    }

    detach () {
      super.detach();
      this.effects.forEach(effect => {
        effect.detach();
      });
    }

    apply (target, reltime) {
      for (let i = 0; i < this.effects.length; i++) {
        const effect = this.effects[i];
        effect.apply(target, reltime);
      }
    }

    /**
     * @type module:effect.Base[]
     */
    get effects () {
      return this._effects
    }

    /**
     * Convenience method for chaining
     * @param {module:effect.Base} effect - the effect to append
     */
    addEffect (effect) {
      this.effects.push(effect);
      return this
    }
  }

  /**
   * Applies a Gaussian blur
   */
  // TODO: Improve performance
  // TODO: Make sure this is truly gaussian even though it doens't require a
  // standard deviation
  class GaussianBlur extends Stack {
    constructor (radius) {
      // Divide into two shader effects (use the fact that gaussian blurring can
      // be split into components for performance benefits)
      super([
        new GaussianBlurHorizontal(radius),
        new GaussianBlurVertical(radius)
      ]);
    }
  }

  /**
   * Shared class for both horizontal and vertical gaussian blur classes.
   */
  // TODO: If radius == 0, don't affect the image (right now, the image goes black).
  class GaussianBlurComponent extends Shader {
    /**
     * @param {string} src - fragment source code (specific to which component -
     * horizontal or vertical)
     * @param {number} radius - only integers are currently supported
     */
    constructor (src, radius) {
      super(src, {
        radius: '1i'
      }, {
        shape: { minFilter: 'NEAREST', magFilter: 'NEAREST' }
      });
      /**
       * @type number
       */
      this.radius = radius;
      this._radiusCache = undefined;
    }

    apply (target, reltime) {
      const radiusVal = val(this, 'radius', reltime);
      if (radiusVal !== this._radiusCache) {
        // Regenerate gaussian distribution canvas.
        this.shape = GaussianBlurComponent.render1DKernel(
          GaussianBlurComponent.gen1DKernel(radiusVal)
        );
      }
      this._radiusCache = radiusVal;

      super.apply(target, reltime);
    }
  }
  GaussianBlurComponent.prototype.publicExcludes = Shader.prototype.publicExcludes.concat(['shape']);
  /**
   * Render Gaussian kernel to a canvas for use in shader.
   * @param {number[]} kernel
   * @private
   *
   * @return {HTMLCanvasElement}
   */
  GaussianBlurComponent.render1DKernel = kernel => {
    // TODO: Use Float32Array instead of canvas.
    // init canvas
    const canvas = document.createElement('canvas');
    canvas.width = kernel.length;
    canvas.height = 1; // 1-dimensional
    const ctx = canvas.getContext('2d');

    // draw to canvas
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < kernel.length; i++) {
      imageData.data[4 * i + 0] = 255 * kernel[i]; // Use red channel to store distribution weights.
      imageData.data[4 * i + 1] = 0; // Clear all other channels.
      imageData.data[4 * i + 2] = 0;
      imageData.data[4 * i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas
  };
  GaussianBlurComponent.gen1DKernel = radius => {
    const pascal = GaussianBlurComponent.genPascalRow(2 * radius + 1);
    // don't use `reduce` and `map` (overhead?)
    let sum = 0;
    for (let i = 0; i < pascal.length; i++) {
      sum += pascal[i];
    }
    for (let i = 0; i < pascal.length; i++) {
      pascal[i] /= sum;
    }
    return pascal
  };
  GaussianBlurComponent.genPascalRow = index => {
    if (index < 0) {
      throw new Error(`Invalid index ${index}`)
    }
    let currRow = [1];
    for (let i = 1; i < index; i++) {
      const nextRow = [];
      nextRow.length = currRow.length + 1;
      // edges are always 1's
      nextRow[0] = nextRow[nextRow.length - 1] = 1;
      for (let j = 1; j < nextRow.length - 1; j++) {
        nextRow[j] = currRow[j - 1] + currRow[j];
      }
      currRow = nextRow;
    }
    return currRow
  };

  /**
   * Horizontal component of gaussian blur
   */
  class GaussianBlurHorizontal extends GaussianBlurComponent {
    /**
     * @param {number} radius
     */
    constructor (radius) {
      super(`
      #define MAX_RADIUS 250

      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;   // pixel dimensions of input and output
      uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
      uniform int u_Radius;   // TODO: support floating-point radii

      varying highp vec2 v_TextureCoord;

      void main() {
          /*
           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1
           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)
           * So, normalize by accumulating all the weights and dividing by that.
           */
          float totalWeight = 0.0;
          vec4 avg = vec4(0.0);
          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
              if (i >= 2 * u_Radius + 1)
                  break;  // GLSL can only use constants in for-loop declaration, so we break here.
              // (2 * u_Radius + 1) is the width of u_Shape, by definition
              float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format
              totalWeight += weight;
              vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(i - u_Radius, 0.0) / vec2(u_Size));
              avg += weight * sample;
          }
          gl_FragColor = avg / totalWeight;
      }
    `, radius);
    }
  }

  /**
   * Vertical component of gaussian blur
   */
  class GaussianBlurVertical extends GaussianBlurComponent {
    /**
     * @param {number} radius
     */
    constructor (radius) {
      super(`
      #define MAX_RADIUS 250

      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;   // pixel dimensions of input and output
      uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
      uniform int u_Radius;   // TODO: support floating-point radii

      varying highp vec2 v_TextureCoord;

      void main() {
          /*
           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1
           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)
           * So, normalize by accumulating all the weights and dividing by that.
           */
          float totalWeight = 0.0;
          vec4 avg = vec4(0.0);
          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
              if (i >= 2 * u_Radius + 1)
                  break;  // GLSL can only use constants in for-loop declaration, so we break here.
              // (2 * u_Radius + 1) is the width of u_Shape, by definition
              float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format
              totalWeight += weight;
              vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(0.0, i - u_Radius) / vec2(u_Size));
              avg += weight * sample;
          }
          gl_FragColor = avg / totalWeight;
      }
    `, radius);
    }
  }

  class Grayscale extends Shader {
    constructor () {
      super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec4 u_Factors;

      varying highp vec2 v_TextureCoord;

      float max3(float x, float y, float z) {
        return max(x, max(y, z));
      }

      float min3(float x, float y, float z) {
        return min(x, min(y, z));
      }

      void main() {
        vec4 color = texture2D(u_Source, v_TextureCoord);
        // Desaturate
        float value = (max3(color.r, color.g, color.b) + min3(color.r, color.g, color.b)) / 2.0;
        gl_FragColor = vec4(value, value, value, color.a);
      }
    `, {});
    }
  }

  /**
   * Makes the target look pixelated
   */
  // TODO: just resample with NEAREST interpolation? but how?
  class Pixelate extends Shader {
    /**
     * @param {number} pixelSize
     */
    constructor (pixelSize = 1) {
      super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;
      uniform int u_PixelSize;

      varying highp vec2 v_TextureCoord;

      void main() {
          int ps = u_PixelSize;

          // Snap to nearest block's center
          vec2 loc = vec2(u_Size) * v_TextureCoord; // pixel-space
          vec2 snappedLoc = float(ps) * floor(loc / float(ps));
          vec2 centeredLoc = snappedLoc + vec2(float(u_PixelSize) / 2.0 + 0.5);
          vec2 clampedLoc = clamp(centeredLoc, vec2(0.0), vec2(u_Size));
          gl_FragColor = texture2D(u_Source, clampedLoc / vec2(u_Size));
      }
    `, {
        pixelSize: '1i'
      });
      /**
       * @type number
       */
      this.pixelSize = pixelSize;
    }

    apply (target, reltime) {
      const ps = val(this, 'pixelSize', reltime);
      if (ps % 1 !== 0 || ps < 0) {
        throw new Error('Pixel size must be a nonnegative integer')
      }

      super.apply(target, reltime);
    }
  }

  /**
   * Transforms a layer or movie using a transformation matrix. Use {@link
   * Transform.Matrix} to either A) calculate those values based on a series of
   * translations, scalings and rotations) or B) input the matrix values
   * directly, using the optional argument in the constructor.
   */
  class Transform extends Base$1 {
    /**
     * @param {module:effect.Transform.Matrix} matrix - how to transform the
     * target
     */
    constructor (matrix) {
      super();
      /**
       * How to transform the target
       * @type module:effect.Transform.Matrix
       */
      this.matrix = matrix;
      this._tmpMatrix = new Transform.Matrix();
      this._tmpCanvas = document.createElement('canvas');
      this._tmpCtx = this._tmpCanvas.getContext('2d');
    }

    apply (target, reltime) {
      if (target.canvas.width !== this._tmpCanvas.width) {
        this._tmpCanvas.width = target.canvas.width;
      }
      if (target.canvas.height !== this._tmpCanvas.height) {
        this._tmpCanvas.height = target.canvas.height;
      }
      // Use data, since that's the underlying storage
      this._tmpMatrix.data = val(this, 'matrix.data', reltime);

      this._tmpCtx.setTransform(
        this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c,
        this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f
      );
      this._tmpCtx.drawImage(target.canvas, 0, 0);
      // Assume it was identity for now
      this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1);
      target.vctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
      target.vctx.drawImage(this._tmpCanvas, 0, 0);
    }
  }
  /**
   * @class
   * A 3x3 matrix for storing 2d transformations
   */
  Transform.Matrix = class Matrix {
    constructor (data) {
      this.data = data || [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ];
    }

    identity () {
      for (let i = 0; i < this.data.length; i++) {
        this.data[i] = Transform.Matrix.IDENTITY.data[i];
      }

      return this
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} [val]
     */
    cell (x, y, val) {
      if (val !== undefined) {
        this.data[3 * y + x] = val;
      }
      return this.data[3 * y + x]
    }

    /* For canvas context setTransform */
    get a () {
      return this.data[0]
    }

    get b () {
      return this.data[3]
    }

    get c () {
      return this.data[1]
    }

    get d () {
      return this.data[4]
    }

    get e () {
      return this.data[2]
    }

    get f () {
      return this.data[5]
    }

    /**
     * Combines <code>this</code> with another matrix <code>other</code>
     * @param other
     */
    multiply (other) {
      // copy to temporary matrix to avoid modifying `this` while reading from it
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          let sum = 0;
          for (let i = 0; i < 3; i++) {
            sum += this.cell(x, i) * other.cell(i, y);
          }
          TMP_MATRIX.cell(x, y, sum);
        }
      }
      // copy data from TMP_MATRIX to this
      for (let i = 0; i < TMP_MATRIX.data.length; i++) {
        this.data[i] = TMP_MATRIX.data[i];
      }
      return this
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    translate (x, y) {
      this.multiply(new Transform.Matrix([
        1, 0, x,
        0, 1, y,
        0, 0, 1
      ]));

      return this
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    scale (x, y) {
      this.multiply(new Transform.Matrix([
        x, 0, 0,
        0, y, 0,
        0, 0, 1
      ]));

      return this
    }

    /**
     * @param {number} a - the angle or rotation in radians
     */
    rotate (a) {
      const c = Math.cos(a); const s = Math.sin(a);
      this.multiply(new Transform.Matrix([
        c, s, 0,
        -s, c, 0,
        0, 0, 1
      ]));

      return this
    }
  };
  /**
   * The identity matrix
   */
  Transform.Matrix.IDENTITY = new Transform.Matrix();
  const TMP_MATRIX = new Transform.Matrix();

  /**
   * @module effect
   */

  var effects = /*#__PURE__*/Object.freeze({
    Base: Base$1,
    Brightness: Brightness,
    Channels: Channels,
    ChromaKey: ChromaKey,
    Contrast: Contrast,
    EllipticalMask: EllipticalMask,
    GaussianBlur: GaussianBlur,
    GaussianBlurHorizontal: GaussianBlurHorizontal,
    GaussianBlurVertical: GaussianBlurVertical,
    Grayscale: Grayscale,
    Pixelate: Pixelate,
    Shader: Shader,
    Stack: Stack,
    Transform: Transform
  });

  /**
   * The entry point
   * @module index
   */

  var index = {
    Movie: Movie,
    layer: layers,
    effect: effects,
    event,
    ...util
  };

  return index;

}());
