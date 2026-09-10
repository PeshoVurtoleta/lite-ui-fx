# 0010 -- Text-fx + pointer + card decorations (decorate mode, bespoke, no particles)

Status: accepted (E2, v1.12.0)
Extends 0004 (decorate mode); supersedes nothing.
Roadmap/enrichment: E2 -- the React Bits / Aceternity / Magic UI micro-interaction
category (text animation + pointer FX on real elements), delivered through the U4b
decorate mode. The re-sequenced track is E1b -> E2 -> lite-particles -> E3.
Findings: none (an enrichment session).

## Context

E1/E1b grew the SEPARATE headless-skin registry and held the main recipe count at
57. E2 is the first session since U4b (0004) to grow the MAIN recipe registry: its
recipes are ordinary recipes with `RECIPE_META.type === 'decorate'`, mounted AROUND
a live element by `decorateUIFX`, joining the five U4b decorate recipes. A recipe
receives only `(ctx, dt, now, state, pointer)` -- never a DOM handle -- and the
decorate adapter already reads all host geometry at init + on resize/scroll only
(read-before-write, one `getBoundingClientRect` per pointer enter). The owner
re-sequenced the enrichment track so the particle engine enters in ONE dedicated
phase (1.13.0); E2 therefore ships the bespoke, non-particle half.

## Decision

1. VEHICLE + REGISTRY -- decorate mode; the MAIN recipe count grows. Eight new
   recipes register in `RECIPES` / `RECIPE_META` / `RECIPE_NAMES` with type
   `'decorate'`; `RECIPE_NAMES` grows 57 -> 65. `mountRecipe` already routes
   `'decorate'` to `decorateUIFX` (U4b) -- no adapter change. This is the deliberate
   difference from E1/E1b (which grew the separate skins registry, holding 57).

2. NON-PARTICLE SCOPE -- eight bespoke decorations, shipped reuse-first:
   - Text (paint OVER the host's own live glyphs, never re-render them):
     `TextShimmer` (a swept light band), `SpotlightText` (a pointer-follow reading
     highlight), `UnderlineDraw` (a focus-triggered underline wipe, distinct from
     TypewriterField which grows with typed length).
   - Card: `BorderBeam` (a comet around the perimeter), `TiltShine` (a pointer-driven
     sheen), `CardSpotlight` (a pointer-follow radial glow).
   - Pointer: `MagneticPull` (an accent ring eased toward the pointer; the host never
     moves), `PointerRipple` (expanding rings from each press, a fixed Float32Array
     ring pool).

3. NO NEW ENGINE DEPENDENCY. The roadmap suggested `lite-noise` (shimmer/spotlight)
   and `lite-particles` (trail/glow); E1 and E1b added zero deps and E2 holds the
   line. Shimmer/glow/beam are const colours + `globalAlpha` with NO gradient built
   in tick; geometry is `lite-lerp` + arithmetic; `PointerRipple`'s pool is
   preallocated. `package.json` dependencies stay exactly `{ lite-lerp, lite-random,
   lite-ticker }`. If a decoration could not hit its look zero-alloc without a new
   engine, it DROPPED to a later phase rather than pulling the dep early.

4. REFLOW IS THE HARD GATE, AND E2 RECIPES ARE STRUCTURALLY SAFE. Decorate mode is
   the one place this package can force synchronous layout -- a cost the torture
   harness is structurally blind to (zero bytes, zero GC). But a recipe never
   receives a DOM handle: it draws only to `ctx` from `state` + `pointer`, so it
   CANNOT call `getBoundingClientRect` / `measureText` / `offset*`. All host layout
   reads live in the adapter, already batched read-before-write and run at init +
   resize only. Consequence: a recipe-level "per-frame measure" reflow control is
   not expressible (a recipe has nothing to measure); the `#profile` forced-reflow
   gate on the demo therefore covers the ADAPTER + the demo scenes, and every E2
   scene must report `violationCount === 0`. Text-fx cover `<input>` AND
   `<textarea>` (auto-resize re-measures on the resize signal, never per frame).

5. CALM PATH FOR ALL (`motionSafe: true`). Each decoration renders statically under
   `state.reducedMotion`: the shimmer/beam/spotlight hold or vanish, the underline
   snaps to width, the magnetic ring stops pulling, the ripple settles. All eight
   join the `motionSafe` roster (the theme-test SAFE set), which the `t3` churn
   exercises by sweeping `reducedMotion`, so a calm path that allocated would fail
   the same gate.

6. ESCALATION TRIGGER (fail closed, inherited). No decoration forced a per-frame
   layout read, a new dependency, or a change to the decorate contract / state
   shape. Had one required any of these, the session would STOP and surface it as a
   single decision, never a silent widening.

## Deferrals (named, so E2 is bounded not open-ended)

- lite-particles phase (1.13.0): pointer TRAIL and proximity-GLOW PARTICLES -- the
  two decorations the roadmap sources from `lite-particles`.
- ScrambleIn (a future hijack-mode text tranche): a true scramble-in must OWN the
  text rendering (cycle glyphs, then resolve). Decorate mode reflects a live element
  and must never modify or hide it, so it cannot scramble the host's real text --
  this belongs to a recipe that renders its own text (hijack mode), not a decoration.
- Dock magnify (a future group/dock vehicle): a dock magnifies items as the pointer
  approaches across a ROW; a single-host decoration only sees the pointer over its
  own box (a sibling's hover fires this host's pointerleave). A real dock needs
  shared container-space pointer coords -- the province of a group-style shared
  canvas (mountUIFXGroup already carries per-item geometry lanes) or a new dock
  vehicle, not decorate mode.

## Consequences (falsifiable, all verified this session)

- `RECIPE_NAMES` grows 57 -> 65; `SKIN_NAMES` stays 11 (skins untouched). All eight
  are type `'decorate'`, `themeable: true`, `motionSafe: true`, with a factory.
- Zero per-frame alloc: each new recipe passes `t3` at cdist 1-2 and grad 0, default
  AND themed; the two positive controls still FAIL. The 1.11.0 torture GATE line
  reproduces (`alloc = 0.8642578125 B/op`, major = 0).
- Host byte-identical: `t0` mounts every recipe as a decoration and proves additive
  attribute diff + exact restore on destroy; a dedicated suite additionally mounts
  each over `<input>`, `<div>`, and `<button>` (non-form hosts) and restores exactly.
- Calm path is a distinct static render (not just zero-alloc): a test proves
  TextShimmer sweeps a band in full motion but paints a static sheen under reduce,
  and BorderBeam draws its comet only in full motion.
- Zero new dependency (grep-proven): no `@zakkster/lite-noise` or
  `@zakkster/lite-particles` import anywhere; `package.json` deps unchanged.
- No version bump here (impl lands at 1.11.0; `/release 1.12.0` owns the bump +
  CHANGELOG). No rewrite of ROADMAP.md.
