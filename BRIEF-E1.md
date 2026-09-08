---
package: "@zakkster/lite-ui-fx"
session: E1
version_target: 1.10.0       # corrected live ledger; impl lands at CURRENT 1.9.1, /release bumps
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-headless (compose-target only -- NEVER a dep)", "@zakkster/lite-particles (recipe engine; dep is lite-random, already present)"]
findings: []
depends_on: [U6, U7]
blocks: [E2, E3]
---

# E1 -- headless-skin adapter + the core skin pack (skin lite-headless through the painted contract)

PURPOSE
  lite-headless ships 62 ARIA-correct primitives that deliberately render
  nothing and paint a small, canonical set of state attributes for exactly this
  purpose. lite-ui-fx's decorate mode (U4b) is the missing visual half. E1 adds
  ONE adapter -- skinHeadless -- that turns any lite-headless primitive into a
  recipe target by OBSERVING its painted attributes, owning zero lines of ARIA
  and importing zero lines of lite-headless. This is the two-package pitch
  nothing in the vanilla ecosystem matches: canvas-grade visuals + real native
  semantics + framework-free + agent-readable. It is the first of three
  enrichment sessions (E1 adapter+skins / E2 decorations / E3 catalog+demo).

VERIFIED INPUTS (line-checked 2026-09-07, not inferred)
  - Baseline GREEN + CLEAN: git tail `2bb5f8c 1.9.1` (committed), working tree
    clean, `npm view @zakkster/lite-ui-fx version` => 1.9.1, local triple 1.9.1.
    57 recipes authoritative from code (RECIPES / RECIPE_META / RECIPE_NAMES all
    === 57; themeable all true; motionSafe 6). Torture baseline alloc =
    0.8759765625 B/op green as of 1.9.1.
  - The recipe hook contract is EIGHT hooks + onSelect (the U7 ninth, group-only):
    init, tick, onHover, onLeave, onClick, onToggle, onDrag, destroy, onSelect. A
    skin is an ordinary recipe under this contract; skinHeadless is a MOUNT
    adapter beside mountUIFX / decorateUIFX / mountUIFXGroup, not a contract change.
  - decorateUIFX (U4b) is the placement precedent: a canvas sibling positioned
    from a live host's offset box, host never reparented, removed on destroy (host
    byte-identical). skinHeadless reuses this placement; it differs only in WHERE
    state comes from (a lite-headless primitive's painted attributes, not the
    host's own input events).
  - lite-headless present locally at v1.9.1 (@zakkster/lite-headless).
    **62 primitives** (llms.txt:5) -- the roadmap/U8 brief says 59; STALE, use 62.
    Every E1 skin target exists in the catalog (llms.txt:9-18): meter, progress,
    skeleton, rating, switch, slider, steps, pin-input, file-upload, toast,
    command-palette, color-picker.
  - HANDLE SHAPE (llms.txt:31-33 + src/switch/llms.txt:63-71): `createXxx(opts)`
    returns a handle with per-ROLE `attach<Role>(el)` methods (switch:
    attachRoot/attachLabel/attachThumb/attachInput) + `destroy()`; overlays add
    open/status/setOpen/toggle. It is NOT a single attach(el). Handles are
    lite-signal-based and expose accessor methods (e.g. `switch.isChecked()`) and
    accept controlled-mode signals -- this is the OPTIONAL reactive fast path.
  - PAINTED-ATTRIBUTE CONTRACT is CANONICAL as of lite-headless v0.11.0 and
    BINDING for every primitive (docs/CSS_CONTRACT.md). Four classes:
      1. ARIA attributes (semantic; always paired with a data-attr).
      2. Boolean data-* -- presence = true (data-open, data-checked, data-disabled,
         data-selected, data-active, data-loading, data-complete, data-error,
         data-dragging, data-filled, data-half-filled, ...).
      3. Enum data-*="value" -- fixed value spaces (data-status
         closed|opening|open|closing; data-zone optimum|sub-optimum|low|high;
         data-orientation horizontal|vertical; data-img-state
         idle|loading|loaded|error; ...).
      4. Slot markers `data-<primitive>-<role>` -- consumer INPUT the wrapper reads
         to discover which element plays which role (data-switch-thumb,
         data-slider-thumb, data-rating-item, data-rating-rail, ...).
    Classes 1-3 are the OUTPUTS skinHeadless observes; Class 4 is how it finds the
    element(s) to paint over. The contract is SETTLED: a v0.10->v0.11 migration
    table (CSS_CONTRACT.md:223-244) shows the old inconsistent `data-state` was
    replaced by these; target the v0.11.0+ contract, not older.
  - WRINKLE (line-checked): switch paints `data-checked="true"` in VALUE form
    (src/switch/llms.txt:84,96) while the Class-2 taxonomy lists data-checked as a
    presence-boolean (CSS_CONTRACT.md:78). The observer MUST treat "attribute
    present, ANY value" as truthy -- never assume pure presence. Pin the exact
    per-primitive shape from each primitive's own llms.txt at coding time (each
    ships one next to its source with its painted-attribute contract, llms.txt:50).
  - DEPENDENCY LAW (decisions/0007, BRIEF-U7): lite-headless is a compose-target,
    NEVER a dependency. skinHeadless couples through the painted contract + a
    duck-typed handle, so ./headless works against any lite-headless honouring the
    v0.11.0+ contract. The controller stays dependency-pure; any engine dep lives
    behind the recipe/adapter subpath.
  - ENGINE: @zakkster/lite-particles is the enrichment particle engine -- headless,
    host-driven `.update(dt)` + `.draw(ctx, cb)`, 0 B/call, ONLY dep is lite-random
    (already a lite-ui-fx dep). Adopting it for pop/burst/entrance skins is a
    scoped dep decision for this session; no engine may own a RAF (drive off the
    shared/driven clock).
  - Roadmap numbering is STALE: ROADMAP.md sec 7 shows U8 = 1.8.0 and the U8 ADR
    pointer is "0004-headless-skins.md" (0004 is decorate-mode). Live ledger puts
    this session at 1.10.0 and the next ADR at 0008. Both owner-unblessed; left alone.

THE DECISION (recorded in decisions/0008-headless-skins.md before coding)
  1. COUPLING -- arm's-length through the PAINTED CONTRACT, never an import.
     `skinHeadless(handle, recipeFactory, options)` on a NEW `./headless` subpath.
     lite-headless absent from `dependencies` (grep-proven). Duck-types the handle
     as `{ destroy: fn, ...optional signal accessors }`; the host element is passed
     or discovered via Class-4 slot markers. Mirrors the arm's-length idiom
     lite-headless itself uses for lite-floating.
  2. STATE DERIVATION -- ONE MutationObserver (cold path) on the host subtree,
     `attributeFilter` = exactly the Class 1-3 attributes the chosen recipe
     consumes. The callback parses changed attributes into PREALLOCATED recipe-state
     slots at EVENT time -- never a per-frame attribute read. "Attribute present,
     any value" = truthy (handles the boolean + value forms). OPTIONAL reactive
     fast path: if the handle exposes a duck-typed signal accessor (isChecked /
     value / index / status), subscribe and write the SAME slots, skipping the
     observer for that dimension.
  3. PLACEMENT -- reuse the U4b decorate placement: a canvas sibling positioned
     from the slot-marked element's offset box; host never reparented; overlay +
     observer removed on destroy, host byte-identical.
  4. SKIN-PACK SCOPE (E1 tranche). Reuse-first ships WITHOUT a new dep: meter,
     progress, skeleton, rating, switch, slider, steps (bodies reuse U4
     liquid/ring/battery + the U3 zero-alloc discipline). color-picker's canvas
     wheel is the one net-new canvas-native visual. Particle skins (pin-input pop,
     file-upload burst, toast entrance) ride lite-particles IFF the dep is adopted
     this session; otherwise they defer to E2. Per the enrichment sizing note, E1
     MAY absorb E3's 6 loaders if lite-particles is adopted here.
  5. ESCALATION TRIGGER (fail closed): if driving recipe state from the painted
     contract forces ANY change to the eight+onSelect hook contract or the
     scalar/decorate state shape, STOP and surface to the owner (law 2 -- batch
     breaks into one major). The design is built to NOT trip this: a skin is a
     recipe; skinHeadless is a mount adapter like decorateUIFX.

TASKS
  - decisions/0008-headless-skins.md: record decisions 1-5 (short ADR, shape of
    0001-0007; supersedes the roadmap's stale "0004-headless-skins" pointer).
  - ./headless subpath: skinHeadless(handle, recipeFactory, options). Duck-type
    the handle; resolve the paint target(s) via slot markers or an explicit el;
    build ONE MutationObserver with a recipe-declared attributeFilter, preparse
    into preallocated state slots; optional signal fast-path; disconnect + remove
    overlay on destroy. Fail closed: a handle without destroy, a missing target,
    an unknown option key -> throw with a did-you-mean. lite-headless NOT imported
    (grep-gated in test).
  - headless-skin recipe family: register the E1 tranche in RECIPES / RECIPE_META
    (family 'headless-skin'), each themed via the U-06 shape, born under t3. Reuse
    U4 meter/progress/ring/battery/liquid bodies where the primitive matches;
    color-picker wheel is new.
  - torture: t3 runs every skin (zero per-frame alloc; the observer parse is
    event-time); a t0 tier asserts skinHeadless leaves the host's attribute set
    ADDITIVE-ONLY and restores exactly on destroy (DOM diff); t9 control -- a skin
    that reads a painted attribute per FRAME (not observer-time) MUST fail t3.
  - engine (if adopted): add @zakkster/lite-particles behind ./headless; controller
    `dependencies` unchanged; particle skins host-driven under the shared/driven
    clock, no engine RAF. Confirm host-drivability at coding time.
  - llms.txt + README: the ./headless subpath, the skinHeadless contract (handle
    duck-type + painted-attribute observation + slot-marker discovery + fast path),
    the skin catalog + 'headless-skin' family, the two-package pitch. Do NOT bump
    the VERSION line (pipeline session; /release 1.10.0 owns it).
  - demo: a combined page mounting lite-headless primitives skinned live, consuming
    ONLY public exports (the E1 pitch), generated from RECIPE_META where possible;
    reflow-clean under #profile (skins sit over live DOM -- read metrics at
    init/resize only).

HOT PATH
  The MutationObserver callback runs at EVENT time and writes changed attributes
  into preallocated state slots -- zero per-frame work, zero per-frame attribute
  reads, zero layout reads in a frame (U-11 / demo-audit forced-reflow law). Skins
  tick under the shared (or driven) clock, reading slots by field. No lite-headless
  import on any path (grep-proven). Particle skins ride lite-particles' 0-B/call
  update/draw. The existing single-element torture GATE line must reproduce AND the
  new skin tier must gate at alloc 0.

ASSERTIONS (falsifiable)
  - A lite-headless switch/slider/rating/progress skinned by UIFX keeps the
    primitive's OWN semantics: the host's painted-attribute + ARIA set is
    ADDITIVE-ONLY after skin mount (attribute diff), keyboard/AT behaviour
    unchanged; the visual is driven by the observed state; destroy() removes ONLY
    the overlay + observer and restores the host EXACTLY (t0 DOM diff).
  - grep proves zero '@zakkster/lite-headless' in package.json dependencies AND
    zero import of it anywhere in the package (compose-target, not a dep).
  - The observer treats data-checked (presence) and data-checked="true" (value)
    identically as truthy -- a boundary test pins both forms.
  - Every skin: t1/t2/t3 green at default + a non-default size; themed via the
    U-06 shape; present in RECIPE_META family 'headless-skin'; mounted in the demo
    from META.
  - No per-frame attribute read: the t9 control (a skin polling a painted
    attribute every tick) FAILS t3; the observer-driven skin passes.
  - Single-element / group / decorate mount paths byte-identical (skinHeadless is
    additive; the eight+onSelect hook contract untouched). If it cannot hold ->
    escalate to the owner for 2.0.0.
  - `npm test` => pass >= baseline + new adapter/skin cases, fail 0; `node
    --expose-gc test/torture.mjs` => ok; single-element GATE line reproduced
    (alloc 0.8759765625 B/op). `npm pack --dry-run`: ./headless entry present,
    demo/ + test/ absent, lite-headless absent from deps.

NON-GOALS
  No lite-headless import or dependency (permanent -- compose-target). No overlay
  behaviour of any kind (focus traps, dismiss stacks, positioning -- lite-headless
  owns behaviour, permanently). No fullscreen backgrounds/atmospheres
  (lite-ambient-fx), no reveal effects (lite-scratch-fx), no React wrappers. No
  text-fx / pointer / card decorations (that is E2). No loader-family growth,
  family map, or acquisition gallery (that is E3, unless folded per the sizing
  note). No version bump (that is /release 1.10.0). No change to the recipe hook
  contract or the scalar/decorate/group state shape.

DONE WHEN
  skinHeadless ships on ./headless and couples through the painted contract with
  zero lite-headless imports (grep-proven); the E1 skin tranche is registered,
  themed, and t3-gated, each mounted from META in the demo; a skinned primitive's
  semantics are provably untouched (additive attribute diff, exact restore on
  destroy); the per-frame-read control fails t3; ADR 0008 records coupling +
  observer + scope + escalation; tests + torture green; single-element path proven
  byte-identical.

-------------------------------------------------------------------------------
Versioning (corrected live ledger -- do NOT rewrite ROADMAP.md yet)
  git+npm tail: U0 1.0.5, U1 1.1.0, U2 1.2.0, U3a 1.3.0, U3b 1.4.0, U4a 1.5.0,
  U4b 1.6.0, U5 1.7.0, U6 1.8.0, U7 1.9.0, patch 1.9.1 (ReactionPicker fillStyle
  alpha). So E1 -> 1.10.0 (first enrichment/U8 session; additive). E2 -> 1.11.0,
  E3 -> 1.12.0 (additive minors). ROADMAP.md sec 7 still shows pre-split numbering
  (U8 = 1.8.0) and a stale "0004-headless-skins" ADR pointer (0004 is decorate
  mode); both owner-unblessed, left alone. Impl lands at the CURRENT triple 1.9.1;
  `/release 1.10.0` owns the bump + the CHANGELOG head.

Sizing
  A real module session (adapter + observer + skins + torture + docs). Grind the
  ./headless adapter + MutationObserver in the MAIN thread -- a single-shot coder
  subagent stalls on breadth (recorded lesson). The skin bodies mostly REUSE U4
  recipe bodies (meter/progress/ring/battery/liquid), so the net-new surface is
  the adapter + the color-picker wheel + (optional) particle skins. Per the
  enrichment sizing note, E1 can absorb E3's 6 loaders IF lite-particles is adopted
  here; otherwise keep E1 to the adapter + reuse-first skins and let particle skins
  ride E2. Use a tightly-scoped reviewer on the named invariants (no lite-headless
  import, additive host attribute diff, observer-not-per-frame, zero-alloc, exact
  restore on destroy). qa last, after reviewer returns APPROVED.
