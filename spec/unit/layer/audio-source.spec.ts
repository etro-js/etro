import etro from '../../../src/index'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('AudioSource', function () {
      // Media is an abstract mixin, so make a concrete subclass here.
      const CustomMedia = etro.layer.AudioSourceMixin(etro.layer.Base)

      let source
      let movie

      beforeEach(async function () {
        source = jasmine.createSpyObj('source', ['addEventListener', 'play'])
        source.readyState = 4
        source.duration = 4
        source.currentTime = 0

        movie = mockMovie()
        movie.currentTime = 2
        movie.duration = 4
      })

      it('should be ready when source is ready', async function () {
        const layer = new CustomMedia({ startTime: 0, source })

        expect(layer.ready).toBe(true)
        await layer.whenReady()
      })

      it('should not be ready when source is not ready', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        source.readyState = 3
        expect(layer.ready).toBe(false)
      })

      it('should update its currentTime when seeking', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        layer.seek(2)
        expect(layer.currentTime).toBe(2)
      })

      it('should update source.currentTime when seeking', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        layer.seek(2)
        expect(layer.source.currentTime).toBe(layer.currentTime)
      })

      it('should update source.currentTime when seeking with sourceStartTime set', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        layer.sourceStartTime = 0.02
        layer.seek(2)
        expect(layer.source.currentTime).toBe(layer.currentTime + layer.sourceStartTime)
      })

      it('should have its duration depend on its playbackRate', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        const oldDuration = layer.duration
        layer.playbackRate = 2
        expect(layer.duration).toBe(oldDuration / 2)
      })

      it('should have no audioNode set on creation', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        expect(layer.audioNode).toBeFalsy()
      })

      it('should have an audioNode set when attached', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        layer.tryAttach(movie)
        expect(layer.audioNode).toBeTruthy()
      })

      it('should connect audioNode when attached', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        // Create audio node and connect it to movie.actx destination
        layer.tryAttach(movie)
        // Disconnect audio node (but don't destroy it)
        layer.tryDetach()

        // Now, connect to movie destination again
        layer.tryAttach(movie)

        // `connect` should have been called after we attached the second time.
        expect(layer.audioNode.connect).toHaveBeenCalled()
      })

      it('should disconnect audioNode when detached', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        layer.tryAttach(movie)

        layer.tryDetach()

        expect(layer.audioNode.disconnect).toHaveBeenCalled()
      })

      it('should keep the same audioNode when detached and re-attached', function () {
        const layer = new CustomMedia({ startTime: 0, source })

        layer.tryAttach(movie)
        const original = layer.audioNode
        layer.tryDetach()

        layer.tryAttach(movie)

        expect(layer.audioNode).toEqual(original)
      })
    })
  })
})
