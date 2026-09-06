// test/torture/t1-degenerate.mjs
// Pin the CURRENT fail-open behaviour verbatim with TODO(U1) markers. Nothing
// here throws today; U1 flips these pins into thrown errors.

import assert from 'node:assert/strict';
import { mountUIFX, UIType, makeContainer, setDpr, raf } from './harness.mjs';

const counting = () => ({ tick() {} });

export async function runT1() {
    const container = makeContainer();

    // TODO(U1) flip: an unknown option key is silently ignored and width falls
    // back to the type default (160), instead of an error with a did-you-mean.
    const a = mountUIFX(container, UIType.BUTTON, counting, { widht: 200 });
    assert.equal(a.state.w, 160, 'TODO(U1) unknown option {widht} ignored -> width 160');
    a.destroy();

    // TODO(U1) flip: a factory returning {} mounts WITHOUT throwing. Finding U-02:
    // do NOT step a frame while it is mounted -- a missing tick throws inside the
    // shared ticker and permanently kills the RAF chain for every component.
    // Destroy without stepping.
    const b = mountUIFX(container, UIType.BUTTON, () => ({}));
    assert.ok(b && b.el, 'empty recipe object mounts without throwing');
    b.destroy();

    // width 0 constructs (falls back to the default via `width || default`).
    const c = mountUIFX(container, UIType.BUTTON, counting, { width: 0 });
    assert.ok(c && c.el, 'width 0 constructs');
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
