import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Grayscale ->', function () {
      it('should desaturate the target', function () {
        const grayscale = new etro.effect.Grayscale()

        return whenOriginalLoaded(original => {
          return compareImageData(original, grayscale, 'grayscale.png')
        })
      })
    })
  })
})
