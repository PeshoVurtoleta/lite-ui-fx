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
    installDom, setDpr, makeContainer, headChildCount,
    Ctx2DStub, EventStub, PointerEventStub, FocusEventStub,
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

const { mountUIFX, UIType } = await import('../../UIFXController.js');

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

function makeFrame(recipeFactory) {
    const ctx = new Ctx2DStub();
    const recipe = recipeFactory();
    const state = {
        hover: false, active: false, focused: false, toggled: false,
        val: 0.5, w: 160, h: 48, padding: 40, dpr: 1,
    };
    const pointer = { x: 4, y: 4, vx: 0, vy: 0 };
    const cw = state.w + 80, ch = state.h + 80, dpr = 1, padding = 40;
    if (recipe.init) recipe.init(ctx, state.w, state.h, padding);
    return function frame() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(padding, padding);
        recipe.tick(ctx, 0.016, 0, state, pointer);
        ctx.restore();
    };
}

async function gcGate(recipeFactory, { hot = 200000 } = {}) {
    const frame = makeFrame(recipeFactory);
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
function allocPerOp(recipeFactory) {
    const frame = makeFrame(recipeFactory);
    const res = measureOps(frame, { ops: 8192, warmup: 2048, stabilize: true });
    return res.bytesPerOp;
}

export {
    // stubs
    installDom, setDpr, makeContainer, headChildCount,
    Ctx2DStub, EventStub, PointerEventStub, FocusEventStub, raf,
    // controller
    mountUIFX, UIType,
    // signal
    createRoot, effect,
    // prng
    rnd, seed,
    // gates
    makeTracker, NOOP_CLEANUP, settle, gcGate, allocPerOp,
};
