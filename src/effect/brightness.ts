import { Dynamic } from '../util'
import { Shader } from './shader'

export interface BrightnessOptions {
  brightness?: Dynamic<number>
}

/**
 * Changes the brightness
 */
export class Brightness extends Shader {
  brightness: Dynamic<number>

  /**
   * @param [brightness=0] - the value to add to each pixel's color
   * channels (between -255 and 255)
   */
  constructor (options: BrightnessOptions = {}) {
    super({
      fragmentSource: `
        precision mediump float;

        uniform sampler2D u_Source;
        uniform float u_Brightness;

        varying highp vec2 v_TextureCoord;

        void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(color.rgb + u_Brightness / 255.0, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
        }
      `,
      uniforms: {
        brightness: '1f'
      }
    })
    /**
     * The value to add to each pixel's color channels (between -255 and 255)
     */
    this.brightness = options.brightness || 0
  }
}
