# 0004 -- Decorate mode (a canvas around a live element)

Status: accepted (U4b, v1.6.0)
Supersedes nothing. Follows 0003 (element types). Roadmap: U4 (split; U4b here).
Findings: none (a growth session; the spine is law 1 -- native = source of truth).

## Context

Every mount is a HIJACK: mountUIFX creates a native element, sets it `opacity:0`
(UIFXController.js:352), reparents it into a wrapper (385-392), and paints a canvas
over the top. That is correct for a control the library owns and wrong for a control
that must stay visible: a real `<input>` cannot be `opacity:0`. Vol.3 shipped two
recipes that only make sense over a visible input -- PasswordStrength (faked as a
SLIDER) and TypewriterField (faked as a TOGGLE) -- and they are unusable over a real
field for exactly this reason. U4b adds the second mount mode so a canvas can sit
AROUND a live element without owning or hiding it, and re-homes the two fakes onto it.
This is also the surface enrichment E1 (headless skins) and E2 (text/pointer/card
decorations) build on: both paint over live DOM.

## Decision

1. `decorateUIFX(el, recipeFactory, options)` IS THE SECOND PUBLIC ENTRY. It does not
   create a native element (the host already exists), never writes `opacity` and never
   reparents `el`. It adds exactly one thing to the DOM -- an overlay canvas -- and a
   set of event listeners it owns. On destroy the host is byte-identical to before.

2. THE OVERLAY IS AN ABSOLUTELY-POSITIONED SIBLING, PLACED FROM THE OFFSET BOX.
   The canvas is appended to `el.parentNode` (a sibling of `el`, not a wrapper around
   it) with `position:absolute`, `left = el.offsetLeft - padding`, `top = el.offsetTop
   - padding`, sized to `el.offsetWidth/offsetHeight + 2*padding`, `pointerEvents:none`,
   `z-index` above `el`. Because the canvas and `el` are siblings they share an
   `offsetParent`, so offset-box coordinates land the overlay over `el` whether or not
   the parent is positioned -- WITHOUT writing any style onto the parent (which would
   be a host mutation). The placement box is read once at init and refreshed on resize
   only (cold). REJECTED: a `document.body` + `position:fixed` overlay tracking
   `getBoundingClientRect` -- it never touches the parent but must reposition on every
   scroll and breaks inside transformed/clipped ancestors. Documented limitation of
   the chosen approach: a host inside a scrolling sub-container or a transformed
   ancestor may need the host app to keep the overlay in sync; the common case (normal
   flow) is exact. Fail closed: a null, non-element, or detached `el` (no parentNode)
   throws before any side effect.

3. `'decorate'` IS A REGISTRY ROUTING TAG, NOT A UIType. A decoration creates no
   native element, so it is not a UIType (UIType selects the element to create). We do
   NOT overload UIType with it -- that would break both the "type selects the native
   element" invariant and the single-source `_KNOWN_TYPES` derivation. Instead
   `VALID_META_TYPES` becomes `new Set([...Object.values(UIType), 'decorate'])` -- ONE
   documented extension, the only non-UIType tag, commented as such. `mountRecipe`
   branches on it: `type === 'decorate'` routes the first arg to `decorateUIFX(el,
   factory, opts)`; every other type still routes to `mountUIFX`. `mountUIFX` keeps
   rejecting `'decorate'` through `_KNOWN_TYPES` (hijacking a decoration is a category
   error). One registry entry, one branch -- not a parallel `decorateRecipe`.

4. DECORATE STATE, AND HOW A RECIPE READS HOST CONTENT WITHOUT A NEW HOOK (law 2).
   Generic state (`hover`, `active`, `focused`, `w`, `h`, `padding`, `dpr`) wires
   identically to hijack mode. For a form-control host, decorate ALSO carries two
   fields, read at EVENT time only (never per frame): `state.text` (the host's string
   value) and `state.valid` (`el.validity ? el.validity.valid : true`). Both are read
   once at init and refreshed on `input`/`change`/`invalid` (cold). `el.value` getter
   allocates a string, which is why it is pinned to the event path. Recipes never
   receive `el`; they read `state`. A decoration reacts to host changes by polling
   `state` in `tick` and edge-detecting against a closure-cached previous value -- NO
   new hook is added. `onHover`/`onLeave`/`onClick` are wired from the host's
   pointer events (reused); `onToggle`/`onDrag` are NOT fired in decorate mode (there
   is no checkbox/slider). Steady-state `tick` allocates zero bytes: booleans are read
   directly; `state.text` is scanned with `charCodeAt` (no allocating string ops) and
   any `measureText` is cached and recomputed only when the text version changes.

5. THE TWO RE-HOMES ARE PORTS, NOT BYTE-IDENTICAL META EDITS -- the sharp difference
   from U4a's eight re-homes. Those were pure `RECIPE_META.type` string changes with no
   body touched (a knob draws from the same 0..1 val a slider fed it). PasswordStrength
   and TypewriterField genuinely change behaviour: as decorations they derive from the
   host input's TEXT (strength from `state.text`; typed characters + caret), not from a
   faked slider/toggle value. Their bodies are re-authored to read `state.text`. The
   golden draw-signature oracle does NOT apply to them -- their rendering legitimately
   changes. They keep `themeable:true`.

6. THE THREE NEW RECIPES ARE BORN THEMED + GATED. FocusHalo (`state.focused`),
   ErrorShake (`state.valid` -> false edge), SuccessBloom (`state.valid` -> true edge)
   use the 0002 `resolveTheme`/`pickFont` helpers resolved once in init, land with
   `themeable:true` + `motionSafe:false` META rows, and pass t3 (default AND themed)
   from day one. Particle-ish bursts are hand-rolled on the 1.3.0 fixed-pool +
   const-color + globalAlpha pattern; NO recipe-side engine dependency (0003 decision
   5 holds -- lite-particles is the enrichment track's one-decision adoption). They are
   registered in RECIPES / RECIPE_META / the default export / a new `UIFXRecipes5`
   barrel (Vol.1-3 + Vol.4 stay accurate historical snapshots).

7. `setValue` / `setChecked` STAY HIJACK-ONLY. They throw in decorate mode: a
   decoration reads host state, it does not own or push into the host's value. The
   host app changes the host; the decoration reflects it.

8. THE CLOCK IS THE SHARED TICKER. A decoration owns no RAF/engine; host-driven and
   caller-supplied clocks (`{ driven }`, `{ ticker }`) are U5, out of scope here.

## Deferred (explicitly NOT in U4b)

- Driven/caller-ticker host clock, reduced motion, `state.budget`, the `motionSafe`
  flip -> U5. `motionSafe` stays false for all 56.
- lite-headless skinning (`skinHeadless`) -> enrichment E1. The three generic
  decorations here are the reusable base E1/E2 extend.
- text-fx / pointer / card decoration FAMILIES and an explicit host-fired pulse API
  (`instance.signal('success'|'error')`) -> enrichment E2. U4b's three generics ride
  focus/validity transitions only.
- Recipe-side engine dependency -> enrichment (0003 decision 5).

## Consequences

- +1 public mount entry (`decorateUIFX`), +1 registry routing tag (`'decorate'`),
  +3 recipes (53 -> 56), +2 optional state fields (`text`, `valid`). All additive; a
  bare hijack mount of any existing recipe is unchanged. Backward-compatible NEW
  functionality -> semver MINOR (1.6.0).
- The recipe interface (law 2) is untouched: decorate rides the existing `{ init,
  tick, on* }` shape and the options arg; it adds optional state fields, not a hook.
- Torture: t0 gains a decorate DOM-diff tier (host byte-identical except the overlay;
  destroy restores exactly) + a t9 host-mutation control that MUST fail it; `makeChurn`
  learns the decorate mode (focus/hover/pointer + occasional input, no onToggle/onDrag);
  t1/t2/t3 pick up the new recipes + re-homes by META iteration.
