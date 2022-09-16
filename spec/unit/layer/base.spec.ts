import etro from '../../..'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('Base', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Base({ startTime: 0, duration: 4 })
      })

      it("should be of type 'layer'", function () {
        expect(layer.type).toBe('layer')
      })

      it('should attach to movie', function () {
        const movie = mockMovie()
        layer.tryAttach(movie)
        expect(layer._movie).toEqual(movie)
      })

      it('should not double-attach to movie', function () {
        const movie = mockMovie()
        spyOn(layer, 'attach')
        layer.tryAttach(movie)
        layer.tryAttach(movie)
        expect(layer.attach).toHaveBeenCalledTimes(1)
      })

      it('should throw error when detached from movie before being attached', function () {
        expect(() => {
          const movie = mockMovie()
          layer.tryDetach(movie)
        }).toThrow(new Error('No movie to detach from'))
      })

      it('should not forget target after being attached twice and then detached', function () {
        const movie = mockMovie()
        layer.tryAttach(movie)
        layer.tryAttach(movie)

        layer.tryDetach()

        expect(layer.movie).toEqual(movie)
      })
    })
  })
})
