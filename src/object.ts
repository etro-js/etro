import Movie from './movie'

export default interface VidarObject {
  type: string
  publicExcludes: string[]
  propertyFilters: Record<string, <T>(value: T) => T>
  movie: Movie

  getDefaultOptions(): object // eslint-disable-line @typescript-eslint/ban-types
}
