import { Property } from '../util'
import { Shader } from './shader'

/**
 * Changes the brightness
 */
class Brightness extends Shader {
  brightness: Property<number>

  /**
   * @param [brightness=0] - the value to add to each pixel's color
   * channels (between -255 and 255)
   */
  constructor (brightness: Property<number> = 0.0) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform float u_Brightness;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(color.rgb + u_Brightness / 255.0, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
      }
    `, {
      brightness: '1f'
    })
    /**
     * The value to add to each pixel's color channels (between -255 and 255)
     */
    this.brightness = brightness
  }
}

export default Brightness
