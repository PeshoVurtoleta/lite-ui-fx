// test/torture/t0-lifecycle.mjs
// Mount/destroy lifecycle. Two batches:
//   1. Synthetic: one counting recipe per UIType. Asserts destroy idempotent,
//      recipe.destroy called exactly once, wrapper removed, RAF pending -> 0, and
//      document.head childCount delta ZERO (U-09 slider style shared+refcounted).
//   2. Meta-driven: EVERY built-in recipe, mounted as its declared meta.type by
//      iterating RECIPE_META. Each is EXERCISED (frames stepped through the
//      Ctx2DStub with state varied) then destroyed. Same lifecycle asserts per
//      recipe; the whole batch nets ZERO into document.head.
//
// Lifecycle + robustness only. Real recipes are known non-zero-GC (U-03, fixed in
// U3); they are NEVER put through the gc/alloc gate here -- that lives on the noop
// smoke in torture.mjs. Never widen a budget; this tier does not measure alloc.

import assert from 'node:assert/strict';
import {
    mountUIFX, decorateUIFX, mountUIFXGroup, UIType, GROUP_TYPES, groupItems,
    makeContainer, headChildCount, raf,
    RECIPES, RECIPE_META,
} from './harness.mjs';

// Step the shared ticker a bounded number of frames, monotonic timestamps so the
// Ticker's dt stays in-range. Zero allocation in the loop body.
function pump(frames) {
    let t = performance.now();
    for (let i = 0; i < frames; i++) { t += 16; raf.step(t); }
}

export async function runT0() {
    const container = makeContainer();

    // -- Batch 1: synthetic counting recipe per UIType (kept from U1; U4a adds
    //    CHECKBOX/PROGRESS/KNOB so lifecycle + the U-09 style refcount cover the
    //    new native elements too). --------
    const types = [UIType.BUTTON, UIType.TOGGLE, UIType.SLIDER, UIType.CHECKBOX, UIType.PROGRESS, UIType.KNOB];
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

    // -- Batch 2: EVERY built-in recipe, driven by RECIPE_META ---------------
    const metaHeadBefore = headChildCount();
    let mounted = 0;

    for (const m of RECIPE_META) {
        const base = RECIPES[m.id];
        assert.equal(typeof base, 'function', m.id + ' has a factory in RECIPES');

        // Spy on the recipe's own destroy WITHOUT introducing an unknown hook key
        // (the controller rejects any function-valued own key not in KNOWN_HOOKS).
        // We only reassign destroy when the recipe already has one.
        let destroyCount = 0;
        let hadDestroy = false;
        const factory = () => {
            const r = base();
            if (typeof r.destroy === 'function') {
                hadDestroy = true;
                const orig = r.destroy;
                r.destroy = function () { destroyCount++; return orig.call(this); };
            }
            return r;
        };

        // Decorate DOM-diff tier (U4b): a decoration mounts AROUND a live host via
        // decorateUIFX (not mountUIFX, which rejects 'decorate'). Assert the host is
        // byte-identical before and after (no style write, no attribute, no
        // reparent) and the overlay is added as a sibling then fully removed.
        if (m.type === 'decorate') {
            const host = document.createElement('input');
            host.offsetWidth = 200; host.offsetHeight = 28;
            container.appendChild(host);
            const childrenBefore = container.children.length;   // host included
            const attrsBefore = host._attrs.size;
            const styleKeysBefore = Object.keys(host.style).length;

            const inst = decorateUIFX(host, factory);
            assert.equal(inst.el, host, m.id + ' decorate returns the host el');
            assert.equal(container.children.length, childrenBefore + 1, m.id + ' overlay added as a sibling');

            pump(4);
            inst.state.focused = true; inst.state.valid = false; inst.state.text = 'Ab7$k9';
            pump(4);
            inst.state.valid = true; inst.state.text = 'Ab7$k9mQ!';
            pump(2);

            inst.destroy();
            inst.destroy(); // idempotent
            if (hadDestroy) assert.equal(destroyCount, 1, m.id + ' recipe.destroy called exactly once');
            assert.equal(host.parentNode, container, m.id + ' host still in place after destroy');
            assert.equal(host._attrs.size, attrsBefore, m.id + ' host attributes untouched (additive-only)');
            assert.equal(Object.keys(host.style).length, styleKeysBefore, m.id + ' host style untouched');
            assert.equal(container.children.length, childrenBefore, m.id + ' overlay removed on destroy');
            assert.equal(raf.pending(), 0, m.id + ' raf pending returns to 0');
            container.removeChild(host);
            mounted++;
            continue;
        }

        // Group lifecycle tier (U7): a grouped control mounts N native elements +
        // one canvas via mountUIFXGroup. Exercise selection (setIndex) + focus/hover
        // draw paths, then assert a clean teardown (wrapper removed, RAF drained).
        if (GROUP_TYPES.has(m.type)) {
            const inst = mountUIFXGroup(container, m.type, factory, { items: groupItems(4) });
            assert.equal(container.children.length, 1, m.id + ' group wrapper mounted');
            assert.equal(inst.wrapper.parentNode, container, m.id + ' group wrapper in container');
            assert.equal(inst.els.length >= 1, true, m.id + ' group has native elements');
            pump(4);
            inst.setIndex(1); pump(2);
            inst.setIndex(3); inst.state.focused = true; inst.state.hover = true; pump(2);
            inst.state.focused = false; inst.state.hover = false; pump(2);
            inst.destroy();
            inst.destroy(); // idempotent
            if (hadDestroy) assert.equal(destroyCount, 1, m.id + ' recipe.destroy called exactly once');
            assert.equal(container.children.length, 0, m.id + ' group wrapper removed');
            assert.equal(raf.pending(), 0, m.id + ' raf pending returns to 0');
            mounted++;
            continue;
        }

        const inst = mountUIFX(container, m.type, factory);
        assert.equal(container.children.length, 1, m.id + ' wrapper mounted');
        assert.equal(inst.wrapper.parentNode, container, m.id + ' wrapper in container');

        // EXERCISE: run the recipe's draw paths through the Ctx2DStub with state
        // varied so both on/off and 0/1 branches execute. state is a live
        // reference the tick reads each frame.
        pump(4);
        inst.state.toggled = true; inst.state.val = 1; inst.state.hover = true;
        pump(4);
        inst.state.focused = true; inst.state.active = true;
        pump(2);
        inst.state.toggled = false; inst.state.val = 0;
        inst.state.hover = false; inst.state.active = false; inst.state.focused = false;
        pump(2);

        inst.destroy();
        inst.destroy(); // idempotent
        if (hadDestroy) {
            assert.equal(destroyCount, 1, m.id + ' recipe.destroy called exactly once');
        }
        assert.equal(container.children.length, 0, m.id + ' wrapper removed');
        assert.equal(raf.pending(), 0, m.id + ' raf pending returns to 0');
        mounted++;
    }

    const metaStyleDelta = headChildCount() - metaHeadBefore;
    assert.equal(metaStyleDelta, 0, 'meta batch nets ZERO into document.head');
    assert.equal(mounted, RECIPE_META.length, 'every RECIPE_META row mounted');
    assert.equal(mounted, 65, 'all 65 recipes exercised');

    return { styleDelta, mounted };
}
