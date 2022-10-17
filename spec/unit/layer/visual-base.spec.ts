import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers ->', function () {
    describe('VisualBase ->', function () {
      class CustomVisualBase extends etro.layer.VisualBase {
        doRender (): void {
          // Do nothing
        }
      }

      let layer: etro.layer.VisualBase

      beforeEach(function () {
        layer = new CustomVisualBase({
          startTime: 0,
          duration: 4
        })
      })

      it('should be able to render after an effect has been directly deleted', function () {
        const movie = mockMovie()
        layer.attach(movie)
        layer.render()
        // Clear cache populated by render()
        etro.clearCachedValues(movie)

        // Start with one effect
        layer.addEffect(jasmine.createSpyObj('effect1', ['apply', 'tryAttach', 'tryDetach']))

        // Delete the effect
        delete layer.effects[0]

        // Render
        layer.render()
      })

      it('should not call doRender if it has an empty canvas', function () {
        const movie = mockMovie()
        layer.attach(movie)
        layer.render()
        // Clear cache populated by render()
        etro.clearCachedValues(movie)

        layer.width = 0
        layer.height = 0
        spyOn(layer, 'doRender')

        layer.render()

        expect(layer.doRender).toHaveBeenCalledTimes(0)
      })
    })
  })
})
