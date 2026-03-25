/**
 * @zakkster/lite-ui-fx — Recipe Collection Vol. 2
 *
 * 20 recipes across 7 UI element categories:
 *   Toggles (4): Pendulum, Circuit, Lightning, DNA
 *   Buttons (5): Heartbeat, Breathing, InkSplash, PixelDissolve, Firework
 *   Sliders (4): Aurora, Wave, ElasticBand, Gravity
 *   Loaders (2): OrbitLoader, HelixLoader
 *   Checkboxes (2): RippleCheck, MorphCheck
 *   Counters (2): FlameCounter, GlitchCounter
 *   Ratings (1): BubbleRating
 *
 * Uses: @zakkster/lite-lerp, @zakkster/lite-random
 */

import { lerp, clamp, easeOut, easeIn, easeInOut } from '@zakkster/lite-lerp';
import { Random } from '@zakkster/lite-random';

// ── Shared helpers ──
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
function label(ctx, text, x, y, color = '#9999b8') {
    ctx.fillStyle = color; ctx.font = "500 9px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.fillText(text, x, y);
}
function focusRing(ctx, w, h, r) {
    ctx.strokeStyle = 'rgba(110,231,182,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    roundRect(ctx, -2, -2, w + 4, h + 4, r + 2); ctx.stroke(); ctx.setLineDash([]);
}


// ═══════════════════════════════════════════════════════════
//  TOGGLES
// ═══════════════════════════════════════════════════════════

/** 1. Pendulum Toggle — The knob swings like a pendulum with overshoot. */
export function PendulumToggle() {
    let angle = -0.4, velocity = 0;
    const STIFFNESS = 12, DAMPING = 3.5;
    return {
        onToggle() { velocity += 8; },
        tick(ctx, dt, now, st) {
            const target = st.toggled ? 0.4 : -0.4;
            velocity += (target - angle) * STIFFNESS * dt;
            velocity *= (1 - DAMPING * dt);
            angle += velocity * dt;

            ctx.fillStyle = st.toggled ? 'rgba(110,231,182,.2)' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2); ctx.fill();

            const cx = st.w / 2, cy = -10, len = st.h / 2 + 14;
            const bx = cx + Math.sin(angle) * len, by = cy + Math.cos(angle) * len;

            ctx.strokeStyle = st.toggled ? 'rgba(110,231,182,.3)' : 'rgba(255,255,255,.08)';
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
            ctx.fillStyle = st.toggled ? '#6ee7b6' : '#9999b8';
            ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14, st.toggled ? '#6ee7b6' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}

/** 2. Circuit Toggle — Electricity flows through a circuit path when ON. */
export function CircuitToggle({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let sparks = [], knobX = 18, flowT = 0;
    return {
        onToggle(checked) {
            if (checked) for (let i = 0; i < 8; i++) sparks.push({ t: rng.range(0, 1), life: 1, speed: rng.range(0.3, 0.8) });
        },
        tick(ctx, dt, now, st) {
            knobX = lerp(knobX, st.toggled ? st.w - 18 : 18, dt * 12);
            flowT = (flowT + dt * 2) % 1;

            ctx.fillStyle = 'rgba(255,255,255,.04)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2); ctx.fill();

            // Circuit path
            ctx.strokeStyle = st.toggled ? '#22d3ee' : 'rgba(255,255,255,.06)';
            ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -flowT * 16;
            ctx.beginPath(); ctx.moveTo(8, st.h / 2); ctx.lineTo(st.w - 8, st.h / 2); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0;

            // Flowing sparks
            if (st.toggled) {
                ctx.fillStyle = '#22d3ee';
                for (let i = sparks.length - 1; i >= 0; i--) {
                    const s = sparks[i];
                    s.t += s.speed * dt; s.life -= dt * 0.5;
                    if (s.life <= 0 || s.t > 1) { sparks.splice(i, 1); continue; }
                    const sx = 8 + s.t * (st.w - 16);
                    ctx.globalAlpha = s.life;
                    ctx.beginPath(); ctx.arc(sx, st.h / 2, 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
                // Continuous spawn
                if (sparks.length < 12) sparks.push({ t: 0, life: 1, speed: rng.range(0.3, 0.8) });
            }

            ctx.fillStyle = st.toggled ? '#22d3ee' : '#9999b8';
            ctx.beginPath(); ctx.arc(knobX, st.h / 2, 12, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14, st.toggled ? '#22d3ee' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}

/** 3. Lightning Toggle — Electric arc between endpoints. */
export function LightningToggle({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let knobX = 18, arcTime = 0;
    function bolt(ctx, x1, y1, x2, y2, depth) {
        if (depth <= 0) { ctx.lineTo(x2, y2); return; }
        const mx = (x1 + x2) / 2 + (rng.next() - 0.5) * 12 * depth;
        const my = (y1 + y2) / 2 + (rng.next() - 0.5) * 8 * depth;
        bolt(ctx, x1, y1, mx, my, depth - 1);
        bolt(ctx, mx, my, x2, y2, depth - 1);
    }
    return {
        tick(ctx, dt, now, st) {
            knobX = lerp(knobX, st.toggled ? st.w - 18 : 18, dt * 14);
            arcTime += dt;

            ctx.fillStyle = st.toggled ? 'rgba(251,191,36,.15)' : 'rgba(255,255,255,.04)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2); ctx.fill();

            if (st.toggled && ((arcTime * 8) | 0) % 3 !== 0) {
                rng.reset(((now / 80) | 0) * 7 + 1);
                ctx.strokeStyle = 'rgba(251,191,36,.7)'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(8, st.h / 2); bolt(ctx, 8, st.h / 2, st.w - 8, st.h / 2, 3); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(8, st.h / 2); bolt(ctx, 8, st.h / 2, st.w - 8, st.h / 2, 3); ctx.stroke();
            }

            ctx.fillStyle = st.toggled ? '#fbbf24' : '#9999b8';
            ctx.beginPath(); ctx.arc(knobX, st.h / 2, 12, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14, st.toggled ? '#fbbf24' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}

/** 4. DNA Toggle — Double helix wraps around the track. */
export function DNAToggle() {
    let knobX = 18, phase = 0;
    return {
        tick(ctx, dt, now, st) {
            knobX = lerp(knobX, st.toggled ? st.w - 18 : 18, dt * 10);
            phase += dt * (st.toggled ? 4 : 1.5);

            ctx.fillStyle = 'rgba(255,255,255,.04)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2); ctx.fill();

            const cy = st.h / 2;
            for (let i = 0; i < 20; i++) {
                const t = i / 20, x = 6 + t * (st.w - 12);
                const y1 = cy + Math.sin(phase + t * Math.PI * 3) * 8;
                const y2 = cy - Math.sin(phase + t * Math.PI * 3) * 8;
                ctx.fillStyle = st.toggled ? `rgba(167,139,250,${0.3 + Math.sin(phase + t * 6) * 0.2})` : 'rgba(255,255,255,.08)';
                ctx.beginPath(); ctx.arc(x, y1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = st.toggled ? `rgba(244,114,182,${0.3 + Math.cos(phase + t * 6) * 0.2})` : 'rgba(255,255,255,.06)';
                ctx.beginPath(); ctx.arc(x, y2, 2, 0, Math.PI * 2); ctx.fill();
                if (i % 3 === 0) {
                    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
                }
            }

            ctx.fillStyle = st.toggled ? '#c084fc' : '#9999b8';
            ctx.beginPath(); ctx.arc(knobX, cy, 12, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14, st.toggled ? '#c084fc' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  BUTTONS
// ═══════════════════════════════════════════════════════════

/** 5. Heartbeat Button — Heart icon pumps with particle burst on click. */
export function HeartbeatButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let scale = 1, particles = [], beatPhase = 0;
    return {
        onClick(x, y) {
            scale = 1.3;
            for (let i = 0; i < 12; i++) {
                const a = rng.range(0, Math.PI * 2), v = rng.range(40, 120);
                particles.push({ x: x || 80, y: y || 24, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 });
            }
        },
        tick(ctx, dt, now, st) {
            scale = lerp(scale, 1, dt * 8);
            beatPhase += dt * 5;
            const pulse = 1 + Math.sin(beatPhase) * 0.03;

            ctx.fillStyle = st.active ? 'rgba(220,20,60,.2)' : 'rgba(220,20,60,.08)';
            roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();

            // Heart shape
            ctx.save(); ctx.translate(st.w / 2, st.h / 2); ctx.scale(scale * pulse, scale * pulse);
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.moveTo(0, 4); ctx.bezierCurveTo(-10, -6, -20, -2, -20, 4);
            ctx.bezierCurveTo(-20, 14, 0, 20, 0, 20);
            ctx.bezierCurveTo(0, 20, 20, 14, 20, 4);
            ctx.bezierCurveTo(20, -2, 10, -6, 0, 4);
            ctx.fill(); ctx.restore();

            // Particles
            ctx.globalCompositeOperation = 'screen';
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 2 * dt;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                ctx.fillStyle = `rgba(255,60,100,${p.life})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 6. Breathing Button — Inhale/exhale pulse with particle halo. */
export function BreathingButton() {
    let phase = 0;
    return {
        tick(ctx, dt, now, st) {
            phase += dt * 1.5;
            const breath = (Math.sin(phase) + 1) / 2; // 0–1
            const radius = 4 + breath * 6;

            // Outer glow
            ctx.shadowBlur = 10 + breath * 15; ctx.shadowColor = `rgba(110,231,182,${0.2 + breath * 0.3})`;
            ctx.fillStyle = `rgba(110,231,182,${0.05 + breath * 0.08})`;
            roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();
            ctx.shadowBlur = 0;

            // Halo ring
            ctx.strokeStyle = `rgba(110,231,182,${0.1 + breath * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(st.w / 2, st.h / 2, st.w / 2 + radius, 0, Math.PI * 2); ctx.stroke();

            ctx.fillStyle = '#6ee7b6';
            ctx.font = "600 12px 'Space Grotesk',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('BREATHE', st.w / 2, st.h / 2);
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 7. Ink Splash Button — Calligraphy ink splatter on click. */
export function InkSplashButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let splats = [], pressScale = 1;
    return {
        onClick(x, y) {
            pressScale = 0.88;
            const cx = x || 80, cy = y || 24;
            for (let i = 0; i < 20; i++) {
                const a = rng.range(0, Math.PI * 2), d = rng.range(5, 35);
                splats.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: rng.range(2, 8), life: 1 });
            }
        },
        tick(ctx, dt, now, st) {
            pressScale = lerp(pressScale, 1, dt * 8);
            ctx.save(); ctx.translate(st.w / 2, st.h / 2); ctx.scale(pressScale, pressScale); ctx.translate(-st.w / 2, -st.h / 2);

            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();
            ctx.fillStyle = '#e2e2f0'; ctx.font = "600 13px 'Space Grotesk',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('INK', st.w / 2, st.h / 2);
            ctx.restore();

            for (let i = splats.length - 1; i >= 0; i--) {
                const s = splats[i]; s.life -= 1.5 * dt;
                if (s.life <= 0) { splats.splice(i, 1); continue; }
                ctx.fillStyle = `rgba(30,30,50,${s.life * 0.7})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r * easeOut(1 - s.life), 0, Math.PI * 2); ctx.fill();
            }
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 8. Pixel Dissolve Button — Hover breaks into floating pixels, reforms on leave. */
export function PixelDissolveButton({ seed = 42, cols = 16, rows = 5 } = {}) {
    const rng = new Random(seed);
    const N = cols * rows;
    const ox = new Float32Array(N), oy = new Float32Array(N);
    const px = new Float32Array(N), py = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N);
    let dissolveT = 0;

    return {
        init(ctx, w, h) {
            const pw = w / cols, ph = h / rows;
            for (let i = 0; i < N; i++) {
                ox[i] = (i % cols) * pw + pw / 2;
                oy[i] = ((i / cols) | 0) * ph + ph / 2;
                px[i] = ox[i]; py[i] = oy[i];
            }
        },
        onHover() { rng.reset(42); for (let i = 0; i < N; i++) { vx[i] = rng.range(-30, 30); vy[i] = rng.range(-30, 30); } },
        tick(ctx, dt, now, st) {
            dissolveT = lerp(dissolveT, st.hover ? 1 : 0, dt * 6);

            ctx.fillStyle = st.hover ? 'rgba(167,139,250,.4)' : 'rgba(255,255,255,.12)';
            const pw = st.w / cols, ph = st.h / rows;

            for (let i = 0; i < N; i++) {
                const tx = ox[i] + vx[i] * dissolveT;
                const ty = oy[i] + vy[i] * dissolveT;
                px[i] = lerp(px[i], tx, dt * 10);
                py[i] = lerp(py[i], ty, dt * 10);
                ctx.globalAlpha = 1 - dissolveT * 0.3;
                ctx.fillRect(px[i] - pw / 2 + 0.5, py[i] - ph / 2 + 0.5, pw - 1, ph - 1);
            }
            ctx.globalAlpha = 1;

            if (dissolveT < 0.3) {
                ctx.fillStyle = '#e2e2f0'; ctx.font = "600 12px 'Space Grotesk',sans-serif";
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.globalAlpha = 1 - dissolveT / 0.3;
                ctx.fillText('DISSOLVE', st.w / 2, st.h / 2);
                ctx.globalAlpha = 1;
            }
            if (st.focused) focusRing(ctx, st.w, st.h, 0);
        },
    };
}

/** 9. Firework Button — Shoots fireworks upward on click. */
export function FireworkButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let rockets = [], sparks = [], pressScale = 1;
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcb'];
    return {
        onClick(x, y, st) {
            pressScale = 0.88;
            rockets.push({ x: x || st.w / 2, y: st.h, vy: -rng.range(150, 250), life: 1, color: rng.pick(colors) });
        },
        tick(ctx, dt, now, st) {
            pressScale = lerp(pressScale, 1, dt * 10);
            ctx.save(); ctx.translate(st.w / 2, st.h / 2); ctx.scale(pressScale, pressScale); ctx.translate(-st.w / 2, -st.h / 2);
            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();
            ctx.fillStyle = '#fbbf24'; ctx.font = "600 13px 'Space Grotesk',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🎆 FIRE', st.w / 2, st.h / 2);
            ctx.restore();

            // Rockets
            for (let i = rockets.length - 1; i >= 0; i--) {
                const r = rockets[i]; r.y += r.vy * dt; r.vy += 80 * dt; r.life -= dt;
                ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fill();
                if (r.life <= 0 || r.y < -20) {
                    for (let j = 0; j < 20; j++) {
                        const a = rng.range(0, Math.PI * 2), v = rng.range(30, 100);
                        sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: r.color });
                    }
                    rockets.splice(i, 1);
                }
            }

            // Sparks
            ctx.globalCompositeOperation = 'screen';
            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; s.life -= 1.5 * dt;
                if (s.life <= 0) { sparks.splice(i, 1); continue; }
                ctx.fillStyle = s.color; ctx.globalAlpha = s.life;
                ctx.beginPath(); ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  SLIDERS
// ═══════════════════════════════════════════════════════════

/** 10. Aurora Slider — Northern lights colors flow along the filled track. */
export function AuroraSlider() {
    let time = 0;
    const colors = ['#6ee7b6', '#38bdf8', '#a78bfa', '#c084fc'];
    return {
        tick(ctx, dt, now, st) {
            time += dt;
            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 12, st.w, 4, 2); ctx.fill();
            const tx = st.val * st.w;
            if (tx > 2) {
                const g = ctx.createLinearGradient(0, 0, tx, 0);
                for (let i = 0; i < 4; i++) {
                    const pos = clamp((i / 3 + Math.sin(time + i) * 0.15), 0, 1);
                    g.addColorStop(pos, colors[i]);
                }
                ctx.fillStyle = g; ctx.shadowBlur = 8; ctx.shadowColor = '#6ee7b6';
                roundRect(ctx, 0, 12, tx, 4, 2); ctx.fill(); ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, 14, 8, 0, Math.PI * 2); ctx.fill();
            label(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 10);
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
    };
}

/** 11. Wave Slider — Audio waveform visualization on the filled track. */
export function WaveSlider({ seed = 42 } = {}) {
    const rng = new Random(seed);
    const bars = new Float32Array(40);
    return {
        init() { for (let i = 0; i < 40; i++) bars[i] = rng.range(0.2, 1); },
        tick(ctx, dt, now, st) {
            ctx.fillStyle = 'rgba(255,255,255,.04)'; roundRect(ctx, 0, 4, st.w, 20, 3); ctx.fill();
            const tx = st.val * st.w, bw = st.w / 40;
            for (let i = 0; i < 40; i++) {
                const bx = i * bw, active = bx < tx;
                const h = bars[i] * 16 * (0.5 + Math.sin(now / 300 + i * 0.3) * 0.3);
                ctx.fillStyle = active ? '#f472b6' : 'rgba(255,255,255,.06)';
                ctx.fillRect(bx + 1, 14 - h / 2, bw - 2, h);
            }
            ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(tx, 14, 8, 0, Math.PI * 2); ctx.fill();
            label(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 10);
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
    };
}

/** 12. Elastic Band Slider — Track rubber-bands ahead of thumb, snaps back. */
export function ElasticBandSlider() {
    let leadX = 0;
    return {
        tick(ctx, dt, now, st) {
            const tx = st.val * st.w;
            leadX = lerp(leadX, tx, dt * 4); // Laggy — creates stretch
            const stretch = (tx - leadX) * 0.3;

            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 12, st.w, 4, 2); ctx.fill();

            // Elastic band (curves toward target)
            ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 14);
            ctx.quadraticCurveTo(leadX + stretch, 14 + stretch * 0.2, tx, 14);
            ctx.stroke();

            ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(tx, 14, 9, 0, Math.PI * 2); ctx.fill();
            label(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 10);
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
    };
}

/** 13. Gravity Slider — Track sags under the weight of the thumb. */
export function GravitySlider() {
    return {
        tick(ctx, dt, now, st) {
            const tx = st.val * st.w, sag = 8;

            // Sagging track (quadratic curve through thumb position)
            ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 14);
            ctx.quadraticCurveTo(tx, 14 + sag, st.w, 14);
            ctx.stroke();

            // Filled portion follows the sag
            ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 14);
            const midSag = sag * (tx / st.w);
            ctx.quadraticCurveTo(tx / 2, 14 + midSag, tx, 14 + sag * Math.sin(Math.PI * st.val));
            ctx.stroke();

            ctx.fillStyle = '#c084fc'; ctx.beginPath();
            ctx.arc(tx, 14 + sag * Math.sin(Math.PI * st.val), 10, 0, Math.PI * 2); ctx.fill();

            label(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 14);
            if (st.focused) focusRing(ctx, st.w, st.h + 8, 4);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  LOADERS (use toggle to start/stop)
// ═══════════════════════════════════════════════════════════

/** 14. Orbit Loader — Planets orbit a sun. Toggle starts/stops. */
export function OrbitLoader() {
    let phase = 0;
    const planets = [
        { r: 14, speed: 2.0, size: 3, color: '#38bdf8' },
        { r: 22, speed: 1.2, size: 2.5, color: '#6ee7b6' },
        { r: 30, speed: 0.7, size: 2, color: '#fbbf24' },
    ];
    return {
        tick(ctx, dt, now, st) {
            if (st.toggled) phase += dt;
            const cx = st.w / 2, cy = st.h / 2;

            // Orbits
            planets.forEach(p => {
                ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI * 2); ctx.stroke();
                const a = phase * p.speed;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(cx + Math.cos(a) * p.r, cy + Math.sin(a) * p.r, p.size, 0, Math.PI * 2); ctx.fill();
            });

            // Sun
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'LOADING...' : 'IDLE', st.w / 2, st.h + 14, st.toggled ? '#fbbf24' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}

/** 15. Helix Loader — DNA double helix spinning. */
export function HelixLoader() {
    let phase = 0;
    return {
        tick(ctx, dt, now, st) {
            if (st.toggled) phase += dt * 4;
            const cx = st.w / 2, cy = st.h / 2;

            for (let i = 0; i < 12; i++) {
                const t = i / 12, a = phase + t * Math.PI * 2;
                const x1 = cx + Math.cos(a) * 16, y1 = cy + Math.sin(a) * 6;
                const x2 = cx - Math.cos(a) * 16, y2 = cy - Math.sin(a) * 6;
                const depth = (Math.sin(a) + 1) / 2;

                ctx.fillStyle = `rgba(167,139,250,${0.2 + depth * 0.6})`;
                ctx.beginPath(); ctx.arc(x1, y1, 2 + depth, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(244,114,182,${0.2 + (1 - depth) * 0.6})`;
                ctx.beginPath(); ctx.arc(x2, y2, 2 + (1 - depth), 0, Math.PI * 2); ctx.fill();

                ctx.strokeStyle = `rgba(255,255,255,${0.03 + depth * 0.04})`;
                ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            }
            label(ctx, st.toggled ? 'PROCESSING' : 'IDLE', st.w / 2, st.h + 14, st.toggled ? '#c084fc' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  CHECKBOXES (use toggle events)
// ═══════════════════════════════════════════════════════════

/** 16. Ripple Checkbox — Material-style ripple ring + morphing checkmark. */
export function RippleCheck() {
    let ripples = [], checkT = 0;
    return {
        onToggle(checked) { if (checked) ripples.push({ r: 0, life: 1 }); },
        tick(ctx, dt, now, st) {
            checkT = lerp(checkT, st.toggled ? 1 : 0, dt * 10);
            const sz = Math.min(st.w, st.h), cx = sz / 2, cy = sz / 2;

            // Box
            ctx.fillStyle = st.toggled ? '#6ee7b6' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, sz, sz, 6); ctx.fill();

            // Ripples
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i]; r.r += 50 * dt; r.life -= 2 * dt;
                if (r.life <= 0) { ripples.splice(i, 1); continue; }
                ctx.strokeStyle = `rgba(110,231,182,${r.life})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r.r, 0, Math.PI * 2); ctx.stroke();
            }

            // Checkmark (animated draw)
            if (checkT > 0.01) {
                ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                ctx.beginPath();
                const p1 = clamp(checkT * 2, 0, 1); // First stroke
                const p2 = clamp(checkT * 2 - 1, 0, 1); // Second stroke
                ctx.moveTo(cx - 7, cy);
                ctx.lineTo(cx - 7 + 7 * p1, cy + 7 * p1);
                if (p2 > 0) ctx.lineTo(cx + 14 * p2, cy + 7 - 14 * p2);
                ctx.stroke(); ctx.lineCap = 'butt';
            }
            label(ctx, st.toggled ? '✓' : '○', sz / 2, sz + 12, st.toggled ? '#6ee7b6' : '#8888aa');
            if (st.focused) focusRing(ctx, sz, sz, 6);
        },
    };
}

/** 17. Morph Checkbox — X morphs into checkmark smoothly. */
export function MorphCheck() {
    let t = 0;
    return {
        tick(ctx, dt, now, st) {
            t = lerp(t, st.toggled ? 1 : 0, dt * 8);
            const sz = Math.min(st.w, st.h), cx = sz / 2, cy = sz / 2;

            ctx.fillStyle = lerp(0.06, 0.15, t) < 0.1 ? 'rgba(255,255,255,.06)' : `rgba(56,189,248,${lerp(0, 0.2, t)})`;
            roundRect(ctx, 0, 0, sz, sz, 6); ctx.fill();

            ctx.strokeStyle = t > 0.5 ? '#38bdf8' : '#9999b8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';

            // Morph: X → checkmark by interpolating endpoints
            const x1a = cx - 8, y1a = cy - 8; // X top-left
            const x1b = cx + 8, y1b = cy + 8; // X bottom-right
            const x2a = cx - 8, y2a = cy + 8; // X bottom-left
            const x2b = cx + 8, y2b = cy - 8; // X top-right

            const c1a = cx - 7, c1b = cy;       // Check start
            const c2a = cx - 2, c2b = cy + 7;   // Check middle
            const c3a = cx + 8, c3b = cy - 6;   // Check end

            ctx.beginPath();
            ctx.moveTo(lerp(x1a, c1a, t), lerp(y1a, c1b, t));
            ctx.lineTo(lerp(x1b, c2a, t), lerp(y1b, c2b, t));
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(lerp(x2a, c2a, t), lerp(y2a, c2b, t));
            ctx.lineTo(lerp(x2b, c3a, t), lerp(y2b, c3b, t));
            ctx.stroke();
            ctx.lineCap = 'butt';

            label(ctx, st.toggled ? '✓' : '✕', sz / 2, sz + 12, st.toggled ? '#38bdf8' : '#8888aa');
            if (st.focused) focusRing(ctx, sz, sz, 6);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  COUNTERS (use slider val as input)
// ═══════════════════════════════════════════════════════════

/** 18. Flame Counter — Number with rising heat particles driven by slider value. */
export function FlameCounter({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let embers = [];
    return {
        tick(ctx, dt, now, st) {
            const val = Math.round(st.val * 999);

            // Spawn embers proportional to value
            if (st.val > 0.1 && embers.length < 60) {
                embers.push({ x: rng.range(20, st.w - 20), y: st.h - 5, vy: -rng.range(20, 60), life: 1, size: rng.range(1, 3) });
            }

            // Background
            ctx.fillStyle = 'rgba(255,255,255,.03)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();

            // Embers
            ctx.globalCompositeOperation = 'screen';
            for (let i = embers.length - 1; i >= 0; i--) {
                const e = embers[i]; e.y += e.vy * dt; e.life -= dt * 0.8;
                if (e.life <= 0) { embers.splice(i, 1); continue; }
                const heat = st.val;
                ctx.fillStyle = `rgba(${200 + heat * 55},${60 + heat * 80},${20},${e.life})`;
                ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';

            // Number
            ctx.fillStyle = st.val > 0.7 ? '#ff6b6b' : st.val > 0.3 ? '#fbbf24' : '#9999b8';
            ctx.font = "700 28px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(val), st.w / 2, st.h / 2);

            label(ctx, 'HEAT', st.w / 2, st.h + 12);
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 19. Glitch Counter — Number glitches and jitters as slider value increases. */
export function GlitchCounter({ seed = 42 } = {}) {
    const rng = new Random(seed);
    return {
        tick(ctx, dt, now, st) {
            const val = Math.round(st.val * 999);
            const intensity = st.val;

            ctx.fillStyle = 'rgba(255,255,255,.03)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();

            // Scanlines
            if (intensity > 0.2) {
                ctx.fillStyle = `rgba(255,255,255,${intensity * 0.03})`;
                for (let y = 0; y < st.h; y += 3) ctx.fillRect(0, y, st.w, 1);
            }

            // Glitched number
            const jx = intensity > 0.5 ? (rng.next() - 0.5) * intensity * 6 : 0;
            const jy = intensity > 0.5 ? (rng.next() - 0.5) * intensity * 4 : 0;

            if (intensity > 0.3 && rng.next() > 0.6) {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = `rgba(255,0,85,${intensity * 0.4})`;
                ctx.font = "700 28px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(String(val), st.w / 2 + jx - 2, st.h / 2 + jy);
                ctx.fillStyle = `rgba(0,255,204,${intensity * 0.4})`;
                ctx.fillText(String(val), st.w / 2 + jx + 2, st.h / 2 + jy);
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.fillStyle = '#e2e2f0';
            ctx.font = "700 28px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(val), st.w / 2 + jx, st.h / 2 + jy);

            label(ctx, 'SIGNAL', st.w / 2, st.h + 12);
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  RATING (uses slider position mapped to 1–5 stars)
// ═══════════════════════════════════════════════════════════

/** 20. Bubble Rating — 5 bubbles inflate based on slider position. Click pops them. */
export function BubbleRating({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let pops = [], sizes = new Float32Array(5);
    return {
        tick(ctx, dt, now, st) {
            const rating = Math.round(st.val * 5);
            const gap = st.w / 5;

            for (let i = 0; i < 5; i++) {
                const active = i < rating;
                const targetSz = active ? 12 : 6;
                sizes[i] = lerp(sizes[i] || 6, targetSz, dt * 8);
                const cx = gap * i + gap / 2, cy = st.h / 2;

                // Bubble
                ctx.fillStyle = active ? `rgba(56,189,248,${0.3 + sizes[i] / 20})` : 'rgba(255,255,255,.05)';
                ctx.beginPath(); ctx.arc(cx, cy, sizes[i], 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = active ? '#38bdf8' : 'rgba(255,255,255,.08)';
                ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, sizes[i], 0, Math.PI * 2); ctx.stroke();

                // Highlight
                if (active) {
                    ctx.fillStyle = 'rgba(255,255,255,.15)';
                    ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Pop particles
            for (let i = pops.length - 1; i >= 0; i--) {
                const p = pops[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 3 * dt;
                if (p.life <= 0) { pops.splice(i, 1); continue; }
                ctx.fillStyle = `rgba(56,189,248,${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();
            }

            label(ctx, `${rating} / 5`, st.w / 2, st.h + 12, rating >= 4 ? '#38bdf8' : '#9999b8');
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
        onDrag(val) {
            const rating = Math.round(val * 5);
            // Pop the newly activated bubble
            const gap = 200 / 5;
            const cx = gap * (rating - 1) + gap / 2;
            for (let j = 0; j < 5; j++) {
                const a = rng.range(0, Math.PI * 2), v = rng.range(20, 50);
                pops.push({ x: cx, y: 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 });
            }
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  EXPORT MAP
// ═══════════════════════════════════════════════════════════

export const UIFXRecipes2 = {
    PendulumToggle, CircuitToggle, LightningToggle, DNAToggle,
    HeartbeatButton, BreathingButton, InkSplashButton, PixelDissolveButton, FireworkButton,
    AuroraSlider, WaveSlider, ElasticBandSlider, GravitySlider,
    OrbitLoader, HelixLoader,
    RippleCheck, MorphCheck,
    FlameCounter, GlitchCounter,
    BubbleRating,
};

export default UIFXRecipes2;
