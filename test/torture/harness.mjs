// test/torture/harness.mjs
// Shared torture machinery: DOM/RAF stubs, seeded PRNG, the lite-leak retention
// gate and the lite-gc-profiler allocation gate. Read ../LiteGCProfiler/llms.txt
// and ../LiteLeak/llms.txt -- their live surfaces win over any template.
//
// Two rules that bite (from the torture-harness law):
//   1. GC entries arrive asynchronously -- await a settle before summary().
//   2. lite-leak held-value contract: neither cleanup nor tag may close over the
//      tracked instance. Capture detached primitives only.

// window must be a real EventTarget so createListenerOrphanKernel's patch of
// EventTarget.prototype.addEventListener actually intercepts window listeners
// (the listener control's leak surface). Set BEFORE installDom keeps it.
if (!globalThis.window || typeof globalThis.window.addEventListener !== 'function') {
    const win = new EventTarget();
    win.devicePixelRatio = 1;
    globalThis.window = win;
}

import {
    installDom, setDpr, emitDpr, emitReducedMotion, makeContainer, headChildCount,
    Ctx2DStub, EventStub, PointerEventStub, FocusEventStub, FakeTicker,
} from '../harness/dom-stub.mjs';
import * as raf from '../harness/raf-stub.mjs';

import { GcProfiler, checkNoGc, measureOps } from '@zakkster/lite-gc-profiler';
import {
    createLeakTracker,
    createOwnerCascadeOrphanKernel,
    createTimerOrphanKernel,
    createListenerOrphanKernel,
} from '@zakkster/lite-leak';
import { createRoot, effect } from '@zakkster/lite-signal';

installDom();
raf.install();

const { mountUIFX, decorateUIFX, mountUIFXGroup, UIType, GroupType } = await import('../../UIFXController.js');
const { RECIPES, RECIPE_META } = await import('../../UIFXRecipes.js');

// U7 group types, derived once so the tiers dispatch a group meta.type to
// mountUIFXGroup (the way 'decorate' routes to decorateUIFX).
const GROUP_TYPES = new Set(Object.values(GroupType));
// Default item labels for a group of n (a strip of "0".."n-1"). Cold, test-only.
function groupItems(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = String(i); return a; }

// ---------------------------------------------------------------------------
//  Seeded xorshift PRNG (TORTURE_SEED override; print seed on failure)
// ---------------------------------------------------------------------------

const SEED = (process.env.TORTURE_SEED
    ? (parseInt(process.env.TORTURE_SEED, 10) >>> 0)
    : ((0x9e3779b9 ^ Date.now()) >>> 0)) || 1;
let _s = SEED >>> 0;
function rnd() {
    _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5; _s >>>= 0;
    return _s / 4294967296;
}
function seed() { return SEED; }

// ---------------------------------------------------------------------------
//  Leak tracker (owner-cascade + timer + listener kernels)
// ---------------------------------------------------------------------------

const NOOP_CLEANUP = () => {}; // module-level; never closes over any instance.

function makeTracker() {
    const sink = { leaks: [], warns: [] };
    const tracker = createLeakTracker({
        name: 'ui-fx-torture',
        onLeak: (r) => sink.leaks.push(r.kind + ':' + String(r.tag)),
        onWarning: (w) => sink.warns.push(w.kind + ':' + w.reason),
    });
    tracker.registerKernel(createOwnerCascadeOrphanKernel());
    // handleRaf:false -- the raf-stub owns requestAnimationFrame; warnOnNoOwner
    // false so the harness's own settle setTimeout stays silent.
    tracker.registerKernel(createTimerOrphanKernel({ handleRaf: false, warnOnNoOwner: false }));
    tracker.registerKernel(createListenerOrphanKernel({ warnOnNoOwner: true }));
    return { tracker, sink };
}

async function settle(ms = 60) { await new Promise((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
//  Phase-2 allocation gate: replicate the controller's per-frame body around a
//  recipe's tick, drive it HOT times, gate GC events. Zero harness allocation
//  in the loop body so the gate measures the recipe, not the scaffold.
// ---------------------------------------------------------------------------

function makeFrame(recipeFactory, driver, opts = {}) {
    const ctx = new Ctx2DStub();
    const recipe = recipeFactory();
    // Group geometry (U7): a strip of `gn` items across w=160, preallocated once
    // (cold). A group recipe reads index/count/itemX/itemW/labels; a scalar recipe
    // ignores them. So the synthetic state is the real per-frame SUPERSET.
    const gn = opts.groupCount || 5;
    const gItemX = new Float32Array(gn), gItemY = new Float32Array(gn);
    const gItemW = new Float32Array(gn), gItemH = new Float32Array(gn);
    const gLabels = new Array(gn);
    const giw = 160 / gn;
    for (let k = 0; k < gn; k++) { gItemX[k] = k * giw; gItemW[k] = giw; gItemH[k] = 48; gLabels[k] = String(k); }
    const state = {
        hover: false, active: false, focused: false, toggled: false, indeterminate: false,
        val: 0.5, w: 160, h: 48, padding: 40, dpr: 1,
        // Decorate-mode fields (U4b): a form-control host's value + validity.
        text: '', valid: true,
        // Host-clock fields (U5): reduced-motion flag + frame budget. Present so a
        // calm-path recipe reads a real boolean/number, never undefined.
        reducedMotion: false, budget: 1,
        // Group fields (U7): selection + count + geometry lanes + labels.
        index: 0, count: gn, hoverIndex: -1,
        labels: gLabels, itemX: gItemX, itemY: gItemY, itemW: gItemW, itemH: gItemH,
    };
    const pointer = { x: 4, y: 4, vx: 0, vy: 0 };
    const cw = state.w + 80, ch = state.h + 80, dpr = 1, padding = 40;
    if (recipe.init) recipe.init(ctx, state.w, state.h, padding);
    let i = 0;
    return function frame() {
        // Optional churn driver mutates state/pointer and fires interaction
        // hooks IN PLACE (zero allocation in the driver itself) so a recipe's
        // spawn/cull pool paths are measured by the gate, not just its idle
        // tick body. `now` advances so time-driven animation runs too.
        if (driver) driver(recipe, state, pointer, i);
        i = (i + 1) | 0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(padding, padding);
        recipe.tick(ctx, 0.016, i * 16, state, pointer);
        ctx.restore();
    };
}

async function gcGate(recipeFactory, { hot = 200000, driver = null, warm = 30000, groupCount } = {}) {
    const frame = makeFrame(recipeFactory, driver, { groupCount });
    // Warm up first: an aggressive churn driver flips state far faster than any
    // real interaction, which makes V8 deopt/reopt the tick and allocate during
    // that settling. Run (and discard) warm frames so the measured window is
    // steady-state -- what a shipped frame actually costs, not JIT transients.
    for (let i = 0; i < warm; i++) frame(i);
    if (typeof globalThis.gc === 'function') globalThis.gc();
    const gc = new GcProfiler().start();
    for (let i = 0; i < hot; i++) {
        frame(i);
        if ((i & 8191) === 0) gc.sampleHeap(performance.now(), process.memoryUsage().heapUsed);
    }
    await settle();
    const summary = gc.summary();
    gc.stop();
    const report = checkNoGc(summary, { maxMajor: 0, maxPauseMs: 4 });
    return { report, summary };
}

// Retention-based per-op bytes (stabilize:true -> requires --expose-gc). Reported
// in the GATE line; the pass/fail verdict is the gcGate above.
function allocPerOp(recipeFactory, driver = null) {
    const frame = makeFrame(recipeFactory, driver);
    const res = measureOps(frame, { ops: 8192, warmup: 2048, stabilize: true });
    return res.bytesPerOp;
}

export {
    // stubs
    installDom, setDpr, emitDpr, emitReducedMotion, makeContainer, headChildCount,
    Ctx2DStub, EventStub, PointerEventStub, FocusEventStub, FakeTicker, raf,
    // controller
    mountUIFX, decorateUIFX, mountUIFXGroup, UIType, GroupType, GROUP_TYPES, groupItems,
    // recipes registry (drives the meta-driven t0/t1 sweep over all 57)
    RECIPES, RECIPE_META,
    // signal
    createRoot, effect,
    // prng
    rnd, seed,
    // gates
    makeTracker, NOOP_CLEANUP, settle, gcGate, allocPerOp, makeFrame,
};
