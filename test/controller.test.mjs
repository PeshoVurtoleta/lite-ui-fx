// test/controller.test.mjs
// node:test port of the legacy vitest suite (UIFXController.test.js), 1:1.
// Every legacy assertion preserved; the 4 _tickAll tests re-expressed via the
// raf-stub; _clear() replaced by destroy discipline + a shared pending()===0
// afterEach (the module-scope shared ticker self-resets only at refcount 0).

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer, headChildCount, emitDpr, setDpr } from './harness/dom-stub.mjs';
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

    // -- U-01: one activation path (Space + Enter -> exactly one onToggle) --
    // The OLD keydown manually flipped `el.checked` AND drove onToggle, so a
    // native Space fired onToggle twice and could leave state inverted. The
    // change listener is now the SOLE driver; keydown only bridges Enter.

    it('toggle: one Space press = exactly one onToggle, state flipped once', () => {
        const onToggle = makeSpy();
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe({ onToggle }));
        assert.equal(i.state.toggled, false);
        // Browser: keydown{Space} does nothing in the controller; native
        // activation (el.click) flips .checked and fires change.
        i.el.dispatchEvent(new Event('keydown', { code: 'Space' }));
        i.el.click();
        assert.equal(onToggle.calls.length, 1, 'exactly one onToggle per Space');
        assert.equal(i.state.toggled, true, 'toggled flipped exactly once');
        assert.equal(i.el.checked, true);
        i.destroy();
    });

    it('toggle: one Enter press = exactly one onToggle (el.click bridge)', () => {
        const onToggle = makeSpy();
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe({ onToggle }));
        // Enter is not native for a checkbox; the controller routes it through
        // el.click(), so the test does NOT call click() itself.
        i.el.dispatchEvent(new Event('keydown', { code: 'Enter' }));
        assert.equal(onToggle.calls.length, 1, 'exactly one onToggle per Enter');
        assert.equal(i.state.toggled, true);
        i.destroy();
    });

    // -- U-02A: fail closed at mount --

    it('factory ()=>({}) throws at mount, message names tick', () => {
        assert.throws(
            () => mountUIFX(ctr, UIType.BUTTON, () => ({})),
            /tick/,
        );
    });

    it('non-function factory throws at mount', () => {
        assert.throws(() => mountUIFX(ctr, UIType.BUTTON, {}), /recipeFactory/);
    });

    it('null container throws at mount', () => {
        assert.throws(() => mountUIFX(null, UIType.BUTTON, recipe()), /container/);
    });

    it('unknown option { widht } throws, message names width', () => {
        assert.throws(
            () => mountUIFX(ctr, UIType.BUTTON, recipe(), { widht: 200 }),
            /widht[\s\S]*width/,
        );
    });

    it('unknown recipe hook onHoverr throws, suggests onHover', () => {
        assert.throws(
            () => mountUIFX(ctr, UIType.BUTTON, recipe({ onHoverr: makeSpy() })),
            /onHoverr[\s\S]*onHover/,
        );
    });

    // -- U-10: new inputs land in element AND state before frame 1 --

    it('{ value: 0.3 } lands el.value "30" and state.val 0.3 pre-frame', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe(), { value: 0.3 });
        assert.equal(i.el.value, '30');
        assert.equal(i.state.val, 0.3);
        i.destroy();
    });

    it('{ checked: true } lands el.checked and state.toggled pre-frame', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe(), { checked: true });
        assert.equal(i.el.checked, true);
        assert.equal(i.state.toggled, true);
        i.destroy();
    });

    it('{ disabled: true } lands el.disabled and state.disabled; default false', () => {
        const on = mountUIFX(ctr, UIType.BUTTON, recipe(), { disabled: true });
        assert.equal(on.el.disabled, true);
        assert.equal(on.state.disabled, true);
        on.destroy();
        const off = mountUIFX(ctr, UIType.BUTTON, recipe());
        assert.equal(off.state.disabled, false);
        off.destroy();
    });

    // -- U-11: pointermove does zero layout reads --

    it('pointermove reads a cached rect: zero getBoundingClientRect during move', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        let rectReads = 0;
        const orig = i.el.getBoundingClientRect.bind(i.el);
        i.el.getBoundingClientRect = () => { rectReads++; return orig(); };
        i.el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 10, clientY: 10 }));
        assert.equal(rectReads, 1, 'one layout read per enter');
        for (let k = 0; k < 20; k++) {
            i.el.dispatchEvent(new PointerEvent('pointermove', { clientX: 10 + k, clientY: 10 }));
        }
        assert.equal(rectReads, 1, 'zero layout reads across 20 moves');
        i.destroy();
    });

    // -- BLOCKER 1: mount must FAIL CLOSED (validate BEFORE any side effect) --
    // The old order acquired the slider style AND appended the wrapper BEFORE
    // validating the recipe, so a bad slider recipe leaked an orphan wrapper and
    // stuck the shared <style> refcount at 1 with zero live sliders.

    it('SLIDER bad recipe throws with no orphan wrapper, no leaked style, refcount recovers', () => {
        const headBase = headChildCount();
        // missing tick
        assert.throws(() => mountUIFX(ctr, UIType.SLIDER, () => ({})), /tick/);
        assert.equal(ctr.children.length, 0, 'no orphan wrapper after rejected slider (missing tick)');
        assert.equal(headChildCount(), headBase, 'no leaked <style> after rejected slider (missing tick)');
        // typo'd hook
        assert.throws(
            () => mountUIFX(ctr, UIType.SLIDER, () => ({ tick() {}, onDragg() {} })),
            /onDragg[\s\S]*onDrag/,
        );
        assert.equal(ctr.children.length, 0, 'no orphan wrapper after rejected slider (hook typo)');
        assert.equal(headChildCount(), headBase, 'no leaked <style> after rejected slider (hook typo)');
        // a SUBSEQUENT good slider mount+destroy returns head to baseline: the
        // refcount was never bumped by the rejected mounts.
        const good = mountUIFX(ctr, UIType.SLIDER, recipe());
        good.destroy();
        assert.equal(headChildCount(), headBase, 'refcount not stuck: good slider mount/destroy nets head delta 0');
    });

    it('BUTTON bad recipe throws with no orphan wrapper in container', () => {
        assert.throws(() => mountUIFX(ctr, UIType.BUTTON, () => ({})), /tick/);
        assert.equal(ctr.children.length, 0, 'no orphan wrapper after rejected button mount');
    });

    // -- BLOCKER 2: U-10 fails closed on VALUES, not just keys --

    it('{ value: null } throws naming value', () => {
        assert.throws(() => mountUIFX(ctr, UIType.SLIDER, recipe(), { value: null }), /value/);
    });

    it('{ value: 5 } (out of range) throws naming value', () => {
        assert.throws(() => mountUIFX(ctr, UIType.SLIDER, recipe(), { value: 5 }), /value/);
    });

    it('{ value: -0.1 } (out of range) throws naming value', () => {
        assert.throws(() => mountUIFX(ctr, UIType.SLIDER, recipe(), { value: -0.1 }), /value/);
    });

    it('{ checked: null } coerces to false in element AND state', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe(), { checked: null });
        assert.equal(i.state.toggled, false);
        assert.equal(i.el.checked, false);
        i.destroy();
    });

    it('{ checked: 1 } coerces to true in element AND state', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe(), { checked: 1 });
        assert.equal(i.state.toggled, true);
        assert.equal(i.el.checked, true);
        i.destroy();
    });

    // -- NIT 1: a cold pointerdown (no prior pointerenter) reads a fresh rect --
    // The old updatePointer early-returned while rect===null, so onClick saw the
    // stale -999,-999 sentinel instead of the event's coords.

    it('pointerdown with no prior pointerenter yields onClick with fresh coords', () => {
        const onClick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onClick }));
        i.el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 12, clientY: 7 }));
        assert.equal(onClick.calls.length, 1);
        assert.equal(onClick.calls[0][0], 12, 'onClick x is the event coord, not the -999 sentinel');
        assert.equal(onClick.calls[0][1], 7, 'onClick y is the event coord, not the -999 sentinel');
        i.destroy();
    });

    // -- NEW (QA gap): A10 completeness -- scroll/resize also refresh the cached
    // rect (one layout read each), and that refresh does not leak into later
    // pointermoves (still zero reads there).

    it('scroll/resize each trigger exactly one more cached-rect refresh; moves after stay at zero', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        let rectReads = 0;
        const orig = i.el.getBoundingClientRect.bind(i.el);
        i.el.getBoundingClientRect = () => { rectReads++; return orig(); };
        i.el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 10, clientY: 10 }));
        assert.equal(rectReads, 1, 'one layout read on enter');
        window.dispatchEvent(new Event('scroll'));
        assert.equal(rectReads, 2, 'scroll triggers exactly one more layout read');
        window.dispatchEvent(new Event('resize'));
        assert.equal(rectReads, 3, 'resize triggers exactly one more layout read');
        for (let k = 0; k < 5; k++) {
            i.el.dispatchEvent(new PointerEvent('pointermove', { clientX: 10 + k, clientY: 10 }));
        }
        assert.equal(rectReads, 3, 'zero further layout reads across moves after scroll/resize refresh');
        i.destroy();
    });

    // -- NEW (QA gap): A11 -- DPR re-scale is actually driven via emitDpr, and an
    // absent window.matchMedia is a silent no-op (fail closed, never a throw).

    it('matchMedia absent: mount/destroy does not throw (silent no-op)', () => {
        const orig = globalThis.window.matchMedia;
        delete globalThis.window.matchMedia;
        let i;
        try {
            assert.doesNotThrow(() => { i = mountUIFX(ctr, UIType.BUTTON, recipe()); });
            assert.doesNotThrow(() => i.destroy());
        } finally {
            globalThis.window.matchMedia = orig;
        }
    });

    it('emitDpr(2) re-scales canvas.width/height and updates state.dpr (matchMedia present)', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe(), { width: 160, height: 48, padding: 40 });
        const cw = 160 + 40 * 2;
        const ch = 48 + 40 * 2;
        assert.equal(i.state.dpr, 1, 'mounts at dpr 1');
        assert.equal(i.canvas.width, cw * 1, 'canvas.width at mount dpr');
        assert.equal(i.canvas.height, ch * 1, 'canvas.height at mount dpr');
        emitDpr(2);
        assert.equal(i.state.dpr, 2, 'state.dpr re-read on matchMedia change');
        assert.equal(i.canvas.width, cw * 2, 'canvas.width re-scaled to new dpr');
        assert.equal(i.canvas.height, ch * 2, 'canvas.height re-scaled to new dpr');
        i.destroy();
        setDpr(1); // restore baseline dpr for any later test in this file
    });

    // -- NEW (QA gap): U-09 refcount under INTERLEAVING, not just an all-sliders
    // sequence -- mixed types, and destroy order that does not match mount order.

    // -- U1 hardening: PHASE 2 fails closed too. A throw inside phase 2
    // (realistically recipe.init -- user code) must UNWIND every side effect
    // already performed and re-throw the ORIGINAL error, leaving DOM and every
    // shared refcount exactly as before the attempt.

    it('BUTTON recipe whose init throws: mountUIFX throws SAME error, no orphan wrapper', () => {
        const boom = new Error('init exploded (button)');
        const factory = () => ({ tick: makeSpy(), init() { throw boom; } });
        assert.throws(
            () => mountUIFX(ctr, UIType.BUTTON, factory),
            (e) => e === boom && /init exploded \(button\)/.test(e.message),
        );
        assert.equal(ctr.children.length, 0, 'no orphan wrapper after init-throwing button');
    });

    it('SLIDER recipe whose init throws: throws, container empty, style released; a later good slider nets head to baseline', () => {
        const headBase = headChildCount();
        const boom = new Error('init exploded (slider)');
        const factory = () => ({ tick: makeSpy(), init() { throw boom; } });
        assert.throws(
            () => mountUIFX(ctr, UIType.SLIDER, factory),
            (e) => e === boom && /init exploded \(slider\)/.test(e.message),
        );
        assert.equal(ctr.children.length, 0, 'no orphan wrapper after init-throwing slider');
        assert.equal(headChildCount(), headBase,
            'shared <style> released on unwind: head childCount unchanged from before the attempt');
        // A subsequent GOOD slider mount+destroy returns head to baseline -- proves
        // _sliderRefs recovered (not stuck at +1) after the failed attempt.
        const good = mountUIFX(ctr, UIType.SLIDER, recipe());
        good.destroy();
        assert.equal(headChildCount(), headBase,
            '_sliderRefs recovered: good slider mount/destroy nets head delta 0');
    });

    it('after a failed init-throwing mount, a normal mount+interact+destroy still works (shared ticker uncorrupted)', () => {
        const boom = new Error('init exploded (pre)');
        assert.throws(
            () => mountUIFX(ctr, UIType.BUTTON, () => ({ tick: makeSpy(), init() { throw boom; } })),
            /init exploded \(pre\)/,
        );
        // The shared ticker/loop must be intact: a good component ticks and its
        // interactions fire, then destroys clean (raf queue drains via afterEach).
        const tick = makeSpy();
        const onClick = makeSpy();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick, onClick }));
        let t = performance.now();
        raf.step(t += 16);
        assert.equal(tick.calls.length, 1, 'good component ticks after a failed attempt');
        i.el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5 }));
        assert.equal(onClick.calls.length, 1, 'good component interactions fire after a failed attempt');
        i.destroy();
    });

    it('U-09 interleaved mixed-type mount/destroy order nets head childCount to 0', () => {
        const headBase = headChildCount();
        const a = mountUIFX(ctr, UIType.BUTTON, recipe());
        const b = mountUIFX(ctr, UIType.SLIDER, recipe());
        const c = mountUIFX(ctr, UIType.TOGGLE, recipe());
        const d = mountUIFX(ctr, UIType.SLIDER, recipe());
        assert.equal(headChildCount(), headBase + 1, 'one shared <style> while 2 sliders are live');
        // Destroy out of mount order: kill one slider (b) while the other (d) and
        // two non-sliders (a, c) are still alive -- refcount 2->1, style stays.
        b.destroy();
        assert.equal(headChildCount(), headBase + 1, 'style remains: one slider (d) still live');
        a.destroy();
        c.destroy();
        d.destroy();
        assert.equal(headChildCount(), headBase, 'style removed once the last slider dies; head nets to 0');
    });
});
