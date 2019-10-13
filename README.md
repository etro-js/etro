# Vidar
> A video editor for developers

![Screenshot](screenshots/2019-08-17_0.png)

Vidar is a completely in-browser video-editing library. Similar to conventional video-editing software, it lets you layer media and other content on a timeline. Audio, image, video and other tracks are supported, along with powerful video and audio manipulation to existing tracks. Being very flexible and extendable, you can choose to only use the core components or define your own.

## Features

- Export video to blob
- Write your own layers and effects
- Write a function for a property
- Keyframes
- Built-in hardware accelerated visual effects
- More coming soon

## Installation

```
npm install vidar
```

## Usage

```html
<script src="http://unpkg.org/vidar/dist/vidar.js"></script>
```

or

```js
import vd from 'node_modules/vidar/src/index.js';
```

Then, to create a movie (which is a project)
```js
const movie = new vd.Movie(canvas);
```

Then, add layers
```js
movie
  // add an empty blue layer starting at 0s and lasting 3s and filling the entire screen
  .addLayer(new vd.layer.Base(0, 3, {background: 'blue'}))
  // add a cropped video layer starting at 2.5s
  .addLayer(new vd.layer.Video(2.5, video, {mediaX: 10, mediaY: -25}));
```

To start the movie, just like any ol' `<video>` or `<audio>`, use `.play()`
```js
movie.play();
```

## License

Distributed under GNU General Public License v3. See `LICENSE` for more information.

## Further Reading

- [Documentation](https://clabe45.github.io/vidar)
- [Wiki (WIP)](https://github.com/clabe45/vidar/wiki)

## Contributing

See the [contributing guide](CONTRIBUTING.md)
