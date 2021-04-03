import { Property, val, applyOptions } from '../util'
import { Base, BaseOptions } from './base'
import { Visual, VisualOptions } from './visual'

type Constructor<T> = new (...args: unknown[]) => T

interface VisualSource extends Base {
  readonly source: HTMLImageElement | HTMLVideoElement
}

interface VisualSourceOptions extends VisualOptions {
  source: HTMLImageElement | HTMLVideoElement
  sourceX?: Property<number>
  sourceY?: Property<number>
  sourceWidth?: Property<number>
  sourceHeight?: Property<number>
  destX?: Property<number>
  destY?: Property<number>
  destWidth?: Property<number>
  destHeight?: Property<number>
}

/**
 * Image or video
 * @mixin VisualSourceMixin
 */
function VisualSourceMixin<OptionsSuperclass extends BaseOptions> (superclass: Constructor<Visual>): Constructor<VisualSource> {
  type MixedVisualSourceOptions = OptionsSuperclass & VisualSourceOptions

  class MixedVisualSource extends superclass {
    /**
     * The raw html media element
     */
    readonly source: HTMLImageElement | HTMLVideoElement

    sourceX: Property<number>
    sourceY: Property<number>
    sourceWidth: Property<number>
    sourceHeight: Property<number>
    destX: Property<number>
    destY: Property<number>
    destWidth: Property<number>
    destHeight: Property<number>

    /**
     * @param startTime
     * @param endTime
     * @param media
     * @param [options]
     * @param [options.sourceX=0] - image source x
     * @param [options.sourceY=0] - image source y
     * @param [options.sourceWidth=undefined] - image source width, or
     * <code>undefined</code> to fill the entire layer
     * @param [options.sourceHeight=undefined] - image source height,
     * or <code>undefined</code> to fill the entire layer
     * @param [options.destX=0] - offset of the image relative to the
     * layer
     * @param [options.destY=0] - offset of the image relative to the
     * layer
     * @param [options.destWidth=undefined] - width to render the
     * image at
     * @param [options.destHeight=undefined] - height to render the
     * image at
     */
    constructor (options: MixedVisualSourceOptions) {
      super(options)
      applyOptions(options, this)
    }

    doRender () {
      // Clear/fill background
      super.doRender()

      /*
       * Source dimensions crop the image. Dest dimensions set the size that
       * the image will be rendered at *on the layer*. Note that this is
       * different than the layer dimensions (`this.width` and `this.height`).
       * The main reason this distinction exists is so that an image layer can
       * be rotated without being cropped (see iss #46).
       */
      this.cctx.drawImage(
        this.source,
        val(this, 'sourceX', this.currentTime), val(this, 'sourceY', this.currentTime),
        val(this, 'sourceWidth', this.currentTime), val(this, 'sourceHeight', this.currentTime),
        // `destX` and `destY` are relative to the layer
        val(this, 'destX', this.currentTime), val(this, 'destY', this.currentTime),
        val(this, 'destWidth', this.currentTime), val(this, 'destHeight', this.currentTime)
      )
    }

    getDefaultOptions (): MixedVisualSourceOptions {
      return {
        ...superclass.prototype.getDefaultOptions(),
        source: undefined, // required
        /**
         * @name module:layer.VisualSource#sourceX
         */
        sourceX: 0,
        /**
         * @name module:layer.VisualSource#sourceY
         */
        sourceY: 0,
        /**
         * @name module:layer.VisualSource#sourceWidth
         * @desc How much to render of the source, or <code>undefined</code> to
         * render the entire width
         */
        sourceWidth: undefined,
        /**
         * @name module:layer.VisualSource#sourceHeight
         * @desc How much to render of the source, or <code>undefined</code> to
         * render the entire height
         */
        sourceHeight: undefined,
        /**
         * @name module:layer.VisualSource#destX
         */
        destX: 0,
        /**
         * @name module:layer.VisualSource#destY
         */
        destY: 0,
        /**
         * @name module:layer.VisualSource#destWidth
         * @desc Width to render the source at, or <code>undefined</code> to
         * use the layer's width
         */
        destWidth: undefined,
        /**
         * @name module:layer.VisualSource#destHeight
         * @desc Height to render the source at, or <code>undefined</code> to
         * use the layer's height
         */
        destHeight: undefined
      }
    }
  }
  MixedVisualSource.prototype.propertyFilters = {
    ...Visual.prototype.propertyFilters,

    /*
     * If no layer width was provided, fall back to the dest width.
     * If no dest width was provided, fall back to the source width.
     * If no source width was provided, fall back to `source.width`.
     */
    sourceWidth: function (sourceWidth) {
      // != instead of !== to account for `null`
      const width = this.source instanceof HTMLImageElement
        ? this.source.width
        : this.source.videoWidth
      return sourceWidth != undefined ? sourceWidth : width // eslint-disable-line eqeqeq
    },
    sourceHeight: function (sourceHeight) {
      const height = this.source instanceof HTMLImageElement
        ? this.source.height
        : this.source.videoHeight
      return sourceHeight != undefined ? sourceHeight : height // eslint-disable-line eqeqeq
    },
    destWidth: function (destWidth) {
      // I believe reltime is redundant, as element#currentTime can be used
      // instead. (TODO: fact check)
      /* eslint-disable eqeqeq */
      return destWidth != undefined
        ? destWidth : val(this, 'sourceWidth', this.currentTime)
    },
    destHeight: function (destHeight) {
      /* eslint-disable eqeqeq */
      return destHeight != undefined
        ? destHeight : val(this, 'sourceHeight', this.currentTime)
    },
    width: function (width) {
      /* eslint-disable eqeqeq */
      return width != undefined
        ? width : val(this, 'destWidth', this.currentTime)
    },
    height: function (height) {
      /* eslint-disable eqeqeq */
      return height != undefined
        ? height : val(this, 'destHeight', this.currentTime)
    }
  }

  return MixedVisualSource
}

export { VisualSource, VisualSourceOptions, VisualSourceMixin }
