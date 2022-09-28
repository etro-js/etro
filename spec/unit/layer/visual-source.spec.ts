import etro from '../../../src/index'
import { mockAudioContext, mockCanvas } from '../mocks/dom'
import { mockBaseLayer } from '../mocks/layer'
import { mockMovie } from '../mocks/movie'

describe('Unit Tests ->', function () {
  describe('Layers', function () {
    describe('VisualSource', function () {
      // Media is an abstract mixin, so make a concrete subclass here.
      const CustomMedia = etro.layer.VisualSourceMixin(etro.layer.Visual)

      let source
      let layer
      let movie

      beforeEach(async function () {
        // Source is an html video element.
        source = jasmine.createSpyObj('source', ['addEventListener', 'play'])
        source.readyState = 2
        source.duration = 4
        source.currentTime = 0
        layer = new CustomMedia({ startTime: 0, source })

        movie = mockMovie()
        movie.currentTime = 2
        movie.duration = 4
      })

      it('should be ready when source is ready', function () {
        expect(layer.ready).toBe(true)
      })

      it('should not be ready when source is not ready', function () {
        source.readyState = 0
        expect(layer.ready).toBe(false)
      })

      it('should be able to use an image url', async function() {
        let movie2 = new etro.Movie({
          actx: mockAudioContext(),
          canvas: mockCanvas(),
          autoRefresh: false
        })
        movie2.addLayer(mockBaseLayer())

        
        const tempLayer = new etro.layer.Image({ startTime: 0, duration: 0.8, source: 'https://pvanderlaat.com/clubfinity.png' })
        const tempImage = new Image()
        tempImage.src = 'https://pvanderlaat.com/clubfinity.png'
        movie2.addLayer(tempLayer)
        // tempLayer.source.readyState = 0
        expect(tempLayer.source).toEqual(tempImage)
        let res = await movie2.play()
        console.log("VANDELY2")
        console.log(res)
      })
      it('shouldn\'t be able to use an invalaid image url', async function() {
        let movie2 = new etro.Movie({
          actx: mockAudioContext(),
          canvas: mockCanvas(),
          autoRefresh: false
        })
        movie2.addLayer(mockBaseLayer())

        
        const tempLayer = new etro.layer.Image({ startTime: 0, duration: 0.8, source: 'invalid_url_!!!' })
        // const tempImage = new Image()
        // tempImage.src = 'not_a_working_url'
        movie2.addLayer(tempLayer)
        // tempLayer.source.readyState = 0
        // expect(tempLayer.source).toEqual(tempImage)
        let res = await movie2.play()
        console.log("VANDELY2")
        console.log(res)
      })
    })
  })
})
