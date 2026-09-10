// test/decorations-e2.test.mjs
// E2 decorations (decisions/0010): text-fx + card + pointer, all decorate mode.
// The torture tiers already gate every recipe for zero per-frame alloc (t3),
// additive host diff + exact restore (t0, over an <input>), and themed parity
// (theme.test). This suite adds the two things those sweeps do NOT cover for the
// E2 class:
//   1. each decoration works over a NON-input host (a div / button), not only the
//      <input> the t0 sweep uses -- card/pointer decorations decorate any live
//      element, and text/valid are simply neutral for a non-form host;
//   2. the reduced-motion CALM PATH is a genuinely different, STATIC render (path
//      divergence in the draw log), not merely a zero-alloc no-op.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer, Ctx2DStub } from './harness/dom-stub.mjs';
import * as raf from './harness/raf-stub.mjs';

installDom();
raf.install();

const R = await import('../UIFXRecipes.js');
const { decorateUIFX } = await import('../UIFXController.js');

const E2 = [
    'textShimmer', 'spotlightText', 'underlineDraw',
    'borderBeam', 'tiltShine', 'cardSpotlight',
    'magneticPull', 'pointerRipple',
];

// Drive a recipe factory directly against a recording ctx and return its
// method/colour log. The recording Ctx2DStub logs method NAMES + colour strings
// (not numeric args), so the calm-path assertions below key on which drawing
// PATHS run, not on coordinates.
function drawLog(id, { reduced = false, frames = 8, focused = true, hover = true, click = false } = {}) {
    const ctx = new Ctx2DStub();
    const recipe = R.RECIPES[id]();
    const st = {
        hover, active: false, focused, text: 'sample', valid: true,
        reducedMotion: reduced, budget: 1, w: 160, h: 48, padding: 40, dpr: 1,
    };
    const ptr = { x: 90, y: 24, vx: 1, vy: 0 };
    if (recipe.init) recipe.init(ctx, st.w, st.h, st.padding);
    if (click && recipe.onClick) recipe.onClick(ptr.x, ptr.y, st);
    ctx.record(true);
    for (let i = 0; i < frames; i++) { ptr.x = 20 + i * 8; recipe.tick(ctx, 0.016, i * 16, st, ptr); }
    ctx.record(false);
    return ctx._log;
}
const has = (log, m) => log.indexOf(m) !== -1;

describe('E2 decorations -- registry', () => {
    it('all eight are registered decorate + themeable + motionSafe with a factory', () => {
        for (const id of E2) {
            const m = R.RECIPE_META.find((x) => x.id === id);
            assert.ok(m, id + ' missing from RECIPE_META');
            assert.equal(m.type, 'decorate', id + ' type');
            assert.equal(m.themeable, true, id + ' themeable');
            assert.equal(m.motionSafe, true, id + ' motionSafe');
            assert.equal(typeof R.RECIPES[id], 'function', id + ' factory');
        }
    });
});

describe('E2 decorations -- decorate over form AND non-form hosts', () => {
    let ctr;
    let T = 0;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0, 'raf queue must drain to 0'); });

    for (const tag of ['input', 'div', 'button']) {
        it('mounts additively over <' + tag + '> and restores exactly on destroy', () => {
            for (const id of E2) {
                const host = document.createElement(tag);
                host.offsetWidth = 200; host.offsetHeight = 40;
                ctr.appendChild(host);
                const before = ctr.children.length;
                const inst = decorateUIFX(host, R.RECIPES[id]);
                assert.equal(inst.el, host, id + '/' + tag + ' returns the host');
                assert.equal(ctr.children.length, before + 1, id + '/' + tag + ' overlay is a SIBLING');
                raf.step(T += 16); raf.step(T += 16); raf.step(T += 16);  // frames run, no throw
                inst.destroy();
                assert.equal(ctr.children.length, before, id + '/' + tag + ' overlay removed on destroy');
                host.remove();
            }
        });
    }
});

describe('E2 decorations -- reduced-motion calm path is a distinct static render', () => {
    it('TextShimmer: a sweeping band in full motion, a static sheen under reduce', () => {
        const full = drawLog('textShimmer', { reduced: false });
        const calm = drawLog('textShimmer', { reduced: true });
        assert.ok(has(full, 'moveTo') && !has(full, 'fillRect'), 'full motion sweeps a slanted band');
        assert.ok(has(calm, 'fillRect') && !has(calm, 'moveTo'), 'reduce paints a static sheen only');
    });
    it('BorderBeam: a travelling comet in full motion, none under reduce', () => {
        const full = drawLog('borderBeam', { reduced: false });
        const calm = drawLog('borderBeam', { reduced: true });
        assert.ok(has(full, 'arc'), 'full motion draws the comet (arc dots)');
        assert.ok(!has(calm, 'arc'), 'reduce draws only the faint outline, no comet');
    });
    it('every E2 recipe ticks under reduce and after a click without throwing', () => {
        for (const id of E2) {
            assert.doesNotThrow(() => drawLog(id, { reduced: true, click: true }), id + ' calm path');
        }
    });
});
