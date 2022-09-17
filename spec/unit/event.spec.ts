import etro from '../../src/index'
import { mockBaseLayer } from './mocks/layer'

describe('Unit Tests ->', function () {
  describe('Events', function () {
    it('should trigger subscribers', function () {
      const o = mockBaseLayer()

      const types = ['foo.bar.test', 'foo.bar', 'foo']
      types.forEach(type => {
        etro.event.subscribe(o, type, event => {
          expect(event.target).toEqual(o)
          notified.push(type)
        })
      })

      let notified = []
      etro.event.publish(o, 'foo.bar.test', {})
      expect(notified).toEqual(types)

      notified = []
      etro.event.publish(o, 'foo.bar', {})
      expect(notified).toEqual(types.slice(1))

      notified = []
      etro.event.publish(o, 'foo', {})
      expect(notified).toEqual(types.slice(2))
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
