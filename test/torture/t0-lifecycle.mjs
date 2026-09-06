// test/torture/t0-lifecycle.mjs
// Mount/destroy every UIType with a counting recipe. Assert: destroy idempotent,
// recipe.destroy called exactly once, wrapper removed, RAF pending returns to 0,
// and document.head childCount delta pinned at the CURRENT wrong value for
// sliders (KNOWN-U-09).

import assert from 'node:assert/strict';
import { mountUIFX, UIType, makeContainer, headChildCount, raf } from './harness.mjs';

export async function runT0() {
    const container = makeContainer();
    const types = [UIType.BUTTON, UIType.TOGGLE, UIType.SLIDER];
    const headBefore = headChildCount();
    let sliderMounts = 0;

    for (const type of types) {
        if (type === UIType.SLIDER) sliderMounts++;
        let destroyCount = 0;
        const inst = mountUIFX(container, type, () => ({
            tick() {},
            destroy() { destroyCount++; },
        }));
        assert.equal(container.children.length, 1, type + ' wrapper mounted');
        assert.equal(inst.wrapper.parentNode, container, type + ' wrapper in container');
        inst.destroy();
        inst.destroy(); // idempotent
        assert.equal(destroyCount, 1, type + ' recipe.destroy called exactly once');
        assert.equal(container.children.length, 0, type + ' wrapper removed');
        assert.equal(raf.pending(), 0, type + ' raf pending returns to 0');
    }

    const styleDelta = headChildCount() - headBefore;
    // KNOWN-U-09: every slider mount leaks one <style> into document.head that
    // destroy() never removes. Pinned EXACT at the current wrong value; this flips
    // to 0 in U1. Never a loose >= 0.
    assert.equal(styleDelta, sliderMounts, 'KNOWN-U-09 slider head-style leak');
    return { styleDelta };
}
