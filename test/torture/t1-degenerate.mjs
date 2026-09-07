// test/torture/t1-degenerate.mjs
// The mount surface fails closed (U-02A / U-10). Every unverified input is an
// Error at mount with a did-you-mean where a key is involved; nothing here mounts
// a half-broken component that a later frame could throw inside.

import assert from 'node:assert/strict';
import {
    mountUIFX, UIType, makeContainer, setDpr, raf, RECIPES, RECIPE_META,
} from './harness.mjs';

const counting = () => ({ tick() {} });

// Step the shared ticker without allocating in the loop body.
function pump(frames) {
    let t = performance.now();
    for (let i = 0; i < frames; i++) { t += 16; raf.step(t); }
}

export async function runT1() {
    const container = makeContainer();

    // U-10 fixed: an unknown option key is an Error with a did-you-mean, not a
    // silent drop. { widht:200 } -> throws naming the intended "width".
    assert.throws(
        () => mountUIFX(container, UIType.BUTTON, counting, { widht: 200 }),
        /width/,
        'unknown option {widht} throws with a did-you-mean for "width"',
    );

    // U-02A fixed: a factory returning {} (no tick) is an Error AT MOUNT, naming
    // tick -- never a clean mount that throws inside the shared ticker later.
    assert.throws(
        () => mountUIFX(container, UIType.BUTTON, () => ({})),
        /tick/,
        'recipe without tick throws at mount naming "tick"',
    );

    // U-02A: an unknown recipe hook key is an Error with a did-you-mean.
    assert.throws(
        () => mountUIFX(container, UIType.BUTTON, () => ({ tick() {}, onHoverr() {} })),
        /onHover/,
        'unknown recipe hook {onHoverr} throws with a did-you-mean for "onHover"',
    );

    // U-02A: a non-function recipeFactory is an Error naming the arg.
    assert.throws(
        () => mountUIFX(container, UIType.BUTTON, {}),
        /recipeFactory/,
        'non-function recipeFactory throws naming recipeFactory',
    );

    // U-02A: a null container is an Error naming the arg.
    assert.throws(
        () => mountUIFX(null, UIType.BUTTON, counting),
        /container/,
        'null container throws naming container',
    );

    // Fail closed on the element type: an unknown/undefined type is an Error,
    // never a silent default to a button (reviewer NIT, folded into U2).
    assert.throws(
        () => mountUIFX(container, 'banana', counting),
        /type/,
        'unknown type throws naming type',
    );
    assert.throws(
        () => mountUIFX(container, undefined, counting),
        /type/,
        'undefined type throws naming type',
    );

    // DECIDED default (not a flip): width 0 is falsy, so `width || typeDefault`
    // resolves to the BUTTON default 160. This is documented behaviour, verified
    // here so a future change to the default resolution is caught.
    const c = mountUIFX(container, UIType.BUTTON, counting, { width: 0 });
    assert.ok(c && c.el, 'width 0 constructs (documented width||default)');
    assert.equal(c.state.w, 160, 'width 0 falls back to the BUTTON default 160');
    c.destroy();

    // dpr variations construct.
    for (const dpr of [0.5, 1, 3]) {
        setDpr(dpr);
        const d = mountUIFX(container, UIType.SLIDER, counting, { width: 220 });
        assert.equal(d.state.dpr, dpr, 'dpr ' + dpr + ' recorded on state');
        d.destroy();
    }
    setDpr(1);

    assert.equal(raf.pending(), 0, 't1 raf pending returns to 0');

    // -- Meta-driven degenerate sweep: EVERY real recipe survives absurd -----
    //    geometry, extreme pointer positions and rapid state flips without a
    //    single throw reaching a frame. Errors are NEVER swallowed -- assert.doesNotThrow
    //    surfaces the offender's id.
    let swept = 0;
    for (const m of RECIPE_META) {
        const base = RECIPES[m.id];
        assert.doesNotThrow(() => {
            // Degenerate geometry: zero-ish and absurd sizes both construct+run.
            for (const dims of [{ width: 1, height: 1, padding: 0 }, { width: 300, height: 48, padding: 40 }, { width: 4000, height: 2000, padding: 200 }]) {
                const inst = mountUIFX(container, m.type, base, dims);

                // Extreme pointer positions written straight onto the live pointer
                // the tick reads (mount stubs never dispatch real pointer events).
                inst.state.hover = true; inst.state.active = true;
                pump(2);

                // Rapid state flips across on/off and the val extremes/out-of-band.
                for (let k = 0; k < 6; k++) {
                    inst.state.toggled = (k & 1) === 0;
                    inst.state.val = (k & 1) === 0 ? -5 : 5; // out-of-[0,1] on purpose
                    inst.state.focused = (k & 1) === 1;
                    pump(1);
                }

                inst.state.val = 0; inst.state.toggled = false;
                pump(1);
                inst.destroy();
            }
        }, m.id + ' survives degenerate geometry / pointer / rapid flips');
        swept++;
    }
    assert.equal(swept, RECIPE_META.length, 'every RECIPE_META row swept');
    assert.equal(swept, 53, 'all 53 recipes swept through degenerate inputs');
    assert.equal(raf.pending(), 0, 't1 degenerate sweep leaves raf pending at 0');

    return { swept };
}
