describe('Movie', () => {
  let movie, canvas

  beforeEach(() => {
    if (canvas) {
      document.body.removeChild(canvas)
    }
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
    movie = new vd.Movie(canvas)
    movie.addLayer(new vd.layer.Visual(0, 0.1))
  })

  describe('operations ->', () => {
    it('should play', () => {
      movie.play()
      expect(movie.paused).toEqual(false)
    })

    it('should pause', () => {
      movie.play()
      movie.pause()
      // No promise returned by `pause`, because code is async in implementation.
      expect(movie.paused).toEqual(true)
    })

    it('should stop', () => {
      movie.play()
      movie.stop()
      expect(movie.currentTime).toEqual(0)
    })

    it('should record', done => {
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

  describe('events ->', () => {
    it("should fire 'movie.ended'", () => {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.ended', () => {
        timesFired++
      })
      movie.play().then(() => {
        expect(timesFired).toEqual(1)
      })
    })

    it("should fire 'movie.loadeddata'", () => {
      /*
       * 'loadeddata' gets timesFired when when the frame is fully loaded
       */

      movie.refresh();

      let firedOnce = false;
      vd.event.subscribe(movie, 'movie.loadeddata', () => { firedOnce = true; });
      const checkLoaded = () => {
          if (movie.renderingFrame) {
              window.requestAnimationFrame(checkLoaded);
          } else {
              expect(firedOnce).toEqual(true);
          }
      };
      window.requestAnimationFrame(checkLoaded);
    })

    it("should fire 'movie.seek'", () => {
      let timesFired = 0
      vd.event.subscribe(movie, 'movie.seek', () => {
        timesFired++
      })
      movie.currentTime = movie.duration / 2
      expect(timesFired).toEqual(1)
    })

    it("should fire 'movie.timeupdate'", () => {
      let firedOnce = false
      vd.event.subscribe(movie, 'movie.timeupdate', () => { firedOnce = true })
      movie.play().then(() => {
        expect(firedOnce).toEqual(true)
      })
    })
  })
})
