import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('AudioSource', function () {
      // Media is an abstract mixin, so make a concrete subclass here.
      const CustomMedia = etro.layer.AudioSourceMixin(etro.layer.Base)

      let source
      let layer
      let movie

      beforeEach(async function () {
        source = jasmine.createSpyObj('source', ['addEventListener', 'play'])
        source.readyState = 2
        source.duration = 4
        source.currentTime = 0
        layer = new CustomMedia({ startTime: 0, source })

        movie = mockMovie()
        movie.currentTime = 2
        movie.duration = 4
      })

      it('should update its currentTime when the movie seeks', function () {
        layer.tryAttach(movie)
        etro.event.publish(movie, 'movie.seek', {})
        expect(layer.currentTime).toBe(2)
      })

      it('should update source.currentTime when the movie seeks', function () {
        layer.tryAttach(movie)
        etro.event.publish(movie, 'movie.seek', {})
        expect(layer.source.currentTime).toBe(layer.currentTime)
      })

      it('should update source.currentTime when the movie seeks when sourceStartTime is set', function () {
        layer.sourceStartTime = 0.02
        layer.tryAttach(movie)
        etro.event.publish(movie, 'movie.seek', {})
        expect(layer.source.currentTime).toBe(layer.currentTime + layer.sourceStartTime)
      })

      it('should have its duration depend on its playbackRate', function () {
        const oldDuration = layer.duration
        layer.playbackRate = 2
        expect(layer.duration).toBe(oldDuration / 2)
      })

      it('should have no audioNode set on creation', function () {
        expect(layer.audioNode).toBeFalsy()
      })

      it('should have an audioNode set when attached', function () {
        layer.tryAttach(movie)
        expect(layer.audioNode).toBeTruthy()
      })

      it('should connect audioNode when attached', function () {
        // Create audio node and connect it to movie.actx destination
        layer.tryAttach(movie)
        // Disconnect audio node (but don't destroy it)
        layer.tryDetach()
        spyOn(layer.audioNode, 'connect')

        // `attach` replaces the `audioNode.connect` method in-place, so store the
        // spied method here.
        const connectCache = layer.audioNode.connect
        // Now, connect to movie destination again
        layer.tryAttach(movie)

        // `connect` should have been called after we attached the second time.
        expect(connectCache).toHaveBeenCalled()
      })

      it('should disconnect audioNode when detached', function () {
        layer.tryAttach(movie)
        spyOn(layer.audioNode, 'disconnect')

        layer.tryDetach()

        expect(layer.audioNode.disconnect).toHaveBeenCalled()
      })

      it('should keep the same audioNode when detached and re-attached', function () {
        layer.tryAttach(movie)
        const original = layer.audioNode
        layer.tryDetach()

        layer.tryAttach(movie)

        expect(layer.audioNode).toEqual(original)
      })
    })
  })
})
