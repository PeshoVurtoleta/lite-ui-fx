// test/controller.test.mjs
// node:test port of the legacy vitest suite (UIFXController.test.js), 1:1.
// Every legacy assertion preserved; the 4 _tickAll tests re-expressed via the
// raf-stub; _clear() replaced by destroy discipline + a shared pending()===0
// afterEach (the module-scope shared ticker self-resets only at refcount 0).

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer } from './harness/dom-stub.mjs';
import * as raf from './harness/raf-stub.mjs';

installDom();
raf.install();

const { mountUIFX, UIType } = await import('../UIFXController.js');

function makeSpy(impl) {
    const fn = (...args) => { fn.calls.push(args); return impl ? impl(...args) : undefined; };
    fn.calls = [];
    return fn;
}

function recipe(overrides = {}) {
    return () => ({ tick: makeSpy(), ...overrides });
}

describe('mountUIFX', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => {
        ctr.remove();
        assert.equal(raf.pending(), 0, 'raf queue must drain to 0 after each test');
    });

    // -- Construction --

    it('wrapper has correct dimensions', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe(), { width: 200, height: 50 });
        assert.equal(i.wrapper.style.width, '200px');
        assert.equal(i.wrapper.style.height, '50px');
        i.destroy();
    });

    it('creates <button> for UIType.BUTTON', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(i.el.tagName, 'BUTTON');
        assert.equal(i.el.type, 'button');
        i.destroy();
    });

    it('creates checkbox for UIType.TOGGLE with role=switch', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        assert.equal(i.el.tagName, 'INPUT');
        assert.equal(i.el.type, 'checkbox');
        assert.equal(i.el.getAttribute('role'), 'switch');
        i.destroy();
    });

    it('creates range for UIType.SLIDER', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        assert.equal(i.el.tagName, 'INPUT');
        assert.equal(i.el.type, 'range');
        i.destroy();
    });

    it('sets aria-label', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe(), { label: 'Dark mode' });
        assert.equal(i.el.getAttribute('aria-label'), 'Dark mode');
        i.destroy();
    });

    it('native element is invisible', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(i.el.style.opacity, '0');
        i.destroy();
    });

    it('canvas blocks no pointer events', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(i.canvas.style.pointerEvents, 'none');
        i.destroy();
    });

    // -- Default dimensions --

    it('button defaults to 160x48', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(i.state.w, 160);
        assert.equal(i.state.h, 48);
        i.destroy();
    });

    it('toggle defaults to 64x36', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        assert.equal(i.state.w, 64);
        assert.equal(i.state.h, 36);
        i.destroy();
    });

    it('slider defaults to 200x28', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        assert.equal(i.state.w, 200);
        assert.equal(i.state.h, 28);
        i.destroy();
    });

    // -- Initial state --

    it('toggle state starts false', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        assert.equal(i.state.toggled, false);
        assert.equal(i.state.hover, false);
        assert.equal(i.state.active, false);
        assert.equal(i.state.focused, false);
        i.destroy();
    });

    it('slider val defaults to 0.5', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        assert.equal(i.state.val, 0.5);
        i.destroy();
    });

    it('button val defaults to 0', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(i.state.val, 0);
        i.destroy();
    });

    // -- DPR --

    it('canvas CSS size includes padding', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe(), { width: 100, height: 40, padding: 20 });
        assert.equal(i.canvas.style.width, '140px');
        assert.equal(i.canvas.style.height, '80px');
        i.destroy();
    });

    // -- Recipe lifecycle --

    it('calls recipe.init() on mount', () => {
        const init = makeSpy();
        mountUIFX(ctr, UIType.BUTTON, recipe({ init }), { width: 100, height: 40 }).destroy();
        assert.equal(init.calls.length, 1);
    });

    it('calls recipe.tick() each frame', () => {
        const tick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick }));
        let t = performance.now();
        raf.step(t += 16);
        assert.equal(tick.calls.length, 1);
        raf.step(t += 16);
        assert.equal(tick.calls.length, 2);
        i.destroy();
    });

    it('tick dt is in seconds', () => {
        const tick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick }));
        let t = performance.now();
        raf.step(t += 16);
        const dt = tick.calls[0][1];
        assert.ok(Math.abs(dt - 0.016) < 5e-3, 'dt ' + dt + ' not close to 0.016');
        i.destroy();
    });

    it('stops ticking after destroy', () => {
        const tick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick }));
        let t = performance.now();
        raf.step(t += 16);
        i.destroy();
        raf.step(t += 16);
        assert.equal(tick.calls.length, 1);
    });

    it('calls recipe.destroy() on destroy', () => {
        const destroy = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ destroy }));
        i.destroy();
        assert.equal(destroy.calls.length, 1);
    });

    it('destroy is idempotent', () => {
        const destroy = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ destroy }));
        i.destroy();
        i.destroy();
        assert.equal(destroy.calls.length, 1);
    });

    // -- Toggle events --

    it('toggle: change updates state.toggled', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        i.el.checked = true;
        i.el.dispatchEvent(new Event('change'));
        assert.equal(i.state.toggled, true);
        i.destroy();
    });

    it('toggle: calls recipe.onToggle', () => {
        const onToggle = makeSpy();
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe({ onToggle }));
        i.el.checked = true;
        i.el.dispatchEvent(new Event('change'));
        assert.deepEqual(onToggle.calls[0], [true, i.state]);
        i.destroy();
    });

    // -- Slider events --

    it('slider: input updates state.val', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        i.el.value = '75';
        i.el.dispatchEvent(new Event('input'));
        assert.equal(i.state.val, 0.75);
        i.destroy();
    });

    it('slider: calls recipe.onDrag', () => {
        const onDrag = makeSpy();
        const i = mountUIFX(ctr, UIType.SLIDER, recipe({ onDrag }));
        i.el.value = '30';
        i.el.dispatchEvent(new Event('input'));
        assert.equal(onDrag.calls[0][0], 0.3);
        assert.equal(typeof onDrag.calls[0][1], 'number');
        assert.equal(onDrag.calls[0][2], i.state);
        i.destroy();
    });

    // -- Pointer events --

    it('pointerdown sets active + calls onClick', () => {
        const onClick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onClick }));
        i.el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 25 }));
        assert.equal(i.state.active, true);
        assert.equal(onClick.calls.length, 1);
        i.destroy();
    });

    it('pointerup clears active', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        i.el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 25 }));
        i.el.dispatchEvent(new PointerEvent('pointerup'));
        assert.equal(i.state.active, false);
        i.destroy();
    });

    it('hover enter/leave', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        i.el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 50, clientY: 25 }));
        assert.equal(i.state.hover, true);
        i.el.dispatchEvent(new PointerEvent('pointerleave'));
        assert.equal(i.state.hover, false);
        i.destroy();
    });

    it('calls onHover / onLeave', () => {
        const onHover = makeSpy(), onLeave = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onHover, onLeave }));
        i.el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 50, clientY: 25 }));
        assert.equal(onHover.calls.length, 1);
        i.el.dispatchEvent(new PointerEvent('pointerleave'));
        assert.equal(onLeave.calls.length, 1);
        i.destroy();
    });

    it('focus/blur tracks state.focused', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        i.el.dispatchEvent(new FocusEvent('focus'));
        assert.equal(i.state.focused, true);
        i.el.dispatchEvent(new FocusEvent('blur'));
        assert.equal(i.state.focused, false);
        i.destroy();
    });

    // -- Cleanup --

    it('destroy removes wrapper from DOM', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(ctr.children.length, 1);
        i.destroy();
        assert.equal(ctr.children.length, 0);
    });

    it('events stop after destroy', () => {
        const onClick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onClick }));
        const el = i.el;
        i.destroy();
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }));
        assert.equal(onClick.calls.length, 0);
    });
});
