describe('Movie', function () {
  let movie, canvas

  beforeEach(function () {
    if (canvas) {
      document.body.removeChild(canvas)
    }
    canvas = document.createElement('canvas')
    // Resolutions lower than 20x20 rreslt in empty blobs.
    canvas.width = 20
    canvas.height = 20
    document.body.appendChild(canvas)
    movie = new vd.Movie({ canvas, background: 'blue' })
    movie.addLayer(new vd.layer.Visual({ startTime: 0, duration: 0.8 }))
  })

  describe('identity ->', function () {
    it("should be of type 'movie'", function () {
      expect(movie.type).toBe('movie')
    })
  })

  describe('layers ->', function () {
    it('should call `attach` when a layer is added', function () {
      const layer = new vd.layer.Base({ startTime: 0, duration: 1 })
      spyOn(layer, 'attach')
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
      movie.layers[0] = new vd.layer.Base({ startTime: 0, duration: 1 })
      expect(layer.detach).toHaveBeenCalled()
    })
  })

  describe('effects ->', function () {
    it('should call `attach` when an effect is added', function () {
      const effect = new vd.effect.Base()
      spyOn(effect, 'attach')
      movie.effects.push(effect)
      expect(effect.attach).toHaveBeenCalled()
    })

    it('should call `detach` when an effect is removed', function () {
      const effect = new vd.effect.Base()
      movie.effects.push(effect)
      spyOn(effect, 'detach')
      movie.effects.pop()
      expect(effect.detach).toHaveBeenCalled()
    })

    it('should call `detach` when an effect is replaced', function () {
      const effect = new vd.effect.Base()
      movie.effects.push(effect)
      spyOn(effect, 'detach')
      movie.effects[0] = new vd.effect.Base()
      expect(effect.detach).toHaveBeenCalled()
    })
  })

  describe('operations ->', function () {
    it('should not be paused after playing', function () {
      movie.play()
      expect(movie.paused).toBe(false)
    })

    it('should be paused after pausing', function () {
      movie.play()
      movie.pause()
      // No promise returned by `pause`, because code is async in implementation.
      expect(movie.paused).toBe(true)
    })

    it('should be paused after stopping', function () {
      movie.play()
      movie.stop()
      expect(movie.paused).toBe(true)
    })

    it('should be reset to beginning after stopping', function () {
      movie.play()
      movie.stop()
      expect(movie.currentTime).toBe(0)
    })

    it('should be `recording` when recording', function () {
      movie.record({ framerate: 10 })
      expect(movie.recording).toBe(true)
    })

    it('should not be paused when recording', function () {
      movie.record({ framerate: 10 })
      expect(movie.paused).toBe(false)
    })

    it('should end recording at the right time when `duration` is supplied', function (done) {
      movie.record({ framerate: 10, duration: 0.4 })
        .then(_ => {
          // Expect movie.currentTime to be a little larger than 0.4 (the last render might land after 0.4)
          expect(movie.currentTime).toBeGreaterThanOrEqual(0.4)
          expect(movie.currentTime).toBeLessThan(0.4 + 0.08)
          done()
        })
    })

    it('should reach the end when recording with no `duration`', function (done) {
      vd.event.subscribe(movie, 'movie.ended', done)
      movie.record({ framerate: 10 })
    })

    it('should return blob after recording', function (done) {
      movie.record({ framerate: 60 })
        .then(video => {
          expect(video.size).toBeGreaterThan(0)
          done()
        })
        .catch(e => {
          throw e
        })
    })

    it('can record with custom MIME type', function (done) {
      movie.record({ framerate: 60, type: 'video/mp4' })
        .then(video => {
          expect(video.type).toBe('video/mp4')
          done()
        })
    })

    it('should produce correct image data when recording', function (done) {
      movie.record({ framerate: 10 })
        .then(video => {
          // Render the first frame of the video to a canvas and make sure the
          // image data is correct.

          // Load blob into html video element
          const v = document.createElement('video')
          v.src = URL.createObjectURL(video)
          // Since it's a blob, we need to force-load all frames for it to
          // render properly, using this hack:
          v.currentTime = Number.MAX_SAFE_INTEGER
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
            done()
          }
        })
    })
  })

  describe('events ->', function () {
    it("should fire 'movie.play' once", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.play', function () {
        timesFired++
      })
      movie.play().then(function () {
        expect(timesFired).toBe(1)
      })
    })

    it("should fire 'movie.pause' once", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.pause', function () {
        timesFired++
      })
      // play, pause and check if event was fired
      movie.play().then(function () {
        movie.pause()
        expect(timesFired).toBe(1)
      })
    })

    it("should fire 'movie.record' once", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.record', function () {
        timesFired++
      })
      movie.record({ frameRate: 1 }).then(function () {
        expect(timesFired).toBe(1)
      })
    })

    it("should fire 'movie.record' with correct options", function () {
      const options = {
        video: true, // even default values should be passed (exactly what user provides)
        audio: false
      }
      vd.event.subscribe(movie, 'movie.record', function (event) {
        expect(event.options).toEqual(options)
      })
      movie.record(options)
    })

    it("should fire 'movie.ended'", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.ended', function () {
        timesFired++
      })
      movie.play().then(function () {
        expect(timesFired).toBe(1)
      })
    })

    it("should fire 'movie.loadeddata'", function () {
      /*
       * 'loadeddata' gets timesFired when when the frame is fully loaded
       */

      let firedOnce = false
      vd.event.subscribe(movie, 'movie.loadeddata', () => {
        firedOnce = true
      })
      movie.refresh().then(() => {
        expect(firedOnce).toBe(true)
      })
    })

    it("should fire 'movie.seek'", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.seek', function () {
        timesFired++
      })
      movie.currentTime = movie.duration / 2
      expect(timesFired).toBe(1)
    })

    it("should fire 'movie.timeupdate'", function () {
      let firedOnce = false
      vd.event.subscribe(movie, 'movie.timeupdate', function () {
        firedOnce = true
      })
      movie.play().then(function () {
        expect(firedOnce).toBe(true)
      })
    })
  })
})
