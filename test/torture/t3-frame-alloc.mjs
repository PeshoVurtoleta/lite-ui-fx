// test/torture/t3-frame-alloc.mjs
// U3's executable form of U-03: every built-in recipe must run its per-frame
// body -- idle AND under interaction churn -- without allocating per frame.
//
// The measurement lives in t3-scan.mjs, spawned as a CHILD PROCESS under
// `--max-semi-space-size=1` (a small new space so what allocation there is shows
// up as scavenges). The child owns the launch flags, so this tier is correct
// under a plain `node --expose-gc test/torture.mjs` -- it never depends on how
// the parent was launched.
//
// Per recipe the gate is three signals, each measuring RECIPE-CODE allocation
// (not the V8-internal scavenge noise that pollutes a raw minor count):
//   major === 0        -- no heavy transient/pool allocation reaching a major GC
//   gradInTick === 0   -- every gradient built in init, none per frame
//   cdist <= COLOR_BUDGET -- total distinct fill/stroke color strings assigned
//                         over a churned run: alpha via globalAlpha is 1 color, a
//                         const LUT a few dozen, a `rgba(...,${x})` built per frame
//                         hundreds (a fresh string every frame). A legit const LUT
//                         never trips it.
// (minor is reported for context but NOT gated: it is dominated by V8-internal
// transients -- trig, inline-cache feedback under churn -- that are not recipe
// allocations. Per-frame value-label strings live below every automatable signal
// and are sworn off by the sweep + verified in review, not gated here.)
//
// Pre-U3 this tier FAILS by construction; it turns green family by family as the
// sweep lands, and the t9 alloc control must keep failing it afterwards.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const COLOR_BUDGET = 64;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCAN = path.join(HERE, 't3-scan.mjs');
const PKG_ROOT = path.resolve(HERE, '..', '..');

function runScan() {
    const res = spawnSync(
        process.execPath,
        ['--max-semi-space-size=1', '--expose-gc', SCAN],
        { encoding: 'utf8', cwd: PKG_ROOT, maxBuffer: 16 * 1024 * 1024 },
    );
    if (res.error) throw res.error;
    if (res.status !== 0) {
        throw new Error('t3 scan child exited ' + res.status + ': ' +
            String(res.stderr || '').slice(-1000));
    }
    const line = String(res.stdout || '').trim().split('\n').filter(Boolean).pop();
    if (!line) throw new Error('t3 scan child produced no JSON (stderr: ' +
        String(res.stderr || '').slice(-400) + ')');
    return JSON.parse(line).rows;
}

function judge(rows) {
    return rows.map((r) => ({
        ...r,
        // Real recipes must also pass the THEMED gate (tgrad/tcdist): palette
        // resolution stayed in init, the hot tick allocates nothing under a
        // non-default palette. The control row has no themed columns and is judged
        // on its (deliberately blown) default cdist alone.
        ok: r.major === 0 && r.grad === 0 && r.cdist <= COLOR_BUDGET &&
            (r.id.startsWith('__') || (r.tgrad === 0 && r.tcdist <= COLOR_BUDGET)),
    }));
}

// Diagnostic (never gates): prints the per-recipe table so the family sweeps can
// watch the green count climb. Run via
//   node -e "import('./test/torture/t3-frame-alloc.mjs').then(m=>m.reportT3())"
export function reportT3() {
    const rows = judge(runScan());
    for (const r of rows) {
        console.error(
            (r.ok ? 'PASS ' : 'FAIL ') + r.id.padEnd(20) +
            ' cdist=' + String(r.cdist).padStart(4) +
            ' tcdist=' + String(r.tcdist === undefined ? '-' : r.tcdist).padStart(4) +
            ' grad=' + r.grad + '/' + (r.tgrad === undefined ? '-' : r.tgrad) +
            ' major=' + r.major +
            ' (minor=' + r.minor + ')',
        );
    }
    const real = rows.filter((r) => !r.id.startsWith('__'));
    const controls = rows.filter((r) => r.id.startsWith('__'));
    const ctrlBad = controls.filter((r) => r.ok).length;
    console.error('t3 report: ' + real.filter((r) => r.ok).length + '/' + real.length +
        ' pass (color-distinct budget ' + COLOR_BUDGET + '); controls ' +
        (ctrlBad === 0 ? 'all failed (good)' : ctrlBad + ' PASSED (BAD)'));
    return rows;
}

export function runT3() {
    const rows = judge(runScan());
    const controls = rows.filter((r) => r.id.startsWith('__'));
    const real = rows.filter((r) => !r.id.startsWith('__'));
    // BOTH positive controls (scalar per-frame + group per-item) must FAIL, or the
    // gate is decorative (t9 principle). The group control proves the per-item hot
    // path of a grouped control is gated exactly like a scalar recipe's.
    assert.ok(controls.length >= 2, 't3 must ship both positive controls (scalar + group)');
    for (const ctrl of controls) {
        if (ctrl.ok) assert.fail('t3 positive control ' + ctrl.id + ' passed the gate -- t3-frame-alloc is decorative');
    }
    const fails = real.filter((r) => !r.ok);
    if (fails.length) {
        const detail = fails
            .map((r) => r.id + '[major=' + r.major + ' cdist=' + r.cdist + ' grad=' + r.grad +
                ' tcdist=' + r.tcdist + ' tgrad=' + r.tgrad + ']')
            .join('; ');
        assert.fail('t3 frame-alloc: ' + fails.length + '/' + real.length +
            ' recipes allocate on a hot frame -> ' + detail);
    }
    assert.equal(real.length, 57, 'all 57 recipes gated by t3');
    return { gated: real.length };
}
