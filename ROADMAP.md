# lite-ui-fx -- enriched roadmap

Nine BRIEF sessions across one package, plus a torture-suite spec and a
restructure decision. There was no prior BRIEF; this document is the first
plan the package has had since 1.0.0.

**Why it exists.** The package is published (1.0.4), has a real niche
(canvas-hijacked native controls with swappable visual recipes -- nothing on
the registry does accessible-native + canvas-visual + recipe-registry), and
predates every law the suite now enforces. I pulled the package, read every
file, and drove the controller in a live browser behind a stubbed RAF.
Thirteen findings are listed in section 2 and **every one of them was
reproduced against source or a running browser, not inferred** -- including
two S1s: the Space key cannot toggle a toggle (U-01), and one malformed
recipe permanently freezes every UIFX component on the page (U-02).

The sibling question the owner asked -- *how did lite-ambient-fx and
lite-scratch-fx position their recipes, and what should this package adopt?*
-- is answered in section 4 and pinned by session U2. Short form: both
siblings ship recipes inside the npm package behind a registry + metadata +
register hook; lite-ui-fx is the only one that tells users to copy-paste
from a GitHub ZIP. That distribution model is why its recipes are untested,
untyped, geometry-broken at non-default sizes, and lie about being zero-GC.

None of the sessions are padding. Each is anchored to a finding ID or to the
growth goal (new element types, new capability surface) the owner set.

---

## 0. Scope correction (do this before anything else)

Verified against the registry and GitHub on 2026-09-06:

| Check | Result |
| --- | --- |
| `npm view @zakkster/lite-ui-fx version` | **1.0.4** (published, live) |
| Published tarball contents | 5 files only: controller, d.ts, package.json, README, llms.txt |
| `github.com/PeshoVurtoleta/lite-ui-fx` | 200 -- repo exists, metadata is NOT cross-wired |
| README's guide link `blob/main/UIFX-RECIPE-GUIDE.md` | **404** (file lives at `recipes/UIFX-RECIPE-GUIDE.md`) |
| Local working tree | **not a git repository** -- no `.git`, no `.gitignore` |

Two corrections before any session lands:

1. **Put the tree under git.** Clone the existing GitHub repo (or `git init`
   and reconcile) so every session below lands as reviewable commits. A
   roadmap over an untracked tree cannot honour its own DONE-WHEN.
2. **Trust nothing the docs count.** package.json:4 and llms.txt:2 say "30
   built-in recipes"; README.md:24 says 50; the three volumes actually export
   50. Grep every count and every path claim in the same pass (U-04) -- the
   404 guide link and the "included in the package" lie survived four patch
   releases exactly the way S-02 survived in lite-scratch-fx.

---

## 1. Shared law (holds every session)

1. **The native element is the source of truth.** The canvas never owns
   state; every visual reads `state`, and `state` reads the native element.
   Keyboard and assistive-tech behaviour must be *identical* to a bare
   native control -- the package's whole pitch is "the native element
   handles accessibility." U-01 is what breaking this law looks like.
2. **The recipe interface is the load-bearing contract.**
   `{ init?(ctx,w,h,padding), tick(ctx,dt,now,state,pointer), onHover?,
   onLeave?, onClick?, onToggle?, onDrag?, destroy?() }`. Fifty built-in
   recipes and every consumer recipe implement it. Any signature change is
   a breaking change 50 times plus consumers -- batch it or do not make it.
3. **One shared ticker, isolated tasks.** All components ride one
   ref-counted RAF loop. A single recipe throwing must never take the loop
   down (U-02). Fail closed at mount (validate the factory result), stay
   alive at tick.
4. **`zero-gc` is a shipped tag, not an aspiration.** package.json:31 lists
   the keyword. Any allocation on a frame, a pointer move, a drag event, or
   a toggle press is a broken guarantee, not a tradeoff. Bytes in a hot
   body, not instructions.
5. **Fail closed on every unverified state.** Unknown option key -> error
   with a did-you-mean hint. Unknown recipe id -> same. A recipe missing
   `tick` -> error at mount, not a TypeError three frames later. Null is
   not zero.
6. **The docs describe the code that exists.** A README selling a file the
   tarball does not carry (U-04) is the same defect class as a broken
   function.
7. **node:test only; the torture gate is the DONE-WHEN.**
   `node --expose-gc test/torture.mjs` (lite-leak + lite-gc-profiler) must
   print ok before any session claims done. Every gate ships a
   deliberately-broken control that exits non-zero (t9).
8. **ASCII-only source** (U+00D7 and U+00B5 excepted). Today every file
   except the d.ts violates this. After U0 the gate greps for it.
9. **Demos consume the package.** A demo that reimplements the library
   inline (U-12) proves nothing and drifts silently. Demos import the real
   entry points and are additionally gated for forced reflow with
   lite-layout-profiler behind `#profile` (a torture harness cannot see
   reflow; the demo law can).

---

## 2. Verified findings

Reproduced on 2026-09-06 against the working tree, the published 1.0.4
tarball, and a live browser harness (real `UIFXController.js` + real
`lite-ticker`, RAF stubbed for deterministic frame stepping). Severity:
**S1** = silent breakage of core function, **S2** = broken documented
guarantee, **S3** = hygiene/contract/law gap.

| ID | Sev | Finding | Reproduction |
| --- | --- | --- | --- |
| **U-01** | **S1** | **Space cannot toggle a toggle; every press fires two spurious `onToggle`s.** The keydown handler ([UIFXController.js:211-217](UIFXController.js)) manually flips `el.checked` and calls `onToggle` on Space/Enter. But a native checkbox *also* activates on Space keyup (spec: activation = click -> `change`). The two flips cancel: checked -> true (manual, `onToggle:true`) -> false (native, `onToggle:false`). Net result: state unchanged, two callbacks. Keyboard users cannot operate the control the package promises is "fully accessible." Enter only works because checkboxes have no native Enter activation. | Browser harness: dispatch `keydown{Space}` -> `checked:true, log:[onToggle:true]`; then `el.click()` (the browser's own Space-keyup activation) -> `checked:false, log:[onToggle:true, onToggle:false]` |
| **U-02** | **S1** | **One malformed recipe permanently freezes every UIFX component on the page.** `mountUIFX` never validates the factory result ([UIFXController.js:166-167](UIFXController.js)); a recipe without `tick` throws `TypeError` inside the shared Ticker's task loop. `Ticker._tick` reschedules RAF on its **last** line with no try/catch ([Ticker.js:168,191](../LiteTicker/Ticker.js)), so the throw unwinds before the reschedule: the loop dies, `running` stays `true`, so no later mount can restart it. No recovery short of destroying every component. | RAF-stubbed harness: healthy probe ticks 3x; mount `() => ({})`; next frame throws `TypeError: recipe.tick is not a function`; pending RAF count 0 on every subsequent step -- loop dead, probe frozen |
| **U-03** | **S2** | **"Zero-GC in all built-in recipes" (llms.txt:69) is false for 49 of 50.** Only SwarmToggle uses typed arrays. The rest allocate on hot paths: object literals pushed per interaction (UIFXRecipes.js:290,349,461; UIFXRecipes2.js:74,102,196,270,348,365,561,650,768; UIFXRecipes3.js:145,680), `splice()` churn in tick loops, **per-frame** template-string colors (~31 sites; unconditional every-frame ones at UIFXRecipes2.js:164-166, UIFXRecipes3.js:454,507), **per-frame `createLinearGradient`** (UIFXRecipes.js:594, UIFXRecipes2.js:400), a **closure allocated per tick** (`drawBase`, UIFXRecipes.js:411), `setLineDash([4,3])` array per focused frame (UIFXRecipes.js:56), and unthrottled per-frame value-label string builds (UIFXRecipes.js:490 et al). The shipped recipe guide's own rule 1 is "Never allocate in tick()". | grep the cited lines; every one sits in `tick` or an interaction hook |
| **U-04** | **S2** | **Docs sell what does not ship.** (a) README.md:191 and llms.txt:58 say the recipe guide is "included in the package"; the published tarball holds 5 files and no guide. (b) README.md:55 links the guide at repo root -> 404; the file lives under `recipes/`. (c) package.json:4 + llms.txt:2 say "30 recipes"; there are 50. (d) llms.txt:16 is syntax-broken (missing opening quote), in a file whose purpose is machine consumption. | `tar -tzf` the registry tarball (5 entries); curl the root guide URL (404) and the `recipes/` URL (200); count exports |
| **U-05** | **S2** | **Recipes misrender at any non-default size.** Knob geometry and spawn positions hardcode the default dimensions: inset 18 baked into formation init (UIFXRecipes.js:95), ring origin `checked ? 46 : 18` correct only at width 64 (UIFXRecipes.js:188), spark spawn `x: val * 200` correct only at width 200 (UIFXRecipes.js:462, UIFXRecipes3.js:680). `options.width` exists and is honoured by the track drawing but not by these -- mount at width 300 and sparks emit from the wrong place. | read the cited lines against `tick`'s `st.w`-derived track math |
| **U-06** | **S2** | **Theming is half-built with three conventions** (the lite-scratch-fx S-04 class, one worse). ConfettiButton takes `colors: string[]` (UIFXRecipes.js:338); SparkSlider takes `color: string` (UIFXRecipes.js:450); FireworkButton holds an internal literal with no option at all (UIFXRecipes2.js:344); the remaining ~45 hardcode hex in the body. No `theme` anywhere. Demo fonts are baked into library recipes at 28 sites ('Space Grotesk', 'JetBrains Mono'). Button labels are hardcoded canvas strings ('MAGNETIC', 'SHATTER', ...), so the accessible `label` option can never match the visible text -- a WCAG 2.5.3 label-in-name failure by construction. | inspect the three factory signatures; grep fonts and label literals |
| **U-07** | S3 (law) | **The test suite cannot run at all.** It is vitest+jsdom (law: node:test only), and it imports `_tickAll`/`_clear` from `@zakkster/lite-ticker` ([UIFXController.test.js:3](UIFXController.test.js)) -- exports the real lite-ticker does not have. So the suite fails at import against the shipped dependency: it was written against a private mock that no longer exists. No `test/` dir, no `torture.mjs`, no lite-leak, no lite-gc-profiler. The package cannot pass its own DONE-WHEN. | `grep _tickAll ../LiteTicker/Ticker.js` -> nothing; `grep vitest package.json` |
| **U-08** | S3 (law) | **Packaging law violations across the board.** No `CHANGELOG.md`, no `LICENSE` file, no `VERSION` export (three-place sync impossible), no `sideEffects: false`. Non-ASCII source throughout: 24 lines in the controller, 120 across the recipe volumes, plus README/llms.txt/guide (em dashes, box-drawing, arrows). Working tree not under git. | perl non-ASCII line counts; `ls` |
| **U-09** | S3 | **Every slider mount leaks a `<style>` into `document.head`**, appended per mount ([UIFXController.js:118-124](UIFXController.js)) and never removed by `destroy()`. N sliders = N duplicate global stylesheets, surviving teardown forever. | Browser harness: 5 slider mounts -> 5 style nodes; destroy all 5 -> still 5 |
| **U-10** | S3 | **Fail-open option surface.** Unknown option keys are silently ignored (`{ widht: 200 }` -> silent 160px default). No initial-value options: slider hardcodes `value='50'` / `val 0.5` (UIFXController.js:99,159), toggle always mounts unchecked -- law: hook initial UI values, never hardcode. No `disabled`. DPR read once at mount (UIFXController.js:87), never on zoom/monitor change. No `prefers-reduced-motion` handling anywhere (both siblings have it). | Browser harness: typo option accepted silently, width fell back to 160px |
| **U-11** | S3 | **`getBoundingClientRect()` on every pointermove** ([UIFXController.js:174](UIFXController.js)) -- a forced-layout read in the hottest handler the package owns; any same-frame style write turns it into forced synchronous reflow (the demo-audit failure mode). Read once on pointerenter, cache, invalidate on scroll/resize. | read the handler |
| **U-12** | S3 | **The demos consume zero shipped code.** None of the three demo pages imports or calls `mountUIFX` (0 references; plain non-module `<script>`); each reimplements controller + recipes inline, so demos prove nothing about the package and drift freely -- this is exactly how U-05 stayed invisible. (Contrast: lite-scratch-fx's demo imports `../index.js`.) Demo CSS also breaks law: `:hover` rules not wrapped in `@media (hover:hover)`, px-everywhere. | `grep -c mountUIFX demo/*.html` -> 0, 0, 0 |
| **U-13** | S3 | **Recipes are distributed as a GitHub ZIP, not as code.** The npm package tells users to copy-paste 2,200 lines from the repo (README.md:57-62). Consequences: recipes are untested (no suite touches them), untyped downstream (recipes/*.d.ts exist locally but ship nowhere), unversioned (no semver contract at all), and invisible to `npm audit`/lockfiles. No registry, no metadata, no register hook -- both siblings ship all three. | tarball listing; recipes/*.d.ts absent from it; compare section 4 |

**On U-01's fix direction, recorded now so nobody "fixes" it backwards.**
The manual keydown flip is the bug; the native activation is the feature.
Delete the manual flip and let Space work natively (`change` fires -> state
-> `onToggle`, exactly once). If Enter support is wanted for the
`role="switch"` idiom, handle Enter by calling `el.click()` -- routing
through native activation so there is exactly one code path that mutates
`checked`. Never flip `el.checked` by hand in two places.

---

## 3. The torture suite (`test/torture.mjs`) -- spec

Built in U0, extended by each later session. This is the DONE-WHEN gate the
suite law requires and the package ships nothing of today (U-07).

### Layout

```
test/
  torture.mjs           # entry: runs tiers in order, prints exactly "ok", exit 0/1
  torture/
    harness.mjs         # DOM + canvas-2d recording stub, RAF stub, seeded PRNG, gc gates
    t0-lifecycle.mjs    # mount/destroy conservation across all types
    t1-degenerate.mjs   # nasty dimensions, options, recipe shapes
    t2-a11y-contract.mjs# the keyboard/state contract (U-01 lives here)
    t3-frame-alloc.mjs  # zero allocation across frames + interactions (U-03 gate)
    t4-soak.mjs         # 4096 mount/interact/destroy cycles, lite-leak kernels
    t5-scale.mjs        # 100 components, one RAF, one ticker
    t9-controls.mjs     # every gate above, deliberately broken, must exit non-zero
```

`test/` never enters `package.json` `files[]`. `npm pack --dry-run` proves it.

### Harness rules (from the shared blueprint, plus what this package needs)

- **DOM in node:** copy the approach lite-ambient-fx already ships in
  `test/_helpers/dom-stub.mjs` / `dom-install.mjs` -- a minimal
  document/element stub plus a recording 2D context. The vitest mock in the
  current test file is 80% of this stub already; port it, do not rewrite it.
- **RAF stub drives frames deterministically.** `requestAnimationFrame`
  replaced by a queue; the harness steps frames by hand. This is exactly how
  U-02 was reproduced, and it makes t3's frame gate exact.
- All mounts, recipe instances, and scratch buffers allocated **once**
  outside gated loops. Assertion messages built only on failure.
- Seeded xorshift PRNG; on failure print seed + op index (`TORTURE_SEED=...`).
- lite-gc-profiler: one measurement at a time, tiers sequential, unknown
  rule keys throw -- read `../LiteGcProfiler/llms.txt` for the live surface.
- lite-leak: register `createListenerOrphanKernel` (the AbortController
  teardown is the exact surface it audits) plus the owner-cascade and timer
  kernels. Neither `cleanup` nor `tag` may close over the mount instance.

### Tier T0 -- lifecycle conservation

Mount/destroy every element type with a counting recipe. Assert: `destroy()`
idempotent; wrapper removed; **`document.head` childCount unchanged after
destroy** (the U-09 gate); ticker refcount returns to zero and the ticker
itself is destroyed when the last component dies; `recipe.destroy()` called
exactly once; events dead after destroy (dispatch -> no callback).

### Tier T1 -- degenerate input

Cross mount with: width/height 0, 1, 4096; padding 0; dpr 0.5/1/3; a recipe
factory returning `{}` (must **throw at mount** post-U1, message naming
`tick`); a factory returning a recipe with an unknown hook key (did-you-mean);
an unknown option key (`widht` -> error naming `width`); a non-function
factory; a null container. Every case: decided policy -- throw, documented
no-op, or documented default. "Silently returns garbage" is not one of the
three.

### Tier T2 -- the accessibility contract (U-01's executable form)

Drive the native element the way a browser does and assert the state
machine: `keydown{Space}` + native activation (`el.click()`) on a toggle =>
**exactly one** `onToggle`, state flipped once; Enter => same; pointer click
=> same; slider `input` => one `onDrag` with matching `state.val`;
focus/blur => `state.focused` mirrors; initial `checked`/`value` options
land in both the native element and `state` before the first frame. Post-U3:
the canvas label text equals the accessible name (label-in-name).

### Tier T3 -- the frame-allocation gate (U-03 lives here)

```js
// shape only -- read ../LiteGcProfiler/llms.txt for the exact current surface
const summary = await measureOps(runHundredFramesWithChurn, { stabilize: 'deep' });
const verdict = checkNoGc(summary, { maxMajor: 0, maxPauseMs: 4 });
```

For **every built-in recipe**: 100 stubbed frames including hover-enter,
drag sweep, toggle press, click burst. Plus direct structural assertions no
heap gate can substitute for: the recording context captures `fillStyle`
assignments -- assert **zero distinct string allocations per frame at steady
state** (a template-literal color fails this even when GC hides it), and
zero `createLinearGradient`/`createRadialGradient` calls after `init`.
Pre-U3 this tier **fails**; that is the executable form of U-03.

### Tier T4 -- soak and retention

`leak_cycles: 4096` cycles of mount / interact / destroy across mixed types.
lite-leak kernels assert no listener, timer, or cascade orphans; sample the
heap across cycles; `document.head` and `document.body` child counts stable;
tracker size returns to 0.

### Tier T5 -- scale

100 components on one page: assert exactly **one** ticker and one RAF chain
(RAF-stub call count), per-frame cost linear in components with **zero
allocation**, and one component's destroy not affecting the other 99. Plus
the U-02 regression: component 50's recipe throws mid-soak -- post-U1 the
loop survives, the broken component is quarantined, 99 keep animating.

### Tier T9 -- controls (the gate must be able to fail)

An allocating recipe (object literal in `tick`) must fail t3; a recipe
leaking a listener on `window` must fail t4; a mount bypassing validation
must fail t1; a hand-rolled double-toggle (the U-01 behaviour, kept as a
control) must fail t2. If a control passes, the gate is decorative.

---

## 4. The restructure target -- where recipes live (the sibling answer)

The two reference packages solved the same problem two ways:

| | lite-ambient-fx (1.8.0) | lite-scratch-fx (1.7.0) | lite-ui-fx today |
| --- | --- | --- | --- |
| Code shape | ONE file (`AmbientFX.js`, 2503 lines) + optional `./worker` entry | `index.js` facade + `src/` modules | flat controller + orphan `recipes/` dir |
| Recipes/presets | inside the main file (`THEMES`) | `src/ScratchRecipes.js`, one file, grouped by family, **shipped** | 3 GitHub-only volumes, **not shipped** |
| Registry | `THEMES` + `registerTheme`, `BEHAVIORS` + `registerBehavior` | `RECIPES` + `registerRecipe` (null-prototype) | none |
| Picker metadata | `THEME_META` | `RECIPE_META` (category, themeable, motionSafe) | none |
| Theming | full OKLCH pipeline inlined, zero deps | `Palette.js` `resolvePalette({ colors, theme })` | three conventions, mostly hardcoded (U-06) |
| Reduced motion | `degradeForReducedMotion` auto | `reducedMotionRecipe` + `motionSafe` meta + decision record | none |
| Tests | 16 numbered node:test files + torture + DOM stubs | 20 node:test files + torture + harness | one vitest file that cannot run (U-07) |
| Demo | consumes the package | imports `../index.js`, data-driven from `RECIPE_META` | inline reimplementation (U-12) |

**Decision for lite-ui-fx (pinned here, recorded as
`decisions/0001-recipes-position.md` in U2):** the scratch-fx position,
delivered through the ambient-fx packaging idiom.

- `UIFXController.js` stays the single PascalCase main file (`.` export) --
  the controller alone remains the < 5 KB install story.
- The three volumes consolidate into **one** `UIFXRecipes.js`, grouped by
  family, shipped in `files[]` and exposed as the **`./recipes` subpath
  export** -- the exact pattern ambient-fx uses for `./worker`. With
  `sideEffects: false`, importing one named recipe tree-shakes the rest;
  "tiny" stops being a distribution hack (ZIP downloads) and becomes what
  it actually is everywhere else in the suite: a bundler guarantee.
- The recipes module (not the controller -- no cycle, controller stays
  dependency-pure) exports `RECIPES`, `RECIPE_META`, `RECIPE_NAMES`,
  `registerRecipe(id, factory, meta)`, mirroring both siblings, plus a
  convenience `mountRecipe(container, id, options)` that resolves the id
  fail-closed (unknown id -> error with did-you-mean) and checks
  `META.type` against the element type (a slider recipe mounted as a toggle
  is an error, not a shrug).
- `RECIPE_META` rows: `{ id, name, type: 'toggle'|'button'|'slider'|...,
  family, themeable, motionSafe }`. The type field is what lets the demo,
  pickers, and t-tier tests be generated instead of hand-listed.

---

## 5. Session order

```
U0 --> U1 --> U2 --> U3 --> U4 --> U7 --\
                       \--> U5 --> U6 ---+--> U8
```

`U0` (truth + law + harness) blocks everything: no later session can prove
itself without the gate, and nothing should ship on top of a description
that lies. `U1` fixes the two S1s next -- they are live in 1.0.4 and every
day of delay ships a toggle keyboard users cannot operate. `U2` (the
restructure) must precede `U3` (the recipe sweep) so the sweep runs once
over one consolidated file, not twice over three volumes. `U4` (new element
types) builds on the registry's `type` metadata from U2 and the option/theme
shape from U3. `U5` (host integration) is independent of U4 and may run in
parallel. `U6` (blueprint docs + consumer demo) documents the surface
U2-U5 finish. `U7` (grouped controls) is the far edge of the element
vocabulary and the only candidate for a major. `U8` (the enrichment
session) runs last, after everything else is fulfilled: it skins
lite-headless primitives through the decorate mode and grows the recipe
catalog along verified market demand -- it needs the adapter surface (U4),
the option convention (U3), the registry (U2), and the demo (U6) all
settled first.

Every release is additive until U7 decides otherwise: 1.0.5, 1.1.0, 1.2.0,
1.3.0, 1.4.0, 1.5.0, 1.6.0, then 1.7.0 or 2.0.0, then U8 on top of
whichever U7 shipped.

---

## 6. The briefs

===============================================================================
# U0 -- lite-ui-fx v1.0.5 -- truth pass, law pass, torture skeleton
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.0.5
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-gc-profiler", "@zakkster/lite-leak"]
findings: [U-04, U-07, U-08]
blocks: [U1, U2, U3, U4, U5, U6, U7]
---

# lite-ui-fx -- stop lying, obey the law, stand up the gate

PURPOSE
  Nothing in this session changes behaviour. It makes the package honest
  (docs describe what ships), lawful (ASCII, node:test, CHANGELOG, LICENSE,
  VERSION, sideEffects), and provable (the torture skeleton every later
  session leans on). It ends with an honest 1.0.5 on the registry.

TASKS
  - Put the tree under git (clone PeshoVurtoleta/lite-ui-fx or init +
    reconcile); add .gitignore (node_modules, *.tgz).
  - U-04 truth pass: fix the count to 50 everywhere (package.json:4,
    llms.txt:2); fix README.md:55 to the recipes/ path; delete every
    "included in the package" claim for files the tarball does not carry,
    or add the guide to files[] and make the claim true (do the latter --
    it is one line); repair llms.txt:16.
  - U-08 law pass: ASCII sweep over every file (controller, 3 volumes,
    guide, README, llms.txt, test) -- "->", "--", "x"; add CHANGELOG.md
    (backfill 1.0.0..1.0.4 from npm publish dates, then a 1.0.5 entry
    naming U-04/U-07/U-08), LICENSE (MIT, Zahary Shinikchiev), VERSION
    export in UIFXController.js, "sideEffects": false. README and
    CHANGELOG.md into files[].
  - U-07: delete the vitest suite's dead dependency on _tickAll/_clear.
    Port UIFXController.test.js to node:test + assert/strict under test/,
    reusing its canvas mock as the harness stub (see section 3). Remove
    vitest from devDependencies; "test": "node --test test/*.test.mjs".
    devDeps: @zakkster/lite-gc-profiler, @zakkster/lite-leak.
  - Build test/torture.mjs + test/torture/harness.mjs per section 3. Wire
    t0, t1 (current fail-open behaviour pinned AS-IS with TODO markers to
    flip in U1), t4, t9 now; register t2, t3, t5 as named empty tiers that
    U1/U3 fill.
  - npm publish 1.0.5.

ASSERTIONS
  - node --test green; node --expose-gc test/torture.mjs prints ok, exit 0.
  - t9 controls exit non-zero.
  - perl non-ASCII scan: 0 lines outside U+00D7/U+00B5 across the package.
  - npm pack --dry-run: guide, CHANGELOG, LICENSE, README, llms.txt in;
    test/ and demo/ out.
  - grep finds no "30 built-in", no root-level guide link, no vitest.

NON-GOALS
  No behaviour change. No recipe move (U2). U-01/U-02 stay broken one more
  session and are named as known issues in the CHANGELOG.

DONE WHEN
  1.0.5 live; every doc claim true; gate green; controls fail; tree in git
```

===============================================================================
# U1 -- lite-ui-fx v1.1.0 -- controller correctness (both S1s die here)
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.1.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: [U-01, U-02, U-09, U-10, U-11]
depends_on: [U0]
blocks: [U2]
---

# lite-ui-fx -- a keyboard that works, a loop that survives, a mount that
# fails closed

PURPOSE
  The two S1s and the three controller-level S3s. After this session the
  native element is genuinely the source of truth (law 1), a bad recipe is
  an error at mount instead of a page-wide freeze, and the option surface
  fails closed.

TASKS
  - U-01: delete the manual keydown checked-flip. Space now works via
    native activation alone (change -> state -> onToggle, once). Keep Enter
    support for the switch idiom via el.click() so activation has exactly
    one path. Extend t2 with the full contract from section 3.
  - U-02, part A (fail closed at mount): validate the factory and its
    result before any wiring -- factory is a function; result is an object;
    tick is a function; every present hook name is one of the eight known
    keys, else error with did-you-mean. Torture t1 flips its TODO pins.
  - U-02, part B (survive at tick): wrap the per-component tick entry so a
    throwing recipe disables THAT component (one console.error naming the
    recipe, component quarantined, canvas cleared) while the shared loop
    and every other component keep running. t5 gains the mid-soak-throw
    regression. (The un-rescheduled-RAF flaw in lite-ticker itself is filed
    with that package; this package must not depend on the fix.)
  - U-09: hoist the slider-thumb CSS to one module-level shared <style>,
    injected on first slider mount, removed when the last component
    unmounts (refcount beside the ticker's). t0 asserts head childCount
    conservation.
  - U-10: unknown option keys -> error with did-you-mean. New options,
    all hooked into native element AND state before the first frame:
    value (slider initial, 0..1), checked (toggle initial), disabled
    (native disabled attr + state.disabled for recipes to render). DPR
    re-read via matchMedia('(resolution: ...)') listener; canvas re-scaled
    on change (cold path).
  - U-11: cache the bounding rect on pointerenter; refresh on scroll and
    resize (passive listeners, cold path); pointermove does arithmetic
    only.

HOT PATH
  The validation added here runs at mount (cold). Diff tick and pointermove
  bodies: the quarantine wrapper adds one flag check per component per
  frame -- bytes in the body are the budget, measure with t3's structural
  assertions once U3 fills them. pointermove after U-11: zero layout reads.

ASSERTIONS
  - t2: one Space press = one onToggle, state flipped once. Enter same.
  - Mount with { widht: 200 } throws naming width. Factory returning {}
    throws at mount naming tick. Unknown hook key throws with did-you-mean.
  - t5 regression: 1 throwing component out of 100, 99 keep ticking.
  - t0: mount/destroy 5 sliders -> head childCount delta 0.
  - { value: 0.3 } mounts with el.value 30 and state.val 0.3 pre-frame.
  - torture ok; t9 controls (double-toggle control, validation bypass) fail.

NON-GOALS
  No recipe file changes (U2/U3). No new element types (U4). No visual
  changes at defaults.

DONE WHEN
  keyboard contract green; one bad recipe cannot kill the page; every
  unverified mount input is an error; style/head conservation holds
```

===============================================================================
# U2 -- lite-ui-fx v1.2.0 -- recipes into the package (the restructure)
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.2.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: [U-13]
depends_on: [U1]
blocks: [U3, U4]
---

# lite-ui-fx -- ship the recipes, stand up the registry

PURPOSE
  Execute the section 4 decision. Fifty recipes stop being a ZIP download
  and become versioned, typed, tested, tree-shakeable code behind the same
  registry surface both siblings ship. Record it in
  decisions/0001-recipes-position.md BEFORE coding.

TASKS
  - Consolidate UIFXRecipes.js + UIFXRecipes2.js + UIFXRecipes3.js into one
    UIFXRecipes.js at package root, grouped by family, export names
    unchanged. Merge the three d.ts into UIFXRecipes.d.ts. Delete the
    recipes/ dir; the guide moves to package root (files[] path updated).
  - Add exports["./recipes"] with types; recipes file + d.ts into files[].
    Controller export untouched; controller imports nothing from recipes.
  - Build RECIPES (null-prototype), RECIPE_META ({ id, name, type, family,
    themeable: false-for-now, motionSafe: false-for-now }), RECIPE_NAMES,
    registerRecipe(id, factory, meta) -- port the lite-scratch-fx
    implementation including its meta-merge semantics.
  - mountRecipe(container, id, options): resolves RECIPES[id] fail-closed
    (did-you-mean over RECIPE_NAMES), asserts META.type matches, delegates
    to mountUIFX.
  - Extend the torture harness to iterate RECIPE_META instead of a
    hand-list: t0/t1 now run every recipe by construction; new
    registry.test.mjs ports the scratch-fx registry suite (register,
    override, meta fallback, null-prototype).
  - README: replace the ZIP/copy-paste section with the ./recipes import
    story (full rewrite waits for U6). llms.txt: new import lines.

HOT PATH
  Module evaluation only; no runtime change. Verify tree-shaking with a
  2-line esbuild smoke script in test/ (bundle importing one recipe; assert
  output lacks the names of five others) -- a guarantee in the README must
  be executable somewhere.

ASSERTIONS
  - import { SwarmToggle } from '@zakkster/lite-ui-fx/recipes' works; all
    50 names re-exported; RECIPE_NAMES.length === 50.
  - mountRecipe(c, 'swrm') throws naming 'swarm'. mountRecipe with a
    slider recipe id and a toggle container type throws.
  - registerRecipe round-trips and updates META in place (picker liveness).
  - npm pack --dry-run: recipes + d.ts + guide in; demo/, test/ out.
  - torture ok across all 50 via META iteration; t9 control fails.

NON-GOALS
  No recipe body edits (U3 sweeps them). No theming yet -- META.themeable
  stays false until U3 makes it true. Demo untouched until U6.

DONE WHEN
  one recipes module shipped and typed; registry live; META drives the
  suite; ZIP story gone
```

===============================================================================
# U3 -- lite-ui-fx v1.3.0 -- the recipe sweep: zero-GC, size-true, themeable
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.3.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-gc-profiler"]
findings: [U-03, U-05, U-06]
depends_on: [U2]
blocks: [U4]
---

# lite-ui-fx -- fifty recipes that keep the package's own promises

PURPOSE
  One sweep over the consolidated file fixing the three S2s together,
  because they touch the same fifty factory bodies: allocation-free frames
  (U-03), geometry derived from state (U-05), one option convention with
  theming (U-06). Doing these as three separate sweeps means reading 2,200
  lines three times; batch them.

THE DECISION (record as decisions/0002-recipe-options.md before coding)
  One option shape across all 50 factories:
    { seed?, colors?: string[], theme?: {light, mid, dark}, text?: string,
      font?: string, ...recipe-specific knobs }
  colors wins over theme; theme maps {light, mid, dark} onto each recipe's
  ramp; defaults are DEFAULT_<NAME> consts seeded from today's literals so
  a bare factory renders identically. The {light, mid, dark} shape matches
  lite-scratch-fx so a themed host drives both packages with one object.
  Legacy one-offs (ConfettiButton colors, SparkSlider color) keep working
  as documented aliases for one minor. text replaces every hardcoded canvas
  label and mountUIFX feeds options.label through as the default text --
  closing the WCAG label-in-name gap by construction.

TASKS
  - U-03 sweep, per recipe: palette resolution and ramp arrays in init
    (cold); per-frame alpha via ctx.globalAlpha + const color strings,
    never template-literal rgba; particle pools as preallocated typed-array
    lanes (or fixed-size object pools with dead flags) sized by the
    recipe's own max -- no push/splice on interaction; gradients built in
    init and rebuilt only when the driving value crosses a threshold, never
    per frame; the drawBase closure hoisted; setLineDash([4,3]) replaced by
    a module-level const array; value-label strings rebuilt at ~10Hz via
    frame-counter mask, not per frame.
  - U-05 sweep: every constant that is actually a function of st.w/st.h
    (18, 46, val*200) becomes that function. Add a t1 case mounting every
    recipe at width 300 and asserting draw calls stay inside the padded
    canvas and track within bounds.
  - U-06 sweep: apply the decision to all 50; fonts become options
    defaulting to the current strings; META.themeable flips true per recipe
    as it lands (the suite iterates META, so coverage is automatic).
  - Fill torture t3 completely (section 3): heap gate + recording-context
    structural gates, per recipe, with interaction churn. Register the
    pre-sweep failure of t3 before fixing anything -- the gate must be seen
    to fail on 1.2.0 code.
  - Update UIFXRecipes.d.ts (one RecipeOptions base), llms.txt, guide
    (rewrite the "splice is fine" performance section -- it now contradicts
    the gate).

HOT PATH
  This session IS the hot path. The t3 structural gates are the review:
  zero string allocations at steady state, zero gradient constructions
  after init, zero pool growth after init. Sprite-cache glow (shadowBlur is
  per-frame expensive) only where t3 timing shows it matters -- borrow
  lite-ambient's sprite cache pattern, do not invent one.

ASSERTIONS
  - Every recipe with no options: identical draw-call sequence to 1.2.0 at
    default size (recording-context diff), colors byte-equal.
  - Every themeable recipe honours colors and theme; colors wins; legacy
    aliases work; custom text renders and equals the accessible name (t2).
  - Width-300 mounts render correctly (U-05 gate).
  - t3 green across all 50 with maxMajor 0; t9 allocating-recipe control
    fails t3.

NON-GOALS
  No interface change to the recipe contract (law 2). No new recipes, no
  new element types (U4). No demo work (U6).

DONE WHEN
  t3 green for 50/50; one option convention; every size-dependent constant
  derived; zero-gc keyword true for the first time
```

===============================================================================
# U4 -- lite-ui-fx v1.4.0 -- new element types: checkbox, knob, progress,
# decorate mode
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.4.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: []
depends_on: [U3]
blocks: [U7]
---

# lite-ui-fx -- grow the element vocabulary without faking semantics

PURPOSE
  Vol. 3 already fakes richer controls on the three existing types --
  checkboxes as role=switch toggles, knobs and progress meters as sliders
  and buttons. The growth path is to promote the fakes to real native
  semantics, keeping law 1: every new UIType wraps the correct native
  element and inherits its keyboard behaviour for free.

TASKS
  - UIType.CHECKBOX: <input type=checkbox> WITHOUT role=switch (a check is
    not a switch; the current TOGGLE mounting of RippleCheck/MorphCheck is
    semantically wrong). Supports indeterminate via setValue. Re-home
    RippleCheck, MorphCheck; new recipes: TickDraw (stroke-drawn check),
    IndeterminateScan.
  - UIType.PROGRESS: native <progress> element (non-interactive), value
    driven programmatically; optional aria-live="polite" announcements at
    configurable thresholds. Re-home RingProgress, BatteryGauge,
    SignalMeter, UploadProgress; new recipe: LiquidFill.
  - UIType.KNOB: <input type=range> with { knobMode: 'rotate' | 'vertical' }
    pointer mapping on the canvas side while arrow keys stay native.
    Re-home VolumeKnob, CompassKnob.
  - decorateUIFX(el, recipeFactory, options): the second mount mode -- a
    canvas positioned around an EXISTING visible element (no hijack, no
    opacity:0). Wires the same state from the element's own events; value
    read from the element when it is an input. This is what
    PasswordStrength and TypewriterField actually are (a visible text
    field cannot be opacity:0 -- the current vol.3 framing of them is
    unusable for real inputs). Re-home both; new decoration recipes:
    FocusHalo, ErrorShake, SuccessBloom -- generic form feedback, the most
    reusable surface this package can grow.
  - instance.setValue(v) / instance.setChecked(b): programmatic sync of
    native element + state + recipe hook in one call (today, writing
    el.value fires no event and desyncs the canvas silently -- t2 pins the
    fix).
  - RECIPE_META.type gains the new types; mountRecipe type checks extend;
    torture tiers iterate the new types by construction.
  - d.ts, llms.txt, README delta, CHANGELOG.

HOT PATH
  decorate mode adds zero per-frame work beyond the recipe itself: the
  element rect is cached (U-11 pattern) and re-read only on resize/scroll.
  New recipes are born under t3 -- they never get a pre-gate era.

ASSERTIONS
  - CHECKBOX has no switch role; PROGRESS exposes value to AT via the
    native element; KNOB arrow keys move value natively (t2 extensions).
  - setValue(0.7) updates el, state.val, and fires the recipe hook, once.
  - decorateUIFX leaves the host element visible, focusable, unmodified
    except the overlay; destroy restores exactly (DOM diff in t0).
  - All re-homed + new recipes pass t1/t2/t3 at default and width-300.
  - torture ok; t9 control (decorate leaking a host mutation) fails t0.

NON-GOALS
  No multi-element groups (radio/tabs/stepper/rating are U7 -- they need a
  group contract, not a fourth fake). No timer/animation recipes beyond the
  listed set.

DONE WHEN
  three new types + decorate mode shipped; vol.3 fakes re-homed onto true
  semantics; every new surface born gated
```

===============================================================================
# U5 -- lite-ui-fx v1.5.0 -- host integration: driven mode, budget, reduced
# motion
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.5.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-ticker"]
findings: []
depends_on: [U3]
blocks: [U6]
---

# lite-ui-fx -- one clock for a game UI, calm frames for everyone else

PURPOSE
  The package is keyword-tagged "game" but forces its own RAF loop; a game
  running lite-ticker gets a second clock it cannot control. And nothing
  respects prefers-reduced-motion in a package whose entire output is
  motion. Both siblings solved both; adopt their shapes.

TASKS
  - { ticker } mount option: a caller-supplied lite-ticker instance drives
    this component; the internal shared ticker is neither created nor
    ref-counted for it. One clock, N components, dt computed once
    (the lite-scratch-fx decisions/0002 shape -- adopt, do not reinvent).
  - { driven: true } + instance.tick(dtMs): no RAF at all; the host calls
    tick. Mutually exclusive with ticker; both mutually exclusive with the
    default -- unknown combinations fail closed.
  - Reduced motion: matchMedia('(prefers-reduced-motion: reduce)') read at
    mount and watched (cold listener). state.reducedMotion exposed to every
    recipe; the U3 sweep's ramps make honouring it cheap (recipes clamp
    particle counts / swap to fades). META.motionSafe flips true per recipe
    as it lands; mountRecipe warns when mounting a motionSafe:false recipe
    under active reduce (documented, not an error -- hosts may have their
    own toggle).
  - Frame budget: adopt lite-ambient's createFrameBudget shape --
    state.budget (0..1) degrades glow/pool sizes when the frame overruns;
    recipes consume it or ignore it, META documents which.
  - t5 extensions: N driven components under one stubbed host clock tick
    deterministically; a driven tick with no dirty state allocates nothing.

HOT PATH
  instance.tick(dtMs) must cost exactly what the internal path costs -- no
  wrapper closure, no allocation; t5 measures both paths against each
  other. The reduced-motion and budget checks are one number read per
  frame, resolved at mount.

ASSERTIONS
  - Default path byte-identical to 1.4.0 (no regression when neither
    option is passed).
  - A lite-ticker host drives 50 components; destroy does not stop the
    caller's ticker (ownership stays with the caller).
  - driven tick determinism: same dt sequence, same draw-call sequence.
  - reducedMotion true swaps SwarmToggle (and every motionSafe:false
    recipe that opts in) to its calm path; t3 still green under it.
  - torture ok; t9 control (driven mode that allocates per tick) fails.

NON-GOALS
  No worker mode -- a 200x48 UI canvas does not amortise a worker hop;
  write that into "What this is not" (U6). No behaviour change on default
  mounts.

DONE WHEN
  a game runs UIFX under its own clock; reduce-motion users get calm
  controls; budget degrades before frames drop
```

===============================================================================
# U6 -- lite-ui-fx v1.6.0 -- blueprint docs + a demo that consumes the package
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.6.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: [U-12]
depends_on: [U5]
blocks: []
---

# lite-ui-fx -- docs on the blueprint spine, a demo that cannot drift

PURPOSE
  The README predates the LiteSepforge blueprint; the demos reimplement the
  library inline and prove nothing (U-12). After U2-U5 the surface is
  stable enough to document once, properly, and to rebuild the demo as a
  real consumer that the recipe registry generates.

TASKS
  - README rewritten on the LiteSepforge spine, in order: title + one-line
    blockquote tagline; badges; positioning H2 ("The canvas
    microinteraction layer the ecosystem was missing") with inline install
    + runnable quick-start; TOC; Why this exists; What you get; <details>
    deep-dive on the recipe interface + mount modes; API reference
    (signatures + a constants table: UITypes, state fields, META fields);
    Composability (one full pipeline: lite-ticker host + theme shared with
    lite-scratch-fx + lite-color ramps); <details> Zero-GC design notes
    with the allocation table (what is preallocated where, per recipe
    family) + the gated t3 numbers; Design decisions worth knowing (link
    decisions/); Testing (real counts + npm scripts); What this is not (no
    React bindings, no component framework, no worker mode, not a chart
    library); Ecosystem; License. ASCII-only.
  - llms.txt rewritten to the live surface: both entry points, registry,
    META, mount modes, all types, the 50+ recipe catalog by family --
    machine-checkable claims only.
  - Demo: replace the three inline pages with ONE demo/index.html that
    imports ../UIFXController.js and ../UIFXRecipes.js via importmap and
    generates the gallery from RECIPE_META (family sections, type-correct
    mounts, theme switcher proving U3, reduce-motion toggle proving U5).
    Demo CSS per law: hex-first colors, :hover under @media (hover:hover),
    rem defaults. lite-layout-profiler behind #profile, drive every
    control, violationCount === 0.
  - Grep the finished docs for stray tool-call tags and non-ASCII before
    trusting them (blueprint law).

ASSERTIONS
  - Every code block in README runs as written against the published
    package (a doc-snippet smoke test in test/ extracts and executes
    them -- the blueprint's "docs describe the code" made executable).
  - Demo mounts 50+ recipes exclusively through public exports; grep
    finds zero inline recipe reimplementations.
  - #profile run reports violationCount 0 across a full drive of every
    control.
  - torture ok (unchanged code paths; the gate simply must not rot).

NON-GOALS
  No API changes. No new recipes.

DONE WHEN
  README matches the blueprint spine claim-for-claim; one demo, generated
  from META, importing only public exports, reflow-clean under #profile
```

===============================================================================
# U7 -- lite-ui-fx v1.7.0 (or 2.0.0) -- grouped controls
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.7.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: []
depends_on: [U4]
blocks: []
---

# lite-ui-fx -- radio, tabs, stepper, rating: one canvas, N native elements

PURPOSE
  The last vol.3 fakes (RadioOrbit, PillTabs, Stepper, BubbleRating) are
  multi-value controls faked on single elements, which is why their arrow-
  key behaviour is wrong today. A grouped control is N native elements
  (radios in a fieldset, tabs in a tablist, a spinbutton, a rating
  radiogroup) sharing ONE canvas and one recipe. This is the far edge of
  the element vocabulary and the only place a major might be forced.

THE DECISION (record as decisions/0003-group-contract.md before coding)
  Two questions, both answered in the record before the diff exists.

  1. The contract. mountUIFXGroup(container, groupType, recipeFactory,
  { items, ... }) returns { els, canvas, wrapper, state, setIndex(),
  destroy() }. Group state extends the scalar state with SoA lanes: index
  (selected), count, and per-item Float32Array geometry the recipe reads
  by index. Recipes gain one optional hook, onSelect(index, state). IF
  pinning this hook or the state extension forces any change to the
  existing eight-hook contract, THIS session becomes 2.0.0 and batches
  every wanted interface change in one major (law 2); otherwise it ships
  additively as 1.7.0.

  2. Who owns the behaviour. @zakkster/lite-headless already ships
  ARIA-correct tabs, radio-group, toggle-group, stepper, rating and steps
  primitives with the APG keyboard walks done and playwright-tested.
  Reimplementing that roving-tabindex logic here is the one duplication
  this suite should refuse. Weigh:
    A. Standalone: UIFX builds the (small) native-element wiring itself --
       radios and rating are free (native roving), tabs/stepper need real
       keyboard code. Zero coupling; "drop one call, get a flashy tab bar."
    B. On lite-headless: the group mount composes the per-primitive
       subpath (e.g. lite-headless/tabs) as an optional peer, the way
       lite-headless itself treats lite-floating -- UIFX renders, headless
       behaves.
  Default expectation: A for RADIO and RATING (native semantics carry
  them), B considered seriously for TABS and STEPPER. Either way the U8
  adapter covers the composed path; do not build B twice.

TASKS
  - GroupType.RADIO: fieldset + N <input type=radio name=...>; roving
    selection and arrow keys are native. Re-home RadioOrbit.
  - GroupType.TABS: tablist/tab pattern per the ARIA APG -- buttons with
    role=tab, arrow-key roving tabindex implemented ON the native buttons
    (cold path), canvas draws the strip. Re-home PillTabs; new recipe
    SegmentedSlide.
  - GroupType.STEPPER: <input type=number> spinbutton semantics. Re-home
    Stepper.
  - GroupType.RATING: radiogroup of N radios. Re-home BubbleRating.
  - One canvas per group; per-item hit state derived from the native
    elements' cached rects (U-11 pattern, one read per layout change).
  - META.type gains group types; mountRecipe extends; torture tiers pick
    the group types up via META; t2 gains the APG keyboard walks (arrows,
    Home/End for tabs).

HOT PATH
  Group tick reads SoA lanes by index -- no per-item objects, no per-frame
  rect reads. t3 runs group recipes at N=2, 5, 12; t5 runs 20 groups of 5.

ASSERTIONS
  - Radio/rating arrow keys move selection natively; tabs arrows follow
    APG; every move fires onSelect exactly once with the right index.
  - Screen-reader tree per pattern: fieldset legend, tablist/tab roles,
    spinbutton value text (assert attributes; the tree is the contract).
  - Re-homed group recipes pass t1/t2/t3; single-element API untouched
    (1.7.0 path) or every break batched + documented (2.0.0 path).
  - torture ok; t9 control (a group recipe allocating per item per frame)
    fails t3.

NON-GOALS
  No listbox/combobox/menu (genuinely hard ARIA surfaces; a future roadmap
  earns them separately). No virtualisation.

DONE WHEN
  four group types with native keyboard semantics; vol.3's last fakes
  re-homed; the major-or-minor decision recorded and honoured
```

===============================================================================
# U8 -- lite-ui-fx v1.8.0 -- the enrichment session: headless skins + the
# demand-driven catalog
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.8.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-headless (compose-target only, never a dep)"]
findings: []
depends_on: [U6, U7]
blocks: []
---

# lite-ui-fx -- skin the headless suite, grow where the demand is verified

PURPOSE
  Two enrichment tracks, run only after the core roadmap is fulfilled.
  Track 1: @zakkster/lite-headless ships 59 ARIA-correct primitives that
  deliberately render nothing -- and paint a documented state-attribute
  CSS contract for exactly this purpose. UIFX's decorate mode (U4) is the
  missing visual half: one adapter turns 59 behaviour surfaces into recipe
  targets without UIFX owning a line of ARIA. Track 2: the market evidence
  (recorded below so the priorities outlive the trend pages) shows a large,
  verified appetite for per-element, copy-paste-grade, visually theatrical
  UI pieces -- and that every dominant supplier is React- and/or
  Tailwind-locked. UIFX after U1-U6 is the only shape in the niche that is
  simultaneously extraordinary AND correct (native a11y, zero-GC, reduced
  motion) AND framework-free. Grow the catalog along that wedge.

THE EVIDENCE (pin it; re-verify before reprioritising, not before building)
  Recorded 2026-09-06: React Bits ~37k stars, #2 JavaScript Rising Stars
  2025, built on text animations + micro-interactions; Aceternity UI ~28k
  stars / 200+ theatrical components; Magic UI ~21k stars, the shadcn
  ecosystem's animation layer; uiverse.io ~7,400 community copy-paste
  elements from ~358k contributors. All React/Tailwind-locked or raw-CSS
  with no behaviour guarantees. The vanilla side is fragmented and small
  (Micron.js: CSS-only, dated; Monochrome: accessible but visually plain).
  The open corner: canvas-grade visuals + real native semantics +
  framework-free + agent-readable (llms.txt, META). That corner is this
  package's, and the suite's, to take.

THE DECISION (record as decisions/0004-headless-skins.md before coding)
  The adapter couples through the PAINTED CONTRACT, not through imports.
  skinHeadless(handle, recipeFactory, options) (shipped from a new
  ./headless subpath) accepts any lite-headless handle duck-typed as
  { attach* applied, destroy() } plus the host element, and drives recipe
  state by observing the primitive's painted data-* state attributes (one
  MutationObserver, cold path, preparsed at init -- never per-frame reads)
  and, where the handle exposes signals, an optional reactive fast path.
  lite-headless never appears in dependencies; the subpath works against
  any version honouring the attribute contract. This is the same
  arm's-length idiom lite-headless itself uses for lite-floating.

TASKS
  - Track 1 -- the skin pack. skinHeadless + a 'headless-skin' recipe
    family, launched where canvas adds the most over CSS: meter + progress
    (liquid/ring/battery reuse from U4), skeleton (shimmer), rating,
    switch, slider, steps, pin-input (per-digit pop), file-upload
    (progress burst), toast (entrance particles), command-palette (glow
    frame), color-picker (canvas wheel -- the one primitive whose visual
    IS a canvas job). Each skin is a normal recipe: registered, themed
    (U3 shape), gated (t3), listed in META with family 'headless-skin'.
  - Track 2 -- demand-driven families, scoped to what UIFX is FOR
    (controls + decorations on real elements):
      text-fx decorations (decorate mode over visible DOM text: shimmer,
        scramble-in, spotlight-follow, underline-draw) -- the React Bits
        core category, absent in vanilla;
      cursor/pointer decorations (magnetic pull, trail, proximity glow on
        cards and buttons);
      card decorations (border-beam, tilt-shine, focus-halo family from U4
        extended);
      loader family growth (the two existing + 6 new, all budget-aware).
    Explicitly NOT here: fullscreen backgrounds and atmospheres
    (lite-ambient-fx's territory) and reveal effects (lite-scratch-fx's).
    Add a "family map" section to the README routing those wants to the
    siblings -- the suite answers Aceternity together, one package does not.
  - Demo: gallery gains a per-recipe "copy the import" snippet (the
    uiverse-style acquisition path, pointed at versioned imports instead
    of paste-drift) and a combined page mounting lite-headless primitives
    skinned live -- the two-package pitch, consuming only public exports.
  - llms.txt + README: skin catalog, family map, adapter contract.

HOT PATH
  The adapter observes attributes; recipes still tick under the shared (or
  driven) clock. Attribute parse happens in the observer callback (event
  time, not frame time) into preallocated state slots. t3 runs every skin
  and every new recipe; text-fx decorations additionally pass the U6
  #profile reflow gate (they sit over live DOM text -- the one place this
  package can cause layout reads; read metrics once at init and on resize
  only).

ASSERTIONS
  - A lite-headless switch/slider/rating/progress skinned by UIFX: the
    primitive's own playwright-grade semantics untouched (attribute diff
    before/after skin mount is additive-only), visuals driven, destroy
    restores exactly.
  - skinHeadless works with zero lite-headless imports anywhere in this
    package (grep proves it); version floor documented as the attribute
    contract, not a semver range.
  - Every new recipe: t1/t2/t3 green at default + width-300, themed via
    the U3 shape, present in META, mounted in the demo from META.
  - Text-fx decorations: violationCount 0 under #profile across a full
    drive.
  - torture ok; t9 control (a skin that polls attributes per frame) fails.

NON-GOALS
  No overlay behaviour of any kind (focus traps, dismiss stacks,
  positioning -- lite-headless owns behaviour, permanently). No React/
  framework wrappers (a future decision, not this session). No marketing
  site -- the demo is the showcase.

DONE WHEN
  59 primitives are one adapter call away from extraordinary; the catalog
  covers the verified demand categories inside UIFX's scope; the family
  map routes the rest to the siblings; every addition born under the gate
```

---

## 7. What lands, in order

| Session | Release | Findings | Breaking? | Unblocks |
| --- | --- | --- | --- | --- |
| **U0** | 1.0.5 | U-04, U-07, U-08 | no | the suite law (gate); honest registry listing |
| **U1** | 1.1.0 | U-01, U-02, U-09, U-10, U-11 | no (bugfixes) | keyboard users; page-stability under bad recipes |
| **U2** | 1.2.0 | U-13 | no | versioned/typed/tested recipes; pickers via META |
| **U3** | 1.3.0 | U-03, U-05, U-06 | no (defaults preserved) | the zero-gc keyword; themed hosts; custom sizes |
| **U4** | 1.4.0 | -- | no | checkbox/knob/progress semantics; decorate mode |
| **U5** | 1.5.0 | -- | no | game hosts (one clock); reduced-motion users |
| **U6** | 1.6.0 | U-12 | no | blueprint docs; a demo that cannot drift |
| **U7** | 1.7.0 or 2.0.0 | -- | decided in 0003 | radio/tabs/stepper/rating |
| **U8** | 1.8.0 | -- | no | 59 lite-headless primitives as skin targets; the demand-verified catalog |

With U0 the package stops lying and gains its gate. With U1 the two live
S1s die and the mount fails closed. With U2+U3 the recipes become what the
README always claimed they were: shipped, themeable, zero-GC, size-true.
With U4-U7 the package grows from three element types to ten-plus two mount
modes -- every new surface wrapping real native semantics and born under
the torture gate, so the growth track can never reintroduce the class of
defect this roadmap exists to remove. And with U8 the package stops being
an island: lite-headless supplies the behaviour it will never reimplement,
UIFX supplies the visuals nothing in the vanilla ecosystem matches, and
the catalog grows along demand that was measured, not guessed.
