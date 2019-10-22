describe('Events', function () {
  it('should trigger subscribers', function () {
    const o = {}

    const types = ['foo.bar.test', 'foo.bar', 'foo']
    types.forEach(type => {
      vd.event.subscribe(o, type, event => {
        expect(event.target).toEqual(o)
        notified.push(type)
      })
    })

    let notified = []
    vd.event.publish(o, 'foo.bar.test', {})
    expect(notified).toEqual(types)

    notified = []
    vd.event.publish(o, 'foo.bar', {})
    expect(notified).toEqual(types.slice(1))

    notified = []
    vd.event.publish(o, 'foo', {})
    expect(notified).toEqual(types.slice(2))
  })
})
