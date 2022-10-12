import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Shader ->', function () {
      it('should not change the target if no arguments are passed', function () {
        const shader = new etro.effect.Shader()

        return whenOriginalLoaded(original => {
          return compareImageData(original, shader, 'original.png')
        })
      })
    })
  })
})
