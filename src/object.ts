import { Movie } from './movie'

/** A movie, layer or effect  */
export default interface EtroObject {
  currentTime: number
  /** Used in etro internals */
  type: string
  /** Map of property name to function to run on result of `val` */
  propertyFilters: Record<string, <T>(value: T) => T>
  /**
   * `true` if this object is ready to be played/rendered/applied, `false`
   * otherwise
   */
  ready: boolean
  movie: Movie

  /**
   * @deprecated See {@link https://github.com/etro-js/etro/issues/131}
   */
  getDefaultOptions(): object // eslint-disable-line @typescript-eslint/ban-types
}
