import etro from '../../../src'
import { mockMovie } from './movie'

// eslint-disable-next-line no-unused-vars
export function mockBaseLayer (watchPublic = false) {
  let layer = jasmine.createSpyObj('layer', [
    'getDefaultOptions',
    'tryAttach',
    'tryDetach',
    'start',
    'stop',
    'render'
  ])
  layer.getDefaultOptions.and.returnValue({})
  layer.tryAttach.and.callFake(movie => {
    // Manually attach layer to movie, because `attach` is stubbed.
    // Otherwise, auto-refresh will cause errors.
    layer.movie = movie
  })

  // I believe `watchPublic` needs to be called before we add the properties.
  if (watchPublic)
    layer = etro.watchPublic(layer) as etro.layer.Base

  layer.type = 'layer'
  layer.active = false
  layer.enabled = true
  layer.startTime = 0
  layer.duration = 1
  layer.propertyFilters = {}
  layer.movie = mockMovie()
  return layer
}
