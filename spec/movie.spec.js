describe('Movie', function () {
  let movie, canvas

  beforeEach(function () {
    if (canvas) {
      document.body.removeChild(canvas)
    }
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
    movie = new vd.Movie(canvas)
    movie.addLayer(new vd.layer.Visual(0, 0.5))
  })

  describe('operations ->', function () {
    it('should play', function () {
      movie.play()
      expect(movie.paused).toBe(false)
    })

    it('should pause', function () {
      movie.play()
      movie.pause()
      // No promise returned by `pause`, because code is async in implementation.
      expect(movie.paused).toBe(true)
    })

    it('should stop', function () {
      movie.play()
      movie.stop()
      expect(movie.currentTime).toBe(0)
    })

    it('should record', function (done) {
      movie.record(60)
        .then(video => {
          expect(video).toEqual(jasmine.any(Blob))
          expect(video.size).toBeGreaterThan(0)
          done()
        })
        .catch(e => {
          throw e
        })
      expect(movie.recording).toBe(true)
      expect(movie.paused).toBe(false)
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
      movie.record().then(function () {
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
