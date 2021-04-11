/**
 * @module event
 */

import VidarObject from './object'

export interface Event {
  target: VidarObject
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

/**
 * Listen for an event or category of events
 *
 * @param target - a vidar object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param listener
 */
export function subscribe (target: VidarObject, type: string, listener: <T extends Event>(T) => void): void {
  if (!listeners.has(target)) {
    listeners.set(target, [])
  }

  listeners.get(target).push(
    { type: new TypeId(type), listener }
  )
}

/**
 * Remove an event listener
 *
 * @param target - a vidar object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param listener
 */
export function unsubscribe (target: VidarObject, listener: <T extends Event>(T) => void): void {
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
 * Emits an event to all listeners
 *
 * @param target - a vidar object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param event - any additional event data
 */
export function publish (target: VidarObject, type: string, event: Record<string, unknown>): Event {
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

const listeners: WeakMap<VidarObject, {
  type: TypeId,
  listener: (Event) => void
}[]> = new WeakMap()
