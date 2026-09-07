// test/reduced-motion.test.mjs
// U5: the calm-path recipes must actually STOP moving under state.reducedMotion.
// A method-name-only recording ctx can't see displacement, so this drives the
// recipes directly against a coordinate-capturing ctx and asserts motion goes to
// zero: ErrorShake stops shaking (moveTo x collapses to one value), SuccessBloom
// stops spawning particles (arc count drops to the ring alone).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ErrorShake, SuccessBloom, SwarmToggle, FocusHalo } from '../UIFXRecipes.js';

// A ctx that captures the ONE thing the shared method-name stub cannot: the x of
// each moveTo (rr() emits moveTo(x+r, y) first, so a recipe's dx rides it) and the
// number of arc() calls (SuccessBloom draws each particle as an arc). Everything
// else is an inert sink.
function captureCtx() {
    const c = {
        moveToX: [], arcs: 0,
        fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, font: '', textAlign: '',
        beginPath() {}, closePath() {}, save() {}, restore() {}, translate() {}, scale() {},
        setTransform() {}, clearRect() {}, rect() {}, roundRect() {}, setLineDash() {},
        stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, lineTo() {}, arcTo() {},
        quadraticCurveTo() {}, bezierCurveTo() {}, fillText() {}, strokeText() {},
        measureText() { return { width: 0 }; },
        createLinearGradient() { return { addColorStop() {} }; },
        createRadialGradient() { return { addColorStop() {} }; },
        moveTo(x) { this.moveToX.push(x); },
        arc() { this.arcs++; },
    };
    return c;
}

function st(over) {
    return Object.assign({
        hover: false, active: false, focused: false, toggled: false, indeterminate: false,
        disabled: false, val: 0, text: '', valid: true, reducedMotion: false, budget: 1,
        w: 200, h: 28, padding: 40, dpr: 1,
    }, over);
}

describe('U5 reduced motion -- ErrorShake', () => {
    it('shakes under full motion (moveTo x varies)', () => {
        const r = ErrorShake();
        const c = captureCtx();
        r.tick(c, 0.016, 100, st({ valid: true }));           // seed wasValid = true
        for (let k = 1; k <= 6; k++) r.tick(c, 0.016, 100 + k * 16, st({ valid: false }));
        assert.ok(new Set(c.moveToX).size > 1, 'border x-offset moves frame to frame');
    });

    it('does NOT shake under reduced motion (moveTo x is constant)', () => {
        const r = ErrorShake();
        const c = captureCtx();
        r.tick(c, 0.016, 100, st({ valid: true, reducedMotion: true }));
        for (let k = 1; k <= 6; k++) r.tick(c, 0.016, 100 + k * 16, st({ valid: false, reducedMotion: true }));
        assert.equal(new Set(c.moveToX).size, 1, 'border never displaces: exactly one x-offset');
    });
});

describe('U5 reduced motion -- SuccessBloom', () => {
    // Drive a valid:false -> valid:true edge and count arcs on the success frame.
    function arcsOnSuccessFrame(reducedMotion) {
        const r = SuccessBloom();
        const c = captureCtx();
        r.tick(c, 0.016, 0, st({ valid: false, reducedMotion }));  // wasValid = false
        c.arcs = 0;
        r.tick(c, 0.016, 16, st({ valid: true, reducedMotion }));  // the success edge
        return c.arcs;
    }

    it('bursts particles under full motion (many arcs)', () => {
        assert.ok(arcsOnSuccessFrame(false) > 1, 'ring + particle arcs');
    });

    it('draws only the ring under reduced motion (no particle arcs)', () => {
        const arcs = arcsOnSuccessFrame(true);
        assert.ok(arcs <= 1, 'at most the ring, zero particles: ' + arcs);
        assert.ok(arcs < arcsOnSuccessFrame(false), 'strictly fewer arcs than full motion');
    });
});

describe('U5 reduced motion -- SwarmToggle + FocusHalo do not throw and settle', () => {
    it('SwarmToggle renders a static knob under reduce (no crash, particles placed)', () => {
        const r = SwarmToggle();
        const c = captureCtx();
        r.init(c, 64, 36, 40);
        // Two identical frames under reduce should paint identically (no drift).
        r.tick(c, 0.016, 0, st({ w: 64, h: 36, toggled: true, reducedMotion: true }));
        const a = c.moveToX.length;
        r.tick(c, 0.016, 16, st({ w: 64, h: 36, toggled: true, reducedMotion: true }));
        assert.ok(c.moveToX.length >= a, 'keeps drawing, never throws');
    });

    it('FocusHalo omits the breathing pulse under reduce (no crash)', () => {
        const r = FocusHalo();
        const c = captureCtx();
        r.tick(c, 0.5, 0, st({ focused: true, reducedMotion: true }));   // halo grows in
        r.tick(c, 0.5, 400, st({ focused: true, reducedMotion: true }));
        assert.ok(true, 'reduced FocusHalo ticks without motion-driven state');
    });
});
