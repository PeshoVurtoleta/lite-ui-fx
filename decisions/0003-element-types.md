# 0003 -- New native element types (checkbox, progress, knob)

Status: accepted (U4a, v1.5.0)
Supersedes nothing. Follows 0002 (recipe options). Roadmap: U4 (split; U4a here).
Findings: none (a growth session; the spine is law 1 -- native = source of truth).

## Context

Vol.3 faked richer controls on the three existing types: checkboxes were mounted
as `role=switch` TOGGLES (a check is not a switch), knobs and progress meters as
SLIDERS. This breaks law 1 (the native element must carry the correct semantics
and keyboard behaviour) and produces a WCAG role mismatch for the checkboxes. The
roadmap's U4 grows the element vocabulary to fix this; U4a is the first half
(new element TYPES + programmatic value sync), U4b is decorate mode.

U4 originally targeted 1.4.0, but U3b (theming) shipped as 1.4.0, so U4a is 1.5.0.

## Decision

1. THREE NEW UITYPES, each wrapping the correct native element (no faking):
   - `CHECKBOX` -> `<input type=checkbox>` WITHOUT `role=switch`. Indeterminate is
     a first-class state (`state.indeterminate`), set via `setValue(null)`.
   - `PROGRESS` -> native `<progress>` (non-interactive; value written only by
     `setValue`), value exposed to assistive tech by the element itself. Optional
     `announce` opt-in adds a visually-hidden `aria-live=polite` region updated at
     10% steps.
   - `KNOB` -> `<input type=range>` (arrow keys native), with a canvas-side
     `knobMode` ('rotate' | 'vertical') pointer remap: on pointerdown we
     `preventDefault` the range's native jump, restore focus by hand, and drive
     the value from the drag ourselves. Range semantics + a11y are the slider's;
     only the pointer-to-value transform differs.
   The mount type guard and the recipe registry both validate against `UIType`
   (a single `VALID_META_TYPES`/`_KNOWN_TYPES` set derived from it), so the guard,
   the registry, and the d.ts cannot drift as types are added. Unknown type still
   throws (fail closed).

2. GEOMETRY IS PRESERVED, NOT RETUNED. CHECKBOX inherits the 64x36 toggle default;
   PROGRESS and KNOB inherit the 200x28 slider default. So every one of the 8
   re-homed recipes renders byte-identical to its 1.4.0 (pre-U4a) era -- the
   re-home is a `RECIPE_META.type` string change with NO recipe-body edit (proven
   by `git diff`), and the new types differ from their donors by native element +
   event model + a11y, not by default size. Retuning knob/progress geometry is a
   later, deliberate change, not a side effect of adding the type.

3. PROGRAMMATIC SYNC via `instance.setValue(v)` / `instance.setChecked(b)`: one
   call updates the native element, `state`, any PROGRESS announcer, and fires the
   recipe hook (onDrag/onToggle) EXACTLY once. A programmatic `el.value`/`el.checked`
   write emits no native event, so the single explicit hook call is the only fire
   (no double-fire with the native `input`/`change` listeners). Fail closed on the
   wrong type or an out-of-range value; `setValue(null)` is the checkbox
   indeterminate path.

4. THE 3 NEW RECIPES ARE BORN THEMED + GATED. TickDraw + IndeterminateScan
   (CHECKBOX, honouring `state.indeterminate`) and LiquidFill (PROGRESS) use the
   0002 `resolveTheme`/`pickFont` helpers resolved once in init, and land under the
   t3 frame-alloc tier (default AND themed) from day one -- no pre-gate era. They
   are registered in RECIPES / RECIPE_META / the default export / a new
   `UIFXRecipes4` barrel (the Vol.1-3 barrels stay accurate historical snapshots).

## Deferred (explicitly NOT in U4a)

- DECORATE MODE (`decorateUIFX`) and its recipes (PasswordStrength/TypewriterField
  re-home; FocusHalo/ErrorShake/SuccessBloom) -> U4b (v1.6.0). It is the surface
  enrichment E2 builds on and earns its own focused session.
- ENGINE ADOPTION (lite-particles/noise/cellular for recipe bodies) -> the
  enrichment track (E1/E2/E3), where three families adopt it under one dependency
  decision. U4a's new recipes are hand-rolled on the proven 1.3.0 fixed-pool /
  const-color + globalAlpha discipline; the controller stays dependency-pure.
- Reduced motion / `state.budget` / the `motionSafe` flip -> U5. motionSafe stays
  false for all 53.

## Consequences

- +3 UITypes, +3 recipes (50 -> 53), +2 instance methods, +2 options
  (`knobMode`, `announce`), +1 state field (`indeterminate`) -- all additive;
  a bare mount of any existing recipe is unchanged. Backward-compatible NEW
  functionality -> semver MINOR (1.5.0).
- The recipe interface (law 2) is untouched: new types and value sync ride the
  existing `{ init, tick, on* }` shape and the options arg; no new hook.
- Torture: `makeChurn` learns the new types (checkbox drives like toggle +
  sweeps indeterminate; knob like slider; progress sweeps value with no hook);
  t0/t5 synthetic batches iterate all six types; t2 gains the CHECKBOX-no-switch,
  PROGRESS-value, KNOB-arrows, and setValue/setChecked-once contracts.
