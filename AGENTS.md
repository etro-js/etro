# AGENTS.md — Etro Contributor Context

## What is Etro?

Etro is a TypeScript video-editing framework for the browser. It composites
layers (video, audio, image, text, or custom) onto an HTML `<canvas>`, applies
GPU-accelerated GLSL shader effects, and outputs via `play()`, `stream()`
(WebRTC), or `record()` (Blob). Audio routes through the Web Audio API.

## Repository Layout

```
src/
├── index.ts            # Default export wrapper
├── etro.ts             # Named re-exports (used by typedoc)
├── movie/              # Movie class — the top-level composition
│   ├── movie.ts        # Constructor, play/stream/record/refresh, seek/pause/stop
│   ├── layers.ts       # Array proxy for movie.layers
│   └── effects.ts      # Array proxy for movie.effects
├── layer/              # Layer classes (content sources)
│   ├── base.ts         # Abstract base (startTime, duration, attach/detach)
│   ├── visual.ts       # Visual base (canvas drawing, background, opacity)
│   ├── visual-source.ts# Shared source logic for image/video
│   ├── audio-source.ts # Shared source logic for audio/video
│   ├── audio.ts        # etro.layer.Audio
│   ├── video.ts        # etro.layer.Video (extends both visual-source + audio-source)
│   ├── image.ts        # etro.layer.Image
│   └── text.ts         # etro.layer.Text
├── effect/             # Effect classes (filters)
│   ├── base.ts         # Abstract base (attach/detach, apply)
│   ├── visual.ts       # Visual base (WebGL context setup)
│   ├── shader.ts       # GLSL shader base (custom fragment shaders)
│   ├── brightness.ts, channels.ts, chroma-key.ts, contrast.ts,
│   │   elliptical-mask.ts, gaussian-blur.ts, grayscale.ts, pixelate.ts,
│   │   transform.ts    # Built-in effects
│   └── stack.ts        # Composite effect (applies a list of sub-effects)
├── event.ts            # Pub/sub event system (deprecated in favor of callbacks)
├── object.ts           # EtroObject interface
├── util.ts             # val(), parseColor(), KeyFrame, Color, Dynamic<T> type
└── custom-array.ts     # Proxy-based observable array (for layers/effects lists)

spec/                   # Tests (Karma + Jasmine)
├── unit/               # Mocked unit tests
├── smoke/              # End-to-end without audio (runs in CI)
├── integration/        # End-to-end with audio (local only)
├── mocks/              # Shared mock factories (dom, movie, layer, effect)
└── assets/             # Test fixtures (images, audio, video, effect references)

examples/               # Browser demos (hello-world, keyframes, effects, webcam)
scripts/effect/         # Effect sample generation tooling
dist/                   # Build output (gitignored)
```

## Architecture Concepts

- **Movie** — the root composition. Owns a `<canvas>`, an `AudioContext`, a
  `layers` list, and an `effects` list. Renders via `play()`, `stream()`,
  `record()`, or `refresh()`.
- **Layer** — a time-sliced content source (`startTime` + `duration`). Visual
  layers draw to the canvas; audio layers route through Web Audio.
- **Effect** — a filter applied to a layer or to the movie globally. Visual
  effects use WebGL fragment shaders.
- **Dynamic Properties** — layer/effect properties can be a constant, a
  `KeyFrame` animation, or a function `(element, time) => value`. Evaluate
  with `etro.val(obj, 'prop', time)`.
- **Events** (deprecated) — pub/sub via `event.publish` / `event.subscribe`.
  New code should prefer async callbacks (`onDraw`, `onStart`, etc.).

## Build & Dev

| Command                    | Purpose                                       |
|----------------------------|-----------------------------------------------|
| `npm run build`            | Rollup → `dist/etro-cjs.js` + `dist/etro-iife.js` |
| `npm run lint`             | ESLint (StandardJS + TypeScript rules)        |
| `npm run fix`              | ESLint with `--fix`                           |
| `npm run test:unit`        | Unit tests (mocked DOM, runs in CI)           |
| `npm run test:smoke`       | Smoke tests (real browser, no audio, runs in CI) |
| `npm run test:integration` | Integration tests (audio required, local only)|
| `npm run doc`              | Typedoc → `docs/`                             |
| `npm run effects`          | Regenerate effect reference images             |

Tests run in **headless Firefox** via Karma. The test suite is selected by
the `TEST_SUITE` env var (`unit`, `smoke`, or `integration`).

## Code Conventions

- **Language**: TypeScript, compiled to ES5. Target `"lib": ["es2016", "DOM"]`.
- **Style**: [StandardJS](https://standardjs.com/rules.html) — no semicolons,
  2-space indent, `1tbs` brace style, `curly: all`.
- **Commits**: Commitlint enforced — header and body lines max 72 chars.
  Husky pre-commit runs lint + build + tests automatically.
- **Branching**: Work on a feature branch, never commit directly to master.
  Rebase onto upstream/master before opening a PR.

## Adding / Modifying Effects

1. Create or edit the effect class in `src/effect/`.
2. Effects with visual output should extend `etro.effect.Shader` (for custom
   GLSL) or `etro.effect.Visual`.
3. Register the effect in `src/effect/index.ts`.
4. Add the effect to `scripts/gen-effect-samples.html`.
5. Run `npm run effects` and review generated images in
   `spec/integration/assets/effect/`.
6. Add unit tests in `spec/unit/effect/` and smoke tests in `spec/smoke/effect/`.

## Adding / Modifying Layers

1. Create or edit the layer class in `src/layer/`.
2. Visual layers should extend `etro.layer.Visual`; audio layers extend
   `etro.layer.Base` and implement audio routing.
3. Register the layer in `src/layer/index.ts`.
4. Add unit tests in `spec/unit/layer/` using the mock factories in
   `spec/unit/mocks/`.

## Key Patterns

- Use `applyOptions()` (from `util.ts`) to merge constructor options with
  defaults — though this is deprecated; new code should assign defaults
  directly in the constructor.
- The `Dynamic<T>` type and `val()` helper enable keyframe-animated and
  functional properties. Any property that should support animation must use
  this pattern.
- Layers and effects use `tryAttach` / `tryDetach` lifecycle hooks when
  added to or removed from a movie. Use `attach()` for setup and `detach()`
  for teardown.
- The `publicExcludes` array on layers/effects controls which properties are
  excluded from serialization.

## Useful Links

- Docs: https://etrojs.dev/
- API Reference: https://etrojs.dev/docs/reference/movie
- Dynamic Properties: https://etrojs.dev/docs/reference/dynamic-properties
- Discord: https://discord.gg/myrBsQ8Cht
- CONTRIBUTING.md for full workflow details
