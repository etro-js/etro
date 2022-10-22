import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Shader ->', function () {
      it('should not change the target if no arguments are passed', async function () {
        const shader = new etro.effect.Shader()

        const original = await new Promise<HTMLCanvasElement>(resolve => {
          whenOriginalLoaded(resolve)
        })
        await compareImageData(original, shader, 'shader.png')
      })
    })
  })
})
