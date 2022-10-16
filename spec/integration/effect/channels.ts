import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Channels ->', function () {
      it('should multiply each channel by a constant', async function () {
        const channels = new etro.effect.Channels({
          factors: { r: 0.25, g: 0.5, b: 0.75 }
        })

        const original = await new Promise(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, channels, 'channels.png')
      })
    })
  })
})
