/*
 * Typedoc can't handle default exports. To let users import default export and
 * make typedoc work, this module exports everything as named exports. Then,
 * ./index imports everything from this module and exports it as a default
 * export. Typedoc uses this file, and rollup and NPM use ./index
 */

// TODO: investigate possibility of changing movie (canvas) width/height after
// layers added. I think it's fine, but still make sure.
// TODO: create built-in audio gain node for volume control in movie and/or
// layer.
// TODO: figure out InvalidStateError in beginning only when reloaded

import * as layer from './layer/index'
import * as effect from './effect/index'
import * as event from './event'
import EtroObject from './object'

export * from './movie'
export * from './util'
export {
  EtroObject,
  layer,
  effect,
  event
}
