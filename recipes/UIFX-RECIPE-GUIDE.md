# Writing a UI-FX Recipe

A recipe is a plain factory function that returns an object with a `tick()` method and optional lifecycle hooks. The UIFXController handles events, DPR scaling, and the render loop — the recipe just draws.

## Minimal Recipe (copy-paste starter)

```javascript
export function MyToggle() {
    let knobX = 18;

    return {
        tick(ctx, dt, now, state, pointer) {
            const { w, h, toggled } = state;

            // Animate knob position
            const target = toggled ? w - 18 : 18;
            knobX += (target - knobX) * dt * 12;

            // Draw track
            ctx.fillStyle = toggled ? 'rgba(110,231,182,.2)' : 'rgba(255,255,255,.06)';
            ctx.beginPath();
            ctx.roundRect(0, 0, w, h, h / 2);
            ctx.fill();

            // Draw knob
            ctx.fillStyle = toggled ? '#6ee7b6' : '#999';
            ctx.beginPath();
            ctx.arc(knobX, h / 2, 14, 0, Math.PI * 2);
            ctx.fill();
        },
    };
}
```

## The Recipe Interface

```typescript
interface Recipe {
    // REQUIRED — called every frame (60fps)
    tick(ctx: CanvasRenderingContext2D, dt: number, now: number, state: State, pointer: Pointer): void;

    // OPTIONAL — called once after mount
    init?(ctx: CanvasRenderingContext2D, w: number, h: number, padding: number): void;

    // OPTIONAL — event hooks
    onHover?(state: State, pointer: Pointer): void;
    onLeave?(state: State, pointer: Pointer): void;
    onClick?(x: number, y: number, state: State): void;
    onToggle?(checked: boolean, state: State): void;   // Toggles only
    onDrag?(value: number, velocity: number, state: State): void;  // Sliders only

    // OPTIONAL — cleanup
    destroy?(): void;
}
```

## The State Object

The controller provides this every frame:

```javascript
{
    hover: boolean,     // Pointer is inside the element
    active: boolean,    // Pointer is pressed down
    focused: boolean,   // Element has keyboard focus
    toggled: boolean,   // Checkbox checked state (toggles)
    val: number,        // 0–1 slider value (sliders)
    w: number,          // Element width in CSS pixels
    h: number,          // Element height
    padding: number,    // Canvas overflow padding
    dpr: number,        // Device pixel ratio
}
```

## The Pointer Object

```javascript
{
    x: number,   // X position relative to element's top-left
    y: number,   // Y position relative to element's top-left
    vx: number,  // X velocity (pixels since last move)
    vy: number,  // Y velocity
}
```

## Coordinate System

The canvas is larger than the element (by `padding` on each side) to allow particles to overflow. The controller translates the context so that `(0, 0)` is the element's top-left corner. You draw as if the element starts at origin.

```
Canvas memory:
┌───────────────────────────────┐
│       padding                 │
│   ┌───────────────────┐      │
│   │ (0,0)         (w,0)│      │
│   │                     │      │
│   │ Your drawing space  │      │
│   │                     │      │
│   │ (0,h)         (w,h)│      │
│   └───────────────────┘      │
│       padding                 │
└───────────────────────────────┘
```

Particles that fly outside `(0,0)–(w,h)` are visible because the canvas extends by `padding` in each direction. Default padding is 40px.

## Mounting a Recipe

```javascript
import { mountUIFX, UIType } from './UIFXController.js';
import { MyToggle } from './my-recipe.js';

const instance = mountUIFX(
    document.getElementById('container'),
    UIType.TOGGLE,
    MyToggle,   // Factory function (NOT called — the controller calls it)
    { label: 'Dark mode', width: 64, height: 36 }
);

// Later:
instance.destroy();
```

## Three Element Types

| Type | Native Element | Recipe Gets | Key State |
|------|----------------|-------------|-----------|
| `UIType.TOGGLE` | `<input type="checkbox" role="switch">` | `onToggle(checked)` | `state.toggled` |
| `UIType.BUTTON` | `<button>` | `onClick(x, y, state)` | `state.active` |
| `UIType.SLIDER` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0–1) |

## Using @zakkster Libraries in Recipes

Recipes can import any @zakkster library:

```javascript
import { lerp, clamp, easeOut } from '@zakkster/lite-lerp';
import { Random } from '@zakkster/lite-random';
import { toCssOklch, lerpOklch } from '@zakkster/lite-color';

export function OklchToggle() {
    const rng = new Random(42);
    const off = { l: 0.4, c: 0.05, h: 250 };
    const on  = { l: 0.7, c: 0.2, h: 160 };
    let t = 0;

    return {
        tick(ctx, dt, now, state) {
            t = lerp(t, state.toggled ? 1 : 0, dt * 8);
            const color = lerpOklch(off, on, easeOut(t));

            ctx.fillStyle = toCssOklch(color);
            ctx.beginPath();
            ctx.roundRect(0, 0, state.w, state.h, state.h / 2);
            ctx.fill();
            // ...
        },
    };
}
```

## Accessibility Checklist

The controller makes the native element invisible but fully accessible. Your recipe should add visual feedback:

1. **Focus ring** — draw a dashed outline when `state.focused` is true (keyboard users)
2. **State label** — show "ON"/"OFF" or a value percentage so the user sees the state
3. **Press feedback** — scale down on `state.active`, spring back on release
4. **Hover feedback** — change color/glow when `state.hover` is true

```javascript
// Focus ring helper
if (state.focused) {
    ctx.strokeStyle = 'rgba(110,231,182,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-2, -2, state.w + 4, state.h + 4);
    ctx.setLineDash([]);
}
```

## Performance Rules

1. **Never allocate in `tick()`** — pre-allocate TypedArrays in the factory closure or `init()`
2. **Use `splice()` sparingly** — for small particle arrays (< 100) it's fine. For larger pools, use a dead-flag pattern
3. **Reset composite operation** — if you set `ctx.globalCompositeOperation = 'screen'`, reset to `'source-over'` before returning
4. **Reset shadow** — `ctx.shadowBlur = 0` after drawing glowing elements
5. **Use the `dt` parameter** — all motion must be `value * dt`, not `value` per frame. This ensures consistent speed regardless of frame rate.
