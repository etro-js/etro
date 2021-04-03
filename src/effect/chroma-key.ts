import { Property, Color } from '../util'
import { Shader } from './shader'

/**
 * Reduces alpha for pixels which are close to a specified target color
 */
class ChromaKey extends Shader {
  target: Property<Color>
  threshold: Property<number>
  interpolate: Property<boolean>

  /**
   * @param [target={r: 0, g: 0, b: 0, a: 1}] - the color to remove
   * @param [threshold=0] - how much error to allow
   * @param [interpolate=false] - <code>true</code> to interpolate
   * the alpha channel, or <code>false</code> value for no smoothing (i.e. an
   * alpha of either 0 or 255)
   */
  // TODO: Use <code>smoothingSharpness</code>
  constructor (target: Property<Color> = { r: 0, g: 0, b: 0, a: 1 }, threshold: Property<number> = 0, interpolate: Property<boolean> = false/*, smoothingSharpness=0 */) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec3 u_Target;
      uniform float u_Threshold;
      uniform bool u_Interpolate;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          float alpha = color.a;
          vec3 dist = abs(color.rgb - u_Target / 255.0);
          if (!u_Interpolate) {
              // Standard way that most video editors probably use (all-or-nothing method)
              float thresh = u_Threshold / 255.0;
              bool transparent = dist.r <= thresh && dist.g <= thresh && dist.b <= thresh;
              if (transparent)
                  alpha = 0.0;
          } else {
              /*
                  better way IMHO:
                  Take the average of the absolute differences between the pixel and the target for each channel
              */
              float transparency = (dist.r + dist.g + dist.b) / 3.0;
              // TODO: custom or variety of interpolation methods
              alpha = transparency;
          }
          gl_FragColor = vec4(color.rgb, alpha);
      }
    `, {
      target: '3fv',
      threshold: '1f',
      interpolate: '1i'
    })
    /**
     * The color to remove
     */
    this.target = target
    /**
     * How much error to allow
     */
    this.threshold = threshold
    /**
     * <code>true<code> to interpolate the alpha channel, or <code>false<code>
     * for no smoothing (i.e. 255 or 0 alpha)
     */
    this.interpolate = interpolate
    // this.smoothingSharpness = smoothingSharpness;
  }
}

export default ChromaKey
