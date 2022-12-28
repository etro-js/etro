import { CustomArray, CustomArrayListener } from '../custom-array'
import { Base as BaseLayer } from '../layer/index'
import { subscribe } from '../event'
import { Movie } from './movie'

class MovieLayersListener extends CustomArrayListener<BaseLayer> {
  private _movie: Movie
  private _checkReady: () => void

  constructor (movie: Movie, checkReady: () => void) {
    super()
    this._movie = movie
    this._checkReady = checkReady
  }

  onAdd (layer: BaseLayer) {
    layer.tryAttach(this._movie)

    // Update internal ready state if the layer is not ready
    this._checkReady()

    // Update internal ready state when the layer is ready
    subscribe(layer, 'layer.ready', () => {
      if (layer.parent !== this._movie)
        return

      this._checkReady()
    })
  }

  onRemove (layer: BaseLayer) {
    layer.tryDetach()

    // Update internal ready state if the layer was not ready
    this._checkReady()
  }
}

export class MovieLayers extends CustomArray<BaseLayer> {
  constructor (target: BaseLayer[], movie: Movie, checkReady: () => void) {
    super(target, new MovieLayersListener(movie, checkReady))
  }
}
