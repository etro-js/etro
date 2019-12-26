/**
 * @module util
 */

import { publish } from './event.js'

/**
 * Merges `options` with `defaultOptions`, and then copies the properties with the keys in `defaultOptions`
 *  from the merged object to `destObj`.
 *
 * @return {undefined}
 * @todo Make methods like getDefaultOptions private
 */
export function applyOptions (options, destObj) {
  const defaultOptions = destObj.getDefaultOptions()

  // validate; make sure `keys` doesn't have any extraneous items
  for (const option in options) {
    // eslint-disable-next-line no-prototype-builtins
    if (!defaultOptions.hasOwnProperty(option)) {
      throw new Error("Invalid option: '" + option + "'")
    }
  }

  // merge options and defaultOptions
  options = { ...defaultOptions, ...options }

  // copy options
  for (const option in options) {
    if (!(option in destObj)) {
      destObj[option] = options[option]
    }
  }
}

// https://stackoverflow.com/a/8024294/3783155
/**
 * Get all inherited keys
 * @param {object} obj
 * @param {boolean} excludeObjectClass - don't add properties of the <code>Object</code> prototype
 * @private
 */
function getAllPropertyNames (obj, excludeObjectClass) {
  let props = []
  do {
    props = props.concat(Object.getOwnPropertyNames(obj))
  } while ((obj = Object.getPrototypeOf(obj)) && (excludeObjectClass ? obj.constructor.name !== 'Object' : true))
  return props
}

/**
 * @return {boolean} <code>true</code> if <code>property</code> is a non-array object and all of its own
 *  property keys are numbers or <code>"interpolate"</code> or <code>"interpolationKeys"</code>, and
 * <code>false</code>  otherwise.
 */
function isKeyFrames (property) {
  if ((typeof property !== 'object' || property === null) || Array.isArray(property)) {
    return false
  }
  // is reduce slow? I think it is
  // let keys = Object.keys(property);   // own propeties
  const keys = getAllPropertyNames(property, true) // includes non-enumerable properties (except that of `Object`)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    // convert key to number, because object keys are always converted to strings
    if (isNaN(key) && !(key === 'interpolate' || key === 'interpolationKeys')) {
      return false
    }
  }
  // If it's an empty object, don't treat is as keyframe set.
  // https://stackoverflow.com/a/32108184/3783155
  const isEmpty = property.constructor === Object && Object.entries(property).length === 0
  return !isEmpty
}

// must be cleared at the start of each frame
const valCache = new WeakMap()
function cacheValue (element, path, value) {
  if (!valCache.has(element.movie)) {
    valCache.set(element.movie, new WeakMap())
  }
  const movieCache = valCache.get(element.movie)

  if (!movieCache.has(element)) {
    movieCache.set(element, {})
  }
  const elementCache = movieCache.get(element)

  elementCache[path] = value
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
export function clearCachedValues (movie) {
  valCache.delete(movie)
}

/**
 * Calculates the value of keyframe set <code>property</code> at <code>time</code> if
 * <code>property</code> is an array, or returns <code>property</code>, assuming that it's a number.
 *
 * @param {(*|module:util.KeyFrames)} property - value or map of time-to-value pairs for keyframes
 * @param {object} element - the object to which the property belongs
 * @param {number} time - time to calculate keyframes for, if necessary
 *
 * Note that only values used in keyframes that numbers or objects (including arrays) are interpolated.
 * All other values are taken sequentially with no interpolation. JavaScript will convert parsed colors,
 * if created correctly, to their string representations when assigned to a CanvasRenderingContext2D property
 * (I'm pretty sure).
 *
 * @todo Is this function efficient?
 * @todo Update doc @params to allow for keyframes
 *
 * @typedef {Object} module:util.KeyFrames
 * @property {function} interpolate - the function to interpolate between keyframes, defaults to
 *  {@link module:util.linearInterp}
 * @property {string[]} interpolationKeys - keys to interpolate for objects, defaults to all
 *  own enumerable properties
 */
export function val (element, path, time) {
  if (hasCachedValue(element, path)) {
    return getCachedValue(element, path)
  }

  // get property of element at path
  const pathParts = path.split('.')
  let property = element
  while (pathParts.length > 0) {
    property = property[pathParts.shift()]
  }
  const process = element.propertyFilters[path]

  let value
  if (isKeyFrames(property)) {
    value = valKeyFrame(property, time)
  } else if (typeof property === 'function') {
    value = property(element, time) // TODO? add more args
  } else {
    value = property // simple value
  }
  return cacheValue(element, path, process ? process(value) : value)
}

function valKeyFrame (property, time) {
  // if (Object.keys(property).length === 0) throw "Empty key frame set"; // this will never be executed
  if (time === undefined) {
    throw new Error('|time| is undefined or null')
  }
  // I think .reduce and such are slow to do per-frame (or more)?
  // lower is the max beneath time, upper is the min above time
  let lowerTime = 0; let upperTime = Infinity
  let lowerValue = null; let upperValue = null // default values for the inequalities
  for (let keyTime in property) {
    const keyValue = property[keyTime]
    keyTime = +keyTime // valueOf to convert to number

    if (lowerTime <= keyTime && keyTime <= time) {
      lowerValue = keyValue
      lowerTime = keyTime
    }
    if (time <= keyTime && keyTime <= upperTime) {
      upperValue = keyValue
      upperTime = keyTime
    }
  }
  // TODO: support custom interpolation for 'other' types
  if (lowerValue === null) {
    throw new Error(`No keyframes located before or at time ${time}.`)
  }
  // no need for upperValue if it is flat interpolation
  if (!(typeof lowerValue === 'number' || typeof lowerValue === 'object')) {
    return lowerValue
  }
  if (upperValue === null) {
    throw new Error(`No keyframes located after or at time ${time}.`)
  }
  if (typeof lowerValue !== typeof upperValue) {
    throw new Error('Type mismatch in keyframe values')
  }
  // interpolate
  // the following should mean that there is a key frame *at* |time|; prevents division by zero below
  if (upperTime === lowerTime) {
    return upperValue
  }
  const progress = time - lowerTime; const percentProgress = progress / (upperTime - lowerTime)
  const interpolate = property.interpolate || linearInterp
  return interpolate(lowerValue, upperValue, percentProgress, property.interpolationKeys)
}

/* export function floorInterp(x1, x2, t, objectKeys) {
    // https://stackoverflow.com/a/25835337/3783155 (TODO: preserve getters/setters, etc?)
    return !objectKeys ? x1 : objectKeys.reduce((a, x) => {
        if (x1.hasOwnProperty(x)) a[x] = o[x];  // ignore x2
        return a;
    }, Object.create(Object.getPrototypeOf(x1)));
} */

export function linearInterp (x1, x2, t, objectKeys) {
  if (typeof x1 !== typeof x2) {
    throw new Error('Type mismatch')
  }
  if (typeof x1 !== 'number' && typeof x1 !== 'object') {
    return x1
  } // flat interpolation (floor)
  if (typeof x1 === 'object') { // to work with objects (including arrays)
    // TODO: make this code DRY
    if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) {
      throw new Error('Prototype mismatch')
    }
    const int = Object.create(Object.getPrototypeOf(x1)) // preserve prototype of objects
    // only take the union of properties
    const keys = Object.keys(x1) || objectKeys
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // (only take the union of properties)
      // eslint-disable-next-line no-prototype-builtins
      if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
        continue
      }
      int[key] = linearInterp(x1[key], x2[key], t)
    }
    return int
  }
  return (1 - t) * x1 + t * x2
}

export function cosineInterp (x1, x2, t, objectKeys) {
  if (typeof x1 !== typeof x2) {
    throw new Error('Type mismatch')
  }
  if (typeof x1 !== 'number' && typeof x1 !== 'object') {
    return x1
  } // flat interpolation (floor)
  if (typeof x1 === 'object' && typeof x2 === 'object') { // to work with objects (including arrays)
    if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) {
      throw new Error('Prototype mismatch')
    }
    const int = Object.create(Object.getPrototypeOf(x1)) // preserve prototype of objects
    // only take the union of properties
    const keys = Object.keys(x1) || objectKeys
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // (only take the union of properties)
      // eslint-disable-next-line no-prototype-builtins
      if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
        continue
      }
      int[key] = cosineInterp(x1[key], x2[key], t)
    }
    return int
  }
  const cos = Math.cos(Math.PI / 2 * t)
  return cos * x1 + (1 - cos) * x2
}

/**
 * An rgba color, for proper interpolation and shader effects
 */
export class Color {
  /**
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} a
   */
  constructor (r, g, b, a = 1.0) {
    /** @type number */
    this.r = r
    /** @type number */
    this.g = g
    /** @type number */
    this.b = b
    /** @type number */
    this.a = a
  }

  /**
   * Converts to css color
   */
  toString () {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
  }
}

const parseColorCanvas = document.createElement('canvas')
parseColorCanvas.width = parseColorCanvas.height = 1
const parseColorCtx = parseColorCanvas.getContext('2d')
/**
 * Converts a css color string to a {@link module:util.Color} object representation.
 * @param {string} str
 * @return {module:util.Color} the parsed color
 */
export function parseColor (str) {
  // TODO - find a better way to cope with the fact that invalid
  //        values of "col" are ignored
  parseColorCtx.clearRect(0, 0, 1, 1)
  parseColorCtx.fillStyle = str
  parseColorCtx.fillRect(0, 0, 1, 1)
  const data = parseColorCtx.getImageData(0, 0, 1, 1).data
  return new Color(data[0], data[1], data[2], data[3] / 255)
}

/**
 * A font, for proper interpolation
 */
export class Font {
  /**
   * @param {number} size
   * @param {string} family
   * @param {string} sizeUnit
   */
  constructor (size, sizeUnit, family, style = 'normal', variant = 'normal',
    weight = 'normal', stretch = 'normal', lineHeight = 'normal') {
    this.size = size
    this.sizeUnit = sizeUnit
    this.family = family
    this.style = style
    this.variant = variant
    this.weight = weight
    this.stretch = stretch
    this.lineHeight = lineHeight
  }

  /**
   * Converts to css font syntax
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
   */
  toString () {
    let s = ''
    if (this.style !== 'normal') s += this.style + ' '
    if (this.variant !== 'normal') s += this.variant + ' '
    if (this.weight !== 'normal') s += this.weight + ' '
    if (this.stretch !== 'normal') s += this.stretch + ' '
    s += `${this.size}${this.sizeUnit} `
    if (this.lineHeight !== 'normal') s += this.lineHeight + ' '
    s += this.family

    return s
  }
}

const parseFontEl = document.createElement('div')
/**
 * Converts a css font string to a {@link module:util.Font} object representation.
 * @param {string} str
 * @return {module:util.Font} the parsed font
 */
export function parseFont (str) {
  parseFontEl.setAttribute('style', `font: ${str}`) // assign css string to html element
  const {
    fontSize, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight
  } = parseFontEl.style
  parseFontEl.removeAttribute('style')

  const size = parseFloat(fontSize)
  const sizeUnit = fontSize.substring(size.toString().length)
  return new Font(size, sizeUnit, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight)
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
/* export function extendProto(destination, source) {
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
} */

// TODO: remove this function
export function mapPixels (mapper, canvas, ctx, x, y, width, height, flush = true) {
  x = x || 0
  y = y || 0
  width = width || canvas.width
  height = height || canvas.height
  const frame = ctx.getImageData(x, y, width, height)
  for (let i = 0, l = frame.data.length; i < l; i += 4) {
    mapper(frame.data, i)
  }
  if (flush) {
    ctx.putImageData(frame, x, y)
  }
}

/**
 * <p>Emits "change" event when public properties updated, recursively
 * <p>Must be called before any watchable properties are set, and only once in the prototype chain
 *
 * @param {object} target - object to watch
 */
export function watchPublic (target) {
  const getPath = (receiver, prop) =>
    (receiver === proxy ? '' : (paths.get(receiver) + '.')) + prop
  const callback = function (prop, val, receiver) {
    // Public API property updated, emit 'modify' event.
    publish(proxy, `${target.type}.change.modify`, { property: getPath(receiver, prop), newValue: val })
  }
  const check = prop => !(prop.startsWith('_') || target.publicExcludes.includes(prop))

  const paths = new WeakMap() // the path to each child property (each is a unique proxy)

  const handler = {
    set (obj, prop, val, receiver) {
      // Recurse
      if (typeof val === 'object' && val !== null && !paths.has(val) && check(prop)) {
        val = new Proxy(val, handler)
        paths.set(val, getPath(receiver, prop))
      }

      const was = prop in obj
      // set property or attribute
      // Search prototype chain for the closest setter
      let objProto = obj
      while ((objProto = Object.getPrototypeOf(objProto))) {
        const propDesc = Object.getOwnPropertyDescriptor(objProto, prop)
        if (propDesc && propDesc.set) {
          propDesc.set.call(receiver, val) // call setter, supplying proxy as this (fixes event bugs)
          break
        }
      }
      if (!objProto) { // couldn't find setter; set value on instance
        obj[prop] = val
      }
      // Check if it already existed and if it's a valid property to watch, if on root object
      if (obj !== target || (was && check(prop))) {
        callback(prop, val, receiver)
      }
      return true
    }
  }

  const proxy = new Proxy(target, handler)
  return proxy
}
