import Shader from './shader'

/**
 * Multiplies each channel by a different factor
 */
class Channels extends Shader {
  factors: {
    r?: number,
    b?: number,
    g?: number
  }

  /**
   * @param {module:util.Color} factors - channel factors, each defaulting to 1
   */
  constructor (factors: Partial<{
    r: number,
    g: number,
    b: number
  }> = {}) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec4 u_Factors;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          gl_FragColor = clamp(u_Factors * color, 0.0, 1.0);
      }
    `, {
      factors: { type: '4fv', defaultFloatComponent: 1 }
    })

    /**
     * Channel factors, each defaulting to 1
     * @type module:util.Color
     */
    this.factors = factors
  }
}

export default Channels
