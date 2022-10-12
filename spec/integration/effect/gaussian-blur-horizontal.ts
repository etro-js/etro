import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('GaussianBlurHorizontal ->', function () {
      it('should blur with 5-pixel radius', function () {
        const blur = new etro.effect.GaussianBlurHorizontal({ radius: 5 })

        return whenOriginalLoaded(original => {
          return compareImageData(original, blur, 'gaussian-blur-horizontal.png')
        })
      })
    })
  })
})
