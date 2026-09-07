// test/torture/t5-scale.mjs
// PARTIAL (U1). This tier fills two U1 invariants:
//   1. Single-RAF: N mixed-type components share ONE Ticker, so exactly ONE RAF
//      is ever pending regardless of component count (the raf-stub reflects the
//      one self-rescheduling loop -- pending() stays 1 while any component lives).
//   2. U-02 regression: one component's recipe.tick throws mid-soak; post-fix the
//      shared loop SURVIVES -- the throw is quarantined to that one component
//      (its per-tick counter freezes, exactly one console.error), every other
//      component keeps ticking, and the single RAF chain is undisturbed.
//
// LEFT FOR U3/U5: the scale-cost / per-frame allocation gate at N components
// (structural frame-alloc). U1 proves survival + single-RAF only; no alloc gate
// here yet. Do not widen any budget to stand this in for that work.

import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { mountUIFX, UIType, makeContainer, raf } from './harness.mjs';

const N = 100;
const BAD = 50;   // the component whose recipe throws mid-soak
const K = 5;      // frames the bad component survives before it throws
const FRAMES = K + 10;

const TYPES = [UIType.BUTTON, UIType.TOGGLE, UIType.SLIDER, UIType.CHECKBOX, UIType.PROGRESS, UIType.KNOB];

export async function runT5() {
    const container = makeContainer();

    // N live components legitimately hold N*2 window (scroll/resize) listeners on
    // the real EventTarget at once -- above Node's default cap of 10. Raise the
    // cap for THIS target so the expected scale does not emit a spurious
    // MaxListenersExceededWarning onto the torture stderr. Not a leak: every
    // listener is signal-bound and removed on destroy (proven by t4's kernel).
    if (globalThis.window) setMaxListeners(N * 4, globalThis.window);

    // Counting recipes: each increments a pre-allocated counter object (zero
    // per-frame allocation -- a mutation, not a literal). Component BAD throws
    // once its counter passes K, exercising the U-02B quarantine.
    const counters = new Array(N);
    const insts = new Array(N);
    for (let i = 0; i < N; i++) {
        const idx = i;
        const counter = { n: 0 };
        counters[idx] = counter;
        const factory = () => ({
            tick() {
                counter.n++;
                if (idx === BAD && counter.n > K) {
                    throw new Error('t5: component ' + idx + ' recipe.tick boom');
                }
            },
        });
        insts[idx] = mountUIFX(container, TYPES[idx % TYPES.length], factory);
    }

    // Single-RAF invariant: all N components ride ONE shared Ticker, so exactly
    // one RAF is pending -- not N. This is the true stub semantic: the Ticker
    // reschedules one raf on the last line of its tick, so pending() stays 1.
    assert.equal(raf.pending(), 1, 'N components -> exactly ONE shared RAF chain');

    // Capture console.error so the quarantine notice is COUNTED (not just seen)
    // and the torture stdout/stderr stay clean. Restored in finally.
    const origError = console.error;
    let errCount = 0;
    let errText = '';
    console.error = (...args) => { errCount++; errText = String(args[0]); };

    try {
        let t = 1000;
        for (let f = 0; f < FRAMES; f++) {
            t += 16;
            raf.step(t);
            // The shared loop must stay alive across the throw: one RAF pending
            // after every step, never a dead (0) or forked (>1) chain.
            assert.equal(raf.pending(), 1, 'shared RAF chain alive after step ' + f);
        }
    } finally {
        console.error = origError;
    }

    // Exactly one console.error, for the one quarantined component.
    assert.equal(errCount, 1, 'exactly ONE console.error for the quarantined component');
    assert.match(errText, /quarantined/, 'the notice names the quarantine');

    // The bad component froze at K+1 (the throwing tick ran, then the guard
    // short-circuits every later frame). Every other component kept advancing.
    assert.equal(counters[BAD].n, K + 1, 'component ' + BAD + ' frozen at K+1 (quarantined)');
    for (let i = 0; i < N; i++) {
        if (i === BAD) continue;
        assert.equal(counters[i].n, FRAMES, 'good component ' + i + ' kept ticking to ' + FRAMES);
    }
    assert.ok(counters[BAD].n < FRAMES, 'the quarantined component froze while the rest ran on');

    // Teardown: destroying every component returns the shared RAF chain to 0.
    for (let i = 0; i < N; i++) insts[i].destroy();
    assert.equal(raf.pending(), 0, 'shared RAF chain fully torn down after destroy');

    return { components: N, quarantined: BAD, errCount };
}
