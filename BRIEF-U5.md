===============================================================================
# U5 -- lite-ui-fx v1.7.0 -- host integration (one clock, calm frames)
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.7.0     # live tail: U3 split -> 1.3.0/1.4.0, U4 split -> 1.5.0/1.6.0; U5 is 1.7.0 (roadmap ledger still shows the stale 1.5.0 -- see Versioning)
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
findings: []              # growth/integration session, not a finding fix; law 1 (native = source of truth) + law 4 (zero-gc) are the spine
depends_on: [U3, U3b]     # zero-GC/size-true (1.3.0) + option/theme shape (1.4.0); both landed. INDEPENDENT of U4 -- ran parallel by design
blocks: [U6]              # the blueprint docs + consumer demo document the surface U2..U5 finish; U6 needs U5 settled
peers: ["@zakkster/lite-ticker", "@zakkster/lite-gc-profiler", "@zakkster/lite-leak"]
---

# lite-ui-fx -- one clock for a game UI, calm frames for everyone else

PURPOSE
  The package is keyword-tagged "game" (package.json) but forces its own RAF loop:
  a host already running @zakkster/lite-ticker gets a SECOND clock it cannot
  control, cannot pause, and cannot single-step. And nothing in a package whose
  entire output is motion respects prefers-reduced-motion -- including U4b's
  ErrorShake, a literal horizontal shake, which is exactly the thing the media
  query exists to suppress. U5 hands the host the clock (inject a lite-ticker, or
  drive instance.tick(dtMs) by hand) and hands motion-sensitive users a calm path,
  across BOTH mount modes -- hijack (mountUIFX) and decorate (decorateUIFX). Both
  siblings (lite-ambient-fx, lite-scratch-fx) already solved both; adopt their
  shapes, do not reinvent them. Every default mount stays byte-identical to 1.6.0.

VERIFIED INPUTS (state as of 1.6.0, line-checked 2026-09-07 -- read before planning)
  - ONE shared module-level ticker drives every component in BOTH modes.
    _sharedTicker (UIFXController.js:31) + a _sharedRefs counter; acquireTicker()
    (34-40: lazily `new Ticker(); .start()` on first, bumps refs) and
    releaseTicker() (43-47: decrement, `.destroy()` + null when refs hit 0).
    mountUIFX: `const ticker = acquireTicker()` (587), then
    `removeTick = ticker.add((dtMs) => {...})` (592). decorateUIFX: IDENTICAL --
    acquireTicker (952), `ticker.add((dtMs) => {...})` (957). U5's caller-ticker
    and driven modes intercept THIS acquisition site, in BOTH functions.
  - The tick closure is the hot body, identical in both (mountUIFX 592-608;
    decorateUIFX 957-971):
      `(dtMs) => { if (destroyed || quarantined) return;
                   const dt = dtMs / 1000; const now = performance.now();
                   ...update pointer/state...;
                   try { recipe.tick(ctx, dt, now, state, pointer); }
                   catch (err) { quarantined = true; console.error(...); } }`
    dt is dtMs/1000. Driven mode calls THIS SAME body via instance.tick(dtMs);
    caller-ticker passes it to caller.add(). There must be no third code path.
  - A cold-path matchMedia idiom already ships (U1 / U-10 DPR listener, mountUIFX
    572-597): `if (typeof window.matchMedia === 'function') { const mq =
    window.matchMedia('(resolution: ' + dpr + 'dppx)'); mq.<listen> -> state.dpr =
    nd; ctx.setTransform(...) }`, with a documented fail-closed no-op when
    matchMedia is absent (the canvas stays at mount DPR, 572-574). The reduced-
    motion watch MIRRORS this exactly: matchMedia('(prefers-reduced-motion:
    reduce)'), read at mount, watched cold, writing state.reducedMotion.
    IMPORTANT: decorateUIFX carries NO matchMedia listener at all (its state block
    846-853 has no mq wiring, no DPR-change watch). So U5 adds the reduced-motion
    watch to BOTH modes and should factor the shared matchMedia wiring into one
    cold module helper (and decide in 0005 whether to also close decorate's
    missing DPR-change listener in the same helper, or file it separately).
  - The two state objects, where the two new fields land:
      mountUIFX (419-427): { hover, active, focused, toggled, indeterminate,
        disabled, val, w, h, padding, dpr }
      decorateUIFX (846-853): { hover, active, focused, text, valid, w, h,
        padding, dpr }
    BOTH gain reducedMotion:boolean + budget:number. Same shape, both modes.
  - Phase-1 validate / phase-2 fail-closed unwind exists in both (mountUIFX flags
    303-316, unwind 678-694; decorate mirror ~1007-1019). New options validate in
    phase 1; the ticker-acquisition unwind must NOT releaseTicker when no shared
    ticker was acquired (the caller-ticker and driven paths acquire nothing).
  - All 56 recipes are motionSafe:false today -- UIFXRecipes.js:3149 says so in
    words: "motionSafe inherently-calm under prefers-reduced-motion (false for
    all -- U5)". U5 is the named session that makes motionSafe meaningful; it
    flips per recipe as each lands a calm path. The 5 decorate recipes are prime
    targets: ErrorShake (a literal border shake) MUST honour reduce; SuccessBloom
    (a particle bloom) clamps to a static ring; FocusHalo (a pulsing halo) clamps
    to a static ring. SwarmToggle is the reference calm-path recipe.
  - Options are allow-listed per mode: hijack via the mount option set; decorate
    via DECORATE_OPTIONS (90) = padding, seed, colors, theme, text, font. U5's
    ticker/driven options extend BOTH allow-lists -- a decoration wants host-clock
    control every bit as much as a hijack does (E1/E2 skins ride the host clock).

THE DECISION (record decisions/0005-host-clock.md BEFORE coding)

  1. THE CLOCK OWNERSHIP MODEL (three mutually-exclusive modes; default unchanged).
     RECOMMENDED: three modes, resolved ONCE at mount (cold), fail-closed on any
     combination, IDENTICAL in mountUIFX and decorateUIFX:
       (a) default (neither option): the shared module ticker, exactly as 1.6.0 --
           acquireTicker()/ticker.add() at 587/592 and 952/957 byte-identical.
       (b) { ticker }: a caller-supplied lite-ticker drives this component; the
           shared ticker is neither created nor ref-counted for it (acquireTicker/
           releaseTicker skipped). destroy() calls the caller's removeTick and
           NEVER destroys the caller's ticker -- ownership stays with the caller.
           Adopt the lite-scratch-fx decisions/0002 dt shape; do not reinvent it.
       (c) { driven: true } + instance.tick(dtMs): no ticker, no RAF; the host
           calls instance.tick(dtMs), which invokes the exact tick body. Mutually
           exclusive with { ticker }; both-passed, or driven with any ticker, is a
           fail-closed throw at mount (did-you-mean where a typo is plausible).
     Duck-type the caller ticker: it must expose .add(fn) returning a remove
     function; a handle missing .add throws at mount (null is not a ticker).
     REJECTED: a global setTicker() switch -- hidden global state, and two
     components could not ride two clocks. Name it in the record and reject it.

  2. THE REDUCED-MOTION POLICY.
     state.reducedMotion (boolean) read at mount via matchMedia('(prefers-reduced-
     motion: reduce)'), watched on a cold listener mirroring the DPR block
     (572-597), exposed to every recipe in BOTH modes. Fail-closed no-op when
     matchMedia is absent (reducedMotion:false -- the same fallback the DPR code
     already models). RECIPE_META.motionSafe flips true per recipe AS it lands a
     calm path (the suite iterates META, so t3 coverage is automatic). mountRecipe
     WARNS (console.warn, NOT throw -- a host may run its own toggle) when mounting
     a motionSafe:false recipe under active reduce. PIN in the record:
     reducedMotion is a STATE FLAG a recipe consumes, never a mount option that
     forces behaviour -- the host owns the toggle, the recipe owns the calm render.

  3. THE FRAME BUDGET.
     state.budget (0..1) degrades glow / pool sizes when a frame overruns; borrow
     lite-ambient's createFrameBudget shape -- adopt, do not invent. Recipes
     consume it or ignore it; META documents which. budget is computed ONCE per
     frame from the dt the clock already provides -- no extra clock read, no
     allocation, one number written to state before recipe.tick.

TASKS
  - Controller (UIFXController.js) -- BOTH mount functions, same edits mirrored:
      * Resolve { ticker } / { driven } ONCE at mount (cold); the three modes
        mutually exclusive, fail-closed on combination. The DEFAULT path (neither
        option) is untouched: acquireTicker()/ticker.add() at 587/592 and 952/957
        stays byte-identical, no added per-frame branch on the default path.
      * { ticker }: skip acquireTicker/releaseTicker; `removeTick = caller.add(fn)`;
        destroy calls removeTick only, NEVER caller.destroy(). tickerAcquired stays
        false so the unwind/destroy refcount logic does not touch the shared ticker.
      * { driven:true }: no ticker; expose instance.tick(dtMs) on the return object
        (BOTH the hijack instance AND the decorate instance) invoking the exact
        closure body. No RAF scheduled. driven + any ticker -> throw.
      * state.reducedMotion + state.budget added to BOTH state objects (419, 846).
        Wire the reduced-motion matchMedia watch cold in BOTH modes, factored into
        one module helper mirroring the DPR listener (572-597); fail-closed no-op
        without matchMedia. Resolve in 0005 whether the helper also closes
        decorate's missing DPR-change listener.
      * Compute state.budget once per frame from dt before recipe.tick, both modes.
  - Recipes (UIFXRecipes.js): per-recipe motionSafe sweep (mechanical, like the
    U3b theming sweep; gated automatically by META iteration). Flip motionSafe:true
    as each recipe gains a calm path; every recipe that opts in swaps to a reduced
    render under state.reducedMotion -- SwarmToggle (the reference) plus the 5
    decorate recipes: ErrorShake -> no shake, a static red border; SuccessBloom ->
    a static ring, zero particles; FocusHalo -> a static ring, no pulse. Recipes
    that read state.budget clamp pool sizes when it drops. NO recipe-interface
    change (law 2): reducedMotion/budget are state fields, not new hooks.
  - Torture:
      * t5 extensions, BOTH modes: N components under ONE caller-supplied stubbed
        ticker tick deterministically (same dt sequence -> same draw-call
        sequence); a { driven } instance.tick with no dirty state allocates
        nothing; destroy of a { ticker } component does NOT stop the caller's
        ticker (assert the caller ticker still ticks the surviving 99). Cover a
        decorate mount under a caller ticker and a driven decorate mount.
      * t2/t3: state.reducedMotion true swaps every opted-in recipe to its calm
        path; t3 stays green under reduce (default AND themed AND reduced).
        Recording-context assertions: under reduce, ErrorShake emits zero
        horizontal displacement, SuccessBloom emits zero particle draws.
      * t9 controls (each must FAIL its tier): a { driven } recipe allocating per
        instance.tick fails t3; a { ticker } path that destroys the caller's ticker
        on component destroy fails t5 (ownership violation); a recipe whose META
        says motionSafe:true but ignores state.reducedMotion fails the reduce
        assertion.
      * dom-stub (test/harness/dom-stub.mjs): add a matchMedia('(prefers-reduced-
        motion: reduce)') stub with a settable `matches` + a change dispatch,
        mirroring the existing resolution matchMedia stub; a fake caller Ticker
        with .add(fn)->remove and .destroy() for the { ticker } tests.
  - Docs (delta only -- the full README blueprint is U6): d.ts gains { ticker?,
    driven? } on both option types, instance.tick(dtMs) on both instance types,
    and reducedMotion:boolean + budget:number on the state type; motionSafe in
    RECIPE_META becomes meaningful. llms.txt: a host-clock section (default /
    ticker / driven), reduced-motion + motionSafe, budget, and the state object
    gains reducedMotion/budget. UIFX-RECIPE-GUIDE.md: how a recipe honours
    state.reducedMotion and state.budget. CHANGELOG 1.7.0.

HOT PATH
  instance.tick(dtMs) must cost EXACTLY what the internal path costs -- it IS the
  internal closure, called directly: no wrapper closure, no allocation. t5 measures
  the driven path against the shared path and asserts equal draw-call sequences and
  zero alloc. Mode resolution is a mount-time (cold) branch, never a per-frame one:
  the default path keeps a single acquireTicker + ticker.add with no added
  per-frame check. reducedMotion and budget are one number read each per frame,
  updated on cold listeners / computed from the dt already in hand. Diff the
  default tick body against 1.6.0 -- bytes-in-the-body must be byte-identical.

ASSERTIONS (falsifiable)
  - Default path (neither option): byte-identical draw-call sequence to 1.6.0 for
    every recipe, BOTH modes -- zero regression when neither option is passed.
  - { ticker } drives 56 recipes under a caller ticker in both modes; a component's
    destroy calls removeTick but the caller's ticker keeps ticking the rest (t5).
  - { driven:true } + instance.tick: same dt sequence -> same draw-call sequence
    (determinism); zero allocation per tick (t3/t5); no RAF scheduled (RAF-stub
    call count 0). { ticker } AND { driven } together throws at mount.
  - state.reducedMotion mirrors matchMedia at mount and on change; under reduce,
    SwarmToggle + the 5 decorate recipes take their calm path; ErrorShake
    horizontal displacement === 0 and SuccessBloom particle draws === 0
    (recording-context); t3 green under reduce, default + themed.
  - RECIPE_META.motionSafe is true for exactly the recipes that ship a calm path;
    mountRecipe WARNS (not throws) mounting a motionSafe:false recipe under reduce.
  - npm test green; node --expose-gc test/torture.mjs prints ok; t9 controls (per-
    tick-allocating driven recipe; caller-ticker-destroying component; reduce-
    ignoring recipe) all FAIL.
  - npm pack --dry-run: test/, demo/, decisions/, BRIEF-*.md, ROADMAP*.md absent;
    llms.txt, CHANGELOG.md, both d.ts, the guide present.

NON-GOALS
  No worker mode (a 200x48 UI canvas does not amortise a worker hop; write it into
  "What this is not" in U6). No new recipes, no new element types (U4 done; groups
  are U7). No behaviour change on default mounts in either mode. No recipe-interface
  change (law 2): reducedMotion / budget ride the state object; driven adds
  instance.tick, not a hook; ticker rides the options arg. No auto-forcing of
  reduced motion (the host owns the toggle, the recipe owns the calm render). No
  README blueprint rewrite / consumer-demo rebuild (both U6). No lite-headless
  skinning (E1), no text/pointer/card decoration families (E2).

DONE WHEN
  a game runs UIFX -- hijack AND decorate -- under its own clock (injected ticker
  or driven tick()), with the default path byte-identical to 1.6.0; reduce-motion
  users get calm controls across all 56 recipes that opt in (ErrorShake stops
  shaking); state.budget degrades before frames drop; every claim gated (t5 clock
  ownership, t3 under reduce, t9 controls fail)
```

-------------------------------------------------------------------------------
## Versioning (owner's release-planning call)

U5 is **1.7.0** under the live tail, NOT the roadmap's stale 1.5.0. What actually
shipped, three-place-synced and (as of today) published:

    U0 -> 1.0.5   U1 -> 1.1.0   U2 -> 1.2.0   U3a -> 1.3.0   U3b -> 1.4.0
    U4a -> 1.5.0  U4b -> 1.6.0 (done, published 2026-09-07)

The U3 split (1.3.0 + 1.4.0) and the U4 split (1.5.0 + 1.6.0) each pushed the tail
down one, so the remaining tail is:

    U5 -> 1.7.0   U6 -> 1.8.0   U7 -> 1.9.0 or 2.0.0   U8 -> 1.10.0 (or 2.1.0 if U7 majors)

ROADMAP.md sections 5/6/7 and every brief `version_target` STILL show the pre-split
numbering (U5=1.5.0, U6=1.6.0, ...); the session-order diagram (line 282) still
shows U3 -> U4 directly with no U3a/U3b or U4a/U4b split nodes. This is bookkeeping
only -- no session's content changes. I have NOT rewritten the ledger or the diagram
(the renumber has never been blessed). This brief's `version_target: 1.7.0` is the
corrected value. It is now load-bearing: the NEXT brief's version depends on it, so
say the word and I renumber the section-5 diagram + the section-6 version_targets +
the section-7 table + insert the four split nodes in one pass.

## Sizing (recommended: run as ONE session)

One cohesive session. Clock ownership + reduced motion + budget all touch the SAME
acquisition site (587/592, 952/957) and the SAME state object (419, 846) in both
mount functions, so batching them means reading the two tick closures ONCE, not
three times. The one real risk is the { ticker } duck-type + ownership contract (a
component must NEVER destroy a caller's ticker) -- pin it in decisions/0005 with a
t5 test BEFORE the motionSafe recipe sweep, because the sweep assumes the clock
plumbing is settled. The motionSafe sweep itself is per-recipe and mechanical (like
U3b's theming sweep), gated automatically by META iteration.

## Why U5 is the next session (and the U7 fork)

Two sessions are unblocked after U4: **U5** (host clock + reduced motion; depends
U3, independent of U4) and **U7** (grouped controls; depends U4). Both are ready.
I recommend **U5** next:

  - It is the roadmap's linear next (lower number; section 7 lists it before U6/U7)
    and it UNBLOCKS U6 -- the blueprint docs + consumer demo -- which is the real
    bottleneck now that the surface DOUBLED (two mount modes + 56 recipes) since the
    docs were last coherent. U7 unblocks nothing until U8.
  - It discharges two standing promises the package still owes: the "game" keyword
    (one-clock integration) and prefers-reduced-motion -- the only accessibility gap
    the roadmap still carries, and now the sharpest one, because U4b shipped a
    literal shake (ErrorShake) with no calm path. For a package whose whole pitch is
    native a11y, that is the most pointed thing left open.
  - It is fully additive, moderate scope, no possible-major decision, no new ARIA
    surface -- a clean single-session win that keeps the default path byte-identical.

The alternative is **U7** (radio / tabs / stepper / rating, plus the dual-thumb /
range slider the section-8 gap analysis flagged as the clearest native-control gap).
Take U7 next if you would rather act on the fresh gap analysis and absorb the bigger,
decision-gated, possibly-major session now -- deferring the docs. Both are ready;
U5 is the safer, higher-leverage close. Say which and I hand the chosen brief to the
pipeline (planner -> coder -> reviewer -> qa).
