import { Dynamic } from '../util'
import { Shader } from './shader'

export interface ContrastOptions {
  contrast?: Dynamic<number>
}

/**
 * Changes the contrast by multiplying the RGB channels by a constant
 */
export class Contrast extends Shader {
  contrast: Dynamic<number>

  /**
   * @param [contrast=1] - the contrast multiplier
   */
  constructor (options: ContrastOptions = {}) {
    super({
      fragmentSource: `
        precision mediump float;

        uniform sampler2D u_Source;
        uniform float u_Contrast;

        varying highp vec2 v_TextureCoord;

        void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(u_Contrast * (color.rgb - 0.5) + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
        }
      `,
      uniforms: {
        contrast: '1f'
      }
    })
    /**
     * The contrast multiplier
     */
    this.contrast = options.contrast || 1
  }
}
