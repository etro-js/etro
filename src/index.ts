/**
 * The entry point
 * @module index
 */

// TODO: investigate possibility of changing movie (canvas) width/height after
// layers added. I think it's fine, but still make sure.
// TODO: create built-in audio gain node for volume control in movie and/or
// layer.
// TODO: figure out InvalidStateError in beginning only when reloaded

import Movie from './movie'
import * as layer from './layer/index'
import * as effect from './effect/index'
import * as event from './event'
import VidarObject from './object'

export * from './util'
export {
  Movie,
  VidarObject,
  layer,
  effect,
  event
}
