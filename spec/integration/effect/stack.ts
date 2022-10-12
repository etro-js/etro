import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Stack ->', function () {
      it('should be the same as applying individual effects', function () {
        const stack = new etro.effect.Stack({
          effects: [
            new etro.effect.Brightness({
              brightness: -100
            }),
            new etro.effect.Contrast({
              contrast: 0.5
            })
          ]
        })

        return whenOriginalLoaded(original => {
          return compareImageData(original, stack, 'stack.png')
        })
      })
    })
  })
})
