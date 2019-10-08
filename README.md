# Vidar.js
> A video editor for developers

![Screenshot](screenshots/2019-08-17_0.png)

Vidar.js is a completely in-browser video-editing library. Similar to conventional video-editing software, it lets you layer media and other content on a timeline. Audio, image, video and other tracks are supported, along with powerful video and audio manipulation to existing tracks. Being very flexible and extendable, you can choose to only use the core components or define your own.

## Installation

Use [one of the bundled files](dist).

## Usage

```html
<script src="vidar-iife.js"></script>
```

or

```js
import vd from 'vidar-esm.js';
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

To learn more, please see the work-in-progress [wiki](https://github.com/clabe45/vidar.js/wiki).

## Contributing

See the [contributing guide](CONTRIBUTING.md)
