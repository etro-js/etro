import { CustomArray, CustomArrayListener } from '../custom-array'
import { Visual as VisualEffect } from '../effect/index'
import { publish, subscribe } from '../event'
import { Movie } from './movie'

class MovieEffectsListener extends CustomArrayListener<VisualEffect> {
  private _movie: Movie
  private _checkReady: () => void

  constructor (movie: Movie, checkReady: () => void) {
    super()
    this._movie = movie
    this._checkReady = checkReady
  }

  onAdd (effect: VisualEffect) {
    effect.tryAttach(this._movie)
    // Refresh screen when effect is set, if the movie isn't playing
    // already.
    publish(this._movie, 'movie.change.effect.add', { effect })

    // Update ready state if the effect is not ready
    this._checkReady()

    // Emit a movie.ready event whenever the effect is ready (as long as the
    // movie is too).
    subscribe(effect, 'effect.ready', () => {
      if (effect.parent !== this._movie)
        return

      this._checkReady()
    })
  }

  onRemove (effect: VisualEffect) {
    effect.tryDetach()
    // Refresh screen when effect is removed, if the movie isn't playing
    // already.
    publish(this._movie, 'movie.change.effect.remove', { effect })

    // Update ready state if the effect was not ready
    this._checkReady()
  }
}

export class MovieEffects extends CustomArray<VisualEffect> {
  constructor (target: VisualEffect[], movie: Movie, checkReady: () => void) {
    super(target, new MovieEffectsListener(movie, checkReady))
  }
}
