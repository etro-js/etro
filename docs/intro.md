# Introduction
## Documentation Conventions
- To specify the ES6 module (file) that a declaration exists in, the following syntax will be used: `path.to.module.export`.

## Structure
### Directory Structure
| Path | Contents |
| --- | --- |
| **dist** | bundled production code |
| **docs** | this developer documentation |
| **examples** | example code that uses the framework |
| **examples/application** | real-world uses cases |
| **examples/introduction** | demonstrating basic concepts |
| **screenshots** | all? screenshots in documentation (maybe later make it more local) |
| **src** | yes |

### Module Structure
If you are new to the core elements that make vidar.js work, you should probably read [the *Overview* wiki article](https://github.com/clabe45/vidar.js.wiki/Overview.md).

Here are the contents of **src**:

| Path | Contents |
| --- | --- |
| **effect.js** | all (visual) effect classes |
| **index.js** | the entry module |
| **layer.js** | all layer classes |
| **vidar.js** | the `Movie` class |
| **util.js** | general utility |

### Vidar.js Objects
The base vidar.js objects are the following:
* `Movie` - the movie (or entire "project")
* `layer.Base` - the root type of layer
* `effect.Base` - the root type of visual effect

## Concepts
### `PubSub`
Events emitted by vidar.js objects use a [pub/sub system](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern). Every object that emits events inherits from `util.PubSub`.

### Values vs. Properties
In vidar.js objects, almost any property can be a [keyframe](https://github.com/clabe45/vidar.js/wiki/Keyframes), [function](https://github.com/clabe45/vidar.js/wiki/Functions), or just a constant value. To access the current value of the property at a given time, use `util.val(property, element, time)`; where `property` is the keyframe set, function or constant value, `element` is the vidar.js object to which `property` belongs, and `time` is the current time relative to the element.

## Where to go from here
TODO
