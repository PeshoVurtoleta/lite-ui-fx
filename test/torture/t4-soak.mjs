// test/torture/t4-soak.mjs
// Soak + retention: leak_cycles mount/interact/destroy cycles on BUTTON + TOGGLE
// under the lite-leak tracker. Each cycle mounts, steps a few raf frames,
// dispatches an interaction, destroys. Instances are tracked with DETACHED-
// primitive cleanups only: neither the cleanup closure (NOOP_CLEANUP, module
// level) nor the tag (a string) closes over the instance -- the lite-leak
// held-value contract. After the churn: gc + settle, then assert the tracker
// drains to 0 with zero orphan findings and stable head/body child counts.
//
// Sliders are EXCLUDED from the leak-gated loop (finding U-09 makes them fail by
// design until U1). One separate slider block pins the KNOWN wrong style-leak
// count EXACTLY -- never a loose >=.

import assert from 'node:assert/strict';
import {
    mountUIFX, UIType, makeContainer, headChildCount,
    raf, createRoot, effect, makeTracker, NOOP_CLEANUP, settle,
    EventStub, PointerEventStub,
} from './harness.mjs';

const CYCLES = 4096;
const SLIDER_K = 5;

// Recipe factory allocated fresh per mount; tick is a no-op so the soak measures
// controller lifecycle, not recipe work. No hooks -> the controller's optional
// hook guards short-circuit.
const makeRecipe = () => ({ tick() {} });

export async function runT4() {
    const { tracker, sink } = makeTracker();
    const container = makeContainer();
    const types = [UIType.BUTTON, UIType.TOGGLE];

    const headBefore = headChildCount();
    const bodyBefore = document.body.children.length;
    let t = performance.now();
    let heapSamples = 0;

    for (let i = 0; i < CYCLES; i++) {
        const type = types[i & 1];
        // createRoot detaches ownership and returns fn's value; effect() returns
        // its own dispose handle. Disposing it runs the auto-registered
        // onCleanup(untrack), draining the registration -- clean disposal is not
        // a leak, so a residual tracker.size() would be a real orphan.
        const stop = createRoot(() => effect(() => {
            const inst = mountUIFX(container, type, makeRecipe);
            // Detached-primitive contract: NOOP_CLEANUP holds nothing and the
            // tag is a bare string. Neither can pin `inst` past finalization.
            tracker.track(inst, NOOP_CLEANUP, 'uifx', { audit: true });

            t += 16; raf.step(t);
            t += 16; raf.step(t);

            if (type === UIType.TOGGLE) {
                inst.el.checked = true;
                inst.el.dispatchEvent(new EventStub('change'));
            } else {
                inst.el.dispatchEvent(new PointerEventStub('pointerdown', { clientX: 4, clientY: 4 }));
            }

            inst.destroy();
        }));
        stop();

        // Heap sampled ACROSS cycles (at the cycle boundary), never inside one:
        // keep the inner interaction free of the sampler's own allocation.
        if ((i & 1023) === 0) {
            globalThis.gc?.();
            heapSamples++;
        }
    }

    globalThis.gc?.();
    await settle(50);

    const live = tracker.size();
    const findings = tracker.audit();
    const headDelta = headChildCount() - headBefore;
    const bodyDelta = document.body.children.length - bodyBefore;

    // Assertion messages built only on failure.
    assert.equal(live, 0, () => 'tracker size ' + live + ' != 0 after churn');
    assert.equal(findings.length, 0, () => 'orphan findings: ' + findings.map((f) => f.kind).join(','));
    assert.equal(sink.leaks.length, 0, () => 'leaks: ' + sink.leaks.join(','));
    assert.equal(sink.warns.length, 0, () => 'warnings: ' + sink.warns.join(','));
    assert.equal(headDelta, 0, () => 'head childCount drifted by ' + headDelta + ' (BUTTON/TOGGLE add no <style>)');
    assert.equal(bodyDelta, 0, () => 'body childCount drifted by ' + bodyDelta);
    assert.equal(raf.pending(), 0, 't4 raf pending returns to 0');

    // -- Slider block (NOT leak-gated) -----------------------------------------
    // KNOWN-U-09: every slider mount appends a <style> to document.head that
    // destroy() never removes. Pin the wrong value EXACTLY at SLIDER_K; this
    // flips to 0 in U1. Never >= 0.
    const sHeadBefore = headChildCount();
    for (let i = 0; i < SLIDER_K; i++) {
        const s = mountUIFX(container, UIType.SLIDER, makeRecipe);
        s.destroy();
    }
    const sliderDelta = headChildCount() - sHeadBefore;
    assert.equal(sliderDelta, SLIDER_K, () => 'KNOWN-U-09 expected exactly ' + SLIDER_K + ' leaked <style>, got ' + sliderDelta);

    return {
        live,
        findings: findings.length,
        warns: sink.warns.length,
        leaks: sink.leaks.length,
        cycles: CYCLES,
        heapSamples,
        sliderDelta,
    };
}
