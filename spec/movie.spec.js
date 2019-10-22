describe('Movie', function () {
  let movie, canvas

  beforeEach(function () {
    if (canvas) {
      document.body.removeChild(canvas)
    }
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
    movie = new vd.Movie(canvas)
    movie.addLayer(new vd.layer.Visual(0, 0.1))
  })

  describe('operations ->', function () {
    it('should play', function () {
      movie.play()
      expect(movie.paused).toEqual(false)
    })

    it('should pause', function () {
      movie.play()
      movie.pause()
      // No promise returned by `pause`, because code is async in implementation.
      expect(movie.paused).toEqual(true)
    })

    it('should stop', function () {
      movie.play()
      movie.stop()
      expect(movie.currentTime).toEqual(0)
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
      expect(movie.recording).toEqual(true)
      expect(movie.paused).toEqual(false)
    })
  })

  describe('events ->', function () {
    it("should fire 'movie.ended'", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.ended', function () {
        timesFired++
      })
      movie.play().then(function () {
        expect(timesFired).toEqual(1)
      })
    })

    it("should fire 'movie.loadeddata'", function () {
      /*
       * 'loadeddata' gets timesFired when when the frame is fully loaded
       */

      movie.refresh()

      let firedOnce = false
      vd.event.subscribe(movie, 'movie.loadeddata', () => {
        firedOnce = true
      })
      const checkLoaded = () => {
        if (movie.renderingFrame) {
          window.requestAnimationFrame(checkLoaded)
        } else {
          expect(firedOnce).toEqual(true)
        }
      }
      window.requestAnimationFrame(checkLoaded)
    })

    it("should fire 'movie.seek'", function () {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.seek', function () {
        timesFired++
      })
      movie.currentTime = movie.duration / 2
      expect(timesFired).toEqual(1)
    })

    it("should fire 'movie.timeupdate'", function () {
      let firedOnce = false
      vd.event.subscribe(movie, 'movie.timeupdate', function () {
        firedOnce = true
      })
      movie.play().then(function () {
        expect(firedOnce).toEqual(true)
      })
    })
  })
})
