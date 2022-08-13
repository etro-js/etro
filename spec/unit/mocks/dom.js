/** Mock time dependencies */
// eslint-disable-next-line no-unused-vars
function mockTime (start = 0, step = 100) {
  spyOn(window, 'requestAnimationFrame').and.callFake(cb => {
    // Run callback asynchronously. If we ran it immediately, it would be
    // called synchronously, which would break tests that expect it to be run
    // asynchronously (like it would be if we weren't mocking it).
    setTimeout(cb, 0)
  })

  let time = start
  spyOn(window.performance, 'now').and.callFake(() => {
    const result = time
    time += step
    return result
  })
}

// eslint-disable-next-line no-unused-vars
function mockMediaElementSource (actx) {
  const source = jasmine.createSpyObj('source', [
    'connect',
    'disconnect',
    'addEventListener',
    'play',
    'pause',
    'stop'
  ])
  source.connect.and.callFake(node => {
    source.destination = node
  })
  source.disconnect.and.callFake(() => {
    source.destination = null
  })
  source.readyState = 2
  source.currentTime = 0
  source.duration = 4
  return source
}

// eslint-disable-next-line no-unused-vars
function mockAudioContext () {
  const actx = jasmine.createSpyObj('actx', ['createMediaElementSource'])
  actx.createMediaElementSource.and.callFake(mockMediaElementSource)
  actx.destination = jasmine.createSpyObj('destination', ['connect'])
  return actx
}

// eslint-disable-next-line no-unused-vars
function mockCanvas () {
  const canvas = jasmine.createSpyObj('canvas', ['getContext'])
  const ctx = jasmine.createSpyObj('cctx', ['clearRect', 'fillRect', 'drawImage'])
  canvas.getContext.and.returnValue(ctx)
  return canvas
}
