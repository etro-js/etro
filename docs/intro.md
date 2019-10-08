# Code overview

*Note: To specify the ES6 module (file) that a declaration exists in, the following syntax will be used: `path.to.module.export`.*

### Module Structure

If you are new to the core elements of vidar.js, you should probably read [the *Overview* wiki page](https://github.com/clabe45/vidar.js.wiki/Overview.md).

Here are the contents of **src**:

| Path | Contents |
| --- | --- |
| [**effect.js**](src/effect.js) | all (visual) effect classes |
| [**event.js**](src/event.js) | the pub/sub mechanics |
| [**index.js**](src/index.js) | the entry module |
| [**layer.js**](src/layer.js) | all layer classes |
| [**movie.js**](src/movie.js) | the `Movie` class |
| [**util.js**](src/util.js) | general utility |

Note that in the near future, a package system will be introduced, in which the code will be organized by feature instead of by layer.

### Vidar.js Objects

The base vidar.js objects are the following:
* `Movie` - the movie (or entire user project)
* `layer.Base` - the root type of layer
* `effect.Base` - the root type of visual effect

### Concepts

#### Pub/sub system

Events emitted by Vidar objects use a [pub/sub system](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern). To emit an event, use `event._publish(target, type, event)`. For instance,

```js
event._publish(movie, 'movie.type.of.event', {additionalData: 'foo'})
```

That will notify all listeners of `movie` for event types `'movie'`, `'movie.type'`, `'movie.type.of'` and `'movie.type.of.event'`. To listen for an event, use `event.subscribe(target, type, listener)`, like

```js
event.subscribe(movie, 'movie.type', event => {
  console.log(event.target, event.type, event.additionalData) // should print the movie, 'movie.type.of.event', 'foo'
}
```

#### Values vs. Properties

In Vidar objects, almost any property can be a [keyframe](https://github.com/clabe45/vidar.js/wiki/Keyframes), [function](https://github.com/clabe45/vidar.js/wiki/Functions), or just a constant value. To access the current value of the property at a given time, use `util.val(property, element, time)`; where `property` is the keyframe set, function or constant value, `element` is the object to which `property` belongs, and `time` is the current time relative to the element.
