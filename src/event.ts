/**
 * @module event
 */

import EtroObject from './object'

class DeprecatedEvent {
  replacement: string
  message: string

  constructor (replacement: string, message: string = undefined) {
    this.replacement = replacement
    this.message = message
  }

  toString () {
    let str = ''

    if (this.replacement) {
      str += `Use ${this.replacement} instead.`
    }

    if (this.message) {
      str += ` ${this.message}`
    }

    return str
  }
}

const deprecatedEvents: Record<string, DeprecatedEvent> = {}

export interface Event {
  target: EtroObject
  type: string
}

/**
 * An event type
 * @private
 */
class TypeId {
  private _parts: string[]

  constructor (id) {
    this._parts = id.split('.')
  }

  contains (other) {
    if (other._parts.length > this._parts.length) {
      return false
    }

    for (let i = 0; i < other._parts.length; i++) {
      if (other._parts[i] !== this._parts[i]) {
        return false
      }
    }

    return true
  }

  toString () {
    return this._parts.join('.')
  }
}

export function deprecate (type: string, newType: string, message: string = undefined): void {
  deprecatedEvents[type] = new DeprecatedEvent(newType, message)
}

function subscribeOnce (target: EtroObject, type: string, listener: <T extends Event>(T) => void): void {
  const wrapped = event => {
    unsubscribe(target, wrapped)
    listener(event)
  }
  subscribe(target, type, wrapped)
}

function subscribeMany (target: EtroObject, type: string, listener: <T extends Event>(T) => void): void {
  if (!listeners.has(target)) {
    listeners.set(target, [])
  }

  listeners.get(target).push(
    { type: new TypeId(type), listener }
  )
}

/**
 * Listen for an event or category of events.
 *
 * @param target - an etro object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param listener
 * @param options - options
 * @param options.once - if true, the listener will only be called once
 */
export function subscribe (
  target: EtroObject,
  type: string,
  listener: <T extends Event>(T) => void,
  options: { once?: boolean } = {}
): void {
  // Check if this event is deprecated.
  if (Object.keys(deprecatedEvents).includes(type)) {
    console.warn(`Event ${type} is deprecated. ${deprecatedEvents[type]}`)
  }

  if (options.once) {
    subscribeOnce(target, type, listener)
  } else {
    subscribeMany(target, type, listener)
  }
}

/**
 * Remove an event listener
 *
 * @param target - an etro object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param listener
 */
export function unsubscribe (target: EtroObject, listener: <T extends Event>(T) => void): void {
  // Make sure `listener` has been added with `subscribe`.
  if (!listeners.has(target) ||
  !listeners.get(target).map(pair => pair.listener).includes(listener)) {
    throw new Error('No matching event listener to remove')
  }

  const removed = listeners.get(target)
    .filter(pair => pair.listener !== listener)
  listeners.set(target, removed)
}

/**
 * Publish an event to all listeners without checking if it is deprecated.
 *
 * @param target
 * @param type
 * @param event
 * @returns
 */
function _publish (target: EtroObject, type: string, event: Record<string, unknown>): Event {
  (event as unknown as Event).target = target; // could be a proxy
  (event as unknown as Event).type = type

  const t = new TypeId(type)

  if (!listeners.has(target)) {
    // No event fired
    return null
  }

  // Call event listeners for this event.
  const listenersForType = []
  for (let i = 0; i < listeners.get(target).length; i++) {
    const item = listeners.get(target)[i]
    if (t.contains(item.type)) {
      listenersForType.push(item.listener)
    }
  }

  for (let i = 0; i < listenersForType.length; i++) {
    const listener = listenersForType[i]
    listener(event)
  }

  return event as unknown as Event
}

/**
 * Emits an event to all listeners
 *
 * @param target - an etro object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param event - any additional event data
 */
export function publish (target: EtroObject, type: string, event: Record<string, unknown>): Event {
  // Check if this event is deprecated only if it can be replaced.
  if (Object.keys(deprecatedEvents).includes(type) && deprecatedEvents[type].replacement) {
    throw new Error(`Event ${type} is deprecated. ${deprecatedEvents[type]}`)
  }

  // Check for deprecated events that this event replaces.
  for (const deprecated in deprecatedEvents) {
    const deprecatedEvent = deprecatedEvents[deprecated]
    if (type === deprecatedEvent.replacement) {
      _publish(target, deprecated, { ...event })
    }
  }

  return _publish(target, type, event)
}

const listeners: WeakMap<EtroObject, {
  type: TypeId,
  listener: (Event) => void
}[]> = new WeakMap()
