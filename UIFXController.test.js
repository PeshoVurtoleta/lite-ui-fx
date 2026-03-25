// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _tickAll, _clear } from '@zakkster/lite-ticker';

// ── Mock canvas getContext (jsdom has no canvas support) ──
const mockCtx = {
    scale: vi.fn(), save: vi.fn(), restore: vi.fn(),
    clearRect: vi.fn(), setTransform: vi.fn(), translate: vi.fn(),
    rotate: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    font: '', textAlign: '', textBaseline: '',
    fillText: vi.fn(), strokeText: vi.fn(),
    setLineDash: vi.fn(), strokeRect: vi.fn(),
    drawImage: vi.fn(), roundRect: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    shadowBlur: 0, shadowColor: '',
};

const origCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    const el = origCreateElement(tag);
    if (tag === 'canvas') {
        el.getContext = vi.fn(() => mockCtx);
    }
    return el;
});

import { mountUIFX, UIType } from './UIFXController';

function makeContainer() {
    const el = origCreateElement('div');
    document.body.appendChild(el);
    return el;
}

function recipe(overrides = {}) {
    return () => ({ tick: vi.fn(), ...overrides });
}

describe('mountUIFX', () => {
    let ctr;
    beforeEach(() => {
        ctr = makeContainer();
        _clear();
        vi.clearAllMocks();
    });
    afterEach(() => { ctr.remove(); });

    // ── Construction ──

    it('wrapper has correct dimensions', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe(), { width: 200, height: 50 });
        expect(i.wrapper.style.width).toBe('200px');
        expect(i.wrapper.style.height).toBe('50px');
        i.destroy();
    });

    it('creates <button> for UIType.BUTTON', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        expect(i.el.tagName).toBe('BUTTON');
        expect(i.el.type).toBe('button');
        i.destroy();
    });

    it('creates checkbox for UIType.TOGGLE with role=switch', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        expect(i.el.tagName).toBe('INPUT');
        expect(i.el.type).toBe('checkbox');
        expect(i.el.getAttribute('role')).toBe('switch');
        i.destroy();
    });

    it('creates range for UIType.SLIDER', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        expect(i.el.tagName).toBe('INPUT');
        expect(i.el.type).toBe('range');
        i.destroy();
    });

    it('sets aria-label', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe(), { label: 'Dark mode' });
        expect(i.el.getAttribute('aria-label')).toBe('Dark mode');
        i.destroy();
    });

    it('native element is invisible', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        expect(i.el.style.opacity).toBe('0');
        i.destroy();
    });

    it('canvas blocks no pointer events', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        expect(i.canvas.style.pointerEvents).toBe('none');
        i.destroy();
    });

    // ── Default dimensions ──

    it('button defaults to 160×48', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        expect(i.state.w).toBe(160);
        expect(i.state.h).toBe(48);
        i.destroy();
    });

    it('toggle defaults to 64×36', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        expect(i.state.w).toBe(64);
        expect(i.state.h).toBe(36);
        i.destroy();
    });

    it('slider defaults to 200×28', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        expect(i.state.w).toBe(200);
        expect(i.state.h).toBe(28);
        i.destroy();
    });

    // ── Initial state ──

    it('toggle state starts false', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        expect(i.state.toggled).toBe(false);
        expect(i.state.hover).toBe(false);
        expect(i.state.active).toBe(false);
        expect(i.state.focused).toBe(false);
        i.destroy();
    });

    it('slider val defaults to 0.5', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        expect(i.state.val).toBe(0.5);
        i.destroy();
    });

    it('button val defaults to 0', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        expect(i.state.val).toBe(0);
        i.destroy();
    });

    // ── DPR ──

    it('canvas CSS size includes padding', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe(), { width: 100, height: 40, padding: 20 });
        expect(i.canvas.style.width).toBe('140px');
        expect(i.canvas.style.height).toBe('80px');
        i.destroy();
    });

    // ── Recipe lifecycle ──

    it('calls recipe.init() on mount', () => {
        const init = vi.fn();
        mountUIFX(ctr, UIType.BUTTON, recipe({ init }), { width: 100, height: 40 }).destroy();
        expect(init).toHaveBeenCalledOnce();
    });

    it('calls recipe.tick() each frame', () => {
        const tick = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick }));
        _tickAll(16);
        expect(tick).toHaveBeenCalledOnce();
        _tickAll(16);
        expect(tick).toHaveBeenCalledTimes(2);
        i.destroy();
    });

    it('tick dt is in seconds', () => {
        const tick = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick }));
        _tickAll(16);
        const dt = tick.mock.calls[0][1];
        expect(dt).toBeCloseTo(0.016, 2);
        i.destroy();
    });

    it('stops ticking after destroy', () => {
        const tick = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ tick }));
        _tickAll(16);
        i.destroy();
        _tickAll(16);
        expect(tick).toHaveBeenCalledTimes(1);
    });

    it('calls recipe.destroy() on destroy', () => {
        const destroy = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ destroy }));
        i.destroy();
        expect(destroy).toHaveBeenCalledOnce();
    });

    it('destroy is idempotent', () => {
        const destroy = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ destroy }));
        i.destroy();
        i.destroy();
        expect(destroy).toHaveBeenCalledOnce();
    });

    // ── Toggle events ──

    it('toggle: change updates state.toggled', () => {
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe());
        i.el.checked = true;
        i.el.dispatchEvent(new Event('change'));
        expect(i.state.toggled).toBe(true);
        i.destroy();
    });

    it('toggle: calls recipe.onToggle', () => {
        const onToggle = vi.fn();
        const i = mountUIFX(ctr, UIType.TOGGLE, recipe({ onToggle }));
        i.el.checked = true;
        i.el.dispatchEvent(new Event('change'));
        expect(onToggle).toHaveBeenCalledWith(true, i.state);
        i.destroy();
    });

    // ── Slider events ──

    it('slider: input updates state.val', () => {
        const i = mountUIFX(ctr, UIType.SLIDER, recipe());
        i.el.value = '75';
        i.el.dispatchEvent(new Event('input'));
        expect(i.state.val).toBe(0.75);
        i.destroy();
    });

    it('slider: calls recipe.onDrag', () => {
        const onDrag = vi.fn();
        const i = mountUIFX(ctr, UIType.SLIDER, recipe({ onDrag }));
        i.el.value = '30';
        i.el.dispatchEvent(new Event('input'));
        expect(onDrag).toHaveBeenCalledWith(0.3, expect.any(Number), i.state);
        i.destroy();
    });

    // ── Pointer events ──

    it('pointerdown sets active + calls onClick', () => {
        const onClick = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onClick }));
        i.el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 25 }));
        expect(i.state.active).toBe(true);
        expect(onClick).toHaveBeenCalledOnce();
        i.destroy();
    });

    it('pointerup clears active', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        i.el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 25 }));
        i.el.dispatchEvent(new PointerEvent('pointerup'));
        expect(i.state.active).toBe(false);
        i.destroy();
    });

    it('hover enter/leave', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        i.el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 50, clientY: 25 }));
        expect(i.state.hover).toBe(true);
        i.el.dispatchEvent(new PointerEvent('pointerleave'));
        expect(i.state.hover).toBe(false);
        i.destroy();
    });

    it('calls onHover / onLeave', () => {
        const onHover = vi.fn(), onLeave = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onHover, onLeave }));
        i.el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 50, clientY: 25 }));
        expect(onHover).toHaveBeenCalledOnce();
        i.el.dispatchEvent(new PointerEvent('pointerleave'));
        expect(onLeave).toHaveBeenCalledOnce();
        i.destroy();
    });

    it('focus/blur tracks state.focused', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        i.el.dispatchEvent(new FocusEvent('focus'));
        expect(i.state.focused).toBe(true);
        i.el.dispatchEvent(new FocusEvent('blur'));
        expect(i.state.focused).toBe(false);
        i.destroy();
    });

    // ── Cleanup ──

    it('destroy removes wrapper from DOM', () => {
        const i = mountUIFX(ctr, UIType.BUTTON, recipe());
        expect(ctr.children.length).toBe(1);
        i.destroy();
        expect(ctr.children.length).toBe(0);
    });

    it('events stop after destroy', () => {
        const onClick = vi.fn();
        const i = mountUIFX(ctr, UIType.BUTTON, recipe({ onClick }));
        const el = i.el;
        i.destroy();
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }));
        expect(onClick).not.toHaveBeenCalled();
    });
});
