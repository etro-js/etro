export abstract class CustomArrayListener<T> {
  abstract onAdd(item: T): void
  abstract onRemove(item: T): void
}

/**
 * An array that notifies a listener when items are added or removed.
 */
export class CustomArray<T> extends Array<T> {
  constructor (target: T[], listener: CustomArrayListener<T>) {
    super()

    for (const item of target) {
      listener.onAdd(item)
    }

    // Create proxy
    return new Proxy(target, {
      deleteProperty (target, property): boolean {
        const value = target[property]
        delete target[property]
        listener.onRemove(value)
        return true
      },

      set (target, property, value): boolean {
        const oldValue = target[property]
        target[property] = value

        // Check if property is a number (index)
        if (!isNaN(Number(property))) {
          if (oldValue !== undefined) {
            listener.onRemove(oldValue)
          }

          listener.onAdd(value)
        }

        return true
      }
    }) as T[]
  }
}
