// test/torture/t9-controls.mjs
// The gate must be able to fail. Two deliberately-broken variants, each driven
// ONLY via env TORTURE_CONTROL and each producing a NON-ZERO process exit when
// active. When TORTURE_CONTROL is unset these controls DO NOT run (torture.mjs
// never imports this module on the normal path).
//
//   alloc    -- a steady-state mounted recipe whose tick allocates (and retains)
//               an object per frame. Stepped 200000 frames via the raf-stub under
//               a GcProfiler; checkNoGc({ maxMajor: 0, maxPauseMs: 4 }) MUST fail.
//   listener -- a recipe whose destroy() leaks a window listener. Churned under
//               the lite-leak tracker; audit()/warnings MUST report a leak.
//
// If a control does NOT trip its gate, the gate is decorative -- torture.mjs
// treats that as its own failure.

import {
    mountUIFX, UIType, makeContainer, raf, settle, makeTracker, NOOP_CLEANUP,
} from './harness.mjs';
import { GcProfiler, checkNoGc } from '@zakkster/lite-gc-profiler';

const HOT = 200000;
const LISTENER_K = 64;

// ---------------------------------------------------------------------------
//  alloc -- per-frame allocation the gc gate must catch
// ---------------------------------------------------------------------------

// Factory retains every per-frame object in a growing sink, so the allocations
// survive scavenge and promote to old space -- forcing a MAJOR collection the
// maxMajor:0 gate rejects. This is the U-03 defect class (object literals pushed
// per tick), kept as a control the gate must fail on.
function makeAllocRecipe() {
    const sink = [];
    return {
        tick(ctx, dt, now, state) {
            sink.push({ dt, now, v: state.val, pad: 'per-frame-object' });
        },
    };
}

export async function runAllocControl() {
    const container = makeContainer();
    const inst = mountUIFX(container, UIType.BUTTON, makeAllocRecipe);

    const gc = new GcProfiler().start();
    let t = performance.now();
    for (let i = 0; i < HOT; i++) {
        t += 16;
        raf.step(t);
        if ((i & 8191) === 0) gc.sampleHeap(performance.now(), process.memoryUsage().heapUsed);
    }
    await settle(50);
    const summary = gc.summary();
    gc.stop();
    inst.destroy();

    const report = checkNoGc(summary, { maxMajor: 0, maxPauseMs: 4 });
    // The control is correct when the gate REJECTS it.
    return { failed: !report.ok, report, summary };
}

// ---------------------------------------------------------------------------
//  listener -- a window listener destroy() never removes
// ---------------------------------------------------------------------------

// init() registers a window listener; there is no destroy() hook, so the
// listener survives teardown. Added OUTSIDE any owner -> the listener kernel
// emits a no-owner warning at set-time and audit() classifies it as an orphan.
// The listener closure is `() => {}`: it holds nothing (held-value contract).
function makeLeakyRecipe() {
    return {
        init() {
            window.addEventListener('resize', () => {});
        },
        tick() {},
    };
}

export async function runListenerControl() {
    const { tracker, sink } = makeTracker();
    const container = makeContainer();

    for (let i = 0; i < LISTENER_K; i++) {
        const inst = mountUIFX(container, UIType.BUTTON, makeLeakyRecipe);
        tracker.track(inst, NOOP_CLEANUP, 'leaky', { audit: true });
        inst.destroy();
    }

    globalThis.gc?.();
    await settle(50);

    const findings = tracker.audit();
    const leaked = findings.length > 0 || sink.warns.length > 0 || sink.leaks.length > 0;
    // The control is correct when the leak surfaces.
    return { leaked, findings: findings.length, warns: sink.warns.length, leaks: sink.leaks.length };
}
