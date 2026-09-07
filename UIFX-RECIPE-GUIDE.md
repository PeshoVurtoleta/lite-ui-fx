# Writing a UI-FX Recipe

A recipe is a plain factory function that returns an object with a `tick()` method and optional lifecycle hooks. The UIFXController handles events, DPR scaling, and the render loop -- the recipe just draws.

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
    // REQUIRED -- called every frame (60fps)
    tick(ctx: CanvasRenderingContext2D, dt: number, now: number, state: State, pointer: Pointer): void;

    // OPTIONAL -- called once after mount
    init?(ctx: CanvasRenderingContext2D, w: number, h: number, padding: number): void;

    // OPTIONAL -- event hooks
    onHover?(state: State, pointer: Pointer): void;
    onLeave?(state: State, pointer: Pointer): void;
    onClick?(x: number, y: number, state: State): void;
    onToggle?(checked: boolean, state: State): void;   // Toggles only
    onDrag?(value: number, velocity: number, state: State): void;  // Sliders only

    // OPTIONAL -- cleanup
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
    toggled: boolean,   // Checkbox checked state (toggles/checkboxes)
    indeterminate: boolean, // CHECKBOX only: native indeterminate (setValue(null))
    val: number,        // 0--1 value (sliders/knobs/progress)
    w: number,          // Element width in CSS pixels
    h: number,          // Element height
    padding: number,    // Canvas overflow padding
    dpr: number,        // Device pixel ratio
    reducedMotion: boolean, // U5: user prefers reduced motion (see below)
    budget: number,     // U5: 0--1 frame budget (1 at ~60fps, lower under load)
    // Decorate mode only (decorateUIFX): the live host's value + validity.
    text: string,       // the host form-control's value string ('' if none)
    valid: boolean,     // the host's validity (el.validity.valid, else true)
}
```

## Reduced Motion & Frame Budget (U5)

Two state fields let a recipe be a good citizen without changing the interface.

- **`state.reducedMotion`** is `true` when the user has set
  `prefers-reduced-motion: reduce`. A recipe that animates should read it and
  render a **static** alternative -- no continuous motion, no bursts, no shakes.
  Fades and instant state changes are fine; sustained or positional motion is not.
  When your recipe ships such a calm path, set its `RECIPE_META.motionSafe: true`;
  that flag is a promise the calm path exists, so keep them in sync.

  ```javascript
  tick(c, dt, now, st) {
      // full motion vs. a steady, motion-free render
      const wobble = st.reducedMotion ? 0 : Math.sin(now / 200) * 4;
      // ... draw using `wobble` (0 = no motion) ...
  }
  ```

- **`state.budget`** is `1` when frames are healthy and drops toward `0` as they
  lengthen. A budget-aware recipe scales expensive work by it (fewer particles,
  less glow) so it degrades before the host drops frames. Consuming it is optional.

  ```javascript
  const live = (this.count = Math.floor(MAX_PARTICLES * st.budget));
  ```

Both are read-only per-frame numbers -- never write them, never allocate to honour
them (a branch on a boolean/number is free; a new array per frame is not).

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
+-------------------------------+
|       padding                 |
|   +-------------------+      |
|   | (0,0)         (w,0)|      |
|   |                     |      |
|   | Your drawing space  |      |
|   |                     |      |
|   | (0,h)         (w,h)|      |
|   +-------------------+      |
|       padding                 |
+-------------------------------+
```

Particles that fly outside `(0,0)--(w,h)` are visible because the canvas extends by `padding` in each direction. Default padding is 40px.

## Mounting a Recipe

```javascript
import { mountUIFX, UIType } from './UIFXController.js';
import { MyToggle } from './my-recipe.js';

const instance = mountUIFX(
    document.getElementById('container'),
    UIType.TOGGLE,
    MyToggle,   // Factory function (NOT called -- the controller calls it)
    { label: 'Dark mode', width: 64, height: 36 }
);

// Later:
instance.destroy();
```

## Element Types & Mount Modes

`mountUIFX` HIJACKS -- it creates one of six native elements (opacity:0) under the
canvas:

| Type | Native Element | Recipe Gets | Key State |
|------|----------------|-------------|-----------|
| `UIType.TOGGLE` | `<input type="checkbox" role="switch">` | `onToggle(checked)` | `state.toggled` |
| `UIType.BUTTON` | `<button>` | `onClick(x, y, state)` | `state.active` |
| `UIType.SLIDER` | `<input type="range">` | `onDrag(val, velocity)` | `state.val` (0--1) |
| `UIType.CHECKBOX` | `<input type="checkbox">` (no `role=switch`) | `onToggle(checked)` | `state.toggled`, `state.indeterminate` |
| `UIType.PROGRESS` | `<progress>` (non-interactive) | (driven by `setValue`) | `state.val` |
| `UIType.KNOB` | `<input type="range">` | `onDrag(val, velocity)` | `state.val`, `knobMode` |

## Decorate-Mode Recipes (a canvas AROUND a live element)

`decorateUIFX(el, factory, options)` is the SECOND mount mode: instead of creating
a hidden element, it positions a canvas around an EXISTING, visible element (a real
`<input>`, a button, any element). Same recipe interface, same coordinate system --
`(0,0)` is the host's top-left, `state.w/h` are the host's size -- but three rules
differ, and breaking them is caught by the torture t0 decorate DOM-diff:

1. **Never touch the host.** A decoration paints ONLY its overlay canvas. Do not
   write `el.style`, set an attribute, or read/move the host in `init`/`tick`. The
   host must be byte-identical after `destroy()` (additive-only). The controller
   never sets `opacity:0` and never reparents the host -- neither may your recipe.
2. **Read host content from `state`, at frame time, allocation-free.** For a
   form-control host, `state.text` (the value string) and `state.valid` (validity)
   are updated by the controller at EVENT time (input/change/invalid) -- never per
   frame. Your `tick` reads them; scan `state.text` with `charCodeAt` (no allocating
   string ops), and edge-detect `state.valid` against a closure-cached previous.
   There is NO new hook: a decoration reacts by polling `state` in `tick`.
3. **`setValue`/`setChecked` are hijack-only.** A decoration reflects the host; it
   does not drive it. Both throw in decorate mode.

```javascript
import { decorateUIFX } from './UIFXController.js';
// A decoration reads state.focused / state.valid / state.text; it never draws the
// host's own text (the real element already shows it).
export function Underline() {
    let fill = 0;
    return {
        tick(ctx, dt, now, state) {
            const len = (state.text || '').length;           // number, no alloc
            fill += ((len ? Math.min(len / 24, 1) : 0) - fill) * dt * 8;
            ctx.strokeStyle = state.focused ? '#6ee7b6' : '#556';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(2, state.h - 3);
            ctx.lineTo(2 + (state.w - 4) * fill, state.h - 3);
            ctx.stroke();
        },
    };
}
const deco = decorateUIFX(document.querySelector('#field'), Underline);
```

Register a decorate recipe with `RECIPE_META.type: 'decorate'` -- then
`mountRecipe(el, id)` routes it to `decorateUIFX` automatically.

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

1. **Focus ring** -- draw a dashed outline when `state.focused` is true (keyboard users)
2. **State label** -- show "ON"/"OFF" or a value percentage so the user sees the state
3. **Press feedback** -- scale down on `state.active`, spring back on release
4. **Hover feedback** -- change color/glow when `state.hover` is true

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

1. **Never allocate in `tick()`** -- pre-allocate TypedArrays / fixed object pools in the factory closure or `init()`. This is not a guideline: the `t3-frame-alloc` torture tier FAILS any built-in recipe that assigns a fresh colour string, builds a gradient, or grows a pool on a hot frame (idle OR under interaction churn), and re-runs the same budget under a themed mount.
2. **No `push`/`splice` on the hot path** -- a particle pool is a fixed-size array (or `Float64Array` lanes) with a `live`/`life` flag; spawn scans for a dead slot, death clears the flag. `splice()` allocates and shifts elements; it is a cold-path tool (mount/destroy) only, never per frame. (The pre-U3 "splice is fine for < 100 particles" advice is retired -- it contradicts the gate.)
3. **Reset composite operation** -- if you set `ctx.globalCompositeOperation = 'screen'`, reset to `'source-over'` before returning
4. **Reset shadow** -- `ctx.shadowBlur = 0` after drawing glowing elements
5. **Use the `dt` parameter** -- all motion must be `value * dt`, not `value` per frame. This ensures consistent speed regardless of frame rate.
6. **Resolve theming in the factory / `init()`, never in `tick()`** -- read `options.theme` / `colors` / `text` / `font` ONCE at construction (the built-ins use the shared `resolveTheme` / `pickText` / `pickFont` helpers), producing const colour strings and any value-LUT the hot body then reads. Alpha varies via `ctx.globalAlpha` over a const colour; a `rgba(...,${x})` or `` `${color}` `` built per frame trips t3. Defaults must reproduce the pre-theming output byte-for-byte.
