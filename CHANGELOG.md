# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.12.1] - 2024-02-19
### Fixed
- Importing etro in the client-side code of a NextJS project causing a "module not found" error ([#243](https://github.com/etro-js/etro/issues/243)).
- Keyframes with values that are not numbers no longer result in type mismatches.
- `TypeError: this.data is undefined` when applying a `Transform` effect with a dynamic matrix.

## [0.12.0] - 2024-01-15
### Added
- `stroke` option for `Text` layer ([#239](https://github.com/etro-js/etro/pull/239)).

### Security
- Bump @babel/traverse from 7.18.13 to 7.23.2 ([#244](https://github.com/etro-js/etro/pull/244)).
- Bump browserify-sign from 4.2.1 to 4.2.2 ([#245](https://github.com/etro-js/etro/pull/245)).
- Bump follow-redirects from 1.14.9 to 1.15.4 ([#247](https://github.com/etro-js/etro/pull/247)).
- Bump gitmoji-cli from 8.4.0 to 9.0.0.

## [0.11.0] - 2023-08-05
### Added
- `duration` option for `Movie#play` ([#208](https://github.com/etro-js/etro/pull/208)).

### Fixed
- Audio and video layers going silent after the first time recording the movie ([#106](https://github.com/etro-js/etro/issues/106)).
- `Failed to set the 'currentTime' property on 'HTMLMediaElement'` error when seeking audio and video layers ([#227](https://github.com/etro-js/etro/pull/227)).
- Seeking while playing not updating the movie's current time ([#233](https://github.com/etro-js/etro/issues/233)).

### Security
- Bump word-wrap from 1.2.3 to 1.2.5 ([#222](https://github.com/etro-js/etro/pull/222)).

## [0.10.1] - 2023-07-16
### Security
- Bump engine.io and socket.io.
- Bump socket.io-parser from 4.2.1 to 4.2.3.

## [0.10.0] - 2023-04-18
### Added
- `Movie#stream()` to stream the movie to a `MediaStream`.
- New `onStart` option for `Movie#play()` and `Movie#record()`.
- Image, audio and video layers' `source` properties now accept urls ([#153](https://github.com/etro-js/etro/pull/153)).
- Movies, layers and effects have a new `ready` getter, indicating if they are ready to play.
- Layers and effects now have an async `whenReady` method.
- `Movie#seek()` method.
- Layers have new `seek()` and `progress()` methods.
- `once` option for `subscribe`.

### Changed
- The (deprecated) `'movie.pause'` event is now published every time playback stops, regardless of the reason.
- `source` properties of `Image`, `Audio` and `Video` have been retyped to `HTMLImageElement`, `HTMLAudioElement` and `HTMLVideoElement` respectively.

### Deprecated
- `etro.applyOptions()` and `EtroObject#getDefaultOptions()` are deprecated. Instead, set each option in the constructor ([#131](https://github.com/etro-js/etro/issues/131)).
- The `Movie#currentTime` setter is deprecated. Use `Movie#seek()` instead.
- `Movie#setCurrentTime()` is deprecated. Instead, call `seek()` and `refresh()` separately.
- The `'movie.seek'` event is deprecated. Override the `seek()` method on layers instead.
- The `'movie.timeupdate'` event is deprecated. Override the `progress()` method on layers instead.
- The `'movie.loadeddata'` event is deprecated.
- The `'movie.play'` event is deprecated. Provide the `onStart` option to `play()`, `stream()` or `record()` instead.
- The `'movie.pause'` event is deprecated. Wait for `play()`, `stream()` or `record()` to resolve instead.
- The `'movie.record'` event is deprecated. Provide the `onStart` option to `record()` instead.
- The `'movie.recordended'` event is deprecated. Wait for `record()` to resolve instead.
- The `'movie.ended'` event is deprecated.

### Removed
- `Movie#autoRefresh` (see [#130](https://github.com/etro-js/etro/issues/130)).
- `change` events (see [#130](https://github.com/etro-js/etro/issues/130)).
- `watchPublic()` and `publicExcludes` (see [#130](https://github.com/etro-js/etro/issues/130)).

### Fixed
- `Movie#currentTime` is now reset to 0 when the movie ends.
- `Movie#play()` and `Movie#record()` now wait until all resources are loaded before starting.
- `Movie#pause()` no longer stops inactive layers ([#203](https://github.com/etro-js/etro/issues/203)).
- Array methods like `unshift` for `etro.layer.Visual#effects` and `etro.effect.Stack#effects` work properly.
- `AudioSource#playbackRate` is now optional.
- `duration` option for `Audio` and `Video` layers is now optional.
- `Video` constructor now accepts missing options.

## [0.9.1] - 2022-09-18
### Fixed
- Update color types from `string` to `Color` ([#135](https://github.com/etro-js/etro/pull/135)).
- `Image` and `Video` classes now include missing properties.
- `Movie#currentTime` no longer exceeds the stop time.

## [0.9.0] - 2022-07-17
### Changed
- Methods in the `Base` effect now accept `Base` layers instead of `Visual` layers.

### Deprecated
- `autoRefresh` option ([#130](https://github.com/etro-js/etro/issues/130)).
- `publicExcludes` ([#130](https://github.com/etro-js/etro/issues/130)).
- All `change` events ([#130](https://github.com/etro-js/etro/issues/130)).

### Fixed
- Layers no longer trigger infinite loops when their active states change ([#127](https://github.com/etro-js/etro/issues/127)).
- Add missing `VisualSource` options to `Image` layer ([#128](https://github.com/etro-js/etro/pull/128)).
- Layers are now stopped when recording ends.
- `stop()` is no longer called on inactive layers.
- Movies no longer publish `'movie.ended'` when done recording.
- `Audio` and `Video` layers not detaching properly.
- When done playing or recording, movies only reset their time if they're in repeat mode.
- The `timeupdate` event is no longer fired when `currentTime` remains the same (due to `performance.now()` rounding).

## [0.8.5] - 2022-03-06
### Deprecated
- `vd.effect.Base` - All visual effects now inherit from `vd.effect.Visual` instead.

### Fixed
- Movie constructor throwing `Can't find variable: AudioContext` on WebKit browsers.

## [0.8.4] - 2022-02-23
### Fixed
- **Major memory leak.**
- `Movie#play()` not resolving.
- `Movie#paused` set to false after done playing or recording.
- Movies' `currentTime` being off by a fraction of a second a few frames after playing.
- Movies' `currentTime` setter not respecting `autoRefresh`.

## [0.8.3] - 2022-01-18
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
- `etro.event.unsubscribe` to remove event listeners.
- Image and video layers' `destX`, `destY`, `destWidth` and `destHeight`.
  - Previously `imageX`, `imageY`, `imageWidth`, `imageHeight`, ...
  - Allows for rotating these layers without cropping out parts.

### Changed
- All constructor arguments are now supplied through an `options` object.
- Now `Movie#record` also accepts its arguments through an `options` object.
- Keyframes are now entered as `new etro.KeyFrame([time1, val1, interp],
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
- `etro.mapPixels` - use `etro.effect.Shader` instead, because it supports
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
- Add [API documentation](https://etrojs.dev/).
- Support enabling and disabling layers and effects.
- Implement more movie events (*movie.play*, *movie.record*, *movie.pause*, *movie.change.duration*).
- Implement [property filters](https://github.com/etro-js/etro/wiki/Property-Filters).
- Implement property caching.
- Media layer supports media whose duration changes.
- Add unimplemented `etro.Font` properties.
- Add example that uses a live stream (the webcam).

### Changed
- Add layer `start` and `stop` methods.
- Add layer and effect `attach` and `detach` methods.
- Make some properties public (`_getDefaultOptions`, `_publicExcludes`, `layer.Base#_render`, `event._publish`, `layer.Base#_render`, `event._publish`, `layer.Visual#_doRender`).
- Change `etro.val(property, element, time)` &rarr; `etro.val(element, path, time)`.
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
- Recursive property changes now emit events with `etro.watchPublic`.
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
- Update IIFE global export from `mv` to `etro`.
- Fix recording audio.
- Fix recording movies without audio in Chrome.
- Fix effects for movies.

## [0.4.0] - 2019-08-18
### Added
- WebGL fragment shader effects, with which you can re-render a layer or movie with a GLSL fragment shader.
- New `initialRefresh` movie option that can prevent rendering on init.

### Changed
- Most visual effects now use GLSL.
- New `element` argument passed to function properties to see which Etro object the property belongs to.

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

[0.12.1]: https://github.com/etro-js/etro/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/etro-js/etro/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/etro-js/etro/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/etro-js/etro/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/etro-js/etro/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/etro-js/etro/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/etro-js/etro/compare/v0.8.5...v0.9.0
[0.8.5]: https://github.com/etro-js/etro/compare/v0.8.4...v0.8.5
[0.8.4]: https://github.com/etro-js/etro/compare/v0.8.3...v0.8.4
[0.8.3]: https://github.com/etro-js/etro/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/etro-js/etro/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/etro-js/etro/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/etro-js/etro/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/etro-js/etro/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/etro-js/etro/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/etro-js/etro/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/etro-js/etro/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/etro-js/etro/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/etro-js/etro/compare/v0.1.0...v0.2.0
