# Movie.js
## Overview
Movie.js is a completely in-browser video-editing framework. Similar to a video-editing software, the library lets you layer media and other content on a timeline.

## Description
Add [dist/movie.js](dist/movie.js) to your project
```html
<script src="movie.js"></script>
```

## Usage
To create a movie (project)
```js
const movie = new mv.Movie(canvas);  // canvas must be added to DOM to see movie
```

Then, add layers
```js
movie
  // add a blue base layer starting at 0s and lasting 3s and stretching to fill the screen
  .addLayer(new mv.Layer(0, 3, movie.width, movie.height, {background: 'blue'}))
  .addLayer(new mv.VideoLayer(2.5, video, {mediaX: 10, mediaY: -25}));
```

To start the movie, just like any ol' `<video>` or `<audio>`, use `.play()`
```js
movie.play();
```

## Further Reading
For tutorials and references, please see the work-in-progress [wiki](https://github.com/clabe45/movie.js/wiki).
