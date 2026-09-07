// test/torture/t3-scan.mjs
// Standalone t3 scanner, spawned by t3-frame-alloc.mjs. It MUST run under a
// small V8 new space so transient per-frame allocation triggers frequent
// scavenges and the minor-GC count becomes a sensitive allocation detector
// (a runtime v8.setFlagsFromString('--max-semi-space-size') is ignored once the
// heap is up, so the size has to come from the launch flags):
//
//   node --max-semi-space-size=1 --expose-gc test/torture/t3-scan.mjs
//
// Prints ONE JSON line { rows: [{ id, type, major, minor, grad }] } to stdout
// and exits 0. Per recipe it runs the controller's per-frame body HOT times
// under a type-aware, zero-allocation churn driver (so spawn/cull pool paths
// run), reads the lite-gc-profiler GC counts, and separately proves the
// recording context sees zero in-tick gradient constructions.

import { Ctx2DStub, RECIPES, RECIPE_META, gcGate } from './harness.mjs';

const HOT = 150000;   // major-GC backstop depth (minor is reported, not gated)
const GRAD_FRAMES = 48;

function baseState() {
    return {
        hover: false, active: false, focused: false, toggled: false, indeterminate: false,
        val: 0.5, w: 160, h: 48, padding: 40, dpr: 1,
    };
}

// Mutate state in place and fire the type's interaction hook periodically. The
// driver allocates nothing itself, so any bytes the gate sees are the recipe's.
// U4a types: knob drives like a slider (onDrag + value sweep); checkbox like a
// toggle (onToggle) but also sweeps the indeterminate branch; progress sweeps
// value with NO hook (it is non-interactive -- value is set programmatically).
function makeChurn(type) {
    const valued = type === 'slider' || type === 'knob' || type === 'progress';
    const toggled = type === 'toggle' || type === 'checkbox';
    return function churn(recipe, st, ptr, i) {
        if ((i & 15) === 0) { st.hover = true; if (recipe.onHover) recipe.onHover(st, ptr); }
        else if ((i & 15) === 8) { st.hover = false; if (recipe.onLeave) recipe.onLeave(st, ptr); }
        st.focused = (i & 63) < 32;
        if (valued) {
            const v = (Math.sin(i * 0.06) + 1) * 0.5;
            ptr.vx = (v - st.val) * 60; st.val = v;
            if (type !== 'progress' && (i & 7) === 0 && recipe.onDrag) recipe.onDrag(st.val, ptr.vx, st);
        } else if (toggled) {
            st.indeterminate = type === 'checkbox' && (i & 31) < 8;  // exercise both branches
            if ((i & 15) === 0) { st.toggled = !st.toggled; if (recipe.onToggle) recipe.onToggle(st.toggled, st); }
        } else { // button
            if ((i & 11) === 0) { st.active = true; if (recipe.onClick) recipe.onClick(ptr.x, ptr.y, st); }
            else if ((i & 11) === 6) { st.active = false; }
        }
    };
}

// Count gradient constructions DURING tick (init excluded). The recording
// Ctx2DStub logs each createLinear/Radial/ConicGradient; a gradient built in a
// frame body is an unambiguous U-03 violation (build in init, reuse forever).
function gradientInTick(factory, driver) {
    const ctx = new Ctx2DStub();
    const recipe = factory();
    const st = baseState();
    const ptr = { x: 4, y: 4, vx: 0, vy: 0 };
    if (recipe.init) recipe.init(ctx, st.w, st.h, st.padding);
    ctx.record(true);
    for (let i = 0; i < GRAD_FRAMES; i++) {
        if (driver) driver(recipe, st, ptr, i);
        recipe.tick(ctx, 0.016, i * 16, st, ptr);
    }
    let n = 0;
    for (const e of ctx._log) {
        if (e === 'createLinearGradient' || e === 'createRadialGradient' || e === 'createConicGradient') n++;
    }
    ctx.record(false);
    return n;
}

// Total DISTINCT fill/stroke/shadow color strings a recipe assigns over a
// churned run. This measures the recipe CODE's string allocation directly (immune
// to the V8-internal scavenge noise), and -- unlike a novel-in-window-B delta --
// it does not care whether the values repeat deterministically:
//   - alpha via globalAlpha (const color)  -> 1 distinct color
//   - a bounded palette / precomputed LUT   -> a few dozen
//   - `rgba(...,${continuousFloat})` per frame -> hundreds (a new string per
//     frame, whether or not the float sequence repeats between windows)
// So a fixed budget cleanly separates the zero-alloc patterns from a per-frame
// color template, and a legitimate (const) LUT never trips it.
function colorDistinct(factory, driver) {
    const ctx = new Ctx2DStub();
    const recipe = factory();
    const st = baseState();
    const ptr = { x: 4, y: 4, vx: 0, vy: 0 };
    if (recipe.init) recipe.init(ctx, st.w, st.h, st.padding);
    ctx.record(true);
    const S = new Set();
    for (let i = 0; i < 240; i++) {
        if (driver) driver(recipe, st, ptr, i);
        ctx.clearLog();
        recipe.tick(ctx, 0.016, i * 16, st, ptr);
        const log = ctx._log;
        for (let k = 0; k < log.length; k++) {
            const e = log[k];
            if (e.startsWith('fillStyle=') || e.startsWith('strokeStyle=') || e.startsWith('shadowColor=')) {
                S.add(e);
            }
        }
    }
    ctx.record(false);
    return S.size;
}

// A themed mount (U3b): the recipe resolves theme/colors/text/font in init and
// the hot tick must STILL allocate nothing -- same structural budget under a
// non-default palette. Proves palette resolution stayed cold. The heavy 150k
// gcGate (pool/transient allocation) is unaffected by colour choice, so the
// themed variant runs only the cheap structural gates (gradient + colour count).
const THEME = {
    theme: { light: '#ff3366', mid: '#33aaff', dark: '#101018' },
    text: 'Xy', font: "600 12px 'JetBrains Mono',monospace",
};

const rows = [];
for (const m of RECIPE_META) {
    const factory = RECIPES[m.id];
    const themedFactory = () => RECIPES[m.id](THEME);
    const driver = makeChurn(m.type);
    const { summary } = await gcGate(factory, { hot: HOT, driver });
    rows.push({
        id: m.id, type: m.type,
        major: summary.gc.major, minor: summary.gc.minor,
        grad: gradientInTick(factory, driver),
        cdist: colorDistinct(factory, driver),
        tgrad: gradientInTick(themedFactory, driver),
        tcdist: colorDistinct(themedFactory, driver),
    });
}

// Positive control: a recipe that mints a fresh color string every frame MUST
// trip the gate (cdist explodes), proving t3 can fail and is not decorative.
rows.push({
    id: '__alloc_control__', type: 'button', major: 0, minor: 0, grad: 0,
    cdist: colorDistinct(
        () => ({ tick(c) { c.fillStyle = 'rgba(1,2,3,' + Math.random() + ')'; c.fillRect(0, 0, 1, 1); } }),
        makeChurn('button'),
    ),
});

process.stdout.write(JSON.stringify({ rows }) + '\n');
process.exit(0);
