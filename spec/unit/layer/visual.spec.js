describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('Visual', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Visual({ startTime: 0, duration: 4, background: 'blue' })
        const movie = mockMovie()
        layer.tryAttach(movie)
        layer.render(0)
        // Clear cache populated by render()
        etro.clearCachedValues(movie)
      })

      it('should be able to render after an effect has been directly deleted', function () {
        // Start with one effect
        layer.addEffect(jasmine.createSpyObj('effect1', ['apply', 'attach', 'detach']))

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
