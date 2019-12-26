# Changelog

## [0.6.0] - 2019-12-26
### Added
- Add [API documentation](https://clabe45.github.io/vidar/).
- Support enabling and disabling layers and effects.
- Implement more movie events (*movie.play*, *movie.record*, *movie.pause*, *movie.change.duration*).
- Implement [property filters](https://github.com/clabe45/vidar/wiki/Property-Filters).
- Implement property caching.
- Media layer supports media whose duration changes.
- Add unimplemented `vd.Font` properties.
- Add example that uses a live stream (the webcam).

### Changed
- Add layer `start` and `stop` methods.
- Add layer and effect `attach` and `detach` methods.
- Make some properties public (`_getDefaultOptions`, `_publicExcludes`, `layer.Base#_render`, `event._publish`, `layer.Base#_render`, `event._publish`, `layer.Visual#_doRender`).
- Change `vd.val(property, element, time)` &rarr; `vd.val(element, path, time)`.
- Make event properties specific to event type
  - *layer.attach|detach*: `source` &rarr; `effectTarget`
  - *effect.attach|detach*: `source` &rarr; `effectTarget`
  - *movie.change.layer.add|remove*: `source` &rarr; `layer`
  - *movie.change.effect.add|remove*: `source` &rarr; `effect`

### Fixed
- Media current time is no longer reset every time it's played.
- Fix Gaussian blur effect throwing error.
- Custom textures work for shader effects.
- Fix undefined behavior with shader effects that output transparency.
- Use `sourceTextureOptions` in shader effects.
- Recursive property changes now emit events with `vd.watchPublic`.
- Public properties set to keyframes are treated as keyframes.
- Update event names in examples.

## [0.5.0] - 2019-10-09
### Added
- Movies and layers auto-refresh.

### Changed
- Rewrite event system.
  - Events propogate up.
  - Event names are organized into groups.

### Fixed
- Update IIFE global export from `mv` to `vd`.
- Fix recording audio.
- Fix recording movies without audio in Chrome.
- Fix effects for movies.

## [0.4.0] - 2019-08-18
### Added
- WebGL fragment shader effects, with which you can re-render a layer or movie with a GLSL fragment shader.
- New `initialRefresh` movie option that can prevent rendering on init.

### Changed
- Most visual effects now use GLSL.
- New `element` argument passed to function properties to see which Vidar object the property belongs to.

## [0.3.0] - 2018-12-11
### Added
- Function properties.
  - Dynamic properties that call a function every time they're queried.

### Changed
- Null or undefined layer dimensions default to the width or height of the movie.
- Movie "end" event is now called "ended".

### Fixed
- Bug with layer options

### Removed
- Volume, speed and muted properties. These will most likely be added as separate audio effects in the future.

## [0.2.0] - 2018-10-14
### Added
- Keyframes
  - Works with any value type in pretty much every built-in component property.
  - Number and objects, including colors and fonts, can interpolate.
  - Custom interpolation option.
- Elliptical mask effect.
- Many small improvements.

## [0.1.0] - 2018-10-06
### Added
- Movies
  - Timeline
  - Playing
  - Exporting
- Layers
  - Base layers
  - Text layers
  - Image layers
  - Audio layers
  - Video layers
- Effects
  - Transparency
  - Brightness
  - Contrast
  - Channels
  - Gaussian blur
  - Transform

[0.6.0]: https://github.com/clabe45/vidar/compare/v0.6...HEAD
[0.5.0]: https://github.com/clabe45/vidar/compare/v0.5...v0.6
[0.4.0]: https://github.com/clabe45/vidar/compare/v0.4...v0.5
[0.3.0]: https://github.com/clabe45/vidar/compare/v0.3...v0.4
[0.3.0]: https://github.com/clabe45/vidar/compare/v0.2...v0.3
[0.2.0]: https://github.com/clabe45/vidar/compare/v0.1...v0.2
[0.1.0]: https://github.com/clabe45/vidar/releases/tag/v0.1
