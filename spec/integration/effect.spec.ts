import etro from '../../src/index'
import resemble from 'resemblejs'

function getImageData (path, targetCanvas = undefined) {
  return new Promise(resolve => {
    targetCanvas = targetCanvas || document.createElement('canvas')
    const img = new Image()
    img.onload = () => {
      targetCanvas.width = img.width
      targetCanvas.height = img.height
      const ctx = targetCanvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, img.width, img.height))
    }
    img.src = 'base/spec/integration/assets/effect/' + path
  })
}

function copyCanvas (source) {
  const dest = document.createElement('canvas')
  dest.width = source.width
  dest.height = source.height
  dest.getContext('2d')
    .drawImage(source, 0, 0)
  return dest
}

function compareImageData (original, effect, path) {
  return new Promise<void>(resolve => {
    const result = copyCanvas(original)
    const ctx = result.getContext('2d')
    const dummyMovie = new etro.Movie({ canvas: dummyCanvas })
    effect.apply({ canvas: result, cctx: ctx, movie: dummyMovie }) // movie should be unique, to prevent caching!

    resemble(result.toDataURL())
      .compareTo('base/spec/integration/assets/effect/' + path)
      .ignoreAntialiasing()
      .onComplete(data => {
        const misMatch = parseFloat(data.misMatchPercentage)
        expect(misMatch).toBeLessThanOrEqual(1)
        resolve()
      })
  })
}

/*
 * Don't reload the original image for each test, just once;
 * However, Jasmine will exit if we don't start the tests synchronously
 * So, start them, and then wait for the original image to load in the
 * test
 */
const whenOriginalLoaded = (() => {
  const original = document.createElement('canvas')
  const loadedCallbacks = []
  let loaded = false
  getImageData('original.png', original).then(data => {
    loaded = true
    loadedCallbacks.forEach(callback => callback(original))
  })

  function whenOriginalLoaded (callback) {
    if (!loaded)
      loadedCallbacks.push(callback)
    else
      callback(original)
  }
  return whenOriginalLoaded
})()

const dummyCanvas = document.createElement('canvas')
dummyCanvas.width = 20
dummyCanvas.height = 20

/* TESTS */

describe('Integration Tests ->', function () {
  describe('Effects', function () {
    describe('Brightness', function () {
      it('should change the brightness', function () {
        const brightness = new etro.effect.Brightness({
          brightness: -100
        })

        return whenOriginalLoaded(original => {
          return compareImageData(original, brightness, 'brightness.png')
        })
      })
    })

    describe('Contrast', function () {
      it('should change the contrast', function () {
        const contrast = new etro.effect.Contrast({
          contrast: 0.5
        })

        return whenOriginalLoaded(original => {
          return compareImageData(original, contrast, 'contrast.png')
        })
      })
    })

    describe('Channels', function () {
      it('should multiply each channel by a constant', function (done) {
        const effect = new etro.effect.Channels({
          factors: { r: 0.25, g: 0.5, b: 0.75 }
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'channels.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })

    describe('ChromaKey', function () {
      it('should remove a color from the target', function (done) {
        const effect = new etro.effect.ChromaKey({
          target: etro.parseColor('green'),
          threshold: 100
        })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'chroma-key.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })

    describe('GaussianBlurHorizontal', function () {
      it('should blur with 5-pixel radius', function (done) {
        const effect = new etro.effect.GaussianBlurHorizontal({ radius: 5 })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'gaussian-blur-horizontal.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })

    describe('GaussianBlurVertical', function () {
      it('should blur with 5-pixel radius', function (done) {
        const effect = new etro.effect.GaussianBlurVertical({ radius: 5 })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'gaussian-blur-vertical.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })

    describe('Grayscale', function () {
      it('should desaturate the target', function (done) {
        const effect = new etro.effect.Grayscale()
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'grayscale.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })

    describe('Pixelate', function () {
      it('should decimate to 3-pixel texels', function (done) {
        const effect = new etro.effect.Pixelate({ pixelSize: 3 })
        const movie = new etro.Movie({ canvas: dummyCanvas })
        movie.addEffect(effect) // so val doesn't break because it can't cache (it requires a movie)
        const path = 'pixelate.png'
        whenOriginalLoaded(original =>
          compareImageData(original, effect, path).then(done))
      })
    })

    describe('Stack', function () {
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

    describe('Shader', function () {
      it('should not change the target if no arguments are passed', function () {
        const shader = new etro.effect.Shader()

        return whenOriginalLoaded(original => {
          return compareImageData(original, shader, 'original.png')
        })
      })
    })

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
