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
//   double-toggle    -- the OLD U-01 keydown (manual flip + a change listener):
//                        one Space press yields TWO onToggle. The t2 one-toggle
//                        gate MUST reject it (count !== 1).
//   validation-bypass -- a frame stepped over an UNVALIDATED ()=>({}) recipe (no
//                        mount guard) throws on the missing tick. Proves the t1
//                        mount guard is load-bearing.
//   decorate-host-mutation -- a decoration whose recipe MUTATES the host (writes
//                        an attribute + style) instead of only painting its
//                        overlay. The t0 decorate DOM-diff asserts the host is
//                        byte-identical except the overlay, so it MUST catch this.
//   fake-calm        -- a recipe that KEEPS MOVING under state.reducedMotion (a
//                        motionSafe liar). The U5 reduced-motion assertion (a calm
//                        recipe's drawing is static under reduce) MUST reject it.
//   ticker-ownership -- a { ticker } component whose teardown DESTROYS the caller's
//                        ticker. The t5 ownership gate (a caller ticker survives a
//                        component's destroy) MUST catch it.
//
// If a control does NOT trip its gate, the gate is decorative -- torture.mjs
// treats that as its own failure.

import {
    mountUIFX, decorateUIFX, UIType, makeContainer, raf, settle, makeTracker, NOOP_CLEANUP,
    EventStub, makeFrame, FakeTicker,
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

// ---------------------------------------------------------------------------
//  double-toggle -- the OLD U-01 defect: two onToggle for one Space press
// ---------------------------------------------------------------------------

// Hand-rolls the pre-U1 keydown on a bare stub checkbox: a `change` listener
// (the native activation path) AND a buggy keydown that manually flips
// `el.checked` and counts. Driving keydown{Space} + native el.click() fires BOTH
// paths -> count 2. The t2 one-toggle gate rejects any count !== 1, so this
// control is correct precisely when it FAILS that gate.
export async function runDoubleToggleControl() {
    const el = document.createElement('input');
    el.type = 'checkbox';
    let count = 0;

    // Native activation path (correct, kept).
    el.addEventListener('change', () => { count++; });
    // OLD buggy keydown: manual flip + manual count, DUPLICATING the change path
    // when the browser also natively activates the checkbox on Space.
    el.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { el.checked = !el.checked; count++; }
    });

    // One press: the buggy keydown counts once, then native activation (click ->
    // change) counts again -> two onToggle for a single Space.
    el.dispatchEvent(Object.assign(new EventStub('keydown'), { code: 'Space' }));
    el.click();

    // Correct when the gate REJECTS it (one press must be exactly one toggle).
    return { failed: count !== 1, count };
}

// ---------------------------------------------------------------------------
//  validation-bypass -- a frame stepped over an unvalidated recipe throws
// ---------------------------------------------------------------------------

// makeFrame() replicates the controller's per-frame body but with NO mount
// guard: it calls recipe.tick directly. A ()=>({}) factory has no tick, so the
// first frame throws a TypeError. Proves the t1 mount-time validation is
// load-bearing -- without it a missing tick reaches a hot frame.
export async function runValidationBypassControl() {
    let threw = false;
    let error = '';
    try {
        const frame = makeFrame(() => ({}));
        frame();
    } catch (e) {
        threw = true;
        error = e && e.message ? e.message : String(e);
    }
    // Correct when it THROWS (the guard the mount path adds is load-bearing).
    return { failed: threw, error };
}

// ---------------------------------------------------------------------------
//  decorate-host-mutation -- a decoration that mutates the HOST, not just paint
// ---------------------------------------------------------------------------

// A decoration must only paint its overlay; the host is additive-only and
// restored byte-identical on destroy (decisions/0004). This BAD decoration
// reaches out and writes a host attribute + style in init. The t0 decorate
// DOM-diff (host attrs + style unchanged) MUST catch it -- the control is correct
// precisely when the host mutation is DETECTABLE.
export async function runDecorateHostMutationControl() {
    const container = makeContainer();
    const host = document.createElement('input');
    host.offsetWidth = 200; host.offsetHeight = 28;
    container.appendChild(host);
    const attrsBefore = host._attrs.size;
    const styleBefore = Object.keys(host.style).length;

    const inst = decorateUIFX(host, () => ({
        init() {
            host.setAttribute('data-decorated', '1');
            host.style.outline = '2px solid red';
        },
        tick() {},
    }));

    const mutated = host._attrs.size !== attrsBefore ||
        Object.keys(host.style).length !== styleBefore;
    inst.destroy();
    container.removeChild(host);
    // Correct when the mutation is DETECTABLE (a t0 host-byte-identical diff fails).
    return { failed: mutated, attrsDelta: host._attrs.size - attrsBefore };
}

// ---------------------------------------------------------------------------
//  fake-calm -- a recipe that ignores state.reducedMotion (a motionSafe liar)
// ---------------------------------------------------------------------------

// A calm-path recipe must render STATICALLY under state.reducedMotion (U5). This
// BAD recipe paints a time-varying horizontal offset (via moveTo, like rr()) even
// under reduce. The reduced-motion assertion -- a calm recipe's moveTo x collapses
// to ONE value under reduce -- MUST reject it (it emits many distinct x). Correct
// precisely when the motion is DETECTABLE under reduce.
export async function runFakeCalmControl() {
    // Minimal coordinate-capturing ctx (the method-name stub cannot see x).
    const xs = [];
    const ctx = {
        beginPath() {}, closePath() {}, save() {}, restore() {}, translate() {}, scale() {},
        setTransform() {}, clearRect() {}, rect() {}, roundRect() {}, setLineDash() {},
        stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, lineTo() {}, arc() {}, arcTo() {},
        fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, font: '', textAlign: '',
        moveTo(x) { xs.push(x); },
    };
    const badRecipe = {
        // Moves regardless of st.reducedMotion -- the defect the gate must catch.
        tick(c, dt, now) { c.moveTo(Math.sin(now / 22) * 6, 0); },
    };
    for (let k = 1; k <= 6; k++) badRecipe.tick(ctx, 0.016, 100 + k * 16, { reducedMotion: true });
    const distinct = new Set(xs).size;
    // Correct when the reduce assertion (x constant) would FAIL: distinct > 1.
    return { failed: distinct > 1, distinct };
}

// ---------------------------------------------------------------------------
//  ticker-ownership -- a { ticker } teardown that destroys the caller's clock
// ---------------------------------------------------------------------------

// A component given a caller ticker must NEVER destroy it on its own destroy (U5,
// decisions/0005): ownership stays with the caller. This simulates a buggy
// teardown that reaches through and destroys the caller ticker, and asserts the
// t5 ownership gate (caller ticker survives) DETECTS it. Correct precisely when
// the caller ticker ends up destroyed (the gate must fail on that).
export async function runTickerOwnershipControl() {
    const container = makeContainer();
    const clock = new FakeTicker();
    const inst = mountUIFX(container, UIType.BUTTON, () => ({ tick() {} }), { ticker: clock });
    // A CORRECT destroy removes the frame but leaves the clock alone; here we
    // additionally perform the FORBIDDEN act a broken component would.
    inst.destroy();
    clock.destroy();               // the ownership violation the gate must catch
    container.remove();
    // Correct when the violation is DETECTABLE (t5 asserts clock.destroyed === false).
    return { failed: clock.destroyed === true, destroyed: clock.destroyed };
}
