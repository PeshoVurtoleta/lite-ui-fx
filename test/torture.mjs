// test/torture.mjs -- node --expose-gc test/torture.mjs
//
// Entry runner. Runs the wired tiers sequentially (never nested measurements),
// prints one skip line per empty registered tier, and on all-green prints
// exactly "ok" to stdout and exits 0. Any tier failure prints the failing tier
// + seed to stderr and exits 1. The GATE diagnostic (leak + gc + alloc numbers)
// is written to stderr so stdout stays exactly "ok".
//
// TORTURE_CONTROL=alloc|listener|double-toggle|validation-bypass|
// decorate-host-mutation|fake-calm|ticker-ownership activates one
// deliberately-broken t9 control; that run
// MUST exit non-zero (the gate proving it can fail).
//
// Requires --expose-gc: the retention settle and the gc gate both need it.

if (typeof globalThis.gc !== 'function') {
    console.error('torture requires the V8 gc hook.');
    console.error('  run: node --expose-gc test/torture.mjs');
    process.exit(1);
}

const control = process.env.TORTURE_CONTROL;
const H = await import('./torture/harness.mjs');
const seed = H.seed();

// ---------------------------------------------------------------------------
//  Control path -- must exit non-zero
// ---------------------------------------------------------------------------

if (control) {
    const t9 = await import('./torture/t9-controls.mjs');

    if (control === 'alloc') {
        const r = await t9.runAllocControl();
        console.error('control=alloc gate-rejected=' + r.failed +
            ' gc major=' + r.summary.gc.major + ' minor=' + r.summary.gc.minor +
            ' maxMs=' + r.summary.gc.maxMs.toFixed(2));
        if (r.failed) {
            console.error('CONTROL alloc correctly FAILED its gate (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL alloc did NOT fail its gate -- gate is decorative');
        process.exit(2);
    }

    if (control === 'listener') {
        const r = await t9.runListenerControl();
        console.error('control=listener leaked=' + r.leaked +
            ' findings=' + r.findings + ' warnings=' + r.warns + ' leaks=' + r.leaks);
        if (r.leaked) {
            console.error('CONTROL listener correctly LEAKED (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL listener did NOT leak -- gate is decorative');
        process.exit(2);
    }

    if (control === 'double-toggle') {
        const r = await t9.runDoubleToggleControl();
        console.error('control=double-toggle gate-rejected=' + r.failed +
            ' onToggleCount=' + r.count);
        if (r.failed) {
            console.error('CONTROL double-toggle correctly FAILED the one-toggle gate (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL double-toggle did NOT fail its gate -- gate is decorative');
        process.exit(2);
    }

    if (control === 'validation-bypass') {
        const r = await t9.runValidationBypassControl();
        console.error('control=validation-bypass threw=' + r.failed +
            ' error=' + r.error);
        if (r.failed) {
            console.error('CONTROL validation-bypass correctly THREW at frame step (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL validation-bypass did NOT throw -- gate is decorative');
        process.exit(2);
    }

    if (control === 'decorate-host-mutation') {
        const r = await t9.runDecorateHostMutationControl();
        console.error('control=decorate-host-mutation host-mutated=' + r.failed +
            ' attrsDelta=' + r.attrsDelta);
        if (r.failed) {
            console.error('CONTROL decorate-host-mutation correctly MUTATED the host (t0 diff would fail) (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL decorate-host-mutation did NOT mutate the host -- gate is decorative');
        process.exit(2);
    }

    if (control === 'fake-calm') {
        const r = await t9.runFakeCalmControl();
        console.error('control=fake-calm moved-under-reduce=' + r.failed + ' distinctX=' + r.distinct);
        if (r.failed) {
            console.error('CONTROL fake-calm correctly MOVED under reduced motion (the reduce assertion would fail) (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL fake-calm stayed static -- the reduce gate is decorative');
        process.exit(2);
    }

    if (control === 'ticker-ownership') {
        const r = await t9.runTickerOwnershipControl();
        console.error('control=ticker-ownership caller-ticker-destroyed=' + r.failed);
        if (r.failed) {
            console.error('CONTROL ticker-ownership correctly DESTROYED the caller ticker (t5 ownership gate would fail) (exit 1)');
            process.exit(1);
        }
        console.error('CONTROL ticker-ownership left the caller ticker alive -- the ownership gate is decorative');
        process.exit(2);
    }

    console.error('unknown TORTURE_CONTROL: ' + control +
        ' (want alloc|listener|double-toggle|validation-bypass|decorate-host-mutation|fake-calm|ticker-ownership)');
    process.exit(1);
}

// ---------------------------------------------------------------------------
//  Normal path -- tiers in order, then skip lines, then GATE + "ok"
// ---------------------------------------------------------------------------

async function tier(name, fn) {
    try {
        return await fn();
    } catch (e) {
        console.error('FAIL tier=' + name + ' seed=' + seed);
        console.error('  ' + (e && e.stack ? e.stack : String(e)));
        process.exit(1);
    }
}

const { runT0 } = await import('./torture/t0-lifecycle.mjs');
const { runT1 } = await import('./torture/t1-degenerate.mjs');
const { runT2 } = await import('./torture/t2-a11y-contract.mjs');
const { runT3 } = await import('./torture/t3-frame-alloc.mjs');
const { runT4 } = await import('./torture/t4-soak.mjs');
const { runT5 } = await import('./torture/t5-scale.mjs');
const { runT6 } = await import('./torture/t6-headless-skins.mjs');

await tier('t0-lifecycle', runT0);
await tier('t1-degenerate', runT1);
await tier('t2-a11y-contract', runT2);
await tier('t3-frame-alloc', runT3);
const r4 = await tier('t4-soak', runT4);
await tier('t5-scale', runT5);
await tier('t6-headless-skins', runT6);

// t5 IS imported and executed above; it is partially filled, not skipped.
console.error('partial tier=t5-scale (U-02 regression + single-RAF + U5 host-clock ownership; scale-cost/alloc left)');

// GATE diagnostic. The gc/alloc numbers come from a zero-alloc no-op recipe
// smoke (a POSITIVE control: the gc + alloc gates wired and green on a hot path
// that allocates nothing). No real recipe is gated until U3 fills t3; this smoke
// only proves the machinery, and runs sequentially -- never nested with a tier.
const noop = () => ({ tick() {} });
const smoke = await tier('gc-smoke', async () => {
    const g = await H.gcGate(noop, { hot: 100000 });
    if (!g.report.ok) {
        throw new Error('gc gate not green on a zero-alloc no-op recipe: ' +
            g.report.violations.map((v) => v.metric + '=' + v.actual).join(','));
    }
    return { summary: g.summary, bytesPerOp: H.allocPerOp(noop) };
});

console.error('GATE leak=size ' + r4.live + '/0 findings=' + r4.findings +
    ' warnings=' + r4.warns +
    ' | gc major=' + smoke.summary.gc.major + ' minor=' + smoke.summary.gc.minor +
    ' maxMs=' + smoke.summary.gc.maxMs.toFixed(2) +
    ' | alloc=' + smoke.bytesPerOp + ' B/op');

console.log('ok');
process.exit(0);
