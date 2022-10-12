import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('ChromaKey ->', function () {
      it('should remove a color from the target', function () {
        const chromaKey = new etro.effect.ChromaKey({
          target: etro.parseColor('green'),
          threshold: 100
        })

        return whenOriginalLoaded(original => {
          return compareImageData(original, chromaKey, 'chroma-key.png')
        })
      })
    })
  })
})
