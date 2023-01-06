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

function copyCanvas (source) {
  const dest = document.createElement('canvas')
  dest.width = source.width
  dest.height = source.height
  dest.getContext('2d')
    .drawImage(source, 0, 0)
  return dest
}
export async function compareImageData (original: HTMLCanvasElement, effect: etro.effect.Visual, path: string): Promise<void> {
  const result = copyCanvas(original)
  const dummyMovie = new etro.Movie({ canvas: result })
  effect.attach(dummyMovie)
  effect.apply(dummyMovie, 0) // movie should be unique, to prevent caching!

  const misMatch = await new Promise(resolve => {
    resemble(result.toDataURL())
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
    if (!loaded) {
      loadedCallbacks.push(callback)
    } else {
      callback(original)
    }
  }
  return whenOriginalLoaded
})()
