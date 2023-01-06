import { CustomArray, CustomArrayListener } from '../custom-array'
import { Visual as VisualEffect } from '../effect/index'
import { Movie } from './movie'

class MovieEffectsListener extends CustomArrayListener<VisualEffect> {
  private _movie: Movie

  constructor (movie: Movie) {
    super()
    this._movie = movie
  }

  onAdd (effect: VisualEffect) {
    effect.tryAttach(this._movie)
  }

  onRemove (effect: VisualEffect) {
    effect.tryDetach()
  }
}

export class MovieEffects extends CustomArray<VisualEffect> {
  constructor (target: VisualEffect[], movie: Movie) {
    super(target, new MovieEffectsListener(movie))
  }
}
