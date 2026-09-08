// test/torture/t6-headless-skins.mjs
// E1: every headless skin's per-frame body allocates nothing -- the structural
// frame-alloc gate from t3 (t3's deterministic signals), applied to the four skins.
// A skin is driven by a MutationObserver at EVENT time (skinHeadless calls read()
// per mutation); its tick reads only preallocated state, so the frame path must be
// zero-alloc exactly like a recipe's. Signals per skin, default AND themed:
//   grad === 0                -- no gradient built in tick (build in init, reuse)
//   cdist <= COLOR_BUDGET      -- distinct fill/stroke color strings over a churn
// These two are t3's DETERMINISTIC structural signals and directly measure the
// skin CODE's per-frame string/gradient allocation (the only allocation shapes a
// skin tick can produce -- there are no pools/arrays in a skin body). The 150k
// major-GC backstop is deliberately NOT run here: it needs lite-gc-profiler, and
// "one measurement at a time" (torture-harness law) means running it four times
// mid-run would perturb the GATE smoke's measureOps. A positive control -- a skin
// that mints a fresh color string per frame -- MUST trip the gate, so it is not
// decorative.

import assert from 'node:assert/strict';
import { Ctx2DStub, SKIN_META, HEADLESS_SKINS } from './harness.mjs';

const COLOR_BUDGET = 64;

const THEME = {
    theme: { light: '#ff3366', mid: '#33aaff', dark: '#101018' },
    text: 'Xy', font: "600 12px 'JetBrains Mono',monospace",
};

// The state skinHeadless preallocates + read() writes. Built once (cold).
function skinState() {
    return {
        hover: false, active: false, focused: false,
        val: 0.5, toggled: false, indeterminate: false, disabled: false,
        complete: false, error: false, count: 5,
        reducedMotion: false, budget: 1, w: 160, h: 48, padding: 40, dpr: 1,
    };
}

// Sweep every field a skin reads so BOTH branches of each skin sit inside the alloc
// window. The driver allocates nothing itself -- any bytes the gate sees are the
// skin's.
function skinChurn(st, i) {
    st.val = (Math.sin(i * 0.06) + 1) * 0.5;
    if ((i & 15) === 0) st.toggled = !st.toggled;
    st.active = (i & 31) < 8;
    st.focused = (i & 63) < 32;
    st.disabled = (i & 127) < 24;
    st.indeterminate = (i & 63) < 20;
    st.complete = (i & 255) > 200;
    st.count = 3 + (i & 3);   // 3..6 rating items
}

function gradInTick(factory) {
    const ctx = new Ctx2DStub();
    const r = factory();
    const st = skinState();
    const ptr = { x: 4, y: 4, vx: 0, vy: 0 };
    if (r.init) r.init(ctx, st.w, st.h, st.padding);
    ctx.record(true);
    for (let i = 0; i < 48; i++) { skinChurn(st, i); r.tick(ctx, 0.016, i * 16, st, ptr); }
    let n = 0;
    for (const e of ctx._log) {
        if (e === 'createLinearGradient' || e === 'createRadialGradient' || e === 'createConicGradient') n++;
    }
    ctx.record(false);
    return n;
}

function colorDistinct(factory) {
    const ctx = new Ctx2DStub();
    const r = factory();
    const st = skinState();
    const ptr = { x: 4, y: 4, vx: 0, vy: 0 };
    if (r.init) r.init(ctx, st.w, st.h, st.padding);
    ctx.record(true);
    const S = new Set();
    for (let i = 0; i < 240; i++) {
        skinChurn(st, i);
        ctx.clearLog();
        r.tick(ctx, 0.016, i * 16, st, ptr);
        const log = ctx._log;
        for (let k = 0; k < log.length; k++) {
            const e = log[k];
            if (e.startsWith('fillStyle=') || e.startsWith('strokeStyle=') || e.startsWith('shadowColor=')) S.add(e);
        }
    }
    ctx.record(false);
    return S.size;
}

export async function runT6() {
    assert.ok(SKIN_META.length >= 1, 't6 must gate at least one skin');
    for (const m of SKIN_META) {
        const factory = HEADLESS_SKINS[m.id];
        const themed = () => HEADLESS_SKINS[m.id](THEME);
        const grad = gradInTick(factory);
        const tgrad = gradInTick(themed);
        const cdist = colorDistinct(factory);
        const tcdist = colorDistinct(themed);
        assert.equal(grad, 0, 't6 skin ' + m.id + ' builds a gradient in tick');
        assert.equal(tgrad, 0, 't6 skin ' + m.id + ' builds a gradient in tick (themed)');
        assert.ok(cdist <= COLOR_BUDGET, 't6 skin ' + m.id + ' color-distinct ' + cdist + ' > ' + COLOR_BUDGET);
        assert.ok(tcdist <= COLOR_BUDGET, 't6 skin ' + m.id + ' themed color-distinct ' + tcdist + ' > ' + COLOR_BUDGET);
    }
    // Positive control: a skin minting a fresh color string per frame MUST trip the
    // color-distinct gate (t9 principle -- a gate that cannot fail is decorative).
    const ctrlCdist = colorDistinct(() => ({
        headless: { attrs: ['data-x'], read() {} },
        tick(c) { c.fillStyle = 'rgba(1,2,3,' + Math.random() + ')'; c.fillRect(0, 0, 1, 1); },
    }));
    assert.ok(ctrlCdist > COLOR_BUDGET,
        't6 positive control did NOT trip the gate -- t6 is decorative (cdist=' + ctrlCdist + ')');
    return { gated: SKIN_META.length };
}
