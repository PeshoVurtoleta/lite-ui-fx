// test/harness/dom-stub.mjs
// Minimal DOM + recording canvas-2d stub so lite-ui-fx runs under node:test.
// Adapted from ../LiteAmbientFX/test/_helpers/dom-stub.mjs. Not jsdom. Zero deps.
// ASCII-only.
//
// Covers exactly what UIFXController.js and the 50 recipes touch:
//   document.createElement (div/button/input/canvas/style), appendChild/remove,
//   children tracking, document.head child tracking, el.style object,
//   setAttribute/getAttribute, classList, checkbox .checked + range .value,
//   addEventListener(type, fn, { signal }) honouring AbortSignal, dispatchEvent,
//   getBoundingClientRect() (zeros), canvas.getContext('2d') recording context.

// ---------------------------------------------------------------------------
//  Recording 2D context (records every call + property write into a flat log)
// ---------------------------------------------------------------------------

const _CTX_METHODS = [
    'scale', 'save', 'restore', 'clearRect', 'setTransform', 'resetTransform',
    'transform', 'translate', 'rotate', 'fillRect', 'strokeRect', 'beginPath',
    'arc', 'arcTo', 'ellipse', 'rect', 'fill', 'stroke', 'clip', 'fillText',
    'strokeText', 'setLineDash', 'drawImage', 'roundRect', 'moveTo', 'lineTo',
    'bezierCurveTo', 'quadraticCurveTo', 'closePath',
];

// String-valued context props live on a plain object; numeric props are backed
// by a Float64Array so writing a non-integer (globalAlpha 0.44, lineWidth 1.5)
// never boxes a HeapNumber. A stub that allocated on a numeric write would
// charge the recipe for the stub's OWN garbage under the t3 frame-alloc gate --
// exactly the zero-alloc pattern (const color + globalAlpha) recipes adopt in U3.
const _CTX_STR_PROPS = {
    fillStyle: '#000', strokeStyle: '#000', globalCompositeOperation: 'source-over',
    font: '', textAlign: '', textBaseline: '', shadowColor: '', lineCap: 'butt',
    lineJoin: 'miter',
};
const _CTX_NUM_PROPS = { lineWidth: 1, globalAlpha: 1, shadowBlur: 0, lineDashOffset: 0, miterLimit: 10 };
const _NUM_KEYS = Object.keys(_CTX_NUM_PROPS);

// Shared, non-allocating return stubs. A per-call allocation here would show up
// under the torture gc gate, so gradients/metrics are singletons.
const _gradStub = { addColorStop() {} };
const _metricsStub = { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 };

class Ctx2DStub {
    constructor() {
        // flat recording log; only written when _rec is true (structural tiers).
        this._log = [];
        this._rec = false;
        this._strs = Object.assign({}, _CTX_STR_PROPS);
        this._nums = new Float64Array(_NUM_KEYS.length);
        for (let i = 0; i < _NUM_KEYS.length; i++) this._nums[i] = _CTX_NUM_PROPS[_NUM_KEYS[i]];
    }
    createLinearGradient() { if (this._rec) this._log.push('createLinearGradient'); return _gradStub; }
    createRadialGradient() { if (this._rec) this._log.push('createRadialGradient'); return _gradStub; }
    createConicGradient() { if (this._rec) this._log.push('createConicGradient'); return _gradStub; }
    measureText() { if (this._rec) this._log.push('measureText'); return _metricsStub; }
    record(on) { this._rec = on !== false; }
    clearLog() { this._log.length = 0; }
}

for (const m of _CTX_METHODS) {
    Ctx2DStub.prototype[m] = function () { if (this._rec) this._log.push(m); };
}
for (const prop of Object.keys(_CTX_STR_PROPS)) {
    Object.defineProperty(Ctx2DStub.prototype, prop, {
        get() { return this._strs[prop]; },
        set(v) { this._strs[prop] = v; if (this._rec) this._log.push(prop + '=' + v); },
    });
}
for (let _ni = 0; _ni < _NUM_KEYS.length; _ni++) {
    const prop = _NUM_KEYS[_ni];
    const idx = _ni;
    Object.defineProperty(Ctx2DStub.prototype, prop, {
        get() { return this._nums[idx]; },
        set(v) { this._nums[idx] = v; if (this._rec) this._log.push(prop + '=' + v); },
    });
}

// ---------------------------------------------------------------------------
//  Element stubs
// ---------------------------------------------------------------------------

class ClassListStub {
    constructor() { this._s = new Set(); }
    add(c) { this._s.add(c); }
    remove(c) { this._s.delete(c); }
    contains(c) { return this._s.has(c); }
    toggle(c) {
        if (this._s.has(c)) { this._s.delete(c); return false; }
        this._s.add(c); return true;
    }
}

class ElementStub {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase();
        this.style = {};
        this.classList = new ClassListStub();
        this.textContent = '';
        this._attrs = new Map();
        this._children = [];
        this.parentNode = null;
        this._listeners = new Map(); // type -> Set<{ fn }>
    }
    setAttribute(k, v) { this._attrs.set(k, String(v)); }
    getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; }
    removeAttribute(k) { this._attrs.delete(k); }
    hasAttribute(k) { return this._attrs.has(k); }
    get children() { return this._children; }
    appendChild(child) { child.parentNode = this; this._children.push(child); return child; }
    removeChild(child) {
        const i = this._children.indexOf(child);
        if (i >= 0) this._children.splice(i, 1);
        child.parentNode = null;
        return child;
    }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    getBoundingClientRect() {
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    }
    // Native activation. Mirror the browser: a click event fires; a checkbox then
    // flips `.checked` and fires `change`. Setting `.checked` directly stays
    // event-free (assignment below is the sole flip; no event on plain writes).
    click() {
        this.dispatchEvent(new EventStub('click'));
        if (this.type === 'checkbox') {
            this.checked = !this.checked;
            this.dispatchEvent(new EventStub('change'));
        }
    }
    addEventListener(type, fn, opts) {
        if (typeof fn !== 'function') return;
        const signal = opts && opts.signal;
        if (signal && signal.aborted) return;
        let s = this._listeners.get(type);
        if (!s) { s = new Set(); this._listeners.set(type, s); }
        // Store the signal and check `aborted` lazily at dispatch time, rather
        // than wiring signal.addEventListener('abort', ...) onto the real Node
        // AbortSignal -- that would push the controller's teardown plumbing
        // through the patched EventTarget the torture listener-kernel watches.
        s.add({ fn, signal });
    }
    removeEventListener(type, fn) {
        const s = this._listeners.get(type);
        if (!s) return;
        for (const rec of s) if (rec.fn === fn) { s.delete(rec); break; }
    }
    dispatchEvent(ev) {
        ev.target = this;
        ev.currentTarget = this;
        const s = this._listeners.get(ev.type);
        if (s) for (const rec of [...s]) {
            if (rec.signal && rec.signal.aborted) { s.delete(rec); continue; }
            rec.fn.call(this, ev);
        }
        return true;
    }
    _listenerCount(type) {
        if (type === undefined) {
            let n = 0;
            for (const s of this._listeners.values()) n += s.size;
            return n;
        }
        const s = this._listeners.get(type);
        return s ? s.size : 0;
    }
}

class CanvasStub extends ElementStub {
    constructor() {
        super('canvas');
        this.width = 0;
        this.height = 0;
        this._ctx = null;
    }
    getContext() {
        if (!this._ctx) this._ctx = new Ctx2DStub();
        return this._ctx;
    }
}

// ---------------------------------------------------------------------------
//  Event stubs (Node lacks PointerEvent / FocusEvent; Event carries no clientX)
// ---------------------------------------------------------------------------

class EventStub {
    constructor(type, init) {
        this.type = type;
        this.target = null;
        this.currentTarget = null;
        if (init) Object.assign(this, init);
    }
    // No-op: node has no default action to suppress. Present so a defensive
    // preventDefault() in the controller cannot throw here.
    preventDefault() {}
}
class PointerEventStub extends EventStub {}
class FocusEventStub extends EventStub {}

// ---------------------------------------------------------------------------
//  Document / window
// ---------------------------------------------------------------------------

const _document = {
    head: new ElementStub('head'),
    body: new ElementStub('body'),
    createElement(tag) {
        if (tag === 'canvas') return new CanvasStub();
        return new ElementStub(tag);
    },
};

let _installed = false;

// Media-query objects created via window.matchMedia. emitDpr() drives them all
// so the controller's DPR re-read path is testable. Cold; never on a hot body.
const _mediaQueries = [];

function installDom({ dpr = 1 } = {}) {
    // window is an ElementStub so scroll/resize listeners (T6) and the DPR
    // watcher (T5) run through the same signal-honouring addEventListener the
    // controller relies on for AbortController-driven teardown.
    if (!globalThis.window) globalThis.window = new ElementStub('window');
    const win = globalThis.window;
    win.devicePixelRatio = dpr;
    win.matchMedia = function matchMedia(media) {
        const listeners = new Set();
        const mql = {
            matches: false,
            media,
            addEventListener(type, fn, opts) {
                if (typeof fn !== 'function') return;
                const signal = opts && opts.signal;
                if (signal && signal.aborted) return;
                const rec = { fn };
                listeners.add(rec);
                // Honour { signal }: on abort, actually DROP the listener so a
                // destroyed instance's change closure (which retains canvas/ctx/
                // state) is released immediately -- not held until the next
                // _emit. once:true self-removes the abort listener too, so this
                // adds no residual retention of its own (NIT 2).
                if (signal) {
                    signal.addEventListener('abort', () => { listeners.delete(rec); }, { once: true });
                }
            },
            removeEventListener(type, fn) {
                for (const rec of listeners) if (rec.fn === fn) { listeners.delete(rec); break; }
            },
            _emit(d) {
                win.devicePixelRatio = d;
                const ev = new EventStub('change');
                for (const rec of listeners) rec.fn.call(this, ev);
            },
        };
        _mediaQueries.push(mql);
        return mql;
    };
    globalThis.document = _document;
    globalThis.Event = EventStub;
    globalThis.PointerEvent = PointerEventStub;
    globalThis.FocusEvent = FocusEventStub;
    if (!globalThis.performance) {
        globalThis.performance = { now: () => Number(process.hrtime.bigint() / 1000000n) };
    }
    _installed = true;
}

function setDpr(n) {
    if (globalThis.window) globalThis.window.devicePixelRatio = n;
}

function makeContainer() {
    const el = new ElementStub('div');
    _document.body.appendChild(el);
    return el;
}

function headChildCount() { return _document.head.children.length; }

function isInstalled() { return _installed; }

// Fire a DPR change through every window.matchMedia() result (cold, test-only).
function emitDpr(n) { for (const mql of _mediaQueries) mql._emit(n); }

export {
    installDom,
    setDpr,
    emitDpr,
    makeContainer,
    headChildCount,
    isInstalled,
    ElementStub,
    CanvasStub,
    Ctx2DStub,
    EventStub,
    PointerEventStub,
    FocusEventStub,
};
