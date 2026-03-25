/**
 * @zakkster/lite-ui-fx — Canvas-Hijacked UI Components
 *
 * Overlays a DPR-aware canvas on top of native HTML elements (buttons,
 * checkboxes, sliders). The native element handles accessibility, focus,
 * and events. The canvas handles visuals via a pluggable recipe system.
 *
 * Architecture:
 *   Native element (opacity:0, z-index:2) — receives all pointer/keyboard events
 *   Canvas overlay (z-index:1) — renders the visual recipe
 *   Recipe factory → { init?, tick, onHover?, onLeave?, onClick?, onToggle?, onDrag?, destroy? }
 *
 * Uses:
 *   @zakkster/lite-lerp   — interpolation in recipes
 *   @zakkster/lite-random  — deterministic particle effects
 *   @zakkster/lite-color   — OKLCH color math (optional per recipe)
 *
 * Depends on: @zakkster/lite-ticker (shared RAF loop)
 */

import { Ticker } from '@zakkster/lite-ticker';

// ─────────────────────────────────────────────────────────
//  SHARED TICKER (ref-counted, one RAF for all UI components)
// ─────────────────────────────────────────────────────────

let _sharedTicker = null;
let _sharedRefs = 0;

function acquireTicker() {
    if (!_sharedTicker) {
        _sharedTicker = new Ticker();
        _sharedTicker.start();
    }
    _sharedRefs++;
    return _sharedTicker;
}

function releaseTicker() {
    _sharedRefs--;
    if (_sharedRefs <= 0 && _sharedTicker) {
        _sharedTicker.destroy();
        _sharedTicker = null;
        _sharedRefs = 0;
    }
}


// ─────────────────────────────────────────────────────────
//  ELEMENT TYPES
// ─────────────────────────────────────────────────────────

/** @enum {string} */
export const UIType = Object.freeze({
    BUTTON: 'button',
    TOGGLE: 'toggle',
    SLIDER: 'slider',
});


// ═══════════════════════════════════════════════════════════
//  UIFXController — The Canvas Hijacker
// ═══════════════════════════════════════════════════════════

/**
 * Mount a canvas-rendered recipe onto a native HTML element.
 *
 * @param {HTMLElement} container    Parent element to mount into
 * @param {string}      type         'button' | 'toggle' | 'slider'
 * @param {Function}    recipeFactory  () => Recipe object
 * @param {Object}      [options]
 * @param {number}      [options.width]   Element width (auto-detected from type if omitted)
 * @param {number}      [options.height]  Element height
 * @param {number}      [options.padding=40]  Canvas overflow padding (for particles)
 * @param {string}      [options.label]   Accessible label for the element
 * @returns {{ el: HTMLElement, destroy: Function }}
 */
export function mountUIFX(container, type, recipeFactory, {
    width,
    height,
    padding = 40,
    label = '',
} = {}) {
    // ── Resolve dimensions ──
    const w = width  || (type === UIType.BUTTON ? 160 : type === UIType.SLIDER ? 200 : 64);
    const h = height || (type === UIType.BUTTON ? 48  : type === UIType.SLIDER ? 28  : 36);
    const dpr = window.devicePixelRatio || 1;

    // ── Create native element (invisible, accessible, receives events) ──
    let el;
    if (type === UIType.TOGGLE) {
        el = document.createElement('input');
        el.type = 'checkbox';
        el.setAttribute('role', 'switch');
        if (label) el.setAttribute('aria-label', label);
    } else if (type === UIType.SLIDER) {
        el = document.createElement('input');
        el.type = 'range';
        el.min = '0'; el.max = '100'; el.value = '50';
        if (label) el.setAttribute('aria-label', label);
    } else {
        el = document.createElement('button');
        el.textContent = label || 'Action';
        el.type = 'button';
    }

    Object.assign(el.style, {
        position: 'relative', zIndex: '2',
        opacity: '0', cursor: 'pointer',
        width: `${w}px`, height: `${h}px`,
        border: 'none', background: 'transparent',
        margin: '0', padding: '0',
        WebkitAppearance: 'none', appearance: 'none',
    });

    // Slider thumb needs explicit sizing for hit area
    if (type === UIType.SLIDER) {
        const thumbCSS = document.createElement('style');
        thumbCSS.textContent = `
            .uifx-slider::-webkit-slider-thumb { -webkit-appearance:none; width:24px; height:24px; cursor:grab; }
            .uifx-slider::-moz-range-thumb { width:24px; height:24px; cursor:grab; border:none; background:transparent; }
        `;
        document.head.appendChild(thumbCSS);
        el.classList.add('uifx-slider');
    }

    // ── Create canvas overlay (DPR-aware) ──
    const canvas = document.createElement('canvas');
    const cw = w + padding * 2;
    const ch = h + padding * 2;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    Object.assign(canvas.style, {
        position: 'absolute', top: '0', left: '0',
        width: `${cw}px`, height: `${ch}px`,
        transform: `translate(-${padding}px, -${padding}px)`,
        pointerEvents: 'none', zIndex: '1',
    });

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // ── Wrapper ──
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        position: 'relative', display: 'inline-block',
        width: `${w}px`, height: `${h}px`,
    });
    wrapper.appendChild(el);
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    // ── State ──
    const state = {
        hover: false,
        active: false,      // pointer is down
        focused: false,      // keyboard focus
        toggled: false,      // checkbox state
        val: type === UIType.SLIDER ? 0.5 : 0,  // slider value 0–1
        w, h, padding, dpr,
    };

    const pointer = { x: -999, y: -999, vx: 0, vy: 0 };

    // ── Initialize recipe ──
    const recipe = recipeFactory();
    if (recipe.init) recipe.init(ctx, w, h, padding);

    // ── Events (all via AbortController) ──
    const ac = new AbortController();
    const signal = ac.signal;

    function updatePointer(e) {
        const r = el.getBoundingClientRect();
        const nx = e.clientX - r.left;
        const ny = e.clientY - r.top;
        pointer.vx = nx - pointer.x;
        pointer.vy = ny - pointer.y;
        pointer.x = nx;
        pointer.y = ny;
    }

    el.addEventListener('pointermove', updatePointer, { signal });
    el.addEventListener('pointerenter', (e) => {
        state.hover = true;
        updatePointer(e);
        if (recipe.onHover) recipe.onHover(state, pointer);
    }, { signal });
    el.addEventListener('pointerleave', () => {
        state.hover = false;
        if (recipe.onLeave) recipe.onLeave(state, pointer);
    }, { signal });
    el.addEventListener('pointerdown', (e) => {
        state.active = true;
        updatePointer(e);
        if (recipe.onClick) recipe.onClick(pointer.x, pointer.y, state);
    }, { signal });
    el.addEventListener('pointerup', () => { state.active = false; }, { signal });

    // Focus tracking (for keyboard accessibility indicators)
    el.addEventListener('focus', () => { state.focused = true; }, { signal });
    el.addEventListener('blur', () => { state.focused = false; }, { signal });

    // Toggle events
    if (type === UIType.TOGGLE) {
        el.addEventListener('change', () => {
            state.toggled = el.checked;
            if (recipe.onToggle) recipe.onToggle(state.toggled, state);
        }, { signal });
        // Keyboard: Space/Enter toggles checkbox
        el.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                el.checked = !el.checked;
                state.toggled = el.checked;
                if (recipe.onToggle) recipe.onToggle(state.toggled, state);
            }
        }, { signal });
    }

    // Slider events
    if (type === UIType.SLIDER) {
        el.addEventListener('input', () => {
            state.val = el.value / 100;
            if (recipe.onDrag) recipe.onDrag(state.val, pointer.vx, state);
        }, { signal });
    }

    // ── Render loop (shared ticker) ──
    const ticker = acquireTicker();
    let destroyed = false;

    const removeTick = ticker.add((dtMs) => {
        if (destroyed) return;
        const dt = dtMs / 1000;
        const now = performance.now();

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(padding, padding); // Origin = native element's top-left
        recipe.tick(ctx, dt, now, state, pointer);
        ctx.restore();
    });

    // ── Public API ──
    return {
        /** The native HTML element (for external state reads). */
        el,

        /** The canvas element (for external styling). */
        canvas,

        /** The wrapper div (for positioning). */
        wrapper,

        /** Current state (read-only reference). */
        state,

        /** Destroy everything. Idempotent. */
        destroy() {
            if (destroyed) return;
            destroyed = true;
            ac.abort();
            removeTick();
            if (recipe.destroy) recipe.destroy();
            releaseTicker();
            wrapper.remove();
        },
    };
}

export default mountUIFX;
