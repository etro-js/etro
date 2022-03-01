import { Movie } from './movie';
/** A movie, layer or effect  */
export default interface EtroObject {
    /** Used in etro internals */
    type: string;
    /** Which properties to not watch for changes, for `Movie#autoRefresh` */
    publicExcludes: string[];
    /** Map of property name to function to run on result of `val` */
    propertyFilters: Record<string, <T>(value: T) => T>;
    movie: Movie;
    getDefaultOptions(): object;
}
