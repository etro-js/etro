import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Pixelate ->', function () {
      it('should decimate to 3-pixel texels', async function () {
        const pixelate = new etro.effect.Pixelate({ pixelSize: 3 })

        const original = await new Promise<HTMLCanvasElement>(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, pixelate, 'pixelate.png')
      })
    })
  })
})
