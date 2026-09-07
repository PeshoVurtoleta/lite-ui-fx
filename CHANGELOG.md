# Changelog

All notable changes to `@zakkster/lite-ui-fx` are documented here.

The format follows Keep a Changelog; this project adheres to Semantic
Versioning.

## [1.3.0] -- 2026-09-07

The recipe sweep (U3), first pass: zero per-frame allocation across all 50
recipes (U-03) and geometry derived from state (U-05). The `zero-gc` keyword is
true for the first time. Theming (U-06) and the blueprint-doc rewrite are a
deferred follow-up; `themeable` / `motionSafe` stay `false`.

### Fixed

- U-03 (zero-GC): every built-in recipe now runs its per-frame body -- idle and
  under interaction -- without allocating. Per-frame `rgba(...,${alpha})` colour
  strings became a const colour + `globalAlpha`; recipes whose RGB varies with a
  value (FlameCounter, HeatMap, DayNightToggle) use a precomputed colour LUT;
  particle `push`/`splice` pools became fixed preallocated pools with a live
  flag; per-frame gradients moved to `init` (VolumeKnob / RingProgress build
  once; LaserSlider / AuroraSlider build a reference gradient in `init` and scale
  it to the fill, AuroraSlider cycling a bounded set of phase gradients); value
  labels read a precomputed `PCT` table or a change-detection cache instead of
  building `${n}%` / `String(n)` / `.toFixed()` per frame; the GlitchButton
  per-tick closure and the CompassKnob / ReactionPicker per-frame array literals
  were hoisted; `setLineDash([4,3])` uses one shared module-level array.
- U-05 (size-true): spawn and inset positions derive from `st.w` -- NeonPulse
  ring origin (was `46`/`18`), SparkSlider and ScratchReveal spark spawn (was
  `val * 200`), BubbleRating bubble gap (was `200 / 5`).

### Added

- `test/torture/t3-frame-alloc.mjs` (+ `t3-scan.mjs`): the U-03 gate. It runs in
  a child process under `--max-semi-space-size=1` and gates each recipe on
  `major === 0`, zero gradient constructions after `init`, and a bounded count of
  distinct fill/stroke colour strings (a per-frame colour template mints
  hundreds; a const palette or LUT a few dozen). Wired into `torture.mjs`.

### Changed

- Harness: the recording `Ctx2DStub` backs numeric context properties
  (`globalAlpha`, `lineWidth`, ...) with a `Float64Array` so writing a
  non-integer never boxes a HeapNumber -- the gate measures the recipe, not the
  stub. `gcGate` gained a warmup phase and an optional zero-alloc churn driver.
- `mountUIFX` forwards the validated options to the recipe factory, so a recipe
  can read its own config (a no-arg or wrapped factory ignores the argument).
  This is inert until the U-06 theming pass uses it.

## [1.2.0] -- 2026-09-06

Recipes ship as code (U-13). The three GitHub-only recipe volumes are
consolidated into one `UIFXRecipes.js` at the package root, exposed as the
`./recipes` subpath export behind a registry. No recipe body changes -- the
zero-GC / size-true / theming sweep is U3.

### Added

- `./recipes` subpath export: all 50 recipes ship in one `UIFXRecipes.js`
  (with `UIFXRecipes.d.ts`), versioned, typed, and tree-shakeable
  (`sideEffects: false`). `UIFX-RECIPE-GUIDE.md` moves to the package root and
  ships as well.
- Recipe registry (ported from `@zakkster/lite-scratch-fx`): `RECIPES`
  (null-prototype, id -> factory), `RECIPE_META` (`{ id, name, type, family,
  themeable, motionSafe }`; `themeable` and `motionSafe` are `false` for all
  until U3), `RECIPE_NAMES` (frozen), and `registerRecipe(id, factory, meta)`
  with an in-place meta-merge.
- `mountRecipe(container, id, options?)`: resolves the id fail closed (an
  unknown id throws with a did-you-mean; a non-string id gets the same clean
  message), asserts any `options.type` matches the recipe's declared type, then
  mounts via `mountUIFX`.
- Torture: `t0-lifecycle` and `t1-degenerate` iterate `RECIPE_META`, so all 50
  recipes are mounted, exercised, and destroyed by construction. New
  `test/registry.test.mjs` (registry + `mountRecipe` contract + a boundary
  matrix) and `test/treeshake.test.mjs` (an esbuild proof that importing one
  recipe drops the others).

### Changed

- Fail closed on the element type: `mountUIFX` now throws on any `type` other
  than `UIType.BUTTON` / `TOGGLE` / `SLIDER` (an unknown type previously became
  a button silently), and `registerRecipe` rejects a recipe with no valid type
  before any mutation.
- The recipes are no longer a GitHub ZIP / copy-paste. `README.md` and
  `llms.txt` document the `./recipes` import and drop the "not included in the
  npm package" wording.
- `package.json`: `exports["./recipes"]` added; `files[]` ships
  `UIFXRecipes.js`, `UIFXRecipes.d.ts`, and `UIFX-RECIPE-GUIDE.md`; `esbuild`
  added as a devDependency (the tree-shake proof only -- not shipped).
- Decision recorded in `decisions/0001-recipes-position.md`.

### Removed

- The `recipes/` directory (three volumes plus their `.d.ts`). Their exports
  are unchanged and now come from the root `UIFXRecipes.js`.

## [1.1.0] -- 2026-09-06

Controller correctness: the two S1 defects (U-01, U-02) and three
controller-level S3s (U-09, U-10, U-11). No visual change at default mounts.

### Fixed

- U-01 (keyboard): a toggle activates on one Space press with exactly one
  `onToggle`, and the native checkbox is the sole source of truth. The manual
  keydown checked-flip -- which fired a second `onToggle` -- is removed; Enter
  is bridged to the same native activation via `el.click()`.
- U-02 (loop survival): one malformed recipe can no longer freeze the page.
  Invalid recipes are rejected at mount (fail closed -- every side effect is
  unwound, so no orphan DOM and no leaked refcount); a `tick()` that throws
  quarantines only that component (one `console.error`, its canvas cleared)
  while the shared ticker and every other component keep running.
- U-09 (style leak): the slider-thumb `<style>` is one shared, ref-counted
  node -- injected on first slider mount, removed when the last slider
  unmounts; `document.head` child count nets to zero.
- U-10 (fail-open options): unknown option keys and unknown recipe-hook keys
  are now errors with a did-you-mean hint; `value` must be a number in [0,1].
- U-11 (forced reflow): the bounding rect is cached on pointerenter and
  refreshed on scroll/resize (passive listeners); `pointermove` does zero
  layout reads.

### Added

- Mount options `value` (slider initial, 0..1), `checked` (toggle initial),
  and `disabled` -- each lands in the native element and `state` before the
  first frame. New `state.disabled` for recipes to render a disabled look.
- DPR re-read: the canvas re-scales on a display-density change
  (`matchMedia`, feature-detected; a silent no-op where unavailable).
- Torture tiers t2 (the accessibility contract) and t5 (100-component scale
  plus the U-02 quarantine regression); two t9 controls (double-toggle,
  validation-bypass).

### Changed

- Mount validates every input before any side effect (fail closed):
  container, options, factory, and recipe shape are checked before the DOM,
  the shared style/ticker refcounts, or the render loop are touched.

## [1.0.5] -- 2026-09-06

Truth pass, law pass, and the torture skeleton. No runtime behaviour
changes: this release makes the package honest, lawful, and provable.

### Fixed

- U-04 (docs sell what does not ship): recipe count corrected to 50
  everywhere (`package.json` description, `llms.txt`); the recipe-guide
  link now points at `recipes/UIFX-RECIPE-GUIDE.md` (was a root-level
  404); the broken import quote in `llms.txt` is repaired.

### Changed

- U-08 (packaging law): restored `"sideEffects": false` (dropped by
  mistake in 1.0.4 -- see below); added `"engines": { "node": ">=18" }`;
  `UIFX-RECIPE-GUIDE.md` now ships in the package `files[]` so the
  "included in the package" claim is true; `LICENSE`, `README.md`, and
  `CHANGELOG.md` ship as well.
- U-08 (source law): ASCII-only sweep across the controller, recipe
  volumes, guide, README, and `llms.txt` (em/en dashes, arrows,
  box-drawing, emoji removed). `demo/` is exempt until U6.
- U-07 (test law): the vitest suite is ported to `node:test` +
  `assert/strict`; the dead `_tickAll`/`_clear` imports are replaced by a
  deterministic RAF stub. `vitest` removed from devDependencies.

### Added

- `export const VERSION = '1.0.5'` in `UIFXController.js` (three-place
  version sync: `package.json`, this const, and the `llms.txt` VERSION
  line).
- `test/` node:test suite plus the torture skeleton
  (`node --expose-gc test/torture.mjs`) gated by `@zakkster/lite-leak` and
  `@zakkster/lite-gc-profiler`.

### Known issues (see ROADMAP.md)

- U-01: Space cannot toggle a toggle; each press fires two spurious
  `onToggle`s. (Fixed in U1.)
- U-02: one malformed recipe (no `tick`) throws inside the shared ticker
  and permanently freezes every UIFX component on the page. (Fixed in U1.)
- U-03: "zero-GC in all built-in recipes" is false for 49 of 50 recipes.
  (Fixed in U3.)
- U-05: recipes misrender at any non-default size (hardcoded geometry).
  (Fixed in U3.)
- U-06: theming is half-built with three conventions; hardcoded fonts and
  canvas labels. (Fixed in U3.)
- U-09: every slider mount leaks a `<style>` into `document.head`; never
  removed on destroy. (Fixed in U1.)
- U-10: fail-open option surface -- unknown option keys silently ignored;
  no initial-value options; DPR read once. (Fixed in U1.)
- U-11: `getBoundingClientRect()` runs on every pointermove. (Fixed in U1.)
- U-12: the demos reimplement the library inline instead of consuming it.
  (Fixed in U6.)
- U-13: recipes are distributed as a GitHub ZIP, not shipped code.
  (Fixed in U2.)

## [1.0.4] -- 2026-03-26

### Changed

- Metadata patch.

### Regression

- Dropped `"sideEffects": false` from `package.json` (present in 1.0.3).
  Restored in 1.0.5.

## [1.0.3] -- 2026-03-25

### Changed

- README-only patch.

## [1.0.2] -- 2026-03-25

### Changed

- README-only patch.

## [1.0.1] -- 2026-03-25

### Changed

- README-only patch.

## [1.0.0] -- 2026-03-25

### Added

- Initial release: the `mountUIFX` controller plus 50 GitHub-hosted
  recipes across toggles, buttons, sliders, knobs, loaders, checkboxes,
  counters, and ratings.
