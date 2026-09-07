// test/theme.test.mjs
// The U3b theming option surface (decisions/0002): every recipe honours
// { seed, colors, theme, text, font }, resolved in the factory/init. Byte-identical
// defaults are proved by the golden draw-signature oracle and the t3 themed tier;
// this shipped suite is the contract for the option surface itself. node:test only.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { installDom, makeContainer, Ctx2DStub } from './harness/dom-stub.mjs';
import * as raf from './harness/raf-stub.mjs';

installDom();
raf.install();

const { mountUIFX, UIType } = await import('../UIFXController.js');
const { RECIPES, RECIPE_META } = await import('../UIFXRecipes.js');

// The distinct fill/stroke/shadow colour strings a recipe assigns over a short
// scripted drive across idle/hover/active/toggled/drag. Interaction hooks are
// fired (guarded) so spawn paths run.
function colorsOf(id, opts) {
    const ctx = new Ctx2DStub();
    const recipe = RECIPES[id](opts || {});
    const S = new Set();
    if (recipe.init) recipe.init(ctx, 160, 48, 40);
    ctx.record(true);
    for (let i = 0; i < 8; i++) {
        // valid toggles (false<->true edges drive ErrorShake/SuccessBloom) and
        // text varies (PasswordStrength/TypewriterField); non-decorate recipes
        // ignore both fields, so this just gives the decorate recipes a live host.
        const st = { hover: !!(i & 1), active: !!(i & 2), focused: !!(i & 4), toggled: !!(i & 1), indeterminate: !!(i & 2), valid: !(i & 2), text: (i & 1) ? 'Ab7$k9' : '', val: (i % 5) / 4, w: 160, h: 48, padding: 40, dpr: 1 };
        const ptr = { x: 80, y: 24, vx: 6, vy: 0 };
        if (recipe.onDrag) recipe.onDrag(st.val, ptr.vx, st);
        if (recipe.onClick) recipe.onClick(ptr.x, ptr.y, st);
        if (recipe.onToggle) recipe.onToggle(!!(i & 1), st);
        ctx.clearLog();
        recipe.tick(ctx, 0.016, i * 16, st, ptr);
        for (const e of ctx._log) {
            if (e.startsWith('fillStyle=') || e.startsWith('strokeStyle=') || e.startsWith('shadowColor=')) S.add(e);
        }
    }
    ctx.record(false);
    return S;
}
const has = (set, needle) => {
    for (const c of set) if (c.indexOf(needle) !== -1) return true;
    return false;
};

const THEME = { theme: { light: '#ff00aa', mid: '#00ffaa', dark: '#0a0a12' } };

describe('U3b theming -- RECIPE_META flags', () => {
    it('themeable is true for all 56 recipes', () => {
        for (const m of RECIPE_META) assert.equal(m.themeable, true, m.id + ' should be themeable');
    });
    it('motionSafe stays false for all 56 (reduced motion is a later pass)', () => {
        for (const m of RECIPE_META) assert.equal(m.motionSafe, false, m.id + ' motionSafe');
    });
});

describe('U3b theming -- every recipe honours a theme', () => {
    for (const m of RECIPE_META) {
        it(m.id + ' recolours under a theme', () => {
            const base = colorsOf(m.id);
            const themed = colorsOf(m.id, THEME);
            let changed = false;
            for (const c of themed) if (!base.has(c)) { changed = true; break; }
            assert.ok(changed, m.id + ' produced no new colour under a theme');
        });
    }
});

describe('U3b theming -- precedence + legacy aliases', () => {
    it('colors wins over theme (positional accent override)', () => {
        const themed = colorsOf('neonPulseToggle', {
            theme: { light: '#111111', mid: '#222222', dark: '#333333' }, colors: ['#abcdef'],
        });
        assert.ok(has(themed, '#abcdef'), 'colors[0] should override theme.light on the accent');
    });
    it('ConfettiButton still accepts its legacy `colors` palette', () => {
        const cols = colorsOf('confettiButton', { colors: ['#0b0b0b', '#0c0c0c'] });
        assert.ok(has(cols, '#0b0b0b') || has(cols, '#0c0c0c'), 'confetti particles used the custom palette');
    });
    it('SparkSlider still accepts its legacy `color`', () => {
        const cols = colorsOf('sparkSlider', { color: '#0d0d0d' });
        assert.ok(has(cols, '#0d0d0d'), 'sparkSlider `color` should drive the accent');
    });
});

describe('U3b theming -- controller validators fail closed', () => {
    const ctr = makeContainer();
    const bad = {
        'partial theme': { theme: { light: '#fff' } },
        'theme extra key': { theme: { light: '#fff', mid: '#fff', dark: '#fff', x: 'y' } },
        'theme non-string value': { theme: { light: 1, mid: '#fff', dark: '#fff' } },
        'theme non-object': { theme: 'red' },
        'colors non-array': { colors: '#fff' },
        'colors non-string element': { colors: ['#fff', 2] },
        'text non-string': { text: 5 },
        'font non-string': { font: {} },
        'seed non-finite': { seed: Infinity },
        'unknown key (did-you-mean)': { fribble: 1 },
    };
    for (const [name, opts] of Object.entries(bad)) {
        it('throws on ' + name, () => {
            assert.throws(() => mountUIFX(ctr, UIType.BUTTON, RECIPES.magneticButton, opts));
        });
    }
    it('accepts a well-formed theming option set', () => {
        const inst = mountUIFX(ctr, UIType.BUTTON, RECIPES.magneticButton, {
            theme: { light: '#fff', mid: '#aaa', dark: '#111' }, text: 'Go', font: '12px monospace', seed: 7,
        });
        inst.destroy();
    });
});

describe('U3b theming -- label-in-name', () => {
    function drawnText(opts) {
        const ctx = new Ctx2DStub();
        const recipe = RECIPES.magneticButton(opts || {});
        const st = { hover: true, active: false, focused: false, toggled: false, val: 0.5, w: 160, h: 48, padding: 40, dpr: 1 };
        if (recipe.init) recipe.init(ctx, st.w, st.h, st.padding);
        ctx.record(true);
        recipe.tick(ctx, 0.016, 16, st, { x: 80, y: 24, vx: 0, vy: 0 });
        ctx.record(false);
        for (const e of ctx._log) if (e.indexOf('fillText=') === 0) return e.slice(9);
        return null;
    }
    it('a bare mount paints the recipe default', () => assert.equal(drawnText(), 'MAGNETIC'));
    it('`label` drives the visible canvas text', () => assert.equal(drawnText({ label: 'Save' }), 'Save'));
    it('`text` overrides `label`', () => assert.equal(drawnText({ text: 'Go', label: 'Save' }), 'Go'));
    it('a button exposes the label as its accessible name (textContent)', () => {
        const ctr = makeContainer();
        const inst = mountUIFX(ctr, UIType.BUTTON, RECIPES.magneticButton, { label: 'Save' });
        assert.equal(inst.el.textContent, 'Save');
        inst.destroy();
    });
});
