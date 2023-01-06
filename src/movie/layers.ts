import { CustomArray, CustomArrayListener } from '../custom-array'
import { Base as BaseLayer } from '../layer/index'
import { Movie } from './movie'

class MovieLayersListener extends CustomArrayListener<BaseLayer> {
  private _movie: Movie

  constructor (movie: Movie) {
    super()
    this._movie = movie
  }

  onAdd (layer: BaseLayer) {
    layer.tryAttach(this._movie)
  }

  onRemove (layer: BaseLayer) {
    layer.tryDetach()
  }
}

export class MovieLayers extends CustomArray<BaseLayer> {
  constructor (target: BaseLayer[], movie: Movie) {
    super(target, new MovieLayersListener(movie))
  }
}
