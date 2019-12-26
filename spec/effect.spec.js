const RED = new Uint8ClampedArray([255, 0, 0, 255])
const BLUE = new Uint8ClampedArray([0, 0, 255, 255])

const clamp = (x, a, b) => Math.max(Math.min(x, b), a)

function createPixel (colorData) {
  // Create 1x1 canvas and set pixel to red
  const ctx = document.createElement('canvas')
    .getContext('2d')
  ctx.canvas.width = ctx.canvas.height = 1
  const imageData = ctx.createImageData(1, 1)
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = colorData[i]
  }
  ctx.putImageData(imageData, 0, 0)

  return ctx
}

/**
 * Create a square canvas with random opaque noise
 * @param {number} size the width and height
 * @return {TestCanvas}
 *
 * @typedef {Object} TestCanvas
 * @property {CanvasRenderingContext2D} ctx
 * @property {ImageData} imageData
 */
function createRandomCanvas (size) {
  const ctx = document.createElement('canvas')
    .getContext('2d')
  ctx.canvas.width = ctx.canvas.height = size
  // Create a grid of random colors
  const imageData = ctx.createImageData(ctx.canvas.width, ctx.canvas.height)
  // opaque so premultiplied alpha won't mess up the rgb comparisons
  const data = imageData.data.map((_, i) => i % 4 === 3 ? 255 : Math.floor(256 * Math.random()))
  for (let i = 0; i < data.length; i++) {
    imageData.data[i] = data[i]
  }
  ctx.putImageData(imageData, 0, 0)

  return { ctx, imageData }
}

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
    img.src = 'base/spec/assets/effect/' + path
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
  return new Promise(resolve => {
    const result = copyCanvas(original)
    const ctx = result.getContext('2d')
    effect.apply({ canvas: result, cctx: ctx, movie: new vd.Movie(dummyCanvas) }) // movie should be unique, to prevent caching!
    const actual = ctx.getImageData(0, 0, result.width, result.height)

    getImageData(path).then(expected => {
      expect(actual).toEqual(expected)
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
    if (!loaded) {
      loadedCallbacks.push(callback)
    } else {
      callback(original)
    }
  }
  return whenOriginalLoaded
})()

const dummyCanvas = document.createElement('canvas')

/* TESTS */

describe('Effects', function () {
  describe('Base', function () {
    let effect

    beforeEach(function () {
      effect = new vd.effect.Base(0, 3)
    })

    it("should be of type 'effect'", function () {
      expect(effect._type).toBe('effect')
    })

    it('should set _target when attached', function () {
      const movie = {}
      effect.attach(movie)
      expect(effect._target).toBe(movie)
    })
  })

  describe('Stack', function () {
    let effects, stack

    beforeEach(function () {
      effects = [
        new vd.effect.Brightness(10),
        new vd.effect.Contrast(1.5)
      ]
      stack = new vd.effect.Stack(effects)
      stack.attach(new vd.Movie(dummyCanvas))
    })

    it('should attach its children to the target when attached', function () {
      expect(effects.every(child => child._target === stack._target)).toBe(true)
    })

    it('should be the same as applying individual effects', function () {
      const original = createRandomCanvas(4).ctx.canvas
      const result = copyCanvas(original)
      const resultCtx = result.getContext('2d')

      effects.forEach(effect => effect.apply({
        canvas: result, cctx: resultCtx, movie: new vd.Movie(dummyCanvas)
      }))
      const expected = resultCtx.getImageData(0, 0, result.width, result.height)

      resultCtx.drawImage(original, 0, 0) // reset
      stack.apply({
        canvas: result, cctx: resultCtx, movie: new vd.Movie(dummyCanvas)
      })
      const actual = resultCtx.getImageData(0, 0, result.width, result.height)
      expect(actual).toEqual(expected)
    })
  })

  describe('Shader', function () {
    let effect

    beforeEach(function () {
      effect = new vd.effect.Shader()
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
    })

    it('should construct', function () {})

    it('should not change the target if no arguments are passed', function () {
      const { ctx, imageData: originalData } = createRandomCanvas(2)
      // apply effect to a fake layer containing `ctx`
      effect.apply({ canvas: ctx.canvas, cctx: ctx, movie: new vd.Movie(dummyCanvas) })
      // Verify no change
      const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
      expect(imageData).toEqual(originalData)
    })
  })

  describe('Brightness', function () {
    it('should change the brightness', function () {
      const effect = new vd.effect.Brightness(5)
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const ctx = createPixel(RED)
      // Apply effect to a fake layer containing `ctx`
      effect.apply({ canvas: ctx.canvas, cctx: ctx, movie: new vd.Movie(dummyCanvas) })
      // Verify brightness changed
      const imageData = ctx.getImageData(0, 0, 1, 1)
      expect(imageData.data).toEqual(RED.map((c, i) => c % 4 === 3 ? c
        : clamp(c + effect.brightness, 0, 255)))
    })
  })

  describe('Contrast', function () {
    it('should change the contrast', function () {
      const effect = new vd.effect.Contrast(5)
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const ctx = createPixel(RED)
      // Apply effect to a fake layer containing `ctx`
      effect.apply({ canvas: ctx.canvas, cctx: ctx, movie: new vd.Movie(dummyCanvas) })
      // Verify brightness changed
      const imageData = ctx.getImageData(0, 0, 1, 1)
      expect(imageData.data).toEqual(RED.map((c, i) => c % 4 === 3 ? c
        : Math.round(clamp(effect.contrast * (c - 255 / 2), 0, 255))))
    })
  })

  describe('Channels', function () {
    it('should multiply each channel by a constant', function () {
      const effect = new vd.effect.Channels({ r: 0.5, g: 1.25, b: 2 })
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const ctx = createPixel(RED)
      // Apply effect to a fake layer containing `ctx`
      effect.apply({ canvas: ctx.canvas, cctx: ctx, movie: new vd.Movie(dummyCanvas) })
      // Verify brightness changed
      const imageData = ctx.getImageData(0, 0, 1, 1)
      expect(imageData.data).toEqual(new Uint8ClampedArray([
        Math.floor((effect.factors.r || 1) * RED[0]),
        Math.floor((effect.factors.g || 1) * RED[1]),
        Math.floor((effect.factors.b || 1) * RED[2]),
        Math.floor((effect.factors.a || 1) * RED[3])
      ]))
    })
  })

  describe('ChromaKey', function () {
    let effect

    beforeEach(function () {
      effect = new vd.effect.ChromaKey({ r: 250 }, 5) // will hit r=255, because threshold is 5
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
    })

    it('should make the target color transparent', function () {
      const ctx = createPixel(RED)
      // Apply effect to a fake layer containing `ctx`
      effect.apply({ canvas: ctx.canvas, cctx: ctx, movie: new vd.Movie(dummyCanvas) })
      // Verify brightness changed
      const imageData = ctx.getImageData(0, 0, 1, 1)
      const alpha = imageData.data[3]
      expect(alpha).toBe(0)
    })

    it('should not make other colors transparent', function () {
      const ctx = createPixel(BLUE)
      // Apply effect to a fake layer containing `ctx`
      effect.apply({ canvas: ctx.canvas, cctx: ctx, movie: new vd.Movie(dummyCanvas) })
      // Verify brightness changed
      const imageData = ctx.getImageData(0, 0, 1, 1)
      const alpha = imageData.data[3]
      expect(alpha).toBe(255)
    })
  })

  describe('GaussianBlurHorizontal', function () {
    it('should blur with 5-pixel radius', function (done) {
      const effect = new vd.effect.GaussianBlurHorizontal(5)
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'gaussian-blur-horizontal.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })
  })

  describe('GaussianBlurVertical', function () {
    it('should blur with 5-pixel radius', function (done) {
      const effect = new vd.effect.GaussianBlurVertical(5)
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'gaussian-blur-vertical.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })
  })

  describe('Pixelate', function () {
    it('should decimate to 3-pixel texels', function (done) {
      const effect = new vd.effect.Pixelate(3)
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'pixelate.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })
  })

  describe('Transform', function () {
    it('should translate', function (done) {
      const effect = new vd.effect.Transform(
        new vd.effect.Transform.Matrix().translate(-3, 5)
      )
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'transform/translate.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })

    it('should translate by non-integers', function (done) {
      const effect = new vd.effect.Transform(
        new vd.effect.Transform.Matrix().translate(0.5, 0.5)
      )
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'transform/translate-fraction.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })

    it('should scale', function (done) {
      const effect = new vd.effect.Transform(
        new vd.effect.Transform.Matrix().scale(2, 2)
      )
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'transform/scale.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })

    it('should scale by non-integers', function (done) {
      const effect = new vd.effect.Transform(
        new vd.effect.Transform.Matrix().scale(0.5, 0.5)
      )
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'transform/scale-fraction.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })

    it('should rotate', function (done) {
      const effect = new vd.effect.Transform(
        new vd.effect.Transform.Matrix().rotate(Math.PI / 6)
      )
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'transform/rotate.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })

    it('should multiply together', function (done) {
      const effect = new vd.effect.Transform(
        new vd.effect.Transform.Matrix().scale(2, 2)
          .multiply(new vd.effect.Transform.Matrix().translate(-3, 5)))
      effect._target = new vd.Movie(dummyCanvas) // so val doesn't break because it can't cache (it requires a movie)
      const path = 'transform/multiply.png'
      whenOriginalLoaded(original =>
        compareImageData(original, effect, path).then(done))
    })
  })
})
