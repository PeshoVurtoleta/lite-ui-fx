// test/torture/t0-lifecycle.mjs
// Mount/destroy every UIType with a counting recipe. Assert: destroy idempotent,
// recipe.destroy called exactly once, wrapper removed, RAF pending returns to 0,
// and document.head childCount delta is ZERO -- the slider style is shared and
// refcounted (U-09 fixed), so mount+destroy nets nothing into document.head.

import assert from 'node:assert/strict';
import { mountUIFX, UIType, makeContainer, headChildCount, raf } from './harness.mjs';

export async function runT0() {
    const container = makeContainer();
    const types = [UIType.BUTTON, UIType.TOGGLE, UIType.SLIDER];
    const headBefore = headChildCount();

    for (const type of types) {
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
    // U-09 fixed: slider style shared + refcounted. acquireSliderStyle injects one
    // <style> on the first slider; releaseSliderStyle removes it when the last
    // slider is destroyed. Mount+destroy of every type nets EXACTLY zero into
    // document.head. Never a loose >= 0.
    assert.equal(styleDelta, 0, 'U-09 fixed: slider style shared+refcounted');
    return { styleDelta };
}
