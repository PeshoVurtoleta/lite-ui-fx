# 0008 -- Headless skins (skinHeadless: paint a lite-headless primitive)

Status: accepted (E1, v1.10.0)
Supersedes nothing. Follows 0004 (decorate mode) and 0007 (group contract).
Roadmap/enrichment: E1 (the roadmap's "0004-headless-skins" pointer is stale --
0004 is decorate mode; this is the next free ADR, 0008).
Findings: none (an enrichment session; the spine is law 1 -- native = source of
truth, here owned by lite-headless).

## Context

@zakkster/lite-headless ships 62 ARIA-correct primitives that deliberately render
nothing and paint a small, CANONICAL set of state attributes (its
docs/CSS_CONTRACT.md, binding since its v0.11.0) so an outside consumer can style
from the attributes. lite-ui-fx's decorate mode (0004) is the missing visual half:
a canvas around a live element. E1 adds ONE adapter that drives a recipe from a
primitive's painted attributes -- lite-ui-fx paints, lite-headless behaves. The
whole point is arm's-length composition: lite-headless is a compose-target, NEVER a
dependency (0007 decision 2), so the adapter must couple through the painted
contract, not an import.

## Decision

1. `skinHeadless(handle, recipeFactory, options)` IS A NEW PUBLIC MOUNT ENTRY, beside
   mountUIFX / decorateUIFX / mountUIFXGroup, and lives in UIFXController.js. It
   reuses the decorate machinery verbatim -- offset-box overlay placement (0004
   decision 2), the shared/caller/driven clock (0005), the AbortController teardown,
   the budget + quarantine frame loop -- differing in ONE thing: where state comes
   from. It creates no native element, never reparents or restyles the host, adds
   exactly one overlay canvas + its listeners + one MutationObserver, and on destroy
   the host is byte-identical. `handle` is the lite-headless primitive handle,
   duck-typed and passed straight to the skin's `read()` for an optional signal fast
   path; skinHeadless NEVER destroys it (the caller owns it, as with a caller
   ticker). `options.host` (REQUIRED) is the element to observe and overlay. Fail
   closed: a missing/detached host, a non-function factory, or a bad option throws
   before any side effect.

2. STATE COMES FROM THE PAINTED CONTRACT, VIA ONE MutationObserver, AT EVENT TIME.
   A headless-skin recipe carries a descriptor `recipe.headless = { attrs: string[],
   read(host, handle, state) }`. `attrs` is the MutationObserver `attributeFilter`;
   `read` writes the primitive's painted state into PREALLOCATED `state` slots.
   skinHeadless observes `host` with `{ attributes:true, attributeFilter: attrs,
   subtree:true }` and calls `read` on every mutation -- EVENT time, never a per-frame
   attribute read (law: the frame path stays zero-alloc; getAttribute/parseFloat run
   in the observer callback). `read` is idempotent and re-reads full state each call,
   so it is order- and timing-independent: a real async-batched MutationObserver and
   the test harness's synchronous stub drive it identically. subtree:true because a
   primitive may paint the watched attribute on a slot-marked child (e.g. the switch
   thumb), not the root.

3. THE PAINTED CONTRACT IS READ, NOT ASSUMED. lite-headless's taxonomy has boolean
   attrs (presence = true) AND enum attrs (`data-x="value"`), and at least one
   primitive paints a boolean in value form (switch: `data-checked="true"`). So a
   skin's `read` treats "attribute PRESENT, any value except the string 'false'" as
   truthy, and reads numeric dimensions (slider/progress) from `aria-valuenow` +
   `aria-valuemin`/`-valuemax`. Each primitive's own llms.txt is the per-primitive
   source; a skin pins the exact attrs it consumes in its `attrs` list.

4. SKINS ARE A SIBLING REGISTRY, NOT `RECIPES`/`RECIPE_META`. A skin needs a handle +
   host, not a container, so it does NOT fit `mountRecipe` (which mounts a recipe id
   into a container) nor the RECIPE_META `type` routing. Overloading either would
   break the "type selects the native element" invariant and force mountRecipe to
   carry a path it cannot serve. Instead the skins live in `HEADLESS_SKINS`
   (null-prototype id -> factory), `SKIN_META` ([{ id, name, primitive, themeable,
   motionSafe }]) and `SKIN_NAMES`, exported from UIFXRecipes.js and re-exported (with
   `skinHeadless`) from the NEW `./headless` subpath. Consequence: the 57-recipe count
   (RECIPE_NAMES) and every existing registry/theme/torture test are byte-identical --
   the additive proof is trivial.

5. THE E1 TRANCHE IS FOUR SKINS, BESPOKE-MINIMAL, BORN THEMED + GATED. SwitchSkin
   (data-checked/aria-checked -> toggled), SliderSkin (aria-valuenow/min/max -> val,
   data-dragging -> active), ProgressSkin (aria-valuenow/max -> val, data-complete,
   data-loading -> indeterminate), RatingSkin (aria-valuenow/max -> val over N items).
   Each resolves theme once in init via the 0002 helpers (resolveTheme/pickFont),
   draws on the 1.3.0 fixed-pool + const-color + globalAlpha pattern (zero per-frame
   alloc), and lands `themeable:true`, `motionSafe:false`. They are written bespoke
   (not delegating to a ./recipes body) so each skin's tick is self-contained and
   auditable. NO recipe-side engine dependency this session: the reuse-first tranche
   needs no particles; lite-particles adoption (pop/burst/entrance skins) is deferred
   to E2 so E1 adds zero dependencies (grep-proven).

6. `setValue` / `setChecked` STAY HIJACK-ONLY (throw), as in decorate: a skin reflects
   the primitive, it does not push into it. The host app drives the lite-headless
   primitive; the skin follows via the observer.

7. ESCALATION TRIGGER (fail closed): if driving a skin from the painted contract were
   to force any change to the eight-hook recipe contract (0007's ninth `onSelect`
   stays group-only) or to a scalar state field, STOP and surface to the owner (law 2:
   batch breaks into one major). The design does NOT trip this -- a skin is an
   ordinary recipe; `recipe.headless` is a new OPTIONAL descriptor property, not a hook
   or a state-shape change.

## Deferred (explicitly NOT in E1)

- Particle skins (pin-input pop, file-upload burst, toast entrance) + lite-particles
  adoption -> E2 (0003 decision 5 / 0004 deferred). E1 adds no dependency.
- text-fx / pointer / card decorations (decorate mode over live DOM text) -> E2.
- Loader-family growth, the README family map, the acquisition gallery -> E3.
- A true signal-subscription fast path (subscribe to the handle's lite-signal instead
  of observing attributes) -> future; E1's `read(host, handle, state)` MAY consult
  handle accessors opportunistically, but the MutationObserver is the universal driver
  that needs no lite-signal peer.
- More skin targets (meter, skeleton, switch variants, steps, pin-input, file-upload,
  toast, command-palette, color-picker wheel) -> subsequent E1/E2 passes.

## Consequences

- +1 public mount entry (`skinHeadless`, on "." and re-exported from `./headless`),
  +1 subpath (`./headless` -> UIFXHeadless.js + .d.ts), +1 optional recipe descriptor
  property (`recipe.headless`), +4 skins in a SIBLING registry. All additive; every
  existing mount path and the 57-recipe registry are byte-identical. Backward-compatible
  NEW functionality -> semver MINOR (1.10.0).
- The recipe interface (law 2) is untouched: a skin rides the existing `{ init, tick,
  on* }` shape plus an optional `headless` descriptor property; no hook added, no state
  field renamed/removed.
- No new runtime dependency: package.json `dependencies` unchanged; lite-headless is
  absent (compose-target). The test harness gains a synchronous MutationObserver stub.
- Torture: a headless-skin tier mounts every skin, drives it by mutating the observed
  attributes, and asserts zero per-frame allocation across a scripted drive; a t9
  control -- a skin that reads a painted attribute in `tick` (per frame) instead of in
  `read` (per mutation) -- MUST fail the frame-alloc gate.
