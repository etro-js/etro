import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

const dummyCanvas = document.createElement('canvas')
dummyCanvas.width = 20
dummyCanvas.height = 20

const runConfigs = [
  {
    useView: false
  },
  {
    useView: true
  }
]

runConfigs.forEach(runConfig => {
  describe('Integration Tests ->', function () {
    describe('Effects ->', function () {
      describe(`Transform (${runConfig.useView ? 'view' : 'canvas'}) ->`, function () {
        it('should translate', async function () {
          const effect = new etro.effect.Transform({
            matrix: new etro.effect.Transform.Matrix().translate(-3, 5)
          })
          const movie = new etro.Movie({ canvas: dummyCanvas })
          movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
          const path = 'transform/translate.png'
          const original = await new Promise<HTMLCanvasElement>(resolve => {
            whenOriginalLoaded(resolve)
          })
          await compareImageData(original, effect, path, runConfig.useView)
        })

        it('should scale', async function () {
          const effect = new etro.effect.Transform({
            matrix: new etro.effect.Transform.Matrix().scale(2, 2)
          })
          const movie = new etro.Movie({ canvas: dummyCanvas })
          movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
          const path = 'transform/scale.png'
          const original = await new Promise<HTMLCanvasElement>(resolve => {
            whenOriginalLoaded(resolve)
          })
          await compareImageData(original, effect, path, runConfig.useView)
        })

        it('should scale by non-integers', async function () {
          const effect = new etro.effect.Transform({
            matrix: new etro.effect.Transform.Matrix().scale(0.5, 0.5)
          })
          const movie = new etro.Movie({ canvas: dummyCanvas })
          movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
          const path = 'transform/scale-fraction.png'
          const original = await new Promise<HTMLCanvasElement>(resolve => {
            whenOriginalLoaded(resolve)
          })
          await compareImageData(original, effect, path, runConfig.useView)
        })

        it('should rotate', async function () {
          const effect = new etro.effect.Transform({
            matrix: new etro.effect.Transform.Matrix().rotate(Math.PI / 6)
          })
          const movie = new etro.Movie({ canvas: dummyCanvas })
          movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
          const path = 'transform/rotate.png'
          const original = await new Promise<HTMLCanvasElement>(resolve => {
            whenOriginalLoaded(resolve)
          })
          await compareImageData(original, effect, path, runConfig.useView)
        })

        it('should multiply together', async function () {
          const effect = new etro.effect.Transform({
            matrix: new etro.effect.Transform.Matrix()
              .scale(2, 2)
              .multiply(new etro.effect.Transform.Matrix().translate(-3, 5))
          })
          const movie = new etro.Movie({ canvas: dummyCanvas })
          movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
          const path = 'transform/multiply.png'
          const original = await new Promise<HTMLCanvasElement>(resolve => {
            whenOriginalLoaded(resolve)
          })
          await compareImageData(original, effect, path, runConfig.useView)
        })
      })
    })
  })
})
