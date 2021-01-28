describe('Layers', function () {
  describe('Base', function () {
    let layer

    beforeEach(function () {
      layer = new vd.layer.Base({ startTime: 0, duration: 4 })
    })

    it("should be of type 'layer'", function () {
      expect(layer.type).toBe('layer')
    })

    it('should attach to movie', function () {
      const movie = {}
      // Simulate attach to movie
      layer.attach(movie)
      expect(layer._movie).toEqual(movie)
    })

    it('should propogate changes up', function () {
      // Connect to movie to publish event to
      const movie = {}
      layer.attach(movie)

      // Listen for event called on moive
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.change.layer', () => {
        timesFired++
      })
      // Modify layer
      layer.startTime = 1
      expect(timesFired).toBe(1)
    })
  })

  describe('Visual', function () {
    let layer

    beforeEach(function () {
      layer = new vd.layer.Visual({ startTime: 0, duration: 4, background: 'blue' })
      const movie = { width: 400, height: 400, currentTime: 0, propertyFilters: {} }
      movie.movie = movie
      layer.attach(movie)
      layer.render(0)
      // Clear cache populated by render()
      vd.clearCachedValues(movie)
    })

    it("should use the movie's width when no layer width is given", function () {
      const width = vd.val(layer, 'width', 0)
      expect(width).toBe(layer.movie.width)
    })

    it("should use the movie's height when no layer height is given", function () {
      const height = vd.val(layer, 'height', 0)
      expect(height).toBe(layer.movie.height)
    })

    it('should use the width if provided', function () {
      layer.width = 4
      const width = vd.val(layer, 'width', 0)
      expect(width).toBe(4)
    })

    it('should use the height if provided', function () {
      layer.height = 4
      const height = vd.val(layer, 'height', 0)
      expect(height).toBe(4)
    })

    it('should render the background', function () {
      const imageData = layer.vctx.getImageData(0, 0, 400, 400)
      let allBlue = true
      for (let i = 0; i < imageData.data.length; i += 4) {
        allBlue = allBlue &&
          imageData.data[i + 0] === 0 &&
          imageData.data[i + 1] === 0 &&
          imageData.data[i + 2] === 255 &&
          imageData.data[i + 3] === 255
      }
      expect(allBlue).toBe(true)
    })

    it('should call `attach` when an effect is added', function () {
      const effect = new vd.effect.Base()
      spyOn(effect, 'attach')
      layer.effects.push(effect)
      expect(effect.attach).toHaveBeenCalled()
    })

    it('should call `detach` when an effect is removed', function () {
      const effect = new vd.effect.Base()
      layer.effects.push(effect)
      spyOn(effect, 'detach')
      layer.effects.pop()
      expect(effect.detach).toHaveBeenCalled()
    })

    it('should call `detach` when an effect is replaced', function () {
      const effect = new vd.effect.Base()
      layer.effects.push(effect)
      spyOn(effect, 'detach')
      layer.effects[0] = new vd.effect.Base()
      expect(effect.detach).toHaveBeenCalled()
    })
  })

  describe('Image', function () {
    let layer

    beforeEach(function (done) {
      const image = new Image()
      image.src = '/base/spec/assets/layer/image.jpg'
      image.onload = () => {
        layer = new vd.layer.Image({ startTime: 0, duration: 4, image })
        // Simulate attach to movie
        const movie = { width: image.width, height: image.height, currentTime: 0, propertyFilters: [] }
        movie.movie = movie
        layer.attach(movie)
        done()
      }
    })

    it("should use the source's width when no clipWidth is provided", function () {
      const clipWidth = vd.val(layer, 'clipWidth', 0)
      expect(clipWidth).toBe(layer.image.width)
    })

    it("should use the source's height when no clipHeight is provided", function () {
      const clipHeight = vd.val(layer, 'clipHeight', 0)
      expect(clipHeight).toBe(layer.image.height)
    })

    it('should use clipWidth when no imageWidth is provided', function () {
      const imageWidth = vd.val(layer, 'imageWidth', 0)
      const clipWidth = vd.val(layer, 'clipWidth', 0)
      expect(imageWidth).toBe(clipWidth)
    })

    it('should use clipHeight when no imageHeight is provided', function () {
      const imageHeight = vd.val(layer, 'imageHeight', 0)
      const clipHeight = vd.val(layer, 'clipHeight', 0)
      expect(imageHeight).toBe(clipHeight)
    })

    it('should use imageWidth when no width is provided', function () {
      const width = vd.val(layer, 'width', 0)
      const imageWidth = vd.val(layer, 'imageWidth', 0)
      expect(width).toBe(imageWidth)
    })

    it('should use imageHeight when no height is provided', function () {
      const height = vd.val(layer, 'height', 0)
      const imageHeight = vd.val(layer, 'imageHeight', 0)
      expect(height).toBe(imageHeight)
    })

    it('should render', function () {
      // Render layer (actual outcome)
      layer.render(0)
      const width = vd.val(layer, 'width', 0)
      const height = vd.val(layer, 'height', 0)
      const imageData = layer.vctx.getImageData(0, 0, width, height)

      // Draw image (expected outcome)
      const testCanv = document.createElement('canvas')
      testCanv.width = width
      testCanv.height = height
      const testCtx = testCanv.getContext('2d')
      testCtx.drawImage(layer.image, 0, 0, width, height)
      const testImageData = testCtx.getImageData(0, 0, width, height)

      // Compare expected outcome with actual outcome
      let equal = true
      for (let i = 0; i < imageData.data.length; i++) {
        equal = equal && imageData.data[i] === testImageData.data[i]
      }
      expect(equal).toBe(true)
    })

    it('should scale with `imageWidth` and `imageHeight`', function () {
      const resizedLayer = new vd.layer.Image({
        startTime: 0,
        duration: 1,
        image: layer.image,
        imageWidth: 100,
        imageHeight: 100
      })

      // Render layer (actual outcome)
      const movie = {}
      resizedLayer.attach(movie)
      resizedLayer.render(0)
      const imageData = resizedLayer.vctx.getImageData(0, 0, resizedLayer.imageWidth, resizedLayer.imageHeight)

      // Draw image (expected outcome)
      const testCanv = document.createElement('canvas')
      testCanv.width = resizedLayer.imageWidth
      testCanv.height = resizedLayer.imageHeight
      const testCtx = testCanv.getContext('2d')
      testCtx.drawImage(layer.image, 0, 0, resizedLayer.imageWidth, resizedLayer.imageHeight)
      const testImageData = testCtx.getImageData(0, 0, resizedLayer.imageWidth, resizedLayer.imageHeight)

      // Compare expected outcome with actual outcome
      expect(imageData.data).toEqual(testImageData.data)
    })

    it('should be cropped to the clip with and height', function () {
      const newLayer = new vd.layer.Image({
        startTime: 0,
        duration: 1,
        image: layer.image,
        clipWidth: 2,
        clipHeight: 3
      })

      // Render layer (actual outcome)
      const movie = {}
      newLayer.attach(movie)
      newLayer.render(0)
      const imageData = newLayer.vctx.getImageData(
        0, 0, newLayer.clipWidth, newLayer.clipHeight
      )

      // Draw image (expected outcome)
      // testCanv will contain the part of the layer with the image.
      const testCanv = document.createElement('canvas')
      testCanv.width = newLayer.clipWidth
      testCanv.height = newLayer.clipHeight
      const testCtx = testCanv.getContext('2d')
      testCtx.drawImage(
        layer.image,
        0, 0,
        newLayer.clipWidth, newLayer.clipHeight,
        0, 0,
        newLayer.clipWidth, newLayer.clipHeight
      )
      const testImageData = testCtx.getImageData(0, 0, newLayer.clipWidth, newLayer.clipHeight)

      // Compare expected image data with actual image data
      expect(imageData.data).toEqual(testImageData.data)
    })
  })

  describe('Media', function () {
    let layer
    // Media is an abstract mixin, so make a concrete subclass here.
    const CustomMedia = vd.layer.MediaMixin(vd.layer.Base)
    const source = new Audio()

    beforeAll(function (done) {
      source.addEventListener('canplay', done)
      source.src = '/base/spec/assets/layer/audio.wav'
    })

    beforeEach(function () {
      layer = new CustomMedia({ startTime: 0, media: source })
    })

    it('should update its currentTime when the movie seeks', function () {
      const movie = {
        actx: new AudioContext(),
        currentTime: 2 // not 0
      }
      layer.attach(movie)
      vd.event.publish(movie, 'movie.seek', {})
      expect(layer.currentTime).toBe(2)
    })

    it('should have its duration depend on its playbackRate', function () {
      const oldDuration = layer.duration
      layer.playbackRate = 2
      expect(layer.duration).toBe(oldDuration / 2)
    })
  })

  // I suspect this doesn't work becuase of autoplay restrictions
  /* describe('Audio', function () {
    let layer

    beforeEach(function (done) {
      const audio = new Audio()
      audio.src = '/base/spec/assets/layer/audio.wav'
      // audio.muted = true // until we figure out how to allow autoplay in headless chrome
      audio.addEventListener('loadedmetadata', () => {
        layer = new vd.layer.Audio(0, audio)
        layer.attach(
          { actx: new AudioContext(), currentTime: 0 }
        )
        done()
      })
    })

    it('should play', function () {
      let timesPlayed = 0
      layer.media.addEventListener('play', () => {
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
