---
package: "@zakkster/lite-ui-fx"
session: E1b
version_target: 1.11.0       # live ledger, re-sequenced this session (B before A); impl lands at CURRENT 1.10.0, /release bumps
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-headless 1.9.1 (compose-target only -- NEVER a dep)"]
findings: []
depends_on: [E1]
blocks: []
---

# E1b -- headless-skin continuation: the select + tri-state pack (bespoke, no particles)

PURPOSE
  E1 (1.10.0) shipped the skinHeadless adapter + 4 core skins (switch, slider,
  progress, rating). It deliberately scoped down from the ~11 skins the roadmap
  named and deferred the rest (ADR 0008 decision 4). E1b clears the BESPOKE
  (non-particle) half of that backlog and adopts the three new lite-headless 1.9.x
  canon primitives flagged by the parallel lite-headless thread (ROADMAP-ELEMENTS
  sec 2a): select, checkbox, checkbox-group. Its headline is SelectSkin, which
  resolves the long-open "item 6" decision (paint a native `<select>`/dropdown as a
  V1 hijack vs. a V4 skin) toward a V4 skin of createSelect. No lite-particles, no
  ARIA, no new controller dependency -- the same arm's-length painted-contract
  couple E1 proved. The particle-riding skins (pin-input pop, file-upload burst,
  toast entrance, command-palette glow) stay deferred to the later lite-particles
  phase per the re-sequenced enrichment track (E1b -> E2 -> lite-particles).

VERIFIED INPUTS (line-checked 2026-09-08, not inferred)
  - Baseline GREEN + CLEAN: local + npm triple = 1.10.0 (published +
    @zakkster/lite-ui-fx@1.10.0). 57 recipes authoritative from code (RECIPE_NAMES
    === 57, unchanged); the E1 skin registry is live and SEPARATE from RECIPES:
    SKIN_NAMES === ['switchSkin','sliderSkin','progressSkin','ratingSkin'] (4),
    SKIN_META rows = { id, name, primitive, themeable, motionSafe }. Torture
    baseline at 1.10.0: `GATE leak=size 0/0 findings=0 warnings=0 | gc major=0
    minor=0 maxMs=0.00 | alloc=0.8642578125 B/op | ok`.
  - The shipped adapter (verified in UIFXController.js / UIFXHeadless.js):
    `skinHeadless(handle, recipeFactory, options)` on `./headless`, also exported
    from `.`. HEADLESS_OPTIONS = ['host','padding','seed','colors','theme','text',
    'font','ticker','driven']; `host` REQUIRED + must be attached. A skin recipe
    carries `recipe.headless = { attrs:string[] (non-empty), read(host, handle,
    state) }`. skinHeadless builds ONE MutationObserver (attributeFilter =
    recipe.headless.attrs, subtree:true) and calls read() at EVENT time into the
    preallocated state superset. Returns { el, canvas, state, tick, setValue(throws),
    setChecked(throws), destroy }. destroy is idempotent, removes overlay + observer
    + listeners, and NEVER touches host or handle. This adapter takes ONE host box.
  - lite-headless present locally at v1.9.1 (llms.txt:4), 62 primitives (llms.txt:6).
    All E1b targets exist as src/<name>/ dirs: select, checkbox, checkbox-group,
    meter, steps, accordion, skeleton (+ the deferred color-picker, calendar,
    datepicker, time-picker, pin-input, file-upload, toast, command-palette).
  - PAINTED CONTRACTS (read from each primitive's own src/<name>/llms.txt, the
    authoritative source per ADR 0008):
    * checkbox (src/checkbox/llms.txt:65-73) -- SINGLE host, `attachRoot(el)`.
      Root paints: `aria-checked="true|false|mixed"` (VALUE form, straight from the
      one 3-valued signal), `data-checked` (presence when "true"), `data-indeterminate`
      (presence when "mixed"), `data-disabled`, `aria-disabled`, `aria-required`.
      Handle accessors: checked(), indeterminate(), disabled(). This is a clean
      single-host fit; the tri-state maps onto the EXISTING state.indeterminate slot.
    * checkbox-group (src/checkbox-group/llms.txt:66-72) -- master is a SINGLE host,
      `attachMaster(el)`, painting the SAME 3-state contract as a checkbox root
      (aria-checked true|false|mixed + data-checked/data-indeterminate/data-disabled),
      DERIVED from members. Handle: state() -> "true"|"false"|"mixed", value() ->
      string[], memberCount. The master skin == the checkbox skin over an aggregate.
    * select (src/select/llms.txt:92-120) -- MULTI-element. Trigger `[data-trigger]`:
      role=button, aria-haspopup=listbox, aria-expanded="true|false", aria-controls,
      aria-activedescendant (while open). Listbox `[data-listbox]` (PORTALED to
      container, default document.body): data-open, data-status="closed|opening|open
      |closing", data-side/data-align, aria-hidden when closed. Option `[data-item]`:
      aria-selected, data-selected, data-highlighted, data-disabled. Handle: open()
      (ReadSignal), status(), value(), attachTrigger/attachListbox/attachItem.
      CRITICAL: the trigger and the listbox are in DIFFERENT boxes (the listbox is a
      detached, positioner-placed popup) -- so the OPEN state is NOT inside the
      trigger's offset box that the single-host adapter places its overlay from.
  - value-vs-presence wrinkle CONFIRMED again: checkbox paints aria-checked in VALUE
    form ("true"/"false"/"mixed") while data-checked is presence. The E1 readers
    (_skinBool present-and-not-"false", _ariaTrue) already handle this; a tri-state
    read adds only the aria-checked==="mixed" -> indeterminate branch.
  - DEPENDENCY LAW (ADR 0007/0008): lite-headless stays a compose-target, never a
    dependency; the ./headless subpath imports it nowhere (grep-gated). E1b adds NO
    new dependency (no lite-particles this session -- that is the later phase).
  - ROADMAP.md numbering STALE + owner-unblessed (still shows U8 = 1.8.0); left
    alone. ROADMAP-ELEMENTS sec 2a (the lite-headless thread's input) is doc-only,
    non-binding planning; this brief is its first turn into an executable session.

THE DECISION (record in decisions/0009-headless-skins-select.md before coding)
  1. SELECT SCOPE -- trigger-first, portaled-listbox recorded as the one risk.
     SelectSkin skins the TRIGGER (closed + expanded states) through the shipped
     single-host adapter: read aria-expanded -> an open/close affordance (chevron
     rotate), value() -> the selected-value visual, aria-activedescendant is ignored
     by the trigger skin. This is a clean single-host fit and IS the closed-state
     answer to item 6. The OPEN-state listbox/option paint is a portaled popup in a
     different box (positioner-placed) -- the single-host adapter cannot place an
     overlay there. Decision: SHIP the trigger skin in E1b; RECORD the listbox
     open-state paint as an explicit follow-on that needs either (a) a portal-aware
     second overlay or (b) a multi-target adapter extension. Do NOT extend the
     adapter to multi-host in E1b unless it stays provably additive AND does not
     touch the state shape (escalation trigger 5). This keeps item 6 resolved
     (V4-skin, trigger visual now) without gambling the session on the popup.
  2. TRI-STATE CHECKBOX -- reuse the SwitchSkin machinery. CheckboxSkin is a
     single-host skin whose read() maps aria-checked/data-checked -> state.toggled
     and aria-checked==="mixed"/data-indeterminate -> state.indeterminate (BOTH
     already in the state superset -- zero contract change). CheckboxGroupSkin is
     the SAME recipe over the master (it paints the identical 3-state contract),
     differing only in that "mixed" reads as "some members" -- a label/semantic note,
     not a new attribute. A SINGLE tri-state body serves both, parameterised by id.
  3. BESPOKE REUSE-FIRST TRANCHE (no new dep). Ship, in reuse-first order:
     CheckboxSkin, CheckboxGroupSkin (dec. 2); SelectSkin trigger (dec. 1);
     MeterSkin (reuse the progress/battery/signal bodies -- meter is progress with
     an optimum band, data-zone optimum|sub-optimum|low|high); StepsSkin (a
     numbered progress rail); AccordionSkin (a chevron-rotate + open/height hint off
     data-open/aria-expanded). SkeletonSkin (an animated gradient shimmer) is a
     candidate IFF the shimmer stays zero-alloc without particles (a precomputed
     gradient swept by a scalar phase -- no lite-noise, no lite-particles); drop it
     to the later phase if it cannot.
  4. DEFERRALS (named, so E1b is bounded not open-ended):
     - lite-particles phase (later): pin-input (per-digit pop), file-upload
       (progress burst), toast (entrance), command-palette (glow) -- all need the
       particle engine.
     - big-canvas tranche (its own future session): color-picker WHEEL, calendar /
       datepicker / time-picker GRIDS -- each a substantial net-new canvas visual,
       not a reuse; batching them here would unbalance the session.
     - stat / number-ticker -> E3 (catalog), not a skin.
  5. ESCALATION TRIGGER (fail closed, inherited from ADR 0008 dec. 7): if any skin
     -- especially the select open-state -- forces a change to the recipe hook
     contract, the state superset, or the single-host adapter's public shape, STOP
     and surface to the owner (one major, not a silent widening). The design avoids
     it: every E1b skin is single-host and reuses existing state slots.

TASKS
  - decisions/0009-headless-skins-select.md: record decisions 1-5 (short ADR in the
    0001-0008 shape). It EXTENDS 0008 (the skin family), it does not supersede it.
  - Skins in UIFXRecipes.js, registered in the EXISTING sibling registry
    (HEADLESS_SKINS / SKIN_META / SKIN_NAMES) -- NOT RECIPES/RECIPE_META, so the
    57-recipe count stays unchanged (ADR 0008 dec. 4). Each carries recipe.headless
    = { attrs, read }; each themed via the U-06 shape; each born under t3 (zero
    per-frame alloc; const colours + globalAlpha, precomputed LUTs, no per-frame
    getAttribute -- reads happen in read() at observer time).
  - A single tri-state body shared by checkboxSkin + checkboxGroupSkin (dec. 2);
    selectSkin trigger body (dec. 1); meter/steps/accordion bodies reusing the U4
    progress/battery/signal shapes; skeletonSkin iff zero-alloc shimmer holds.
  - ./headless surface + types: export the new skin factories from UIFXHeadless.js
    (+ .d.ts); SKIN_NAMES grows from 4 to 4+N; SKIN_META gains a row per skin.
  - torture: t6 (the E1 skin tier) runs every NEW skin (colorDistinct cdist<=64 +
    gradInTick grad=0, default + themed); the t0/retention tier asserts every new
    skin leaves the host attribute set ADDITIVE-ONLY and restores EXACTLY on destroy
    (DOM diff), handle never destroyed; a t9 control -- a skin that reads a painted
    attribute PER FRAME instead of at observer time -- MUST fail t3.
  - test/headless.test.mjs: extend for the tri-state boundary (aria-checked
    true|false|mixed each map correctly; data-indeterminate presence), the select
    trigger (aria-expanded open/close drives the affordance; value() -> selected
    visual), and the additive-diff + exact-restore invariants per new skin.
  - llms.txt + README: add the new skins to the ./headless skin catalog + SKIN_META
    list; note select resolves the item-6 dropdown decision toward a V4 skin.
    Do NOT bump the VERSION line (pipeline session; /release 1.11.0 owns it).
  - demo: mount each new skin over a live lite-headless primitive (public exports
    only); reflow-clean under #profile (read metrics at init/resize only).

HOT PATH
  Identical to E1: the MutationObserver callback runs at EVENT time and writes
  changed attributes into preallocated state slots; skins tick under the shared (or
  driven) clock reading slots by field -- zero per-frame attribute read, zero
  per-frame allocation, zero layout read in a frame. No lite-headless import on any
  path (grep-proven). The 1.10.0 GATE line must reproduce (alloc 0.8642578125 B/op)
  and every new skin must gate at alloc 0 under t6.

ASSERTIONS (falsifiable)
  - A skinned checkbox/checkbox-group/select keeps its OWN semantics: the host's
    painted-attribute + ARIA set is ADDITIVE-ONLY after skin mount (attribute diff),
    keyboard/AT unchanged; destroy() removes ONLY the overlay + observer and restores
    the host EXACTLY (t0 DOM diff); the lite-headless handle is never destroyed.
  - Tri-state boundary: aria-checked="true" -> toggled+not-indeterminate,
    "false" -> neither, "mixed" -> indeterminate; data-checked (presence) and
    data-checked="true" (value) both read truthy. A test pins all three states.
  - SelectSkin trigger: aria-expanded "true"/"false" drives the open/close
    affordance; value() drives the selected-value visual; mounting the trigger adds
    NO attribute to the trigger and restores it exactly on destroy.
  - grep proves zero '@zakkster/lite-headless' in dependencies AND zero import
    anywhere; zero '@zakkster/lite-particles' this session (deferred).
  - Every new skin: t6 green at default + themed; themed via the U-06 shape; present
    in SKIN_META; mounted in the demo. RECIPE_NAMES stays === 57; SKIN_NAMES grows
    to 4+N; the four E1 skins unchanged.
  - No per-frame attribute read: the t9 control (a skin polling a painted attribute
    every tick) FAILS t3; the observer-driven skins pass.
  - `npm test` => pass >= baseline + new adapter/skin cases, fail 0; `node
    --expose-gc test/torture.mjs` => ok, 1.10.0 GATE line reproduced (alloc
    0.8642578125 B/op). `npm pack --dry-run`: ./headless present, demo/ + test/
    absent, lite-headless + lite-particles absent from deps.

NON-GOALS
  No lite-headless import or dependency (permanent). No lite-particles this session
  (that is the phase AFTER E2). No overlay BEHAVIOUR (positioning, focus, dismiss --
  lite-headless owns it permanently); the select LISTBOX open-state paint (portaled
  popup) is explicitly deferred (dec. 1). No color-picker wheel or calendar/date/
  time grids (the big-canvas tranche). No text-fx / pointer / card decorations (E2).
  No change to the recipe hook contract or the state superset. No version bump (that
  is /release 1.11.0). No rewrite of ROADMAP.md.

DONE WHEN
  The bespoke skin tranche -- checkbox (tri-state), checkbox-group master, select
  trigger, meter, steps, accordion (+ skeleton iff zero-alloc) -- ships in the
  EXISTING HEADLESS_SKINS registry, themed and t6-gated, each mounted from SKIN_META
  in the demo; item 6 is resolved (SelectSkin trigger, V4); a skinned primitive's
  semantics are provably untouched (additive attribute diff, exact restore on
  destroy, handle intact); the per-frame-read control fails t3; ADR 0009 records the
  select scope + tri-state reuse + deferrals + escalation; tests + torture green with
  the 1.10.0 GATE reproduced; RECIPE_NAMES still 57.

-------------------------------------------------------------------------------
Versioning (live ledger, RE-SEQUENCED this session -- owner-set, ROADMAP.md unblessed)
  git+npm tail through E1: U5 1.7.0, U6 1.8.0, U7 1.9.0, patch 1.9.1, E1 1.10.0
  (published). Owner re-sequenced the enrichment track this session: E1b (this) ->
  1.11.0, then E2 (text-fx + pointer/card decorations) -> 1.12.0, then the
  lite-particles integration phase -> 1.13.0 (picks up the deferred particle skins
  pin-input/file-upload/toast/command-palette + E2's particle decorations + E3's
  particle loaders), with E3's remaining catalog/family-map/gallery work after.
  All additive minors; owner-owned and unblessed in ROADMAP.md (left alone). Impl
  lands at the CURRENT triple 1.10.0; `/release 1.11.0` owns the bump + CHANGELOG.

Sizing
  A focused module session: one new tri-state body (serving checkbox + group), the
  select trigger body, and 3-4 reuse-first bespoke skins (meter/steps/accordion/
  skeleton) over U4 progress bodies. The net-new surface is small -- the adapter,
  registry, observer, and torture tiers all exist from E1. Grind in the MAIN thread
  (recorded lesson: single-shot coder subagents stall on breadth); use a tightly
  scoped reviewer on the named invariants (no lite-headless import, additive host
  diff, observer-not-per-frame, zero-alloc, exact restore on destroy, tri-state
  boundary correctness). The ONE risk to watch is the select open-state popup --
  keep it deferred (dec. 1) so it cannot trip the escalation trigger. qa last, after
  reviewer returns APPROVED.
