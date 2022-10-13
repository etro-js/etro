import { CustomArray, CustomArrayListener } from '../custom-array'
import { Visual as VisualEffect } from '../effect/index'
import { publish } from '../event'
import { Movie } from './movie'

class MovieEffectsListener extends CustomArrayListener<VisualEffect> {
  private _movie: Movie

  constructor (movie: Movie) {
    super()
    this._movie = movie
  }

  onAdd (effect: VisualEffect) {
    effect.tryAttach(this._movie)
    // Refresh screen when effect is set, if the movie isn't playing
    // already.
    publish(this._movie, 'movie.change.effect.add', { effect })
  }

  onRemove (effect: VisualEffect) {
    effect.tryDetach()
    // Refresh screen when effect is removed, if the movie isn't playing
    // already.
    publish(this._movie, 'movie.change.effect.remove', { effect })
  }
}

export class MovieEffects extends CustomArray<VisualEffect> {
  constructor (target: VisualEffect[], movie: Movie) {
    super(target, new MovieEffectsListener(movie))
  }
}
