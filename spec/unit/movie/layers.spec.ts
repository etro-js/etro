import { MovieLayers } from '../../../src/movie/layers'
import { mockBaseLayer } from '../mocks/layer'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('MovieLayers', function () {
    let layers: MovieLayers

    beforeEach(function () {
      const movie = mockMovie()
      layers = new MovieLayers([mockBaseLayer()], movie)
    })

    it('should call `tryAttach` when an layer is added', function () {
      const layer = mockBaseLayer()
      layers.push(layer)
      expect(layer.tryAttach).toHaveBeenCalled()
    })

    it('should call `tryDetach` when an layer is removed', function () {
      const layer = layers[0]
      layers.pop()
      expect(layer.tryDetach).toHaveBeenCalled()
    })
  })
})
