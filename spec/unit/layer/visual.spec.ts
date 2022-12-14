import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('Visual', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Visual({
          startTime: 0,
          duration: 4,
          background: etro.parseColor('blue')
        })
        const movie = mockMovie()
        layer.tryAttach(movie)
        layer.render(0)
        // Clear cache populated by render()
        etro.clearCachedValues(movie)
      })

      it('should be able to render after an effect has been directly deleted', function () {
        // Start with one effect
        layer.addEffect(jasmine.createSpyObj('effect1', ['apply', 'tryAttach', 'tryDetach']))

        // Delete the effect
        delete layer.effects[0]

        // Render
        layer.render(0)
      })

      it('should not call doRender if it has an empty canvas', function () {
        layer.width = 0
        layer.height = 0
        spyOn(layer, 'doRender')

        layer.render(0)

        expect(layer.doRender).toHaveBeenCalledTimes(0)
      })
    })
  })
})
