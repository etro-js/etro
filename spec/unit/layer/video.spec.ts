import etro from '../../../src/index'
import { patchCreateElement } from '../mocks/dom'

describe('Unit Tests ->', function () {
  describe('Video', function () {
    let video: etro.layer.Video

    beforeEach(function () {
      patchCreateElement()

      video = new etro.layer.Video({
        startTime: 0,
        source: '/base/spec/integration/assets/layer/video.mp4'
      })
    })

    it('should set the `source` property', function () {
      expect(video.source).toBeDefined()
    })
  })
})
