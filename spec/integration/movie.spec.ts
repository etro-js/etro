import etro from '../../src/index'

describe('Integration Tests ->', function () {
  const runConfigs = [
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
  ]

  runConfigs.forEach(function (runConfig) {
    describe(`Movie (${runConfig.movieView ? 'view' : 'canvas'} movie with ${runConfig.layerView ? 'view' : 'canvas'} layer) ->`, function () {
      let movie

      beforeEach(function () {
        let layerView: etro.view.OffscreenView | undefined
        let movieView: etro.view.OffscreenView | undefined
        let movieCanvas: HTMLCanvasElement | undefined

        if (runConfig.movieView) {
          movieView = new etro.view.OffscreenView({
            width: 20,
            height: 20,
            staticOutput: document.createElement('canvas')
          })
        } else {
          movieCanvas = document.createElement('canvas')
          // Resolutions lower than 20x20 result in empty blobs.
          movieCanvas.width = 20
          movieCanvas.height = 20
        }

        if (runConfig.layerView)
          layerView = new etro.view.OffscreenView()

        movie = new etro.Movie({
          background: new etro.Color(0, 0, 255),
          canvas: movieCanvas,
          view: movieView,
          autoRefresh: false
        })
        movie.addLayer(new etro.layer.Visual({
          startTime: 0,
          duration: 0.8,
          view: layerView
        }))
      })

      describe('playback ->', function () {
        it('should draw the background', async function () {
          // 1. Play one frame
          await movie.refresh()

          // 2. Make sure the background is blue
          let data: Uint8ClampedArray
          if (runConfig.movieView)
            data = movie.view.readPixels(0, 0, movie.view.width, movie.view.height)
          else
            data = movie.cctx.getImageData(0, 0, movie.width, movie.height).data

          expect(data[0]).toBe(0)
          expect(data[1]).toBe(0)
          expect(data[2]).toBe(255)
          expect(data[3]).toBe(255)
        })

        it('should play with an audio layer without errors', async function () {
          // Remove all existing layers (optional)
          movie.layers.length = 0

          // Add an audio layer
          // movie.layers.push(new etro.layer.Oscillator({ startTime: 0, duration: 1 }));
          const audio = new Audio('/base/spec/integration/assets/layer/audio.wav')
          await new Promise(resolve => {
            audio.onloadeddata = resolve
          })
          const layer = new etro.layer.Audio({
            source: audio,
            startTime: 0,
            playbackRate: 1,
            duration: audio.duration
          })
          movie.layers.push(layer)

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

        it('should never decrease its currentTime while recording', async function () {
          let prevTime
          etro.event.subscribe(movie, 'movie.timeupdate', () => {
            if (prevTime !== undefined && !movie.ended)
              expect(movie.currentTime).toBeGreaterThan(prevTime)

            prevTime = movie.currentTime
          })

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
          const audio = new Audio('/base/spec/integration/assets/layer/audio.wav')
          await new Promise(resolve => {
            audio.onloadeddata = resolve
          })
          const layer = new etro.layer.Audio({
            source: audio,
            startTime: 0,
            playbackRate: 1,
            duration: audio.duration
          })
          movie.layers.push(layer)

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
          await new Promise<void>(resolve => {
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
              // Make array of v.videoWidth * v.videoHeight red pixels
              const expectedImageData = new Uint8ClampedArray(v.videoWidth * v.videoHeight * 4)
              for (let i = 0; i < expectedImageData.length; i += 4) {
                expectedImageData[i] = 0
                expectedImageData[i + 1] = 0
                expectedImageData[i + 2] = 255
                expectedImageData[i + 3] = 255
              }
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
              // arbitrary, but it works).
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

        it("should fire 'movie.ended' when done playing", async function () {
          let timesFired = 0
          etro.event.subscribe(movie, 'movie.ended', function () {
            timesFired++
          })
          await movie.play()
          expect(timesFired).toBe(1)
        })

        it("should fire 'movie.loadeddata'", async function () {
          /*
           * 'loadeddata' gets timesFired when the frame is fully loaded
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

        it("should fire 'movie.change.modify'", function () {
          let timesFired = 0
          etro.event.subscribe(movie, 'movie.change.modify', function () {
            timesFired++
          })
          movie.currentTime = movie.duration / 2
          expect(timesFired).toBe(1)
        })
      })
    })
  })
})
