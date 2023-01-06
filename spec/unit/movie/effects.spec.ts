import { MovieEffects } from '../../../src/movie/effects'
import { mockBaseEffect } from '../mocks/effect'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('MovieEffects', function () {
    let effects: MovieEffects

    beforeEach(function () {
      const movie = mockMovie()
      effects = new MovieEffects([mockBaseEffect()], movie)
    })

    it('should call `tryAttach` when an effect is added', function () {
      const effect = mockBaseEffect()
      effects.push(effect)
      expect(effect.tryAttach).toHaveBeenCalled()
    })

    it('should call `tryDetach` when an effect is removed', function () {
      const effect = effects[0]
      effects.pop()
      expect(effect.tryDetach).toHaveBeenCalled()
    })
  })
})
