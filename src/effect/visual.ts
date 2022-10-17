import { Movie } from '../movie'
import { VisualBase as VisualBaseLayer } from '../layer/index'
import { Base } from './base'

/**
 * Modifies the visual contents of a layer.
 */
export class Visual extends Base {
  // subclasses must implement apply
  /**
   * Apply this effect to a target at the given time
   *
   * @param target
   * @param reltime - the movie's current time relative to the layer
   * (will soon be replaced with an instance getter)
   * @abstract
   */
  apply (target: Movie | VisualBaseLayer, reltime: number): void {
    super.apply(target, reltime)
  }
}
