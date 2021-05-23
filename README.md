# Etro

[![](https://img.shields.io/npm/v/etro)](https://www.npmjs.com/package/etro)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fetro-js%2Fetro%2Fbadge&style=flat)](https://actions-badge.atrox.dev/etro-js/etro/goto)

> Etro was previously known as Etro, but it had to be renamed to avoid
> confusion with an existing software product.

Etro is a typescript framework for programmatically editing videos. Similar to
GUI-based video-editing software, it lets you composite layers and add effects.
Etro comes shipped with text, video, audio and image layers, along with a bunch
of GLSL effects. You can also define your own layers and effects with javascript
and GLSL.

## Features

- Composite video and audio layers
- Use built-in hardware accelerated effects
- Write your own effects in JavaScript and GLSL
- Manipulate audio with the web audio API *(audio effects coming soon)*
- Define layer and effect parameters as keyframes or custom functions
- Render to a blob in realtime *(offline rendering coming soon)*

## Installation

```
npm i etro
```

## Basic Usage

Let's look at an example:
```js
import etro from 'etro'

var movie = new etro.Movie({ canvas: outputCanvas })
var layer = new etro.layer.Video({ startTime: 0, source: videoElement })  // the layer starts at 0s
movie.addLayer(layer)

movie.record({ frameRate: 24 })  // or just `play` if you don't need to save it
    .then(blob => ...)
```

The blob could then be downloaded as a video file or displayed using a `<video>`
element.

## Effects

Effects can transform the output of a layer or movie:
```js
var layer = new etro.layer.Video({ startTime: 0, source: videoElement })
    .addEffect(new etro.effect.Brightness({ brightness: +100) }))
```

## Dynamic Properties

Most properties also support keyframes and functions:
```js
// Keyframes
layer.effects[0].brightness = new etro.KeyFrame(
  [0, -75],  // brightness == -75 at 0 seconds
  [2, +75]  // +75 at 2 seconds
)

// Function
layer.effects[0].brightness = () => 100 * Math.random() - 50
```

## Using in Node

To use Etro in Node, see the [wrapper](https://github.com/etro-js/etro-node):

## Running the Examples

First, download the assets for the examples:

```
npm run assets
```

Then, start the development server (only used for convience while developing;
you don't need a server to use Etro):

```
npm start
```

Now you can open any example (such as
http://127.0.0.1:8080/examples/introduction/hello-world1.html).

## Further Reading

- [Documentation](https://etrojs.dev/docs)

## Contributing

See the [contributing guide](CONTRIBUTING.md)

## License

Distributed under GNU General Public License v3. See `LICENSE` for more
information.
