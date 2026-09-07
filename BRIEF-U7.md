---
package: "@zakkster/lite-ui-fx"
session: U7
version_target: 1.9.0        # corrected live ledger; impl lands at CURRENT 1.8.0, /release bumps
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-headless (U8 compose-target only -- NEVER a U7 dep)"]
findings: []
depends_on: [U4]
blocks: [U8]
---

# U7 -- grouped controls: radio, tabs, stepper, rating (one canvas, N native elements)

PURPOSE
  Vol.3 shipped four multi-value controls faked on single elements --
  RadioOrbit, PillTabs, Stepper, BubbleRating -- which is exactly why their
  arrow-key behaviour is wrong today (a radio group and a tablist are N
  elements, not one). A grouped control is N native elements (radios in a
  fieldset, tabs in a tablist, a spinbutton, a rating radiogroup) sharing ONE
  canvas and one recipe. U7 grows the element vocabulary its last step: a
  second mount function beside mountUIFX, so the four fakes re-home onto real
  native groups with correct keyboard semantics. This is the far edge of the
  vocabulary and the roadmap's one flagged candidate for a major -- OWNER CALL
  is additive 1.9.0 (below); the escalation trigger to 2.0.0 is named and
  fail-closed.

VERIFIED INPUTS (line-checked 2026-09-07, not inferred)
  - Baseline GREEN now: `npm test` => tests 205, suites 18, pass 205, fail 0
    (7 files, 18 describe blocks). Torture green as of the 1.8.0 release.
  - The recipe hook contract is EIGHT hooks, grepped authoritative from
    UIFXController.js recipe.* call sites: init, tick, onHover, onLeave,
    onClick, onToggle, onDrag, destroy. `onSelect` does NOT exist yet -- adding
    it is a NINTH optional hook, not a change to any of the eight.
  - The scalar per-frame state object (llms.txt "State Object", UIFXController):
    { hover, active, focused, toggled, indeterminate, disabled, val, w, h,
    padding, dpr, reducedMotion, budget } (+ decorate adds text, valid). Group
    state must be a SUPERSET of this -- add lanes, rename/drop nothing.
  - The registry routes by META.type: a UIType routes mountRecipe to mountUIFX,
    the string 'decorate' routes it to decorateUIFX (0004). Precedent 0003/0004:
    U4a/U4b re-homed EIGHT recipes by changing only `RECIPE_META.type` with NO
    recipe-body edit (proven by git diff); mountRecipe-by-id stayed correct-by-
    construction. The four U7 re-homes ride the SAME mechanism -- a META.type
    change routes them to the new group mount; the single-element mountUIFX API
    is byte-identical.
  - Controller couples the clock three ways (unchanged by U7): `new Ticker()`
    shared, `callerTicker.add(frame)` for { ticker }, `typeof
    callerTicker.add !== 'function'` fail-closed guard (UIFXController.js:298).
    A group rides the SAME clock modes (default / { ticker } / { driven }); no
    new clock work.
  - lite-headless (v1.8.0, catalog) already ships ARIA-correct tabs, radio-
    group, toggle-group, stepper, rating primitives, APG keyboard walks
    Playwright-tested. The roadmap's rule: "the U8 adapter covers the composed
    path; do not build B twice." So U7 must NOT compose lite-headless -- doing
    so would build the composed path here AND again in U8.
  - Roadmap numbering is STALE: the U7 block says version_target 1.7.0 and
    "record as decisions/0003-group-contract.md". Both wrong now: live ledger
    puts U7 at 1.9.0, and 0003 is taken (element types) -- the next ADR is 0007.
  - VERSION triple is 1.8.0 (package.json / UIFXController VERSION / llms.txt +
    the real sites: package-lock x2, test/law.test.mjs VERSION_EXPECTED). U7 is
    a PIPELINE session: it does NOT touch the triple. `/release 1.9.0` bumps it.

THE DECISION (recorded in decisions/0007-group-contract.md before coding)
  1. THE CONTRACT -- additive, a superset, a new function. Owner call: 1.9.0.
     - `mountUIFXGroup(container, GroupType, recipeFactory, { items, ... })`
       -> { els, canvas, wrapper, state, setIndex(i), destroy() }. A NEW export
       beside an untouched mountUIFX/decorateUIFX. `items` is the group's option
       (labels/count); the hijack-only single-element keys keep their fail-closed
       door.
     - Group state EXTENDS scalar state with SoA lanes: `index` (selected),
       `count`, and per-item geometry as preallocated Float32Array lanes the
       recipe reads by index (itemX/itemY/itemW/itemH or one packed lane).
       Every scalar field stays; a single-element recipe never reads the lanes.
     - Recipes gain ONE optional hook: `onSelect(index, state)`, fired exactly
       once per selection change with the new index. The eight existing hooks
       are byte-identical in name and signature.
     - ESCALATION TRIGGER (fail closed): if pinning onSelect OR the SoA state
       extension forces ANY change to an existing hook signature or a scalar
       state field, STOP -- that is the 2.0.0 fork (law 2: batch every wanted
       break into one major). Do not silently break; surface it to the owner.
       The design above is built to NOT trip this; the trigger is the guard.
  2. WHO OWNS THE BEHAVIOUR -- planner decides per control (owner call), all
     four STANDALONE in U7; lite-headless composition is U8's adapter, not U7.
     Per-control determination (full reasoning in 0007):
     - RADIO  -> STANDALONE. fieldset + N `<input type=radio name=...>`; roving
       selection + arrow keys are NATIVE (free). Re-home RadioOrbit.
     - RATING -> STANDALONE. radiogroup of N radios; native roving, same
       machinery as RADIO. Re-home BubbleRating.
     - STEPPER-> STANDALONE. `<input type=number>` spinbutton; ArrowUp/Down
       increment + typing are native. Re-home Stepper.
     - TABS   -> STANDALONE in U7. The one real APG-keyboard control: role=tab
       buttons get roving tabindex + Left/Right + Home/End written by hand on
       the native buttons (COLD path), canvas draws the strip. NOT composed on
       lite-headless -- that path is U8's adapter ("do not build B twice").
       Re-home PillTabs; new recipe SegmentedSlide.

TASKS
  - decisions/0007-group-contract.md: record decision 1-2 above (short ADR,
    same shape as 0001-0006; supersedes the roadmap's stale "0003" pointer).
  - UIFXController.js: add `GroupType` (RADIO, TABS, STEPPER, RATING) derived
    into the SAME VALID set the mount guard + registry read (0003 pattern -- one
    source, no drift); add `mountUIFXGroup`; build group state as a scalar-state
    superset with preallocated SoA item lanes (zero per-frame alloc); wire
    onSelect to fire once per selection change. Single-element mountUIFX/
    decorateUIFX code paths byte-identical.
  - Native wiring (cold path): RADIO/RATING via native fieldset/radiogroup
    roving; STEPPER via `<input type=number>` spinbutton; TABS roving tabindex
    + arrows/Home/End hand-written on the native buttons. Per-item hit state
    derives from the native elements' cached rects -- ONE read per layout change
    (resize), never per frame (U-11 / demo-audit forced-reflow law).
  - UIFXRecipes.js: re-home RadioOrbit -> RADIO, PillTabs -> TABS, Stepper ->
    STEPPER, BubbleRating -> RATING by changing only RECIPE_META.type (no body
    edit where possible; git diff proves it); add SegmentedSlide (TABS). Register
    in RECIPES / RECIPE_META / default export / a UIFXRecipes barrel; mountRecipe
    routes a group META.type to mountUIFXGroup.
  - test/torture.mjs: makeChurn learns the group types (mount N, drive selection,
    sweep index); t3 runs group recipes at N=2, 5, 12; t5 runs 20 groups of 5;
    t9 control -- a group recipe allocating per item per frame MUST fail t3.
  - llms.txt: add GroupType, mountUIFXGroup, the group-state lanes, onSelect, the
    four re-homes + SegmentedSlide. Do NOT bump the VERSION line (stays 1.8.0).
  - README.md: extend the API reference + a Composability note for a group mount;
    every new js block stays runnable (test/docs.test.mjs will execute it).
  - CHANGELOG: leave the head for `/release 1.9.0` (pipeline sessions never write
    the release head).

HOT PATH
  Group tick reads SoA lanes BY INDEX -- no per-item objects, no per-frame rect
  reads, no allocation. Selection changes write index (a number) + fire onSelect;
  neither allocates. All layout reads (native element rects) happen at init and
  on resize, never in a frame or pointer handler (forced-reflow law). The clock
  is unchanged, so the existing single-element torture GATE line must reproduce
  AND the new group tiers (t3 N=2/5/12, t5 20x5) must gate at alloc 0.

ASSERTIONS (falsifiable)
  - Radio/rating arrow keys move selection NATIVELY; tabs arrows + Home/End
    follow the APG; stepper Up/Down increments; every move fires onSelect
    EXACTLY once with the right index (no double-fire, no miss).
  - Screen-reader tree per pattern, asserted by attributes (the tree IS the
    contract): fieldset+legend for radio, tablist/tab + aria-selected +
    aria-controls for tabs, spinbutton value text for stepper, radiogroup for
    rating.
  - ADDITIVE proof: the single-element mountUIFX/decorateUIFX paths are byte-
    identical (git diff shows no signature change to the eight hooks, no scalar
    state field renamed/removed); a bare mount of any non-re-homed recipe is
    unchanged. If this cannot hold, the session escalates to the owner for 2.0.0.
  - Re-homed group recipes pass t1/t2/t3; mountRecipe('radioOrbit') et al route
    to mountUIFXGroup by META.type (correct-by-construction).
  - `npm test` => pass count >= 205 + the new group boundary cases, fail 0.
  - `node --expose-gc test/torture.mjs` => ok; the t9 per-item-per-frame control
    FAILS t3 (the gate bites); single-element GATE line reproduced.
  - No new runtime dependency: package.json dependencies unchanged (lite-headless
    absent -- it is a U8 compose-target). `npm pack --dry-run`: demo/, test/ absent.

NON-GOALS
  No listbox/combobox/menu (genuinely hard ARIA; a future roadmap earns them).
  No virtualisation. No lite-headless composition (that is U8's adapter). No
  version bump (that is `/release 1.9.0`). No clock/theming/reduced-motion change.

DONE WHEN
  Four group types with correct native keyboard semantics; vol.3's last four
  fakes re-homed onto real groups + SegmentedSlide added; onSelect is a ninth
  optional hook and group state a scalar-state superset (additive, 1.9.0); the
  per-control build decision recorded in 0007 and honoured (standalone, U8 owns
  the composed path); 205+ tests and the torture gate green; single-element path
  proven byte-identical.

-------------------------------------------------------------------------------
Versioning (corrected live ledger -- do NOT rewrite ROADMAP.md yet)
  git+npm tail: U0 1.0.5, U1 1.1.0, U2 1.2.0, U3a 1.3.0, U3b 1.4.0, U4a 1.5.0,
  U4b 1.6.0, U5 1.7.0, U6 1.8.0. So U7 -> 1.9.0 (additive; owner call), U8 ->
  1.10.0. ROADMAP.md sec 7 still shows pre-split numbering (U7=1.7.0) and a stale
  "0003" ADR pointer; both are owner-unblessed and left alone. Impl lands at the
  CURRENT triple 1.8.0; `/release 1.9.0` owns the bump + the CHANGELOG head.

Sizing
  A real module session (controller + recipes + torture + docs), unlike U6's
  docs-only weight. Grind the controller/recipe work in the MAIN thread -- a
  single-shot coder subagent stalls on a task this broad (recorded lesson). Use
  a tightly-scoped reviewer with the named invariants (additive proof, onSelect-
  once, SoA zero-alloc, no new dep) -- that shape completes. qa last, after
  reviewer returns APPROVED.
