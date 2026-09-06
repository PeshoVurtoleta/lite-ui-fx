// test/torture/t2-a11y-contract.mjs
// The U-01 executable accessibility contract. The native element is the single
// source of truth: one activation path, one onToggle per press. Driven through
// the T-H1 native-activation stub (ElementStub.click() flips a checkbox and
// fires change) and EventStub keydowns. onToggle is counted via a closure the
// recipe increments, never inferred from state.
//
// Frames never run here: the raf-stub is installed but no raf.step() is called,
// so { checked } / { value } are asserted strictly BEFORE frame 1.

import assert from 'node:assert/strict';
import { mountUIFX, UIType, makeContainer, EventStub, raf } from './harness.mjs';

function keydown(el, code) {
    el.dispatchEvent(Object.assign(new EventStub('keydown'), { code }));
}

export async function runT2() {
    const container = makeContainer();

    // ---- A1: one keydown{Space} + native el.click() -> exactly ONE onToggle ----
    // Space is a no-op in the controller (the browser natively activates a
    // checkbox on Space); el.click() IS that native activation. There must be no
    // second, controller-driven onToggle.
    {
        let toggles = 0;
        let lastVal = null;
        const inst = mountUIFX(container, UIType.TOGGLE, () => ({
            tick() {},
            onToggle(val) { toggles++; lastVal = val; },
        }));
        assert.equal(inst.state.toggled, false, 'A1: toggle starts unchecked');
        keydown(inst.el, 'Space');
        inst.el.click();
        assert.equal(toggles, 1, 'A1: Space + native click -> exactly one onToggle');
        assert.equal(inst.state.toggled, true, 'A1: state.toggled flipped once to true');
        assert.equal(lastVal, true, 'A1: onToggle received the flipped value');
        assert.equal(inst.el.checked, true, 'A1: native checkbox is the source of truth');
        inst.destroy();
    }

    // ---- A2: one keydown{Enter} -> exactly ONE onToggle (controller bridge) ----
    // Enter is not native for a checkbox; the controller routes it through the
    // SAME native activation (el.click()), so one press = one onToggle.
    {
        let toggles = 0;
        const inst = mountUIFX(container, UIType.TOGGLE, () => ({
            tick() {},
            onToggle() { toggles++; },
        }));
        keydown(inst.el, 'Enter');
        assert.equal(toggles, 1, 'A2: Enter bridged to native click -> exactly one onToggle');
        assert.equal(inst.state.toggled, true, 'A2: state.toggled flipped once');
        assert.equal(inst.el.checked, true, 'A2: native checkbox flipped once');
        inst.destroy();
    }

    // ---- focus/blur mirror state.focused ----
    {
        const inst = mountUIFX(container, UIType.TOGGLE, () => ({ tick() {} }));
        assert.equal(inst.state.focused, false, 'focused starts false');
        inst.el.dispatchEvent(new EventStub('focus'));
        assert.equal(inst.state.focused, true, 'focus sets state.focused');
        inst.el.dispatchEvent(new EventStub('blur'));
        assert.equal(inst.state.focused, false, 'blur clears state.focused');
        inst.destroy();
    }

    // ---- A9: { checked:true } lands in element AND state before frame 1 ----
    {
        const inst = mountUIFX(container, UIType.TOGGLE, () => ({ tick() {} }), { checked: true });
        assert.equal(inst.el.checked, true, 'A9: {checked:true} in element pre-frame');
        assert.equal(inst.state.toggled, true, 'A9: {checked:true} in state pre-frame');
        inst.destroy();
    }

    // ---- A9: slider { value:0.3 } lands in element AND state before frame 1 ----
    {
        const inst = mountUIFX(container, UIType.SLIDER, () => ({ tick() {} }), { value: 0.3 });
        assert.equal(inst.el.value, '30', 'A9: {value:0.3} -> el.value "30" pre-frame');
        assert.equal(inst.state.val, 0.3, 'A9: {value:0.3} -> state.val 0.3 pre-frame');
        inst.destroy();
    }

    assert.equal(raf.pending(), 0, 't2 raf pending returns to 0');
    return {};
}
