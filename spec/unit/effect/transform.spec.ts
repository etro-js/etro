import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Effects', function () {
    describe('Transform', function () {
      let movie
      let effect

      // Draw a small square in the top left corner of the target, like a layer
      // would at the start of a frame.
      function renderFrame (reltime) {
        movie.cctx.clearRect(0, 0, movie.canvas.width, movie.canvas.height)
        movie.cctx.fillStyle = 'red'
        movie.cctx.fillRect(0, 0, 4, 4)

        effect.apply(movie, reltime)
        etro.clearCachedValues(movie)
      }

      function alphaAt (x, y) {
        return movie.cctx.getImageData(x, y, 1, 1).data[3]
      }

      beforeEach(function () {
        movie = mockMovie()
        // The mock canvas is a spy, but this effect composites real pixels
        movie.canvas = document.createElement('canvas')
        movie.canvas.width = 20
        movie.canvas.height = 20
        movie.cctx = movie.canvas.getContext('2d')

        effect = new etro.effect.Transform({
          // Move the target 10px to the right over one second
          matrix: (element, time) =>
            new etro.effect.Transform.Matrix().translate(10 * time, 0)
        })
        effect.tryAttach(movie)
      })

      it('should not leave the previous frame behind when the matrix changes', function () {
        renderFrame(0)
        renderFrame(1)

        // The square should only be at its new position
        expect(alphaAt(2, 2)).toBe(0)
        expect(alphaAt(12, 2)).toBeGreaterThan(0)
      })
    })
  })
})
