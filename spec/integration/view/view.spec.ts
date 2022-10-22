import etro from '../../../src'

describe('Unit Tests ->', function () {
  describe('View ->', function () {
    let view: etro.view.View<HTMLCanvasElement>

    beforeEach(function () {
      view = new etro.view.View({
        staticOutput: document.createElement('canvas'),
        back2DCanvas: document.createElement('canvas'),
        front2DCanvas: document.createElement('canvas'),
        glCanvas: document.createElement('canvas')
      })
      view.resize(2, 2)
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

    it('should be able to copy the output to the same renderer used to draw it', function () {
      // 2. Use any renderer
      const ctx = view.use2D()

      // 3. Draw something
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 1, 1)

      view.finish()

      // 4. Use the same renderer
      view.use2D()

      // 5. Draw the output
      ctx.drawImage(view.output, 0, 0)

      // 6. Make sure the output has the correct color
      const pixels = view.readPixels(0, 0, 1, 1)
      expect(pixels[0]).toBe(255)
      expect(pixels[1]).toBe(0)
      expect(pixels[2]).toBe(0)
      expect(pixels[3]).toBe(255)
    })
  })
})
