import { Movie } from './movie';
/** A movie, layer or effect  */
export default interface EtroObject {
    /** Used in etro internals */
    type: string;
    /**
     * Which properties to not watch for changes, for `Movie#autoRefresh`
     *
     * @deprecated `Movie#autoRefresh` is deprecated
     */
    publicExcludes: string[];
    /** Map of property name to function to run on result of `val` */
    propertyFilters: Record<string, <T>(value: T) => T>;
    /**
     * `true` if this object is ready to be played/rendered/applied, `false`
     * otherwise
     */
    ready: boolean;
    movie: Movie;
    getDefaultOptions(): object;
}
