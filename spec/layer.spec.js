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
      layer.tryAttach(movie)
      expect(layer._movie).toEqual(movie)
    })

    it('should throw error when detached from movie before being attached', function () {
      expect(() => {
        const movie = {}
        layer.tryDetach(movie)
      }).toThrow(new Error('No movie to detach from'))
    })

    it('should not forget target after being attached twice and then detached', function () {
      const movie = {}
      layer.tryAttach(movie)
      layer.tryAttach(movie)

      layer.tryDetach()

      expect(layer.movie).toEqual(movie)
    })

    it('should propogate changes up', function () {
      // Connect to movie to publish event to
      const movie = {}
      layer.tryAttach(movie)

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
      layer.tryAttach(movie)
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

    it('should be able to render after an effect has been directly deleted', function () {
      // Start with one effect
      layer.addEffect(new vd.effect.Base())

      // Delete the effect
      delete layer.effects[0]

      // Render
      layer.render(0)
    })
  })

  describe('VisualSource', function () {
    const CustomVisualSource = vd.layer.VisualSourceMixin(vd.layer.Visual)
    let layer

    beforeEach(function (done) {
      const image = new Image()
      image.src = '/base/spec/assets/layer/image.jpg'
      image.onload = () => {
        layer = new CustomVisualSource({ startTime: 0, duration: 4, source: image })
        // Simulate attach to movie
        const movie = { width: image.width, height: image.height, currentTime: 0, propertyFilters: [] }
        movie.movie = movie
        layer.tryAttach(movie)
        done()
      }
    })

    it("should use the image source's width when no sourceWidth is provided", function () {
      const sourceWidth = vd.val(layer, 'sourceWidth', 0)
      expect(sourceWidth).toBe(layer.source.width)
    })

    it("should use the image source's height when no sourceHeight is provided", function () {
      const sourceHeight = vd.val(layer, 'sourceHeight', 0)
      expect(sourceHeight).toBe(layer.source.height)
    })

    it('should use sourceWidth when no destWidth is provided', function () {
      const destWidth = vd.val(layer, 'destWidth', 0)
      const sourceWidth = vd.val(layer, 'sourceWidth', 0)
      expect(destWidth).toBe(sourceWidth)
    })

    it('should use sourceHeight when no destHeight is provided', function () {
      const destHeight = vd.val(layer, 'destHeight', 0)
      const sourceHeight = vd.val(layer, 'sourceHeight', 0)
      expect(destHeight).toBe(sourceHeight)
    })

    it('should use destWidth when no width is provided', function () {
      const width = vd.val(layer, 'width', 0)
      const destWidth = vd.val(layer, 'destWidth', 0)
      expect(width).toBe(destWidth)
    })

    it('should use destHeight when no height is provided', function () {
      const height = vd.val(layer, 'height', 0)
      const destHeight = vd.val(layer, 'destHeight', 0)
      expect(height).toBe(destHeight)
    })

    it('should render', function () {
      // Render layer (actual outcome)
      layer.render(0)
      const width = vd.val(layer, 'width', 0)
      const height = vd.val(layer, 'height', 0)
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
      const resizedLayer = new vd.layer.Image({
        startTime: 0,
        duration: 1,
        source: layer.source,
        destWidth: 100,
        destHeight: 100
      })

      // Render layer (actual outcome)
      const movie = {}
      resizedLayer.tryAttach(movie)
      resizedLayer.render(0)
      const imageData = resizedLayer.cctx.getImageData(0, 0, resizedLayer.destWidth, resizedLayer.destHeight)

      // Draw image (expected outcome)
      const testCanv = document.createElement('canvas')
      testCanv.width = resizedLayer.destWidth
      testCanv.height = resizedLayer.destHeight
      const testCtx = testCanv.getContext('2d')
      testCtx.drawImage(layer.source, 0, 0, resizedLayer.destWidth, resizedLayer.destHeight)
      const testImageData = testCtx.getImageData(0, 0, resizedLayer.destWidth, resizedLayer.destHeight)

      // Compare expected outcome with actual outcome
      expect(imageData.data).toEqual(testImageData.data)
    })

    it('should be cropped to the clip with and height', function () {
      const newLayer = new vd.layer.Image({
        startTime: 0,
        duration: 1,
        source: layer.source,
        sourceWidth: 2,
        sourceHeight: 3
      })

      // Render layer (actual outcome)
      const movie = {}
      newLayer.tryAttach(movie)
      newLayer.render(0)
      const imageData = newLayer.cctx.getImageData(
        0, 0, newLayer.sourceWidth, newLayer.sourceHeight
      )

      // Draw image (expected outcome)
      // testCanv will contain the part of the layer with the image.
      const testCanv = document.createElement('canvas')
      testCanv.width = newLayer.sourceWidth
      testCanv.height = newLayer.sourceHeight
      const testCtx = testCanv.getContext('2d')
      testCtx.drawImage(
        layer.source,
        0, 0,
        newLayer.sourceWidth, newLayer.sourceHeight,
        0, 0,
        newLayer.sourceWidth, newLayer.sourceHeight
      )
      const testImageData = testCtx.getImageData(0, 0, newLayer.sourceWidth, newLayer.sourceHeight)

      // Compare expected image data with actual image data
      expect(imageData.data).toEqual(testImageData.data)
    })
  })

  describe('AudioSource', function () {
    let layer
    // Media is an abstract mixin, so make a concrete subclass here.
    const CustomMedia = vd.layer.AudioSourceMixin(vd.layer.Base)
    let source

    beforeAll(function (done) {
      source = new Audio()
      source.addEventListener('canplay', done)
      source.src = '/base/spec/assets/layer/audio.wav'
    })

    beforeEach(function (done) {
      // Reusing `source` will cause problems with the web audio API
      source = source.cloneNode(true)
      source.addEventListener('canplay', done)
      layer = new CustomMedia({ startTime: 0, source })
    })

    it('should update its currentTime when the movie seeks', function () {
      const movie = {
        actx: new AudioContext(),
        currentTime: 2 // not 0
      }
      layer.tryAttach(movie)
      vd.event.publish(movie, 'movie.seek', {})
      expect(layer.currentTime).toBe(2)
    })

    it('should update source.currentTime when the movie seeks', function () {
      const movie = {
        actx: new AudioContext(),
        currentTime: 0.01 // not 0
      }
      layer.tryAttach(movie)
      vd.event.publish(movie, 'movie.seek', {})
      expect(layer.source.currentTime).toBe(layer.currentTime)
    })

    it('should update source.currentTime when the movie seeks when sourceStartTime is set', function () {
      const movie = {
        actx: new AudioContext(),
        currentTime: 0.01 // not 0
      }
      layer.sourceStartTime = 0.02
      layer.tryAttach(movie)
      vd.event.publish(movie, 'movie.seek', {})
      expect(layer.source.currentTime).toBe(layer.currentTime + layer.sourceStartTime)
    })

    it('should have its duration depend on its playbackRate', function () {
      const oldDuration = layer.duration
      layer.playbackRate = 2
      expect(layer.duration).toBe(oldDuration / 2)
    })

    it('should have no audioNode set on creation', function () {
      expect(layer.audioNode).toBeFalsy()
    })

    it('should have an audioNode set when attached', function () {
      const movie = {
        actx: new AudioContext()
      }
      layer.tryAttach(movie)
      expect(layer.audioNode).toBeTruthy()
    })

    it('should connect audioNode when attached', function () {
      const movie = {
        actx: new AudioContext()
      }
      // Create audio node and connect it to movie.actx destination
      layer.tryAttach(movie)
      // Disconnect audio node (but don't destroy it)
      layer.tryDetach()
      spyOn(layer.audioNode, 'connect')

      // `attach` replaces the `audioNode.connect` method in-place, so store the
      // spied method here.
      const connectCache = layer.audioNode.connect
      // Now, connect to movie destination again
      layer.tryAttach(movie)

      // `connect` should have been called after we attached the second time.
      expect(connectCache).toHaveBeenCalled()
    })

    it('should disconnect audioNode when detached', function () {
      const movie = {
        actx: new AudioContext()
      }
      layer.tryAttach(movie)
      spyOn(layer.audioNode, 'disconnect')

      layer.tryDetach()

      expect(layer.audioNode.disconnect).toHaveBeenCalled()
    })

    it('should keep the same audioNode when detached and re-attached', function () {
      const movie = {
        actx: new AudioContext()
      }
      layer.tryAttach(movie)
      const original = layer.audioNode
      layer.tryDetach()

      layer.tryAttach(movie)

      expect(layer.audioNode).toEqual(original)
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
