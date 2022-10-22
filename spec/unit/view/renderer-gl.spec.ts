import etro from '../../../src'
import { mockOffscreenCanvasConstructor } from '../mocks/dom'

describe('Unit Tests ->', function () {
  describe('RendererGL ->', function () {
    let renderer: etro.view.RendererGL<OffscreenCanvas>

    beforeEach(function () {
      mockOffscreenCanvasConstructor()
      renderer = new etro.view.RendererGL(
        new OffscreenCanvas(100, 100)
      )
    })

    it('should not have a separate back renderer', function () {
      expect(renderer.nextRenderer).toBe(renderer)
    })
  })
})
