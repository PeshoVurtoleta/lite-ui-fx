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
export const VERSION = '1.9.0';

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
//  HOST CLOCK + FRAME STATE (U5) -- shared by both mount modes
// ---------------------------------------------------------

// Frame budget (state.budget, 0..1): 1 when frames hit ~60fps, degrading as the
// frame delta grows so budget-aware recipes shed work BEFORE frames drop. A
// smoothed instantaneous ratio -- zero allocation (module consts + arithmetic on
// the dt the clock already provides; no extra clock read).
const _TARGET_DT = 1 / 60;    // seconds per frame at 60fps
const _BUDGET_SMOOTH = 0.1;   // EMA weight toward the instantaneous ratio

// prefers-reduced-motion query, created once at mount (cold). Returns null when
// matchMedia is absent -- fail closed: state.reducedMotion then stays false and
// every recipe renders its full-motion path, never throwing. The caller reads
// .matches into state BEFORE recipe.init, then wires the change listener once the
// AbortController exists (so teardown removes it). One helper, both mount modes.
function _reducedMotionQuery() {
    return (typeof window.matchMedia === 'function')
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
}

// instance.tick() outside { driven } mode. A shared module stub (not a per-mount
// closure) so a ticker-driven component allocates nothing for a member it fails
// closed on: a component that rides a ticker does not accept hand-driven frames.
function _drivenOnly() {
    throw new Error('tick(dtMs) is only callable in driven mode ({ driven: true }); this component rides a ticker');
}


// ---------------------------------------------------------
//  MOUNT-TIME VALIDATION (cold path only -- never a hot body)
// ---------------------------------------------------------

const KNOWN_HOOKS = ['init', 'tick', 'onHover', 'onLeave', 'onClick', 'onToggle', 'onDrag', 'destroy'];
const KNOWN_OPTIONS = ['width', 'height', 'padding', 'label', 'value', 'checked', 'disabled', 'seed', 'colors', 'theme', 'text', 'font', 'knobMode', 'announce', 'ticker', 'driven'];
const KNOB_MODES = ['rotate', 'vertical'];

// Options valid in decorate mode (decorateUIFX). A canvas AROUND a live element
// inherits the host's geometry (offset box) and value (read from el), so the
// hijack-only options (width/height/value/checked/disabled/knobMode/announce/
// label) are rejected here -- fail closed. The host-clock options (ticker/driven)
// ARE valid in decorate mode: a decoration wants host-clock control every bit as
// much as a hijack does. Cold: read only at mount.
const DECORATE_OPTIONS = ['padding', 'seed', 'colors', 'theme', 'text', 'font', 'ticker', 'driven'];

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
    CHECKBOX: 'checkbox',   // <input type=checkbox> WITHOUT role=switch (a check is not a switch)
    PROGRESS: 'progress',   // native <progress>, non-interactive, value driven programmatically
    KNOB: 'knob',           // <input type=range>, arrows native, canvas-side knobMode pointer map
});

// The valid mount types, derived once from UIType so the controller guard, the
// recipe registry, and the d.ts never drift apart. Cold: read only at mount.
const _KNOWN_TYPES = new Set(Object.values(UIType));


// ---------------------------------------------------------
//  GROUP TYPES (U7) -- N native elements, one canvas, one recipe
// ---------------------------------------------------------

// A grouped control is N native elements sharing ONE canvas and ONE recipe
// (decisions/0007). Unlike a UIType (one element) a GroupType routes to
// mountUIFXGroup, which lays out `count` items in a horizontal strip and gives
// the recipe a SoA view of them: state.index (selected), state.count, and the
// itemX/itemY/itemW/itemH Float32Array lanes. onSelect(index, state) is the
// ninth, group-only recipe hook (mountUIFX/decorateUIFX reject it -- fail closed).
/** @enum {string} */
export const GroupType = Object.freeze({
    RADIO: 'radio',      // fieldset + N <input type=radio>; native roving selection
    TABS: 'tabs',        // role=tablist + N role=tab buttons; roving tabindex + arrows
    STEPPER: 'stepper',  // one <input type=number> spinbutton; native Up/Down
    RATING: 'rating',    // radiogroup of N radios; native roving selection
});

// Valid group types, derived once from GroupType so the group mount guard and
// the recipe registry stay one source of truth (0003 pattern). Cold.
const _KNOWN_GROUP_TYPES = new Set(Object.values(GroupType));

// A group recipe accepts the eight existing hooks PLUS onSelect. onSelect is
// group-only: it is absent from KNOWN_HOOKS, so mountUIFX/decorateUIFX reject a
// recipe carrying it (fail closed), and it is present here so a group recipe may.
const KNOWN_GROUP_HOOKS = ['init', 'tick', 'onHover', 'onLeave', 'onClick', 'onToggle', 'onDrag', 'onSelect', 'destroy'];

// Options valid on a group mount. `items` (the per-item labels) is required; the
// initial selection is `index` (an integer, not the hijack float `value`). The
// hijack-only keys (value/checked/knobMode/announce) are absent -> did-you-mean.
const GROUP_OPTIONS = ['items', 'index', 'label', 'width', 'height', 'padding', 'disabled', 'seed', 'colors', 'theme', 'text', 'font', 'ticker', 'driven'];

// Per-group-type default item box [w, h]. The strip is `count` items wide for the
// multi-element types; STEPPER is a single spinbutton, so its pair is the whole
// control's default box (its `count` pips are drawn inside that width).
const _GROUP_ITEM_DEFAULT = {
    radio: [56, 56],
    tabs: [84, 38],
    rating: [40, 44],
    stepper: [132, 46],   // total box (single element), not per item
};

// Monotonic id for unique radio `name` grouping across concurrent mounts. Cold.
let _groupUid = 0;


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

    // 1b. type: exactly one of the known element types (UIType). An unknown or
    //     undefined type is an Error here, never a silent default to a button
    //     (fail closed -- the type selects the native element).
    if (!_KNOWN_TYPES.has(type)) {
        throw new Error('mountUIFX: type must be one of UIType.BUTTON, TOGGLE, SLIDER, CHECKBOX, PROGRESS, KNOB');
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
    const knobMode = options.knobMode || 'rotate';   // KNOB pointer map; validated below
    const announce = options.announce === true;       // PROGRESS aria-live; validated below

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

    // Host clock (U5, decisions/0005). Three mutually-exclusive modes, resolved
    // once here (cold): default -> the shared ref-counted ticker; { ticker } -> a
    // caller-supplied lite-ticker drives this component; { driven:true } -> no
    // ticker/RAF, the host calls instance.tick(dtMs). Both-passed, a non-boolean
    // driven, or a ticker missing .add() is an Error, never a silent pick.
    const callerTicker = options.ticker;
    if (options.driven !== undefined && typeof options.driven !== 'boolean') {
        throw new Error('mountUIFX: option "driven" must be a boolean');
    }
    const driven = options.driven === true;
    if (callerTicker !== undefined) {
        if (driven) {
            throw new Error('mountUIFX: options "ticker" and "driven" are mutually exclusive');
        }
        if (!callerTicker || typeof callerTicker.add !== 'function') {
            throw new Error('mountUIFX: option "ticker" must be a ticker with an .add(fn) method');
        }
    }

    // Type-scoped options (U4a). knobMode belongs only to a KNOB; announce only
    // to a PROGRESS. Presence on the wrong type is a mistake, not a silent
    // ignore (fail closed). Both validated here, before any element exists.
    if (options.knobMode !== undefined) {
        if (type !== UIType.KNOB) {
            throw new Error('mountUIFX: option "knobMode" is only valid for UIType.KNOB');
        }
        if (KNOB_MODES.indexOf(options.knobMode) === -1) {
            throw new Error('mountUIFX: option "knobMode" must be "rotate" or "vertical"');
        }
    }
    if (options.announce !== undefined) {
        if (type !== UIType.PROGRESS) {
            throw new Error('mountUIFX: option "announce" is only valid for UIType.PROGRESS');
        }
        if (typeof options.announce !== 'boolean') {
            throw new Error('mountUIFX: option "announce" must be a boolean');
        }
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
    // SLIDER/PROGRESS/KNOB share the 200x28 range geometry (so every vol.3
    // re-home renders byte-identical to its slider era); CHECKBOX shares the
    // 64x36 toggle geometry; BUTTON keeps 160x48.
    const _rangeLike = type === UIType.SLIDER || type === UIType.PROGRESS || type === UIType.KNOB;
    const w = width  || (type === UIType.BUTTON ? 160 : _rangeLike ? 200 : 64);
    const h = height || (type === UIType.BUTTON ? 48  : _rangeLike ? 28  : 36);
    let dpr = window.devicePixelRatio || 1;

    // -- Create native element (invisible, accessible, receives events) --
    let el;
    if (type === UIType.TOGGLE || type === UIType.CHECKBOX) {
        el = document.createElement('input');
        el.type = 'checkbox';
        // TOGGLE is a switch; CHECKBOX is a plain checkbox. A check is not a
        // switch -- U4a drops the role for CHECKBOX (the vol.3 mis-mount fix).
        if (type === UIType.TOGGLE) el.setAttribute('role', 'switch');
        el.checked = checked;  // coerced boolean; lands before frame 1
        if (label) el.setAttribute('aria-label', label);
    } else if (type === UIType.SLIDER || type === UIType.KNOB) {
        el = document.createElement('input');
        el.type = 'range';
        el.min = '0'; el.max = '100';
        el.value = value !== undefined ? String(value * 100) : '50';  // 0..1 -> 0..100
        if (label) el.setAttribute('aria-label', label);
    } else if (type === UIType.PROGRESS) {
        // Non-interactive: value is written programmatically (setValue) only,
        // and exposed to assistive tech by the native <progress> element.
        el = document.createElement('progress');
        el.max = 1;
        el.value = value !== undefined ? value : 0;  // 0..1
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
    if (type === UIType.SLIDER || type === UIType.KNOB) {
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

    // -- Optional aria-live announcer for PROGRESS (U4a). Opt-in via
    //    { announce: true }: a visually-hidden polite region that setValue
    //    updates at 10% steps. It lives in the wrapper, so wrapper.remove() in
    //    destroy() takes it with everything else -- no separate teardown. --
    let announceRegion = null;
    if (type === UIType.PROGRESS && announce) {
        announceRegion = document.createElement('span');
        announceRegion.setAttribute('aria-live', 'polite');
        Object.assign(announceRegion.style, {
            position: 'absolute', width: '1px', height: '1px',
            overflow: 'hidden', clipPath: 'inset(50%)',
            whiteSpace: 'nowrap', border: '0', padding: '0', margin: '-1px',
        });
        wrapper.appendChild(announceRegion);
    }
    let _lastAnnouncePct = -1;  // last announced 10% step (cold: only setValue writes)

    // prefers-reduced-motion query (U5): read its initial value into state below,
    // BEFORE recipe.init, so a recipe reading state.reducedMotion in init is right.
    const rmq = _reducedMotionQuery();

    // -- State (value/checked/disabled land here BEFORE frame 1) --
    const state = {
        hover: false,
        active: false,      // pointer is down
        focused: false,      // keyboard focus
        toggled: checked,   // coerced boolean; element + state AGREE
        indeterminate: false,  // CHECKBOX only; set via setValue(null)
        disabled,           // recipes can render a disabled look
        val: value !== undefined ? value : (type === UIType.SLIDER || type === UIType.KNOB ? 0.5 : 0),  // 0-1
        reducedMotion: rmq ? !!rmq.matches : false,  // U5: calm-path recipes honour it
        budget: 1,          // U5: 0..1 frame budget, updated in place per frame
        w, h, padding, dpr,
    };

    const pointer = { x: -999, y: -999, vx: 0, vy: 0 };
    // Cached bounding rect. Refreshed on pointerenter + scroll/resize (cold);
    // pointermove reads it with ZERO layout reads (U-11). null until the first
    // pointer event, then lazily filled once (see updatePointer).
    let rect = null;

    // Apply a numeric value to a valued control (SLIDER/KNOB/PROGRESS): reflect
    // it to the native element, update state, announce (PROGRESS), and fire
    // onDrag exactly once when asked. A programmatic el.value write fires NO
    // native 'input', so this explicit hook call is the only one -- no double
    // fire. Cold path (setValue + knob drag), never a per-frame body.
    function _applyVal(v, fireHook) {
        state.val = v;
        if (type === UIType.PROGRESS) {
            el.value = v;  // 0..1, native max=1
            if (announceRegion) {
                const pct = Math.round(v * 10) * 10;
                if (pct !== _lastAnnouncePct) {
                    _lastAnnouncePct = pct;
                    announceRegion.textContent = pct + '%';
                }
            }
        } else {
            el.value = String(v * 100);  // range 0..100
        }
        if (fireHook && recipe.onDrag) recipe.onDrag(v, pointer.vx, state);
    }

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

    // Toggle + checkbox events (both are a native <input type=checkbox>)
    if (type === UIType.TOGGLE || type === UIType.CHECKBOX) {
        el.addEventListener('change', () => {
            // A user interaction resolves any indeterminate state (native does
            // this too); keep state.indeterminate in agreement.
            state.indeterminate = false;
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

    // Slider + knob value events. A range input fires 'input' on native drag
    // (slider) AND on arrow keys (both) -- one path for keyboard on either type.
    if (type === UIType.SLIDER || type === UIType.KNOB) {
        el.addEventListener('input', () => {
            state.val = el.value / 100;
            if (recipe.onDrag) recipe.onDrag(state.val, pointer.vx, state);
        }, { signal });
    }

    // KNOB pointer remap (U4a). A range input maps value to horizontal thumb
    // position; a knob maps a rotational or vertical drag instead. Arrow keys
    // stay native (the 'input' handler above); for pointer we drive the value
    // ourselves and preventDefault the native jump-to-pointer, restoring focus
    // by hand. All cold: pointer handlers, no per-frame work.
    if (type === UIType.KNOB) {
        let knobActive = false;
        let knobStartVal = 0;
        let knobStartY = 0;
        el.addEventListener('pointerdown', (e) => {
            knobActive = true;
            knobStartVal = state.val;
            knobStartY = e.clientY;
            refreshRect();
            el.focus();
            e.preventDefault();  // suppress the range's native jump-to-pointer
            if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        }, { signal });
        el.addEventListener('pointermove', (e) => {
            if (!knobActive) return;
            let v;
            if (knobMode === 'vertical') {
                v = knobStartVal + (knobStartY - e.clientY) / 150;  // 150px = full sweep
            } else {
                const cx = rect ? rect.left + rect.width / 2 : e.clientX;
                const cy = rect ? rect.top + rect.height / 2 : e.clientY;
                let a = Math.atan2(e.clientY - cy, e.clientX - cx);  // -PI..PI
                a = (a + Math.PI * 2.5) % (Math.PI * 2);             // 0 at bottom, clockwise
                v = a / (Math.PI * 2);
            }
            if (v < 0) v = 0; else if (v > 1) v = 1;
            _applyVal(v, true);  // reflect + fire onDrag once
        }, { signal });
        el.addEventListener('pointerup', () => { knobActive = false; }, { signal });
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

    // -- Reduced-motion change watch (U5). Cold; through signal so destroy removes
    //    it. The initial value was already read into state above. --
    if (rmq) {
        rmq.addEventListener('change', () => { state.reducedMotion = !!rmq.matches; }, { signal });
    }

    // -- Render loop. The frame body is ONE named function so all three clock
    //    modes invoke the SAME code with no wrapper: default and { ticker } pass
    //    `frame` to a ticker's .add(); { driven } exposes it as instance.tick. --
    let destroyed = false;
    let quarantined = false;  // a recipe.tick throw quarantines only this one

    function frame(dtMs) {
        if (destroyed || quarantined) return;
        const dt = dtMs / 1000;
        const now = performance.now();

        // Frame budget (U5): update in place from the dt already in hand -- no
        // allocation, no extra clock read.
        if (dt > 0) {
            let inst = _TARGET_DT / dt;
            if (inst > 1) inst = 1; else if (inst < 0) inst = 0;
            state.budget += (inst - state.budget) * _BUDGET_SMOOTH;
        }

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
    }

    // Clock mode (validated cold in phase 1). Only the shared path acquires the
    // ref-counted ticker; { ticker } borrows the host's clock and must never
    // destroy it; { driven } schedules no RAF (the host calls instance.tick).
    if (driven) {
        // no ticker acquired; removeTick stays null
    } else if (callerTicker !== undefined) {
        removeTick = callerTicker.add(frame);
    } else {
        const ticker = acquireTicker();
        tickerAcquired = true;
        removeTick = ticker.add(frame);
    }

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

        /**
         * Drive one frame by hand (U5). Callable ONLY in { driven: true } mode:
         * it IS the internal frame body, so a driven host pays exactly the internal
         * per-frame cost (no wrapper). A ticker-driven component owns its own clock,
         * so its tick() fails closed.
         */
        tick: driven ? frame : _drivenOnly,

        /**
         * Programmatically set a valued control (SLIDER/KNOB/PROGRESS) to v in
         * [0,1]: updates the native element, state.val, any PROGRESS announcer,
         * and fires onDrag exactly once (a programmatic write emits no native
         * event, so there is no second fire). For a CHECKBOX, setValue(null)
         * sets the indeterminate state. Fail closed on wrong type / bad value.
         */
        setValue(v) {
            if (destroyed) return;
            if (type === UIType.CHECKBOX) {
                if (v === null) {
                    el.indeterminate = true;
                    state.indeterminate = true;
                    return;
                }
                throw new Error('setValue: a checkbox takes setChecked(bool), or setValue(null) for indeterminate');
            }
            if (type !== UIType.SLIDER && type !== UIType.KNOB && type !== UIType.PROGRESS) {
                throw new Error('setValue: only SLIDER, KNOB, and PROGRESS carry a numeric value');
            }
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
                throw new Error('setValue: v must be a number in [0,1]');
            }
            _applyVal(v, true);
        },

        /**
         * Programmatically set a TOGGLE/CHECKBOX checked state: updates the
         * native element, state.toggled, clears indeterminate, and fires
         * onToggle exactly once. Fail closed on the wrong type.
         */
        setChecked(b) {
            if (destroyed) return;
            if (type !== UIType.TOGGLE && type !== UIType.CHECKBOX) {
                throw new Error('setChecked: only TOGGLE and CHECKBOX carry a checked state');
            }
            const nb = !!b;
            el.indeterminate = false;
            el.checked = nb;
            state.indeterminate = false;
            state.toggled = nb;
            if (recipe.onToggle) recipe.onToggle(nb, state);
        },

        /** Destroy everything. Idempotent. */
        destroy() {
            if (destroyed) return;
            destroyed = true;
            ac.abort();
            if (removeTick) removeTick();        // shared OR caller ticker; null when driven
            if (recipe.destroy) recipe.destroy();
            if (tickerAcquired) releaseTicker();  // release ONLY the shared ticker we acquired -- never a caller's
            if (type === UIType.SLIDER || type === UIType.KNOB) releaseSliderStyle();
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
        if (removeTick) removeTick();          // shared OR caller ticker -- both must unwind
        if (tickerAcquired) releaseTicker();   // release ONLY the shared ticker we acquired
        if (acCreated) ac.abort();
        if (wrapperAppended) wrapper.remove();
        if (styleAcquired) releaseSliderStyle();
        // Re-throw the ORIGINAL error, preserved verbatim (never wrapped).
        throw err;
    }
}

// =========================================================
//  decorateUIFX -- The second mount mode (canvas AROUND a live element)
// =========================================================

/**
 * Decorate an EXISTING visible element with a canvas recipe, WITHOUT hijacking
 * it. Unlike mountUIFX this creates no native element, never sets opacity:0, and
 * never reparents `el`: it adds ONE absolutely-positioned overlay canvas as a
 * sibling in el.parentNode (placed from el's offset box) plus the listeners it
 * owns, and on destroy removes exactly those -- the host is byte-identical to
 * before. Recipe state is wired from el's own events; for a form-control host,
 * state.text and state.valid mirror el.value / el.validity (read at event time,
 * never per frame). This is the honest home for a decoration over a real input
 * (PasswordStrength, TypewriterField) and for generic form feedback (FocusHalo,
 * ErrorShake, SuccessBloom). See decisions/0004.
 *
 * @param {HTMLElement} el            The live element to decorate (stays visible).
 * @param {Function}    recipeFactory (options) => Recipe object
 * @param {Object}      [options]     padding, seed, colors, theme, text, font
 * @returns {{ el, canvas, state, setValue, setChecked, destroy }}
 */
export function decorateUIFX(el, recipeFactory, options = {}) {
    // =====================================================================
    //  PHASE 1 -- VALIDATION ONLY. No side effect until every check passes
    //  (fail closed, mirrors mountUIFX): no createElement, no insertBefore,
    //  no ticker acquire, no recipe.init.
    // =====================================================================

    // 1. el must be a live, attached DOM element -- we read its offset box and
    //    hang the overlay off its parent. A detached el has no parentNode to host
    //    the canvas: an Error, never a silent no-op.
    if (!el || typeof el.addEventListener !== 'function' ||
        typeof el.getBoundingClientRect !== 'function') {
        throw new Error('decorateUIFX: el must be a DOM element');
    }
    if (!el.parentNode || typeof el.parentNode.insertBefore !== 'function') {
        throw new Error('decorateUIFX: el must be attached to the DOM (no parentNode to host the overlay)');
    }

    // 2. options: decorate accepts a subset. A hijack-only key is a mistake, not a
    //    silent ignore; a truly unknown key gets a did-you-mean over the decorate
    //    set. Both fail closed, before any element exists.
    for (const k in options) {
        if (!Object.prototype.hasOwnProperty.call(options, k)) continue;
        if (DECORATE_OPTIONS.indexOf(k) === -1) {
            if (KNOWN_OPTIONS.indexOf(k) !== -1) {
                throw new Error('decorateUIFX: option "' + k + '" is not valid in decorate mode (hijack-only)');
            }
            throw new Error(_didYouMean('decorateUIFX: unknown option', k, DECORATE_OPTIONS));
        }
    }
    const padding = options.padding === undefined ? 40 : options.padding;

    // Theming options (decisions/0002): validated fail closed here, forwarded to
    // the recipe factory which resolves them in init. Cold mount code.
    const _theme = options.theme;
    if (_theme !== undefined) {
        if (_theme === null || typeof _theme !== 'object' ||
            typeof _theme.light !== 'string' || typeof _theme.mid !== 'string' ||
            typeof _theme.dark !== 'string' || Object.keys(_theme).length !== 3) {
            throw new Error('decorateUIFX: option "theme" must be { light, mid, dark } of color strings');
        }
    }
    const _colors = options.colors;
    if (_colors !== undefined &&
        (!Array.isArray(_colors) || _colors.some((c) => typeof c !== 'string'))) {
        throw new Error('decorateUIFX: option "colors" must be an array of color strings');
    }
    if (options.text !== undefined && typeof options.text !== 'string') {
        throw new Error('decorateUIFX: option "text" must be a string');
    }
    if (options.font !== undefined && typeof options.font !== 'string') {
        throw new Error('decorateUIFX: option "font" must be a string');
    }
    if (options.seed !== undefined &&
        (typeof options.seed !== 'number' || !Number.isFinite(options.seed))) {
        throw new Error('decorateUIFX: option "seed" must be a finite number');
    }

    // Host clock (U5, decisions/0005) -- same three modes as mountUIFX. A
    // decoration wants host-clock control every bit as much as a hijack does.
    const callerTicker = options.ticker;
    if (options.driven !== undefined && typeof options.driven !== 'boolean') {
        throw new Error('decorateUIFX: option "driven" must be a boolean');
    }
    const driven = options.driven === true;
    if (callerTicker !== undefined) {
        if (driven) {
            throw new Error('decorateUIFX: options "ticker" and "driven" are mutually exclusive');
        }
        if (!callerTicker || typeof callerTicker.add !== 'function') {
            throw new Error('decorateUIFX: option "ticker" must be a ticker with an .add(fn) method');
        }
    }

    // 3. recipeFactory + recipe object + hooks (same contract as mountUIFX).
    if (typeof recipeFactory !== 'function') {
        throw new Error('decorateUIFX: recipeFactory must be a function');
    }
    const recipe = recipeFactory(options);
    if (!recipe || typeof recipe !== 'object') {
        throw new Error('decorateUIFX: recipe must be an object');
    }
    if (typeof recipe.tick !== 'function') {
        throw new Error('decorateUIFX: recipe.tick must be a function');
    }
    for (const k in recipe) {
        if (!Object.prototype.hasOwnProperty.call(recipe, k)) continue;
        if (typeof recipe[k] === 'function' && KNOWN_HOOKS.indexOf(k) === -1) {
            throw new Error(_didYouMean('decorateUIFX: unknown recipe hook', k, KNOWN_HOOKS));
        }
    }

    // =====================================================================
    //  PHASE 2 -- SIDE EFFECTS (fail-closed unwind, mirrors mountUIFX). The
    //  only acquisitions are the overlay canvas, the AbortController, and the
    //  shared ticker -- unwound in reverse order on any throw.
    // =====================================================================
    let canvasAppended = false;
    let acCreated = false;
    let tickerAcquired = false;
    let canvas = null;
    let ac = null;
    let removeTick = null;

    try {
    // -- Placement from el's OFFSET box. Because the overlay is a SIBLING of el,
    //    they share an offsetParent, so offset-box coords land the canvas over el
    //    WITHOUT writing any style onto the parent (decision 2). Read once here,
    //    refreshed on resize only. --
    let ow = el.offsetWidth;
    let oh = el.offsetHeight;
    let dpr = window.devicePixelRatio || 1;
    let cw = ow + padding * 2;
    let ch = oh + padding * 2;

    canvas = document.createElement('canvas');
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    Object.assign(canvas.style, {
        position: 'absolute',
        left: (el.offsetLeft - padding) + 'px',
        top: (el.offsetTop - padding) + 'px',
        width: cw + 'px', height: ch + 'px',
        pointerEvents: 'none',
    });
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Insert the overlay right AFTER el: among auto-z siblings it paints on top,
    // and pointerEvents:none keeps el receiving every event. el is NOT touched --
    // no style write, no reparent (the whole point of decorate mode).
    el.parentNode.insertBefore(canvas, el.nextSibling);
    canvasAppended = true;

    // prefers-reduced-motion query (U5): initial value read into state below,
    // BEFORE recipe.init (same as mountUIFX).
    const rmq = _reducedMotionQuery();

    // -- State. Generic fields wire like hijack mode; text/valid mirror the host,
    //    read now at init (law: hook initial values from the element) and refreshed
    //    at event time only. --
    const state = {
        hover: false,
        active: false,
        focused: (typeof document !== 'undefined' && document.activeElement === el),
        text: (typeof el.value === 'string' ? el.value : ''),
        valid: (el.validity ? !!el.validity.valid : true),
        reducedMotion: rmq ? !!rmq.matches : false,  // U5: calm-path recipes honour it
        budget: 1,          // U5: 0..1 frame budget, updated in place per frame
        w: ow, h: oh, padding, dpr,
    };
    const pointer = { x: -999, y: -999, vx: 0, vy: 0 };
    // Cached rect for pointer math (U-11): filled lazily, refreshed on enter/
    // scroll/resize; pointermove does ZERO layout reads at steady state.
    let rect = null;

    // -- Initialize recipe (validated in phase 1). ctx exists now. --
    if (recipe.init) recipe.init(ctx, ow, oh, padding);

    // -- Events (all via AbortController: destroy()'s abort removes exactly what
    //    decorate added and nothing the host owned). --
    ac = new AbortController();
    acCreated = true;
    const signal = ac.signal;

    function updatePointer(e) {
        if (!rect) rect = el.getBoundingClientRect();
        const nx = e.clientX - rect.left;
        const ny = e.clientY - rect.top;
        pointer.vx = nx - pointer.x;
        pointer.vy = ny - pointer.y;
        pointer.x = nx;
        pointer.y = ny;
    }
    function refreshRect() { rect = el.getBoundingClientRect(); }
    // Reposition the overlay from the offset box after a layout change (cold path).
    // All layout READS are hoisted above the style WRITES: writing canvas.style
    // dirties layout, so reading el.offset* afterwards would force a synchronous
    // reflow. A decoration over live DOM is the one place this package can force
    // layout (see the U4b brief HOT PATH note), so keep read-before-write even here.
    function reposition() {
        const nw = el.offsetWidth;
        const nh = el.offsetHeight;
        const ol = el.offsetLeft;
        const ot = el.offsetTop;
        canvas.style.left = (ol - padding) + 'px';
        canvas.style.top = (ot - padding) + 'px';
        if (nw !== ow || nh !== oh) {
            ow = nw; oh = nh;
            cw = ow + padding * 2;
            ch = oh + padding * 2;
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
            canvas.style.width = cw + 'px';
            canvas.style.height = ch + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            state.w = ow; state.h = oh;
        }
    }

    window.addEventListener('scroll', refreshRect, { passive: true, signal });
    window.addEventListener('resize', () => { reposition(); refreshRect(); }, { passive: true, signal });

    el.addEventListener('pointermove', updatePointer, { signal });
    el.addEventListener('pointerenter', (e) => {
        state.hover = true;
        refreshRect();
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

    el.addEventListener('focus', () => { state.focused = true; }, { signal });
    el.addEventListener('blur', () => { state.focused = false; }, { signal });

    // Host content -> state, at EVENT time only (el.value getter allocates a
    // string; keep it off the frame path). A non-form host never fires these.
    function syncHostValue() {
        state.text = (typeof el.value === 'string' ? el.value : '');
        state.valid = (el.validity ? !!el.validity.valid : true);
    }
    el.addEventListener('input', syncHostValue, { signal });
    el.addEventListener('change', syncHostValue, { signal });
    el.addEventListener('invalid', () => { state.valid = false; }, { signal });

    // -- DPR re-read on display change (cold, feature-detected; absent matchMedia
    //    is a silent no-op -- fail closed, never throw). --
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

    // -- Reduced-motion change watch (U5). Cold; through signal. --
    if (rmq) {
        rmq.addEventListener('change', () => { state.reducedMotion = !!rmq.matches; }, { signal });
    }

    // -- Render loop. ONE named frame body; three clock modes invoke it with no
    //    wrapper (same as mountUIFX). Same quarantine-on-throw. --
    let destroyed = false;
    let quarantined = false;

    function frame(dtMs) {
        if (destroyed || quarantined) return;
        const dt = dtMs / 1000;
        const now = performance.now();

        // Frame budget (U5): update in place, no allocation.
        if (dt > 0) {
            let inst = _TARGET_DT / dt;
            if (inst > 1) inst = 1; else if (inst < 0) inst = 0;
            state.budget += (inst - state.budget) * _BUDGET_SMOOTH;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(padding, padding);  // Origin = the host element's top-left
        try {
            recipe.tick(ctx, dt, now, state, pointer);
        } catch (err) {
            quarantined = true;
            console.error('decorateUIFX: recipe.tick threw; decoration quarantined', err);
            ctx.restore();
            ctx.clearRect(0, 0, cw, ch);
            return;
        }
        ctx.restore();
    }

    // Clock mode (validated cold in phase 1). Shared ticker / caller ticker /
    // driven -- identical to mountUIFX.
    if (driven) {
        // no ticker acquired; removeTick stays null
    } else if (callerTicker !== undefined) {
        removeTick = callerTicker.add(frame);
    } else {
        const ticker = acquireTicker();
        tickerAcquired = true;
        removeTick = ticker.add(frame);
    }

    // -- Public API --
    return {
        /** The decorated host element (unchanged; provided for external reads). */
        el,

        /** The overlay canvas (for external styling). */
        canvas,

        /** Current state (read-only reference). */
        state,

        /**
         * Drive one frame by hand (U5). Callable ONLY in { driven: true } mode; it
         * IS the internal frame body. A ticker-driven decoration fails closed.
         */
        tick: driven ? frame : _drivenOnly,

        /**
         * Hijack-only. A decoration reflects the host; it does not own or push
         * into the host's value, so setValue/setChecked fail closed here (use the
         * host's own API to change it -- the decoration follows via its events).
         */
        setValue() {
            throw new Error('decorateUIFX: setValue is hijack-only; a decoration reflects the host, it does not drive it');
        },
        setChecked() {
            throw new Error('decorateUIFX: setChecked is hijack-only; a decoration reflects the host, it does not drive it');
        },

        /** Destroy: remove the overlay + every listener decorate added. Idempotent.
         *  The host element is byte-identical to before decorate (never touched). */
        destroy() {
            if (destroyed) return;
            destroyed = true;
            ac.abort();
            if (removeTick) removeTick();        // shared OR caller ticker; null when driven
            if (recipe.destroy) recipe.destroy();
            if (tickerAcquired) releaseTicker();  // release ONLY the shared ticker we acquired
            canvas.remove();  // the ONLY DOM node decorate added
        },
    };
    } catch (err) {
        // A phase-2 step threw (realistically recipe.init). Unwind ONLY what was
        // acquired, reverse order, each flag-guarded. recipe.destroy is NOT called
        // (init did not succeed). Re-throw the ORIGINAL error, unwrapped.
        if (removeTick) removeTick();          // shared OR caller ticker -- both must unwind
        if (tickerAcquired) releaseTicker();   // release ONLY the shared ticker we acquired
        if (acCreated) ac.abort();
        if (canvasAppended) canvas.remove();
        throw err;
    }
}

// =========================================================
//  mountUIFXGroup -- The third mount mode (N native elements, one canvas)
// =========================================================

/**
 * Mount a grouped control: N native elements (radios in a fieldset, tabs in a
 * tablist, a spinbutton, a rating radiogroup) sharing ONE canvas and one recipe
 * (decisions/0007). The native elements own selection + keyboard + a11y; the
 * canvas paints the group by reading state.index/state.count and the per-item
 * geometry lanes. Additive to mountUIFX/decorateUIFX -- neither is touched.
 *
 * @param {HTMLElement} container      Parent to mount into.
 * @param {string}      groupType      One of GroupType (radio|tabs|stepper|rating).
 * @param {Function}    recipeFactory  (options) => Recipe (may add onSelect).
 * @param {Object}      options        { items:string[] (>=2, required), index=0, ... }
 * @returns {{ els:HTMLElement[], canvas, wrapper, state, index, setIndex, tick, destroy }}
 */
export function mountUIFXGroup(container, groupType, recipeFactory, options = {}) {
    // =====================================================================
    //  PHASE 1 -- VALIDATION ONLY (fail closed; mirrors mountUIFX). No DOM,
    //  no ticker, no recipe.init until every check below has passed.
    // =====================================================================

    if (!container || typeof container.appendChild !== 'function') {
        throw new Error('mountUIFXGroup: container must be a DOM element');
    }
    if (!_KNOWN_GROUP_TYPES.has(groupType)) {
        throw new Error('mountUIFXGroup: groupType must be one of GroupType.RADIO, TABS, STEPPER, RATING');
    }
    for (const k in options) {
        if (!Object.prototype.hasOwnProperty.call(options, k)) continue;
        if (GROUP_OPTIONS.indexOf(k) === -1) {
            throw new Error(_didYouMean('mountUIFXGroup: unknown option', k, GROUP_OPTIONS));
        }
    }

    // items: the per-item labels. Required, an array of >=2 strings (a group of
    // one is not a group). Its length IS the item/step count. Fail closed.
    const items = options.items;
    if (!Array.isArray(items) || items.length < 2 || items.some((s) => typeof s !== 'string')) {
        throw new Error('mountUIFXGroup: option "items" must be an array of >=2 label strings');
    }
    const count = items.length;

    // index: the initial selection, an integer in [0, count-1] (default 0). This
    // is the group's value -- distinct from the hijack float "value" (fail closed).
    let initialIndex = options.index === undefined ? 0 : options.index;
    if (typeof initialIndex !== 'number' || !Number.isInteger(initialIndex) ||
        initialIndex < 0 || initialIndex >= count) {
        throw new Error('mountUIFXGroup: option "index" must be an integer in [0, items.length-1]');
    }

    const disabled = options.disabled === undefined ? false : !!options.disabled;
    const width = options.width;
    const height = options.height;
    const padding = options.padding === undefined ? 40 : options.padding;
    const label = options.label === undefined ? '' : options.label;

    // Theming options (0002), same validators as the other two mounts. Cold.
    const _theme = options.theme;
    if (_theme !== undefined) {
        if (_theme === null || typeof _theme !== 'object' ||
            typeof _theme.light !== 'string' || typeof _theme.mid !== 'string' ||
            typeof _theme.dark !== 'string' || Object.keys(_theme).length !== 3) {
            throw new Error('mountUIFXGroup: option "theme" must be { light, mid, dark } of color strings');
        }
    }
    const _colors = options.colors;
    if (_colors !== undefined &&
        (!Array.isArray(_colors) || _colors.some((c) => typeof c !== 'string'))) {
        throw new Error('mountUIFXGroup: option "colors" must be an array of color strings');
    }
    if (options.text !== undefined && typeof options.text !== 'string') {
        throw new Error('mountUIFXGroup: option "text" must be a string');
    }
    if (options.font !== undefined && typeof options.font !== 'string') {
        throw new Error('mountUIFXGroup: option "font" must be a string');
    }
    if (options.seed !== undefined &&
        (typeof options.seed !== 'number' || !Number.isFinite(options.seed))) {
        throw new Error('mountUIFXGroup: option "seed" must be a finite number');
    }

    // Host clock (U5, 0005) -- identical three modes as the other two mounts.
    const callerTicker = options.ticker;
    if (options.driven !== undefined && typeof options.driven !== 'boolean') {
        throw new Error('mountUIFXGroup: option "driven" must be a boolean');
    }
    const driven = options.driven === true;
    if (callerTicker !== undefined) {
        if (driven) {
            throw new Error('mountUIFXGroup: options "ticker" and "driven" are mutually exclusive');
        }
        if (!callerTicker || typeof callerTicker.add !== 'function') {
            throw new Error('mountUIFXGroup: option "ticker" must be a ticker with an .add(fn) method');
        }
    }

    if (typeof recipeFactory !== 'function') {
        throw new Error('mountUIFXGroup: recipeFactory must be a function');
    }
    const recipe = recipeFactory(options);
    if (!recipe || typeof recipe !== 'object') {
        throw new Error('mountUIFXGroup: recipe must be an object');
    }
    if (typeof recipe.tick !== 'function') {
        throw new Error('mountUIFXGroup: recipe.tick must be a function');
    }
    for (const k in recipe) {
        if (!Object.prototype.hasOwnProperty.call(recipe, k)) continue;
        if (typeof recipe[k] === 'function' && KNOWN_GROUP_HOOKS.indexOf(k) === -1) {
            throw new Error(_didYouMean('mountUIFXGroup: unknown recipe hook', k, KNOWN_GROUP_HOOKS));
        }
    }

    // =====================================================================
    //  PHASE 2 -- SIDE EFFECTS (fail-closed unwind, mirrors mountUIFX).
    // =====================================================================
    let wrapperAppended = false;
    let acCreated = false;
    let tickerAcquired = false;
    let wrapper = null;
    let ac = null;
    let removeTick = null;
    let _moveTab = null;   // TABS roving mover, shared with setIndex (not on state)

    try {
    // -- Geometry. A horizontal strip of `count` item slots. Multi-element types
    //    (radio/tabs/rating) size the strip = count * itemW; STEPPER is one
    //    spinbutton whose default box holds `count` pips. width/height override
    //    the total. All geometry is ARITHMETIC (no getBoundingClientRect): it
    //    works headless and forces ZERO reflow (better than the U-11 one-read). --
    const def = _GROUP_ITEM_DEFAULT[groupType];
    const _single = groupType === GroupType.STEPPER;
    const w = width  || (_single ? def[0] : def[0] * count);
    const h = height || def[1];
    let dpr = window.devicePixelRatio || 1;

    // Per-item geometry lanes, preallocated once (the recipe reads them by index;
    // zero per-frame allocation). Uniform slots: itemW = w/count across the strip.
    const iw = w / count;
    const itemX = new Float32Array(count);
    const itemY = new Float32Array(count);
    const itemW = new Float32Array(count);
    const itemH = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        itemX[i] = i * iw; itemY[i] = 0; itemW[i] = iw; itemH[i] = h;
    }

    // -- Build the native group. `root` holds the interactive elements; `els` is
    //    the array of them (radios/buttons, or the single number input). --
    const uid = _groupUid++;
    let root;
    const els = [];
    if (groupType === GroupType.RADIO || groupType === GroupType.RATING) {
        root = document.createElement('fieldset');
        root.setAttribute('role', 'radiogroup');
        if (label) root.setAttribute('aria-label', label);
        Object.assign(root.style, {
            position: 'relative', display: 'inline-block',
            width: `${w}px`, height: `${h}px`,
            margin: '0', padding: '0', border: 'none', minWidth: '0',
        });
        const name = 'uifx-group-' + uid;
        for (let i = 0; i < count; i++) {
            const r = document.createElement('input');
            r.type = 'radio';
            r.name = name;
            r.setAttribute('aria-label', items[i]);
            if (i === initialIndex) r.checked = true;
            if (disabled) r.disabled = true;
            Object.assign(r.style, {
                position: 'absolute', top: '0', left: `${itemX[i]}px`,
                width: `${itemW[i]}px`, height: `${h}px`,
                opacity: '0', margin: '0', cursor: 'pointer', zIndex: '2',
            });
            root.appendChild(r);
            els.push(r);
        }
    } else if (groupType === GroupType.TABS) {
        root = document.createElement('div');
        root.setAttribute('role', 'tablist');
        if (label) root.setAttribute('aria-label', label);
        Object.assign(root.style, {
            position: 'relative', display: 'inline-block',
            width: `${w}px`, height: `${h}px`,
        });
        for (let i = 0; i < count; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('role', 'tab');
            b.textContent = items[i];  // accessible name
            b.setAttribute('aria-selected', i === initialIndex ? 'true' : 'false');
            b.tabIndex = i === initialIndex ? 0 : -1;  // roving tabindex
            if (disabled) b.disabled = true;
            Object.assign(b.style, {
                position: 'absolute', top: '0', left: `${itemX[i]}px`,
                width: `${itemW[i]}px`, height: `${h}px`,
                opacity: '0', margin: '0', padding: '0', border: 'none',
                background: 'transparent', cursor: 'pointer', zIndex: '2',
                WebkitAppearance: 'none', appearance: 'none',
            });
            root.appendChild(b);
            els.push(b);
        }
    } else {  // STEPPER -- one spinbutton across the whole box; count pips drawn inside
        root = document.createElement('div');
        Object.assign(root.style, {
            position: 'relative', display: 'inline-block',
            width: `${w}px`, height: `${h}px`,
        });
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.max = String(count - 1);
        inp.step = '1';
        inp.value = String(initialIndex);
        if (label) inp.setAttribute('aria-label', label);
        if (disabled) inp.disabled = true;
        Object.assign(inp.style, {
            position: 'absolute', top: '0', left: '0',
            width: `${w}px`, height: `${h}px`,
            opacity: '0', margin: '0', padding: '0', border: 'none',
            background: 'transparent', cursor: 'pointer', zIndex: '2',
            WebkitAppearance: 'none', appearance: 'none',
        });
        root.appendChild(inp);
        els.push(inp);
    }

    // -- Canvas overlay (DPR-aware), sized to the strip + padding. --
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

    wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        position: 'relative', display: 'inline-block',
        width: `${w}px`, height: `${h}px`,
    });
    wrapper.appendChild(root);
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
    wrapperAppended = true;

    const rmq = _reducedMotionQuery();

    // -- State: a SUPERSET of the scalar per-frame state (every field present, so
    //    a single-element recipe never breaks) PLUS the group fields. The single-
    //    value fields (val/toggled/indeterminate) are neutral here; a group uses
    //    index/count. Geometry lanes are references (zero per-frame alloc). --
    const state = {
        hover: false,
        active: false,
        focused: false,
        toggled: false,       // scalar-superset neutral (a group has no single toggle)
        indeterminate: false, // scalar-superset neutral
        disabled,
        val: 0,               // scalar-superset neutral (a group uses index/count)
        reducedMotion: rmq ? !!rmq.matches : false,
        budget: 1,
        w, h, padding, dpr,
        // group fields:
        index: initialIndex,  // selected item (0..count-1)
        count,                // number of items/steps
        hoverIndex: -1,       // item under the pointer, -1 when none
        labels: items,        // the item label strings (reference; cold-set)
        itemX, itemY, itemW, itemH,  // per-item geometry lanes (Float32Array)
    };
    const pointer = { x: -999, y: -999, vx: 0, vy: 0 };

    if (recipe.init) recipe.init(ctx, w, h, padding);

    // -- Events (all via AbortController). --
    ac = new AbortController();
    acCreated = true;
    const signal = ac.signal;

    // Selection: set state.index, fire onSelect exactly once when asked. A
    // programmatic native write emits no native event, so setIndex's explicit
    // fire is the only one (no double fire) -- same discipline as setValue (U4a).
    function select(i, fireHook) {
        state.index = i;
        if (fireHook && recipe.onSelect) recipe.onSelect(i, state);
    }

    // Per-element hover -> hoverIndex, and group hover. Cold pointer handlers on
    // the native elements (canvas is pointerEvents:none). Zero layout reads.
    // Iterate els.length, NOT count: STEPPER is one native element for N steps.
    for (let i = 0; i < els.length; i++) {
        const idx = i;
        els[i].addEventListener('pointerenter', () => {
            state.hover = true; state.hoverIndex = idx;
            if (recipe.onHover) recipe.onHover(state, pointer);
        }, { signal });
        els[i].addEventListener('pointerleave', () => {
            state.hoverIndex = -1;
            if (recipe.onLeave) recipe.onLeave(state, pointer);
        }, { signal });
    }
    // Group focus tracking (focusin/out bubble; any element focused == focused).
    root.addEventListener('focusin', () => { state.focused = true; }, { signal });
    root.addEventListener('focusout', () => { state.focused = false; state.hover = false; }, { signal });

    // Per-type selection wiring.
    if (groupType === GroupType.RADIO || groupType === GroupType.RATING) {
        // Native radios: arrow keys move focus AND check the newly-focused radio,
        // firing 'change' on it (one change per move). Click checks + fires change.
        for (let i = 0; i < count; i++) {
            const idx = i;
            els[i].addEventListener('change', () => {
                if (els[idx].checked) select(idx, true);
            }, { signal });
        }
    } else if (groupType === GroupType.TABS) {
        // Hand-written APG roving tabindex: only the selected tab is tabbable;
        // Left/Right (+ Up/Down) and Home/End move selection + focus.
        _moveTab = function moveTab(i, focusIt) {
            for (let j = 0; j < count; j++) {
                els[j].tabIndex = j === i ? 0 : -1;
                els[j].setAttribute('aria-selected', j === i ? 'true' : 'false');
            }
            if (focusIt && els[i].focus) els[i].focus();
            select(i, true);
        };
        for (let i = 0; i < count; i++) {
            const idx = i;
            els[i].addEventListener('click', () => _moveTab(idx, true), { signal });
        }
        root.addEventListener('keydown', (e) => {
            let ni = state.index;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') ni = (state.index + 1) % count;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ni = (state.index - 1 + count) % count;
            else if (e.key === 'Home') ni = 0;
            else if (e.key === 'End') ni = count - 1;
            else return;
            e.preventDefault();
            _moveTab(ni, true);
        }, { signal });
    } else {  // STEPPER
        // Native spinbutton: ArrowUp/Down + typing fire 'input'. Read + clamp to
        // [0,count-1]; 'change' (blur) would double-fire, so listen 'input' only.
        els[0].addEventListener('input', () => {
            let v = parseInt(els[0].value, 10);
            if (!Number.isFinite(v)) return;         // mid-edit empty field: ignore
            if (v < 0) v = 0; else if (v > count - 1) v = count - 1;
            if (String(v) !== els[0].value) els[0].value = String(v);  // reflect the clamp
            select(v, true);
        }, { signal });
    }

    // -- DPR re-read on display change (cold; absent matchMedia is a silent
    //    no-op -- fail closed). --
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
    if (rmq) {
        rmq.addEventListener('change', () => { state.reducedMotion = !!rmq.matches; }, { signal });
    }

    // -- Render loop. ONE named frame body; three clock modes invoke it with no
    //    wrapper; same budget update + quarantine-on-throw as the other mounts. --
    let destroyed = false;
    let quarantined = false;

    function frame(dtMs) {
        if (destroyed || quarantined) return;
        const dt = dtMs / 1000;
        const now = performance.now();
        if (dt > 0) {
            let inst = _TARGET_DT / dt;
            if (inst > 1) inst = 1; else if (inst < 0) inst = 0;
            state.budget += (inst - state.budget) * _BUDGET_SMOOTH;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(padding, padding);  // Origin = the strip's top-left
        try {
            recipe.tick(ctx, dt, now, state, pointer);
        } catch (err) {
            quarantined = true;
            console.error('mountUIFXGroup: recipe.tick threw for groupType "' + groupType + '"; group quarantined', err);
            ctx.restore();
            ctx.clearRect(0, 0, cw, ch);
            return;
        }
        ctx.restore();
    }

    if (driven) {
        // no ticker acquired; removeTick stays null
    } else if (callerTicker !== undefined) {
        removeTick = callerTicker.add(frame);
    } else {
        const ticker = acquireTicker();
        tickerAcquired = true;
        removeTick = ticker.add(frame);
    }

    // -- Public API --
    return {
        /** The native interactive elements (radios / tabs, or the single spinbutton). */
        els,
        /** The overlay canvas. */
        canvas,
        /** The wrapper div. */
        wrapper,
        /** Current state (read-only reference; state.index is the live selection). */
        state,
        /** The selected index right now (convenience over state.index). */
        get index() { return state.index; },

        /** Drive one frame by hand (U5). Callable ONLY in { driven: true } mode. */
        tick: driven ? frame : _drivenOnly,

        /**
         * Programmatically select item i in [0, count-1]: updates the native
         * element(s), state.index, and fires onSelect exactly once (a programmatic
         * native write emits no native event, so no double fire). Does NOT steal
         * focus. Fail closed on a bad index.
         */
        setIndex(i) {
            if (destroyed) return;
            if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= count) {
                throw new Error('setIndex: i must be an integer in [0, count-1]');
            }
            if (groupType === GroupType.RADIO || groupType === GroupType.RATING) {
                els[i].checked = true;  // no native 'change' from a programmatic set
            } else if (groupType === GroupType.TABS) {
                _moveTab(i, false);  // roving update without focus; fires onSelect
                return;
            } else {  // STEPPER
                els[0].value = String(i);  // no native 'input' from a programmatic set
            }
            select(i, true);
        },

        /** Destroy everything. Idempotent. */
        destroy() {
            if (destroyed) return;
            destroyed = true;
            ac.abort();
            if (removeTick) removeTick();
            if (recipe.destroy) recipe.destroy();
            if (tickerAcquired) releaseTicker();
            wrapper.remove();
        },
    };
    } catch (err) {
        // A phase-2 step threw (realistically recipe.init). Unwind ONLY what was
        // acquired, reverse order, each flag-guarded. recipe.destroy is NOT called.
        if (removeTick) removeTick();
        if (tickerAcquired) releaseTicker();
        if (acCreated) ac.abort();
        if (wrapperAppended) wrapper.remove();
        throw err;
    }
}

export default mountUIFX;
