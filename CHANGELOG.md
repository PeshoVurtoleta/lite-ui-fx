# Changelog

All notable changes to `@zakkster/lite-ui-fx` are documented here.

The format follows Keep a Changelog; this project adheres to Semantic
Versioning.

## [1.8.0] -- 2026-09-07

Documentation and demo (roadmap U6). No API, recipe, or behaviour change: the
module code (`UIFXController.js`, `UIFXRecipes.js`) is byte-identical to 1.7.0.
Closes finding U-12 (demos that reimplemented the library inline).

### Added

- `README.md` rewritten on the LiteSepforge blueprint spine: positioning H2 with
  a runnable quick-start, table of contents, why/what-you-get, a mount-modes
  deep-dive, an API reference with UIType/state/`RECIPE_META` constant tables, a
  composability example, a zero-GC allocation table carrying the gated torture
  GATE line, design-decision links, testing, what-this-is-not, ecosystem. Size
  claims are measured (controller ~5.2 KB min+gzip, catalog of 56 recipes ~24 KB).
- `demo/index.html`: one demo that consumes the package. It imports only the
  public `.` and `./recipes` entry points and generates the gallery from
  `RECIPE_META`, mounting each recipe by its declared type. Includes a theme
  switcher, a reduced-motion toggle, and a `#profile` forced-reflow hook
  (dev-only, dormant unless the URL carries `#profile`; a full drive of the hot
  paths reports `violationCount 0`).
- `test/docs.test.mjs`: an executable doc gate. It extracts every fenced js block
  in `README.md`, rewrites the package specifiers to the local files, and imports
  each under the DOM stub, so a drifted example fails CI; a control block with a
  bad import name proves the gate can fail. The suite is now 205 node:test cases
  across 18 suites.
- `decisions/0006-docs-and-demo.md`.

### Removed

- The three inline demo pages (`demo/demo-lite-ui-fx.html`,
  `demo/demo-lite-uifx-vol2.html`, `demo/demo-lite-uifx-vol3.html`) that
  reimplemented the controller and recipes inline (U-12), replaced by the single
  consuming `demo/index.html`.
- The README's three CodePen "Live Demo" links and the competitor-size comparison
  table (unmeasured claims; the shipped demo is the showcase).

## [1.7.0] -- 2026-09-07

Host integration (roadmap U5). Two host-clock modes plus reduced-motion and a
frame-budget signal, applied to BOTH mount modes (`mountUIFX` and `decorateUIFX`).
Additive: a default mount is byte-identical to 1.6.0.

### Added

- `{ ticker }` mount option (both modes): a caller-supplied ticker
  (`{ add(fn) -> removeFn }`, e.g. `@zakkster/lite-ticker`) drives the component
  instead of the shared ref-counted ticker. `destroy()` unregisters the
  component's frame but never destroys the caller's ticker (ownership stays with
  the caller).
- `{ driven: true }` mount option (both modes): no ticker and no RAF; the host
  drives each frame via `instance.tick(dtMs)`. `instance.tick` is the internal
  frame body in driven mode and throws otherwise. `{ ticker }` and `{ driven }`
  are mutually exclusive; a non-boolean `driven` or a ticker without `.add()`
  throws at mount.
- `state.reducedMotion` (both modes): read from
  `matchMedia('(prefers-reduced-motion: reduce)')` before `recipe.init` and
  watched via the AbortController; absent `matchMedia` is a no-op (stays `false`).
  Calm paths for six recipes -- `SwarmToggle`, `PasswordStrength`,
  `TypewriterField`, `FocusHalo`, `ErrorShake`, `SuccessBloom`: under reduced
  motion `ErrorShake` stops displacing, `SuccessBloom` spawns no particles, and
  `SwarmToggle` rests its particles at formation.
- `state.budget` (0..1, both modes): a per-frame frame-budget number (1 at
  ~60fps, lower as frames lengthen), computed in place with no allocation, for
  budget-aware recipes to shed work.
- `mountRecipe` emits a `console.warn` (not a throw) when mounting a
  `motionSafe:false` recipe while the user prefers reduced motion.
- TypeScript: `HostTicker`, `HostClockOptions`, `state.reducedMotion` /
  `state.budget`, and `instance.tick(dtMs)` on both instance types.
- `decisions/0005-host-clock.md`. U5 coverage: t5 caller-ticker ownership +
  driven determinism, t3 reduced-motion churn, and two t9 controls (`fake-calm`,
  `ticker-ownership`). 177 -> 196 node:test tests; 5 -> 7 torture controls.

### Changed

- The per-mount frame loop is one named function shared by all three clock modes;
  the default (shared-ticker) path is byte-identical to 1.6.0.
- `RECIPE_META.motionSafe` is now `true` for six recipes (previously `false` for
  all 56): it marks exactly the recipes that ship a reduced-motion calm path.

## [1.6.0] -- 2026-09-07

Decorate mode (U4b, the second half of roadmap U4). A second public mount mode
alongside the hijack `mountUIFX`: `decorateUIFX` positions a canvas AROUND an
existing visible element instead of hijacking it. Additive: a bare `mountUIFX`
mount is byte-identical to 1.5.0; 53 -> 56 recipes.

### Added

- `decorateUIFX(el, recipeFactory, options)`: a canvas overlay AROUND a live
  element -- no `opacity:0`, no reparent. The overlay is a sibling placed from the
  host's offset box and removed on `destroy()`, so the host is byte-identical
  before and after (additive-only). Recipe `state` is wired from the host's own
  events; for a form-control host `state.text` and `state.valid` mirror `el.value`
  and `el.validity`, read at event time (never per frame). `setValue`/`setChecked`
  are hijack-only and throw. Options are a subset (`padding`, `seed`, `colors`,
  `theme`, `text`, `font`); the hijack-only keys throw in decorate mode.
- Three decorate recipes, born themed and t3-gated: `FocusHalo`, `ErrorShake`,
  `SuccessBloom` (generic form feedback, reading `state.focused` / `state.valid`).
  Registered in `RECIPES` / `RECIPE_META` (type `'decorate'`) / the default export
  / a new `UIFXRecipes5` barrel.
- `'decorate'` as a `RECIPE_META.type` routing tag: `mountRecipe(el, id)` routes a
  decorate recipe to `decorateUIFX`. `VALID_META_TYPES` gains exactly this one
  non-`UIType` tag; `mountUIFX` still rejects it (the two paths cannot cross).
- Optional `state.text` / `state.valid` fields (decorate mode only). TypeScript
  `DecorateOptions`, `DecorateInstance`, and `decorateUIFX` in the d.ts.
- `decisions/0004-decorate-mode.md`; decorate coverage across the suite: t0 host
  byte-identical DOM diff + a t9 `decorate-host-mutation` control, t1 fail-closed +
  degenerate sweep, t2 A14-A16 (state wiring, host untouched, non-input host), t3
  zero-alloc churn, t5 decorate on the shared ticker. 164 -> 177 node:test tests.

### Changed

- `PasswordStrength` and `TypewriterField` re-homed from their U4a-era fake types
  (slider / toggle) onto decorate mode (`RECIPE_META.type` `'decorate'`). Unlike
  the U4a re-homes these are behaviour ports: they now read the live host input --
  PasswordStrength derives strength from `state.text` (zero-alloc `charCodeAt`
  scan, recomputed only on change); TypewriterField animates an underline that
  grows with the typed text (no `measureText`). Both stay `themeable`.
- RECIPE_META covers 56 recipes; `themeable` true for all 56, `motionSafe` false
  for all 56. All 56 stay zero-GC under the t3 frame-alloc gate (default AND
  themed). `mountUIFX` and every hijack mount are unchanged.

## [1.5.0] -- 2026-09-07

New native element types (U4a, the first half of roadmap U4). Vol.3 faked
checkboxes as `role=switch` toggles and knobs/progress meters as sliders; U4a
promotes them to their true native elements (law 1). Additive: a bare mount of
any existing recipe is unchanged; 50 -> 53 recipes. Decorate mode is U4b.

### Added

- Three `UIType`s, each wrapping the correct native element: `CHECKBOX`
  (`<input type=checkbox>`, no `role=switch`; indeterminate via `setValue(null)`,
  exposed as `state.indeterminate`), `PROGRESS` (native `<progress>`,
  non-interactive, value written by `setValue`; opt-in `announce` adds a
  visually-hidden `aria-live=polite` region updated at 10% steps), and `KNOB`
  (`<input type=range>`, arrow keys native, canvas-side `knobMode`
  `'rotate' | 'vertical'` pointer mapping).
- `instance.setValue(v)` / `instance.setChecked(b)`: one call syncs the native
  element, `state`, any PROGRESS announcer, and fires the recipe hook
  (`onDrag`/`onToggle`) exactly once (a programmatic write emits no native event).
- Options `knobMode` (KNOB-only) and `announce` (PROGRESS-only), both validated
  fail-closed (presence on the wrong type throws).
- Three recipes, born themed and t3-gated: `TickDraw`, `IndeterminateScan`
  (CHECKBOX, honouring `state.indeterminate`), `LiquidFill` (PROGRESS). Registered
  in `RECIPES` / `RECIPE_META` / the default export / a new `UIFXRecipes4` barrel.
- `decisions/0003-element-types.md`; controller `npm test` coverage for the new
  types; t2 gains the CHECKBOX-no-switch, PROGRESS-value, KNOB-arrows, and
  `setValue`/`setChecked`-once contracts (A10-A13).

### Changed

- Eight Vol.3 recipes re-homed onto their true types (rippleCheck/morphCheck ->
  checkbox; volumeKnob/compassKnob -> knob; ringProgress/batteryGauge/signalMeter/
  uploadProgress -> progress). Re-home is a `RECIPE_META.type` string change only
  -- no recipe body touched -- so each renders byte-identical to 1.4.0 (proven by
  `git diff`); new types keep the donor's default geometry (checkbox 64x36,
  knob/progress 200x28).
- The mount type guard and `registerRecipe` both derive their valid-type set from
  `UIType`, so the controller, the registry, and the d.ts cannot drift as types
  are added; an unknown type still throws (fail closed).
- Torture: `makeChurn` drives the new types (checkbox like toggle + sweeps
  indeterminate, knob like slider, progress sweeps value with no hook); t0/t5
  synthetic batches iterate all six types; the t3 tier now gates 53 recipes
  (default AND themed). `npm test` 164 pass; torture `gc major=0`, `alloc=0 B/op`.
- Docs (`llms.txt`, `README.md`, both `.d.ts`) updated to 53 recipes and the new
  types / options / methods.

### Fixed

- The Vol.3 semantic mis-mounts: a checkbox is no longer announced as a switch
  (WCAG role match), and progress meters are non-interactive rather than
  user-draggable sliders.

## [1.4.0] -- 2026-09-07

The theming pass (U3b), completing U3's third finding (U-06). One option
convention across all 50 recipes; `themeable` is true for the first time. Every
default renders byte-for-byte as 1.3.0. Reduced motion (`motionSafe`) stays a
later pass.

### Fixed

- U-06 (theming): all 50 recipes honour one reserved option set
  `{ seed, colors, theme: { light, mid, dark }, text, font }`, resolved once in the
  factory / `init`, never per frame. `theme` maps light/mid/dark onto each recipe's
  accent/dim/surface roles; `colors` overrides positionally and wins over `theme`;
  the array-palette recipes (Confetti, Firework, Aurora, RadioOrbit,
  PasswordStrength, ReactionPicker) keep reading `colors` as their palette and are
  seeded by `theme`. Hardcoded canvas labels (`'MAGNETIC'`, ...) became `text`,
  resolved as `text ?? label ?? default`, so a mount that sets only the accessible
  `label` drives the visible string (WCAG 2.5.3 label-in-name); fonts became the
  `font` option. Every default is byte-identical to 1.3.0 (recording-context
  draw-signature diff over all 50 recipes).

### Added

- `RecipeOptions` (UIFXRecipes.d.ts) plus the shared cold helpers `resolveTheme`,
  `pickText`, `pickFont`, `rgbaOf`, `rgbTriplet`; `MountOptions` gains the five
  reserved keys.
- `test/theme.test.mjs`: 70 boundary tests (themeable flags, every recipe recolours
  under a theme, colors-wins-over-theme, the legacy `colors`/`color` aliases, the
  fail-closed validator matrix, label-in-name).
- t3 torture gates each recipe under a THEMED mount as well as its default
  (`t3-scan.mjs` adds `tgrad`/`tcdist`; `t3-frame-alloc.mjs` judges both), proving
  palette resolution stayed cold; t2 gains a label-in-name assertion.
- `tools/palettes.mjs` (not shipped): audits the shipped label colours for APCA
  0.1.9 contrast and emits example theme triples via `@zakkster/lite-hueforge`
  (a dev-only tool, never a runtime dependency). Recorded in
  `decisions/0002-recipe-options.md`.

### Changed

- Controller: `KNOWN_OPTIONS` admits `seed` / `colors` / `theme` / `text` / `font`,
  each validated fail closed -- a partial or extra-key `theme`, a non-array
  `colors`, a non-string `text` / `font`, or a non-finite `seed` throws; an unknown
  key still returns a did-you-mean.
- `RECIPE_META.themeable` is `true` for all 50 recipes; `motionSafe` stays `false`.
- The recording `Ctx2DStub` logs `fillText` / `strokeText` with their text argument.
- `UIFX-RECIPE-GUIDE.md`: the per-frame performance rules retire the pre-U3
  "`splice()` is fine for < 100 particles" advice (it contradicts the t3 gate) and
  add a rule to resolve theming in the factory / `init`, never in `tick`.

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
