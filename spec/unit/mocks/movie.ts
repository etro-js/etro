import etro from '../../../src'
import { mockAudioContext, mockCanvas } from './dom'

// eslint-disable-next-line no-unused-vars
export function mockMovie (watchPublic = false) {
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

  movie.layers = []
  movie.effects = []
  movie.actx = mockAudioContext()
  movie.canvas = mockCanvas()
  movie.cctx = movie.canvas.getContext('2d')
  movie.movie = movie

  movie.currentTime = 0
  movie.duration = 1
  movie.canvas.width = 100
  movie.canvas.height = 100
  return movie
}
