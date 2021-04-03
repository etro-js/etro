import { Dynamic } from '../util'
import { Shader } from './shader'

/**
 * Changes the contrast by multiplying the RGB channels by a constant
 */
class Contrast extends Shader {
  contrast: Dynamic<number>

  /**
   * @param [contrast=1] - the contrast multiplier
   */
  constructor (contrast: Dynamic<number> = 1.0) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform float u_Contrast;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(u_Contrast * (color.rgb - 0.5) + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
      }
    `, {
      contrast: '1f'
    })
    /**
     * The contrast multiplier
     */
    this.contrast = contrast
  }
}

export default Contrast
