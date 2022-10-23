import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Effects', function () {
    describe('Stack', function () {
      let stack

      beforeEach(function () {
        const effects = [
          jasmine.createSpyObj('effect1', ['apply', 'tryAttach', 'tryDetach']),
          jasmine.createSpyObj('effect2', ['apply', 'tryAttach', 'tryDetach'])
        ]
        stack = new etro.effect.Stack({ effects })
        const movie = mockMovie()
        stack.tryAttach(movie)
      })

      it('should attach its children to the target when attached', function () {
        stack.effects.forEach(effect => {
          expect(effect.tryAttach).toHaveBeenCalledWith(stack._target)
        })
      })

      it('should attach a new child', function () {
        const child = jasmine.createSpyObj('effect3', ['apply', 'tryAttach', 'tryDetach'])

        stack.effects.push(child)

        expect(child.tryAttach).toHaveBeenCalled()
      })

      it('should detach each child that is removed', function () {
        const child = stack.effects[0]

        stack.effects.shift() // remove first element

        expect(child.tryDetach).toHaveBeenCalled()
      })

      it('should be able to attach, apply and detach after a child has been directly deleted', function () {
        // Start with one effect
        stack.effects.push(new etro.effect.Visual())

        // Delete the effect
        delete stack.effects[0]

        // Perform normal operations
        const movie = mockMovie()
        stack.tryAttach(movie)
        stack.apply(movie)
        stack.tryDetach()
      })
    })
  })
})
