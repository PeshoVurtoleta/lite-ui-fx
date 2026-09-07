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
// U5 ADDS: the host-clock scale gate -- one CALLER ticker drives many components
// (hijack + decorate) with no shared RAF, ownership stays with the caller, and a
// driven component runs off no clock at all (the ownership gate the t9
// ticker-ownership control is calibrated against).
//
// LEFT FOR LATER: the scale-cost / per-frame allocation gate at N components
// (structural frame-alloc); per-recipe alloc is covered by t3. Do not widen any
// budget to stand this in for that work.

import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { mountUIFX, decorateUIFX, UIType, makeContainer, raf, FakeTicker } from './harness.mjs';

const N = 100;
const BAD = 50;   // the component whose recipe throws mid-soak
const K = 5;      // frames the bad component survives before it throws
const FRAMES = K + 10;

// Six native (hijack) types plus 'decorate' -- proving a decoration rides the
// SAME shared ticker / RAF chain and the same quarantine as a hijack mount. BAD
// (50 % 7 = 1) is a hijack TOGGLE, so the quarantine assertions stay uniform.
const MODES = [UIType.BUTTON, UIType.TOGGLE, UIType.SLIDER, UIType.CHECKBOX, UIType.PROGRESS, UIType.KNOB, 'decorate'];

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
        const mode = MODES[idx % MODES.length];
        if (mode === 'decorate') {
            const host = document.createElement('input');
            host.offsetWidth = 120; host.offsetHeight = 28;
            container.appendChild(host);
            insts[idx] = decorateUIFX(host, factory);
        } else {
            insts[idx] = mountUIFX(container, mode, factory);
        }
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

    // -------------------------------------------------------------------------
    //  U5 host-clock scale: one CALLER ticker drives many components (hijack +
    //  decorate) with NO shared RAF; ownership stays with the caller; a driven
    //  component runs off no clock at all. This is the t5 ownership gate that the
    //  t9 ticker-ownership control is calibrated against.
    // -------------------------------------------------------------------------
    const clock = new FakeTicker();
    const M = 40;
    const cinsts = new Array(M);
    const ccounts = new Array(M);
    for (let i = 0; i < M; i++) {
        const c = { n: 0 };
        ccounts[i] = c;
        const factory = () => ({ tick() { c.n++; } });
        const mode = MODES[i % MODES.length];
        if (mode === 'decorate') {
            const hostEl = document.createElement('input');
            hostEl.offsetWidth = 120; hostEl.offsetHeight = 28;
            container.appendChild(hostEl);
            cinsts[i] = decorateUIFX(hostEl, factory, { ticker: clock });
        } else {
            cinsts[i] = mountUIFX(container, mode, factory, { ticker: clock });
        }
    }
    // Borrowing a caller clock acquires NO shared ticker: the shared RAF stays 0.
    assert.equal(raf.pending(), 0, '{ ticker } components acquire no shared RAF');
    assert.equal(clock.size, M, 'all M components registered on the ONE caller ticker');

    // Deterministic drive: every hand tick advances every component exactly once.
    const CF = 12;
    for (let f = 0; f < CF; f++) clock.tick(16);
    for (let i = 0; i < M; i++) assert.equal(ccounts[i].n, CF, 'caller-ticked component ' + i + ' advanced deterministically');

    // Destroying every component removes it from the caller ticker but NEVER
    // destroys the caller's clock -- ownership stays with the caller (decisions/0005).
    for (let i = 0; i < M; i++) cinsts[i].destroy();
    assert.equal(clock.size, 0, 'destroy removed every component from the caller ticker');
    assert.equal(clock.destroyed, false, 'the caller ticker SURVIVES component teardown (ownership gate)');
    // A late tick on the (still-alive) caller clock advances nothing -- all removed.
    for (let i = 0; i < M; i++) { const before = ccounts[i].n; clock.tick(16); assert.equal(ccounts[i].n, before, 'no component ticks after its destroy'); }
    assert.equal(raf.pending(), 0, 'still no shared RAF after the caller-clock run');

    // Driven mode: no clock at all; the host hand-drives, deterministically + no RAF.
    const dcount = { n: 0 };
    const driven = mountUIFX(container, UIType.BUTTON, () => ({ tick() { dcount.n++; } }), { driven: true });
    assert.equal(raf.pending(), 0, 'driven mode schedules no RAF');
    for (let f = 0; f < CF; f++) driven.tick(16);
    assert.equal(dcount.n, CF, 'driven instance.tick advanced deterministically');
    driven.destroy();
    assert.equal(raf.pending(), 0, 'no shared RAF left by driven mode');

    return { components: N, quarantined: BAD, errCount, callerTicked: M, driven: CF };
}
