import etro from '../../../src'
import { MovieLayers } from '../../../src/movie/layers'
import { mockBaseLayer } from '../mocks/layer'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('MovieLayers', function () {
    let layers: MovieLayers
    let checkReady: () => void

    beforeEach(function () {
      const movie = mockMovie()
      checkReady = jasmine.createSpy('checkReady')
      layers = new MovieLayers([mockBaseLayer()], movie, checkReady)
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

    it('should call `checkReady` when an layer is added', function () {
      const layer = mockBaseLayer()
      layers.push(layer)
      expect(checkReady).toHaveBeenCalled()
    })

    it('should call `checkReady` when an layer is removed', function () {
      layers.pop()
      expect(checkReady).toHaveBeenCalled()
    })

    it('should subscribe to `ready` changes on layers', function () {
      spyOn(etro.event, 'subscribe')
      const layer = mockBaseLayer()
      layers.push(layer)
      expect(etro.event.subscribe).toHaveBeenCalledWith(layer, 'layer.ready', jasmine.any(Function))
    })
  })
})
