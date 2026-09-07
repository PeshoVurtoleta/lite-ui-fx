/**
 * @zakkster/lite-ui-fx -- Canvas-Hijacked UI Components
 *
 * Overlays a DPR-aware canvas on top of native HTML elements (buttons,
 * checkboxes, sliders). The native element handles accessibility, focus,
 * and events. The canvas handles visuals via a pluggable recipe system.
 *
 * Architecture:
 *   Native element (opacity:0, z-index:2) -- receives all pointer/keyboard events
 *   Canvas overlay (z-index:1) -- renders the visual recipe
 *   Recipe factory -> { init?, tick, onHover?, onLeave?, onClick?, onToggle?, onDrag?, destroy? }
 *
 * Uses:
 *   @zakkster/lite-lerp   -- interpolation in recipes
 *   @zakkster/lite-random  -- deterministic particle effects
 *   @zakkster/lite-color   -- OKLCH color math (optional per recipe)
 *
 * Depends on: @zakkster/lite-ticker (shared RAF loop)
 */

import { Ticker } from '@zakkster/lite-ticker';

// Three-place version sync: this constant, package.json "version", and the
// VERSION line in llms.txt must always match. /release keeps them locked.
export const VERSION = '1.4.0';

// ---------------------------------------------------------
//  SHARED TICKER (ref-counted, one RAF for all UI components)
// ---------------------------------------------------------

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


// ---------------------------------------------------------
//  SHARED SLIDER STYLE (ref-counted, one <style> for all sliders)
// ---------------------------------------------------------

let _sliderStyle = null;
let _sliderRefs = 0;

function acquireSliderStyle() {
    if (!_sliderStyle) {
        _sliderStyle = document.createElement('style');
        _sliderStyle.textContent = `
            .uifx-slider::-webkit-slider-thumb { -webkit-appearance:none; width:24px; height:24px; cursor:grab; }
            .uifx-slider::-moz-range-thumb { width:24px; height:24px; cursor:grab; border:none; background:transparent; }
        `;
        document.head.appendChild(_sliderStyle);
    }
    _sliderRefs++;
}

function releaseSliderStyle() {
    _sliderRefs--;
    if (_sliderRefs <= 0 && _sliderStyle) {
        _sliderStyle.remove();
        _sliderStyle = null;
        _sliderRefs = 0;
    }
}


// ---------------------------------------------------------
//  MOUNT-TIME VALIDATION (cold path only -- never a hot body)
// ---------------------------------------------------------

const KNOWN_HOOKS = ['init', 'tick', 'onHover', 'onLeave', 'onClick', 'onToggle', 'onDrag', 'destroy'];
const KNOWN_OPTIONS = ['width', 'height', 'padding', 'label', 'value', 'checked', 'disabled', 'seed', 'colors', 'theme', 'text', 'font'];

// Levenshtein edit distance. Cold: only reached on the error path.
function _editDistance(a, b) {
    const al = a.length;
    const bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    let prev = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
        const cur = new Array(bl + 1);
        cur[0] = i;
        for (let j = 1; j <= bl; j++) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
            let m = prev[j] + 1;
            const del = cur[j - 1] + 1;
            if (del < m) m = del;
            const sub = prev[j - 1] + cost;
            if (sub < m) m = sub;
            cur[j] = m;
        }
        prev = cur;
    }
    return prev[bl];
}

// Nearest known key within edit distance <=2, else one sharing a >=2-char
// prefix, else null. Cold path.
function _suggest(name, known) {
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < known.length; i++) {
        const d = _editDistance(name, known[i]);
        if (d < bestD) { bestD = d; best = known[i]; }
    }
    if (bestD <= 2) return best;
    const head = name.length >= 2 ? name.slice(0, 2) : name;
    for (let i = 0; i < known.length; i++) {
        if (known[i].indexOf(head) === 0) return known[i];
    }
    return null;
}

function _didYouMean(prefix, name, known) {
    const s = _suggest(name, known);
    return prefix + ' "' + name + '"' + (s ? '. Did you mean "' + s + '"?' : '');
}


// ---------------------------------------------------------
//  ELEMENT TYPES
// ---------------------------------------------------------

/** @enum {string} */
export const UIType = Object.freeze({
    BUTTON: 'button',
    TOGGLE: 'toggle',
    SLIDER: 'slider',
});


// =========================================================
//  UIFXController -- The Canvas Hijacker
// =========================================================

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
export function mountUIFX(container, type, recipeFactory, options = {}) {
    // =====================================================================
    //  PHASE 1 -- VALIDATION ONLY. No side effect runs until every check
    //  below has passed: no createElement, no appendChild, no
    //  acquireSliderStyle, no ticker acquire, no recipe.init. A rejected
    //  mount must leave the DOM and every shared refcount exactly as it
    //  found them (fail closed -- BLOCKER 1).
    // =====================================================================

    // 1. container
    if (!container || typeof container.appendChild !== 'function') {
        throw new Error('mountUIFX: container must be a DOM element');
    }

    // 1b. type: exactly one of the three known element types. An unknown or
    //     undefined type is an Error here, never a silent default to a button
    //     (fail closed -- the type selects the native element).
    if (type !== UIType.BUTTON && type !== UIType.TOGGLE && type !== UIType.SLIDER) {
        throw new Error('mountUIFX: type must be UIType.BUTTON, UIType.TOGGLE, or UIType.SLIDER');
    }

    // 2. options: unknown keys -> did-you-mean; value/checked/disabled
    //    validated and coerced HERE, before any element exists.
    for (const k in options) {
        if (!Object.prototype.hasOwnProperty.call(options, k)) continue;
        if (KNOWN_OPTIONS.indexOf(k) === -1) {
            throw new Error(_didYouMean('mountUIFX: unknown option', k, KNOWN_OPTIONS));
        }
    }
    const value = options.value;
    if (value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) {
        // null is not zero: an out-of-range or non-numeric value is an error,
        // never a silent coercion.
        throw new Error('mountUIFX: option "value" must be a number in [0,1]');
    }
    const checked = options.checked === undefined ? false : !!options.checked;
    const disabled = options.disabled === undefined ? false : !!options.disabled;
    const width = options.width;
    const height = options.height;
    const padding = options.padding === undefined ? 40 : options.padding;
    const label = options.label === undefined ? '' : options.label;

    // Reserved theming options (decisions/0002): all optional, validated fail
    // closed here, then forwarded to the recipe factory which resolves them in
    // init. This is cold mount code -- closures/allocation are fine here.
    const _theme = options.theme;
    if (_theme !== undefined) {
        if (_theme === null || typeof _theme !== 'object' ||
            typeof _theme.light !== 'string' || typeof _theme.mid !== 'string' ||
            typeof _theme.dark !== 'string' || Object.keys(_theme).length !== 3) {
            throw new Error('mountUIFX: option "theme" must be { light, mid, dark } of color strings');
        }
    }
    const _colors = options.colors;
    if (_colors !== undefined &&
        (!Array.isArray(_colors) || _colors.some((c) => typeof c !== 'string'))) {
        throw new Error('mountUIFX: option "colors" must be an array of color strings');
    }
    if (options.text !== undefined && typeof options.text !== 'string') {
        throw new Error('mountUIFX: option "text" must be a string');
    }
    if (options.font !== undefined && typeof options.font !== 'string') {
        throw new Error('mountUIFX: option "font" must be a string');
    }
    if (options.seed !== undefined &&
        (typeof options.seed !== 'number' || !Number.isFinite(options.seed))) {
        throw new Error('mountUIFX: option "seed" must be a finite number');
    }

    // 3. recipeFactory
    if (typeof recipeFactory !== 'function') {
        throw new Error('mountUIFX: recipeFactory must be a function');
    }

    // 4. recipe object + hooks. Created now so a bad recipe throws BEFORE any
    //    DOM/refcount side effect; .init is deferred to phase 2 (needs ctx).
    //    The validated options are forwarded so a recipe factory can read its
    //    own visual config and default a canvas `text` to the accessible
    //    `label`; a zero-arg or user-wrapped factory ignores the argument.
    const recipe = recipeFactory(options);
    if (!recipe || typeof recipe !== 'object') {
        throw new Error('mountUIFX: recipe must be an object');
    }
    if (typeof recipe.tick !== 'function') {
        throw new Error('mountUIFX: recipe.tick must be a function');
    }
    for (const k in recipe) {
        if (!Object.prototype.hasOwnProperty.call(recipe, k)) continue;
        if (typeof recipe[k] === 'function' && KNOWN_HOOKS.indexOf(k) === -1) {
            throw new Error(_didYouMean('mountUIFX: unknown recipe hook', k, KNOWN_HOOKS));
        }
    }

    // =====================================================================
    //  PHASE 2 -- SIDE EFFECTS. Every check above has passed; only now do
    //  we allocate DOM, bump refcounts, and wire events.
    //
    //  This region is ALSO fail-closed: if any step throws (realistically a
    //  user recipe.init, but anything here), we UNWIND every side effect that
    //  actually landed -- in reverse acquisition order, each guarded by its own
    //  flag so nothing underflows a refcount or double-frees -- then re-throw
    //  the ORIGINAL error. A try/catch is free on the success path; this is all
    //  cold mount code with zero hot-path impact.
    // =====================================================================

    let styleAcquired = false;   // acquireSliderStyle() bumped _sliderRefs
    let wrapperAppended = false;  // wrapper is in container.children
    let acCreated = false;       // AbortController exists (listeners may be on it)
    let tickerAcquired = false;  // acquireTicker() bumped _sharedRefs
    let wrapper = null;
    let ac = null;
    let removeTick = null;

    try {
    // -- Resolve dimensions --
    const w = width  || (type === UIType.BUTTON ? 160 : type === UIType.SLIDER ? 200 : 64);
    const h = height || (type === UIType.BUTTON ? 48  : type === UIType.SLIDER ? 28  : 36);
    let dpr = window.devicePixelRatio || 1;

    // -- Create native element (invisible, accessible, receives events) --
    let el;
    if (type === UIType.TOGGLE) {
        el = document.createElement('input');
        el.type = 'checkbox';
        el.setAttribute('role', 'switch');
        el.checked = checked;  // coerced boolean; lands before frame 1
        if (label) el.setAttribute('aria-label', label);
    } else if (type === UIType.SLIDER) {
        el = document.createElement('input');
        el.type = 'range';
        el.min = '0'; el.max = '100';
        el.value = value !== undefined ? String(value * 100) : '50';  // 0..1 -> 0..100
        if (label) el.setAttribute('aria-label', label);
    } else {
        el = document.createElement('button');
        el.textContent = label || 'Action';
        el.type = 'button';
    }
    if (disabled) el.disabled = true;  // lands before frame 1

    Object.assign(el.style, {
        position: 'relative', zIndex: '2',
        opacity: '0', cursor: 'pointer',
        width: `${w}px`, height: `${h}px`,
        border: 'none', background: 'transparent',
        margin: '0', padding: '0',
        WebkitAppearance: 'none', appearance: 'none',
    });

    // Slider thumb needs explicit sizing for hit area. One shared, ref-counted
    // <style> for all sliders (U-09): released in destroy() when the last slider
    // goes -- head child count nets to zero across mount/destroy.
    if (type === UIType.SLIDER) {
        acquireSliderStyle();
        styleAcquired = true;
        el.classList.add('uifx-slider');
    }

    // -- Create canvas overlay (DPR-aware) --
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

    // -- Wrapper --
    wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        position: 'relative', display: 'inline-block',
        width: `${w}px`, height: `${h}px`,
    });
    wrapper.appendChild(el);
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
    wrapperAppended = true;

    // -- State (value/checked/disabled land here BEFORE frame 1) --
    const state = {
        hover: false,
        active: false,      // pointer is down
        focused: false,      // keyboard focus
        toggled: checked,   // coerced boolean; element + state AGREE
        disabled,           // recipes can render a disabled look
        val: value !== undefined ? value : (type === UIType.SLIDER ? 0.5 : 0),  // 0-1
        w, h, padding, dpr,
    };

    const pointer = { x: -999, y: -999, vx: 0, vy: 0 };
    // Cached bounding rect. Refreshed on pointerenter + scroll/resize (cold);
    // pointermove reads it with ZERO layout reads (U-11). null until the first
    // pointer event, then lazily filled once (see updatePointer).
    let rect = null;

    // -- Initialize recipe (already validated in phase 1: object, tick fn,
    //    only known hooks). ctx exists now, so init can run. --
    if (recipe.init) recipe.init(ctx, w, h, padding);

    // -- Events (all via AbortController) --
    ac = new AbortController();
    acCreated = true;
    const signal = ac.signal;

    function updatePointer(e) {
        // Lazily fill the rect on the first pointer event (e.g. a pointerdown
        // with no prior pointerenter). Fires getBoundingClientRect at most once
        // until the next scroll/resize/enter nulls or refreshes it -- steady-
        // state pointermove does ZERO layout reads (U-11 / NIT 1).
        if (!rect) rect = el.getBoundingClientRect();
        const nx = e.clientX - rect.left;
        const ny = e.clientY - rect.top;
        pointer.vx = nx - pointer.x;
        pointer.vy = ny - pointer.y;
        pointer.x = nx;
        pointer.y = ny;
    }
    function refreshRect() { rect = el.getBoundingClientRect(); }

    // Rect invalidation on layout shift -- cold path, through ac.signal so
    // destroy()'s abort removes them (no orphaned window listeners).
    window.addEventListener('scroll', refreshRect, { passive: true, signal });
    window.addEventListener('resize', refreshRect, { passive: true, signal });

    el.addEventListener('pointermove', updatePointer, { signal });
    el.addEventListener('pointerenter', (e) => {
        state.hover = true;
        refreshRect();          // one layout read per enter
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
        // Space activates the checkbox natively (browser fires click -> change ->
        // the listener above). Enter is not native for a checkbox; route it
        // through the SAME activation path so there is one onToggle per press.
        el.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') el.click();
        }, { signal });
    }

    // Slider events
    if (type === UIType.SLIDER) {
        el.addEventListener('input', () => {
            state.val = el.value / 100;
            if (recipe.onDrag) recipe.onDrag(state.val, pointer.vx, state);
        }, { signal });
    }

    // -- DPR re-read on display change (cold, feature-detected). Absent
    //    matchMedia is a silent no-op: the canvas stays at mount DPR (fail
    //    closed, never throw). Listener bound to signal for teardown. --
    if (typeof window.matchMedia === 'function') {
        const mq = window.matchMedia('(resolution: ' + dpr + 'dppx)');
        mq.addEventListener('change', () => {
            const nd = window.devicePixelRatio || 1;
            dpr = nd;
            canvas.width = cw * nd;
            canvas.height = ch * nd;
            ctx.setTransform(nd, 0, 0, nd, 0, 0);
            state.dpr = nd;
        }, { signal });
    }

    // -- Render loop (shared ticker) --
    const ticker = acquireTicker();
    tickerAcquired = true;
    let destroyed = false;
    let quarantined = false;  // a recipe.tick throw quarantines only this one

    removeTick = ticker.add((dtMs) => {
        if (destroyed || quarantined) return;
        const dt = dtMs / 1000;
        const now = performance.now();

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(padding, padding); // Origin = native element's top-left
        try {
            recipe.tick(ctx, dt, now, state, pointer);
        } catch (err) {
            // U-02B: contain the throw. The shared Ticker never sees it, so its
            // RAF reschedules and every other component keeps running.
            quarantined = true;
            console.error('mountUIFX: recipe.tick threw for type "' + type + '"; component quarantined', err);
            ctx.restore();
            ctx.clearRect(0, 0, cw, ch);
            return;
        }
        ctx.restore();
    });

    // -- Public API --
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
            if (type === UIType.SLIDER) releaseSliderStyle();
            wrapper.remove();
        },
    };
    } catch (err) {
        // A step in phase 2 threw (realistically recipe.init -- user code).
        // Unwind ONLY what was actually acquired, in reverse acquisition order,
        // each guarded by its flag so an early throw (e.g. at init, before ac /
        // ticker exist) never releases a ticker or aborts an ac that was never
        // created. recipe.destroy() is deliberately NOT called: init did not
        // succeed, so there is no initialised recipe to tear down.
        if (tickerAcquired) {
            if (removeTick) removeTick();
            releaseTicker();
        }
        if (acCreated) ac.abort();
        if (wrapperAppended) wrapper.remove();
        if (styleAcquired) releaseSliderStyle();
        // Re-throw the ORIGINAL error, preserved verbatim (never wrapped).
        throw err;
    }
}

export default mountUIFX;
