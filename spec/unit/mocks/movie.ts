import { mockAudioContext, mockCanvas } from './dom'

// eslint-disable-next-line no-unused-vars
export function mockMovie () {
  const movie = jasmine.createSpyObj('movie', [
    'getDefaultOptions',
    'addLayer',
    'addEffect'
  ])
  movie.getDefaultOptions.and.returnValue({
    canvas: null
  })

  movie.enabled = true
  movie.type = 'movie'
  movie.publicExcludes = []
  movie.propertyFilters = {}
  movie.ready = true

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
