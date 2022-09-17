import etro from '../../src/index'
import { mockBaseLayer } from './mocks/layer'

describe('Unit Tests ->', function () {
  describe('Events', function () {
    it('should trigger subscribers', function () {
      const o = mockBaseLayer()

      const types = ['foo.bar.test', 'foo.bar', 'foo']
      types.forEach(type => {
        const history = []
        etro.event.subscribe(o, type, event => {
          expect(event.target).toEqual(o)
          history.push(event)
        })

        etro.event.publish(o, 'foo.bar.test', {})

        expect(history).toEqual([
          {
            target: o,
            type: 'foo.bar.test'
          }
        ])
      })
    })

    it('unsubscribe removes event listeners', function () {
      const o = mockBaseLayer()
      let listenerCalled = false
      const listener = () => {
        listenerCalled = true
      }

      etro.event.subscribe(o, 'test', listener)
      etro.event.unsubscribe(o, listener)
      etro.event.publish(o, 'test', {})

      expect(listenerCalled).toBe(false)
    })
  })
})
