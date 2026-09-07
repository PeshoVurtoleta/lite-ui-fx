# 0006 -- Blueprint docs + a demo that consumes the package (U6)

Status: accepted (U6, v1.8.0)
Depends on: 0001 (registry), 0002 (recipe options), 0003 (element types),
0004 (decorate mode), 0005 (host clock)

## Context

After U2-U5 the surface is stable and additive-complete: two mount modes, 56
recipes behind RECIPES/RECIPE_META, one option convention, three clock modes,
reduced motion, frame budget. But the README predates the LiteSepforge blueprint
spine, and the three demo pages reimplement the controller and recipes inline
(U-12): `grep -c mountUIFX` over each is 0, none is `type="module"`, none imports
`../`. They prove nothing about the shipped code and drift freely -- exactly how
U-05 (size-broken geometry) stayed invisible for four releases. U6 changes no
behaviour; it documents the surface once on the spine and rebuilds the demo as a
real consumer.

## Decision 1 -- README on the blueprint spine, ASCII-only, measured facts only

The README is rewritten to the LiteSepforge spine, in order: title + one-line
blockquote tagline; badges; a positioning H2 ("The canvas microinteraction layer
the ecosystem was missing") with inline install + a runnable quick-start; TOC;
Why this exists; What you get; a `<details>` deep-dive ("Two mount modes + the
recipe contract"); API reference (signatures + a constants table: UITypes, state
fields, RECIPE_META fields); Composability (one real end-to-end pipeline -- a
lite-ticker host clock driving UIFX, a theme object shared with lite-scratch-fx);
a `<details>` Zero-GC design notes (a per-family allocation table + the gated t3
fact); Design decisions worth knowing (links to 0001-0006); Testing (real counts
+ the two npm scripts); What this is not; Ecosystem; License with the (c) line.

REMOVED: the three CodePen "Live Demo" links (they point at the inline demos that
die with U-12) and the marketing "Comparison" table (`< 5 KB`, competitor KB) --
blueprint law is measured numbers only, no marketing adjectives. The shipped demo
is the live showcase; a grounded install-size note replaces the KB table.

## Decision 2 -- one demo, generated from RECIPE_META, importing only public exports

The three inline pages are deleted; `demo/index.html` replaces them. It imports
ONLY `../UIFXController.js` and `../UIFXRecipes.js` through an importmap and
reimplements nothing. The importmap maps exactly the three bare specifiers the
package imports (@zakkster/lite-ticker, lite-lerp, lite-random -> the node_modules
entries) plus the two package entries; those three deps are transitively
import-clean, so nothing further leaks.

The gallery is built from RECIPE_META: a section per `family`, a card per row,
each mounted by its declared `type` -- a UIType routes to `mountUIFX`, `'decorate'`
routes to `decorateUIFX` (over a real `<input>`), so the demo is type-correct by
construction and cannot drift from the registry. A theme switcher re-mounts under
a shared theme object (proves U3). A reduced-motion toggle drives `state.reducedMotion`
(proves U5) -- calm-path recipes go static, the rest are honestly unaffected.

Demo CSS obeys law: hex first then `oklch()`, every `:hover` inside
`@media (hover:hover)`, `rem` by default, no inline styles except `--var` custom
properties. `demo/` never enters files[] (npm pack proves it).

## Decision 3 -- the doc gate is executable, not a promise

`test/docs.test.mjs` extracts every fenced `js`/`javascript` block from README.md,
rewrites the two bare package specifiers to the local files, installs the DOM stub,
and imports each block as a module -- asserting it evaluates with no throw and that
every named import it uses resolves to a real export. A deliberately broken control
block (an import name that does not exist) must fail the gate, so the gate can fail.
This makes the blueprint's "the docs describe the code that exists" a test.

The `#profile` reflow gate stays a DEV instrument: `demo/index.html` dynamic-imports
@zakkster/lite-layout-profiler (importmapped to the sibling repo source) only when
`location.hash === '#profile'`. It allocates and patches setters on purpose, so it
is fenced behind the flag, never in files[], never a dependency. A full drive under
`#profile` must report `violationCount === 0`.

## Consequences

- No module code changes: controller and recipes are untouched, so the torture
  gate must reproduce the same GATE line (run it, do not re-measure a budget).
- The VERSION triple is untouched (this is a pipeline session); `/release 1.8.0`
  owns the bump and the CHANGELOG head. llms.txt keeps its `VERSION 1.7.0` line.
- `npm test` grows by one suite (docs) to 197+; the demo becomes a consumer that
  the registry generates, so a new recipe appears in the gallery for free and a
  drifted doc fails CI.
