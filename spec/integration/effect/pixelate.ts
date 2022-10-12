import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Pixelate ->', function () {
      it('should decimate to 3-pixel texels', function () {
        const pixelate = new etro.effect.Pixelate({ pixelSize: 3 })

        return whenOriginalLoaded(original => {
          return compareImageData(original, pixelate, 'pixelate.png')
        })
      })
    })
  })
})
