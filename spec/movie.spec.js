const createBaseLayer = () => new etro.layer.Base({ startTime: 0, duration: 1 })

describe('Movie', function () {
  let movie, canvas

  beforeEach(function () {
    if (canvas)
      document.body.removeChild(canvas)

    canvas = document.createElement('canvas')
    // Resolutions lower than 20x20 rreslt in empty blobs.
    canvas.width = 20
    canvas.height = 20
    document.body.appendChild(canvas)

    movie = new etro.Movie({ canvas, background: 'blue', autoRefresh: false })
    movie.addLayer(new etro.layer.Visual({ startTime: 0, duration: 0.8 }))
  })

  describe('identity ->', function () {
    it("should be of type 'movie'", function () {
      expect(movie.type).toBe('movie')
    })
  })

  describe('layers ->', function () {
    it('should call `attach` when a layer is added', function () {
      const layer = createBaseLayer()
      spyOn(layer, 'attach')
      // Manually attach layer to movie, because `attach` is stubbed.
      // Otherwise, auto-refresh will cause errors.
      layer._movie = movie

      // Add layer
      movie.layers.push(layer)
      expect(layer.attach).toHaveBeenCalled()
    })

    it('should call `detach` when a layer is removed', function () {
      spyOn(movie.layers[0], 'detach')
      const layer = movie.layers.shift()
      expect(layer.detach).toHaveBeenCalled()
    })

    it('should call `detach` when a layer is replaced', function () {
      const layer = movie.layers[0]
      spyOn(layer, 'detach')
      movie.layers[0] = createBaseLayer()
      expect(layer.detach).toHaveBeenCalled()
    })

    it('should implement common array methods', function () {
      const dummy = () => createBaseLayer()
      const calls = {
        concat: [[dummy()]],
        every: [layer => true],
        includes: [dummy()],
        pop: [],
        push: [dummy()],
        unshift: [dummy()]
      }
      for (const method in calls) {
        const args = calls[method]
        const copy = [...movie.layers]
        const expectedResult = Array.prototype[method].apply(copy, args)
        const actualResult = movie.layers[method](...args)
        expect(actualResult).toEqual(expectedResult)
        expect(movie.layers).toEqual(copy)
      }
    })

    it('should not double-attach when `unshift` is called on empty array', function () {
      const layer = createBaseLayer()
      spyOn(layer, 'attach').and.callFake(movie => {
        // Manually attach layer to movie, because `attach` is stubbed.
        // Otherwise, auto-refresh will cause errors.
        layer._movie = movie
      })
      movie.layers.unshift(layer)
      expect(layer.attach.calls.count()).toBe(1)
    })

    it('should not double-attach existing layer when `unshift` is called', function () {
      // Start with one layer
      const existing = createBaseLayer()
      spyOn(existing, 'attach').and.callFake(movie => {
        // Manually attach layer to movie, because `attach` is stubbed.
        // Otherwise, auto-refresh will cause errors.
        existing._movie = movie
      })
      // Manually attach to movie, since `attach` is stubbed.
      movie.addLayer(existing)

      // Add a layer using `unshift`
      movie.layers.unshift(createBaseLayer())

      // Expect both layers to only have been `attach`ed once
      expect(existing.attach.calls.count()).toBe(1)
    })

    it('should not double-attach new layer when `unshift` is called with an existing item', function () {
      // Start with one layer
      movie.addLayer(createBaseLayer())

      // Add a layer using `unshift`
      const added = createBaseLayer()
      spyOn(added, 'attach').and.callFake(movie => {
        // Manually attach layer to movie, because `attach` is stubbed.
        // Otherwise, auto-refresh will cause errors.
        added._movie = movie
      })
      movie.layers.unshift(added)

      // Expect both layers to only have been `attach`ed once
      expect(added.attach.calls.count()).toBe(1)
    })

    it('should be able to operate after a layer has been deleted', function (done) {
      // Start with three layers
      movie.addLayer(createBaseLayer())
      movie.addLayer(createBaseLayer())
      movie.addLayer(createBaseLayer())

      // Delete the middle layer
      delete movie.layers[1]

      // Let the movie play and pause it again
      movie.play().then(() => {
        done()
      })
      expect(movie.paused).toBe(false)
      movie.pause()
      expect(movie.paused).toBe(true)
    })
  })

  describe('effects ->', function () {
    it('should call `attach` when an effect is added', function () {
      const effect = new etro.effect.Base()
      spyOn(effect, 'attach')

      movie.effects.push(effect)
      expect(effect.attach).toHaveBeenCalled()
    })

    it('should call `detach` when an effect is removed', function () {
      const effect = new etro.effect.Base()
      movie.effects.push(effect)
      spyOn(effect, 'detach')

      movie.effects.pop()
      expect(effect.detach).toHaveBeenCalled()
    })

    it('should call `detach` when an effect is replaced', function () {
      const effect = new etro.effect.Base()
      movie.effects.push(effect)
      spyOn(effect, 'detach')

      movie.effects[0] = new etro.effect.Base()
      expect(effect.detach).toHaveBeenCalled()
    })

    it('should implement common array methods', function () {
      const dummy = () => new etro.effect.Base()
      const calls = {
        concat: [[dummy()]],
        every: [layer => true],
        includes: [dummy()],
        pop: [],
        push: [dummy()],
        unshift: [dummy()]
      }

      for (const method in calls) {
        const args = calls[method]
        const copy = [...movie.effects]
        const expectedResult = Array.prototype[method].apply(copy, args)
        const actualResult = movie.effects[method](...args)
        expect(actualResult).toEqual(expectedResult)
        expect(movie.effects).toEqual(copy)
      }
    })

    it('should be able to play and pause after an effect has been directly deleted', function (done) {
      // Start with one effect
      movie.addEffect(new etro.effect.Base())

      // Delete the effect
      delete movie.effects[0]

      // Let the movie play and pause it again
      movie.play().then(() => {
        done()
      })
      expect(movie.paused).toBe(false)
      movie.pause()
      expect(movie.paused).toBe(true)
    })
  })

  describe('operations ->', function () {
    it('should not be paused while playing', function (done) {
      movie.play().then(() => {
        done()
      })
      expect(movie.paused).toBe(false)
    })

    it('should be paused after pausing', function (done) {
      movie.play().then(() => {
        done()
      })
      movie.pause()
      // No promise returned by `pause`, because code is async in implementation.
      expect(movie.paused).toBe(true)
    })

    it('should be paused after stopping', function (done) {
      movie.play().then(() => {
        done()
      })
      movie.stop()
      expect(movie.paused).toBe(true)
    })

    it('should be paused after playing to the end', async function () {
      await movie.play()
      expect(movie.paused).toBe(true)
    })

    it('should play with an audio layer without errors', async function () {
      // Remove all existing layers (optional)
      movie.layers.length = 0

      // Add an audio layer
      // movie.layers.push(new etro.layer.Oscillator({ startTime: 0, duration: 1 }));
      const audio = new Audio('/base/spec/assets/layer/audio.wav')
      await new Promise(resolve => {
        audio.onloadeddata = resolve
      })
      movie.layers.push(new etro.layer.Audio({ source: audio, startTime: 0 }))

      // Record
      await movie.play()
    })

    it('should never decrease its currentTime during one playthrough', async function () {
      let prevTime
      etro.event.subscribe(movie, 'movie.timeupdate', () => {
        if (prevTime !== undefined && !movie.paused)
          expect(movie.currentTime).toBeGreaterThan(prevTime)

        prevTime = movie.currentTime
      })

      await movie.play()
    })

    it('should be reset to beginning after stopping', async function (done) {
      movie.play().then(() => {
        done()
      })
      movie.stop()
      expect(movie.currentTime).toBe(0)
    })

    it('should be `recording` when recording', function (done) {
      movie.record({ frameRate: 10 }).then(() => {
        done()
      })

      expect(movie.recording).toBe(true)
    })

    it('should not be paused when recording', function (done) {
      movie.record({ frameRate: 10 }).then(() => {
        done()
      })

      expect(movie.paused).toBe(false)
    })

    it('should be paused after recording to the end', async function () {
      await movie.record({ frameRate: 10 })
      expect(movie.paused).toBe(true)
    })

    it('should never decrease its currentTime while recording', async function () {
      let prevTime
      etro.event.subscribe(movie, 'movie.timeupdate', () => {
        if (prevTime !== undefined && !movie.ended)
          expect(movie.currentTime).toBeGreaterThan(prevTime)

        prevTime = movie.currentTime
      })

      await movie.record({ frameRate: 10 })
    })

    it('should end recording at the right time when `duration` is supplied', async function () {
      await movie.record({ frameRate: 10, duration: 0.4 })
      // Expect movie.currentTime to be a little larger than 0.4 (the last render might land after 0.4)
      expect(movie.currentTime).toBeGreaterThanOrEqual(0.4)
      expect(movie.currentTime).toBeLessThan(0.4 + 0.08)
    })

    it('should reach the end when recording with no `duration`', async function () {
      await movie.record({ frameRate: 10 })
    })

    it('should return blob after recording', async function () {
      const video = await movie.record({ frameRate: 60 })
      expect(video.size).toBeGreaterThan(0)
    })

    it('should return nonempty blob when recording with one audio layer', async function () {
      // Remove all existing layers (optional)
      movie.layers.length = 0

      // Add an audio layer
      // movie.layers.push(new etro.layer.Oscillator({ startTime: 0, duration: 1 }));
      const audio = new Audio('/base/spec/assets/layer/audio.wav')
      await new Promise(resolve => {
        audio.onloadeddata = resolve
      })
      movie.layers.push(new etro.layer.Audio({ source: audio, startTime: 0 }))

      // Record
      const video = await movie.record({ frameRate: 30 })
      expect(video.size).toBeGreaterThan(0)
    })

    it('can record with custom MIME type', async function () {
      const video = await movie.record({ frameRate: 60, type: 'video/webm;codecs=vp8' })
      expect(video.type).toBe('video/webm;codecs=vp8')
    })

    it('should produce correct image data when recording', async function () {
      const video = await movie.record({ frameRate: 10 })
      // Render the first frame of the video to a canvas and make sure the
      // image data is correct.

      // Load blob into html video element
      const v = document.createElement('video')
      v.src = URL.createObjectURL(video)
      // Since it's a blob, we need to force-load all frames for it to
      // render properly, using this hack:
      v.currentTime = Number.MAX_SAFE_INTEGER
      await new Promise(resolve => {
        v.ontimeupdate = () => {
          // Now the video is loaded. Create temporary canvas and render first
          // frame onto it.
          const ctx = document
            .createElement('canvas')
            .getContext('2d')
          ctx.canvas.width = v.videoWidth
          ctx.canvas.height = v.videoHeight
          ctx.drawImage(v, 0, 0)
          // Expect all opaque blue pixels
          const expectedImageData = Array(v.videoWidth * v.videoHeight)
            .fill([0, 0, 255, 255])
            .flat(1)
          const actualImageData = Array.from(
            ctx.getImageData(0, 0, v.videoWidth, v.videoHeight).data
          )
          const maxDiff = actualImageData
            // Calculate diff image data
            .map((x, i) => x - expectedImageData[i])
            // Find max pixel component diff
            .reduce((x, max) => Math.max(x, max))

          // Now, there is going to be variance due to encoding problems.
          // Accept an error of 5 for each color component (5 is somewhat
          // arbitrary but it works).
          expect(maxDiff).toBeLessThanOrEqual(5)
          URL.revokeObjectURL(v.src)
          resolve()
        }
      })
    })
  })

  describe('events ->', function () {
    it("should fire 'movie.play' once", async function () {
      let timesFired = 0
      etro.event.subscribe(movie, 'movie.play', function () {
        timesFired++
      })
      await movie.play()
      expect(timesFired).toBe(1)
    })

    it("should fire 'movie.pause' once", function (done) {
      let timesFired = 0
      etro.event.subscribe(movie, 'movie.pause', function () {
        timesFired++
      })
      // play, pause and check if event was fired
      movie.play().then(() => {
        done()
      })
      movie.pause()
      expect(timesFired).toBe(1)
    })

    it("should fire 'movie.record' once", async function () {
      let timesFired = 0
      etro.event.subscribe(movie, 'movie.record', function () {
        timesFired++
      })
      await movie.record({ frameRate: 1 })
      expect(timesFired).toBe(1)
    })

    it("should fire 'movie.record' with correct options", async function () {
      const options = {
        video: true, // even default values should be passed (exactly what user provides)
        audio: false
      }
      etro.event.subscribe(movie, 'movie.record', function (event) {
        expect(event.options).toEqual(options)
      })
      await movie.record(options)
    })

    it("should fire 'movie.ended'", async function () {
      let timesFired = 0
      etro.event.subscribe(movie, 'movie.ended', function () {
        timesFired++
      })
      await movie.play()
      expect(timesFired).toBe(1)
    })

    it("should fire 'movie.loadeddata'", async function () {
      /*
       * 'loadeddata' gets timesFired when when the frame is fully loaded
       */

      let firedOnce = false
      etro.event.subscribe(movie, 'movie.loadeddata', () => {
        firedOnce = true
      })
      await movie.refresh()
      expect(firedOnce).toBe(true)
    })

    it("should fire 'movie.seek'", function () {
      let timesFired = 0
      etro.event.subscribe(movie, 'movie.seek', function () {
        timesFired++
      })
      movie.currentTime = movie.duration / 2
      expect(timesFired).toBe(1)
    })

    it("should fire 'movie.timeupdate'", async function () {
      let firedOnce = false
      etro.event.subscribe(movie, 'movie.timeupdate', function () {
        firedOnce = true
      })
      await movie.play()
      expect(firedOnce).toBe(true)
    })
  })
})
