import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Grayscale ->', function () {
      it('should desaturate the target', async function () {
        const grayscale = new etro.effect.Grayscale()

        const original = await new Promise<HTMLCanvasElement>(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, grayscale, 'grayscale.png')
      })
    })
  })
})
