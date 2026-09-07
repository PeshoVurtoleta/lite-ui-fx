# 0007 -- Grouped controls: one canvas, N native elements (U7)

Status: accepted (U7, v1.9.0)
Depends on: 0002 (recipe options), 0003 (element types), 0004 (decorate mode),
0005 (host clock)
Supersedes: the ROADMAP U7 block's stale pointer "decisions/0003-group-contract.md"
(0003 is element types); this is the group-contract record, numbered 0007.

## Context

Vol.3 faked four multi-value controls on single elements: RadioOrbit and
BubbleRating as sliders, PillTabs as a slider, Stepper as a slider. A radio
group, a tablist, a spinbutton and a rating are each N native elements, so the
single-element fake gives them the WRONG arrow-key behaviour -- the exact class
of drift 0003 fixed for checkbox/progress/knob. U7 grows the vocabulary its last
step: a group is N native elements sharing ONE canvas and one recipe. The
roadmap flagged U7 as the one place a major might be forced; two questions had to
be answered in the record before the diff exists.

## Decision 1 -- the contract is additive; the session is 1.9.0 (owner call)

A group mounts through a NEW function beside the untouched ones, its state is a
SUPERSET of scalar state, and it adds ONE new optional hook. Nothing existing
changes shape.

- `mountUIFXGroup(container, GroupType, recipeFactory, { items, ... })` ->
  `{ els, canvas, wrapper, state, setIndex(i), destroy() }`. New export; the
  existing `mountUIFX` (hijack) and `decorateUIFX` (decorate) are byte-identical.
  `GroupType` (RADIO, TABS, STEPPER, RATING) is derived into the SAME validated
  set the mount guard and the registry read (the 0003 one-source-no-drift
  pattern), so guard / registry / d.ts cannot diverge as types are added.
- Group state EXTENDS the scalar per-frame state with SoA lanes: `index`
  (selected), `count`, and per-item geometry as preallocated Float32Array lanes
  read by index. Every scalar field (hover, active, focused, ..., reducedMotion,
  budget) survives unchanged; a single-element recipe never touches the lanes.
- Recipes gain ONE optional hook, `onSelect(index, state)`, fired exactly once
  per selection change. The eight existing hooks (init, tick, onHover, onLeave,
  onClick, onToggle, onDrag, destroy) keep their names and signatures verbatim.
- Re-homes ride the registry: RadioOrbit/PillTabs/Stepper/BubbleRating change
  only `RECIPE_META.type` to a group type, and mountRecipe routes a group type
  to mountUIFXGroup the way 'decorate' routes to decorateUIFX (0004). By-id
  mounts stay correct-by-construction; only a consumer who hardcoded the fake
  single-element mount (already the buggy path) sees a change -- treated as
  additive on the 0003/0004 precedent (the registry is the contract).

WHY 1.9.0 not 2.0.0: every piece is backward-compatible NEW functionality
(law: additive => MINOR). ESCALATION TRIGGER, fail closed: if pinning onSelect
or the SoA state extension were to force a change to any of the eight hook
signatures or a scalar state field, the session STOPS and escalates to the owner
for a single batched 2.0.0 (law 2) -- it does not drip a silent break. The design
above is built specifically to not trip this trigger; the trigger is the guard on
the claim.

## Decision 2 -- who owns the behaviour: standalone in U7, per control; U8 owns the composed path

lite-headless already ships ARIA-correct tabs/radio-group/toggle-group/stepper/
rating with the APG keyboard walks Playwright-tested. Reimplementing that roving
logic here would be the one duplication the suite should refuse -- BUT the roadmap
rule is decisive: "the U8 adapter covers the composed path; do not build B twice."
So U7 builds every group STANDALONE and leaves lite-headless composition to U8's
adapter. Per-control reasoning (the "planner decides per control" mandate):

- RADIO -- STANDALONE. `fieldset` + N `<input type=radio name=...>`. Roving
  selection and arrow keys are NATIVE; UIFX writes zero keyboard code. Free.
- RATING -- STANDALONE. A radiogroup of N radios (a rating IS a radio group of
  stars). Same native roving as RADIO. Free.
- STEPPER -- STANDALONE. `<input type=number>` spinbutton: ArrowUp/ArrowDown
  increment and direct typing are native; UIFX adds only the canvas skin and
  reads the value. Native carries the semantics.
- TABS -- STANDALONE in U7 (the only real keyboard work). `role=tab` buttons get
  NO native roving, so UIFX writes roving tabindex + Left/Right + Home/End on the
  native buttons on the COLD path; the canvas draws the strip. This is NOT
  composed on lite-headless -- that composed path is U8's adapter, built once.

Net: peers stays empty for U7; lite-headless is a U8 compose-target, never a U7
dependency. Radio/rating/stepper are free from native semantics; tabs is the one
hand-written keyboard surface, and it is small and cold.

## Consequences

- +1 mount function (mountUIFXGroup), +1 enum (GroupType, 4 members), +1 optional
  hook (onSelect), +N SoA state lanes, +1 recipe (SegmentedSlide), 4 re-homes --
  all additive; single-element mount is byte-identical. => semver MINOR (1.9.0).
- The eight-hook recipe contract (law 2) is untouched: onSelect is a ninth,
  optional hook; existing recipes that omit it are never called on it.
- Hot path: group tick reads SoA lanes by index -- no per-item objects, no per-
  frame rect reads. Native element rects are read once per layout change (resize),
  never per frame (forced-reflow law). Torture: t3 runs groups at N=2/5/12, t5
  runs 20 groups of 5, t9 control (a group recipe allocating per item per frame)
  must FAIL t3.
- The VERSION triple is untouched (pipeline session); `/release 1.9.0` owns the
  bump + CHANGELOG head. llms.txt keeps its `VERSION 1.8.0` line until release.
- U8's headless adapter is now the single home of the composed (lite-headless)
  path for all four patterns; U7 does not pre-build it.
