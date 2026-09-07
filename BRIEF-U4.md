===============================================================================
# U4 -- lite-ui-fx v1.5.0 -- new element types (checkbox, progress, knob)
# + decorate mode
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.5.0     # see "Versioning" -- U3b (theming) took 1.4.0; the tail shifts one minor
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
findings: []              # growth session, not a finding fix; law 1 (native = source of truth) is the spine
depends_on: [U3, U3b]     # 1.3.0 zero-GC/size-true + 1.4.0 the option/theme shape; both landed
blocks: [U7, E1, E2]      # U7 grouped controls; enrichment E1 skins + E2 decorations both ride decorate mode
peers: ["@zakkster/lite-gc-profiler", "@zakkster/lite-leak"]
---

# lite-ui-fx -- grow the element vocabulary without faking semantics,
# and add the second mount mode

PURPOSE
  Vol. 3 fakes richer controls on the three existing types: checkboxes mounted
  as role=switch TOGGLES, knobs and progress meters as SLIDERS, and two text
  surfaces (PasswordStrength, TypewriterField) that cannot exist over a real
  input because the hijack sets opacity:0. Promote the fakes to true native
  semantics (law 1: every UIType wraps the correct native element and inherits
  its keyboard behaviour for free), and add decorate mode -- a canvas positioned
  AROUND a live element instead of hijacking it -- which is the only honest home
  for text-over-input recipes and the surface enrichment E1/E2 build on. Every
  new and re-homed recipe stays born under the U3b theming convention and the t3
  gate (default AND themed); a bare mount of an existing recipe is unchanged.

VERIFIED INPUTS (state as of 1.4.0, read before planning -- line-checked 2026-09-07)
  - UIType is frozen to exactly three (UIFXController.js:142): BUTTON, TOGGLE,
    SLIDER. The mount type-guard is a hardcoded 3-way with a fixed message
    (UIFXController.js:183-184) -- fail-closed, so a fourth type THROWS until the
    allowlist grows. Geometry defaults branch on those three (UIFXController.js:
    282-283); native-element creation branches at 288 (TOGGLE checkbox+role=switch)
    and 294 (SLIDER range); the slider <style> is injected/released at 319/508
    (the U-09 leak was fixed in U1 -- keep that release path when re-homing).
  - No decorate mode exists: `grep decorateUIFX` -> 0 in controller + d.ts. There
    is one public mount entry, mountUIFX; U4 adds a second (decorateUIFX) that
    must NOT set opacity:0 and must leave the host element otherwise untouched.
  - No programmatic sync exists: `grep setValue|setChecked` -> 0. Writing el.value
    from outside fires no event, so the canvas desyncs silently (roadmap U4 note);
    setValue/setChecked must update native + state + recipe hook in one call, once.
  - Re-home targets, current RECIPE_META.type (UIFXRecipes.js:2886-2907), all
    already themeable:true after U3b (theming carries over free):
      toggle  -> CHECKBOX : rippleCheck, morphCheck   (a check is not a switch)
      toggle  -> DECORATE : typewriterField           (a text field, faked as a toggle)
      slider  -> KNOB     : volumeKnob, compassKnob
      slider  -> PROGRESS : ringProgress, batteryGauge, signalMeter, uploadProgress
      slider  -> DECORATE : passwordStrength          (a strength meter over an input)
  - RECIPE_META rows carry a `type` string and the registry iterates META, so
    torture t1/t2/t3 coverage of a re-homed recipe follows its META.type
    automatically once the row and the type vocabulary are updated together.
  - The U3b oracle + gates are in place and are U4's proof tools: the golden
    draw-signature oracle (scratchpad/golden.mjs vs golden-draw.json) proves a
    re-home did not change a recipe's default rendering; the t3 themed tier
    (test/torture/t3-*.mjs) gates every recipe default AND themed; the structural
    inventory grep (theme-helper calls at the 4-space factory top, never nested in
    a tick) is the authoritative zero-alloc completeness check.

THE DECISION (record as decisions/0003-element-types-and-decorate.md BEFORE coding)
  1. NATIVE ELEMENT PER TYPE, no faking (law 1):
       CHECKBOX -> <input type=checkbox> with NO role=switch. Indeterminate is a
         first-class state, set via setValue(null|indeterminate); state carries an
         `indeterminate` flag recipes may render. (RippleCheck/MorphCheck re-home
         here; their onToggle semantics are unchanged, only the role drops.)
       PROGRESS -> native <progress> (non-interactive: no pointer/keyboard drive,
         value written programmatically only). Optional aria-live="polite"
         announcements at configurable thresholds (opt-in; default silent). Value
         is 0..1 mapped to max=1. (RingProgress/BatteryGauge/SignalMeter/
         UploadProgress re-home here.)
       KNOB -> <input type=range> (arrow keys stay native) with a canvas-side
         { knobMode: 'rotate' | 'vertical' } pointer mapping. Range semantics and
         a11y are the slider's; only the pointer-to-value transform differs.
         (VolumeKnob/CompassKnob re-home here.)
     Extend the fail-closed type allowlist (UIFXController.js:183-184) to six and
     rewrite its message; add geometry defaults for the three new types; extend
     RECIPE_META.type's accepted vocabulary and mountRecipe's type assertion in
     lockstep (an unknown type stays a fail-closed throw with a did-you-mean).
  2. DECORATE MODE is a second public entry, not a flag on mountUIFX:
       decorateUIFX(el, recipeFactory, options) -> instance. A canvas is
       positioned over/around `el` (absolutely, from el's cached rect) WITHOUT
       opacity:0 and WITHOUT moving el in the DOM. State is wired from el's own
       events (input/change/focus/blur/pointer); when el is an input, value is
       read FROM el. The rect is cached at init (U-11 pattern) and re-read only on
       resize/scroll -- never per frame. destroy() removes only the overlay and
       any listeners it added; the host element is byte-identical to pre-decorate
       (additive-only, provable by a DOM diff). This is the honest home for
       PasswordStrength + TypewriterField and for the enrichment decoration
       families -- confirm host-drivability of the clock here (no engine/RAF owned
       by a decoration; ride the shared or driven ticker).
  3. PROGRAMMATIC SYNC: instance.setValue(v) and instance.setChecked(b) update the
     native element, the state object, and fire the recipe hook (onDrag/onToggle)
     exactly ONCE -- guarding the native "write value, get no event" desync. For
     CHECKBOX, setValue(indeterminate-sentinel) sets el.indeterminate + state flag.
  4. BORN THEMED, BORN GATED: the six new recipes (TickDraw, IndeterminateScan,
     LiquidFill, FocusHalo, ErrorShake, SuccessBloom) use the U3b resolveTheme /
     rgbaOf / pickText / pickFont helpers, resolved ONCE in init, and land with
     themeable:true + motionSafe:false META rows. They never get a pre-gate era.
  5. ENGINE ADOPTION IS DEFERRED (owner may override -- see "Engines" below). The
     particle-ish new recipes (SuccessBloom burst, ErrorShake, LiquidFill droplets)
     are hand-rolled on the proven 1.3.0 fixed-pool pattern in THIS session. The
     first recipe-side runtime dependency (lite-particles behind ./recipes) is an
     architectural decision the roadmap places in the enrichment track (E1/E2/E3),
     where three families consume it under one decision. Do not introduce it mid-U4.

TASKS
  - Controller (UIFXController.js):
      * UIType gains CHECKBOX, PROGRESS, KNOB (freeze all six).
      * Extend the type allowlist + message (183-184); add width/height defaults
        (282-283) for the three; add native-element branches: CHECKBOX (checkbox,
        NO role=switch, indeterminate support), PROGRESS (<progress>, non-
        interactive, optional aria-live threshold announcements), KNOB (range +
        knobMode pointer transform, arrows native).
      * setValue(v)/setChecked(b): one-call native+state+hook sync, fired once.
      * decorateUIFX(el, factory, options): the second mount mode (decision 2);
        rect cached at init, re-read on resize/scroll only; destroy is overlay-only.
      * KNOWN_OPTIONS gains knobMode (KNOB), and the aria-live threshold option
        (PROGRESS); both validated fail-closed beside the existing block.
  - Recipes (UIFXRecipes.js): re-home the 10 listed recipes onto their true types
    (META.type edits + any type-specific geometry the recipe assumed from the old
    fake); add six new recipes born under the U3b convention + t3. Re-homes must be
    byte-identical where behaviour is unchanged -- prove each with the golden
    oracle (snapshot before, diff after). RECIPE_META.type vocabulary extended;
    RECIPE_NAMES/count unchanged for re-homes, +6 for the new recipes (56 total).
  - Torture: t2 (a11y) asserts CHECKBOX has no switch role, PROGRESS exposes value
    to AT via the native element, KNOB arrow keys move value natively, and
    setValue(0.7) updates el+state+hook once; t0 gains a decorate DOM-diff tier
    (host unmodified except overlay; destroy restores exactly) and a t9 control
    where a decoration mutates the host and MUST fail t0. t1/t2/t3 iterate the new
    types by construction; every re-homed + new recipe passes at default AND
    width-300 AND themed.
  - Docs (delta only -- the full README blueprint is U6): UIFXController.d.ts gains
    the three UITypes, decorateUIFX, setValue/setChecked, knobMode; UIFXRecipes.d.ts
    gains the six recipes (RecipeOptions threaded, as U3b established); llms.txt
    gains the new types + decorate mode + the +6 recipes (count 50 -> 56) + the new
    options; UIFX-RECIPE-GUIDE.md documents decorate-mode recipes + the rect-cache
    rule; CHANGELOG 1.5.0.

HOT PATH
  Decorate mode adds ZERO per-frame work beyond the recipe itself: the host rect is
  cached (U-11 pattern) and re-read only on resize/scroll; a decoration over live
  DOM text is the one place this package can force layout, so read text metrics
  once at init/resize and drive under the shared/driven clock (E2 will add the
  #profile forced-reflow gate; U4 must not regress it). The six new recipes are
  born zero-alloc: fixed pools, const colors + globalAlpha, init gradients, theme
  resolved in init. The t3 themed tier is the proof, exactly as in U3b.

ASSERTIONS (falsifiable)
  - UIType has six members; mounting an unknown type throws did-you-mean; CHECKBOX
    exposes no switch role; PROGRESS is non-interactive and exposes value via the
    native element; KNOB arrow keys move value natively (t2).
  - setValue(0.7) updates el.value, state.val, and fires the recipe hook exactly
    once; setChecked(true) likewise; CHECKBOX indeterminate round-trips.
  - decorateUIFX leaves the host element visible, focusable, and byte-identical
    except the overlay (t0 DOM diff); destroy restores exactly; the t9 host-mutation
    control FAILS t0.
  - All 10 re-homed recipes render byte-identical to 1.4.0 at their new type where
    behaviour is unchanged (golden draw-signature oracle); all 10 + 6 new pass
    t1/t2/t3 at default, width-300, and themed (major===0, grad===0, cdist<=64);
    __alloc_control__ still FAILS.
  - RECIPE_META covers 56 recipes; themeable===true for all 56; motionSafe===false
    for all 56 (reduced motion is U5); RECIPE_NAMES length 56, frozen.
  - npm test green; node --expose-gc test/torture.mjs prints ok; npm pack
    --dry-run: test/, tools/, demo/, decisions/, BRIEF-*.md absent; llms.txt,
    CHANGELOG.md, both d.ts, the guide present.

NON-GOALS
  No multi-element groups -- radio, tabs, stepper, rating stay a single-element
  fake until U7 gives them a group contract (do not grow a fifth fake). No reduced
  motion / state.budget / motionSafe flip (U5). No lite-headless skinning (E1). No
  text-fx / pointer / card decoration families (E2) beyond the three generic
  form-feedback decorations listed. No recipe-side engine dependency (see Engines).
  No recipe-interface change (law 2): new types and decorate mode ride the existing
  { init, tick, on*, destroy } shape and the existing options arg.

DONE WHEN
  three new native types + decorate mode shipped; the 10 vol.3 fakes re-homed onto
  true semantics with byte-identical rendering where behaviour is unchanged; six new
  recipes born themed + gated; setValue/setChecked sync once; 56 recipes in META all
  themeable; t3 green 50-plus-6 under default + themed; a bare mount unchanged.
```

-------------------------------------------------------------------------------
## Versioning (owner's release-planning call)

U3b shipped theming as **1.4.0** (a new public option surface is a MINOR, not a
patch), which consumed the slot the roadmap ledger (ROADMAP.md:303) had penciled
for U4. So the tail shifts one minor:

    U4 -> 1.5.0   U5 -> 1.6.0   U6 -> 1.7.0   U7 -> 1.8.0 or 2.0.0   (enrichment on top)

This is bookkeeping only -- nothing about the sessions changes. I have NOT rewritten
the five brief `version_target` fields or the line-303 ledger in ROADMAP.md; say the
word and I will renumber them in one pass (and insert a U3b node into the session-
order diagram, which still shows U3 -> U4 directly).

## Sizing (recommended split -- your call before the pipeline runs)

U4 as written is large: 3 new native types + decorate mode + 10 re-homes + 6 new
recipes + setValue/setChecked + torture tiers + docs. Given the pipeline's
subagent-stall history on big single-shot tasks, the clean fault line is:

  - **U4a -> 1.5.0**: the three native element TYPES (CHECKBOX/PROGRESS/KNOB),
    setValue/setChecked, re-home the 8 knob/progress/check fakes, new recipes
    TickDraw / IndeterminateScan / LiquidFill, torture type-iteration. Self-
    contained: no new mount mode.
  - **U4b -> 1.6.0**: DECORATE MODE (decorateUIFX), re-home PasswordStrength +
    TypewriterField, new decorations FocusHalo / ErrorShake / SuccessBloom, the
    host-DOM-diff t0 tier. This is exactly what enrichment E2 builds on, so
    shipping it as its own focused session de-risks E2.

Splitting pushes U5->1.7.0 etc. (a bigger renumber). The brief above is written for
the whole of U4; run it as one session or as U4a-then-U4b -- the tasks partition
cleanly along the line above.

## Engines (the lite-particles tip -- deferred here, on purpose)

You flagged that lite-particles / lite-noise / lite-cellular / lite-vfx are fully
developed and usable, and lite-particles is near-free (its only dep, lite-random,
is already a lite-ui-fx dep; headless, host-driven, 0 B/call). That is real and it
is captured -- but in the ENRICHMENT track (ROADMAP-ENRICHMENT.md E1/E2/E3), where
three recipe families adopt it under ONE dependency decision, not scattered across
core sessions. U4's particle-ish new recipes (SuccessBloom especially) are the first
natural consumers; I recommend still hand-rolling them on the 1.3.0 fixed-pool
pattern to keep U4 atomic and keep the "first recipe-side runtime dep" a deliberate,
amortized decision. If you'd rather pull that decision forward and let U4b's
SuccessBloom/ErrorShake ride lite-particles, that's a one-line scope change to
decision 5 -- say so and I'll fold it into the brief before the pipeline runs.

## Why U4 is the next session

The session order (ROADMAP.md:282) is U3 -> U4, and U4's stated dependencies --
"the registry's type metadata (U2) and the option/theme shape (U3)" -- are both now
satisfied (U2 shipped the registry; U3b shipped the option/theme shape as 1.4.0).
U4 is also the hard dependency under the far edge of the roadmap and the enrichment
track: U7 grouped controls need the element vocabulary, and enrichment E1 (headless
skins) + E2 (text/pointer/card decorations) both ride the decorate mode U4
introduces. Nothing else is unblocked and ready; U4 is.
