# Changelog

## [0.3.0] - 2018-12-11
### Added
- Function properties.
  - Dynamic properties that call a function every time they're queried.

### Changed
- Null or undefined layer dimensions now default to the width or height of the movie.
- Movie "end" event is now called "ended".

### Fixed
- Bug with layer options

### Removed
- Volume, speed and muted properties. These will most likely be added as separate audio effects in the future.

## [0.2.0] - 2018-10-14
### Added
- Keyframes.
  - Works with any value type in pretty much every built-in component property.
  - Number and objects, including colors and fonts, can interpolate.
  - Custom interpolation option.
- Elliptical mask effect.
- Many small improvements.

## [0.1.0] - 2018-10-06
### Added
- Movies.
  - Timeline.
  - Playing.
  - Exporting.
- Layers.
  - Base layers.
  - Text layers.
  - Image layers.
  - Audio layers.
  - Video layers.
- Effects.
  - Transparency.
  - Brightness.
  - Contrast.
  - Channels.
  - Gaussian blur.
  - Transform.
