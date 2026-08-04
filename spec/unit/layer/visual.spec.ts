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

      describe('canvas resizing ->', function () {
        beforeEach(function () {
          layer.width = 100
          layer.height = 100
        })

        it('should not reset the rendering context when its dimensions are unchanged', function () {
          layer.render(0)

          layer.cctx.imageSmoothingEnabled = false
          layer.render(0)

          expect(layer.canvas.width).toBe(100)
          expect(layer.canvas.height).toBe(100)
          expect(layer.cctx.imageSmoothingEnabled).toBe(false)
        })

        it('should resize its canvas when its dimensions change', function () {
          layer.render(0)
          expect(layer.canvas.width).toBe(100)

          layer.width = 150
          etro.clearCachedValues(layer.movie)
          layer.render(0)

          expect(layer.canvas.width).toBe(150)
        })
      })

      describe('canvas clearing ->', function () {
        beforeEach(function () {
          layer.width = 100
          layer.height = 100
        })

        it('should clear its canvas on every frame', function () {
          layer.render(0)

          spyOn(layer.cctx, 'clearRect')
          layer.render(0)

          expect(layer.cctx.clearRect).toHaveBeenCalled()
        })
      })
    })
  })
})
