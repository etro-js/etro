import etro from '../../../src/index'
import { mockCanvas, mockDocumentCreate } from '../mocks/dom'
import { mockMovie } from '../mocks/movie'
import { mockView } from '../mocks/offscreen-view'

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
      describe('Shader ->', function () {
        let effect: etro.effect.Shader
        let target: etro.Movie

        beforeEach(function () {
          mockDocumentCreate()

          effect = new etro.effect.Shader()
          target = mockMovie({
            canvas: mockCanvas(),
            view: runConfig.useView
              ? mockView({
                staticOutput: mockCanvas()
              })
              : undefined
          })

          effect.attach(target)
        })

        if (runConfig.useView) {
          it('should activate the WebGL context on the view', function () {
            effect.apply(target, 0)

            expect(target.view.useGL).toHaveBeenCalled()
          })

          it('should draw the WebGL context on the view', function () {
            effect.apply(target, 0)

            expect(target.view.finish).toHaveBeenCalled()
          })
        }
      })
    })
  })
})
