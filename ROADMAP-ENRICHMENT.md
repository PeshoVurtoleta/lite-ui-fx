# lite-ui-fx -- recipe enrichment track (post-roadmap)

Runs AFTER the core roadmap (U0-U8) is fulfilled. This decomposes and expands
U8 (the enrichment session) into three focused sessions. It leans on foundations
the roadmap delivers first: the U3 zero-alloc discipline + t3 gate (every new
recipe is born gated, zero per-frame allocation from day one), the U4 decorate
mode + new element types, the U6 blueprint demo generated from RECIPE_META, and
the U-06 option/theme convention. Palettes and contrast come from
@zakkster/lite-hueforge (OKLCH + APCA) -- no hand-picked hex.

**The evidence (from U8; re-verify before reprioritising, not before building).**
React Bits (~37k stars, text animations + micro-interactions), Aceternity UI
(~28k, theatrical components), Magic UI (~21k), uiverse.io (~7.4k copy-paste
elements). All React/Tailwind-locked or raw-CSS with no behaviour guarantee. The
open corner -- canvas-grade visuals + real native semantics + framework-free +
agent-readable (llms.txt, META) -- is this package's to take.

**Cross-cutting rules for every enrichment session.**
- Every new recipe born under t3 (zero per-frame allocation; the U3 patterns:
  const color + globalAlpha, color/label LUTs, fixed pools, init gradients).
- Build particle/loader bodies on the suite engines, not hand-rolled loops:
  lite-particles is the default -- headless, host-driven `.update(dt seconds)` +
  `.draw(ctx, renderCallback)`, 0 B/call, and its ONLY dep is lite-random (already
  a lite-ui-fx dep, so near-zero added weight). Procedural motion/texture from
  lite-noise (simplex) and lite-cellular (Worley), both zero-GC pure queries.
  lite-vfx's VFXManager only where a declarative preset manager earns its keep (it
  pulls lite-color, and its "recipe" is distinct from a ui-fx recipe -- one
  composes inside the other). Recipe deps live behind ./recipes; the controller
  stays dependency-pure. Every engine is driven from the shared (or driven)
  ticker -- confirm host-drivability at brief time; no engine may own a RAF.
- Palettes + APCA-checked contrast from lite-hueforge; themed via the U-06
  convention; listed in RECIPE_META; mounted in the demo from META.
- Text-over-DOM recipes additionally pass the U6 forced-reflow gate
  (lite-layout-profiler behind #profile): read metrics once at init/resize.
- NON-GOALS (permanent): no fullscreen backgrounds/atmospheres (lite-ambient-fx),
  no reveal effects (lite-scratch-fx), no overlay behaviour -- focus traps,
  dismiss stacks, positioning (lite-headless owns behaviour), no React wrappers.

---

## E1 -- headless-skin adapter + the core skin pack

PURPOSE
  Turn lite-headless's 59 ARIA-correct primitives into recipe targets. UIFX
  supplies the visual half through the PAINTED state-attribute contract, owning
  zero lines of ARIA.

SCOPE
  - `skinHeadless(handle, recipeFactory, options)` on a new `./headless` subpath:
    duck-types any lite-headless handle, drives recipe state by observing the
    primitive's `data-*` state attributes (one MutationObserver, cold path,
    preparsed at init -- never a per-frame read), with an optional reactive fast
    path where the handle exposes signals. lite-headless never enters
    `dependencies`; the subpath works against any version honouring the contract.
  - Skin family, launched where canvas adds the most over CSS: meter + progress
    (reuse U4 liquid/ring/battery), rating, switch, slider, steps, pin-input
    (per-digit pop), file-upload (progress burst), toast (entrance particles),
    command-palette (glow frame), color-picker (canvas wheel -- the one primitive
    whose visual IS a canvas job). The pop / burst / entrance-particle bits ride
    lite-particles.

DONE WHEN
  A lite-headless switch/slider/rating/progress skinned by UIFX keeps the
  primitive's own semantics (attribute diff additive-only), visuals driven,
  destroy restores exactly; `skinHeadless` works with zero lite-headless imports
  (grep proves it); every skin gated by t3, present in META, mounted from META.

## E2 -- text-fx + pointer/card decorations (decorate mode over live DOM)

PURPOSE
  The React Bits core category -- text animation + micro-interaction on real
  elements -- is absent in vanilla. Deliver it through the U4 decorate mode.

SCOPE
  - text-fx over visible DOM text: shimmer, scramble-in, spotlight-follow,
    underline-draw.
  - cursor/pointer decorations: magnetic pull, trail, proximity glow on cards
    and buttons.
  - card decorations: border-beam, tilt-shine, focus-halo (extend the U4 family).
  - engines: shimmer / spotlight motion from lite-noise; trail + proximity-glow
    particles from lite-particles.

HOT PATH
  These sit over live DOM text -- the one place this package can force layout.
  Read text metrics once at init and on resize only; drive under the shared (or
  driven) clock. Must pass the #profile forced-reflow gate (violationCount 0).

DONE WHEN
  Every decoration gated by t3 AND reflow-clean under #profile; decorate mode
  leaves the host element visible/focusable/unmodified except the overlay;
  destroy restores exactly.

## E3 -- loader growth, the family map, and the acquisition gallery

PURPOSE
  Round out the demand-verified catalog and make the two-package pitch legible.

SCOPE
  - Loader family growth: 6 new budget-aware loaders (consume state.budget from
    U5), each themed + gated; particle loaders on lite-particles, organic / flow
    loaders on lite-noise / lite-cellular (host-driven, no engine-owned RAF).
  - README "family map" section routing the wants this package does NOT serve --
    fullscreen atmospheres -> lite-ambient-fx, reveal effects -> lite-scratch-fx
    -- so the suite answers Aceternity together, one package does not overreach.
  - Demo: a per-recipe "copy the import" snippet (the uiverse acquisition path,
    pointed at versioned imports, not paste-drift) and a combined page mounting
    lite-headless primitives skinned live (the E1 two-package pitch), consuming
    only public exports.

DONE WHEN
  The catalog covers the verified demand categories inside UIFX's scope; the
  family map routes the rest to the siblings; every addition born under the gate;
  the gallery is generated from RECIPE_META and imports only public exports.

---

## Sizing note

Three sessions is the natural decomposition (adapter+skins / decorations /
catalog+demo), but they collapse to two (fold E3's loader growth into E1 and its
demo/family-map into E2) or expand to more if the demand evidence at re-verify
time points somewhere specific. Each becomes a full BRIEF (verified inputs,
atomic tasks, falsifiable assertions) when its turn comes, the same way U2/U3 did.
