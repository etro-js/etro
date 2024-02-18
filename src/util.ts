/**
 * @module util
 */

import EtroObject from './object'
import { Movie } from './movie'

/**
 * Gets the first matching property descriptor in the prototype chain, or
 * undefined.
 * @param obj
 * @param name
 */
function getPropertyDescriptor (obj: unknown, name: string | number | symbol): PropertyDescriptor {
  do {
    const propDesc = Object.getOwnPropertyDescriptor(obj, name)
    if (propDesc) {
      return propDesc
    }

    obj = Object.getPrototypeOf(obj)
  } while (obj)
  return undefined
}

/**
 * Merges `options` with `defaultOptions`, and then copies the properties with
 * the keys in `defaultOptions` from the merged object to `destObj`.
 *
 * @deprecated Each option should be copied individually, and the default value
 * should be set in the constructor. See
 * {@link https://github.com/etro-js/etro/issues/131} for more info.
 *
 * @return
 */
// TODO: Make methods like getDefaultOptions private
export function applyOptions (options: object, destObj: EtroObject): void { // eslint-disable-line @typescript-eslint/ban-types
  const defaultOptions = destObj.getDefaultOptions()

  // Validate; make sure `keys` doesn't have any extraneous items
  for (const option in options) {
    // eslint-disable-next-line no-prototype-builtins
    if (!defaultOptions.hasOwnProperty(option)) {
      throw new Error("Invalid option: '" + option + "'")
    }
  }

  // Merge options and defaultOptions
  options = { ...defaultOptions, ...options }

  // Copy options
  for (const option in options) {
    const propDesc = getPropertyDescriptor(destObj, option)
    // Update the property as long as the property has not been set (unless if it has a setter)
    if (!propDesc || propDesc.set) {
      destObj[option] = options[option]
    }
  }
}

// This must be cleared at the start of each frame
const valCache = new WeakMap()
function cacheValue (element: EtroObject, path: string, value: unknown) {
  // Initiate movie cache
  if (!valCache.has(element.movie)) {
    valCache.set(element.movie, new WeakMap())
  }

  const movieCache = valCache.get(element.movie)

  // Initiate element cache
  if (!movieCache.has(element)) {
    movieCache.set(element, {})
  }

  const elementCache = movieCache.get(element)

  // Cache the value
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
export function clearCachedValues (movie: Movie): void {
  valCache.delete(movie)
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
export class KeyFrame<T> {
  value: unknown[][]
  /** Keys to interpolate, or all keys if undefined */
  interpolationKeys: string[]

  constructor (...value: (number|T)[][]) {
    this.value = value
    this.interpolationKeys = []
  }

  withKeys (keys: string[]): KeyFrame<T> {
    this.interpolationKeys = keys
    return this
  }

  evaluate (time: number): T {
    if (this.value.length === 0) {
      throw new Error('Empty keyframe')
    }

    if (time === undefined) {
      throw new Error('|time| is undefined or null')
    }

    const firstTime: number = this.value[0][0] as number
    if (time < firstTime) {
      throw new Error('No keyframe point before |time|')
    }

    // I think reduce are slow to do per-frame (or more)?
    for (let i = 0; i < this.value.length; i++) {
      const startTime = this.value[i][0] as number
      const startValue = this.value[i][1] as T
      type interpolateType = <U = number | object>(startValue: U, endValue: U, percentProgress: number, interpolationKeys: string[]) => U // eslint-disable-line @typescript-eslint/ban-types
      const interpolate = this.value[i].length === 3 ? this.value[i][2] as interpolateType : linearInterp
      if (i + 1 < this.value.length) {
        const endTime = this.value[i + 1][0] as number
        const endValue = this.value[i + 1][1] as T
        if (startTime <= time && time < endTime) {
          // No need for endValue if it is flat interpolation
          // TODO: support custom interpolation for 'other' types?
          if (!(typeof startValue === 'number' || typeof endValue === 'object')) {
            return startValue
          } else if (typeof startValue !== typeof endValue) {
            throw new Error('Type mismatch in keyframe values')
          } else {
            // Interpolate
            const percentProgress = (time - startTime) / (endTime - startTime)
            return interpolate(
              startValue as unknown as (number | object), // eslint-disable-line @typescript-eslint/ban-types
              endValue as unknown as (number | object), // eslint-disable-line @typescript-eslint/ban-types
              percentProgress, this.interpolationKeys
            ) as unknown as T
          }
        }
      } else {
        // Repeat last value forever
        return startValue
      }
    }
  }
}

/** A dynamic property. Supports simple values, keyframes and functions */
export type Dynamic<T> = T | KeyFrame<T> | ((element: EtroObject, time: number) => T)

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
export function val (element: EtroObject, path: string, time: number): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (hasCachedValue(element, path)) {
    return getCachedValue(element, path)
  }

  // Get property of element at path
  const pathParts = path.split('.')
  let property = element[pathParts.shift()]
  while (pathParts.length > 0) {
    property = property[pathParts.shift()]
  }

  // Property filter function
  const process = element.propertyFilters[path]

  let value
  if (property instanceof KeyFrame) {
    value = property.evaluate(time)
  } else if (typeof property === 'function') {
    value = property(element, time)
  } else {
    // Simple value
    value = property
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

export function linearInterp (x1: number | object, x2: number | object, t: number, objectKeys?: string[]): number | object { // eslint-disable-line @typescript-eslint/ban-types
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
    const int = Object.create(Object.getPrototypeOf(x1))
    // Take the intersection of properties
    const keys = Object.keys(x1) || objectKeys // TODO: reverse operands
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // eslint-disable-next-line no-prototype-builtins
      if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
        continue
      }

      int[key] = linearInterp(x1[key], x2[key], t)
    }
    return int
  }
  return (1 - t) * x1 + t * (x2 as number)
}

export function cosineInterp (x1: number | object, x2: number | object, t: number, objectKeys?: string[]): number | object { // eslint-disable-line @typescript-eslint/ban-types
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
    const int = Object.create(Object.getPrototypeOf(x1))
    // Take the intersection of properties
    const keys = Object.keys(x1) || objectKeys
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // eslint-disable-next-line no-prototype-builtins
      if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
        continue
      }

      int[key] = cosineInterp(x1[key], x2[key], t)
    }
    return int
  }
  const cos = Math.cos(Math.PI / 2 * t)
  return cos * (x1 as number) + (1 - cos) * (x2 as number)
}

/**
 * An RGBA color, for proper interpolation and shader effects
 */
export class Color {
  r: number
  g: number
  b: number
  a: number

  /**
   * @param r
   * @param g
   * @param b
   * @param a
   */
  constructor (r: number, g: number, b: number, a = 1.0) {
    this.r = r
    this.g = g
    this.b = b
    this.a = a
  }

  /**
   * Converts to a CSS color
   */
  toString (): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
  }
}

const parseColorCanvas = document.createElement('canvas')
parseColorCanvas.width = parseColorCanvas.height = 1
const parseColorCtx = parseColorCanvas.getContext('2d')
/**
 * Converts a CSS color string to a {@link Color} object representation.
 * @param str
 * @return the parsed color
 */
export function parseColor (str: string): Color {
  // TODO - find a better way to deal with the fact that invalid values of "col"
  // are ignored.
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
  size: number
  sizeUnit: string
  family: string
  style: string
  variant: string
  weight: string
  stretch: string
  lineHeight: string

  /**
   * @param size
   * @param family
   * @param sizeUnit
   */
  constructor (size: number, sizeUnit: string, family: string, style = 'normal', variant = 'normal',
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
   * Converts to CSS font syntax
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
   */
  toString (): string {
    let s = ''
    if (this.style !== 'normal') {
      s += this.style + ' '
    }
    if (this.variant !== 'normal') {
      s += this.variant + ' '
    }
    if (this.weight !== 'normal') {
      s += this.weight + ' '
    }
    if (this.stretch !== 'normal') {
      s += this.stretch + ' '
    }
    s += `${this.size}${this.sizeUnit} `
    if (this.lineHeight !== 'normal') {
      s += this.lineHeight + ' '
    }
    s += this.family

    return s
  }
}

const parseFontEl = document.createElement('div')
/**
 * Converts a CSS font string to a {@link Font} object
 * representation.
 * @param str
 * @return the parsed font
 */
export function parseFont (str: string): Font {
  // Assign css string to html element
  parseFontEl.setAttribute('style', `font: ${str}`)
  const {
    fontSize, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight
  } = parseFontEl.style
  parseFontEl.removeAttribute('style')

  const size = parseFloat(fontSize)
  const sizeUnit = fontSize.substring(size.toString().length)
  return new Font(size, sizeUnit, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight)
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
export function mapPixels (
  mapper: (pixels: Uint8ClampedArray, i: number) => void,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  flush = true
): void {
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
