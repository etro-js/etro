# Contributing

## Introduction

Thank you for considering contributing to Vidar! There are many ways you can contribute to Vidar, like creating issues for features or bugs, improving the docs or wiki, or writing the actual code for the library. This page covers how to make changes to the repository files (either code or docs).

> Vidar has a [Taiga Project](https://tree.taiga.io/project/clabe45-vidar/epics) for managing issues and a [Slack workspace](https://join.slack.com/t/vidarjs/shared_invite/enQtNzgxODc0ODUyMjU2LTA5MGM5YzIyOGU5NjQxY2E0YmIzYzhhZTU4ODdjNzBiY2M3MzgwZTZiYzU5ZmE2NmYyMjc0ZTE0ZWIxMjBmN2Q) for questions and casual discussion

## Setting up your local environment

#### Step 0: Dependencies

- You will need `git`, `node` and `npm`

#### Step 1: Fork

- Create your own fork of Vidar. Then run

  ```
  $ git clone https://github.com/username/vidar.git`
  $ cd vidar
  $ git remote add upstream https://github.com/clabe45/vidar.git
  $ git fetch upstream
  $ npm install
  ```

#### Step 2: Branch

- To help organize your work, create a branch for your topic. Avoid working directly off the `master` branch

  ```
  $ git checkout -b topic-branch
  ```

## Making your changes

#### Step 3: Code

- If you are writing code, please follow the style guide [StandardJS](https://standardjs.com/rules.html)

- To start the development server run

  ```
  $ npm start
  ```

  Then, you can see your changes by running some [examples](examples).

- When you're ready to submit a piece of work, first run

  ```
  $ npm run lint
  $ npm run build
  $ npm test
  ```

  to lint the code, generate the [dist](dist) files and run unit tests on them.

- Commit your changes
  - Please avoid squashing all your commits into one; we try to keep each commit atomic in the `master` branch
  - Please follow these commit message guidelines:
    - Optionally, begin each commit message with [an appropriate emoji](https://gitmoji.carloscuesta.me/)
    - Then, write a concise summary of your changes. If you feel you need to, bullet the main idea of your changes in the description and/or explain why you made the changes.
    - Write in the imperative tense
    - The first line should be 50 characters or less. Wrap lines after around 72 characters (for Vim add `filetype indent plugin on` to ~/.vimrc, and its enabled by default in Atom).
    - *Example:*

      ```
      :emoji: One-liner

      Optional description
      ```

## Submitting your changes

#### Step 3: Push

- First, rebase (don't merge) to integrate your work with the main repository

  ```
  $ git fetch upstream
  $ git rebase upstream/master
  ```

- Push your changes to the topic branch in your fork of the repository

  ```
  $ git push origin topic-branch
  ```

#### Step 4: Pull request

- Open a pull request from your topic-branch to the main repository
- In the PR title, include **fixes ###** for bugs and **resolves ###** for feature requests
- If you changed any core functionality, make sure you explain your motives for those changes

#### Step 5: Feedback

- A large part of the submission process is receiving feedback on how you can improve you pull request. If you need change your pull request,

  ```
  $ git add path/to/changes
  $ git commit
  $ git push origin topic-branch
  ```

## Code overview

*Note: To specify the ES6 module (file) that a declaration exists in, the following syntax will be used: `module.export`.*

### Module Structure

If you are new to the core elements of vidar, you should probably read [the *Overview* wiki page](https://github.com/clabe45/vidar.wiki/Overview.md).

Here are the contents of **src**:

| Path | Contents |
| --- | --- |
| [**effect.js**](src/effect.js) | all (visual) effect classes |
| [**event.js**](src/event.js) | the pub/sub mechanics |
| [**index.js**](src/index.js) | the entry module |
| [**layer.js**](src/layer.js) | all layer classes |
| [**movie.js**](src/movie.js) | the `Movie` class |
| [**util.js**](src/util.js) | general utility |

Note that most of the above files will (hopefully soon) be broken down into multiple files each.

### Vidar Objects

The base vidar objects are the following:
* `Movie` - the movie (or entire user project)
* `layer.Base` - the root type of layer
* `effect.Base` - the root type of visual effect

### Concepts

#### Pub/sub system

Events emitted by Vidar objects use a [pub/sub system](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern). To emit an event, use `event.publish(target, type, event)`. For instance,

```js
event.publish(movie, 'movie.type.of.event', { additionalData: 'foo' })
```

That will notify all listeners of `movie` for event types `'movie'`, `'movie.type'`, `'movie.type.of'` and `'movie.type.of.event'`. To listen for an event, use `event.subscribe(target, type, listener)`, like

```js
event.subscribe(movie, 'movie.type', event => {
  console.log(event.target, event.type, event.additionalData) // should print the movie, 'movie.type.of.event', 'foo'
}
```

#### Values vs. Properties

In Vidar objects, almost any property can be a [keyframe](https://github.com/clabe45/vidar/wiki/Keyframes), [function](https://github.com/clabe45/vidar/wiki/Functions), or just a constant value. To access the current value of the property at a given time, use `util.val(property, element, time)`; where `property` is the keyframe set, function or constant value, `element` is the object to which `property` belongs, and `time` is the current time relative to the element.
