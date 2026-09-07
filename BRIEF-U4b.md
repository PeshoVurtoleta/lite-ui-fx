===============================================================================
# U4b -- lite-ui-fx v1.6.0 -- decorate mode (the second mount mode)
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.6.0     # U4a (element types) took 1.5.0; U4b is the second half of the U4 split
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
findings: []              # growth session, not a finding fix; law 1 (native = source of truth) is the spine
depends_on: [U3, U3b, U4a]  # zero-GC/size-true (1.3.0) + option/theme shape (1.4.0) + element types (1.5.0); all landed
blocks: [E1, E2]          # enrichment E1 (headless skins) + E2 (text/pointer/card decorations) both ride decorate mode
peers: ["@zakkster/lite-gc-profiler", "@zakkster/lite-leak"]
---

# lite-ui-fx -- a canvas AROUND a live element, not a canvas that hijacks it

PURPOSE
  Every mount today is a HIJACK: mountUIFX creates a native element, sets it
  opacity:0 (UIFXController.js:352), wraps it (385-392), and paints a canvas over
  the top. That is the right model for a control the library owns, and the wrong
  model for two things vol.3 already tried to ship: a strength meter over a real
  password field, and a typewriter effect over a real text input. A visible input
  cannot be opacity:0, so PasswordStrength (faked as a SLIDER, UIFXRecipes.js:3044)
  and TypewriterField (faked as a TOGGLE, 3050) are unusable over real inputs. U4b
  adds the second, honest mount mode -- decorateUIFX(el, factory, options): a canvas
  positioned AROUND an EXISTING visible element, wiring recipe state from that
  element's own events, mutating the host in exactly ONE provable way (the added
  overlay + the listeners it owns) and restoring it byte-identical on destroy. It
  re-homes the two fakes onto their true home and ships three generic form-feedback
  decorations (FocusHalo, ErrorShake, SuccessBloom) -- the most reusable surface the
  package can grow, and the exact surface enrichment E1/E2 build on.

VERIFIED INPUTS (state as of 1.5.0, line-checked 2026-09-07 -- read before planning)
  - There is exactly one public mount entry. `grep -n decorateUIFX` -> 0 across
    UIFXController.js, UIFXController.d.ts, UIFXRecipes.js, llms.txt. mountUIFX is
    it; decorateUIFX is entirely new.
  - The hijack is opacity:0 on the native element (UIFXController.js:350-357, the
    Object.assign; opacity:'0' is line 352) plus a wrapper div that REPARENTS the
    element into itself (385-392: wrapper.appendChild(el); container.appendChild(
    wrapper)). Decorate mode must do NEITHER: no opacity write, no reparent.
  - The native element is CREATED by mountUIFX per type (320-347). Decorate creates
    no native element -- the host already exists; decorate only adds a canvas.
  - The pointer rect cache (U-11) already exists and is reusable as-is: `rect` var
    (428), updatePointer (461-473, ZERO layout reads at steady state), refreshRect
    (474), scroll/resize listeners bound to ac.signal (478-479), pointerenter
    refresh (484). Decorate reuses this for pointer math; it needs a SEPARATE
    offset-box read for canvas PLACEMENT (see decision 1).
  - Every listener is bound to one AbortController `ac` (457) via {signal}, and
    destroy()'s ac.abort() (671) removes all of them. Decorate uses the same
    idiom on the HOST element: a fresh ac, every host listener bound to it, so
    destroy removes exactly what decorate added and nothing the host had.
  - The state object shape is fixed at 413-422: { hover, active, focused, toggled,
    indeterminate, disabled, val, w, h, padding, dpr }. Decorate wires hover/active/
    focused/w/h/padding/dpr identically; toggled/val/indeterminate are hijack-control
    concepts. Decorations over a real input need input-derived fields (see decision 3).
  - The return object (610-678): el, canvas, wrapper, state, setValue, setChecked,
    destroy. destroy (668-677) does ac.abort, removeTick, recipe.destroy,
    releaseTicker, releaseSliderStyle (SLIDER/KNOB only), wrapper.remove. Decorate's
    destroy drops wrapper.remove (there is no wrapper) and releaseSliderStyle (no
    slider style), and removes only the overlay canvas.
  - The registry is single-sourced against UIType and cannot silently take a new
    type: VALID_META_TYPES = new Set(Object.values(UIType)) (UIFXRecipes.js:3064);
    registerRecipe rejects an unknown type (3093); mountRecipe (3158) resolves
    meta.type and terminates in `return mountUIFX(container, type, factory, ...)`.
    A decorate recipe (type 'decorate') routed through that line would hit
    mountUIFX's _KNOWN_TYPES guard (UIFXController.js:191-193) and THROW. So the
    registry needs an explicit decorate branch, not a silent widening (decision 2).
  - Re-home targets, current bodies + META rows: PasswordStrength (UIFXRecipes.js:2297,
    META type 'slider' at 3044), TypewriterField (2565, META type 'toggle' at 3050).
    Both already themeable:true (U3b), motionSafe:false. UNLIKE U4a's eight re-homes,
    these two are NOT byte-identical META-only edits (see the re-home note below).
  - U4a barrels: UIFXRecipes4 = { TickDraw, IndeterminateScan, LiquidFill } is the
    live pattern for new-recipe barrels; Vol.1-3 stay historical snapshots. U4b's
    three new recipes get a UIFXRecipes5 barrel the same way.

THE DECISION (record decisions/0004-decorate-mode.md BEFORE coding)

  1. HOW THE CANVAS OVERLAYS THE HOST WITHOUT TOUCHING IT.
     RECOMMENDED: append the canvas as an absolutely-positioned SIBLING in
     el.parentNode, placed from el's OFFSET box (el.offsetLeft/offsetTop/offsetWidth/
     offsetHeight), not its client rect. Because the canvas and el then share an
     offsetParent, `position:absolute; left:(offsetLeft - padding); top:(offsetTop -
     padding)` lands the overlay over el whether or not the parent is positioned --
     no need to write any style onto the parent (which would be a host mutation).
     pointerEvents:none, z-index above el, sized to offset box + 2*padding (mirrors
     the hijack canvas at 368-379, anchored to el's box instead of a wrapper 0,0).
     Placement box is read at init and refreshed on resize only (cold); the pointer
     rect cache (getBoundingClientRect) stays separate and drives pointer math.
     REJECTED: document.body append + position:fixed tracking getBoundingClientRect
     -- zero parent contact, but repositions the canvas on every scroll and breaks
     inside transformed/clipped ancestors. Name it in the record and reject it.
     FAIL CLOSED: el must be a connected DOM element with a parentNode; a null,
     non-element, or detached el throws before any side effect (mount-phase-1 style).

  2. HOW A DECORATE RECIPE IS TYPED AND ROUTED. A decoration creates no native
     element, so it is NOT a UIType (UIType selects an element to create; there is
     none). Overloading UIType with 'decorate' would break the "type selects the
     native element" invariant AND the single-source _KNOWN_TYPES/VALID_META_TYPES
     derivation U4a stood up. RECOMMENDED: 'decorate' is a registry ROUTING tag, not
     a UIType. VALID_META_TYPES becomes new Set([...Object.values(UIType), 'decorate'])
     -- ONE documented, commented extension (the only non-UIType tag; the drift risk
     is bounded and named). mountRecipe (3158) branches on it: type === 'decorate'
     routes to decorateUIFX(firstArg-as-el, factory, mountOptions) instead of
     mountUIFX; every other type is unchanged. mountUIFX keeps rejecting 'decorate'
     via _KNOWN_TYPES (a hijack of a decoration is a category error -- fail closed).
     Decide in the record whether decorate recipes reach the registry through the
     SAME mountRecipe (recommended: yes, with the routing branch) or a parallel
     decorateRecipe(el, id, options); prefer one entry with a branch over two.

  3. WHAT DECORATE STATE CARRIES AND HOW A RECIPE READS HOST CONTENT.
     Generic state (hover, active, focused, w, h, padding, dpr) wires identically to
     hijack mode. For a form-control host, decorate additionally reads -- at EVENT
     time only (input/change/invalid/focus/blur), never per frame -- host content
     into state: state.text (el.value when el exposes a string value) and state.valid
     (el.validity ? el.validity.valid : true). Reading el.value allocates a string,
     which is why it is pinned to the cold event path, not tick. Recipes read those
     fields; they never receive el. RECOMMENDED trigger model for the three generics:
     FocusHalo <- state.focused; ErrorShake <- state.valid going false; SuccessBloom
     <- state.valid going true on change. An explicit host-fired pulse API
     (instance.signal('success'|'error')) is a NON-GOAL for U4b (keep the surface to
     decorateUIFX + the existing instance shape); note it in the record as the E2
     extension point.

  4. THE TWO RE-HOMES ARE PORTS, NOT BYTE-IDENTICAL META EDITS. This is the sharp
     difference from U4a. U4a's eight re-homes were pure RECIPE_META.type string
     changes with NO body touched (git-diff proven) because a knob/progress/checkbox
     draws from the same 0..1 val/checked a slider/toggle fed it. PasswordStrength and
     TypewriterField genuinely change behaviour: as decorations they derive from the
     host input's TEXT (strength from el.value entropy/length; typed characters +
     caret), not from a faked slider/toggle value. Their bodies are re-authored to
     read state.text; the golden draw-signature oracle does NOT apply to them (their
     rendering legitimately changes -- that is the point). They keep themeable:true.

  5. BORN THEMED, BORN GATED. FocusHalo, ErrorShake, SuccessBloom use the 0002
     resolveTheme / rgbaOf / pickText / pickFont helpers resolved ONCE in init, land
     with themeable:true + motionSafe:false META rows, and pass t3 (default AND
     themed) from day one -- no pre-gate era. Particle-ish bursts (SuccessBloom,
     ErrorShake) are hand-rolled on the 1.3.0 fixed-pool + const-color + globalAlpha
     pattern; NO recipe-side engine dependency (lite-particles is the enrichment
     track's one-decision adoption -- decision 5 of 0003 still holds). Registered in
     RECIPES / RECIPE_META / the default export / a new UIFXRecipes5 barrel.

TASKS
  - Controller (UIFXController.js):
      * decorateUIFX(el, recipeFactory, options): the second public entry + default
        is unaffected. Phase-1 validation mirrors mountUIFX (el is a connected
        element with a parentNode; options allow-listed against a DECORATE_OPTIONS
        set -- a subset: padding, seed, colors, theme, text, font; NO width/height/
        value/checked/knobMode/announce -- those are hijack-only, so their presence
        is a fail-closed did-you-mean/"not valid in decorate mode" throw; recipe
        object + known-hook validation reused). Phase-2 side effects fail-closed
        unwound exactly like mountUIFX (679-695): the only acquisitions are the
        canvas append, the AbortController, and the ticker.
      * Overlay per decision 1 (sibling canvas from the offset box, placement
        refreshed on resize; pointer rect cache reused for pointer math). Host
        listeners (pointerenter/leave/move/down/up, focus/blur, and for form
        controls input/change/invalid) on a fresh ac; state wired per decision 3.
      * Ride the shared ticker (acquireTicker/releaseTicker), same quarantine-on-
        throw wrapper (586-607). Decorations own no RAF/engine (host-drivable clock
        confirmed here; { driven } / { ticker } is U5, out of scope).
      * destroy(): ac.abort, removeTick, recipe.destroy, releaseTicker, remove the
        overlay canvas ONLY. NO wrapper.remove, NO releaseSliderStyle. Idempotent.
        Host el is byte-identical to pre-decorate (nothing was ever written to it).
      * setValue/setChecked stay hijack-only (they throw for decorate -- there is no
        el.value the library owns to sync; a decoration reads host state, it does not
        push into the host). State-of-the-host is the host's to change.
  - Recipes (UIFXRecipes.js):
      * Re-home PasswordStrength (slider -> decorate) and TypewriterField (toggle ->
        decorate): META.type edit PLUS body re-author to read state.text (decision 4).
      * Add FocusHalo, ErrorShake, SuccessBloom (decision 5): born themed + gated;
        RECIPES + RECIPE_META (type 'decorate', family 'Feedback' or 'Form') +
        default export + UIFXRecipes5 barrel. Count 53 -> 56.
      * Registry: VALID_META_TYPES gains the documented 'decorate' tag (3064);
        registerRecipe unchanged (it validates against the widened set); mountRecipe
        gains the decorate routing branch (3158) + import decorateUIFX (35).
  - Torture:
      * t0 gains a DECORATE tier: snapshot the host el (tag, every attribute, style
        cssText, parentNode, sibling index, childNodes) before decorate; assert after
        mount it is byte-identical except that the parent gained exactly one canvas;
        assert destroy removes that canvas and the host + parent childNodes return to
        the exact pre-decorate snapshot. Idempotent destroy; ticker refcount returns
        to zero.
      * t9 control: a decoration whose init/tick MUTATES the host (writes el.style,
        sets an attribute, or reparents el) MUST fail the t0 decorate diff. If it
        passes, the tier is decorative.
      * t1/t2/t3 pick up the three new recipes + the two re-homes by META iteration;
        every one passes at default AND themed. t2 gains: focus on the host toggles
        state.focused (FocusHalo responds); an invalid host input drives state.valid
        false (ErrorShake); decorate over a NON-input host still wires hover/focus and
        never throws on the absent value. dom-stub gains what decorate reads:
        el.parentNode/offsetLeft/offsetTop/offsetWidth/offsetHeight, el.validity, and
        input value/change/invalid events (extend test/harness/dom-stub.mjs).
  - Docs (delta only -- the full README blueprint is U6): UIFXController.d.ts gains
    decorateUIFX(el, factory, options) -> instance and a DecorateOptions type; the
    instance type notes setValue/setChecked throw in decorate mode; state gains
    optional text?:string, valid?:boolean. UIFXRecipes.d.ts gains the three recipes +
    UIFXRecipes5 + 'decorate' in the RecipeType union. llms.txt: a Mount Modes
    section (hijack vs decorate), the +3 recipes (count 53 -> 56), the decorate
    'type' tag, DecorateOptions. UIFX-RECIPE-GUIDE.md: a decorate-recipe section --
    the rect/offset-box read-once rule, state.text/valid, the no-host-mutation law.
    CHANGELOG 1.6.0.

HOT PATH
  Decorate adds ZERO per-frame work beyond the recipe itself: the placement box is
  read at init and on resize only; the pointer rect cache (U-11) keeps pointermove at
  zero layout reads; host content is read at event time into preallocated state slots,
  never in tick. A decoration over live DOM text is the one place this package can
  force layout -- read text metrics once at init/resize, ride the shared clock, and do
  not regress the E2 #profile forced-reflow gate that lands later. The three new
  recipes are born zero-alloc (fixed pools, const colors + globalAlpha, init
  gradients, theme resolved in init); the t3 themed tier is the proof, as in U3b/U4a.

ASSERTIONS (falsifiable)
  - `grep decorateUIFX UIFXController.js` -> present; it is exported and default
    mountUIFX behaviour is byte-identical to 1.5.0 (a hijack mount is unchanged).
  - decorateUIFX over a visible <input>: the input stays visible (no opacity write),
    keeps its exact DOM position (not reparented), receives focus/typing normally;
    the ONLY DOM change is one added sibling canvas; destroy removes it and the host +
    parent are byte-identical to the pre-decorate snapshot (t0 decorate diff). The
    t9 host-mutation control FAILS that diff.
  - decorateUIFX(null | a detached el | a non-element) throws before any side effect;
    a width/height/value/knobMode option in decorate mode throws (fail closed);
    an unknown option throws did-you-mean.
  - setValue / setChecked throw in decorate mode (hijack-only).
  - state.focused mirrors host focus/blur; for a form-control host state.text mirrors
    el.value and state.valid mirrors el.validity.valid, both updated at event time
    (assert no per-frame string allocation via the t3 recording-context gate).
  - PasswordStrength + TypewriterField render from host text after re-home (their
    draw is NOT asserted byte-identical to 1.5.0 -- decision 4); both + the three new
    pass t1/t2/t3 at default and themed (major===0, grad===0, cdist<=64);
    __alloc_control__ still FAILS t3.
  - RECIPE_META covers 56 recipes; RECIPE_NAMES length 56, frozen; themeable===true
    for all 56; motionSafe===false for all 56 (reduced motion is U5). VALID_META_TYPES
    has the 6 UITypes + 'decorate' and nothing else.
  - npm test green; node --expose-gc test/torture.mjs prints ok; npm pack --dry-run:
    test/, tools/, demo/, decisions/, BRIEF-*.md, ROADMAP*.md absent; llms.txt,
    CHANGELOG.md, both d.ts, the guide present.

NON-GOALS
  No driven/ticker host-clock mode and no reduced-motion / state.budget / motionSafe
  flip (all U5). No lite-headless skinning (E1). No text-fx / pointer / card
  decoration FAMILIES (E2) beyond the three generic form-feedback decorations listed.
  No explicit host-fired pulse API (instance.signal) -- the three generics ride
  focus/validity transitions; the pulse API is E2's extension point. No recipe-side
  engine dependency (0003 decision 5 holds). No multi-element groups (U7). No
  recipe-interface change (law 2): decorate rides the existing { init, tick, on*,
  destroy } shape and the options arg; it adds optional state fields, not a hook.
  No setValue push-into-host (a decoration reads host state; it never owns it).

DONE WHEN
  decorateUIFX shipped as the second public mount mode; the host is provably
  untouched except the overlay and restored byte-identical on destroy (t0 diff green,
  t9 mutation control fails); PasswordStrength + TypewriterField re-homed onto real
  inputs; FocusHalo + ErrorShake + SuccessBloom born themed + gated; 56 recipes in
  META all themeable; t3 green 56/56 default + themed; a bare hijack mount unchanged.
```

-------------------------------------------------------------------------------
## Versioning (owner's release-planning call)

U4a shipped as 1.5.0 (see decisions/0003). U4b is 1.6.0. The ROADMAP.md ledger
(line 303) and the nine brief `version_target` fields still show the PRE-split
numbering (U4->1.4.0, U5->1.5.0, ...); the U3b theming minor consumed 1.4.0 and the
U4 split consumed 1.5.0 (U4a) + 1.6.0 (U4b), so the live tail is now:

    U4a -> 1.5.0 (done)   U4b -> 1.6.0   U5 -> 1.7.0   U6 -> 1.8.0   U7 -> 1.9.0 or 2.0.0

This is bookkeeping only -- no session's content changes. I have NOT rewritten the
ROADMAP.md ledger, the brief version_target fields, or the session-order diagram
(which still shows U3 -> U4 directly, with no U3b or U4a/U4b split node). Say the
word and I will renumber the tail + insert the U3b/U4a/U4b nodes in one pass.

## Sizing (recommended: run as ONE session)

U4b is the smaller half of the U4 split: one new mount mode + two re-home ports +
three new recipes + one torture tier + doc delta. It is atomic and should NOT split
further. The one real design risk is decision 1 (overlay placement without host
mutation) -- resolve it in decisions/0004 with a live-browser check (a decorate mount
over a real input inside a static-positioned parent, assert the canvas lands over the
input and destroy leaves the DOM byte-identical) BEFORE the coder touches the recipe
bodies, because every re-home and new recipe assumes that placement works.

## Why U4b is the next session

The session order is U4 -> {U5, U7} with enrichment on top. U4a delivered the element
types; U4b delivers the decorate mode that the SAME U4 node promised, and it is the
hard dependency under the enrichment track: E1 (skin lite-headless's 59 primitives)
and E2 (text/pointer/card decorations) both mount AROUND live DOM, which is exactly
decorate mode. U5 (host clock + reduced motion) is independent and could run first,
but decorate mode unblocks two whole tracks and closes the U4 node cleanly, so it is
the higher-leverage next step. Nothing else is both ready and unblocking.
