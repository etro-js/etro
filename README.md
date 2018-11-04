# Movie.js
> A video editor for developers

![Screenshot](screenshots/2018-11-03_0.png)

Movie.js is an in-browser video-editing framework. Similar to video-editing software, it lets you layer media and other content on a timeline. Audio, video and other tracks are supported, along with powerful video and audio manipulation to existing tracks.

Some things you can do with this framework are making a video-editor with a UI, making a machine-generated video, or just having fun mixing videos. Being very flexible and extendable, you can choose to only use the core components or define your own.

## Installation

Use [one of the bundled files](movie.js).

## Usage

```html
<script src="path/to/movie-iife.js"></script>
```

or

```js
import mv from 'path/to/movie-esm.js';
```

Then, to create a movie (which is a project)
```js
const movie = new mv.Movie(canvas);
```

Then, add layers
```js
movie
  // add an empty blue layer starting at 0s and lasting 3s and filling the entire screen
  .addLayer(new mv.Layer(0, 3, {background: 'blue'}))
  // add a cropped video layer starting at 2.5s
  .addLayer(new mv.VideoLayer(2.5, video, {mediaX: 10, mediaY: -25}));
```

To start the movie, just like any ol' `<video>` or `<audio>`, use `.play()`
```js
movie.play();
```

## License

Distributed under GNU General Public License v3. See `LICENSE` for more information.

## Further Reading

To learn more, please see the work-in-progress [wiki](https://github.com/clabe45/movie.js/wiki).

## Contributing

1. Fork it (https://github.com/clabe45/movie.js/fork)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes(`git commit -m ':emoji: Concise description'`, use [this](http://gitmoji.carloscuesta.me/) as an emoji reference)
4. Push to branch (`git push origin feature/fooBar`)
5. Create a Pull Request
