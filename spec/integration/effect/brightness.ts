import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Brightness ->', function () {
      it('should change the brightness', async function () {
        const brightness = new etro.effect.Brightness({
          brightness: -100
        })

        const original = await new Promise<HTMLCanvasElement>(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, brightness, 'brightness.png')
      })
    })
  })
})
