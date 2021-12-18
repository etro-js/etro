# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased
### Fixed
- Recording not respecting the `type` option.
- Effects throwing 'empty canvas' errors when the target's width or height is 0.

## [0.8.2] - 2021-07-08
### Fixed
- `GaussianBlur` effect throwing a `TypeError` when applied to a movie or layer (the problem persisted).
- Ignore layers and effects removed with `delete`.

## [0.8.1] - 2021-04-20
### Fixed
- `sourceStartTime` getting ignored on `'movie.seek'`.
- Calling methods like `unshift` on `Movie#layers` and `Movie#effects`.
- `GaussianBlur` effect throwing a `TypeError` when applied to a movie or layer.
- Issues with audio and video layers re-attaching to a movie.

## [0.8.0] - 2021-04-11
### Added
- Type declarations.
- `duration` option for `Movie#record`, to only record a subsection of the movie.
- `'movie.recordended'` event. This does not affect the behavior of `'movie.ended'`.
- Grayscale effect.
- `vd.event.unsubscribe` to remove event listeners.
- Image and video layers' `destX`, `destY`, `destWidth` and `destHeight`.
  - Previously `imageX`, `imageY`, `imageWidth`, `imageHeight`, ...
  - Allows for rotating these layers without cropping out parts.

### Changed
- All constructor arguments are now supplied through an `options` object.
- Now `Movie#record` also accepts its arguments through an `options` object.
- Keyframes are now entered as `new vd.KeyFrame([time1, val1, interp],
  [time2, val2])`
- Rename `clip*` to `source*` for image layers.
  - `clipX` is now `sourceX`, etc.
- Rename `image` to `source` for image layers.
- Rename `source` to `audioNode` and `media` to `source` for audio and video layers.
  - And `mediaStartTime` to `sourceStartTime`
- For image and video layers, `width` now defaults to `destWidth`, which defaults to `sourceWidth`, which defaults to the width of the image or video.
- The `movie.audiodestinationupdate` event is now published on the movie instead of each layer.
- The movie's `audioContext` option is now `actx` (to match the property).

### Deprecated
- `vd.mapPixels` - use `vd.effect.Shader` instead, because it supports
  hardware-acceleration
- `audioContext` option for `Movie` - use `actx` instead.

### Removed
- Video files for examples (can now be downloaded with `npm run assets`).

### Fixed
- Browsers that do not implement `AudioContext` are now supported.
- Movie not rendering with no layers.
- Issues with modifying `Movie#layers` and `Movie#effects`.
- Layers no longer error on 'movie.seek' event.
- Property filters' `this` is now set to the owner of the property.
- Visual layers' `width` and `height` property filters now default to the movie's width and height.
- Visual layers' `border` property not being processed correctly.
- Effects' and layers' `attach()` and `detach()` methods not being called when replaced by another effect or layer.

## [0.7.0] - 2020-12-17
### Added
- Importing with CommonJS syntax.
- MIME type option for `record`.

### Changed
- Movies are no longer hidden and silent when exporting.
- Media layers' audio nodes can now be reconnected to other audio nodes.
- `refresh` can be called when the movie is playing or recording to force render.

### Removed
- Image layers' `imageX`, `imageY`, `imageWidth` and `imageHeight` properties. Every image is now rendered over its entire layer.
- Video layers' `mediaX`, `mediaY`, `mediaWidth` and `mediaHeight` properties. Every video is now rendered over its entire layer.

### Fixed
- Fix recording with only video or only audio.
- Video layers' `clipWidth` and `clipHeight` are no longer treated as invalid options.
- Image layers' `clipWidth` and `clipHeight` are no longer set in the constructor, so if the `clipWidth` option is not supplied and the layer's `width` changes `clipWidth` uses the new `width`.
- Video and image layers' `width` and `height` default to their `clipWidth` and `clipHeight` respectively.
- Elliptical mask effect throwing `TypeError: path.split is not a function`.
- In shader effects, textures whose dimensions are not powers of two accept interpolation filters.
- No longer ignore video layers' `mediaWidth` option.
- Treat layers' `enabled` property as dynamic (allowing for keyframes and functions).
- Make each media layer's duration depend on its playback rate.

### Security
- Update vulnerable dependencies.

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

### Removed
- Volume, speed and muted properties. These will most likely be added as separate audio effects in the future.

### Fixed
- Bug with layer options

## [0.2.0] - 2018-10-14
### Added
- Keyframes
  - Works with any value type in pretty much every built-in component property.
  - Number and objects, including colors and fonts, can interpolate.
  - Custom interpolation option.
- Elliptical mask effect.
- Many small improvements.

## 0.1.0 - 2018-10-06
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

[0.8.2]: https://github.com/clabe45/vidar/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/clabe45/vidar/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/clabe45/vidar/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/clabe45/vidar/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/clabe45/vidar/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/clabe45/vidar/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/clabe45/vidar/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/clabe45/vidar/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/clabe45/vidar/compare/v0.1.0...v0.2.0
