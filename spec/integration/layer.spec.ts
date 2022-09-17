import etro from '../..'
import { mockMovie } from '../unit/mocks/movie'

describe('Integration Tests ->', function () {
  describe('Layers', function () {
    describe('Base', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Base({ startTime: 0, duration: 4 })
      })

      it('should propogate changes up', function () {
        // Connect to movie to publish event to
        const movie = mockMovie()
        layer.tryAttach(movie)

        // Listen for event called on moive
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
        const movie = mockMovie()
        layer.tryAttach(movie)

        // Listen for event called on moive
        let timesFired = 0
        etro.event.subscribe(layer, 'layer.change', () => {
          timesFired++
        })

        // Update active state
        layer.active = true
        expect(timesFired).toBe(0)
      })
    })

    describe('Visual', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Visual({ startTime: 0, duration: 4, background: 'blue' })
        const movie = mockMovie()
        layer.tryAttach(movie)
        layer.render(0)
        // Clear cache populated by render()
        etro.clearCachedValues(movie)
      })

      it("should use the movie's width when no layer width is given", function () {
        const width = etro.val(layer, 'width', 0)
        expect(width).toBe(layer.movie.width)
      })

      it("should use the movie's height when no layer height is given", function () {
        const height = etro.val(layer, 'height', 0)
        expect(height).toBe(layer.movie.height)
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

      it('should render the background', function () {
        const imageData = layer.cctx.getImageData(0, 0, 400, 400)
        let allBlue = true
        for (let i = 0; i < imageData.data.length; i += 4)
          allBlue = allBlue &&
            imageData.data[i + 0] === 0 &&
            imageData.data[i + 1] === 0 &&
            imageData.data[i + 2] === 255 &&
            imageData.data[i + 3] === 255

        expect(allBlue).toBe(true)
      })
    })

    describe('VisualSource', function () {
      const CustomVisualSource = etro.layer.VisualSourceMixin(etro.layer.Visual)
      let layer

      beforeEach(function (done) {
        const image = new Image()
        image.src = '/base/spec/integration/assets/layer/image.jpg'
        image.onload = () => {
          layer = new CustomVisualSource({ startTime: 0, duration: 4, source: image })
          // Simulate attach to movie
          const movie = mockMovie()
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
        const imageData = layer.cctx.getImageData(0, 0, width, height)

        // Draw image (expected outcome)
        const testCanv = document.createElement('canvas')
        testCanv.width = width
        testCanv.height = height
        const testCtx = testCanv.getContext('2d')
        testCtx.drawImage(layer.source, 0, 0, width, height)
        const testImageData = testCtx.getImageData(0, 0, width, height)

        // Compare expected outcome with actual outcome
        let equal = true
        for (let i = 0; i < imageData.data.length; i++)
          equal = equal && imageData.data[i] === testImageData.data[i]

        expect(equal).toBe(true)
      })

      it('should scale with `imageWidth` and `imageHeight`', function () {
        const resizedLayer = new etro.layer.Image({
          startTime: 0,
          duration: 1,
          source: layer.source,
          destWidth: 100,
          destHeight: 100
        })

        // Render layer (actual outcome)
        const movie = mockMovie()
        resizedLayer.tryAttach(movie)
        resizedLayer.render()
        const imageData = resizedLayer.cctx.getImageData(0, 0, 100, 100)

        // Draw image (expected outcome)
        const testCanv = document.createElement('canvas')
        testCanv.width = 100
        testCanv.height = 100
        const testCtx = testCanv.getContext('2d')
        testCtx.drawImage(layer.source, 0, 0, 100, 100)
        const testImageData = testCtx.getImageData(0, 0, 100, 100)

        // Compare expected outcome with actual outcome
        expect(imageData.data).toEqual(testImageData.data)
      })

      it('should be cropped to the clip with and height', function () {
        const newLayer = new etro.layer.Image({
          startTime: 0,
          duration: 1,
          source: layer.source,
          sourceWidth: 2,
          sourceHeight: 3
        })

        // Render layer (actual outcome)
        const movie = mockMovie()
        newLayer.tryAttach(movie)
        newLayer.render()
        const imageData = newLayer.cctx.getImageData(
          0, 0, 2, 3
        )

        // Draw image (expected outcome)
        // testCanv will contain the part of the layer with the image.
        const testCanv = document.createElement('canvas')
        testCanv.width = 2
        testCanv.height = 3
        const testCtx = testCanv.getContext('2d')
        testCtx.drawImage(layer.source, 0, 0, 2, 3, 0, 0, 2, 3)
        const testImageData = testCtx.getImageData(0, 0, 2, 3)

        // Compare expected image data with actual image data
        expect(imageData.data).toEqual(testImageData.data)
      })
    })

    // I suspect this doesn't work becuase of autoplay restrictions
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
