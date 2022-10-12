import etro from '../../../src'
import { compareImageData, whenOriginalLoaded } from '../util.spec'

const dummyCanvas = document.createElement('canvas')
dummyCanvas.width = 20
dummyCanvas.height = 20

describe('Integration Tests ->', function () {
  describe('Effects ->', function () {
    describe('Transform', function () {
      it('should translate', function (done) {
        const effect = new etro.effect.Transform({
          matrix: new etro.effect.Transform.Matrix().translate(-3, 5)
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'transform/translate.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })

      it('should scale', function (done) {
        const effect = new etro.effect.Transform({
          matrix: new etro.effect.Transform.Matrix().scale(2, 2)
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'transform/scale.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })

      it('should scale by non-integers', function (done) {
        const effect = new etro.effect.Transform({
          matrix: new etro.effect.Transform.Matrix().scale(0.5, 0.5)
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'transform/scale-fraction.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })

      it('should rotate', function (done) {
        const effect = new etro.effect.Transform({
          matrix: new etro.effect.Transform.Matrix().rotate(Math.PI / 6)
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'transform/rotate.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })

      it('should multiply together', function (done) {
        const effect = new etro.effect.Transform({
          matrix: new etro.effect.Transform.Matrix()
            .scale(2, 2)
            .multiply(new etro.effect.Transform.Matrix().translate(-3, 5))
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'transform/multiply.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })
  })
})
