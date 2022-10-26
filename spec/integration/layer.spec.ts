import etro from '../../src/index'
import resemble from 'resemblejs'

function readPixels (layer: etro.layer.VisualBase, x = 0, y = 0, width?: number, height?: number): Uint8ClampedArray {
  if (layer.view) {
    width = width || layer.view.width
    height = height || layer.view.height
    return layer.view.readPixels(x, y, width, height)
  } else {
    if (!(layer instanceof etro.layer.Visual2D))
      throw new Error('Layer must be a Visual2D or have a view')

    width = width || layer.canvas.width
    height = height || layer.canvas.height
    return layer.cctx.getImageData(x, y, width, height).data
  }
}

describe('Integration Tests ->', function () {
  describe('Layers', function () {
    describe('Base', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Base({ startTime: 0, duration: 4 })
      })

      it('should propagate changes up', function () {
        // Connect to movie to publish event to
        const movie = new etro.Movie({
          canvas: document.createElement('canvas')
        })
        layer.tryAttach(movie)

        // Listen for event called on movie
        let timesFired = 0
        etro.event.subscribe(movie, 'movie.change.layer', () => {
          timesFired++
        })
        // Modify layer
        layer.startTime = 1
        expect(timesFired).toBe(1)
      })

      it('should not fire a change event when its active state changes', function () {
        // Connect to movie to publish event to
        const movie = new etro.Movie({
          canvas: document.createElement('canvas')
        })
        layer.tryAttach(movie)

        // Listen for event called on movie
        let timesFired = 0
        etro.event.subscribe(layer, 'layer.change', () => {
          timesFired++
        })

        // Update active state
        layer.active = true
        expect(timesFired).toBe(0)
      })
    });

    [
      {
        movieView: true,
        layerView: true
      },
      {
        movieView: true,
        layerView: false
      },
      {
        movieView: false,
        layerView: true
      },
      {
        movieView: false,
        layerView: false
      }
    ].forEach(function (runConfig) {
      describe(`VisualBase (${runConfig.layerView ? 'view' : 'canvas'} on ${runConfig.movieView ? 'view' : 'canvas'})`, function () {
        class TestLayer extends etro.layer.VisualBase {
          doRender (): void {
            // Do nothing
          }
        }

        let layer: TestLayer

        beforeEach(function () {
          const movie = new etro.Movie({
            canvas: runConfig.movieView ? undefined : document.createElement('canvas'),
            view: runConfig.movieView
              ? new etro.view.OffscreenView({
                staticOutput: document.createElement('canvas')
              })
              : undefined
          })
          if (runConfig.movieView) {
            movie.view.resize(400, 400)
          } else {
            movie.width = 400
            movie.height = 400
          }

          layer = new TestLayer({
            startTime: 0,
            duration: 4,
            view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
          })

          layer.tryAttach(movie)
          layer.render()
          // Clear cache populated by render()
          etro.clearCachedValues(movie)
        })

        it("should use the movie's width when no layer width is given", function () {
          const width = etro.val(layer, 'width', 0)
          const movieWidth = runConfig.movieView ? layer.movie.view.width : layer.movie.width
          expect(width).toBe(movieWidth)
        })

        it("should use the movie's height when no layer height is given", function () {
          const height = etro.val(layer, 'height', 0)
          const movieHeight = runConfig.movieView ? layer.movie.view.height : layer.movie.height
          expect(height).toBe(movieHeight)
        })

        it('should use the width if provided', function () {
          layer.width = 4
          const width = etro.val(layer, 'width', 0)
          expect(width).toBe(4)
        })

        it('should use the height if provided', function () {
          layer.height = 4
          const height = etro.val(layer, 'height', 0)
          expect(height).toBe(4)
        })

        it('should call `attach` when an effect is added', function () {
          const effect = new etro.effect.Base()
          spyOn(effect, 'attach')
          layer.effects.push(effect)
          expect(effect.attach).toHaveBeenCalled()
        })

        it('should call `detach` when an effect is removed', function () {
          const effect = new etro.effect.Base()
          layer.effects.push(effect)
          spyOn(effect, 'detach')
          layer.effects.pop()
          expect(effect.detach).toHaveBeenCalled()
        })

        it('should call `detach` when an effect is replaced', function () {
          const effect = new etro.effect.Base()
          layer.effects.push(effect)
          spyOn(effect, 'detach')
          layer.effects[0] = new etro.effect.Base()
          expect(effect.detach).toHaveBeenCalled()
        })
      })

      describe(`Visual2D (${runConfig.layerView ? 'view' : 'canvas'} on ${runConfig.movieView ? 'view' : 'canvas'})`, function () {
        let layer: etro.layer.Visual2D

        beforeEach(function () {
          const movie = new etro.Movie({
            canvas: runConfig.movieView ? undefined : document.createElement('canvas'),
            view: runConfig.movieView
              ? new etro.view.OffscreenView({
                staticOutput: document.createElement('canvas')
              })
              : undefined
          })
          if (runConfig.movieView) {
            movie.view.resize(400, 400)
          } else {
            movie.width = 400
            movie.height = 400
          }

          layer = new etro.layer.Visual2D({
            startTime: 0,
            duration: 4,
            background: etro.parseColor('blue'),
            view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
          })

          layer.tryAttach(movie)
          layer.render()
          // Clear cache populated by render()
          etro.clearCachedValues(movie)
        })

        it('should render the background', function () {
          const pixels = readPixels(layer)
          for (let i = 0; i < pixels.length; i += 4) {
            expect(pixels[i]).toBe(0)
            expect(pixels[i + 1]).toBe(0)
            expect(pixels[i + 2]).toBe(255)
            expect(pixels[i + 3]).toBe(255)
          }
        })
      })

      describe(`VisualSource (${runConfig.layerView ? 'view' : 'canvas'} on ${runConfig.movieView ? 'view' : 'canvas'})`, function () {
        const CustomVisualSource = etro.layer.VisualSourceMixin(etro.layer.Visual2D)
        let layer

        beforeEach(function (done) {
          const image = new Image()
          image.src = '/base/spec/integration/assets/layer/image.jpg'
          image.onload = () => {
            const movie = new etro.Movie({
              canvas: runConfig.movieView ? undefined : document.createElement('canvas'),
              view: runConfig.movieView
                ? new etro.view.OffscreenView({
                  staticOutput: document.createElement('canvas')
                })
                : undefined
            })
            if (runConfig.movieView) {
              movie.view.resize(400, 400)
            } else {
              movie.width = 400
              movie.height = 400
            }
            layer = new CustomVisualSource({
              startTime: 0,
              duration: 4,
              source: image,
              view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
            })
            // Simulate attach to movie
            layer.tryAttach(movie)
            done()
          }
        })

        it("should use the image source's width when no sourceWidth is provided", function () {
          const sourceWidth = etro.val(layer, 'sourceWidth', 0)
          expect(sourceWidth).toBe(layer.source.width)
        })

        it("should use the image source's height when no sourceHeight is provided", function () {
          const sourceHeight = etro.val(layer, 'sourceHeight', 0)
          expect(sourceHeight).toBe(layer.source.height)
        })

        it('should use sourceWidth when no destWidth is provided', function () {
          const destWidth = etro.val(layer, 'destWidth', 0)
          const sourceWidth = etro.val(layer, 'sourceWidth', 0)
          expect(destWidth).toBe(sourceWidth)
        })

        it('should use sourceHeight when no destHeight is provided', function () {
          const destHeight = etro.val(layer, 'destHeight', 0)
          const sourceHeight = etro.val(layer, 'sourceHeight', 0)
          expect(destHeight).toBe(sourceHeight)
        })

        it('should use destWidth when no width is provided', function () {
          const width = etro.val(layer, 'width', 0)
          const destWidth = etro.val(layer, 'destWidth', 0)
          expect(width).toBe(destWidth)
        })

        it('should use destHeight when no height is provided', function () {
          const height = etro.val(layer, 'height', 0)
          const destHeight = etro.val(layer, 'destHeight', 0)
          expect(height).toBe(destHeight)
        })

        it('should not default to destWidth when width is set', function () {
          const destWidth = etro.val(layer, 'destWidth', 0)
          layer.width = destWidth + 1 // Set width to something different than destHeight
          const widthVal = etro.val(layer, 'width', 0)
          expect(widthVal).toBe(layer.width)
        })

        it('should not default to destHeight when height is set', function () {
          const destHeight = etro.val(layer, 'destHeight', 0)
          layer.height = destHeight + 1 // Set width to something different than destHeight
          const heightVal = etro.val(layer, 'height', 0)
          expect(heightVal).toBe(layer.height)
        })

        it('should not default to sourceWidth when destWidth is provided', function () {
          const sourceWidth = etro.val(layer, 'sourceWidth', 0)
          layer.destWidth = sourceWidth + 1 // Set width to something different than destHeight
          const destWidthVal = etro.val(layer, 'destWidth', 0)
          expect(destWidthVal).toBe(layer.destWidth)
        })

        it('should not default to sourceHeight when destHeight is provided', function () {
          const sourceHeight = etro.val(layer, 'sourceHeight', 0)
          layer.destHeight = sourceHeight + 1 // Set width to something different than destHeight
          const destHeightVal = etro.val(layer, 'destHeight', 0)
          expect(destHeightVal).toBe(layer.destHeight)
        })

        it('should render', function () {
          // Render layer (actual outcome)
          layer.render(0)
          const width = etro.val(layer, 'width', 0)
          const height = etro.val(layer, 'height', 0)

          // Draw image (expected outcome)
          const pixels = readPixels(layer)
          const testCanv = document.createElement('canvas')
          testCanv.width = width
          testCanv.height = height
          const testCtx = testCanv.getContext('2d')
          testCtx.drawImage(layer.source, 0, 0, width, height)
          const testImageData = testCtx.getImageData(0, 0, width, height)

          // Compare expected outcome with actual outcome
          let equal = true
          for (let i = 0; i < pixels.length; i++)
            equal = equal && pixels[i] === testImageData.data[i]

          expect(equal).toBe(true)
        })

        it('should scale with `imageWidth` and `imageHeight`', function () {
          const resizedLayer = new etro.layer.Image({
            startTime: 0,
            duration: 1,
            source: layer.source,
            destWidth: 100,
            destHeight: 100,
            view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
          })

          // Render layer (actual outcome)
          const movie = new etro.Movie({
            canvas: runConfig.movieView ? undefined : document.createElement('canvas'),
            view: runConfig.movieView
              ? new etro.view.OffscreenView({
                staticOutput: document.createElement('canvas')
              })
              : undefined
          })
          resizedLayer.tryAttach(movie)
          resizedLayer.render()

          // Draw image (expected outcome)
          const pixels = readPixels(resizedLayer, 0, 0, 100, 100)
          const testCanv = document.createElement('canvas')
          testCanv.width = 100
          testCanv.height = 100
          const testCtx = testCanv.getContext('2d')
          testCtx.drawImage(layer.source, 0, 0, 100, 100)
          const testImageData = testCtx.getImageData(0, 0, 100, 100)

          // Compare expected outcome with actual outcome
          expect(pixels).toEqual(testImageData.data)
        })

        it('should be cropped to the clip with and height', async function () {
          const newLayer = new etro.layer.Image({
            startTime: 0,
            duration: 1,
            source: layer.source,
            sourceWidth: 2,
            sourceHeight: 3,
            view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
          })

          // Render layer (actual outcome)
          const movie = new etro.Movie({
            canvas: runConfig.movieView ? undefined : document.createElement('canvas'),
            view: runConfig.movieView
              ? new etro.view.OffscreenView({
                staticOutput: document.createElement('canvas')
              })
              : undefined
          })
          newLayer.tryAttach(movie)
          newLayer.render()

          // Draw image (expected outcome)
          const pixels = readPixels(newLayer, 0, 0, 2, 3)
          // testCanv will contain the part of the layer with the image.
          const testCanv = document.createElement('canvas')
          testCanv.width = 2
          testCanv.height = 3
          const testCtx = testCanv.getContext('2d')
          testCtx.drawImage(layer.source, 0, 0, 2, 3, 0, 0, 2, 3)
          const testImageData = testCtx.getImageData(0, 0, 2, 3)

          // Compare expected image data with actual image data
          const misMatch = await new Promise(resolve => {
            resemble(
              new ImageData(pixels, 2, 3)
            ).compareTo(
              testImageData
            )
              .ignoreAntialiasing()
              .onComplete(function (data) {
                const misMatch = parseFloat(data.misMatchPercentage)
                resolve(misMatch)
              })
          })
          expect(misMatch).toBeLessThan(1)
        })
      })

      describe(`Image (${runConfig.layerView ? 'view' : 'canvas'})`, function () {
        it('should convert a path to an image', function () {
          const layer = new etro.layer.Image({
            startTime: 0,
            duration: 1,
            source: '/base/spec/integration/assets/layer/image.png',
            view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
          })

          expect(layer.source instanceof HTMLImageElement).toBe(true)
        })

        it('should render a base64 image', async function () {
        // CreAte a base64 image from a canvas
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = 'red'
          ctx.fillRect(0, 0, 100, 100)

          // Create the layer from the base64 image
          const layer = new etro.layer.Image({
            startTime: 0,
            duration: 1,
            source: canvas.toDataURL(),
            view: runConfig.layerView ? new etro.view.OffscreenView() : undefined
          })

          // Wait for image to load
          await new Promise(resolve => layer.source.addEventListener('load', resolve))

          // Render layer (actual outcome)
          // Attach for val() to work
          layer.attach(new etro.Movie({
            canvas: runConfig.movieView ? undefined : document.createElement('canvas'),
            view: runConfig.movieView
              ? new etro.view.OffscreenView({
                staticOutput: document.createElement('canvas')
              })
              : undefined
          }))
          layer.render()

          // Make sure the image is rendered
          const pixels = readPixels(layer)
          expect(pixels[0]).toBe(255)
          expect(pixels[1]).toBe(0)
          expect(pixels[2]).toBe(0)
          expect(pixels[3]).toBe(255)
        })
      })
    })

    // I suspect this doesn't work because of autoplay restrictions
    /* describe('Audio', function () {
      let layer

      beforeEach(function (done) {
        const audio = new Audio()
        audio.src = '/base/spec/integration/assets/layer/audio.wav'
        // audio.muted = true // until we figure out how to allow autoplay in headless chrome
        audio.addEventListener('loadedmetadata', () => {
          layer = new etro.layer.Audio(0, audio)
          layer.tryAttach(
            { actx: new AudioContext(), currentTime: 0 }
          )
          done()
        })
      })

      it('should play', function () {
        let timesPlayed = 0
        layer.source.addEventListener('play', () => {
          timesPlayed++
        })
        for (let i = 0; i < 3; i++) {
          layer.start(0) // reltime = 0s
          layer.stop(0) // reltime = 0s
        }
        expect(timesPlayed).toBe(3)
      })
    }) */
  })
})
