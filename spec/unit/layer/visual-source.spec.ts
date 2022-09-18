import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('VisualSource', function () {
      // Media is an abstract mixin, so make a concrete subclass here.
      const CustomMedia = etro.layer.VisualSourceMixin(etro.layer.Visual)

      let source
      let layer
      let movie

      beforeEach(async function () {
        // Source is an html video element.
        source = jasmine.createSpyObj('source', ['addEventListener', 'play'])
        source.readyState = 2
        source.duration = 4
        source.currentTime = 0
        layer = new CustomMedia({ startTime: 0, source })

        movie = mockMovie()
        movie.currentTime = 2
        movie.duration = 4
      })

      it('should be ready when source is ready', function () {
        expect(layer.ready).toBe(true)
      })

      it('should not be ready when source is not ready', function () {
        source.readyState = 0
        expect(layer.ready).toBe(false)
      })
    })
  })
})
