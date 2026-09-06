# Changelog

All notable changes to `@zakkster/lite-ui-fx` are documented here.

The format follows Keep a Changelog; this project adheres to Semantic
Versioning.

## [1.0.5] -- unreleased

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
