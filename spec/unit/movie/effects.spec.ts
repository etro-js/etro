import etro from '../../../src'
import { MovieEffects } from '../../../src/movie/effects'
import { mockBaseEffect } from '../mocks/effect'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('MovieEffects', function () {
    let effects: MovieEffects
    let checkReady: () => void

    beforeEach(function () {
      const movie = mockMovie()
      checkReady = jasmine.createSpy('checkReady')
      effects = new MovieEffects([mockBaseEffect()], movie, checkReady)
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

    it('should call `checkReady` when an effect is added', function () {
      const effect = mockBaseEffect()
      effects.push(effect)
      expect(checkReady).toHaveBeenCalled()
    })

    it('should call `checkReady` when an effect is removed', function () {
      effects.pop()
      expect(checkReady).toHaveBeenCalled()
    })

    it('should subscribe to `ready` changes on effects', function () {
      spyOn(etro.event, 'subscribe')
      const effect = mockBaseEffect()
      effects.push(effect)
      expect(etro.event.subscribe).toHaveBeenCalledWith(effect, 'ready', jasmine.any(Function))
    })
  })
})
