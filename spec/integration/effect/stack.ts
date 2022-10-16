import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Stack ->', function () {
      it('should be the same as applying individual effects', async function () {
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

        const original = await new Promise(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, stack, 'stack.png')
      })
    })
  })
})
