# @zakkster/lite-ui-fx

[![npm version](https://img.shields.io/npm/v/@zakkster/lite-ui-fx.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@zakkster/lite-ui-fx?style=for-the-badge)](https://bundlephobia.com/result?p=@zakkster/lite-ui-fx)
[![npm downloads](https://img.shields.io/npm/dm/@zakkster/lite-ui-fx?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
[![npm total downloads](https://img.shields.io/npm/dt/@zakkster/lite-ui-fx?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-ui-fx)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
![Dependencies](https://img.shields.io/badge/dependencies-3-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

## ✨ What is lite-ui-fx?

`@zakkster/lite-ui-fx` overlays a DPR-aware canvas on native HTML elements and renders them with pluggable, physics-driven **recipes**. The native element stays invisible but fully accessible — handling focus, keyboard, and pointer events. The canvas handles all visuals.

## 🎬 Live Demo (UI-FX)
https://cdpn.io/pen/debug/RNGjMjQ

## 🎬 Live Demo (UI-FX vol.2)
https://cdpn.io/pen/debug/yyaPKpB

## 🎬 Live Demo (UI-FX vol3.)
https://cdpn.io/pen/debug/YPGEaYY

**50 recipes** across UI element categories:

- 🔘 **Toggles** — Swarm, Liquid, Neon Pulse, Pendulum, Circuit, Lightning, DNA
- 🔲 **Buttons** — Magnetic, Shatter, Confetti, Glitch, Heartbeat, Breathing, Ink Splash, Pixel Dissolve, Firework
- 🎚️ **Sliders** — Spark, Cosmic Void, Laser, Aurora, Wave, Elastic Band, Gravity
- 🎛️ **Knobs** — Volume dial, Compass needle
- 📊 **Progress** — Ring, Battery, Signal meter
- 🔀 **Controls** — Pill tabs, Stepper, Radio orbit
- 📈 **Indicators** — Password strength, Water level, Heat map
- 🌗 **Mood** — Day/night, Reaction picker, Notification bell
- 💬 **Feedback** — Typewriter, Sound wave, Upload progress
- 🎮 **Fun** — Scratch reveal, Timer countdown, Pull refresh
- ✅ **Checkboxes** — Ripple, Morph (X → ✓)
- 🔄 **Loaders** — Orbit planets, DNA helix
- 🔢 **Counters** — Flame heat, Glitch signal
- ⭐ **Rating** — Bubble inflate

Every recipe is zero-GC, uses `dt`-based animation, and includes accessibility indicators (focus rings, state labels).

`@zakkster/lite-ui-fx` ships only the core controller on npm (zero bloat).  
All visual effects live in the GitHub repo as **recipes**.

📁 **Recipe Collections:**  
- Vol. 1 (10 recipes):  
  https://github.com/PeshoVurtoleta/lite-ui-fx/blob/main/recipes/UIFXRecipes.js  
- Vol. 2 (20 recipes):  
  https://github.com/PeshoVurtoleta/lite-ui-fx/blob/main/recipes/UIFXRecipes2.js  
- Vol. 3 (20 recipes):  
  https://github.com/PeshoVurtoleta/lite-ui-fx/blob/main/recipes/UIFXRecipes3.js  

📘 **How to write your own:**  
https://github.com/PeshoVurtoleta/lite-ui-fx/blob/main/UIFX-RECIPE-GUIDE.md

Recipes are **optional**, **open-source**, and **not included in the npm package**  
to keep the install size tiny (<2 KB).  
You can copy/paste any recipe into your project or use them as inspiration.

📦 Download all recipes as a ZIP  
https://github.com/PeshoVurtoleta/lite-ui-fx/archive/refs/heads/main.zip

Part of the [@zakkster/lite-*](https://www.npmjs.com/org/zakkster) ecosystem.

## 🚀 Install

```bash
npm i @zakkster/lite-ui-fx
```

> Looking for the visual effects?  
> Recipes live in the GitHub repo — not in the npm package — to keep the library tiny.


## 🕹️ Quick Start

```javascript
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';
import { SwarmToggle } from './recipes/UIFXRecipes.js';

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

## 📦 Import Map

```javascript
// Controller (always needed)
import { mountUIFX, UIType } from '@zakkster/lite-ui-fx';

// Recipes are NOT included in the npm package.
// Copy them from the GitHub repo into your own ./recipes folder:

// Vol. 1 — 10 recipes (toggles, buttons, sliders)
import { SwarmToggle, MagneticButton, SparkSlider } from './recipes/UIFXRecipes.js';

// Vol. 2 — 20 recipes (+ loaders, checkboxes, counters, rating)
import { PendulumToggle, HeartbeatButton, RippleCheck } from './recipes/UIFXRecipes2.js';

// Vol. 3 — 20 recipes (knobs, progress, controls, indicators, mood, feedback, fun)
import { VolumeKnob, WaterLevel, TimerCountdown } from './recipes/UIFXRecipes3.js';
```

## 🧠 How It Works

```
┌──────────────────────────────────────────────────┐
│  mountUIFX(container, type, recipeFactory, opts)  │
│                                                    │
│  ┌──── Wrapper div ────────────────────────────┐  │
│  │                                              │  │
│  │  Native element (opacity:0, z-index:2)       │  │
│  │  → receives pointer, keyboard, focus events  │  │
│  │  → accessible to screen readers              │  │
│  │                                              │  │
│  │  Canvas overlay (z-index:1, DPR-scaled)      │  │
│  │  → recipe.tick() renders every frame         │  │
│  │  → padding allows particle overflow          │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Shared Ticker (ref-counted, one RAF for all)      │
│  AbortController (all events cleaned on destroy)   │
└──────────────────────────────────────────────────┘
```

## ⚙️ API

### `mountUIFX(container, type, recipeFactory, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | `HTMLElement` | Parent to mount into |
| `type` | `'button' \| 'toggle' \| 'slider'` | Determines native element type |
| `recipeFactory` | `() => Recipe` | Factory function (controller calls it) |
| `options.width` | `number` | Element width (auto from type if omitted) |
| `options.height` | `number` | Element height |
| `options.padding` | `number` | Canvas overflow (default: 40px) |
| `options.label` | `string` | Accessible label (aria-label) |

Returns `{ el, canvas, wrapper, state, destroy() }`.

### Element Types

| Type | Native Element | Recipe Hooks | Key State |
|------|---------------|-------------|-----------|
| `UIType.TOGGLE` | `<input type="checkbox" role="switch">` | `onToggle(checked)` | `state.toggled` |
| `UIType.BUTTON` | `<button>` | `onClick(x, y, state)` | `state.active` |
| `UIType.SLIDER` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0–1) |

### State Object (provided to `tick()` every frame)

```typescript
{
    hover: boolean;      // Pointer inside element
    active: boolean;     // Pointer pressed
    focused: boolean;    // Keyboard focus
    toggled: boolean;    // Checkbox state
    val: number;         // Slider value (0–1)
    w: number;           // Element width
    h: number;           // Element height
    padding: number;     // Canvas padding
    dpr: number;         // Device pixel ratio
}
```

## 📊 Comparison

| Library | Size | Approach | Recipes | A11y | Install |
|---------|------|----------|---------|------|---------|
| Framer Motion | ~45 KB | React HOC | 0 | Via React | `npm i framer-motion` |
| GSAP | ~25 KB | Timeline | 0 | Manual | `npm i gsap` |
| Lottie | ~55 KB | JSON animation | After Effects | Manual | `npm i lottie-web` |
| **lite-ui-fx** | **< 5 KB** | **Canvas hijack** | *50 built-in** | **Native + visual** | **`npm i @zakkster/lite-ui-fx`** |

## 🎨 Writing Custom Recipes

See the full [UIFX-RECIPE-GUIDE.md](recipes/UIFX-RECIPE-GUIDE.md) (included in the package).

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

## 📦 TypeScript

Full TypeScript declarations are included for:

- `mountUIFX`
- `UIType`
- `UIFXState`
- `UIFXPointer`
- `UIFXRecipe`

(Recipes are not part of the npm package, so their types are not included.)

```

## 📚 LLM-Friendly Documentation

See `llms.txt` for AI-optimized metadata and the complete recipe catalog.

## License

MIT
