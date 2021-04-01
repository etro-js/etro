/**
 * @module effect
 */

// TODO: Investigate why an effect might run once in the beginning even if its layer isn't at the beginning
// TODO: Add audio effect support
// TODO: Move shader source to external files
// TODO: implement directional blur
// TODO: implement radial blur
// TODO: implement zoom blur

import Base from './base'
import Brightness from './brightness'
import Channels from './channels'
import ChromaKey from './chroma-key'
import Contrast from './contrast'
import EllipticalMask from './elliptical-mask'
import { GaussianBlur, GaussianBlurHorizontal, GaussianBlurVertical } from './gaussian-blur'
import Grayscale from './grayscale'
import Pixelate from './pixelate'
import { Shader, TextureOptions, UniformOptions } from './shader'
import Stack from './stack'
import Transform from './transform'

export {
  Base,
  Brightness,
  Channels,
  ChromaKey,
  Contrast,
  EllipticalMask,
  GaussianBlur,
  GaussianBlurHorizontal,
  GaussianBlurVertical,
  Grayscale,
  Pixelate,
  Shader,
  TextureOptions,
  UniformOptions,
  Stack,
  Transform
}
