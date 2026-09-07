// test/group.test.mjs
// U7 grouped controls (decisions/0007): mountUIFXGroup -- N native elements + one
// canvas + one recipe. Boundary suite for the ASSERTIONS in BRIEF-U7: native
// structure + ARIA per pattern, APG keyboard walks, onSelect-exactly-once,
// setIndex, the scalar-state SUPERSET, additive-ness (onSelect group-only), the
// three clock modes, and fail-closed validation. ASCII-only.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer, EventStub, FakeTicker } from './harness/dom-stub.mjs';
import * as raf from './harness/raf-stub.mjs';

installDom();
raf.install();

const { mountUIFX, decorateUIFX, mountUIFXGroup, UIType, GroupType } = await import('../UIFXController.js');
const { RECIPES, RECIPE_META, mountRecipe } = await import('../UIFXRecipes.js');

// A group recipe that records every onSelect(index) it is handed.
function spyRecipe() {
    const selects = [];
    const factory = () => ({ tick() {}, onSelect(i) { selects.push(i); } });
    factory.selects = selects;
    return factory;
}
const ITEMS4 = ['A', 'B', 'C', 'D'];

describe('mountUIFXGroup -- native structure + ARIA per pattern', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0, 'raf drained'); });

    it('RADIO: a fieldset radiogroup of N radios; initial index checked', () => {
        const g = mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() {} }), { items: ITEMS4, index: 2, label: 'Pick' });
        assert.equal(g.wrapper.children[0].tagName, 'FIELDSET');
        assert.equal(g.wrapper.children[0].getAttribute('role'), 'radiogroup');
        assert.equal(g.wrapper.children[0].getAttribute('aria-label'), 'Pick');
        assert.equal(g.els.length, 4, 'four native radios');
        for (const r of g.els) { assert.equal(r.tagName, 'INPUT'); assert.equal(r.type, 'radio'); }
        assert.equal(g.els[2].checked, true, 'initial index radio checked');
        assert.equal(g.state.count, 4);
        assert.equal(g.index, 2, 'index getter reflects the selection');
        g.destroy();
    });

    it('TABS: a tablist of N role=tab buttons; roving tabindex + aria-selected', () => {
        const g = mountUIFXGroup(ctr, GroupType.TABS, () => ({ tick() {} }), { items: ['One', 'Two', 'Three'] });
        assert.equal(g.wrapper.children[0].getAttribute('role'), 'tablist');
        assert.equal(g.els.length, 3);
        for (const b of g.els) { assert.equal(b.tagName, 'BUTTON'); assert.equal(b.getAttribute('role'), 'tab'); }
        assert.equal(g.els[0].tabIndex, 0, 'selected tab is tabbable');
        assert.equal(g.els[1].tabIndex, -1, 'unselected tabs are not tabbable (roving)');
        assert.equal(g.els[0].getAttribute('aria-selected'), 'true');
        assert.equal(g.els[1].getAttribute('aria-selected'), 'false');
        assert.equal(g.els[0].textContent, 'One', 'tab accessible name from items');
        g.destroy();
    });

    it('STEPPER: one <input type=number> spinbutton; min/max/value from items+index', () => {
        const g = mountUIFXGroup(ctr, GroupType.STEPPER, () => ({ tick() {} }), { items: ['0', '1', '2', '3', '4'], index: 2 });
        assert.equal(g.els.length, 1, 'one native spinbutton');
        assert.equal(g.els[0].type, 'number');
        assert.equal(g.els[0].min, '0');
        assert.equal(g.els[0].max, '4', 'max = count-1');
        assert.equal(g.els[0].value, '2', 'value = index');
        assert.equal(g.state.count, 5);
        g.destroy();
    });

    it('RATING: a radiogroup of N radios (like radio, rating semantics)', () => {
        const g = mountUIFXGroup(ctr, GroupType.RATING, () => ({ tick() {} }), { items: ['1', '2', '3', '4', '5'], index: 0 });
        assert.equal(g.wrapper.children[0].getAttribute('role'), 'radiogroup');
        assert.equal(g.els.length, 5);
        assert.equal(g.els[0].type, 'radio');
        g.destroy();
    });
});

describe('mountUIFXGroup -- selection fires onSelect exactly once with the right index', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0); });

    it('RADIO: a native change on a radio selects it, once', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.RADIO, f, { items: ITEMS4, index: 0 });
        g.els[3].checked = true; g.els[3].dispatchEvent(new EventStub('change'));
        assert.equal(g.state.index, 3);
        assert.deepEqual(f.selects, [3], 'exactly one onSelect(3)');
        g.destroy();
    });

    it('TABS: click and each arrow/Home/End fires onSelect once with the APG index', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.TABS, f, { items: ['a', 'b', 'c', 'd'] });
        const tablist = g.wrapper.children[0];
        g.els[2].dispatchEvent(new EventStub('click'));           // click tab 2
        tablist.dispatchEvent(new EventStub('keydown', { key: 'ArrowRight' })); // -> 3
        tablist.dispatchEvent(new EventStub('keydown', { key: 'ArrowRight' })); // wraps -> 0
        tablist.dispatchEvent(new EventStub('keydown', { key: 'End' }));        // -> 3
        tablist.dispatchEvent(new EventStub('keydown', { key: 'Home' }));       // -> 0
        tablist.dispatchEvent(new EventStub('keydown', { key: 'ArrowLeft' }));  // wraps -> 3
        assert.deepEqual(f.selects, [2, 3, 0, 3, 0, 3], 'one onSelect per move, right index');
        assert.equal(g.els[3].tabIndex, 0, 'roving tabindex followed the selection');
        assert.equal(g.els[0].tabIndex, -1);
        assert.equal(g.els[3].getAttribute('aria-selected'), 'true');
        g.destroy();
    });

    it('TABS: a non-arrow key does nothing (no onSelect, selection unchanged)', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.TABS, f, { items: ['a', 'b', 'c'] });
        g.wrapper.children[0].dispatchEvent(new EventStub('keydown', { key: 'Tab' }));
        assert.deepEqual(f.selects, [], 'Tab is not a roving key');
        assert.equal(g.state.index, 0);
        g.destroy();
    });

    it('STEPPER: a native input event selects the (clamped) value, once', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.STEPPER, f, { items: ['0', '1', '2', '3', '4'], index: 0 });
        g.els[0].value = '3'; g.els[0].dispatchEvent(new EventStub('input'));
        g.els[0].value = '99'; g.els[0].dispatchEvent(new EventStub('input')); // clamps to 4
        assert.deepEqual(f.selects, [3, 4], 'onSelect per input, clamped to count-1');
        assert.equal(g.els[0].value, '4', 'the clamp is reflected to the native value');
        g.destroy();
    });
});

describe('mountUIFXGroup -- setIndex is programmatic + fail-closed', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0); });

    it('RADIO setIndex updates the native radio, state, and fires onSelect once', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.RADIO, f, { items: ITEMS4, index: 0 });
        g.setIndex(2);
        assert.equal(g.els[2].checked, true, 'native radio checked');
        assert.equal(g.state.index, 2);
        assert.deepEqual(f.selects, [2], 'exactly one onSelect (no native event double-fire)');
        g.destroy();
    });

    it('TABS setIndex updates roving + aria WITHOUT stealing focus, fires onSelect once', () => {
        const f = spyRecipe();
        let focusCalls = 0;
        const g = mountUIFXGroup(ctr, GroupType.TABS, f, { items: ['a', 'b', 'c'] });
        for (const b of g.els) b.focus = () => { focusCalls++; };
        g.setIndex(2);
        assert.equal(g.els[2].tabIndex, 0);
        assert.equal(g.els[2].getAttribute('aria-selected'), 'true');
        assert.equal(focusCalls, 0, 'programmatic setIndex does not steal focus');
        assert.deepEqual(f.selects, [2]);
        g.destroy();
    });

    it('STEPPER setIndex reflects to the native value + fires onSelect once', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.STEPPER, f, { items: ['0', '1', '2', '3'], index: 0 });
        g.setIndex(3);
        assert.equal(g.els[0].value, '3');
        assert.deepEqual(f.selects, [3]);
        g.destroy();
    });

    it('setIndex fails closed on a non-integer / out-of-range index', () => {
        const g = mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() {} }), { items: ITEMS4 });
        assert.throws(() => g.setIndex(4), /\[0, count-1\]/);
        assert.throws(() => g.setIndex(-1), /\[0, count-1\]/);
        assert.throws(() => g.setIndex(1.5), /\[0, count-1\]/);
        assert.throws(() => g.setIndex('2'), /\[0, count-1\]/);
        g.destroy();
    });

    it('setIndex is inert after destroy', () => {
        const f = spyRecipe();
        const g = mountUIFXGroup(ctr, GroupType.RADIO, f, { items: ITEMS4 });
        g.destroy();
        g.setIndex(2); // no throw, no fire
        assert.deepEqual(f.selects, []);
    });
});

describe('mountUIFXGroup -- state is a SUPERSET of scalar state + group fields', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0); });

    it('group state carries every scalar field plus the group additions', () => {
        // Scalar state fields (mountUIFX) -- the group must not drop any (0007).
        const scalar = mountUIFX(ctr, UIType.BUTTON, () => ({ tick() {} }));
        const scalarKeys = Object.keys(scalar.state);
        scalar.destroy();

        const g = mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() {} }), { items: ITEMS4 });
        const gk = new Set(Object.keys(g.state));
        for (const k of scalarKeys) assert.ok(gk.has(k), 'group state is missing scalar field "' + k + '"');
        for (const k of ['index', 'count', 'hoverIndex', 'labels', 'itemX', 'itemY', 'itemW', 'itemH']) {
            assert.ok(gk.has(k), 'group state is missing group field "' + k + '"');
        }
        // Geometry lanes are typed arrays of length count (read by the recipe by index).
        assert.equal(g.state.itemX.length, 4);
        assert.equal(g.state.itemX.constructor, Float32Array);
        assert.equal(g.state.labels.length, 4, 'labels present, one per item');
        assert.equal(g.state.labels[0], 'A', 'labels are the items');
        assert.deepEqual(Array.from(g.state.itemX), [0, 56, 112, 168], 'arithmetic strip layout (default 56px item)');
        g.destroy();
    });
});

describe('mountUIFXGroup -- additive: onSelect is group-only, group types are group-only', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0); });

    it('mountUIFX rejects a recipe carrying onSelect (ninth hook is group-only)', () => {
        assert.throws(
            () => mountUIFX(ctr, UIType.BUTTON, () => ({ tick() {}, onSelect() {} })),
            /unknown recipe hook "onSelect"/,
        );
    });
    it('decorateUIFX rejects a recipe carrying onSelect', () => {
        const host = document.createElement('input');
        host.offsetWidth = 120; host.offsetHeight = 28; ctr.appendChild(host);
        assert.throws(
            () => decorateUIFX(host, () => ({ tick() {}, onSelect() {} })),
            /unknown recipe hook "onSelect"/,
        );
        ctr.removeChild(host);
    });
    it('mountUIFX rejects a group type (radio is not a UIType)', () => {
        assert.throws(() => mountUIFX(ctr, 'radio', () => ({ tick() {} })), /type must be one of/);
    });
    it('the single-element mount API is untouched (button still mounts + ticks)', () => {
        let ticks = 0;
        const b = mountUIFX(ctr, UIType.BUTTON, () => ({ tick() { ticks++; } }));
        raf.step(1000); raf.step(1016);
        assert.ok(ticks >= 1, 'a plain button still rides the shared ticker');
        b.destroy();
    });
});

describe('mountUIFXGroup -- three clock modes (U5 parity)', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0); });

    it('{ ticker } borrows a caller clock; destroy never destroys it', () => {
        const clock = new FakeTicker();
        let ticks = 0;
        const g = mountUIFXGroup(ctr, GroupType.TABS, () => ({ tick() { ticks++; } }), { items: ['a', 'b'], ticker: clock });
        assert.equal(raf.pending(), 0, 'no shared RAF acquired');
        assert.equal(clock.size, 1);
        clock.tick(16); clock.tick(16);
        assert.equal(ticks, 2, 'the caller clock drives the group');
        g.destroy();
        assert.equal(clock.size, 0, 'removed from the caller clock');
        assert.equal(clock.destroyed, false, 'the caller clock survives group teardown');
    });

    it('{ driven } schedules no clock; instance.tick(dt) drives it; non-driven throws', () => {
        let ticks = 0;
        const g = mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() { ticks++; } }), { items: ITEMS4, driven: true });
        assert.equal(raf.pending(), 0, 'driven schedules no RAF');
        g.tick(16); g.tick(16);
        assert.equal(ticks, 2, 'instance.tick drives the frame');
        g.destroy();

        const g2 = mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() {} }), { items: ITEMS4 });
        assert.throws(() => g2.tick(16), /driven/, 'a ticker-driven group rejects hand frames');
        g2.destroy();
    });
});

describe('mountUIFXGroup -- fail-closed validation', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });

    const good = () => ({ tick() {} });
    it('rejects a bad container / groupType', () => {
        assert.throws(() => mountUIFXGroup(null, GroupType.RADIO, good, { items: ITEMS4 }), /container/);
        assert.throws(() => mountUIFXGroup(ctr, 'nope', good, { items: ITEMS4 }), /groupType must be one of/);
    });
    it('rejects items that are not >=2 label strings', () => {
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, {}), /"items"/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ['only'] }), /">=2"|>=2/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ['a', 3] }), /label strings/);
    });
    it('rejects a bad initial index (non-integer / out of range)', () => {
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, index: 4 }), /"index"/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, index: -1 }), /"index"/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, index: 1.5 }), /"index"/);
    });
    it('rejects an unknown option with a did-you-mean, and an unknown recipe hook', () => {
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, itms: 1 }), /unknown option "itms"/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() {}, onWiggle() {} }), { items: ITEMS4 }), /unknown recipe hook "onWiggle"/);
    });
    it('rejects a malformed theme / colors / seed, and a bad clock', () => {
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, theme: { light: '#fff' } }), /theme/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, colors: [1, 2] }), /colors/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, seed: 'x' }), /seed/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, ticker: {}, driven: true }), /mutually exclusive/);
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, good, { items: ITEMS4, ticker: {} }), /\.add/);
    });
    it('a failed mount leaves the DOM + shared RAF exactly as found (fail closed)', () => {
        const childrenBefore = ctr.children.length;
        assert.throws(() => mountUIFXGroup(ctr, GroupType.RADIO, () => { throw new Error('init boom'); }, { items: ITEMS4 }));
        assert.equal(ctr.children.length, childrenBefore, 'no wrapper left behind');
        assert.equal(raf.pending(), 0, 'no shared RAF leaked by a failed mount');
    });
});

describe('mountUIFXGroup -- registry routing + re-homes (additive by META.type)', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });
    afterEach(() => { assert.equal(raf.pending(), 0); });

    it('the four vol.3 fakes re-home to group types; SegmentedSlide is new', () => {
        const byId = (id) => RECIPE_META.find((m) => m.id === id);
        assert.equal(byId('radioOrbit').type, 'radio');
        assert.equal(byId('pillTabs').type, 'tabs');
        assert.equal(byId('segmentedSlide').type, 'tabs');
        assert.equal(byId('stepper').type, 'stepper');
        assert.equal(byId('bubbleRating').type, 'rating');
        assert.equal(typeof RECIPES.segmentedSlide, 'function');
    });

    it('mountRecipe routes a group META.type to mountUIFXGroup (correct-by-construction)', () => {
        const g = mountRecipe(ctr, 'radioOrbit', { items: ITEMS4, index: 1 });
        assert.ok(Array.isArray(g.els), 'group mount returns els[]');
        assert.equal(g.els.length, 4);
        assert.equal(g.state.index, 1);
        // exercise a few frames so the re-homed recipe ticks against group state
        raf.step(1000); raf.step(1016);
        g.setIndex(3);
        assert.equal(g.state.index, 3);
        g.destroy();
    });

    it('every re-homed group recipe mounts + ticks against real group state', () => {
        for (const id of ['radioOrbit', 'pillTabs', 'segmentedSlide', 'stepper', 'bubbleRating']) {
            const c = makeContainer();
            const g = mountRecipe(c, id, { items: ['1', '2', '3', '4', '5'], index: 2 });
            raf.step(2000); raf.step(2016); raf.step(2032);
            g.setIndex(4);
            g.destroy();
            assert.equal(raf.pending(), 0, id + ' drained its RAF');
        }
    });
});

describe('mountUIFXGroup -- destroy + disabled', () => {
    let ctr;
    beforeEach(() => { ctr = makeContainer(); });

    it('destroy is idempotent, removes the wrapper, drains the RAF', () => {
        const g = mountUIFXGroup(ctr, GroupType.TABS, () => ({ tick() {} }), { items: ['a', 'b', 'c'] });
        assert.equal(ctr.children.length, 1);
        g.destroy();
        g.destroy(); // idempotent
        assert.equal(ctr.children.length, 0, 'wrapper removed');
        assert.equal(raf.pending(), 0);
    });

    it('disabled propagates to every native element + state.disabled', () => {
        const g = mountUIFXGroup(ctr, GroupType.RADIO, () => ({ tick() {} }), { items: ITEMS4, disabled: true });
        for (const r of g.els) assert.equal(r.disabled, true);
        assert.equal(g.state.disabled, true);
        g.destroy();
    });
});
