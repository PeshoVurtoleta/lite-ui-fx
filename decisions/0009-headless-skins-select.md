# 0009 -- Headless skins II: the select + tri-state pack

Status: accepted (E1b, v1.11.0)
Extends 0008 (the headless-skin adapter + core skin pack); supersedes nothing.
Roadmap/enrichment: E1b -- the bespoke (non-particle) continuation of E1's skin
family, adopting the three new lite-headless 1.9.x canon primitives flagged by the
parallel lite-headless thread (ROADMAP-ELEMENTS sec 2a).
Findings: none (an enrichment session; native = source of truth, owned by
lite-headless).

## Context

E1 (0008) shipped `skinHeadless` + 4 skins (switch, slider, progress, rating),
deliberately scoping down from the ~11 the roadmap named. The adapter takes ONE
host element + one handle and drives a recipe from the primitive's painted
attributes via ONE MutationObserver, at event time. lite-headless 1.9.1 (62
primitives) added three canon primitives with documented painted contracts:
`select` (the WAI-ARIA select-only listbox-button -- the long-open "item 6"
dropdown decision), `checkbox` (tri-state on one 3-valued signal), and
`checkbox-group` (a derived-tri-state master). E1b skins the BESPOKE half of the
backlog; particle-riding skins stay deferred to the later lite-particles phase
(the owner re-sequenced the track this session: E1b -> E2 -> lite-particles).

## Decision

1. SELECT SCOPE -- trigger-first; the portaled listbox is a recorded follow-on.
   `SelectSkin` skins the TRIGGER through the shipped single-host adapter: it reads
   `aria-expanded` -> an open/close chevron (state.toggled), and the handle's
   `value()` (the optional fast path) -> a selected-value dot (state.complete).
   This IS the closed-state V4 answer to item 6. The OPEN-state listbox/options are
   a PORTALED popup in a different box (positioner-placed, container defaults to
   document.body), which the single-host adapter cannot place an overlay over. That
   paint is deferred: it needs either a portal-aware second overlay or a
   multi-target adapter extension, and MUST NOT be forced into E1b (it risks the
   escalation trigger, dec. 5). Item 6 is resolved toward a V4 skin; the popup is
   the next step, not this one.

2. TRI-STATE CHECKBOX -- reuse, zero state-shape change. `CheckboxSkin` is a
   single-host skin whose `read()` maps `aria-checked` (the VALUE form
   true|false|mixed) and the `data-checked`/`data-indeterminate` presence pair onto
   the EXISTING `state.toggled` + `state.indeterminate` slots -- "mixed" wins over
   "checked". `CheckboxGroupSkin` is the SAME factory (the master paints the
   identical 3-state contract, derived from its members; "mixed" reads as "some
   members"): one body, two registry ids + two SKIN_META rows. No new attribute, no
   new state slot.

3. BESPOKE REUSE-FIRST TRANCHE (no new dependency). Also shipped: `MeterSkin`
   (aria-valuenow/min/max + data-zone optimum|sub-optimum|low -> state.val +
   complete/error), `StepsSkin` (data-step-count/data-current-index/data-complete
   -> count + val-as-raw-index), `AccordionSkin` (aria-expanded/data-open ->
   toggled), `SkeletonSkin` (data-loading/aria-busy -> a zero-alloc globalAlpha
   shimmer, no gradient, no particles). Each reuses the E1 zero-alloc discipline:
   const palette colours, globalAlpha, precomputed scalars, fixed loops.

4. DEFERRALS (named, so E1b is bounded). To the lite-particles phase: pin-input
   (per-digit pop), file-upload (burst), toast (entrance), command-palette (glow).
   To a future big-canvas tranche: color-picker WHEEL, calendar/datepicker/
   time-picker GRIDS (each a substantial net-new canvas visual). To E3: the
   number-ticker/stat (a recipe, not a skin).

5. ESCALATION TRIGGER (inherited from 0008 dec. 7). If any skin -- the select
   open-state above all -- forces a change to the recipe hook contract, the state
   superset, or the single-host adapter's public shape, STOP and surface to the
   owner (one major, not a silent widening). E1b is built to NOT trip it: every skin
   is single-host and reuses existing slots.

## Consequences

- The skin registry grows from 4 to 11 (HEADLESS_SKINS / SKIN_META / SKIN_NAMES);
  RECIPES / RECIPE_META / the 57-recipe count are byte-identical. Skins are still a
  SIBLING registry (0008 dec. 4), driven by skinHeadless, never mountRecipe.
- No new dependency. lite-headless stays imported nowhere (grep-gated); lite-particles
  is NOT adopted this session.
- item 6 (`<select>` vs V4 skin) is resolved toward the V4 skin for the closed/
  trigger state. The open-state popup remains open, tracked here as the follow-on.
- The single-host adapter's public shape is unchanged, so a future multi-target
  extension for the select popup can be additive.

## Alternatives considered

- Extend `skinHeadless` to multi-host NOW (paint the trigger + the portaled
  listbox in E1b). Rejected: the popup is positioner-placed and portaled, so a
  second overlay + placement sync is real net-new adapter surface -- it would
  unbalance a reuse-first session and risks the escalation trigger. Deferred to a
  focused follow-on.
- A V1 `<select>` hijack (paint a native `<select>`). Rejected per ROADMAP-ELEMENTS
  sec 2a: lite-headless's `createSelect` already owns positioning/keyboard/dismiss,
  so a V4 skin composes with it instead of re-implementing the closed trigger.
- Two separate checkbox bodies (standalone vs group master). Rejected: the master
  paints the identical contract, so one body parameterised by id is less code and
  cannot drift.
