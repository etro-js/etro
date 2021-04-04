import { Dynamic } from '../util'
import { Shader } from './shader'

export interface ChannelsOptions {
  factors?: Dynamic<{
    r?: number,
    g?: number,
    b?: number
  }>
}

/**
 * Multiplies each channel by a different factor
 */
export class Channels extends Shader {
  factors: Dynamic<{
    r?: number,
    b?: number,
    g?: number
  }>

  /**
   * @param factors - channel factors, each defaulting to 1
   */
  constructor (options: ChannelsOptions = {}) {
    super({
      fragmentSource: `
        precision mediump float;

        uniform sampler2D u_Source;
        uniform vec4 u_Factors;

        varying highp vec2 v_TextureCoord;

        void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          gl_FragColor = clamp(u_Factors * color, 0.0, 1.0);
        }
      `,
      uniforms: {
        factors: { type: '4fv', defaultFloatComponent: 1 }
      }
    })

    /**
     * Channel factors, each defaulting to 1
     */
    this.factors = options.factors || {}
  }
}
