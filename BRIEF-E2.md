---
package: "@zakkster/lite-ui-fx"
session: E2
version_target: 1.12.0       # live ledger, re-sequenced (E1b -> E2 -> lite-particles); impl lands at CURRENT 1.11.0, /release bumps
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []                    # NO new runtime dep this session (see THE DECISION 3)
findings: []
depends_on: [E1b]
blocks: []
---

# E2 -- text-fx + pointer/card decorations (decorate mode over live DOM, bespoke, no particles)

PURPOSE
  The React Bits / Aceternity / Magic UI core category -- text animation + pointer
  micro-interaction on REAL elements -- is absent in vanilla. E2 delivers it through
  the U4b decorate mode (decorateUIFX): a canvas wrapped AROUND a live element, host
  byte-identical, state wired from the host's own events. This is the FIRST session
  since U4b to grow the MAIN recipe registry (RECIPE_META type 'decorate') rather
  than the separate skins registry -- RECIPE_NAMES grows from 57. E2 ships the
  BESPOKE, reuse-first half: text-fx (shimmer / scramble-in / spotlight-follow /
  underline-draw), card decorations (border-beam / tilt-shine / spotlight), and the
  non-particle pointer decorations (magnetic-pull + the demand-verified Dock
  proximity-magnify). The particle-riding decorations (pointer TRAIL, proximity-GLOW
  particles) stay deferred to the dedicated lite-particles integration (1.13.0) per
  the re-sequenced enrichment track (E1b -> E2 -> lite-particles -> E3). No new
  runtime dependency this session.

VERIFIED INPUTS (line-checked 2026-09-08, not inferred)
  - Baseline GREEN + CLEAN: local + npm triple = 1.11.0 (E1b published). RECIPES
    authoritative from code: RECIPE_NAMES === 57; the FIVE decorate recipes today are
    passwordStrength, typewriterField, focusHalo, errorShake, successBloom
    (RECIPE_META type === 'decorate'). The E1/E1b skin registry is SEPARATE and stays
    at SKIN_NAMES === 11 (E2 does not touch skins). Torture baseline at 1.11.0:
    `GATE leak=size 0/0 findings=0 warnings=0 | gc major=0 minor=0 maxMs=0.00 |
    alloc=0.8642578125 B/op | ok`.
  - Runtime deps are EXACTLY three (package.json): @zakkster/lite-lerp,
    @zakkster/lite-random, @zakkster/lite-ticker. NO lite-noise, NO lite-particles
    present -- confirming E2's "no new dep" scope is a real constraint, not a
    restatement.
  - decorate-mode contract (verified in UIFXController.js + llms.txt): decorateUIFX(el,
    recipeFactory, options?) -> { state, destroy }. Options are a SUBSET: { padding,
    seed, colors, theme, text, font, ticker, driven }; the hijack-only keys
    (width/height/value/checked/disabled/knobMode/announce/label) THROW. The overlay
    is a sibling placed from the host's offset box, removed on destroy (host
    byte-identical). setValue/setChecked THROW (a decoration reflects, never drives).
    State adds text (host value string) + valid (host validity boolean) read at EVENT
    time; for a non-form host (a card, a button) those are simply neutral.
  - METRIC-READ DISCIPLINE ALREADY ESTABLISHED (UIFXController.js): decorate reads
    geometry lazily ONCE and refreshes only on demand -- `rect = el.getBoundingClientRect()`
    behind a null-guard ("Fires getBoundingClientRect at most once"), a `refreshRect()`
    hook, and offsetWidth/offsetHeight sampled at init. E2 text-fx follows the SAME
    discipline: measure text/box at init + on resize only, never per frame.
  - REFLOW GATE ALREADY WIRED (demo/index.html): the #profile forced-reflow gate is
    live -- lite-layout-profiler (dev-only, importmap-mapped to ../../LiteLayoutProfiler/
    LayoutProfiler.js, NEVER in files[]) loads only under the #profile hash, drives
    every scene, and asserts violationCount === 0. E2 extends this harness to drive
    every new decoration; it is the session's HARD gate (see HOT PATH).
  - motionSafe roster (llms.txt): RECIPE_META.motionSafe is true for EXACTLY
    SwarmToggle + the 5 decorate recipes today. Every E2 decoration is calm-path by
    nature, so E2 EXTENDS this roster (reduced motion -> static / resolved render).
  - ROADMAP-ENRICHMENT.md sec E2 defines the scope; ROADMAP-ELEMENTS.md sec 2a adds
    two build-time inputs: (a) text-fx MUST cover `<textarea>` (multiline / auto-resize),
    not only single-line inputs; (b) add the Dock (proximity-magnify) pointer family
    (Magic UI / Aceternity / React Bits), a distinct decoration not covered by the
    shimmer/trail/glow set. ROADMAP.md numbering STALE + owner-unblessed; left alone.

THE DECISION (record in decisions/0010-text-pointer-card-decorations.md before coding)
  1. VEHICLE + REGISTRY -- decorate mode; the MAIN recipe count grows. E2 recipes are
     ordinary recipes with RECIPE_META.type === 'decorate', registered in RECIPES /
     RECIPE_META / RECIPE_NAMES beside the existing 5. RECIPE_NAMES grows 57 -> 57+N.
     mountRecipe already routes type 'decorate' to decorateUIFX (U4b) -- no adapter
     change. This is the deliberate difference from E1/E1b (which grew the SEPARATE
     skins registry and held RECIPE_NAMES at 57).
  2. NON-PARTICLE SCOPE -- the particle decorations defer to 1.13.0. Ship at 1.12.0,
     reuse-first: text-fx { TextShimmer, ScrambleIn, SpotlightText, UnderlineDraw },
     card { BorderBeam, TiltShine, CardSpotlight }, pointer { MagneticPull, DockMagnify }.
     DEFER to the lite-particles phase (1.13.0): pointer TRAIL and proximity-GLOW
     PARTICLES (the two the roadmap explicitly sources from lite-particles). This
     mirrors E1b's bespoke/particle split and keeps 1.13.0 the ONE phase a particle
     engine enters. Final count is planner-sized from build-time demand (roadmap
     sec 2a.3/2a.4 says size from evidence), but ~7-9 new decorate recipes is the frame.
  3. NO NEW ENGINE DEPENDENCY (the central law call). The roadmap SUGGESTS lite-noise
     for shimmer/spotlight motion and lite-particles for trail/glow. E1 and E1b added
     ZERO deps; E2 holds that line. shimmer/spotlight = a precomputed gradient (or
     value LUT) built in init and swept by a scalar phase -- the exact zero-alloc
     technique SkeletonSkin proved in E1b (no lite-noise); scramble-in = character
     cycling from a precomputed charset advanced by lite-random (already a dep);
     magnetic/dock/tilt = pure lite-lerp geometry. lite-noise AND lite-particles both
     stay OUT until 1.13.0. If a decoration cannot hit its look zero-alloc without a
     new engine, it DROPS to 1.13.0 rather than pulling the dep early (fail closed).
  4. REFLOW IS THE HARD GATE (the torture-blind failure mode). decorate sits over
     live DOM -- the ONE place this package can force synchronous layout, which costs
     zero bytes and zero GC, so lite-leak + lite-gc-profiler BOTH report clean while
     frames still drop (demo-audit skill). Therefore: (a) every new decoration is
     driven under #profile and MUST report violationCount === 0; (b) all layout READS
     (getBoundingClientRect / measureText / offset*) happen at init + on resize
     (ResizeObserver) only, never in a tick; (c) within any sync block, reads precede
     writes. text-fx MUST cover `<textarea>` -- auto-resize changes geometry, so
     re-measure on the resize signal, not per frame.
  5. CALM PATH FOR ALL (motionSafe:true). Each E2 decoration renders statically under
     state.reducedMotion: shimmer/beam/spotlight hold at rest, scramble-in resolves
     instantly to the final text, magnetic/dock snap to neutral. E2 adds N to the
     motionSafe roster; mountRecipe must NOT warn on these under active reduce.
  6. ESCALATION TRIGGER (fail closed, inherited). If any decoration forces a per-frame
     layout read, a new runtime dependency, or a change to the decorate contract /
     state shape to work, STOP and surface to the owner (one decision, not a silent
     widening). The design avoids all three.

TASKS
  - decisions/0010-text-pointer-card-decorations.md: record decisions 1-6 (short ADR
    in the 0001-0009 shape). EXTENDS 0004 (decorate mode); does not supersede it.
  - Recipes in UIFXRecipes.js, registered in RECIPES / RECIPE_META / RECIPE_NAMES with
    type 'decorate'. Each themed via the U-06 resolveTheme shape; each motionSafe:true
    with a real calm path; each born under t3 (zero per-frame alloc -- const colours +
    globalAlpha, gradients/LUTs/charsets built in init, no per-frame string/gradient/
    measure). family field set for the picker (text-fx / card / pointer).
  - text-fx bodies over a live input AND a `<textarea>`: TextShimmer (swept gradient
    phase), ScrambleIn (charset cycle -> resolve), SpotlightText (radial follow of the
    caret/pointer), UnderlineDraw (grow an underline with the typed text -- adjacent to
    the existing TypewriterField, keep it distinct). Metrics at init + resize only.
  - card bodies over a live card/button host: BorderBeam (a stop swept around the
    perimeter), TiltShine (pointer-driven specular highlight), CardSpotlight (radial
    glow following the pointer). Pure geometry + cached gradients.
  - pointer bodies: MagneticPull (host eases toward the pointer within a radius) and
    DockMagnify (proximity magnify across a row -- the demand-verified Dock family).
    Geometry via lite-lerp; NO particles (trail/glow deferred).
  - torture: extend t3 (frame-alloc) to every new decorate recipe (default AND themed
    mount); the t0/retention tier asserts each decoration is ADDITIVE-ONLY on the host
    and restores EXACTLY on destroy (DOM diff, overlay + listeners gone, host intact);
    a t-control -- a decoration that calls getBoundingClientRect/measureText PER FRAME
    -- MUST fail the reflow gate under #profile (the torture harness alone will pass it,
    which is the point of the reflow gate). Reproduce the 1.11.0 GATE line.
  - test/*.test.mjs: boundary suites for text-fx over input vs textarea (metrics
    re-read on resize, not per frame), scramble resolve-to-final, the calm-path render
    under reducedMotion, and the additive-diff + exact-restore invariant per recipe.
  - demo/index.html: mount every new decoration over a live element (public exports
    only) and drive it under the #profile gate; assert violationCount === 0 across all
    new scenes. Keep lite-layout-profiler dev-only (never in files[]).
  - llms.txt + README: add the E2 decorations to the recipe catalog + counts (RECIPE
    count 57 -> 57+N, the decorate family, the motionSafe roster). Do NOT bump the
    VERSION line (pipeline session; /release 1.12.0 owns it).

HOT PATH
  Two hot surfaces, both zero-alloc: (1) the tick -- reads cached state slots +
  cached gradients/LUTs, sweeps a scalar phase, paints; zero per-frame allocation,
  zero per-frame layout read. (2) pointer handlers -- pointer events (not mouse/touch),
  coordinates into preallocated scalars, no getBoundingClientRect in the handler (rect
  cached at init, refreshed on resize). The #profile forced-reflow gate
  (violationCount === 0) is the primary proof E2 must pass ON TOP of the alloc gate --
  it is the only gate that catches the decorate-over-live-DOM failure mode. The 1.11.0
  GATE line (alloc 0.8642578125 B/op) must reproduce and every new recipe must gate at
  alloc 0 under t3.

ASSERTIONS (falsifiable)
  - Host byte-identical: after decorating, the host's attribute + child set is
    UNCHANGED (the overlay is a sibling, not a child of the host); destroy() removes
    ONLY the overlay + its listeners and leaves the host EXACTLY as found (t0 DOM diff).
  - Reflow-clean: every new decoration driven under #profile reports violationCount
    === 0; the per-frame-measure control recipe FAILS the reflow gate (proving the gate
    bites) while still passing the alloc torture (proving why the reflow gate exists).
  - text-fx over `<textarea>`: metrics are read at init and on the resize signal only
    (auto-resize re-measures via ResizeObserver, not per frame); a test drives a
    multiline resize and asserts no per-frame getBoundingClientRect/measureText.
  - Zero new dep: grep proves package.json dependencies stays EXACTLY {lite-lerp,
    lite-random, lite-ticker}; zero '@zakkster/lite-noise' and zero
    '@zakkster/lite-particles' import anywhere (both deferred to 1.13.0).
  - Every new recipe: t3 green at default + themed; themed via the U-06 shape;
    motionSafe:true with a calm path (mountRecipe does NOT warn under active reduce);
    present in RECIPE_META; mounted from META in the demo. RECIPE_NAMES grows 57 ->
    57+N; SKIN_NAMES stays === 11 (skins untouched).
  - `npm test` => pass >= baseline + new decorate cases, fail 0; `node --expose-gc
    test/torture.mjs` => ok, 1.11.0 GATE line reproduced (alloc 0.8642578125 B/op).
    `npm pack --dry-run`: demo/ + test/ + LayoutProfiler absent, llms.txt + CHANGELOG
    present, no new dep in the tarball's package.json.

NON-GOALS
  No lite-particles this session -- pointer TRAIL + proximity-GLOW particles are the
  1.13.0 phase (dec. 2). No lite-noise -- shimmer/spotlight are precomputed-LUT/phase
  (dec. 3). No new runtime dependency at all. No hijack or skin work (E2 is decorate
  only); the 11 skins and 57->count recipe split are untouched except the additive
  decorate growth. No overlay BEHAVIOUR (positioning/focus/dismiss -- not this
  package's). No change to the decorate contract, the recipe hook set, or the state
  shape. No per-frame layout read (dec. 4). No version bump (that is /release 1.12.0).
  No rewrite of ROADMAP.md.

DONE WHEN
  The bespoke decoration tranche -- text-fx (shimmer/scramble-in/spotlight/underline,
  over input AND textarea), card (border-beam/tilt-shine/spotlight), pointer
  (magnetic-pull + dock-magnify) -- ships in RECIPES/RECIPE_META, themed,
  motionSafe:true, each mounted from META in the demo; every decoration is
  reflow-clean under #profile (violationCount === 0) AND zero-alloc under t3; a
  per-frame-measure control proves the reflow gate bites; host byte-identical with
  exact restore on destroy; zero new dependency (grep-proven, particle + noise
  decorations deferred to 1.13.0); ADR 0010 records vehicle + non-particle scope +
  no-dep + reflow-gate + calm-path + escalation; tests + torture green with the 1.11.0
  GATE reproduced; SKIN_NAMES still 11, RECIPE_NAMES 57 -> 57+N.

-------------------------------------------------------------------------------
Versioning (live ledger, RE-SEQUENCED -- owner-set, ROADMAP.md unblessed)
  git+npm tail: U5 1.7.0, U6 1.8.0, U7 1.9.0, patch 1.9.1, E1 1.10.0, E1b 1.11.0
  (all published). Track: E2 (this) -> 1.12.0, then the lite-particles integration
  phase -> 1.13.0 (picks up the deferred particle decorations pointer-trail +
  proximity-glow, the deferred particle SKINS pin-input/file-upload/toast/
  command-palette, and E3's particle loaders), then E3's catalog/family-map/gallery
  work. All additive minors; owner-owned and unblessed in ROADMAP.md (left alone).
  Impl lands at the CURRENT triple 1.11.0; `/release 1.12.0` owns the bump + CHANGELOG.

Sizing
  A focused decorate session: ~7-9 new type-'decorate' recipes over the U4b adapter,
  which already exists (no adapter/observer/registry work -- decorate, mountRecipe
  routing, RECIPE_META, and the #profile harness are all live). The net-new surface
  is recipe bodies + their calm paths + demo scenes + the reflow-gate drive. Grind in
  the MAIN thread (recorded lesson: single-shot coder subagents stall on breadth); use
  a tightly scoped reviewer on the named invariants (no new dep, no per-frame layout
  read / reflow-clean under #profile, zero-alloc, additive host diff + exact restore,
  textarea metric-on-resize, calm-path correctness). The ONE risk to watch is FORCED
  REFLOW (torture-blind) -- the #profile gate is the proof, not the torture harness.
  qa last, after reviewer returns APPROVED.
