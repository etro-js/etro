import etro from '../../../src'

// eslint-disable-next-line no-unused-vars
export function mockBaseEffect (watchPublic = false) {
  let effect = jasmine.createSpyObj('effect', [
    'getDefaultOptions',
    'tryAttach',
    'tryDetach'
  ])
  effect.getDefaultOptions.and.returnValue({})
  effect.tryAttach.and.callFake(movie => {
    // Manually attach layer to movie, because `attach` is stubbed.
    // Otherwise, auto-refresh will cause errors.
    effect.movie = movie
  })

  // I believe `watchPublic` needs to be called before we add the properties.
  if (watchPublic)
    effect = etro.watchPublic(effect) as etro.effect.Base

  effect.type = 'effect'
  effect.enabled = true
  return effect
}
