# 0005 -- Host clock, reduced motion, frame budget (U5)

Status: accepted (U5, v1.7.0)
Depends on: 0001 (registry), 0002 (recipe options), 0004 (decorate mode)

## Context

The package is keyword-tagged "game" but forces its own ref-counted RAF loop: a
host already running @zakkster/lite-ticker gets a SECOND, uncontrollable clock.
And nothing respects `prefers-reduced-motion` in a package whose entire output is
motion -- including U4b's ErrorShake, a literal horizontal shake, exactly what the
media query exists to suppress. Both concerns apply identically to the two mount
modes shipped by 0004 (mountUIFX hijack, decorateUIFX decorate): both share the
module-level `acquireTicker()` + `ticker.add((dtMs) => ...)` site and the same tick
closure. U5 fixes both across both modes, additively, default path byte-identical.

## Decision 1 -- clock ownership: three mutually-exclusive modes

Resolved ONCE at mount (cold), fail-closed on any combination, identical in both
mount functions:

- **default** (neither option): the shared ref-counted ticker, exactly as 1.6.0 --
  `acquireTicker()` / `releaseTicker()` unchanged, byte-identical.
- **`{ ticker }`**: a caller-supplied lite-ticker drives this component. The shared
  ticker is neither created nor ref-counted for it. `destroy()` calls the caller's
  remove handle but NEVER `callerTicker.destroy()` -- ownership stays with the
  caller. The ticker is duck-typed: it must expose `.add(fn) -> removeFn`; a handle
  missing `.add` throws at mount (null is not a ticker).
- **`{ driven: true }`**: no ticker, no RAF. The host calls `instance.tick(dtMs)`,
  which invokes the exact frame body. Mutually exclusive with `{ ticker }`; passing
  both, or a non-boolean `driven`, throws at mount.

The frame body is extracted to ONE named function `frame(dtMs)` per mount so all
three modes invoke the SAME code with no wrapper: default and `{ ticker }` pass
`frame` to a ticker's `.add()`; `{ driven }` exposes it as `instance.tick` directly
(`tick: driven ? frame : _drivenOnly`), so a driven host pays exactly the internal
per-frame cost. A non-driven `instance.tick()` throws (shared module stub, no
per-mount closure).

REJECTED: a global `setTicker()` switch -- hidden global state, and two components
could not ride two different clocks.

## Decision 2 -- reduced motion: a state flag, not a forced mode

`state.reducedMotion` (boolean) is read at mount from
`matchMedia('(prefers-reduced-motion: reduce)')` into the state object BEFORE
`recipe.init` (so init sees the right value), then a change listener is wired
through the AbortController (cold; torn down on destroy). matchMedia absent -> a
fail-closed no-op: `reducedMotion` stays false and every recipe renders full
motion, never throwing (mirrors the existing DPR-listener fallback). One helper
`_reducedMotionQuery()` isolates the feature detection for both mount modes.

`reducedMotion` is a STATE FLAG a recipe consumes, never a mount option that forces
behaviour: the host owns the toggle (its own reduce setting), the recipe owns the
calm render. `RECIPE_META.motionSafe` flips true per recipe AS it ships a calm
path (the suite iterates META, so t3 coverage is automatic). `mountRecipe` WARNS
(console.warn, not throw) when mounting a `motionSafe:false` recipe under active
reduce -- a host may run its own toggle, so it is advice, not a gate.

This session ships calm paths for the concrete set named in the brief -- SwarmToggle
(the reference) plus the five decorate recipes (FocusHalo -> static ring; ErrorShake
-> static red border, no shake; SuccessBloom -> static ring, no particles;
PasswordStrength, TypewriterField -> already low-motion, marked safe). The other 50
recipes stay honestly `motionSafe:false` until each lands its own calm path;
motionSafe is true for EXACTLY the recipes that ship one.

## Decision 3 -- frame budget: computed once per frame, consumed opt-in

`state.budget` (0..1) degrades as the frame delta grows so budget-aware recipes
shed work before frames drop. It is a smoothed instantaneous ratio
(`inst = TARGET_DT / dt`, clamped, EMA-blended) computed in the frame body from the
`dt` the clock already provides -- no extra clock read, no allocation (module
consts + in-place arithmetic). Recipes consume it or ignore it; it ships as
infrastructure with light consumption (like motionSafe, adoption is incremental).
Borrowed shape from lite-ambient's createFrameBudget; not a new dependency.

## Consequences

- Two new options (`ticker`, `driven`) on both allow-lists; two new state fields
  (`reducedMotion`, `budget`) on both state objects; one new instance member
  (`tick`) on both return objects. No recipe-interface change (law 2): reducedMotion
  and budget ride the state object; driven adds `instance.tick`, not a hook.
- The default mount path in both modes is byte-identical to 1.6.0 (t5 proves it).
- A game can run every UIFX component -- hijack AND decorate -- under one clock it
  owns; reduce-motion users get calm controls on every recipe that opts in.
