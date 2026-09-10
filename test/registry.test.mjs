// test/registry.test.mjs
// The RECIPES / RECIPE_META / registerRecipe / mountRecipe surface. Ported from
// LiteScratchFX/test/registry.test.mjs, swapping scratch-fx's `category` for this
// package's `type` + `family` and mountRecipe's fail-closed contract.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer, emitReducedMotion } from './harness/dom-stub.mjs';
import * as raf from './harness/raf-stub.mjs';

installDom();
raf.install();

const {
    RECIPES, RECIPE_NAMES, RECIPE_META, registerRecipe, mountRecipe, SwarmToggle,
} = await import('../UIFXRecipes.js');

let container;
beforeEach(() => { container = makeContainer(); });

describe('recipe registry + metadata', () => {
    it('RECIPES has a null prototype: no Object.prototype key bleed', () => {
        assert.equal(Object.getPrototypeOf(RECIPES), null);
        assert.equal(RECIPES['toString'], undefined);
        assert.equal(RECIPES['hasOwnProperty'], undefined);
        assert.equal(RECIPES['constructor'], undefined);
    });

    it('RECIPE_NAMES is frozen and has 65 entries at load', () => {
        assert.equal(Object.isFrozen(RECIPE_NAMES), true);
        assert.equal(RECIPE_NAMES.length, 65);
    });

    it('every meta row resolves to a factory (bijection at load)', () => {
        for (const name of RECIPE_NAMES) {
            assert.equal(typeof RECIPES[name], 'function', name + ' has no factory');
        }
        for (let i = 0; i < 50; i++) {
            const m = RECIPE_META[i];
            assert.equal(typeof RECIPES[m.id], 'function', m.id + ' meta row has no factory');
        }
    });

    it('SwarmToggle is exported and registered as swarmToggle', () => {
        assert.equal(typeof SwarmToggle, 'function');
        assert.equal(RECIPES.swarmToggle, SwarmToggle);
    });

    it('registerRecipe adds a usable recipe with defaulted metadata', () => {
        function SparkleBurst() { return { tick() {} }; }
        registerRecipe('sparkleBurst', SparkleBurst, { type: 'button' });
        assert.equal(RECIPES.sparkleBurst, SparkleBurst);
        const meta = RECIPE_META.find((m) => m.id === 'sparkleBurst');
        assert.ok(meta, 'meta not added');
        assert.equal(meta.name, 'Sparkle Burst'); // de-camelCased default
        assert.equal(meta.type, 'button');
        assert.equal(meta.family, 'custom');       // default family
        assert.equal(meta.themeable, false);
        assert.equal(meta.motionSafe, false);
    });

    it('overriding a built-in updates the row IN PLACE (no length growth) and merges meta', () => {
        const lenBefore = RECIPE_META.length;
        const idx = RECIPE_META.findIndex((m) => m.id === 'swarmToggle');
        const prev = RECIPE_META[idx];
        assert.equal(prev.type, 'toggle');
        assert.equal(prev.family, 'Toggles');

        const original = RECIPES.swarmToggle;
        const custom = () => ({ tick() {} });
        // Override with ONLY name -> type/family/flags preserved from the prior row.
        registerRecipe('swarmToggle', custom, { name: 'Custom Swarm' });

        assert.equal(RECIPE_META.length, lenBefore, 'override must not grow the array');
        const after = RECIPE_META.find((m) => m.id === 'swarmToggle');
        assert.equal(after.name, 'Custom Swarm');  // provided
        assert.equal(after.type, 'toggle');        // preserved from prev
        assert.equal(after.family, 'Toggles');     // preserved from prev
        assert.equal(RECIPES.swarmToggle, custom);

        // Restore for the rest of the suite / other test processes.
        registerRecipe('swarmToggle', original, { name: 'Swarm Toggle', type: 'toggle', family: 'Toggles' });
        assert.equal(RECIPES.swarmToggle, original);
    });

    it('meta fallback: name/type/family/flags -> provided -> prev -> default', () => {
        function Calm() { return { tick() {} }; }
        // brand-new: defaults
        registerRecipe('calmTest', Calm, { type: 'button' });
        let meta = RECIPE_META.find((m) => m.id === 'calmTest');
        assert.equal(meta.name, 'Calm Test');
        assert.equal(meta.family, 'custom');
        assert.equal(meta.motionSafe, false);

        // honoured when explicitly given
        registerRecipe('calmTest', Calm, { type: 'button', motionSafe: true, family: 'Zen' });
        meta = RECIPE_META.find((m) => m.id === 'calmTest');
        assert.equal(meta.motionSafe, true);
        assert.equal(meta.family, 'Zen');

        // preserved-from-prev when omitted on override
        registerRecipe('calmTest', Calm, { name: 'Calm Renamed' });
        meta = RECIPE_META.find((m) => m.id === 'calmTest');
        assert.equal(meta.name, 'Calm Renamed');
        assert.equal(meta.motionSafe, true, 'motionSafe preserved from prior entry');
        assert.equal(meta.family, 'Zen', 'family preserved from prior entry');
    });

    it('registerRecipe rejects bad arguments (TypeError)', () => {
        assert.throws(() => registerRecipe('', () => ({ tick() {} })), TypeError);
        assert.throws(() => registerRecipe(42, () => ({ tick() {} })), TypeError);
        assert.throws(() => registerRecipe(null, () => ({ tick() {} })), TypeError);
        assert.throws(() => registerRecipe('x', null), TypeError);
        assert.throws(() => registerRecipe('x', {}), TypeError);
    });

    it('registerRecipe requires a valid type (fail closed, no partial registration)', () => {
        // No type, no prior entry -> throw, and RECIPES must NOT be mutated.
        assert.throws(() => registerRecipe('noType', () => ({ tick() {} })), TypeError);
        assert.equal(RECIPES.noType, undefined, 'rejected registration must not mutate RECIPES');
        // An explicit but invalid type -> throw ('gauge' is not a UIType; knob and
        // progress became real in U4a, and 'decorate' became a valid routing tag in
        // U4b, so the invalid example must stay unreal).
        assert.throws(() => registerRecipe('gaugey', () => ({ tick() {} }), { type: 'gauge' }), TypeError);
        assert.equal(RECIPES.gaugey, undefined);
    });

    it("accepts 'decorate' as a valid type (U4b routing tag), then restores", () => {
        // decisions/0004: 'decorate' is the one non-UIType tag VALID_META_TYPES admits.
        function Deco() { return { tick() {} }; }
        registerRecipe('decoTest', Deco, { type: 'decorate' });
        const meta = RECIPE_META.find((m) => m.id === 'decoTest');
        assert.ok(meta && meta.type === 'decorate', "registerRecipe accepts type 'decorate'");
    });
});

describe('mountRecipe fail-closed', () => {
    it('unknown id throws naming the nearest known id (did-you-mean)', () => {
        assert.throws(
            () => mountRecipe(container, 'swrmToggle'),
            (e) => e instanceof Error && /swarmToggle/.test(e.message),
            'unknown id must name swarmToggle',
        );
    });

    it('options.type mismatching meta.type throws', () => {
        assert.throws(
            () => mountRecipe(container, 'sparkSlider', { type: 'toggle' }),
            (e) => e instanceof Error && /slider/.test(e.message),
            'slider recipe with toggle type must throw',
        );
    });

    it('happy path mounts exactly one wrapper and destroy() cleans up', () => {
        const inst = mountRecipe(container, 'sparkSlider');
        assert.equal(container.children.length, 1, 'one wrapper mounted');
        assert.ok(inst && typeof inst.destroy === 'function');
        inst.destroy();
        assert.equal(container.children.length, 0, 'wrapper removed on destroy');
        assert.equal(raf.pending(), 0, 'raf pending returns to 0');
    });

    it('options.type matching meta.type mounts (type consumed, not forwarded)', () => {
        const inst = mountRecipe(container, 'sparkSlider', { type: 'slider' });
        assert.equal(container.children.length, 1);
        inst.destroy();
        assert.equal(container.children.length, 0);
    });

    it("a 'decorate' recipe routes through decorateUIFX (mounted AROUND the host, not inside it)", () => {
        // For a decorate recipe, mountRecipe's first arg is the LIVE host to
        // decorate; the overlay is added as a sibling, not a child of the host.
        const host = document.createElement('input');
        host.offsetWidth = 200; host.offsetHeight = 28;
        container.appendChild(host);
        const before = container.children.length;    // host present
        const inst = mountRecipe(host, 'focusHalo');
        assert.equal(inst.el, host, 'decorate returns the host element');
        assert.equal(container.children.length, before + 1, 'overlay added as a sibling of the host');
        inst.destroy();
        assert.equal(container.children.length, before, 'overlay removed on destroy (host untouched)');
        assert.equal(raf.pending(), 0, 'raf pending returns to 0');
    });
});

describe('mountRecipe reduced-motion advisory (U5)', () => {
    function warnCount(fn) {
        const orig = console.warn;
        let n = 0, msg = '';
        console.warn = (...a) => { n++; msg = String(a[0]); };
        try { fn(); } finally { console.warn = orig; }
        return { n, msg };
    }

    it('warns (not throws) mounting a motionSafe:false recipe under active reduce', () => {
        emitReducedMotion(true);
        let inst;
        const { n, msg } = warnCount(() => { inst = mountRecipe(container, 'liquidToggle'); });
        emitReducedMotion(false);
        assert.equal(n, 1, 'exactly one advisory warning');
        assert.match(msg, /reduced motion/i, 'the warning explains why');
        inst.destroy();
    });

    it('does NOT warn for a motionSafe recipe under reduce (it has a calm path)', () => {
        emitReducedMotion(true);
        let inst;
        const { n } = warnCount(() => { inst = mountRecipe(container, 'swarmToggle'); });
        emitReducedMotion(false);
        assert.equal(n, 0, 'a calm-path recipe never warns');
        inst.destroy();
    });

    it('does NOT warn when the user does not prefer reduced motion', () => {
        let inst;
        const { n } = warnCount(() => { inst = mountRecipe(container, 'liquidToggle'); });
        assert.equal(n, 0, 'no warning without active reduce');
        inst.destroy();
    });
});

describe('boundary matrix (QA U2)', () => {
    it('mountRecipe with a non-string id (number 42) fails closed with a clean did-you-mean', () => {
        assert.throws(
            () => mountRecipe(container, 42),
            (e) => e instanceof Error && /unknown recipe/.test(e.message),
            'numeric id must throw a clean "unknown recipe" message',
        );
        assert.equal(container.children.length, 0, 'nothing mounted for a numeric id');
    });

    it('mountRecipe with a null id fails closed with a clean "unknown recipe" message', () => {
        // Regression for the QA finding: the null-id path used to throw an internal
        // TypeError ("Cannot read properties of null (reading 'length')") from the
        // did-you-mean helper. It now returns the same clean message every other
        // bad id gets, and never that internal leak.
        assert.throws(
            () => mountRecipe(container, null),
            (e) => e instanceof Error && /unknown recipe/.test(e.message)
                && !/reading 'length'/.test(e.message),
            'null id must throw the clean message, not an internal TypeError',
        );
        assert.equal(container.children.length, 0, 'nothing mounted for a null id');
    });

    it('mountRecipe("__proto__") throws (no Object.prototype bleed via id)', () => {
        assert.throws(() => mountRecipe(container, '__proto__'), Error);
        assert.equal(container.children.length, 0);
    });

    it('mountRecipe("constructor") throws (no Object.prototype bleed via id)', () => {
        assert.throws(() => mountRecipe(container, 'constructor'), Error);
        assert.equal(container.children.length, 0);
    });

    it('overriding swarmToggle preserves its meta.type end-to-end through mountRecipe ' +
        '(picker liveness, not just RECIPE_META inspection)', () => {
        const original = RECIPES.swarmToggle;
        let ticked = false;
        const replacement = () => ({ tick() { ticked = true; } });
        registerRecipe('swarmToggle', replacement, { name: 'X' });
        try {
            const inst = mountRecipe(container, 'swarmToggle');
            assert.equal(container.children.length, 1, 'override still mounts');
            assert.equal(RECIPES.swarmToggle, replacement, 'override in effect');
            inst.destroy();
            assert.equal(container.children.length, 0);
        } finally {
            // Restore for the rest of the suite / other test processes.
            registerRecipe('swarmToggle', original, {
                name: 'Swarm Toggle', type: 'toggle', family: 'Toggles',
            });
            assert.equal(RECIPES.swarmToggle, original, 'swarmToggle restored');
        }
    });

    it('registerRecipe with an invalid/absent type leaves RECIPES and RECIPE_META untouched', () => {
        const lenBefore = RECIPE_META.length;

        assert.throws(() => registerRecipe('qaNoType', () => ({ tick() {} })), TypeError);
        assert.equal(RECIPES.qaNoType, undefined, 'no-type registration must not mutate RECIPES');
        assert.equal(RECIPE_META.length, lenBefore, 'no-type registration must not grow RECIPE_META');
        assert.equal(RECIPE_META.find((m) => m.id === 'qaNoType'), undefined);

        assert.throws(
            () => registerRecipe('qaBadType', () => ({ tick() {} }), { type: 'gauge' }),
            TypeError,
        );
        assert.equal(RECIPES.qaBadType, undefined, 'invalid-type registration must not mutate RECIPES');
        assert.equal(RECIPE_META.length, lenBefore, 'invalid-type registration must not grow RECIPE_META');
        assert.equal(RECIPE_META.find((m) => m.id === 'qaBadType'), undefined);
    });
});
