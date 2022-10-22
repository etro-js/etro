import etro from '../../../src'
import { mockOffscreenCanvasConstructor } from '../mocks/dom'

describe('Unit Tests ->', function () {
  describe('Renderer2D ->', function () {
    let renderer: etro.view.Renderer2D<OffscreenCanvas, OffscreenCanvasRenderingContext2D>

    beforeEach(function () {
      mockOffscreenCanvasConstructor()
      renderer = new etro.view.Renderer2D(
        new OffscreenCanvas(100, 100),
        new OffscreenCanvas(100, 100)
      )
    })

    it('should have a separate back renderer', function () {
      expect(renderer.nextRenderer).not.toBe(renderer)
    })
  })
})
