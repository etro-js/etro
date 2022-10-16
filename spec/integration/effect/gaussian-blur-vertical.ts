import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('GaussianBlurVertical ->', function () {
      it('should blur with 5-pixel radius', async function () {
        const blur = new etro.effect.GaussianBlurVertical({ radius: 5 })

        const original = await new Promise(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, blur, 'gaussian-blur-vertical.png')
      })
    })
  })
})
