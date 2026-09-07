# @zakkster/lite-ui-fx

[![npm version](https://img.shields.io/npm/v/@zakkster/lite-ui-fx.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@zakkster/lite-ui-fx?style=for-the-badge)](https://bundlephobia.com/result?p=@zakkster/lite-ui-fx)
[![npm downloads](https://img.shields.io/npm/dm/@zakkster/lite-ui-fx?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
[![npm total downloads](https://img.shields.io/npm/dt/@zakkster/lite-ui-fx?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
![Dependencies](https://img.shields.io/badge/dependencies-3-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

## What is lite-ui-fx?

`@zakkster/lite-ui-fx` overlays a DPR-aware canvas on native HTML elements and renders them with pluggable, physics-driven **recipes**. The native element stays invisible but fully accessible -- handling focus, keyboard, and pointer events. The canvas handles all visuals.

## Live Demo (UI-FX)
https://cdpn.io/pen/debug/RNGjMjQ

## Live Demo (UI-FX vol.2)
https://cdpn.io/pen/debug/yyaPKpB

## Live Demo (UI-FX vol3.)
https://cdpn.io/pen/debug/YPGEaYY

**56 recipes** across UI element categories:

- **Toggles** -- Swarm, Liquid, Neon Pulse, Pendulum, Circuit, Lightning, DNA
- **Buttons** -- Magnetic, Shatter, Confetti, Glitch, Heartbeat, Breathing, Ink Splash, Pixel Dissolve, Firework
- **Sliders** -- Spark, Cosmic Void, Laser, Aurora, Wave, Elastic Band, Gravity
- **Knobs** -- Volume dial, Compass needle
- **Progress** -- Ring, Battery, Signal meter, Liquid Fill
- **Controls** -- Pill tabs, Stepper, Radio orbit
- **Indicators** -- Water level, Heat map
- **Mood** -- Day/night, Reaction picker, Notification bell
- **Feedback** -- Sound wave, Upload progress
- **Fun** -- Scratch reveal, Timer countdown, Pull refresh
- **Checkboxes** -- Ripple, Morph (X to check), Tick Draw, Indeterminate Scan
- **Loaders** -- Orbit planets, DNA helix
- **Counters** -- Flame heat, Glitch signal
- **Rating** -- Bubble inflate
- **Form (decorate)** -- Focus halo, Error shake, Success bloom, Password strength, Typewriter field (mounted via `decorateUIFX`, around a live element)

Every recipe is zero-GC, uses `dt`-based animation, and includes accessibility indicators (focus rings, state labels).

All 56 recipes ship in the package on the `./recipes` subpath -- versioned,
typed, and tree-shakeable. With `sideEffects: false`, importing one recipe pulls
in only that recipe, so a controller-only install stays tiny.

```javascript
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';
import { SwarmToggle } from '@zakkster/lite-ui-fx/recipes';
```

The `./recipes` entry also exports a registry for data-driven pickers:
`RECIPES` (id -> factory), `RECIPE_META` (`{ id, name, type, family }`),
`RECIPE_NAMES`, `registerRecipe(id, factory, meta)`, and
`mountRecipe(container, id, options?)` -- which resolves the id fail-closed
(did-you-mean on a typo) and mounts it as its declared type.

**How to write your own:** see [UIFX-RECIPE-GUIDE.md](UIFX-RECIPE-GUIDE.md), shipped in the package.

Part of the [@zakkster/lite-*](https://www.npmjs.com/org/zakkster) ecosystem.

## Install

```bash
npm i @zakkster/lite-ui-fx
```

> The 56 recipes ship in the same package on the `./recipes` subpath and
> tree-shake, so importing one adds only that one.


## Quick Start

```javascript
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';
import { SwarmToggle } from '@zakkster/lite-ui-fx/recipes';

// Mount a canvas-rendered toggle onto a container
const instance = mountUIFX(
    document.getElementById('my-container'),
    UIType.TOGGLE,
    SwarmToggle,
    { label: 'Sound effects', width: 64, height: 36 }
);

// The native checkbox is invisible but fully accessible.
// Screen readers see: <input type="checkbox" role="switch" aria-label="Sound effects">
// Canvas renders: 150 particles forming a knob that explodes on toggle.

// Cleanup when done:
instance.destroy();
```

## Import Map

```javascript
// Controller (always needed)
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';

// All 56 recipes ship on the ./recipes subpath (tree-shakeable) -- import by name:
import { SwarmToggle, MagneticButton, SparkSlider } from '@zakkster/lite-ui-fx/recipes';
import { PendulumToggle, HeartbeatButton, RippleCheck } from '@zakkster/lite-ui-fx/recipes';
import { VolumeKnob, WaterLevel, TimerCountdown } from '@zakkster/lite-ui-fx/recipes';

// Registry surface for data-driven pickers:
import { RECIPES, RECIPE_META, RECIPE_NAMES, registerRecipe, mountRecipe } from '@zakkster/lite-ui-fx/recipes';
```

## How It Works

```
+--------------------------------------------------+
|  mountUIFX(container, type, recipeFactory, opts)  |
|                                                    |
|  +---- Wrapper div ----------------------------+  |
|  |                                              |  |
|  |  Native element (opacity:0, z-index:2)       |  |
|  |  -> receives pointer, keyboard, focus events |  |
|  |  -> accessible to screen readers             |  |
|  |                                              |  |
|  |  Canvas overlay (z-index:1, DPR-scaled)      |  |
|  |  -> recipe.tick() renders every frame        |  |
|  |  -> padding allows particle overflow         |  |
|  |                                              |  |
|  +----------------------------------------------+  |
|                                                    |
|  Shared Ticker (ref-counted, one RAF for all)      |
|  AbortController (all events cleaned on destroy)   |
+--------------------------------------------------+
```

## API

### `mountUIFX(container, type, recipeFactory, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | `HTMLElement` | Parent to mount into |
| `type` | `'button' \| 'toggle' \| 'slider' \| 'checkbox' \| 'progress' \| 'knob'` | Determines native element type |
| `recipeFactory` | `() => Recipe` | Factory function (controller calls it) |
| `options.width` | `number` | Element width (auto from type if omitted) |
| `options.height` | `number` | Element height |
| `options.padding` | `number` | Canvas overflow (default: 40px) |
| `options.label` | `string` | Accessible label (aria-label) |
| `options.value` | `number` | Slider initial value, 0..1 (default 0.5); out-of-range throws |
| `options.checked` | `boolean` | Toggle initial state (default false) |
| `options.disabled` | `boolean` | Disables the native element; sets `state.disabled` |
| `options.knobMode` | `'rotate' \| 'vertical'` | KNOB only: pointer-to-value mapping (default `'rotate'`); wrong type throws |
| `options.announce` | `boolean` | PROGRESS only: opt-in `aria-live` announcements at 10% steps; wrong type throws |

Recipe theming options (`seed`, `colors`, `theme`, `text`, `font`) are also
accepted and forwarded to the recipe -- see `llms.txt` for the full option surface.

Returns `{ el, canvas, wrapper, state, setValue(v), setChecked(b), destroy() }`.

- `setValue(v)` -- SLIDER/KNOB/PROGRESS: set `v` in `0..1` (updates the element +
  `state.val`, fires `onDrag` once). CHECKBOX: `setValue(null)` sets indeterminate.
- `setChecked(b)` -- TOGGLE/CHECKBOX: set checked (updates the element +
  `state.toggled`, fires `onToggle` once).

### `decorateUIFX(el, recipeFactory, options?)` -- the second mount mode

Where `mountUIFX` **hijacks** (creates a hidden native element under a canvas),
`decorateUIFX` **decorates**: it positions a canvas *around* an existing, visible
element without hijacking it -- no `opacity:0`, no reparenting. The overlay is a
sibling placed from the host's offset box and removed on `destroy()`, so the host
is byte-identical before and after. Recipe `state` is wired from the host's own
events; for a form-control host, `state.text` and `state.valid` mirror `el.value`
and `el.validity` (read at event time, never per frame). This is the honest home
for a decoration over a real input.

```javascript
import { decorateUIFX } from '@zakkster/lite-ui-fx';
import { PasswordStrength } from '@zakkster/lite-ui-fx/recipes';

const input = document.querySelector('#password');
const deco = decorateUIFX(input, PasswordStrength, { theme });
// ... input stays fully usable; the meter tracks what the user types ...
deco.destroy(); // removes ONLY the overlay; the input is untouched
```

`options` is a subset: `padding`, `seed`, `colors`, `theme`, `text`, `font`. The
hijack-only keys (`width`/`height`/`value`/`checked`/`disabled`/`knobMode`/
`announce`/`label`) throw in decorate mode. Returns
`{ el, canvas, state, setValue, setChecked, destroy() }`, where `setValue` and
`setChecked` are hijack-only and throw (a decoration reflects the host; it does
not drive it). Built-in decorate recipes: `FocusHalo`, `ErrorShake`,
`SuccessBloom`, `PasswordStrength`, `TypewriterField` (`RECIPE_META.type` =
`'decorate'`, so `mountRecipe(el, id)` routes them here automatically).

### Element Types

| Type | Native Element | Recipe Hooks | Key State |
|------|---------------|-------------|-----------|
| `UIType.TOGGLE` | `<input type="checkbox" role="switch">` | `onToggle(checked)` | `state.toggled` |
| `UIType.BUTTON` | `<button>` | `onClick(x, y, state)` | `state.active` |
| `UIType.SLIDER` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0-1) |
| `UIType.CHECKBOX` | `<input type="checkbox">` (no `role=switch`) | `onToggle(checked)` | `state.toggled`, `state.indeterminate` |
| `UIType.PROGRESS` | `<progress>` (non-interactive) | (driven by `setValue`) | `state.val` (0-1) |
| `UIType.KNOB` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0-1) |
| *(decorate)* | none -- a canvas AROUND a live host (`decorateUIFX`) | host events -> state | `state.focused`, `state.text`, `state.valid` |

*(decorate)* is a mount mode, not a `UIType`: it creates no native element. A recipe
with `RECIPE_META.type === 'decorate'` is mounted via `decorateUIFX`.

### State Object (provided to `tick()` every frame)

```typescript
{
    hover: boolean;      // Pointer inside element
    active: boolean;     // Pointer pressed
    focused: boolean;    // Keyboard focus
    toggled: boolean;    // Checkbox/toggle state
    indeterminate: boolean; // CHECKBOX only: native indeterminate (setValue(null))
    disabled: boolean;   // Disabled via options.disabled
    val: number;         // Slider value (0-1)
    w: number;           // Element width
    h: number;           // Element height
    padding: number;     // Canvas padding
    dpr: number;         // Device pixel ratio
    text?: string;       // decorate mode only: the host value string
    valid?: boolean;     // decorate mode only: the host validity
}
```

## Comparison

| Library | Size | Approach | Recipes | A11y | Install |
|---------|------|----------|---------|------|---------|
| Framer Motion | ~45 KB | React HOC | 0 | Via React | `npm i framer-motion` |
| GSAP | ~25 KB | Timeline | 0 | Manual | `npm i gsap` |
| Lottie | ~55 KB | JSON animation | After Effects | Manual | `npm i lottie-web` |
| **lite-ui-fx** | **< 5 KB** | **Canvas hijack + decorate** | **56 built-in** | **Native + visual** | **`npm i @zakkster/lite-ui-fx`** |

## Writing Custom Recipes

See the full [UIFX-RECIPE-GUIDE.md](UIFX-RECIPE-GUIDE.md) (included in the package).

Minimal recipe:

```javascript
export function MyButton() {
    let pressScale = 1;
    return {
        onClick() { pressScale = 0.85; },
        tick(ctx, dt, now, state) {
            pressScale += (1 - pressScale) * dt * 10;
            ctx.translate(state.w/2, state.h/2);
            ctx.scale(pressScale, pressScale);
            ctx.translate(-state.w/2, -state.h/2);
            ctx.fillStyle = state.hover ? '#a78bfa' : '#333';
            ctx.beginPath(); ctx.roundRect(0, 0, state.w, state.h, 10); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '600 13px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('PRESS ME', state.w/2, state.h/2);
        },
    };
}
```

## TypeScript

Full TypeScript declarations are included for:

- `mountUIFX`
- `decorateUIFX` (+ `DecorateOptions`, `DecorateInstance`)
- `UIType`
- `UIFXState`
- `UIFXPointer`
- `UIFXRecipe`

Recipe types ship too, on the `./recipes` subpath (`UIFXRecipes.d.ts`).


## LLM-Friendly Documentation

See `llms.txt` for AI-optimized metadata and the complete recipe catalog.

## License

MIT
