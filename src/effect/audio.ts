import { Movie } from '../movie'
import { Audio as AudioLayer } from '../layer/index'
import { Base } from './base'

// TODO: create a etro.effect.BaseOptions to inherit from
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AudioOptions {}

/**
 * Base audio effect, modifies the audio output of a layer or movie
 */
export class Audio extends Base {
  inputNode: AudioNode
  outputNode: AudioNode

  attach (target: Movie | AudioLayer): void {
    super.attach(target)
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
  apply (target: Movie | AudioLayer, reltime: number): void {
    super.apply(target, reltime)
  }
}
// Watch to prevent them from being turned into proxies (which causes type
// errors with the web audio api).
Audio.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['inputNode', 'outputNode'])
