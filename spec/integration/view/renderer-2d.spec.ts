import etro from '../../../src'
import resemble from 'resemblejs'

describe('Integration Tests ->', function () {
  describe('Renderer2D ->', function () {
    let renderer: etro.view.Renderer2D<HTMLCanvasElement, CanvasRenderingContext2D>

    beforeEach(function () {
      renderer = new etro.view.Renderer2D(
        document.createElement('canvas')
      )
      renderer.resize(2, 2)
    })

    it('should draw a rectangle', async function () {
      renderer.context.fillStyle = 'red'
      renderer.context.fillRect(0, 0, 1, 1)

      const actualPixels = renderer.readPixels(0, 0, 1, 1)
      const actual = new ImageData(new Uint8ClampedArray(actualPixels), 1, 1)

      const expectedPixels = new Uint8ClampedArray(4)
      expectedPixels[0] = 255
      expectedPixels[1] = 0
      expectedPixels[2] = 0
      expectedPixels[3] = 255
      const expected = new ImageData(expectedPixels, 1, 1)

      const misMatch = await new Promise(resolve =>
        resemble(actual)
          .compareTo(expected)
          .ignoreAntialiasing()
          .onComplete(function (data) {
            const misMatch = parseFloat(data.misMatchPercentage)
            resolve(misMatch)
          })
      )
      expect(misMatch).toBeLessThanOrEqual(1)
    })

    it('should have matching canvas output and readPixels data', async function () {
      renderer.context.fillStyle = 'red'
      renderer.context.beginPath()
      renderer.context.arc(0.5, 0.5, 0.5, 0, Math.PI * 2)
      renderer.context.fill()

      const readPixelsData = renderer.readPixels(0, 0, 2, 2)
      const readPixelsImageData = new ImageData(new Uint8ClampedArray(readPixelsData), 2, 2)

      const canvasImageData = renderer.context.getImageData(0, 0, 2, 2)

      const misMatch = await new Promise(resolve =>
        resemble(readPixelsImageData)
          .compareTo(canvasImageData)
          .ignoreAntialiasing()
          .onComplete(function (data) {
            const misMatch = parseFloat(data.misMatchPercentage)
            resolve(misMatch)
          })
      )
      expect(misMatch).toBeLessThanOrEqual(1)
    })
  })
})
