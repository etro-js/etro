import etro from '../../../src'
import { mockOffscreenCanvasConstructor } from '../mocks/dom'

describe('Unit Tests ->', function () {
  describe('View ->', function () {
    let view: etro.view.View<OffscreenCanvas>

    beforeEach(function () {
      mockOffscreenCanvasConstructor()
      view = new etro.view.View({
        staticOutput: new OffscreenCanvas(2, 2),
        createCanvas: (width, height) => new OffscreenCanvas(width, height)
      })
    })

    it('should throw an error when output is accessed before drawing', function () {
      expect(() => view.output).toThrow(
        new Error('No output is available. Call finish() first.')
      )
    })

    it('should return the 2D output after drawing in 2D mode', function () {
      const ctx = view.use2D()
      view.finish()
      expect(view.output).toBe(ctx.canvas)
      expect(view.readPixels(0, 0, 1, 1)).toBeInstanceOf(Uint8ClampedArray)
    })

    it('should return the WebGL output after drawing in WebGL mode', function () {
      const ctx = view.useGL()
      view.finish()
      expect(view.output).toBe(ctx.canvas)
      expect(view.readPixels(0, 0, 1, 1)).toBeInstanceOf(Uint8ClampedArray)
    })

    it('should return the 2D output after calling use2D() twice and drawing', function () {
      const ctx = view.use2D()
      view.use2D()
      view.finish()

      expect(view.output).toBe(ctx.canvas)
      expect(view.readPixels(0, 0, 1, 1)).toBeInstanceOf(Uint8ClampedArray)
    })

    it('should throw an error when switching rendering contexts while drawing', function () {
      view.useGL()
      expect(() => view.use2D()).toThrow(
        new Error('Cannot switch rendering contexts while one is active. Call finish() first.')
      )
    })

    it('should return the correct output after switching rendering contexts and drawing', function () {
      view.useGL()
      view.finish()

      const ctx = view.use2D()
      view.finish()

      expect(view.output).toBe(ctx.canvas)
      expect(view.readPixels(0, 0, 1, 1)).toBeInstanceOf(Uint8ClampedArray)
    })

    it('should return the correct output after switching rendering contexts', function () {
      const gl = view.useGL()
      view.finish()

      view.use2D()
      expect(view.output).toBe(gl.canvas)
      expect(view.readPixels(0, 0, 1, 1)).toBeInstanceOf(Uint8ClampedArray)
    })
  })
})
