import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Contrast ->', function () {
      it('should change the contrast', async function () {
        const contrast = new etro.effect.Contrast({
          contrast: 0.5
        })

        const original = await new Promise<HTMLCanvasElement>(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, contrast, 'contrast.png')
      })
    })
  })
})
