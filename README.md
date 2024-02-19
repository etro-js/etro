# Etro

[![](https://img.shields.io/npm/v/etro)](https://www.npmjs.com/package/etro)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fetro-js%2Fetro%2Fbadge&style=flat)](https://actions-badge.atrox.dev/etro-js/etro/goto)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=flat&logo=discord&logoColor=white)](https://discord.gg/myrBsQ8Cht)

Etro is a typescript framework for programmatically editing videos. It lets you
composite layers and add filters (effects). Etro comes shipped with text, video,
audio and image layers, along with a bunch of GLSL effects. You can also define
your own layers and effects with javascript and GLSL.

## Features

- Composite video and audio layers
- Use built-in hardware accelerated effects
- Write your own effects in JavaScript and GLSL
- Manipulate audio with the web audio API *(audio effects coming soon)*
- Define layer and effect parameters as keyframes or custom functions
- Render to a blob in realtime *(offline rendering coming soon)*

## Installation

### Prerequisite:

-**Will need to have Node installed before using commands below. To check if node installed run node -v in terminal/command prompt. 
If version number appears then node installed. If an error message appears then it is not installed and can use links below for installation steps.**

Video: [Node.js Installation Tutorial (Windows)](https://www.youtube.com/watch?v=06X51c6WHsQ)

Video: [Node.js Installation Tutorial (Mac)](https://www.youtube.com/watch?v=TQks1p7xjdI)

Website: [Node.js Website](https://nodejs.org/en)

**How to start program:**
```
npm i etro
```

**Start the development server (only used for convenience while developing; you
don't need a server to use Etro):**

```
npm i
npm run build
npm start
```

Now you can open any example (such as
http://127.0.0.1:8080/examples/introduction/hello-world1.html).
To help debug a production build of VHA you can use [Debugtron](https://github.com/bytedance/debugtron)

-**Would add demo video showing what progam should look like after following steps above**

Main dependencies in use:

| Library          | Version | Date      | Comment |
| ---------------- | ------- | --------- | ------- |
|Node              |         |           | Need to add information on libraries/frameworks used(ex Angular,Node,React)|
|React             |         |           |         |


- **Node**: Latest version (or state preferred version for framework) 


## Using Etro in Node

To use Etro in Node, see the [wrapper](https://github.com/etro-js/etro-node):


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

The [blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) could then be downloaded as a video file or displayed using a `<video>`
element.

-**Would add demo video showing what progam should look like after following steps above**

See the [documentation](https://etrojs.dev/docs/category/layers) for a list of
all built-in layers.


## Effects

Effects can transform the output of a layer or movie:
```js
var layer = new etro.layer.Video({ startTime: 0, source: videoElement })
    .addEffect(new etro.effect.Brightness({ brightness: +100) }))
```

See the [documentation](https://etrojs.dev/docs/category/effects) for a list of
all built-in effects.

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

See the [documentation](https://etrojs.dev/docs/reference/dynamic-properties)
for more info.

## Further Reading

- [Documentation](https://etrojs.dev/docs/intro)
- **Useful for certain features of application**: [Creating First React Project](https://www.youtube.com/watch?v=IbWXHfz91_Y)

## Contributing

See the [contributing guide](CONTRIBUTING.md)

## License

Distributed under GNU General Public License v3. See `LICENSE` for more
information.
