---
package: "@zakkster/lite-ui-fx"
session: U6
version_target: 1.8.0        # corrected live ledger; impl lands at CURRENT 1.7.0, /release bumps
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-layout-profiler (dev-only, #profile gate, never a dep)"]
findings: [U-12]
depends_on: [U5]
blocks: []
---

# U6 -- blueprint docs + a demo that consumes the package

PURPOSE
  After U2-U5 the surface is stable: two mount modes, 56 recipes behind a
  registry, one option convention, three clock modes, reduced motion. It has
  never been documented on the LiteSepforge blueprint spine, and the three
  demos still reimplement the library inline (U-12) -- they prove nothing and
  drift freely. U6 documents the surface once, properly, and rebuilds the demo
  as a real consumer generated from RECIPE_META. No behaviour change, no new
  recipes: this session is docs + demo + one executable doc gate.

VERIFIED INPUTS (line-checked 2026-09-07, not inferred)
  - Current README.md (282 lines) is NOT on the blueprint spine. It has: What
    is / three CodePen "Live Demo" links / a recipe bullet list / Install /
    Quick Start / Import Map / How It Works (ASCII) / API / Comparison /
    Writing Custom Recipes / TypeScript / LLM doc / License. Missing vs the
    spine: the positioning H2, TOC, Why this exists, What you get, the
    <details> deep-dive, Composability pipeline, <details> Zero-GC design
    notes + allocation table + gated numbers, Design decisions, a real Testing
    section (counts + scripts), What this is not, Ecosystem.
  - The "Comparison" table (README.md:227-234) carries marketing sizes
    ("< 5 KB", competitor KB) -- blueprint law is "measured numbers only, no
    marketing adjectives." Replace with a grounded statement or drop it.
  - The three CodePen debug links (README.md:16,19,22) point at the OLD inline
    demos; they die with U-12. Remove them; the shipped demo replaces them.
  - U-12 CONFIRMED: `grep -c mountUIFX|decorateUIFX|from '../'|type="module"`
    over all three demo/*.html => 0/0/0/0 each. Fully inline, non-module.
  - Blueprint spine (LiteSepforge/README.md, 365 lines) is the model, in order:
    title + one-line blockquote tagline; badges; positioning H2 ("The X the
    ecosystem was missing") with inline install + runnable quick-start; TOC;
    Why this exists; What you get; <details> deep-dive on the core surface; API
    reference (signatures + a constants table); Composability (full pipeline in
    code); <details> Zero-GC design notes (allocation table + gated numbers);
    Benchmarks (optional); Design decisions worth knowing; Testing (counts +
    scripts); What this is not; Ecosystem; License with the (c) line.
  - decisions/ has five ADRs to link from "Design decisions": 0001 recipes
    position, 0002 recipe options, 0003 element types, 0004 decorate mode,
    0005 host clock.
  - Importmap completeness: UIFXController.js + UIFXRecipes.js import exactly
    three bare specifiers -- @zakkster/lite-ticker, lite-lerp, lite-random --
    and all three are transitively import-clean (zero further bare imports).
    node_modules entries: lite-ticker/Ticker.js, lite-lerp/Lerp.js,
    lite-random/Random.js. So a browser importmap needs exactly those three
    plus the two package entries; nothing transitive leaks.
  - #profile profiler source: @zakkster/lite-layout-profiler is NOT in
    node_modules, but the sibling repo ../LiteLayoutProfiler/LayoutProfiler.js
    exists -- importmap the #profile dynamic import at it. It is DEV-ONLY:
    behind the #profile hash flag, never in files[], never a dependency.
  - Test baseline GREEN now: `npm test` => tests 196, pass 196, fail 0,
    suites 17. Torture green as of 1.7.0 release. U6 adds ONE test file
    (docs) and must not drop the 196 or rot the torture gate.
  - VERSION triple is 1.7.0 (package.json / UIFXController VERSION / llms.txt).
    U6 is a PIPELINE session: it does NOT touch the triple. A later
    `/release 1.8.0` bumps it. llms.txt's `VERSION 1.7.0` line stays 1.7.0.

THE DECISION (record as decisions/0006-docs-and-demo.md before coding)
  1. README on the blueprint spine, claim-for-claim, ASCII-only. The
     positioning H2 is "The canvas microinteraction layer the ecosystem was
     missing" (native a11y + canvas visual + recipe registry -- the corner no
     vanilla kit holds). The deep-dive <details> is "Two mount modes + the
     recipe contract." The constants table lists UITypes, state fields, and
     RECIPE_META fields. The allocation table is per recipe-family (what is
     preallocated where) with the gated t3 fact. Composability shows one real
     pipeline: a lite-ticker host clock driving UIFX + a theme object shared
     with lite-scratch-fx. "What this is not": no React/framework bindings, no
     component framework, no worker mode (a 200x48 UI canvas does not amortise
     a worker hop), not a chart library, not an ARIA behaviour engine
     (lite-headless owns behaviour).
  2. ONE demo, demo/index.html, generated from RECIPE_META. It imports ONLY
     public entry points (../UIFXController.js, ../UIFXRecipes.js) through an
     importmap; it reimplements nothing. Family sections come from
     RECIPE_META.family; each card mounts the recipe by its declared type
     (mountUIFX for a UIType, decorateUIFX for type 'decorate') -- type-correct
     by construction. A theme switcher proves U3 (re-mount under a theme
     object). A reduced-motion toggle proves U5 (drive state.reducedMotion via
     the matchMedia stub path, or a data attribute the demo reads). The
     #profile hook dynamic-imports the layout profiler, dormant unless the
     hash is set. Demo CSS obeys law: hex-first then oklch(), every :hover in
     @media (hover:hover), rem by default, no inline styles but --vars.
  3. The doc gate is executable. test/docs.test.mjs extracts every fenced
     js/javascript block from README.md, rewrites the two bare package
     specifiers to the local files, installs the DOM stub, and imports each
     block as a module -- asserting it evaluates with no throw and that every
     named import it uses is a real export. "Docs describe the code" becomes a
     test, not a promise.

TASKS
  - decisions/0006-docs-and-demo.md: record decision 1-3 above (short ADR,
    same shape as 0001-0005).
  - README.md: full rewrite on the spine. Keep the badges block (already
    correct). Kill the CodePen links and the marketing Comparison table.
    Every js block runnable or a clearly-scoped fragment the doc test accepts.
    Grep the result for stray tool-call tags and non-ASCII before trusting it.
  - llms.txt: audit against the live surface (it is already U5-current). Verify
    every claim is machine-checkable: both entry points, registry, META fields,
    all six UITypes + decorate, the 56-recipe catalog by family, the host-clock
    and reduced-motion facts. Tighten only; do NOT bump the VERSION line.
  - demo/: delete demo-lite-ui-fx.html, demo-lite-uifx-vol2.html,
    demo-lite-uifx-vol3.html. Add demo/index.html per decision 2. demo/ stays
    OUT of files[] (npm pack proves it).
  - test/docs.test.mjs: the extractor + runner per decision 3. Wire into the
    existing `npm test` glob (test/*.test.mjs) -- no script change needed.
  - CHANGELOG: leave the head for `/release 1.8.0`. (Pipeline sessions do not
    write the release head; the release skill owns it.)

HOT PATH
  No module code changes -- controller and recipes are untouched, so the
  torture gate simply must not rot (run it, confirm the same GATE line). The
  demo has its own hot path: the gallery's per-frame work is the recipes' own
  ticks under the shared ticker; the demo adds no per-frame allocation and no
  forced reflow (all layout reads at init/resize, never in a frame or pointer
  handler). The #profile drive is the proof.

ASSERTIONS
  - README on the spine: every spine section present and in order; zero
    non-ASCII (law gate already covers tracked files); zero stray tool tags.
  - test/docs.test.mjs GREEN: every README js block evaluates with no throw;
    an intentionally-broken control block (bad import name) makes it fail.
  - Demo mounts every RECIPE_META row through public exports only:
    `grep -c mountUIFX demo/index.html` > 0 and zero inline recipe bodies;
    the three old demo files are gone from git.
  - Demo drive under #profile reports layout-profiler violationCount === 0
    across a full pass (theme switch + reduce toggle + every family).
  - `npm test` => pass count >= 197 (196 + the docs suite), fail 0.
  - `node --expose-gc test/torture.mjs` => same green GATE line as 1.7.0.
  - `npm pack --dry-run`: demo/ and test/ absent; README.md, llms.txt,
    CHANGELOG.md, UIFX-RECIPE-GUIDE.md, LICENSE present.

NON-GOALS
  No API changes. No new recipes. No version bump (that is `/release 1.8.0`).
  No new element types or clock modes. The demo is the showcase -- no separate
  marketing site.

DONE WHEN
  README matches the blueprint spine claim-for-claim; llms.txt is live-surface
  and machine-checkable; one demo, generated from RECIPE_META, importing only
  public exports, reflow-clean under #profile; the doc-snippet gate is green
  and its control fails; 196+ tests and the torture gate stay green.

-------------------------------------------------------------------------------
Versioning (corrected live ledger -- do NOT rewrite ROADMAP.md yet)
  git+npm tail: U0 1.0.5, U1 1.1.0, U2 1.2.0, U3a 1.3.0, U3b 1.4.0, U4a 1.5.0,
  U4b 1.6.0, U5 1.7.0. So U6 -> 1.8.0, U7 -> 1.9.0 or 2.0.0, U8 -> 1.10.0.
  ROADMAP.md sec 7 still shows pre-split numbering (U6=1.6.0 ...); it is stale
  and owner-unblessed. Briefs use the corrected target; the roadmap ledger is
  left alone until the owner blesses a renumber.

Sizing
  Docs-and-demo session, no module edits. The weight is prose (README on the
  spine) and one from-scratch consuming demo. Grind in the main thread; a
  single-shot coder subagent stalls on a task this broad (recorded lesson).
  A tightly-scoped reviewer with named invariants completes -- use it.
