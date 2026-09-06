// test/torture/t1-degenerate.mjs
// The mount surface fails closed (U-02A / U-10). Every unverified input is an
// Error at mount with a did-you-mean where a key is involved; nothing here mounts
// a half-broken component that a later frame could throw inside.

import assert from 'node:assert/strict';
import { mountUIFX, UIType, makeContainer, setDpr, raf } from './harness.mjs';

const counting = () => ({ tick() {} });

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
    return {};
}
