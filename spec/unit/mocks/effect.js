// eslint-disable-next-line no-unused-vars
function mockBaseEffect () {
  const effect = jasmine.createSpyObj('effect', [
    'tryAttach',
    'tryDetach'
  ])
  effect.tryAttach.and.callFake(movie => {
    // Manually attach layer to movie, because `attach` is stubbed.
    // Otherwise, auto-refresh will cause errors.
    effect.movie = movie
  })
  effect.enabled = true
  return effect
}
