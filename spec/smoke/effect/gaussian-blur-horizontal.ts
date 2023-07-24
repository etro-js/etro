import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('GaussianBlurHorizontal ->', function () {
      it('should blur with 5-pixel radius', async function () {
        const blur = new etro.effect.GaussianBlurHorizontal({ radius: 5 })

        const original = await new Promise<HTMLCanvasElement>(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, blur, 'gaussian-blur-horizontal.png')
      })
    })
  })
})
