import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Brightness ->', function () {
      it('should change the brightness', function () {
        const brightness = new etro.effect.Brightness({
          brightness: -100
        })

        return whenOriginalLoaded(original => {
          return compareImageData(original, brightness, 'brightness.png')
        })
      })
    })
  })
})
