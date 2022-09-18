import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Effects', function () {
    describe('Base', function () {
      let effect

      beforeEach(function () {
        effect = new etro.effect.Visual()
      })

      it("should be of type 'effect'", function () {
        expect(effect.type).toBe('effect')
      })

      it('should always be ready', function () {
        expect(effect.ready).toBe(true)
      })

      it('should set _target when attached', function () {
        const movie = mockMovie()
        effect.tryAttach(movie)
        expect(effect._target).toBe(movie)
      })

      it('should throw error when detached from movie before being attached', function () {
        expect(() => {
          const movie = mockMovie()
          effect.tryDetach(movie)
        }).toThrow(new Error('No movie to detach from'))
      })

      it('should not forget movie after being attached twice and then detached', function () {
        const movie = mockMovie()
        effect.tryAttach(movie)
        effect.tryAttach(movie)

        effect.tryDetach()

        expect(effect._target).toEqual(movie)
      })
    })
  })
})
