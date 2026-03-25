/**
 * @zakkster/lite-ui-fx — Recipe Collection
 *
 * 10 canvas-rendered UI component recipes:
 *   Toggles: SwarmToggle, LiquidToggle, NeonPulseToggle
 *   Buttons: MagneticButton, ShatterButton, ConfettiButton, GlitchButton
 *   Sliders: SparkSlider, CosmicSlider, LaserSlider
 *
 * Recipe interface:
 *   {
 *     init?(ctx, w, h, padding)           — allocate state, sprites
 *     tick(ctx, dt, now, state, pointer)   — render every frame (REQUIRED)
 *     onHover?(state, pointer)             — pointer entered element
 *     onLeave?(state, pointer)             — pointer left element
 *     onClick?(x, y, state)               — pointer down on element
 *     onToggle?(checked, state)            — checkbox changed (toggles only)
 *     onDrag?(value, velocity, state)      — slider moved (sliders only)
 *     destroy?()                           — cleanup
 *   }
 *
 * State object (provided by UIFXController):
 *   { hover, active, focused, toggled, val, w, h, padding, dpr }
 *
 * Uses:
 *   @zakkster/lite-lerp    — lerp, clamp, easeOut
 *   @zakkster/lite-random  — deterministic particle effects
 */

import { lerp, clamp, easeOut } from '@zakkster/lite-lerp';
import { Random } from '@zakkster/lite-random';


// ─────────────────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────────────────

/** Draw a rounded rect (safe for Safari < 17.4). */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/** Draw a keyboard focus ring (accessibility indicator). */
function drawFocusRing(ctx, w, h, r) {
    ctx.strokeStyle = 'rgba(110,231,182,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    roundRect(ctx, -2, -2, w + 4, h + 4, r + 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

/** Draw a state label so the user knows the current state. */
function drawStateLabel(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = "500 9px 'JetBrains Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}


// ═══════════════════════════════════════════════════════════
//  TOGGLE RECIPES
// ═══════════════════════════════════════════════════════════

/**
 * Swarm Toggle — 150 particles form the knob shape.
 * On toggle, they explode outward then regroup at the new position.
 * Uses sunflower phyllotaxis for the packed formation.
 */
export function SwarmToggle({ seed = 42, count = 150 } = {}) {
    const rng = new Random(seed);
    const N = count;
    const px = new Float32Array(N), py = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N);
    const ox = new Float32Array(N), oy = new Float32Array(N);

    return {
        init(ctx, w, h) {
            // Sunflower phyllotaxis distribution for the knob shape
            for (let i = 0; i < N; i++) {
                const r = 12 * Math.sqrt(i / N);
                const th = i * Math.PI * (3 - Math.sqrt(5)); // Golden angle
                ox[i] = Math.cos(th) * r;
                oy[i] = Math.sin(th) * r;
                px[i] = 18 + ox[i];
                py[i] = h / 2 + oy[i];
            }
        },

        onToggle(checked) {
            // Explode particles outward
            for (let i = 0; i < N; i++) {
                const a = rng.range(0, Math.PI * 2);
                const f = rng.range(100, 300);
                vx[i] += Math.cos(a) * f;
                vy[i] += Math.sin(a) * f;
            }
        },

        tick(ctx, dt, now, st) {
            // Track
            ctx.fillStyle = st.toggled ? 'rgba(110,231,182,.2)' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2);
            ctx.fill();

            // State label
            drawStateLabel(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14,
                st.toggled ? '#6ee7b6' : '#8888aa');

            // Knob target position
            const tx = st.toggled ? st.w - 18 : 18;

            // Render particles (spring toward formation)
            ctx.fillStyle = st.toggled ? '#6ee7b6' : '#9999b8';
            for (let i = 0; i < N; i++) {
                vx[i] += ((tx + ox[i]) - px[i]) * 15 * dt;
                vy[i] += ((st.h / 2 + oy[i]) - py[i]) * 15 * dt;
                vx[i] *= 0.85;
                vy[i] *= 0.85;
                px[i] += vx[i] * dt;
                py[i] += vy[i] * dt;
                ctx.fillRect(px[i], py[i], 1.5, 1.5);
            }

            if (st.focused) drawFocusRing(ctx, st.w, st.h, st.h / 2);
        },

        destroy() {
            // TypedArrays are GC'd automatically — no manual cleanup needed
        },
    };
}


/**
 * Liquid Toggle — Metaball-style stretching knob.
 * The knob elongates in the direction of motion, squashes perpendicular.
 */
export function LiquidToggle() {
    let knobX = 18;

    return {
        tick(ctx, dt, now, st) {
            const tx = st.toggled ? st.w - 18 : 18;
            knobX = lerp(knobX, tx, dt * 12);
            const stretch = Math.abs(knobX - tx) * 0.5;

            // Track
            ctx.fillStyle = st.toggled ? 'rgba(110,231,182,.2)' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2);
            ctx.fill();

            // Knob (stretched ellipse)
            ctx.fillStyle = st.toggled ? '#6ee7b6' : '#9999b8';
            ctx.beginPath();
            ctx.ellipse(knobX, st.h / 2, 14 + stretch, 14 - stretch * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // State label
            drawStateLabel(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14,
                st.toggled ? '#6ee7b6' : '#8888aa');

            if (st.focused) drawFocusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}


/**
 * Neon Pulse Toggle — Expanding shockwave rings on toggle.
 */
export function NeonPulseToggle() {
    let rings = [];
    let knobX = 18;

    return {
        onToggle(checked) {
            rings.push({ r: 14, life: 1, x: checked ? 46 : 18 });
        },

        tick(ctx, dt, now, st) {
            knobX = lerp(knobX, st.toggled ? st.w - 18 : 18, dt * 15);

            // Track
            ctx.fillStyle = st.toggled ? 'rgba(56,189,248,.2)' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2);
            ctx.fill();

            // Shockwave rings
            for (let i = rings.length - 1; i >= 0; i--) {
                const r = rings[i];
                r.r += 100 * dt;
                r.life -= 2 * dt;
                if (r.life <= 0) { rings.splice(i, 1); continue; }
                ctx.strokeStyle = `rgba(56,189,248,${r.life})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(r.x, st.h / 2, r.r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Knob
            ctx.fillStyle = st.toggled ? '#38bdf8' : '#9999b8';
            ctx.beginPath();
            ctx.arc(knobX, st.h / 2, 14, 0, Math.PI * 2);
            ctx.fill();

            drawStateLabel(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14,
                st.toggled ? '#38bdf8' : '#8888aa');

            if (st.focused) drawFocusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  BUTTON RECIPES
// ═══════════════════════════════════════════════════════════

/**
 * Magnetic Button — The entire button follows the cursor with spring physics.
 * Squashes on click, springs back.
 */
export function MagneticButton({ maxPull = 15 } = {}) {
    let bx = 0, by = 0, textScale = 1;

    return {
        onClick() { textScale = 0.85; },

        tick(ctx, dt, now, st, ptr) {
            const tx = st.hover ? clamp(ptr.x - st.w / 2, -maxPull, maxPull) : 0;
            const ty = st.hover ? clamp(ptr.y - st.h / 2, -maxPull, maxPull) : 0;
            bx = lerp(bx, tx, dt * 10);
            by = lerp(by, ty, dt * 10);
            textScale = lerp(textScale, 1, dt * 10);

            ctx.translate(bx, by);

            // Button body
            ctx.fillStyle = st.hover ? '#1e1e2f' : 'rgba(255,255,255,.05)';
            ctx.strokeStyle = st.hover ? '#a78bfa' : 'rgba(255,255,255,.1)';
            ctx.lineWidth = 1;
            roundRect(ctx, 0, 0, st.w, st.h, 10);
            ctx.fill(); ctx.stroke();

            // Label
            ctx.fillStyle = st.hover ? '#a78bfa' : '#e2e2f0';
            ctx.font = "600 13px 'Space Grotesk',sans-serif";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.translate(st.w / 2, st.h / 2);
            ctx.scale(textScale, textScale);
            ctx.fillText('MAGNETIC', 0, 0);

            if (st.focused) {
                ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
                ctx.translate(st.padding + bx, st.padding + by);
                drawFocusRing(ctx, st.w, st.h, 10);
            }
        },
    };
}


/**
 * Shatter Button — Click explodes into falling shards, reforms after 1.5s.
 */
export function ShatterButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let shards = [];
    let visible = true;
    let respawnTimer = 0;

    return {
        onClick(x, y, st) {
            if (!visible) return;
            visible = false;
            respawnTimer = 1.5;
            for (let i = 0; i < 30; i++) {
                shards.push({
                    x: rng.range(0, st.w), y: rng.range(0, st.h),
                    vx: rng.range(-150, 150), vy: rng.range(-150, 50),
                    r: rng.range(0, 6), vr: rng.range(-5, 5),
                    sz: rng.range(4, 12),
                });
            }
        },

        tick(ctx, dt, now, st) {
            if (respawnTimer > 0) {
                respawnTimer -= dt;
                if (respawnTimer <= 0) visible = true;
            }

            if (visible) {
                ctx.fillStyle = st.active ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.08)';
                roundRect(ctx, 0, 0, st.w, st.h, 10);
                ctx.fill();
                ctx.fillStyle = '#e2e2f0';
                ctx.font = "600 13px 'Space Grotesk',sans-serif";
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('SHATTER', st.w / 2, st.h / 2);

                if (st.focused) drawFocusRing(ctx, st.w, st.h, 10);
            }

            // Falling shards
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            for (let i = shards.length - 1; i >= 0; i--) {
                const s = shards[i];
                s.vy += 400 * dt;
                s.x += s.vx * dt; s.y += s.vy * dt;
                s.r += s.vr * dt;
                ctx.save();
                ctx.translate(s.x, s.y); ctx.rotate(s.r);
                ctx.fillRect(-s.sz / 2, -s.sz / 2, s.sz, s.sz);
                ctx.restore();
                if (s.y > st.h + 100) shards.splice(i, 1);
            }
        },
    };
}


/**
 * Confetti Button — 3D tumbling confetti burst from click point.
 */
export function ConfettiButton({ seed = 42, colors = ['#6ee7b6', '#38bdf8', '#a78bfa', '#fbbf24', '#f43f5e'] } = {}) {
    const rng = new Random(seed);
    let conf = [];
    let pressScale = 1;

    return {
        onClick(x, y) {
            pressScale = 0.85;
            for (let i = 0; i < 40; i++) {
                const a = rng.range(Math.PI, Math.PI * 2);
                const v = rng.range(100, 300);
                conf.push({
                    x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                    c: rng.pick(colors),
                    w: rng.range(4, 8), h: rng.range(8, 14),
                    rx: rng.range(0, Math.PI), ry: rng.range(0, Math.PI),
                    vrx: rng.range(5, 15), vry: rng.range(5, 15),
                });
            }
        },

        tick(ctx, dt, now, st) {
            pressScale = lerp(pressScale, 1, dt * 10);

            ctx.translate(st.w / 2, st.h / 2);
            ctx.scale(pressScale, pressScale);
            ctx.translate(-st.w / 2, -st.h / 2);

            // Button body
            ctx.fillStyle = '#DC143C';
            roundRect(ctx, 0, 0, st.w, st.h, 10);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = "600 13px 'Space Grotesk',sans-serif";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('CONFETTI', st.w / 2, st.h / 2);

            // Tumbling confetti
            for (let i = conf.length - 1; i >= 0; i--) {
                const c = conf[i];
                c.vy += 300 * dt;
                c.x += c.vx * dt; c.y += c.vy * dt;
                c.rx += c.vrx * dt; c.ry += c.vry * dt;
                ctx.save();
                ctx.translate(c.x, c.y); ctx.rotate(c.rx);
                ctx.scale(1, Math.cos(c.ry)); // 3D tumble
                ctx.fillStyle = c.c;
                ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
                ctx.restore();
                if (c.y > st.h + 100) conf.splice(i, 1);
            }

            if (st.focused) {
                ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
                ctx.translate(st.padding, st.padding);
                drawFocusRing(ctx, st.w, st.h, 10);
            }
        },
    };
}


/**
 * Glitch Button — RGB channel split on hover. Random slice displacement.
 */
export function GlitchButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let glitchIntensity = 0;

    return {
        tick(ctx, dt, now, st) {
            glitchIntensity = lerp(glitchIntensity, st.hover ? 1 : 0, dt * 10);

            const drawBase = (ox, oy, color) => {
                ctx.fillStyle = color;
                roundRect(ctx, ox, oy, st.w, st.h, 10);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = "600 13px 'Space Grotesk',sans-serif";
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('GLITCH', st.w / 2 + ox, st.h / 2 + oy);
            };

            if (glitchIntensity > 0.01) {
                ctx.globalCompositeOperation = 'screen';
                const off = rng.range(2, 6) * glitchIntensity;
                // Alternate between split and normal for flicker
                if (rng.next() > 0.4) {
                    drawBase(-off, 0, `rgba(255,0,85,${0.6 * glitchIntensity})`);
                    drawBase(off, 0, `rgba(0,255,204,${0.6 * glitchIntensity})`);
                } else {
                    drawBase(0, 0, 'rgba(255,255,255,.1)');
                }
                ctx.globalCompositeOperation = 'source-over';
            } else {
                drawBase(0, 0, 'rgba(255,255,255,.06)');
            }

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 10);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  SLIDER RECIPES
// ═══════════════════════════════════════════════════════════

/**
 * Spark Slider — Emits directional sparks based on drag velocity.
 * Sparks fly opposite to drag direction with motion-blur stretch.
 */
export function SparkSlider({ seed = 42, color = '#fbbf24' } = {}) {
    const rng = new Random(seed);
    let sparks = [];
    let lastVal = 0.5;

    return {
        onDrag(val) {
            const delta = val - lastVal;
            if (Math.abs(delta) > 0.001) {
                const dir = Math.sign(delta);
                for (let i = 0; i < 4; i++) {
                    sparks.push({
                        x: val * 200, y: 14,
                        vx: -dir * rng.range(100, 300),
                        vy: rng.range(-150, 50),
                        life: 1,
                    });
                }
            }
            lastVal = val;
        },

        tick(ctx, dt, now, st) {
            // Track background
            ctx.fillStyle = 'rgba(255,255,255,.08)';
            roundRect(ctx, 0, 12, st.w, 4, 2);
            ctx.fill();

            // Filled track
            const tx = st.val * st.w;
            ctx.fillStyle = color;
            roundRect(ctx, 0, 12, tx, 4, 2);
            ctx.fill();

            // Thumb
            ctx.beginPath();
            ctx.arc(tx, 14, 10, 0, Math.PI * 2);
            ctx.fill();

            // Value label
            drawStateLabel(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 10, '#9999b8');

            // Sparks
            ctx.globalCompositeOperation = 'screen';
            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i];
                s.vy += 400 * dt;
                s.vx *= 0.95;
                s.x += s.vx * dt; s.y += s.vy * dt;
                s.life -= 2.0 * dt;
                if (s.life <= 0) { sparks.splice(i, 1); continue; }

                // Motion-blur stretch
                ctx.fillStyle = `rgba(251,191,36,${s.life})`;
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(Math.atan2(s.vy, s.vx));
                ctx.fillRect(0, -1, Math.max(3, Math.abs(s.vx) * 0.05), 2);
                ctx.restore();
            }
            ctx.globalCompositeOperation = 'source-over';

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 4);
        },
    };
}


/**
 * Cosmic Slider — Thumb is a black hole that sucks in background dust.
 * Particles respawn when consumed.
 */
export function CosmicSlider({ seed = 42, dustCount = 80 } = {}) {
    const rng = new Random(seed);
    const dust = [];

    return {
        init(ctx, w, h) {
            for (let i = 0; i < dustCount; i++) {
                dust.push({ x: rng.range(0, w), y: rng.range(-10, 34), vx: 0, vy: 0 });
            }
        },

        tick(ctx, dt, now, st) {
            // Track
            ctx.fillStyle = 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 12, st.w, 4, 2);
            ctx.fill();

            const tx = st.val * st.w;

            // Dust particles attracted to thumb
            ctx.fillStyle = '#fff';
            for (const d of dust) {
                const dx = tx - d.x, dy = 14 - d.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 40) {
                    d.vx += (dx / dist) * 200 * dt;
                    d.vy += (dy / dist) * 200 * dt;
                }
                d.vx *= 0.9; d.vy *= 0.9;
                d.x += d.vx * dt; d.y += d.vy * dt;
                if (dist < 5) {
                    d.x = rng.range(0, st.w);
                    d.y = rng.range(-20, 44);
                    d.vx = 0; d.vy = 0;
                }
                ctx.fillRect(d.x, d.y, 1, 1);
            }

            // Black hole thumb with glow
            ctx.shadowBlur = 10; ctx.shadowColor = '#a78bfa';
            ctx.fillStyle = '#000'; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(tx, 14, 12, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;

            drawStateLabel(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 10, '#9999b8');

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 4);
        },
    };
}


/**
 * Laser Slider — Energy beam traces the filled track. Pulsing plasma thumb.
 */
export function LaserSlider() {
    let pulseTime = 0;

    return {
        tick(ctx, dt, now, st) {
            pulseTime += dt * 10;

            // Track background
            ctx.fillStyle = 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 12, st.w, 4, 2);
            ctx.fill();

            const tx = st.val * st.w;

            // Laser beam gradient
            if (tx > 2) {
                const g = ctx.createLinearGradient(0, 0, tx, 0);
                g.addColorStop(0, 'transparent');
                g.addColorStop(0.8, '#38bdf8');
                g.addColorStop(1, '#fff');
                ctx.fillStyle = g;
                ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
                roundRect(ctx, 0, 12, tx, 4, 2);
                ctx.fill();
            }

            // Plasma thumb (pulsing)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(tx, 14, 8 + Math.sin(pulseTime) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            drawStateLabel(ctx, `${Math.round(st.val * 100)}%`, st.w / 2, st.h + 10, '#9999b8');

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 4);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  ALL RECIPES MAP
// ═══════════════════════════════════════════════════════════

export const UIFXRecipes = {
    SwarmToggle, LiquidToggle, NeonPulseToggle,
    MagneticButton, ShatterButton, ConfettiButton, GlitchButton,
    SparkSlider, CosmicSlider, LaserSlider,
};

export default UIFXRecipes;
