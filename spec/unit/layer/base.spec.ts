import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('Base', function () {
      let layer

      beforeEach(function () {
        layer = new etro.layer.Base({ startTime: 0, duration: 4 })
      })

      it('should always be ready', function () {
        expect(layer.ready).toBe(true)
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

      it('should throw an error if startTime or duration are not defined', function () {
        expect(() => {
          // @ts-expect-error Incomplete options object for testing
          // eslint-disable-next-line no-new
          new etro.layer.Base({ duration: 4 })
        }).toThrow(new Error('Property "startTime" is required in BaseOptions'))
        expect(() => {
          // @ts-expect-error Incomplete options object for testing
          // eslint-disable-next-line no-new
          new etro.layer.Base({ startTime: 4 })
        }).toThrow(new Error('Property "duration" is required in BaseOptions'))
      })
    })
  })
})
