import etro from '../../../src'

describe('Unit Tests ->', function () {
  describe('View ->', function () {
    let view: etro.view.View

    beforeEach(function () {
      view = new etro.view.View({
        staticOutput: document.createElement('canvas')
      })
    })

    it('should render with the DOM renderer', function () {
      // 2. Use the 2D renderer
      const ctx = view.use2D()

      // 3. Draw something
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 1, 1)

      view.finish()

      // 4. Make sure the output has the correct color
      const pixels = view.readPixels(0, 0, 1, 1)
      expect(pixels[0]).toBe(255)
      expect(pixels[1]).toBe(0)
      expect(pixels[2]).toBe(0)
      expect(pixels[3]).toBe(255)
    })

    it('should render with the 2D renderer', function () {
      // 2. Use the 2D renderer
      const ctx = view.use2D()

      // 3. Draw something
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 1, 1)

      view.finish()

      // 4. Make sure the output has the correct color
      const pixels = view.readPixels(0, 0, 1, 1)
      expect(pixels[0]).toBe(255)
      expect(pixels[1]).toBe(0)
      expect(pixels[2]).toBe(0)
      expect(pixels[3]).toBe(255)
    })

    it('should render with the GL renderer', function () {
      // 2. Use the GL renderer
      const gl = view.useGL()

      // 3. Draw something
      gl.clearColor(0, 1, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      view.finish()

      // 4. Make sure the output has the correct color
      const pixels = view.readPixels(0, 0, 1, 1)
      expect(pixels[0]).toBe(0)
      expect(pixels[1]).toBe(255)
      expect(pixels[2]).toBe(0)
      expect(pixels[3]).toBe(255)
    })
  })
})
