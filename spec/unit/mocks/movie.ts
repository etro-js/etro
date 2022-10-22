import etro from '../../../src'
import { mockAudioContext, mockCanvas } from './dom'

// eslint-disable-next-line no-unused-vars
export function mockMovie (options: etro.MovieOptions = {
  canvas: mockCanvas()
}, watchPublic = false) {
  let movie = jasmine.createSpyObj('movie', [
    'getDefaultOptions',
    'addLayer',
    'addEffect'
  ])
  movie.getDefaultOptions.and.returnValue({
    canvas: null
  })

  // I believe `watchPublic` needs to be called before we add the properties.
  if (watchPublic)
    movie = etro.watchPublic(movie) as etro.Movie

  movie.enabled = true
  movie.type = 'movie'
  movie.publicExcludes = []
  movie.propertyFilters = {}
  movie.ready = true
  movie.movie = movie

  movie.layers = []
  movie.effects = []
  movie.actx = options.actx || mockAudioContext()
  if (options.view) {
    movie.view = options.view
  } else if (options.canvas) {
    movie.canvas = options.canvas
    movie.cctx = options.canvas.getContext('2d')
    movie.canvas.width = 100
    movie.canvas.height = 100
    movie.width = 100
    movie.height = 100
  } else {
    throw new Error('Must provide either a canvas or a view')
  }

  movie.currentTime = 0
  movie.duration = 1

  return movie
}
