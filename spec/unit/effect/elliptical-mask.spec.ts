import etro from '../../../src/index'
import { mockCanvas, mockDocumentCreate } from '../mocks/dom'
import { mockMovie } from '../mocks/movie'
import { mockDOMView } from '../mocks/dom-view'

const runConfigs = [
  {
    useView: false
  },
  {
    useView: true
  }
]

runConfigs.forEach(runConfig => {
  describe('Unit Tests ->', function () {
    describe('Effects ->', function () {
      describe(`Elliptical Mask (${runConfig.useView ? 'view' : 'canvas'}) ->`, function () {
        let effect: etro.effect.EllipticalMask
        let target: etro.Movie

        beforeEach(function () {
          mockDocumentCreate()

          effect = new etro.effect.EllipticalMask({
            x: 25,
            y: 25,
            radiusX: 50,
            radiusY: 50
          })
          target = mockMovie({
            canvas: runConfig.useView ? undefined : document.createElement('canvas'),
            view: runConfig.useView
              ? mockDOMView({
                staticOutput: mockCanvas()
              })
              : undefined
          })
          effect.attach(target)
        })

        if (runConfig.useView) {
          it('should activate the 2D context on the view', function () {
            effect.apply(target, 0)

            expect(target.view.use2D).toHaveBeenCalled()
          })

          it("should swap the view's contexts", function () {
            effect.apply(target, 0)

            expect(target.view.finish).toHaveBeenCalled()
          })
        } else {
          it('should draw the WebGL context on the canvas', function () {
            effect.apply(target, 0)

            expect(target.canvas.getContext).toHaveBeenCalledWith('2d')
          })
        }
      })
    })
  })
})
