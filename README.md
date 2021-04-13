# Vidar

[![](https://img.shields.io/npm/v/vidar)](https://www.npmjs.com/package/vidar)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fclabe45%2Fvidar%2Fbadge&style=flat)](https://actions-badge.atrox.dev/clabe45/vidar/goto)

> [Version 0.8 is out](https://clabe45.github.io/vidar/blog/introducing-v0-8-0)!
> Check out [this guide](https://clabe45.github.io/vidar/docs/migrating-v0-8-0)
> for migrating.

Vidar is a typescript framework for programmatically editing videos. Similar
to GUI-based video-editing software, it lets you layer media and other
content on a timeline. Audio, image, video and other tracks are supported,
along with powerful video effectts for existing tracks. Being very flexible
and extendable, you can choose to only use the core components or define your
own.

## Features

- Composite video and audio layers
- Use built-in hardware accelerated effects
- Write your own effects in JavaScript and GLSL
- Manipulate audio with the web audio API
- Define layer and effect properties as keyframes and functions
- Export to a blob or file

## Installation

```
npm i vidar
```

## Usage

You can use CommonJS syntax:
```js
import vd from 'vidar'
```

Or include it as a global vd:
```js
<script src="node_modules/vidar/dist/vidar-iife.js"></script>
```

Let's look at an example:
```js
var movie = new vd.Movie({ canvas: outputCanvas })
var layer = new vd.layer.Video({ startTime: 0, source: videoElement })  // the layer starts at 0s
movie.addLayer(layer)
movie.record({ frameRate: 24 })  // or just `play` if you don't need to save it
    .then(blob => ...)
```

This renders `videoElement` to a blob at 24 fps. This blob can then be
downloaded as a video file.

Effects can transform the output of a layer or movie:
```js
var layer = new vd.layer.Video({ startTime: 0, source: videoElement })
    .addEffect(new vd.effect.Brightness({ brightness: +100) }))
```

## Using in Node

To use Vidar in Node, use the [wrapper](https://github.com/clabe45/vidar-node):
```
npm i vidar-node
```

```js
var vidarNode = require('vidar-node')

vidarNode(() => {
  // You can access inputs as html elements and pass them to Vidar as usual.
  var image = document.getElementById('input1') // <img> element

  // Use vidar normally ...

  movie
    .exportRaw()
    .then(window.done)
// Tell Vidar Node what inputs to load with { id: path }
}, { input1: 'image.png' }, 'output.mp4')
```

`vidarNode()` takes an optional Puppeteer page argument, so you can run
multiple Vidar scripts on the same movie (useful for servers). See [the
docs](https://github.com/clabe45/vidar-node#documentation).

## Running the Examples

First, download the assets for the examples:

```
npm run assets
```

Then, start the development server (only used for convience while developing;
you don't need a server to use Vidar):

```
npm start
```

Now you can open any example (such as
http://127.0.0.1:8080/examples/introduction/hello-world1.html).

## TypeScript

Vidar is written in TypeScript, so it should work out of the box with TypeScript
projects. However, it is also compatible with projects that do not use
TypeScript.

## Further Reading

- [Documentation](https://clabe45.github.io/vidar/docs)

## Contributing

See the [contributing guide](CONTRIBUTING.md)

## License

Distributed under GNU General Public License v3. See `LICENSE` for more
information.
