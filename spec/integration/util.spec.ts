import etro from '../../src/index'
import resemble from 'resemblejs'

const dummyCanvas = document.createElement('canvas')
dummyCanvas.width = 20
dummyCanvas.height = 20

function getImageData (path: string, targetCanvas?: HTMLCanvasElement): Promise<ImageData> {
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

export async function compareImageData (original: HTMLCanvasElement, effect: etro.effect.Visual, path: string, useView = true): Promise<void> {
  const movie = new etro.Movie({
    canvas: dummyCanvas,
    background: undefined,
    autoRefresh: false
  })

  const originalImage = new Image()
  await new Promise(resolve => {
    originalImage.onload = resolve
    originalImage.src = original.toDataURL()
  })

  const layer = new etro.layer.Image({
    startTime: 0,
    duration: 1,
    source: originalImage,
    view: useView ? new etro.view.OffscreenView() : undefined
  })
  layer.effects.push(effect)
  movie.layers.push(layer)

  await movie.refresh()

  const misMatch = await new Promise(resolve => {
    resemble(movie.canvas.toDataURL())
      .compareTo('base/spec/integration/assets/effect/' + path)
      .ignoreAntialiasing()
      .onComplete(data => {
        const misMatch = parseFloat(data.misMatchPercentage)
        resolve(misMatch)
      })
  })
  expect(misMatch).toBeLessThanOrEqual(1)
}

/*
 * Don't reload the original image for each test, just once;
 * However, Jasmine will exit if we don't start the tests synchronously
 * So, start them, and then wait for the original image to load in the
 * test
 */
export const whenOriginalLoaded = (() => {
  const original = document.createElement('canvas')
  const loadedCallbacks = []
  let loaded = false
  getImageData('original.png', original).then(data => {
    loaded = true
    loadedCallbacks.forEach(callback => callback(original))
  })

  function whenOriginalLoaded (callback: (original: HTMLCanvasElement) => void): void {
    if (!loaded)
      loadedCallbacks.push(callback)
    else
      callback(original)
  }
  return whenOriginalLoaded
})()

describe('Integration Tests ->', function () {
  describe('Util Functions ->', function () {
    describe('compareImageData ->', function () {
      it('should compare the image data', async function () {
        const imageData = await getImageData('original.png')
        const original = document.createElement('canvas')
        original.width = imageData.width
        original.height = imageData.height
        original.getContext('2d').putImageData(imageData, 0, 0)

        const effect = new etro.effect.Visual()
        await compareImageData(original, effect, 'original.png')
      })
    })
  })
})
