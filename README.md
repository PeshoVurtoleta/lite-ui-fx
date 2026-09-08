# @zakkster/lite-ui-fx

> Canvas microinteractions on real native controls. A DPR-aware canvas is hijacked over a hidden native element -- decorated around a live one -- or shared across a group of them -- and painted by a pluggable, zero-GC **recipe**. The native element owns focus, keyboard, and pointer events; the canvas owns the visuals. 57 built-in recipes behind a tree-shakeable registry, one option convention for theming, one clock you can hand it, and reduced-motion built in.

[![npm version](https://img.shields.io/npm/v/@zakkster/lite-ui-fx.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
![Zero-GC](https://img.shields.io/badge/Zero--GC-Recipes-00C853?style=for-the-badge&logo=leaf&logoColor=white)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@zakkster/lite-ui-fx?style=for-the-badge)](https://bundlephobia.com/result?p=@zakkster/lite-ui-fx)
[![npm downloads](https://img.shields.io/npm/dm/@zakkster/lite-ui-fx?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
[![npm total downloads](https://img.shields.io/npm/dt/@zakkster/lite-ui-fx?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
![Dependencies](https://img.shields.io/badge/dependencies-3-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

## The canvas microinteraction layer the ecosystem was missing

Every flashy-component library forces a trade. The React/Tailwind kits (React Bits, Aceternity, Magic UI) are extraordinary and framework-locked. The copy-paste CSS galleries (uiverse and friends) are framework-free but ship no behaviour -- no focus management, no keyboard, no screen-reader semantics. `lite-ui-fx` takes the corner nobody holds: **canvas-grade visuals on a real native control**, framework-free, zero-GC, reduced-motion aware, and agent-readable (`llms.txt` + a `RECIPE_META` registry).

The native element is never faked. A toggle is a real `<input type="checkbox" role="switch">`; a slider is a real `<input type="range">`. It stays invisible (`opacity:0`) but keeps every accessibility guarantee the browser gives it. The canvas sits on top and renders the recipe. For an element that must stay visible -- a live text input -- the second mount mode **decorates** instead: the canvas is placed around the host, which is left byte-identical.

```bash
npm i @zakkster/lite-ui-fx
```

```js
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';
import { SwarmToggle } from '@zakkster/lite-ui-fx/recipes';

// A real <input type="checkbox" role="switch">, invisible but fully accessible,
// painted by 150 particles that swarm into a knob and explode on toggle.
const toggle = mountUIFX(document.getElementById('sound-toggle'), UIType.TOGGLE, SwarmToggle, {
    label: 'Sound effects',
    width: 64,
    height: 36,
});

// Screen readers see: <input type="checkbox" role="switch" aria-label="Sound effects">
toggle.destroy();   // removes the overlay + native element, tears down every listener
```

Three runtime dependencies, all zero-GC (`@zakkster/lite-ticker`, `lite-lerp`, `lite-random`). Nothing else.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [What you get](#what-you-get)
- [Three mount modes and the recipe contract](#three-mount-modes-and-the-recipe-contract)
- [API reference](#api-reference)
  - [mountUIFX](#mountuifxcontainer-type-recipefactory-options)
  - [decorateUIFX](#decorateuifxel-recipefactory-options)
  - [mountUIFXGroup](#mountuifxgroupcontainer-grouptype-recipefactory-options)
  - [skinHeadless](#skinheadlesshandle-recipefactory-options)
  - [The recipe registry](#the-recipe-registry)
  - [Constants: UITypes, state, META](#constants-uitypes-state-meta)
- [Host clock and reduced motion](#host-clock-and-reduced-motion)
- [Composability](#composability)
- [Zero-GC design notes](#zero-gc-design-notes)
- [Design decisions worth knowing](#design-decisions-worth-knowing)
- [Testing](#testing)
- [What this is not](#what-this-is-not)
- [Ecosystem](#ecosystem)

---

## Why this exists

Two problems no small library solves at once:

1. **Extraordinary visuals usually cost your accessibility.** The moment a control becomes a canvas, it stops being a control: no focus ring, no Space-to-toggle, no `role`, nothing a screen reader can announce. Most "animated component" libraries either lean on a framework's a11y or quietly drop it. `lite-ui-fx` keeps the real native element under the paint, so the keyboard and the screen-reader tree are the browser's own -- not a reimplementation that drifts. A `mountUIFX` toggle activates on Space because it *is* a checkbox.

2. **Canvas UI usually lies about being cheap.** A widget that allocates a color string, a gradient, or a particle object every frame drops frames under GC pressure exactly when the animation is busiest. Every built-in recipe here is zero-GC on its hot path -- `const` color strings with `globalAlpha`, preallocated typed-array particle pools, gradients built once in `init` -- and that claim is a gated torture test, not a README adjective.

The alternative is a hand-rolled canvas threshold loop (no a11y, allocates freely), a full animation framework (heavy, framework-bound), or copy-paste CSS (no behaviour). `lite-ui-fx` is the API for this specific job: a flashy control that is still a control.

---

## What you get

- **`mountUIFX(container, type, recipeFactory, options?)`** -- the hijack mount. Creates a real native element (invisible, accessible) under a DPR-scaled canvas and drives the recipe. Six element types: `TOGGLE`, `BUTTON`, `SLIDER`, `CHECKBOX`, `PROGRESS`, `KNOB`.
- **`decorateUIFX(el, recipeFactory, options?)`** -- the decorate mount. Places a canvas *around* an existing visible element (a live `<input>`), reading `state.text`/`state.valid` from the host's own events. The host is byte-identical before and after; `destroy()` removes only the overlay.
- **`mountUIFXGroup(container, groupType, recipeFactory, options)`** -- the group mount. N native elements + one canvas + one recipe: `RADIO`/`RATING` (a fieldset radiogroup), `TABS` (an APG tablist with roving tabindex), `STEPPER` (a spinbutton). The recipe reads `state.index`/`state.count`; selection and keyboard are the native elements' own.
- **`skinHeadless(handle, recipeFactory, options)`** -- the headless-skin adapter (on the `./headless` subpath). Paints a `@zakkster/lite-headless` primitive by observing the state attributes it paints -- never importing lite-headless, so it stays a compose-target, not a dependency.
- **57 built-in recipes** on the `./recipes` subpath, versioned, typed, and tree-shakeable. With `sideEffects: false`, importing one recipe drops the other 56. Families: Toggles (7), Buttons (9), Sliders (7), Knobs (2), Progress (4), Checkboxes (4), Loaders (2), Counters (2), Rating (1), Controls (4), Indicators (3), Mood (3), Feedback (3), Fun (3), Form decorations (3).
- **A registry for data-driven UIs** -- `RECIPES` (id -> factory, null-prototype), `RECIPE_META` (`{ id, name, type, family, themeable, motionSafe }`), `RECIPE_NAMES`, `registerRecipe(id, factory, meta)`, and `mountRecipe(container, id, options?)` which resolves the id fail-closed (did-you-mean on a typo) and mounts it as its declared type.
- **One option convention for theming** -- `{ colors, theme: { light, mid, dark }, text, font }` honoured by all 57 recipes, resolved once in `init` so a themed mount stays zero-GC and a bare mount is byte-identical to pre-theming.
- **Host integration** -- ride a caller-supplied `lite-ticker` (`{ ticker }`), drive frames by hand (`{ driven: true }` + `instance.tick(dtMs)`), or take the shared ref-counted ticker by default. Plus `state.reducedMotion` (matchMedia-watched) and `state.budget` (0..1 frame budget).
- **Full TypeScript declarations** for both entry points, and a written recipe guide ([`UIFX-RECIPE-GUIDE.md`](UIFX-RECIPE-GUIDE.md)) shipped in the package.

---

## Three mount modes and the recipe contract

<details>
<summary>How hijack, decorate, and group differ, and the recipe interface they share.</summary>

### Hijack (`mountUIFX`)

```
+--- wrapper div ---------------------------------+
|  native element  (opacity:0, z-index:2)         |  <- pointer, keyboard, focus, a11y
|  canvas overlay  (z-index:1, DPR-scaled)        |  <- recipe.tick() every frame
+-------------------------------------------------+
```

The native element is the source of truth. Every visual reads `state`; `state` reads the native element. Keyboard and assistive-tech behaviour is identical to a bare native control, because it *is* one. A `padding` (default 40) lets particles overflow the element box.

### Decorate (`decorateUIFX`)

No native element is created and nothing is reparented. The canvas is a sibling positioned from the host's offset box and removed on `destroy()`, so the host is byte-identical before and after. `state` is wired from the host's own events; for a form control, `state.text` and `state.valid` mirror `el.value` and `el.validity` (read at event time, never per frame). This is the honest home for a decoration over a real input -- a visible text field cannot be `opacity:0`.

### Group (`mountUIFXGroup`)

A grouped control is *N* native elements sharing one canvas and one recipe -- radios in a `<fieldset>`, tabs in a `<div role="tablist">`, or a `<input type="number">` spinbutton. Selection and keyboard belong to the native elements (radio/rating roving is the browser's own; the tablist gets a hand-written APG roving tabindex with arrows and Home/End); the recipe paints from `state.index`, `state.count`, and the per-item geometry lanes (`state.itemX/itemY/itemW/itemH`, one entry per item). It adds one hook -- `onSelect(index, state)`, fired exactly once per selection change -- and `setIndex(i)` for programmatic selection.

### The recipe contract (all three modes)

A recipe is a factory returning up to eight hooks (nine for a group -- the extra is `onSelect`). Only `tick` is required; it is the one HOT function.

```js
export function MyRecipe() {
    // closed-over per-instance scratch, allocated once here (cold)
    let pressScale = 1;
    return {
        init(ctx, w, h, padding) {},          // cold: resolve theme, build gradients, size pools
        onHover(entering, state) {},           // pointer enter/leave
        onClick(x, y, state) {},               // BUTTON activation
        onToggle(checked, state) {},           // TOGGLE / CHECKBOX
        onDrag(val, velocity, state) {},       // SLIDER / KNOB
        tick(ctx, dt, now, state) {            // HOT: paint one frame, allocate nothing
            pressScale += (1 - pressScale) * dt * 10;
        },
        destroy() {},                          // cold: release anything init created
    };
}
```

An unknown hook key on the returned object is an error at mount with a did-you-mean hint -- a typo'd `onClik` never silently does nothing.

</details>

---

## API reference

### `mountUIFX(container, type, recipeFactory, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | `HTMLElement` | Parent to mount into |
| `type` | `UIType` | One of `TOGGLE`, `BUTTON`, `SLIDER`, `CHECKBOX`, `PROGRESS`, `KNOB` |
| `recipeFactory` | `() => Recipe` | Factory; the controller calls it |
| `options` | `object?` | See below |

Options: `width`, `height`, `padding` (40), `label`, `value` (slider start, 0..1), `checked` (toggle start), `disabled`, `seed`, `colors` (`string[]`), `theme` (`{ light, mid, dark }`), `text`, `font`, `knobMode` (`'rotate'|'vertical'`, KNOB), `announce` (`boolean`, PROGRESS), `ticker`, `driven`. An unknown option key -- or a recipe-hook key passed as an option -- throws a did-you-mean; a malformed `theme`/`colors`/`seed`/`knobMode`/`announce`, or an unknown `UIType`, throws. `null` is never coerced to a default.

Returns `{ el, canvas, wrapper, state, setValue(v), setChecked(b), tick(dtMs), destroy() }`.

- `setValue(v)` -- SLIDER/KNOB/PROGRESS: set `v` in `0..1` (updates the element and `state.val`, fires `onDrag` once). CHECKBOX: `setValue(null)` sets indeterminate.
- `setChecked(b)` -- TOGGLE/CHECKBOX: set checked (updates the element and `state.toggled`, fires `onToggle` once).
- `tick(dtMs)` -- driven mode only (`{ driven: true }`): paints one frame. Throws otherwise.

```js
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';
import { SparkSlider } from '@zakkster/lite-ui-fx/recipes';

const slider = mountUIFX(document.getElementById('volume'), UIType.SLIDER, SparkSlider, { value: 0.3 });
slider.setValue(0.75);   // moves the native <input type="range"> and fires onDrag once
slider.destroy();
```

### `decorateUIFX(el, recipeFactory, options?)`

Decorates an existing visible element. `options` is the subset `{ padding, seed, colors, theme, text, font, ticker, driven }`; the hijack-only keys (`width`/`height`/`value`/`checked`/`disabled`/`knobMode`/`announce`/`label`) throw in decorate mode -- geometry comes from the host, value is read from it. Returns `{ el, canvas, state, setValue, setChecked, tick, destroy() }`, where `setValue`/`setChecked` are hijack-only and throw (a decoration reflects the host; it does not drive it).

```js
import { decorateUIFX } from '@zakkster/lite-ui-fx';
import { PasswordStrength } from '@zakkster/lite-ui-fx/recipes';

const input = document.querySelector('#password');
const deco = decorateUIFX(input, PasswordStrength);
// the input stays fully usable; the meter tracks what the user types
deco.destroy();   // removes ONLY the overlay; the input is untouched
```

Built-in decorate recipes: `FocusHalo`, `ErrorShake`, `SuccessBloom`, `PasswordStrength`, `TypewriterField` (`RECIPE_META.type === 'decorate'`, so `mountRecipe(el, id)` routes them here automatically).

### `mountUIFXGroup(container, groupType, recipeFactory, options)`

The third mount mode: a **grouped control** -- N native elements + one canvas + one recipe. `GroupType.RADIO`/`RATING` build a `<fieldset role="radiogroup">` of N radios (native roving); `GroupType.TABS` builds a `<div role="tablist">` of N `<button role="tab">` with hand-written APG roving tabindex (arrows, Home/End); `GroupType.STEPPER` is one `<input type="number">` spinbutton. The native elements own selection and keyboard; the recipe reads `state.index`, `state.count`, and the per-item geometry lanes (`state.itemX/itemY/itemW/itemH`).

`options`: `items` (`string[]`, **required**, >=2 labels -- its length is the item/step count), `index` (integer initial selection, default 0), plus `label`, `width`, `height`, `padding`, `disabled`, `seed`, `colors`, `theme`, `text`, `font`, `ticker`, `driven`. The hijack-only keys (`value`/`checked`/`knobMode`/`announce`) throw -- a group selects by `index`, not a float `value`.

Returns `{ els, canvas, wrapper, state, index, setIndex(i), tick(dtMs), destroy() }`. `setIndex(i)` selects item `i` programmatically -- it updates the native element(s) and `state.index` and fires `onSelect` exactly once, without stealing focus. A group recipe may add `onSelect(index, state)` -- the ninth, group-only hook (`mountUIFX`/`decorateUIFX` reject it).

```js
import { mountUIFXGroup, GroupType } from '@zakkster/lite-ui-fx';
import { PillTabs } from '@zakkster/lite-ui-fx/recipes';

const tabs = mountUIFXGroup(document.getElementById('view-tabs'), GroupType.TABS, PillTabs, {
  items: ['Overview', 'Activity', 'Settings'],
  index: 0,
});
tabs.setIndex(2);   // selects "Settings"; fires onSelect once, no focus steal
tabs.destroy();
```

Built-in group recipes: `PillTabs`, `SegmentedSlide` (`TABS`), `RadioOrbit` (`RADIO`), `Stepper` (`STEPPER`), `BubbleRating` (`RATING`). The first four re-home from their vol.3 single-element fakes to real groups (so their arrow-key selection is finally correct); `mountRecipe(container, id, { items })` routes them here by `META.type`.

### `skinHeadless(handle, recipeFactory, options)`

The fourth mount adapter, on the `./headless` subpath: **skin a `@zakkster/lite-headless` primitive.** lite-headless ships ARIA-correct primitives that render nothing and paint a canonical set of state attributes; `skinHeadless` places a canvas over the element a primitive paints on and drives a recipe from those attributes -- lite-ui-fx paints, lite-headless behaves. It couples through the painted-attribute contract, never an import, so **lite-headless is never a dependency**. Structurally a decoration: the host is byte-identical, one overlay canvas + one `MutationObserver` are removed on `destroy()`, and the primitive `handle` is never destroyed (the caller owns it).

`options`: `host` (the element the primitive paints on, **required**) plus `padding`, `seed`, `colors`, `theme`, `text`, `font`, `ticker`, `driven`. `setValue`/`setChecked` throw -- a skin reflects the primitive, it does not drive it.

A skin is an ordinary recipe plus a descriptor -- `recipe.headless = { attrs, read(host, handle, state) }`. `skinHeadless` observes `attrs` and calls `read()` at **event time** (never per frame) to parse the painted state into preallocated slots. A painted attribute is truthy when present with any value but `"false"` (so both a boolean `data-disabled` and a value `data-checked="true"` work). The four E1 skins live in a registry (`HEADLESS_SKINS` / `SKIN_META`) separate from the 57 recipes.

```js
import { skinHeadless, SwitchSkin } from '@zakkster/lite-ui-fx/headless';

// `sw` is your @zakkster/lite-headless primitive (e.g. createSwitch({ ... })).
// The skin never imports lite-headless -- it observes the attributes it paints.
const sw = null;                                        // <- your lite-headless switch handle
const thumb = document.querySelector('[data-switch-thumb]');

const skin = skinHeadless(sw, SwitchSkin, {
  host: thumb,
  theme: { light: '#38bdf8', mid: '#3a3a4a', dark: '#0a0a12' },
});
// the overlay now tracks data-checked / aria-checked as the switch paints them
skin.destroy();                                         // host + handle left untouched
```

E1 skins: `SwitchSkin` (`data-checked`), `SliderSkin` (`aria-valuenow`/`min`/`max`), `ProgressSkin` (`aria-valuenow`/`max` + `data-complete`/`data-loading`), `RatingSkin` (`aria-valuenow`/`max`). See [0008](decisions/0008-headless-skins.md).

### The recipe registry

```js
import { RECIPES, RECIPE_META, RECIPE_NAMES, registerRecipe, mountRecipe } from '@zakkster/lite-ui-fx/recipes';

const swarm = RECIPES.swarmToggle;              // id -> factory (null-prototype map)
const toggles = RECIPE_META.filter((m) => m.family === 'Toggles');
mountRecipe(document.getElementById('picker'), 'sparkSlider', { value: 0.5 });
```

`mountRecipe` resolves the id fail-closed (an unknown id throws with a did-you-mean over `RECIPE_NAMES`), asserts `META.type`, and routes to `mountUIFX`, `decorateUIFX`, or `mountUIFXGroup` (a group type needs `items`) accordingly. `registerRecipe(id, factory, meta)` adds or overrides a recipe and merges its META in place, so a live picker built off `RECIPE_META` updates itself.

### Constants: UITypes, state, META

| `UIType` | Native element | Recipe hook | Key state |
|----------|---------------|-------------|-----------|
| `TOGGLE` | `<input type="checkbox" role="switch">` | `onToggle(checked)` | `state.toggled` |
| `BUTTON` | `<button>` | `onClick(x, y, state)` | `state.active` |
| `SLIDER` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0..1) |
| `CHECKBOX` | `<input type="checkbox">` (no `role`) | `onToggle(checked)` | `state.toggled`, `state.indeterminate` |
| `PROGRESS` | `<progress>` (non-interactive) | (driven by `setValue`) | `state.val` (0..1) |
| `KNOB` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0..1) |
| *(decorate)* | none -- canvas around a live host | host events -> state | `state.focused`, `state.text`, `state.valid` |
| *(group)* `GroupType.{RADIO,TABS,STEPPER,RATING}` | N native elements (fieldset/tablist/spinbutton) | `onSelect(index, state)` | `state.index`, `state.count` |

The `state` object passed to `tick(ctx, dt, now, state)` every frame:

| Field | Type | Meaning |
|-------|------|---------|
| `hover` / `active` / `focused` | `boolean` | pointer inside / pressed / keyboard focus |
| `toggled` / `indeterminate` | `boolean` | checkbox and toggle state (indeterminate: CHECKBOX only) |
| `disabled` | `boolean` | mounted with `disabled` |
| `val` | `number` | slider/knob/progress value, 0..1 |
| `w` / `h` / `padding` / `dpr` | `number` | geometry and device pixel ratio |
| `reducedMotion` | `boolean` | user prefers reduced motion (matchMedia, watched) |
| `budget` | `number` | 0..1 frame budget, 1 at ~60fps, lower as frames lengthen |
| `text` / `valid` | `string` / `boolean` | decorate mode only: host value and validity |
| `index` / `count` / `hoverIndex` | `number` | group mode only: selection, item count, hovered item (-1 none) |
| `labels` / `itemX` / `itemY` / `itemW` / `itemH` | `string[]` / `Float32Array` | group mode only: item labels + per-item geometry lanes (read by index) |

`RECIPE_META` rows: `{ id, name, type, family, themeable, motionSafe }`. `themeable` is true for all 57; `motionSafe` is true for exactly the recipes that ship a calm reduced-motion path (6 today: SwarmToggle plus the five decorate recipes) and honestly false for the rest.

---

## Host clock and reduced motion

Three mutually-exclusive clock modes, in both mount modes. Omit both options for the default shared ref-counted ticker (one RAF for every component, byte-identical to earlier versions).

```js
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';
import { MagneticButton } from '@zakkster/lite-ui-fx/recipes';
import { Ticker } from '@zakkster/lite-ticker';

// { ticker }: hand it your game's clock. destroy() removes this component's
// frame but NEVER destroys your ticker -- ownership stays with you.
const clock = new Ticker();
const a = mountUIFX(document.getElementById('fire'), UIType.BUTTON, MagneticButton, { ticker: clock });

// { driven }: no ticker, no RAF -- you call tick(dtMs) from your own loop.
const b = mountUIFX(document.getElementById('jump'), UIType.BUTTON, MagneticButton, { driven: true });
b.tick(16.7);   // paints exactly one frame, the same body the ticker would call

a.destroy();
b.destroy();
```

Passing both `ticker` and `driven`, a non-boolean `driven`, or a `ticker` without an `.add()` method throws at mount (fail closed). `state.reducedMotion` is read before `init` and watched for changes; a calm-path recipe renders statically when it is set (ErrorShake stops shaking, SwarmToggle/SuccessBloom/FocusHalo drop their motion). `state.budget` lets a budget-aware recipe shed particles or glow before frames actually drop. Reduced motion is a *state flag the recipe reads*, never a mode that forces behaviour -- the host owns the toggle, the recipe owns the calm render.

---

## Composability

One clock, a shared theme, several components -- the shape a game or a themed dashboard actually uses:

```js
import { mountUIFX, decorateUIFX, mountUIFXGroup, UIType, GroupType } from '@zakkster/lite-ui-fx';
import { SwarmToggle, SparkSlider, PasswordStrength, PillTabs } from '@zakkster/lite-ui-fx/recipes';
import { Ticker } from '@zakkster/lite-ticker';

// 1. One clock the host owns and controls (pause it, scale it, share it).
const clock = new Ticker();

// 2. A theme object -- the { light, mid, dark } shape lite-scratch-fx also takes,
//    so one object themes both packages.
const theme = { light: '#a78bfa', mid: '#7c3aed', dark: '#4c1d95' };

// 3. Mount several components on that one clock, all themed from that one object.
const mute   = mountUIFX(document.getElementById('mute'),  UIType.TOGGLE, SwarmToggle, { ticker: clock, theme });
const volume = mountUIFX(document.getElementById('vol'),   UIType.SLIDER, SparkSlider, { ticker: clock, theme, value: 0.6 });
const pw     = decorateUIFX(document.querySelector('#password'), PasswordStrength, { ticker: clock, theme });
// a grouped control on the SAME clock + theme (all three mount modes, one pipeline)
const tabs   = mountUIFXGroup(document.getElementById('tabs'), GroupType.TABS, PillTabs, { ticker: clock, theme, items: ['Sound', 'Video', 'About'] });

// 4. One teardown per component; the clock is yours to keep or stop.
mute.destroy();
volume.destroy();
pw.destroy();
tabs.destroy();
```

Every component rides `clock`; destroying one never touches the others or the clock. `colors` (a `string[]`) overrides `theme` when both are present. A bare mount -- no `theme`, no `colors` -- is byte-identical to the pre-theming rendering, so adopting a theme is opt-in and free when you skip it.

---

## Zero-GC design notes

<details>
<summary>What the hot path allocates (nothing), and how the gate proves it.</summary>

Everything a recipe needs is resolved in `init` (cold): the palette and any ramp arrays, gradients, particle pools sized to the recipe's own maximum. The per-frame `tick` afterward does nothing but arithmetic and canvas calls on those preallocated buffers.

| Hot operation | Steady-state allocations | How |
| ------------- | ------------------------ | --- |
| `tick()` fill colors | **0** | `const` color strings + `ctx.globalAlpha`, never a per-frame template literal |
| Particle recipes (Swarm, Firework, ...) | **0** | fixed `Float64Array` lanes, power-of-2 bitmask index -- no push/splice |
| Gradient recipes | **0** after `init` | gradients built in `init`, rebuilt only when a driving value crosses a threshold |
| Value-label text | **0** per frame | label strings rebuilt at ~10Hz via a frame-counter mask, not every frame |
| Pointer move / drag | **0** | arithmetic only; the bounding rect is cached on pointer-enter, not read per move |
| `init` / theme resolve | once, cold | palette, ramps, gradients, pools -- then read-only in the loop |

The `t3-frame-alloc` torture tier asserts, per recipe, **zero distinct `fillStyle` string allocations per frame at steady state** and **zero gradient constructions after `init`** -- in both a default and a themed mount, across all 57 recipes (grouped controls included, driven through their selection). Two positive controls -- one allocating a color string per frame, one per group item per frame -- must FAIL the gate, or it would be decorative. The full harness (`@zakkster/lite-leak` + `@zakkster/lite-gc-profiler`) proves **0 retained bytes, 0 major GCs, and ~0.88 B/op** across the whole mount / interact / destroy loop under `--expose-gc`:

```
GATE leak=size 0/0 findings=0 warnings=0 | gc major=0 minor=0 maxMs=0.00 | alloc=0.8759765625 B/op
```

For size: the controller alone is **~7.1 KB min+gzip** (its three deps external); the full catalog of 57 recipes is **~25 KB min+gzip**, and it tree-shakes -- import one recipe and the bundler drops the other 56.

</details>

---

## Design decisions worth knowing

Each is an ADR under [`decisions/`](decisions/):

- **[0001](decisions/0001-recipes-position.md) -- Recipes ship inside the package.** No more copy-paste-from-a-ZIP: 57 recipes are versioned, typed, and tree-shakeable behind the `./recipes` subpath, exactly the shape the sibling fx packages use.
- **[0002](decisions/0002-recipe-options.md) -- One recipe option convention.** `{ colors, theme, text, font }` across all 57, resolved cold in `init`; defaults reproduce today's literals byte-for-byte; `text` closes the WCAG label-in-name gap.
- **[0003](decisions/0003-element-types.md) -- Real native element types.** CHECKBOX (tri-state), PROGRESS (`setValue`-driven, opt-in `aria-live`), KNOB (native arrows + pointer map) wrap the *correct* native element, not a faked toggle.
- **[0004](decisions/0004-decorate-mode.md) -- Decorate mode.** A second mount mode for a canvas around a live element -- the honest home for a decoration over a real input, host byte-identical.
- **[0005](decisions/0005-host-clock.md) -- Host clock, reduced motion, frame budget.** Three clock modes, `state.reducedMotion` as a flag the recipe reads, `state.budget` for graceful degradation -- all additive, default path byte-identical.
- **[0006](decisions/0006-docs-and-demo.md) -- Blueprint docs + a demo that consumes the package.** This README on the blueprint spine, and one demo generated from `RECIPE_META` that imports only public exports (no more inline reimplementation).
- **[0007](decisions/0007-group-contract.md) -- Grouped controls: one canvas, N native elements.** A third mount mode (`mountUIFXGroup`) for radio/tabs/stepper/rating; `onSelect` is a ninth, group-only hook and group state a superset of scalar state, so the single-element API is byte-identical (additive, 1.9.0).
- **[0008](decisions/0008-headless-skins.md) -- Headless skins: paint a lite-headless primitive.** `skinHeadless` couples through the painted-attribute contract (one `MutationObserver`, parsed at event time), never an import -- so lite-headless is a compose-target, never a dependency. The four skins live in a registry separate from the 57 recipes (additive, 1.10.0).

---

## Testing

**237 deterministic node:test cases across 27 suites, all pass**, plus a torture gate that proves 0 B/op steady state and leak-freedom.

```bash
npm test          # node:test: contract, boundary, registry, theming, reduced-motion, docs
npm run torture   # @zakkster/lite-leak + lite-gc-profiler: 0 B/op steady state, gated
```

The suite covers the a11y state machine (one Space press = one `onToggle`, state flipped once), the fail-closed option surface (unknown key -> did-you-mean; malformed theme/value/knobMode throw), the registry (resolve, override, type-check, tree-shake), theming (a bare mount is byte-identical; a themed mount honours `colors`/`theme`), reduced motion (calm-path recipes collapse their motion under `reducedMotion`), and host integration (default rides the shared ticker; `{ ticker }` never destroys the caller's clock; `{ driven }` paints without a RAF). A doc-snippet gate extracts every code block in this README and executes it against the package, so a drifted example fails CI. The torture harness runs seven deliberately-broken controls that must each exit non-zero -- a gate that cannot fail is decorative.

---

## What this is not

- **Not a React or framework binding.** No components, no hooks, no JSX. It mounts onto a DOM element; wire it into any framework's ref, or none.
- **Not a component framework.** It paints controls; it does not do layout, routing, or state management. Bring your own.
- **Not a worker-mode renderer.** A 200x48 UI canvas does not amortise a worker hop; the shared main-thread ticker is the right tool. (`@zakkster/lite-ambient-fx` is the worker-mode fullscreen backdrop.)
- **Not a chart or data-viz library.** These are interactive *controls*, not plots. Charts are `@zakkster/lite-charts`.
- **Not an ARIA behaviour engine.** It renders. The one keyboard behaviour it writes is the tablist roving-tabindex for a `TABS` group (radio/rating/stepper selection is the browser's own); it does not own focus traps, dismiss stacks, or listbox/combobox/menu patterns. `@zakkster/lite-headless` owns behaviour, permanently -- and its 59 primitives are a decorate-mode skin target.

---

## Ecosystem

Part of the **@zakkster** zero-GC stack:

- [`lite-ticker`](https://www.npmjs.com/package/@zakkster/lite-ticker) -- the shared RAF scheduler; hand your own instance in via `{ ticker }`
- [`lite-lerp`](https://www.npmjs.com/package/@zakkster/lite-lerp) -- zero-dep game-math primitives (recipe easing)
- [`lite-random`](https://www.npmjs.com/package/@zakkster/lite-random) -- seeded Mulberry32 RNG (deterministic particle recipes)
- [`lite-scratch-fx`](https://www.npmjs.com/package/@zakkster/lite-scratch-fx) -- canvas scratch-reveal recipes; shares the `{ light, mid, dark }` theme shape
- [`lite-ambient-fx`](https://www.npmjs.com/package/@zakkster/lite-ambient-fx) -- fullscreen ambient backdrops (the worker-mode sibling)
- [`lite-headless`](https://www.npmjs.com/package/@zakkster/lite-headless) -- 59 ARIA-correct primitives; a decorate-mode skin target
- **`lite-ui-fx`** -- this package

---

## License

MIT (c) Zahary Shinikchiev <shinikchiev@yahoo.com>
