import { mockMovie } from './movie'

// eslint-disable-next-line no-unused-vars
export function mockBaseLayer () {
  const layer = jasmine.createSpyObj('layer', [
    'tryAttach',
    'tryDetach',
    'start',
    'stop',
    'render'
  ])
  layer.tryAttach.and.callFake(movie => {
    // Manually attach layer to movie, because `attach` is stubbed.
    // Otherwise, auto-refresh will cause errors.
    layer.movie = movie
  })
  layer.active = false
  layer.enabled = true
  layer.startTime = 0
  layer.duration = 1
  layer.propertyFilters = {}
  layer.movie = mockMovie()
  return layer
}
