import etro from '../../../src'
import resemble from 'resemblejs'

describe('Integration Tests ->', function () {
  describe('RendererGL ->', function () {
    let renderer: etro.view.RendererGL<HTMLCanvasElement>

    beforeEach(function () {
      renderer = new etro.view.RendererGL(document.createElement('canvas'))
    })

    it('should read pixels correctly', async function () {
      const gl = renderer.context
      gl.clearColor(1, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      const actualPixels = renderer.readPixels(0, 0, 1, 1)
      const actualImageData = new ImageData(actualPixels, 1, 1)

      const expectedPixels = new Uint8ClampedArray(4)
      expectedPixels[0] = 255
      expectedPixels[1] = 0
      expectedPixels[2] = 0
      expectedPixels[3] = 255
      const expectedImageData = new ImageData(expectedPixels, 1, 1)

      const misMatch = await new Promise(resolve => {
        resemble(actualImageData)
          .compareTo(expectedImageData)
          .ignoreAntialiasing()
          .onComplete(function (data) {
            const misMatch = parseFloat(data.misMatchPercentage)
            resolve(misMatch)
          })
      })

      expect(misMatch).toBeLessThanOrEqual(1)
    })
  })
})
