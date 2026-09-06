---
package: "@zakkster/lite-ui-fx"
session: U1
version_target: 1.1.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: [U-01, U-02, U-09, U-10, U-11]
depends_on: [U0]        # DONE -- 1.0.5 published, gate green (34 tests, torture ok)
blocks: [U2]
---

# U1 -- controller correctness: a keyboard that works, a loop that survives, a mount that fails closed

Planner-stage brief. Line refs are against UIFXController.js AS SHIPPED IN 1.0.5
(276 lines; U0 added `export const VERSION` at line 25, so every roadmap line
number below the header shifted -- these are re-verified against the live file).

## PURPOSE

Kill the two S1s and the three controller-level S3s. After this session:
1. the native element is genuinely the source of truth (law 1) -- one activation
   path, one onToggle;
2. a bad recipe is an error at mount, or a quarantined component at tick -- never
   a page-wide freeze;
3. the option surface fails closed -- unknown keys are an error, new inputs land
   in the native element AND state before the first frame.

No visual change at defaults. No recipe-file edits (that is U2/U3).

===============================================================================
## VERIFIED INPUTS -- exact current sites (repo wins; re-read before editing)
===============================================================================

| Finding | Sev | Site (UIFXController.js) | Current behaviour |
|---------|-----|--------------------------|-------------------|
| U-01 | S1 | keydown handler 215-221; change listener 210-213 | keydown manually flips `el.checked` + sets `state.toggled` + calls `onToggle` (217-219). On a native checkbox, Space ALSO fires native click -> change (210-213) -> onToggle again. Two onToggle per Space; net checkbox state can end wrong. Enter is manually handled too (not native for a checkbox). |
| U-02A | S1 | recipe create 170 (`recipeFactory()`), init 171 | zero validation. Non-function factory throws raw TypeError. `{}` or missing `tick` mounts clean, then throws every frame at 245. |
| U-02B | S1 | ticker callback 236-247; `recipe.tick` 245; `destroyed` flag 234/237 | `recipe.tick` is unguarded inside the shared Ticker's one RAF. A throw propagates into lite-ticker; the un-rescheduled-RAF flaw there then freezes EVERY component. (Filed with lite-ticker; this package must not depend on that fix.) |
| U-09 | S3 | slider style 121-129 (create 122, `head.appendChild` 127); destroy 264-272 | every SLIDER mount appends a fresh `<style>` to `document.head`; destroy never removes it. head grows by one per slider; identical rules duplicated. |
| U-10 | S3 | options destructure 82-87; dpr read 91; slider value hardcode 103; state init 158-165 (`toggled` 160, `val` 163) | unknown option keys silently dropped by destructuring (fail-open). No `value`/`checked`/`disabled` inputs. dpr read once; never re-read. |
| U-11 | S3 | `updatePointer` 177-185 (`getBoundingClientRect` 178); pointerenter 188-192 | `el.getBoundingClientRect()` on EVERY pointermove -- a forced layout read per move (the demo-audit anti-pattern). No cached rect; no scroll/resize refresh. |

Known hook keys (8): `init tick onHover onLeave onClick onToggle onDrag destroy`
(controller line 11). Known option keys after U1 (7): `width height padding label
value checked disabled`.

===============================================================================
## HARNESS PRE-WORK -- blocks the tests, do FIRST (test/harness/dom-stub.mjs)
===============================================================================

The DOM stub cannot yet express the U-01 contract or the U-10 DPR path. Two
extensions, both ASCII-only, both zero-alloc at dispatch:

- **T-H1 native activation.** `ElementStub` has no `.click()`, and setting
  `.checked` fires no event (dom-stub.mjs 82-145). Add `click()`: dispatch a
  `click` event; if `this.type === 'checkbox'`, flip `this.checked` THEN dispatch
  `change` (mirrors the browser's activation behaviour). Setting `.checked`
  directly must stay event-free. This is what lets t2 drive "Space via native
  activation alone" (`el.click()`) and "Enter via the controller's `el.click()`
  bridge". Add a no-op `preventDefault()` to `EventStub` (164-171) so a defensive
  guard in the controller cannot throw in node.
- **T-H2 matchMedia.** `window` has no `matchMedia` (dom-stub 190-201; the torture
  window is a bare `EventTarget`, harness.mjs 14-18). Add a `window.matchMedia`
  stub returning `{ matches, media, addEventListener, removeEventListener }` with
  a manual `._emit(dpr)` the DPR test drives. Keep it honouring `{ signal }` like
  ElementStub does, so the controller's cleanup path is exercised.

Both are diagnostics-only; neither ships. Grep the edited stub for stray
tool-call tags before trusting it (CLAUDE.md docs rule).

===============================================================================
## TASKS
===============================================================================

**T1 (U-01) -- one activation path.** Replace the keydown body 215-221 with:
Enter only, bridged to native activation --
```
// Space activates the checkbox natively (browser fires click -> change -> below).
// Enter is not native for a checkbox; route it through the SAME activation path.
el.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') el.click();
}, { signal });
```
Delete the manual `el.checked` flip, the `state.toggled` write, and the direct
`onToggle` call from keydown. The change listener 210-213 remains the ONLY place
`state.toggled`/`onToggle` are driven for the toggle. (No `preventDefault`: a
checkbox has no Enter default to suppress; the T-H1 no-op only guards future use.)

**T2 (U-02A) -- fail closed at mount.** Before any wiring: validate. Put a
factory-is-function check BEFORE line 170; validate the result AFTER 170, BEFORE
`init` at 171. Errors are thrown `Error`s with the offending name and, for hook
keys, a did-you-mean against the 8 known keys (Levenshtein<=2 or shared-prefix; a
tiny local helper, cold path). `container` null/no-`appendChild` -> throw.
Contract: factory not a function -> throw naming the arg; result not an object ->
throw; `tick` not a function -> throw naming `tick`; any own hook-shaped key not
in the 8 -> throw with the suggestion.

**T3 (U-02B) -- survive at tick.** Add `let quarantined = false;` beside
`destroyed` (234). Guard the callback head `if (destroyed || quarantined) return;`
(237). Wrap ONLY `recipe.tick(...)` at 245 in try/catch: on throw, set
`quarantined = true`, `console.error` ONCE naming the recipe/type, and
`ctx.clearRect(0,0,cw,ch)` once (blank the dead component). The shared Ticker
never sees the throw, so its RAF reschedules; every other component keeps running.
One flag read per component per frame is the entire hot-path cost (see HOT PATH).

**T4 (U-09) -- shared slider style, refcounted.** Hoist the thumb CSS (121-129)
to a single module-level `<style>` built once. Add a dedicated slider-style
refcount mirroring the ticker pattern (34-50): `acquireSliderStyle()` injects on
first slider, `releaseSliderStyle()` removes when the slider count returns to 0.
Call acquire in the SLIDER branch, release in `destroy()` (264-272) for sliders.
DECISION: refcount is slider-specific (remove as soon as no sliders remain), not
"last component of any type" -- that is the strict head-conservation the T0 gate
asserts. `el.classList.add('uifx-slider')` stays.

**T5 (U-10) -- options fail closed + three new inputs.** Stop destructuring in the
signature. Accept the whole `options` object; validate its own keys against the 7
known keys (did-you-mean on unknown, reusing T2's helper); then read them.
- `value` (slider, 0..1): `el.value = String(value*100)`, `state.val = value`.
  Replaces the hardcoded `el.value='50'` (103) / `state.val` default (163).
- `checked` (toggle, bool): `el.checked = checked`, `state.toggled = checked`
  (replaces the `false` at 160). Must land BEFORE the first frame.
- `disabled` (bool): `el.disabled = true` + `state.disabled = true` (new state
  field, defaults `false`) so recipes can render a disabled look.
- DPR re-read (cold path): if `typeof window.matchMedia === 'function'`, watch
  `(resolution: <dpr>dppx)`; on change re-read `window.devicePixelRatio`, resize
  `canvas.width/height = c* * dpr`, re-`setTransform`, update `state.dpr`.
  Feature-detected -- absent matchMedia is a silent no-op (fail closed, not throw),
  so the canvas simply stays at mount DPR. Listener bound to `signal`.

**T6 (U-11) -- cache the rect.** Add an instance `rect` (init on pointerenter).
In `updatePointer` (177-185) read `rect.left/top`, no `getBoundingClientRect`.
On `pointerenter` (188) refresh `rect = el.getBoundingClientRect()` once. Add
`window.addEventListener('scroll'/'resize', refresh, { passive: true, signal })`
(cold path) to re-read the rect. All three window listeners go through the
existing `ac.signal` so `destroy()`'s `ac.abort()` removes them -- else the t4
listener kernel flags them.

===============================================================================
## TORTURE TIER CHANGES (test/torture/, entry test/torture.mjs)
===============================================================================

- **t2-a11y-contract.mjs (NEW; fills the U0 skip line 83).** The U-01 executable
  contract (section 3, T2). Drive via T-H1: toggle `keydown{Space}` + `el.click()`
  => exactly one onToggle, `state.toggled` flipped once; `keydown{Enter}` => one
  onToggle (controller bridges to `el.click()`); focus/blur mirror `state.focused`;
  `{ checked:true }` and slider `{ value:0.3 }` land in element AND state pre-frame.
  Wire into torture.mjs after t1; remove its skip line.
- **t1-degenerate.mjs (FLIP pins).** Line 13-16: `{ widht:200 }` now THROWS naming
  `width` (assert.throws / message match), not `state.w===160`. Line 19-25: `()=>({})`
  now THROWS at mount naming `tick`. Add: unknown hook key -> throws with
  did-you-mean; non-function factory -> throws; null container -> throws. width:0
  stays a documented default (`width || default`) -- name it a decided default, not
  a flip.
- **t5-scale.mjs (NEW, PARTIAL; U0 skip line 85 relabel to "fills in U1/U3/U5").**
  U1 fills: 100 mixed components -> exactly one RAF chain (`raf.pending` reflects
  one loop); the U-02 regression -- component 50's recipe throws mid-soak, post-fix
  the loop survives, 50 is quarantined (its per-tick counter freezes, one
  console.error), the other 99 counters keep advancing. Scale-cost/alloc stays for
  U3/U5.
- **t0-lifecycle.mjs (FLIP U-09 pin).** Line 36: `styleDelta === sliderMounts`
  becomes `styleDelta === 0` ("U-09 fixed: slider style shared + refcounted").
- **t9-controls.mjs (ADD two).** `runDoubleToggleControl`: hand-roll the OLD
  keydown (manual flip + onToggle) on a stub checkbox alongside a change listener,
  drive Space, assert TWO onToggle -> the control is correct when it does NOT meet
  the one-toggle gate. `runValidationBypassControl`: step a frame on an unvalidated
  `()=>({})` (no mount guard) and assert it throws (missing tick) -> proves the T2
  mount guard is load-bearing. Both run only under `TORTURE_CONTROL`.

===============================================================================
## ASSERTIONS (falsifiable; each maps to a tier or a node:test)
===============================================================================

- A1  t2: one `keydown{Space}` + `el.click()` on a toggle -> exactly one onToggle,
      `state.toggled` flipped exactly once.
- A2  t2: one `keydown{Enter}` -> exactly one onToggle (via the el.click bridge),
      state flipped once.
- A3  t1: `mountUIFX(c, BUTTON, counting, { widht:200 })` throws; message contains
      `width`.
- A4  t1: factory `()=>({})` throws at mount; message contains `tick`.
- A5  t1: recipe with key `onHoverr` throws at mount; message suggests `onHover`.
- A6  t1: non-function factory throws; null container throws.
- A7  t5: 100 components -> one RAF chain; component 50 throws mid-soak -> 99
      counters advance, 50 frozen, exactly one console.error, loop alive.
- A8  t0: mount+destroy 5 sliders -> `document.head` childCount delta 0.
- A9  t2/init: `{ value:0.3 }` -> `el.value==='30'` and `state.val===0.3` before
      frame 1; `{ checked:true }` -> `el.checked===true` and `state.toggled===true`
      before frame 1; `{ disabled:true }` -> `el.disabled===true` and
      `state.disabled===true`.
- A10 U-11 structural: across a pointerenter + N pointermoves, the stub records
      exactly one `getBoundingClientRect` per enter/scroll/resize and ZERO during
      move.
- A11 DPR: with `window.matchMedia` absent, mount/destroy does not throw; with the
      T-H2 stub, `_emit(2)` resizes `canvas.width/height` and sets `state.dpr===2`
      (cold path, no per-frame cost).
- A12 gate: `node --expose-gc test/torture.mjs` prints `ok`, exit 0; the two new
      t9 controls each trip (non-zero) when active.
- A13 law: perl non-ASCII scan clean (U+00D7/U+00B5 excepted) across controller +
      harness + new tiers; VERSION `1.1.0` in package.json + `VERSION` const +
      llms.txt; `node --test` green; CHANGELOG 1.1.0 head names U-01/U-02/U-09/
      U-10/U-11.

===============================================================================
## HOT PATH (the budget the reviewer diffs)
===============================================================================

All new validation runs at MOUNT (cold). The two hot bodies must not grow bytes
beyond:
- tick callback (236-247): +1 boolean read (`quarantined`) folded into the
  existing `destroyed` guard; the try/catch wraps a single call and allocates
  nothing on the success path.
- `updatePointer` (177-185) after T6: ZERO layout reads -- arithmetic on a cached
  `rect` only. No object literal, no closure per move.
The did-you-mean helper, matchMedia re-scale, and rect refresh are cold. t3's
structural frame-alloc gate is not yet filled (U3), so prove the hot budget here
by diff + the t5 zero-alloc scale step; do not widen any gate to pass.

## NON-GOALS
No recipe-file changes (U2 moves them, U3 sweeps them). No new element types (U4).
No visual change at defaults. No lite-ticker patch (its RAF-reschedule flaw is
filed there; U1 makes this package independent of it).

## DONE WHEN
Keyboard contract green (one Space = one onToggle; Enter same); one throwing recipe
cannot kill the page (99/100 survive); every unverified mount input is an error
with a did-you-mean; head/style conservation holds (delta 0); pointermove does zero
layout reads; gate green; both new controls fail; 1.1.0 synced and law-clean.
CHANGELOG updated but NOT published -- U1 ends at a green gate; /release 1.1.0 is a
separate, owner-run step.
