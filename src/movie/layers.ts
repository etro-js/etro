import { CustomArray, CustomArrayListener } from '../custom-array'
import { Base as BaseLayer } from '../layer/index'
import { publish } from '../event'
import { Movie } from './movie'

class MovieLayersListener extends CustomArrayListener<BaseLayer> {
  private _movie: Movie

  constructor (movie: Movie) {
    super()
    this._movie = movie
  }

  onAdd (layer: BaseLayer) {
    layer.tryAttach(this._movie)

    if (
      this._movie.currentTime >= layer.startTime &&
      this._movie.currentTime < layer.startTime + layer.duration
    )
      publish(this._movie, 'movie.change.layer.add', { layer })

    const oldDuration = Math.max(this._movie.duration, layer.startTime + layer.duration)
    publish(this._movie, 'movie.change.duration', { oldDuration })
  }

  onRemove (layer: BaseLayer) {
    layer.tryDetach()

    if (
      this._movie.currentTime >= layer.startTime &&
      this._movie.currentTime < layer.startTime + layer.duration
    )
      publish(this._movie, 'movie.change.layer.remove', { layer })

    const oldDuration = Math.max(this._movie.duration, layer.startTime + layer.duration)
    publish(this._movie, 'movie.change.duration', { oldDuration })
  }
}

export class MovieLayers extends CustomArray<BaseLayer> {
  constructor (target: BaseLayer[], movie: Movie) {
    super(target, new MovieLayersListener(movie))
  }
}
