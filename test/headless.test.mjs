// test/headless.test.mjs
// skinHeadless (E1, decisions/0008): the headless-skin adapter + the four skins.
// Proves fail-closed validation, the painted-attribute -> state observer, the
// value-vs-presence rule, additive host diff + exact restore on destroy, and that
// lite-headless is never imported. node:test only.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer, FakeTicker } from './harness/dom-stub.mjs';

installDom();

const { skinHeadless } = await import('../UIFXController.js');
const {
    SwitchSkin, SliderSkin, ProgressSkin, RatingSkin,
    CheckboxSkin, CheckboxGroupSkin, SelectSkin, MeterSkin, StepsSkin, AccordionSkin, SkeletonSkin,
    HEADLESS_SKINS, SKIN_META, SKIN_NAMES,
} = await import('../UIFXHeadless.js');
const { SwarmToggle } = await import('../UIFXRecipes.js');

// A host element attached to the DOM with a real offset box, as a lite-headless
// primitive would present. Returns { container, host }.
function makeHost(tag = 'button', w = 44, h = 24) {
    const container = makeContainer();
    const host = document.createElement(tag);
    container.appendChild(host);
    host.offsetWidth = w;
    host.offsetHeight = h;
    return { container, host };
}

describe('skinHeadless -- fail-closed validation', () => {
    it('throws on a plain recipe (no headless descriptor)', () => {
        const { host } = makeHost();
        assert.throws(() => skinHeadless(null, SwarmToggle, { host }), /headless-skin recipe/);
    });
    it('throws when options.host is missing', () => {
        assert.throws(() => skinHeadless(null, SwitchSkin, {}), /options\.host must be a DOM element/);
    });
    it('throws when host is detached (no parentNode)', () => {
        const host = document.createElement('button');
        host.offsetWidth = 44; host.offsetHeight = 24;
        assert.throws(() => skinHeadless(null, SwitchSkin, { host }), /attached to the DOM/);
    });
    it('throws on a hijack-only option', () => {
        const { host } = makeHost();
        assert.throws(() => skinHeadless(null, SwitchSkin, { host, width: 100 }), /hijack-only/);
    });
    it('throws with a did-you-mean on an unknown option', () => {
        const { host } = makeHost();
        assert.throws(() => skinHeadless(null, SwitchSkin, { host, tema: 1 }), /unknown option/);
    });
    it('throws when handle is a non-null non-object', () => {
        const { host } = makeHost();
        assert.throws(() => skinHeadless(5, SwitchSkin, { host }), /handle must be/);
    });
    it('throws when recipeFactory is not a function', () => {
        const { host } = makeHost();
        assert.throws(() => skinHeadless(null, {}, { host }), /recipeFactory must be a function/);
    });
    it('accepts a well-formed skin mount and destroys clean', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        assert.equal(typeof skin.destroy, 'function');
        skin.destroy();
    });
});

describe('skinHeadless -- painted attribute -> state (SwitchSkin)', () => {
    it('seeds state from the primitive current attributes at mount', () => {
        const { host } = makeHost();
        host.setAttribute('data-checked', 'true');
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        assert.equal(skin.state.toggled, true, 'seeded checked at mount');
        skin.destroy();
    });
    it('updates state when the primitive paints an attribute (observer)', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        assert.equal(skin.state.toggled, false);
        host.setAttribute('data-checked', 'true');
        assert.equal(skin.state.toggled, true, 'observer drove state on paint');
        host.removeAttribute('data-checked');
        assert.equal(skin.state.toggled, false, 'observer drove state on unpaint');
        skin.destroy();
    });
    it('value-vs-presence: data-checked present (any value != "false") is truthy', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        host.setAttribute('data-checked', '');      // presence form
        assert.equal(skin.state.toggled, true, 'empty value = present = true');
        host.setAttribute('data-checked', 'false'); // explicit false
        assert.equal(skin.state.toggled, false, '"false" = false');
        host.setAttribute('data-checked', 'true');  // value form
        assert.equal(skin.state.toggled, true, '"true" = true');
        skin.destroy();
    });
    it('honours aria-checked and data-disabled', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        host.setAttribute('aria-checked', 'true');
        assert.equal(skin.state.toggled, true);
        host.setAttribute('data-disabled', '');
        assert.equal(skin.state.disabled, true);
        skin.destroy();
    });
    it('optional signal fast path: handle.isChecked() seeds toggled', () => {
        const { host } = makeHost();
        const handle = { isChecked: () => true };
        const skin = skinHeadless(handle, SwitchSkin, { host, driven: true });
        assert.equal(skin.state.toggled, true, 'read() consulted the handle');
        skin.destroy();
    });
});

describe('skinHeadless -- SliderSkin / ProgressSkin / RatingSkin state', () => {
    it('SliderSkin maps aria-valuenow within min/max to 0..1', () => {
        const { host } = makeHost('div', 120, 24);
        host.setAttribute('aria-valuemin', '0');
        host.setAttribute('aria-valuemax', '200');
        host.setAttribute('aria-valuenow', '50');
        const skin = skinHeadless(null, SliderSkin, { host, driven: true });
        assert.equal(skin.state.val, 0.25);
        host.setAttribute('data-dragging', '');
        assert.equal(skin.state.active, true);
        skin.destroy();
    });
    it('ProgressSkin maps value and reads complete/loading', () => {
        const { host } = makeHost('div', 48, 48);
        host.setAttribute('aria-valuemax', '100');
        host.setAttribute('aria-valuenow', '75');
        const skin = skinHeadless(null, ProgressSkin, { host, driven: true });
        assert.equal(skin.state.val, 0.75);
        host.setAttribute('data-loading', '');
        assert.equal(skin.state.indeterminate, true);
        host.setAttribute('data-complete', '');
        assert.equal(skin.state.complete, true);
        skin.destroy();
    });
    it('RatingSkin reads count from aria-valuemax (bounded) and val', () => {
        const { host } = makeHost('div', 120, 24);
        host.setAttribute('aria-valuemax', '5');
        host.setAttribute('aria-valuenow', '3');
        const skin = skinHeadless(null, RatingSkin, { host, driven: true });
        assert.equal(skin.state.count, 5);
        assert.equal(skin.state.val, 0.6);
        skin.destroy();
    });
});

describe('skinHeadless -- placement, additive host diff, exact restore', () => {
    it('inserts the overlay as a sibling right after the host', () => {
        const { container, host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        assert.equal(host.nextSibling, skin.canvas, 'canvas is the host next sibling');
        assert.equal(skin.canvas.parentNode, container);
        skin.destroy();
    });
    it('never writes to the host attribute set (additive-only)', () => {
        const { host } = makeHost();
        host.setAttribute('data-checked', 'true');
        const before = host._attrs.size;
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        host.setAttribute('data-checked', 'false'); // drive it
        skin.tick(16);
        assert.equal(host._attrs.size, before, 'skin added no attribute to the host');
        skin.destroy();
    });
    it('destroy removes the overlay and leaves the host in the DOM', () => {
        const { container, host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        const canvas = skin.canvas;
        skin.destroy();
        assert.equal(canvas.parentNode, null, 'overlay removed');
        assert.equal(host.parentNode, container, 'host still attached');
        assert.equal(container.children.indexOf(canvas), -1, 'overlay gone from parent');
    });
    it('destroy disconnects the observer (no further state updates)', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        skin.destroy();
        host.setAttribute('data-checked', 'true');
        assert.equal(skin.state.toggled, false, 'observer disconnected: state frozen');
    });
    it('does NOT destroy the lite-headless handle', () => {
        const { host } = makeHost();
        let handleDestroyed = false;
        const handle = { isChecked: () => false, destroy: () => { handleDestroyed = true; } };
        const skin = skinHeadless(handle, SwitchSkin, { host, driven: true });
        skin.destroy();
        assert.equal(handleDestroyed, false, 'the caller owns the handle');
    });
    it('destroy is idempotent', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        skin.destroy();
        assert.doesNotThrow(() => skin.destroy());
    });
});

describe('skinHeadless -- driven paint + hijack-only setters', () => {
    it('driven tick paints (records draw calls)', () => {
        const { host } = makeHost();
        host.setAttribute('data-checked', 'true');
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        const ctx = skin.canvas.getContext('2d');
        ctx.record(true);
        skin.tick(16);
        ctx.record(false);
        assert.ok(ctx._log.length > 0, 'the skin painted something');
    });
    it('tick throws when not driven (a caller ticker drives it)', () => {
        const { host } = makeHost();
        const t = new FakeTicker();
        const skin = skinHeadless(null, SwitchSkin, { host, ticker: t });
        assert.throws(() => skin.tick(16), /driven mode/);
        assert.equal(t.size, 1, 'the caller ticker drives one frame');
        skin.destroy();
        assert.equal(t.size, 0, 'destroy removed the frame');
        assert.equal(t.destroyed, false, 'destroy never destroys the caller ticker');
    });
    it('setValue / setChecked are hijack-only (throw)', () => {
        const { host } = makeHost();
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        assert.throws(() => skin.setValue(0.5), /hijack-only/);
        assert.throws(() => skin.setChecked(true), /hijack-only/);
        skin.destroy();
    });
});

describe('headless-skin registry', () => {
    it('SKIN_META has the E1 + E1b skins in order', () => {
        assert.equal(SKIN_META.length, 11);
        assert.deepEqual(SKIN_NAMES.slice(), [
            'switchSkin', 'sliderSkin', 'progressSkin', 'ratingSkin',
            'checkboxSkin', 'checkboxGroupSkin', 'selectSkin', 'meterSkin',
            'stepsSkin', 'accordionSkin', 'skeletonSkin',
        ]);
    });
    it('HEADLESS_SKINS is a null-prototype id -> factory map', () => {
        assert.equal(Object.getPrototypeOf(HEADLESS_SKINS), null);
        assert.equal(HEADLESS_SKINS.switchSkin, SwitchSkin);
        for (const m of SKIN_META) assert.equal(typeof HEADLESS_SKINS[m.id], 'function', m.id);
    });
    it('every skin factory returns a headless descriptor { attrs, read }', () => {
        for (const id of SKIN_NAMES) {
            const r = HEADLESS_SKINS[id]({});
            assert.ok(r.headless && Array.isArray(r.headless.attrs) && r.headless.attrs.length > 0, id + ' attrs');
            assert.equal(typeof r.headless.read, 'function', id + ' read');
            assert.equal(typeof r.tick, 'function', id + ' tick');
        }
    });
});

describe('skinHeadless -- retention across churn', () => {
    it('50 mount/paint/destroy cycles leave no overlay behind and release the observer', () => {
        const { container, host } = makeHost();
        for (let i = 0; i < 50; i++) {
            const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
            host.setAttribute('data-checked', (i & 1) ? 'true' : 'false');
            skin.tick(16);
            skin.destroy();
        }
        // Every overlay was removed on destroy: the container holds only the host.
        assert.equal(container.children.length, 1, 'no overlay canvases accumulated');
        assert.equal(container.children[0], host);
        // A fresh skin seeds from the host's CURRENT painted state, so start from a
        // known-off host; after destroy a further paint must be inert (observer gone).
        host.removeAttribute('data-checked');
        const skin = skinHeadless(null, SwitchSkin, { host, driven: true });
        assert.equal(skin.state.toggled, false, 'seeded off from the current host state');
        skin.destroy();
        host.setAttribute('data-checked', 'true');
        assert.equal(skin.state.toggled, false, 'observer released on destroy');
    });
    it('a caller ticker returns to zero frames after churned mounts, never destroyed', () => {
        const { host } = makeHost();
        const t = new FakeTicker();
        for (let i = 0; i < 20; i++) {
            const skin = skinHeadless(null, SliderSkin, { host, ticker: t });
            skin.destroy();
        }
        assert.equal(t.size, 0, 'no frames retained on the caller ticker');
        assert.equal(t.destroyed, false, 'caller ticker never destroyed');
    });
});

// ---------------------------------------------------------------------------
// E1b (decisions/0009): the select + tri-state pack.
// ---------------------------------------------------------------------------

describe('E1b -- checkbox tri-state (CheckboxSkin / CheckboxGroupSkin)', () => {
    it('CheckboxGroupSkin shares the checkbox tri-state body (one body, two ids)', () => {
        assert.equal(CheckboxGroupSkin, CheckboxSkin);
        assert.equal(HEADLESS_SKINS.checkboxSkin, CheckboxSkin);
        assert.equal(HEADLESS_SKINS.checkboxGroupSkin, CheckboxSkin);
    });
    it('aria-checked value form maps true / false / mixed', () => {
        const { host } = makeHost('span', 24, 24);
        const skin = skinHeadless(null, CheckboxSkin, { host, driven: true });
        host.setAttribute('aria-checked', 'true');
        assert.equal(skin.state.toggled, true);
        assert.equal(skin.state.indeterminate, false);
        host.setAttribute('aria-checked', 'mixed');
        assert.equal(skin.state.indeterminate, true, 'mixed -> indeterminate');
        assert.equal(skin.state.toggled, false, 'mixed is not toggled');
        host.setAttribute('aria-checked', 'false');
        assert.equal(skin.state.toggled, false);
        assert.equal(skin.state.indeterminate, false);
        skin.destroy();
    });
    it('data-* presence pair: data-checked / data-indeterminate', () => {
        const { host } = makeHost('span', 24, 24);
        const skin = skinHeadless(null, CheckboxSkin, { host, driven: true });
        host.setAttribute('data-checked', '');       // presence
        assert.equal(skin.state.toggled, true, 'presence = checked');
        host.setAttribute('data-indeterminate', '');
        assert.equal(skin.state.indeterminate, true, 'presence = mixed');
        assert.equal(skin.state.toggled, false, 'mixed wins over checked');
        skin.destroy();
    });
});

describe('E1b -- select trigger (SelectSkin, resolves item 6)', () => {
    it('aria-expanded drives toggled (open/closed)', () => {
        const { host } = makeHost('button', 120, 32);
        const skin = skinHeadless(null, SelectSkin, { host, driven: true });
        assert.equal(skin.state.toggled, false);
        host.setAttribute('aria-expanded', 'true');
        assert.equal(skin.state.toggled, true, 'open');
        host.setAttribute('aria-expanded', 'false');
        assert.equal(skin.state.toggled, false, 'closed');
        skin.destroy();
    });
    it('handle.value() fast path sets complete when a selection exists', () => {
        const { host } = makeHost('button', 120, 32);
        let val = null;
        const handle = { value: () => val };
        const skin = skinHeadless(handle, SelectSkin, { host, driven: true });
        assert.equal(skin.state.complete, false, 'no selection at mount');
        val = 'apple';
        host.setAttribute('aria-expanded', 'false');   // the close edge re-runs read()
        assert.equal(skin.state.complete, true, 'value() -> complete');
        skin.destroy();
    });
});

describe('E1b -- meter / steps / accordion / skeleton state', () => {
    it('MeterSkin maps value + data-zone (optimum -> complete, low -> error)', () => {
        const { host } = makeHost('div', 120, 16);
        host.setAttribute('aria-valuemax', '100');
        host.setAttribute('aria-valuenow', '40');
        const skin = skinHeadless(null, MeterSkin, { host, driven: true });
        assert.equal(skin.state.val, 0.4);
        host.setAttribute('data-zone', 'optimum');
        assert.equal(skin.state.complete, true);
        assert.equal(skin.state.error, false);
        host.setAttribute('data-zone', 'low');
        assert.equal(skin.state.error, true);
        assert.equal(skin.state.complete, false);
        skin.destroy();
    });
    it('StepsSkin reads count + current index, complete fills all', () => {
        const { host } = makeHost('ol', 200, 20);
        host.setAttribute('data-step-count', '4');
        host.setAttribute('data-current-index', '2');
        const skin = skinHeadless(null, StepsSkin, { host, driven: true });
        assert.equal(skin.state.count, 4);
        assert.equal(skin.state.val, 2);
        host.setAttribute('data-complete', '');
        assert.equal(skin.state.complete, true);
        skin.destroy();
    });
    it('AccordionSkin reads aria-expanded / data-open as toggled', () => {
        const { host } = makeHost('button', 160, 32);
        const skin = skinHeadless(null, AccordionSkin, { host, driven: true });
        host.setAttribute('data-open', '');
        assert.equal(skin.state.toggled, true);
        host.removeAttribute('data-open');
        host.setAttribute('aria-expanded', 'true');
        assert.equal(skin.state.toggled, true);
        skin.destroy();
    });
    it('SkeletonSkin reads data-loading / aria-busy as indeterminate', () => {
        const { host } = makeHost('div', 120, 16);
        host.setAttribute('data-loading', '');
        const skin = skinHeadless(null, SkeletonSkin, { host, driven: true });
        assert.equal(skin.state.indeterminate, true);
        assert.equal(skin.state.complete, false);
        host.removeAttribute('data-loading');
        assert.equal(skin.state.indeterminate, false);
        assert.equal(skin.state.complete, true, 'ready');
        skin.destroy();
    });
});

describe('E1b -- additive host diff + exact restore (every new skin)', () => {
    const CASES = [
        ['checkboxSkin', 'span', 'aria-checked', 'mixed'],
        ['selectSkin', 'button', 'aria-expanded', 'true'],
        ['meterSkin', 'div', 'data-zone', 'low'],
        ['stepsSkin', 'ol', 'data-current-index', '1'],
        ['accordionSkin', 'button', 'data-open', ''],
        ['skeletonSkin', 'div', 'data-loading', ''],
    ];
    for (const [id, tag, attr, val] of CASES) {
        it(id + ' adds no host attribute and restores on destroy', () => {
            const { container, host } = makeHost(tag, 100, 24);
            host.setAttribute(attr, val);
            const before = host._attrs.size;
            const skin = skinHeadless(null, HEADLESS_SKINS[id], { host, driven: true });
            skin.tick(16);
            assert.equal(host._attrs.size, before, id + ' added no host attribute');
            const canvas = skin.canvas;
            skin.destroy();
            assert.equal(canvas.parentNode, null, 'overlay removed');
            assert.equal(host.parentNode, container, 'host intact');
        });
    }
});
