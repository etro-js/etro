# Contributing

## Introduction

Thank you for considering contributing to Etro! There are many ways you can contribute to Etro, like creating issues for features or bugs, improving the docs or wiki, or writing the actual code for the library. This page covers how to make changes to the repository files (either code or docs).


## Setting up your local environment

#### Step 0: Dependencies

- You will need Git, Node, NPM (at least 7.x) and Firefox (for headless unit testing) installed

#### Step 1: Fork

- Create your own fork of Etro. Then run

  ```
  git clone -b master --single-branch https://github.com/username/etro.git
  cd etro
  npm install
  node node_modules/puppeteer/install.js
  ```

## Making your changes

#### Step 2: Code

- Make some changes
- If you are writing code, the linter uses [StandardJS](https://standardjs.com/rules.html) for style conventions
- When you're ready to submit, first run

  ```
  npm run lint
  npm run build
  npm test
  ```

  to lint the code, generate the [dist](dist) files and run unit tests on them. It may be helpful to put these commands in a pre-commit hook.

- Commit your changes
  - Please avoid squashing all your commits into one; we try to keep atomic commits.
  - Please follow these commit message guidelines:
    - Optionally, prefix each commit message with [an appropriate emoji](https://gitmoji.dev)
    - Write in the imperative tense
    - Wrap lines after 72 characters (for Vim add `filetype indent plugin on` to ~/.vimrc, it's enabled by default in Atom).
    - Example:

      ```
      :emoji: One-liner

      Optional description
      ```

## Submitting your changes

#### Step 3: Push

- First, rebase (please avoid merging) to integrate your work with any new changes in the main repository

  ```
  git fetch upstream
  git rebase upstream/master
  ```

- Push to the fork

#### Step 4: Pull request

- Open a pull request from the branch in your fork to the main repository
- If you changed any core functionality, make sure you explain your motives for those changes

#### Step 5: Feedback

- A large part of the submission process is receiving feedback on how you can improve you pull request. If you need to change your pull request, feel free to push more commits.

## Code overview

### Etro Overview

Check out [the overview guide](https://etrojs.dev/docs/overview) for usage information

### API Structure

* `etro.Movie` - the movie
* `etro.layer.*` - all layers
* `etro.effect.*` - all (visual) effects
- `etro.event.publish` - emit an event
- `etro.event.subscribe` - add an event listener
- `etro.*` - other utility classes and methods (see **src/util.ts**)

### Etro concepts

#### Pub/sub system

Events emitted by Etro objects use a [pub/sub system](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern). To emit an event, use `event.publish(target, type, event)`. For instance,

```js
event.publish(movie, 'movie.type.of.event', { additionalData: 'foo' })
```

That will notify all listeners of `movie` for event types `'movie'`, `'movie.type'`, `'movie.type.of'` and `'movie.type.of.event'`. To listen for an event, use `event.subscribe(target, type, listener)`, like

```js
event.subscribe(movie, 'movie.type', event => {
  console.log(event.target, event.type, event.additionalData) // should print the movie, 'movie.type.of.event', 'foo'
})
```
