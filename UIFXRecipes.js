/**
 * @zakkster/lite-ui-fx -- Recipe Collection (all 50)
 *
 * The three recipe volumes consolidated into one shipped, typed, versioned
 * module, exposed as the ./recipes subpath export. See
 * decisions/0001-recipes-position.md.
 *
 *   Vol.1 (10): SwarmToggle, LiquidToggle, NeonPulseToggle, MagneticButton,
 *               ShatterButton, ConfettiButton, GlitchButton, SparkSlider,
 *               CosmicSlider, LaserSlider
 *   Vol.2 (20): PendulumToggle, CircuitToggle, LightningToggle, DNAToggle,
 *               HeartbeatButton, BreathingButton, InkSplashButton,
 *               PixelDissolveButton, FireworkButton, AuroraSlider, WaveSlider,
 *               ElasticBandSlider, GravitySlider, OrbitLoader, HelixLoader,
 *               RippleCheck, MorphCheck, FlameCounter, GlitchCounter, BubbleRating
 *   Vol.3 (20): VolumeKnob, CompassKnob, RingProgress, BatteryGauge, SignalMeter,
 *               PillTabs, Stepper, RadioOrbit, PasswordStrength, WaterLevel,
 *               HeatMap, DayNightToggle, ReactionPicker, NotificationBell,
 *               TypewriterField, SoundWaveBtn, UploadProgress, ScratchReveal,
 *               TimerCountdown, PullRefresh
 *
 * Registry: RECIPES (null-prototype), RECIPE_META (live), RECIPE_NAMES,
 * registerRecipe(id, factory, meta?), mountRecipe(container, id, options?).
 *
 * Recipe bodies are VERBATIM from the three volumes -- no behaviour change.
 *
 * Uses:
 *   @zakkster/lite-lerp    -- lerp, clamp, easeOut, easeIn, easeInOut
 *   @zakkster/lite-random  -- deterministic particle effects
 */

import { lerp, clamp, easeOut, easeIn, easeInOut } from '@zakkster/lite-lerp';
import { Random } from '@zakkster/lite-random';
import { mountUIFX, UIType } from './UIFXController.js';


// ---------------------------------------------------------
//  SHARED COLD CONSTANTS (U3) -- built once at module load, never per frame
// ---------------------------------------------------------

// Focus-ring dash patterns: one shared array each, so a focused frame's
// setLineDash() reuses them instead of allocating a fresh array (U-03).
const DASH_FOCUS = [4, 3];
const DASH_NONE = [];

// Percentage readouts '0%'..'100%', precomputed so a value label is a const
// lookup -- PCT[Math.round(st.val * 100)] -- not a per-frame template build.
const PCT = Array.from({ length: 101 }, (_, i) => i + '%');


// ---------------------------------------------------------
//  SHARED HELPERS
// ---------------------------------------------------------

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
    ctx.setLineDash(DASH_FOCUS);
    roundRect(ctx, -2, -2, w + 4, h + 4, r + 2);
    ctx.stroke();
    ctx.setLineDash(DASH_NONE);
}

/** Draw a state label so the user knows the current state. font defaults to the
 *  historical literal, so an omitted font renders exactly as before. */
function drawStateLabel(ctx, text, x, y, color, font) {
    ctx.fillStyle = color;
    ctx.font = font || "500 9px 'JetBrains Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}

function label(ctx, text, x, y, color = '#9999b8', font) {
    ctx.fillStyle = color; ctx.font = font || "500 9px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.fillText(text, x, y);
}
function focusRing(ctx, w, h, r) {
    ctx.strokeStyle = 'rgba(110,231,182,.5)'; ctx.lineWidth = 2; ctx.setLineDash(DASH_FOCUS);
    roundRect(ctx, -2, -2, w + 4, h + 4, r + 2); ctx.stroke(); ctx.setLineDash(DASH_NONE);
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.arcTo(x+w,y,x+w,y+r,r);c.lineTo(x+w,y+h-r);c.arcTo(x+w,y+h,x+w-r,y+h,r);c.lineTo(x+r,y+h);c.arcTo(x,y+h,x,y+h-r,r);c.lineTo(x,y+r);c.arcTo(x,y,x+r,y,r);c.closePath()}
function lbl(c,t,x,y,col='#9999b8',font){c.fillStyle=col;c.font=font||"500 9px 'JetBrains Mono',monospace";c.textAlign='center';c.fillText(t,x,y)}
function fr(c,w,h,r){c.strokeStyle='rgba(110,231,182,.5)';c.lineWidth=2;c.setLineDash(DASH_FOCUS);rr(c,-2,-2,w+4,h+4,r+2);c.stroke();c.setLineDash(DASH_NONE)}
const PI2=Math.PI*2;



// ===========================================================
//  TOGGLE RECIPES
// ===========================================================

/**
 * Swarm Toggle -- 150 particles form the knob shape.
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
            // TypedArrays are GC'd automatically -- no manual cleanup needed
        },
    };
}


/**
 * Liquid Toggle -- Metaball-style stretching knob.
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
 * Neon Pulse Toggle -- Expanding shockwave rings on toggle.
 */
export function NeonPulseToggle() {
    // Fixed ring pool (dead when life <= 0) -- no push/splice on the hot path.
    const RINGS = 8;
    const ringR = new Float64Array(RINGS);
    const ringLife = new Float64Array(RINGS);
    const ringX = new Float64Array(RINGS);
    let knobX = 18;
    let lastW = 64; // last track width, so onToggle (which gets no state) can
    //                place a ring at the knob position derived from st.w (U-05).

    function spawnRing(x) {
        for (let i = 0; i < RINGS; i++) {
            if (ringLife[i] <= 0) { ringR[i] = 14; ringLife[i] = 1; ringX[i] = x; return; }
        }
    }

    return {
        onToggle(checked) {
            spawnRing(checked ? lastW - 18 : 18);
        },

        tick(ctx, dt, now, st) {
            lastW = st.w;
            knobX = lerp(knobX, st.toggled ? st.w - 18 : 18, dt * 15);

            // Track
            ctx.fillStyle = st.toggled ? 'rgba(56,189,248,.2)' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2);
            ctx.fill();

            // Shockwave rings -- const stroke color, per-ring alpha via globalAlpha
            // (was `rgba(56,189,248,${life})` built per ring per frame).
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            for (let i = 0; i < RINGS; i++) {
                if (ringLife[i] <= 0) continue;
                ringR[i] += 100 * dt;
                ringLife[i] -= 2 * dt;
                if (ringLife[i] <= 0) continue;
                ctx.globalAlpha = ringLife[i];
                ctx.beginPath();
                ctx.arc(ringX[i], st.h / 2, ringR[i], 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

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


// ===========================================================
//  BUTTON RECIPES
// ===========================================================

/**
 * Magnetic Button -- The entire button follows the cursor with spring physics.
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
 * Shatter Button -- Click explodes into falling shards, reforms after 1.5s.
 */
export function ShatterButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    // Fixed shard pool (live flag) -- no push/splice on the hot path.
    const SHARDS = 32;
    const shard = [];
    for (let i = 0; i < SHARDS; i++) shard[i] = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, sz: 0, live: false };
    let visible = true;
    let respawnTimer = 0;

    return {
        onClick(x, y, st) {
            if (!visible) return;
            visible = false;
            respawnTimer = 1.5;
            let n = 0;
            for (let i = 0; i < SHARDS && n < 30; i++) {
                const s = shard[i];
                if (s.live) continue;
                s.x = rng.range(0, st.w); s.y = rng.range(0, st.h);
                s.vx = rng.range(-150, 150); s.vy = rng.range(-150, 50);
                s.r = rng.range(0, 6); s.vr = rng.range(-5, 5);
                s.sz = rng.range(4, 12); s.live = true;
                n++;
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

            // Falling shards -- fixed pool
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            for (let i = 0; i < SHARDS; i++) {
                const s = shard[i];
                if (!s.live) continue;
                s.vy += 400 * dt;
                s.x += s.vx * dt; s.y += s.vy * dt;
                s.r += s.vr * dt;
                ctx.save();
                ctx.translate(s.x, s.y); ctx.rotate(s.r);
                ctx.fillRect(-s.sz / 2, -s.sz / 2, s.sz, s.sz);
                ctx.restore();
                if (s.y > st.h + 100) s.live = false;
            }
        },
    };
}


/**
 * Confetti Button -- 3D tumbling confetti burst from click point.
 */
export function ConfettiButton({ seed = 42, colors = ['#6ee7b6', '#38bdf8', '#a78bfa', '#fbbf24', '#f43f5e'] } = {}) {
    const rng = new Random(seed);
    // Fixed confetti pool (live flag) -- no push/splice on the hot path.
    const CONF = 80;
    const conf = [];
    for (let i = 0; i < CONF; i++) conf[i] = { x: 0, y: 0, vx: 0, vy: 0, c: '#fff', w: 0, h: 0, rx: 0, ry: 0, vrx: 0, vry: 0, live: false };
    let pressScale = 1;

    return {
        onClick(x, y) {
            pressScale = 0.85;
            let n = 0;
            for (let i = 0; i < CONF && n < 40; i++) {
                const c = conf[i];
                if (c.live) continue;
                const a = rng.range(Math.PI, Math.PI * 2);
                const v = rng.range(100, 300);
                c.x = x; c.y = y; c.vx = Math.cos(a) * v; c.vy = Math.sin(a) * v;
                c.c = rng.pick(colors);
                c.w = rng.range(4, 8); c.h = rng.range(8, 14);
                c.rx = rng.range(0, Math.PI); c.ry = rng.range(0, Math.PI);
                c.vrx = rng.range(5, 15); c.vry = rng.range(5, 15);
                c.live = true;
                n++;
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

            // Tumbling confetti -- fixed pool
            for (let i = 0; i < CONF; i++) {
                const c = conf[i];
                if (!c.live) continue;
                c.vy += 300 * dt;
                c.x += c.vx * dt; c.y += c.vy * dt;
                c.rx += c.vrx * dt; c.ry += c.vry * dt;
                ctx.save();
                ctx.translate(c.x, c.y); ctx.rotate(c.rx);
                ctx.scale(1, Math.cos(c.ry)); // 3D tumble
                ctx.fillStyle = c.c;
                ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
                ctx.restore();
                if (c.y > st.h + 100) c.live = false;
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
 * Glitch Button -- RGB channel split on hover. Random slice displacement.
 */
export function GlitchButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let glitchIntensity = 0;

    // Hoisted out of tick (was a per-frame arrow closure). Body alpha via
    // globalAlpha (was two `rgba(...,${intensity})` templates); label at full.
    function drawBase(ctx, st, ox, oy, color, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        roundRect(ctx, ox, oy, st.w, st.h, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = "600 13px 'Space Grotesk',sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('GLITCH', st.w / 2 + ox, st.h / 2 + oy);
    }

    return {
        tick(ctx, dt, now, st) {
            glitchIntensity = lerp(glitchIntensity, st.hover ? 1 : 0, dt * 10);

            if (glitchIntensity > 0.01) {
                ctx.globalCompositeOperation = 'screen';
                const off = rng.range(2, 6) * glitchIntensity;
                // Alternate between split and normal for flicker
                if (rng.next() > 0.4) {
                    drawBase(ctx, st, -off, 0, '#ff0055', 0.6 * glitchIntensity);
                    drawBase(ctx, st, off, 0, '#00ffcc', 0.6 * glitchIntensity);
                } else {
                    drawBase(ctx, st, 0, 0, 'rgba(255,255,255,.1)', 1);
                }
                ctx.globalCompositeOperation = 'source-over';
            } else {
                drawBase(ctx, st, 0, 0, 'rgba(255,255,255,.06)', 1);
            }

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 10);
        },
    };
}


// ===========================================================
//  SLIDER RECIPES
// ===========================================================

/**
 * Spark Slider -- Emits directional sparks based on drag velocity.
 * Sparks fly opposite to drag direction with motion-blur stretch.
 */
export function SparkSlider({ seed = 42, color = '#fbbf24' } = {}) {
    const rng = new Random(seed);
    // Fixed spark pool (life <= 0 == dead) -- no push/splice on the hot path.
    const SPARKS = 64;
    const spark = [];
    for (let i = 0; i < SPARKS; i++) spark[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    let lastVal = 0.5;
    let lastW = 200; // last track width, so onDrag (no state) spawns at the
    //                 thumb position derived from st.w (was hardcoded val*200).
    function spawn(val, dir) {
        for (let i = 0; i < SPARKS; i++) {
            const s = spark[i];
            if (s.life <= 0) {
                s.x = val * lastW; s.y = 14;
                s.vx = -dir * rng.range(100, 300); s.vy = rng.range(-150, 50); s.life = 1;
                return;
            }
        }
    }

    return {
        onDrag(val) {
            const delta = val - lastVal;
            if (Math.abs(delta) > 0.001) {
                const dir = Math.sign(delta);
                for (let i = 0; i < 4; i++) spawn(val, dir);
            }
            lastVal = val;
        },

        tick(ctx, dt, now, st) {
            lastW = st.w;
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
            drawStateLabel(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 10, '#9999b8');

            // Sparks -- fixed pool, themed color, alpha via globalAlpha
            // (was `rgba(251,191,36,${life})` built per spark per frame).
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = color;
            for (let i = 0; i < SPARKS; i++) {
                const s = spark[i];
                if (s.life <= 0) continue;
                s.vy += 400 * dt;
                s.vx *= 0.95;
                s.x += s.vx * dt; s.y += s.vy * dt;
                s.life -= 2.0 * dt;
                if (s.life <= 0) continue;
                ctx.globalAlpha = s.life;
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(Math.atan2(s.vy, s.vx));
                ctx.fillRect(0, -1, Math.max(3, Math.abs(s.vx) * 0.05), 2);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 4);
        },
    };
}


/**
 * Cosmic Slider -- Thumb is a black hole that sucks in background dust.
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

            // Dust particles attracted to thumb (indexed loop -- for..of over an
            // array can allocate an iterator on the hot path)
            ctx.fillStyle = '#fff';
            for (let di = 0; di < dust.length; di++) {
                const d = dust[di];
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

            drawStateLabel(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 10, '#9999b8');

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 4);
        },
    };
}


/**
 * Laser Slider -- Energy beam traces the filled track. Pulsing plasma thumb.
 */
export function LaserSlider() {
    const REF = 100;          // gradient reference width; scaled to tx at paint
    let pulseTime = 0, beam = null;

    return {
        init(ctx) {
            // Fixed-stop beam gradient built once (0..REF). Scaling the space to
            // tx/REF at fill maps it to 0..tx with the white tip at the thumb --
            // no per-frame createLinearGradient.
            beam = ctx.createLinearGradient(0, 0, REF, 0);
            beam.addColorStop(0, 'transparent');
            beam.addColorStop(0.8, '#38bdf8');
            beam.addColorStop(1, '#fff');
        },
        tick(ctx, dt, now, st) {
            pulseTime += dt * 10;

            // Track background
            ctx.fillStyle = 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 12, st.w, 4, 2);
            ctx.fill();

            const tx = st.val * st.w;

            // Laser beam (gradient from init, scaled to 0..tx)
            if (tx > 2) {
                ctx.save();
                ctx.scale(tx / REF, 1);
                ctx.fillStyle = beam || '#38bdf8';
                ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
                roundRect(ctx, 0, 12, REF, 4, 2);
                ctx.fill();
                ctx.restore();
            }

            // Plasma thumb (pulsing) -- keep the glow the beam left on
            ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(tx, 14, 8 + Math.sin(pulseTime) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            drawStateLabel(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 10, '#9999b8');

            if (st.focused) drawFocusRing(ctx, st.w, st.h, 4);
        },
    };
}


// ===========================================================
//  TOGGLES
// ===========================================================

/** 1. Pendulum Toggle -- The knob swings like a pendulum with overshoot. */
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

/** 2. Circuit Toggle -- Electricity flows through a circuit path when ON. */
export function CircuitToggle({ seed = 42 } = {}) {
    const rng = new Random(seed);
    // Fixed spark pool (life <= 0 == dead) -- no push/splice on the hot path.
    const SPARKS = 16;
    const spark = [];
    for (let i = 0; i < SPARKS; i++) spark[i] = { t: 0, life: 0, speed: 0 };
    const DASH_FLOW = [4, 4]; // one shared dash array, reused every frame
    let knobX = 18, flowT = 0;

    function spawn(t) {
        for (let i = 0; i < SPARKS; i++) {
            const s = spark[i];
            if (s.life <= 0) { s.t = t; s.life = 1; s.speed = rng.range(0.3, 0.8); return; }
        }
    }

    return {
        onToggle(checked) {
            if (checked) for (let i = 0; i < 8; i++) spawn(rng.range(0, 1));
        },
        tick(ctx, dt, now, st) {
            knobX = lerp(knobX, st.toggled ? st.w - 18 : 18, dt * 12);
            flowT = (flowT + dt * 2) % 1;

            ctx.fillStyle = 'rgba(255,255,255,.04)';
            roundRect(ctx, 0, 0, st.w, st.h, st.h / 2); ctx.fill();

            // Circuit path
            ctx.strokeStyle = st.toggled ? '#22d3ee' : 'rgba(255,255,255,.06)';
            ctx.lineWidth = 2; ctx.setLineDash(DASH_FLOW); ctx.lineDashOffset = -flowT * 16;
            ctx.beginPath(); ctx.moveTo(8, st.h / 2); ctx.lineTo(st.w - 8, st.h / 2); ctx.stroke();
            ctx.setLineDash(DASH_NONE); ctx.lineDashOffset = 0;

            // Flowing sparks -- fixed pool, per-spark alpha via globalAlpha
            if (st.toggled) {
                ctx.fillStyle = '#22d3ee';
                let alive = 0;
                for (let i = 0; i < SPARKS; i++) {
                    const s = spark[i];
                    if (s.life <= 0) continue;
                    s.t += s.speed * dt; s.life -= dt * 0.5;
                    if (s.life <= 0 || s.t > 1) { s.life = 0; continue; }
                    alive++;
                    const sx = 8 + s.t * (st.w - 16);
                    ctx.globalAlpha = s.life;
                    ctx.beginPath(); ctx.arc(sx, st.h / 2, 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
                // Continuous spawn
                if (alive < 12) spawn(0);
            }

            ctx.fillStyle = st.toggled ? '#22d3ee' : '#9999b8';
            ctx.beginPath(); ctx.arc(knobX, st.h / 2, 12, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'ON' : 'OFF', st.w / 2, st.h + 14, st.toggled ? '#22d3ee' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}

/** 3. Lightning Toggle -- Electric arc between endpoints. */
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

/** 4. DNA Toggle -- Double helix wraps around the track. */
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
                // Const strand colors, per-dot alpha via globalAlpha (was two
                // `rgba(...,${...})` templates built per dot per frame).
                if (st.toggled) {
                    ctx.fillStyle = '#a78bfa'; ctx.globalAlpha = 0.3 + Math.sin(phase + t * 6) * 0.2;
                    ctx.beginPath(); ctx.arc(x, y1, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#f472b6'; ctx.globalAlpha = 0.3 + Math.cos(phase + t * 6) * 0.2;
                    ctx.beginPath(); ctx.arc(x, y2, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,.08)';
                    ctx.beginPath(); ctx.arc(x, y1, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,.06)';
                    ctx.beginPath(); ctx.arc(x, y2, 2, 0, Math.PI * 2); ctx.fill();
                }
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


// ===========================================================
//  BUTTONS
// ===========================================================

/** 5. Heartbeat Button -- Heart icon pumps with particle burst on click. */
export function HeartbeatButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    // Fixed particle pool (life <= 0 == dead) -- no push/splice on the hot path.
    const PARTS = 32;
    const part = [];
    for (let i = 0; i < PARTS; i++) part[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    let scale = 1, beatPhase = 0;
    function spawn(x, y) {
        for (let i = 0; i < PARTS; i++) {
            const p = part[i];
            if (p.life <= 0) {
                const a = rng.range(0, Math.PI * 2), v = rng.range(40, 120);
                p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.life = 1;
                return;
            }
        }
    }
    return {
        onClick(x, y) {
            scale = 1.3;
            for (let i = 0; i < 12; i++) spawn(x || 80, y || 24);
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

            // Particles -- fixed pool, const color, alpha via globalAlpha
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ff3c64';
            for (let i = 0; i < PARTS; i++) {
                const p = part[i];
                if (p.life <= 0) continue;
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 2 * dt;
                if (p.life <= 0) continue;
                ctx.globalAlpha = p.life;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 6. Breathing Button -- Inhale/exhale pulse with particle halo. */
export function BreathingButton() {
    // Alpha-graded green LUT (same RGB #6ee7b6, quantized alpha) built once, so
    // the pulsing glow is a const-string lookup instead of three
    // `rgba(110,231,182,${...})` templates per frame. shadowColor's alpha is not
    // globalAlpha, so a LUT (not globalAlpha) is the zero-alloc fit here.
    const GREEN = [];
    for (let i = 0; i <= 64; i++) GREEN[i] = 'rgba(110,231,182,' + (i / 64).toFixed(3) + ')';
    function greenA(a) { const i = a <= 0 ? 0 : a >= 1 ? 64 : (a * 64) | 0; return GREEN[i]; }
    let phase = 0;
    return {
        tick(ctx, dt, now, st) {
            phase += dt * 1.5;
            const breath = (Math.sin(phase) + 1) / 2; // 0--1
            const radius = 4 + breath * 6;

            // Outer glow
            ctx.shadowBlur = 10 + breath * 15; ctx.shadowColor = greenA(0.2 + breath * 0.3);
            ctx.fillStyle = greenA(0.05 + breath * 0.08);
            roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();
            ctx.shadowBlur = 0;

            // Halo ring
            ctx.strokeStyle = greenA(0.1 + breath * 0.2);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(st.w / 2, st.h / 2, st.w / 2 + radius, 0, Math.PI * 2); ctx.stroke();

            ctx.fillStyle = '#6ee7b6';
            ctx.font = "600 12px 'Space Grotesk',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('BREATHE', st.w / 2, st.h / 2);
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 7. Ink Splash Button -- Calligraphy ink splatter on click. */
export function InkSplashButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    // Fixed splat pool (life <= 0 == dead).
    const SPLATS = 32;
    const splat = [];
    for (let i = 0; i < SPLATS; i++) splat[i] = { x: 0, y: 0, r: 0, life: 0 };
    let pressScale = 1;
    function spawn(cx, cy) {
        for (let i = 0; i < SPLATS; i++) {
            const s = splat[i];
            if (s.life <= 0) {
                const a = rng.range(0, Math.PI * 2), d = rng.range(5, 35);
                s.x = cx + Math.cos(a) * d; s.y = cy + Math.sin(a) * d; s.r = rng.range(2, 8); s.life = 1;
                return;
            }
        }
    }
    return {
        onClick(x, y) {
            pressScale = 0.88;
            const cx = x || 80, cy = y || 24;
            for (let i = 0; i < 20; i++) spawn(cx, cy);
        },
        tick(ctx, dt, now, st) {
            pressScale = lerp(pressScale, 1, dt * 8);
            ctx.save(); ctx.translate(st.w / 2, st.h / 2); ctx.scale(pressScale, pressScale); ctx.translate(-st.w / 2, -st.h / 2);

            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();
            ctx.fillStyle = '#e2e2f0'; ctx.font = "600 13px 'Space Grotesk',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('INK', st.w / 2, st.h / 2);
            ctx.restore();

            // Splats -- fixed pool, const color, alpha via globalAlpha
            ctx.fillStyle = '#1e1e32';
            for (let i = 0; i < SPLATS; i++) {
                const s = splat[i];
                if (s.life <= 0) continue;
                s.life -= 1.5 * dt;
                if (s.life <= 0) continue;
                ctx.globalAlpha = s.life * 0.7;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r * easeOut(1 - s.life), 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 8. Pixel Dissolve Button -- Hover breaks into floating pixels, reforms on leave. */
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

/** 9. Firework Button -- Shoots fireworks upward on click. */
export function FireworkButton({ seed = 42 } = {}) {
    const rng = new Random(seed);
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcb'];
    // Fixed pools (life <= 0 == dead) -- no push/splice on the hot path.
    const ROCKETS = 16, SPARKS = 256;
    const rocket = [];
    for (let i = 0; i < ROCKETS; i++) rocket[i] = { x: 0, y: 0, vy: 0, life: 0, color: '#fff' };
    const spark = [];
    for (let i = 0; i < SPARKS; i++) spark[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff' };
    let pressScale = 1;

    function spawnRocket(x, y) {
        for (let i = 0; i < ROCKETS; i++) {
            const r = rocket[i];
            if (r.life <= 0) { r.x = x; r.y = y; r.vy = -rng.range(150, 250); r.life = 1; r.color = rng.pick(colors); return; }
        }
    }
    function spawnSpark(x, y, color) {
        for (let i = 0; i < SPARKS; i++) {
            const s = spark[i];
            if (s.life <= 0) {
                const a = rng.range(0, Math.PI * 2), v = rng.range(30, 100);
                s.x = x; s.y = y; s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v; s.life = 1; s.color = color;
                return;
            }
        }
    }

    return {
        onClick(x, y, st) {
            pressScale = 0.88;
            spawnRocket(x || st.w / 2, st.h);
        },
        tick(ctx, dt, now, st) {
            pressScale = lerp(pressScale, 1, dt * 10);
            ctx.save(); ctx.translate(st.w / 2, st.h / 2); ctx.scale(pressScale, pressScale); ctx.translate(-st.w / 2, -st.h / 2);
            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();
            ctx.fillStyle = '#fbbf24'; ctx.font = "600 13px 'Space Grotesk',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('\u{1F386} FIRE', st.w / 2, st.h / 2);
            ctx.restore();

            // Rockets -- fixed pool; on death, burst into sparks
            for (let i = 0; i < ROCKETS; i++) {
                const r = rocket[i];
                if (r.life <= 0) continue;
                r.y += r.vy * dt; r.vy += 80 * dt; r.life -= dt;
                ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fill();
                if (r.life <= 0 || r.y < -20) {
                    for (let j = 0; j < 20; j++) spawnSpark(r.x, r.y, r.color);
                    r.life = 0;
                }
            }

            // Sparks -- fixed pool, const color per spark, alpha via globalAlpha
            ctx.globalCompositeOperation = 'screen';
            for (let i = 0; i < SPARKS; i++) {
                const s = spark[i];
                if (s.life <= 0) continue;
                s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; s.life -= 1.5 * dt;
                if (s.life <= 0) continue;
                ctx.fillStyle = s.color; ctx.globalAlpha = s.life;
                ctx.beginPath(); ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}


// ===========================================================
//  SLIDERS
// ===========================================================

/** 10. Aurora Slider -- Northern lights colors flow along the filled track. */
export function AuroraSlider() {
    const REF = 100, PHASES = 12;
    const colors = ['#6ee7b6', '#38bdf8', '#a78bfa', '#c084fc'];
    let time = 0;
    // The shimmer animated the gradient stops per frame. Pre-build one gradient
    // per animation phase in init (all 0..REF) and cycle them by time; scale to
    // tx/REF at paint. Bounded, const set -> no per-frame createLinearGradient.
    const beams = [];
    return {
        init(ctx) {
            for (let p = 0; p < PHASES; p++) {
                const t = p / PHASES * PI2;
                const g = ctx.createLinearGradient(0, 0, REF, 0);
                for (let i = 0; i < 4; i++) {
                    const pos = clamp(i / 3 + Math.sin(t + i) * 0.15, 0, 1);
                    g.addColorStop(pos, colors[i]);
                }
                beams[p] = g;
            }
        },
        tick(ctx, dt, now, st) {
            time += dt;
            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 12, st.w, 4, 2); ctx.fill();
            const tx = st.val * st.w;
            if (tx > 2) {
                const beam = beams[((time * 2) | 0) % PHASES] || beams[0];
                ctx.save();
                ctx.scale(tx / REF, 1);
                ctx.fillStyle = beam; ctx.shadowBlur = 8; ctx.shadowColor = '#6ee7b6';
                roundRect(ctx, 0, 12, REF, 4, 2); ctx.fill();
                ctx.restore();
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, 14, 8, 0, Math.PI * 2); ctx.fill();
            label(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 10);
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
    };
}

/** 11. Wave Slider -- Audio waveform visualization on the filled track. */
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
            label(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 10);
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
    };
}

/** 12. Elastic Band Slider -- Track rubber-bands ahead of thumb, snaps back. */
export function ElasticBandSlider() {
    let leadX = 0;
    return {
        tick(ctx, dt, now, st) {
            const tx = st.val * st.w;
            leadX = lerp(leadX, tx, dt * 4); // Laggy -- creates stretch
            const stretch = (tx - leadX) * 0.3;

            ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 0, 12, st.w, 4, 2); ctx.fill();

            // Elastic band (curves toward target)
            ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 14);
            ctx.quadraticCurveTo(leadX + stretch, 14 + stretch * 0.2, tx, 14);
            ctx.stroke();

            ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(tx, 14, 9, 0, Math.PI * 2); ctx.fill();
            label(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 10);
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
    };
}

/** 13. Gravity Slider -- Track sags under the weight of the thumb. */
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

            label(ctx, PCT[Math.round(st.val * 100)], st.w / 2, st.h + 14);
            if (st.focused) focusRing(ctx, st.w, st.h + 8, 4);
        },
    };
}


// ===========================================================
//  LOADERS (use toggle to start/stop)
// ===========================================================

/** 14. Orbit Loader -- Planets orbit a sun. Toggle starts/stops. */
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

            // Orbits (plain loop -- forEach's arrow was a per-frame closure alloc)
            for (let i = 0; i < planets.length; i++) {
                const p = planets[i];
                ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI * 2); ctx.stroke();
                const a = phase * p.speed;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(cx + Math.cos(a) * p.r, cy + Math.sin(a) * p.r, p.size, 0, Math.PI * 2); ctx.fill();
            }

            // Sun
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
            label(ctx, st.toggled ? 'LOADING...' : 'IDLE', st.w / 2, st.h + 14, st.toggled ? '#fbbf24' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}

/** 15. Helix Loader -- DNA double helix spinning. */
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

                // Const strand colors, per-node alpha via globalAlpha (was three
                // `rgba(...,${...})` templates per node per frame).
                ctx.fillStyle = '#a78bfa'; ctx.globalAlpha = 0.2 + depth * 0.6;
                ctx.beginPath(); ctx.arc(x1, y1, 2 + depth, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f472b6'; ctx.globalAlpha = 0.2 + (1 - depth) * 0.6;
                ctx.beginPath(); ctx.arc(x2, y2, 2 + (1 - depth), 0, Math.PI * 2); ctx.fill();

                ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.03 + depth * 0.04;
                ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            label(ctx, st.toggled ? 'PROCESSING' : 'IDLE', st.w / 2, st.h + 14, st.toggled ? '#c084fc' : '#8888aa');
            if (st.focused) focusRing(ctx, st.w, st.h, st.h / 2);
        },
    };
}


// ===========================================================
//  CHECKBOXES (use toggle events)
// ===========================================================

/** 16. Ripple Checkbox -- Material-style ripple ring + morphing checkmark. */
export function RippleCheck() {
    // Fixed ripple pool (life <= 0 == dead) -- no push/splice on the hot path.
    const RIPPLES = 8;
    const ripR = new Float64Array(RIPPLES);
    const ripLife = new Float64Array(RIPPLES);
    let checkT = 0;
    function spawn() {
        for (let i = 0; i < RIPPLES; i++) {
            if (ripLife[i] <= 0) { ripR[i] = 0; ripLife[i] = 1; return; }
        }
    }
    return {
        onToggle(checked) { if (checked) spawn(); },
        tick(ctx, dt, now, st) {
            checkT = lerp(checkT, st.toggled ? 1 : 0, dt * 10);
            const sz = Math.min(st.w, st.h), cx = sz / 2, cy = sz / 2;

            // Box
            ctx.fillStyle = st.toggled ? '#6ee7b6' : 'rgba(255,255,255,.06)';
            roundRect(ctx, 0, 0, sz, sz, 6); ctx.fill();

            // Ripples -- fixed pool, const color, alpha via globalAlpha
            ctx.strokeStyle = '#6ee7b6'; ctx.lineWidth = 2;
            for (let i = 0; i < RIPPLES; i++) {
                if (ripLife[i] <= 0) continue;
                ripR[i] += 50 * dt; ripLife[i] -= 2 * dt;
                if (ripLife[i] <= 0) continue;
                ctx.globalAlpha = ripLife[i];
                ctx.beginPath(); ctx.arc(cx, cy, ripR[i], 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1;

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
            label(ctx, st.toggled ? '\u2713' : '\u25CB', sz / 2, sz + 12, st.toggled ? '#6ee7b6' : '#8888aa');
            if (st.focused) focusRing(ctx, sz, sz, 6);
        },
    };
}

/** 17. Morph Checkbox -- X morphs into checkmark smoothly. */
export function MorphCheck() {
    let t = 0;
    return {
        tick(ctx, dt, now, st) {
            t = lerp(t, st.toggled ? 1 : 0, dt * 8);
            const sz = Math.min(st.w, st.h), cx = sz / 2, cy = sz / 2;

            // Box bg: faint white early, blue (alpha via globalAlpha) as t rises.
            if (lerp(0.06, 0.15, t) < 0.1) {
                ctx.fillStyle = 'rgba(255,255,255,.06)';
                roundRect(ctx, 0, 0, sz, sz, 6); ctx.fill();
            } else {
                ctx.fillStyle = '#38bdf8'; ctx.globalAlpha = lerp(0, 0.2, t);
                roundRect(ctx, 0, 0, sz, sz, 6); ctx.fill();
                ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = t > 0.5 ? '#38bdf8' : '#9999b8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';

            // Morph: X -> checkmark by interpolating endpoints
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

            label(ctx, st.toggled ? '\u2713' : '\u2715', sz / 2, sz + 12, st.toggled ? '#38bdf8' : '#8888aa');
            if (st.focused) focusRing(ctx, sz, sz, 6);
        },
    };
}


// ===========================================================
//  COUNTERS (use slider val as input)
// ===========================================================

/** 18. Flame Counter -- Number with rising heat particles driven by slider value. */
export function FlameCounter({ seed = 42 } = {}) {
    const rng = new Random(seed);
    // Fixed ember pool + heat-color LUT (rgb quantized by value), so neither the
    // pool nor the per-ember color allocates. The number string is rebuilt only
    // when the displayed integer changes.
    const EMBERS = 64;
    const ember = [];
    for (let i = 0; i < EMBERS; i++) ember[i] = { x: 0, y: 0, vy: 0, life: 0, size: 0 };
    const HEAT = [];
    for (let i = 0; i <= 32; i++) HEAT[i] = 'rgb(' + Math.round(200 + (i / 32) * 55) + ',' + Math.round(60 + (i / 32) * 80) + ',20)';
    let numStr = '0', lastNum = -1;
    function spawn(st) {
        for (let i = 0; i < EMBERS; i++) {
            const e = ember[i];
            if (e.life <= 0) { e.x = rng.range(20, st.w - 20); e.y = st.h - 5; e.vy = -rng.range(20, 60); e.life = 1; e.size = rng.range(1, 3); return; }
        }
    }
    return {
        tick(ctx, dt, now, st) {
            const val = Math.round(st.val * 999);
            if (val !== lastNum) { lastNum = val; numStr = String(val); }

            // Spawn embers proportional to value (pool self-caps at EMBERS)
            if (st.val > 0.1) spawn(st);

            // Background
            ctx.fillStyle = 'rgba(255,255,255,.03)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();

            // Embers -- fixed pool, heat color via LUT, alpha via globalAlpha
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = HEAT[(st.val * 32) | 0] || HEAT[32];
            for (let i = 0; i < EMBERS; i++) {
                const e = ember[i];
                if (e.life <= 0) continue;
                e.y += e.vy * dt; e.life -= dt * 0.8;
                if (e.life <= 0) continue;
                ctx.globalAlpha = e.life;
                ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Number
            ctx.fillStyle = st.val > 0.7 ? '#ff6b6b' : st.val > 0.3 ? '#fbbf24' : '#9999b8';
            ctx.font = "700 28px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(numStr, st.w / 2, st.h / 2);

            label(ctx, 'HEAT', st.w / 2, st.h + 12);
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}

/** 19. Glitch Counter -- Number glitches and jitters as slider value increases. */
export function GlitchCounter({ seed = 42 } = {}) {
    const rng = new Random(seed);
    let numStr = '0', lastNum = -1;
    return {
        tick(ctx, dt, now, st) {
            const val = Math.round(st.val * 999);
            if (val !== lastNum) { lastNum = val; numStr = String(val); }
            const intensity = st.val;

            ctx.fillStyle = 'rgba(255,255,255,.03)'; roundRect(ctx, 0, 0, st.w, st.h, 10); ctx.fill();

            // Scanlines -- const white, alpha via globalAlpha
            if (intensity > 0.2) {
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = intensity * 0.03;
                for (let y = 0; y < st.h; y += 3) ctx.fillRect(0, y, st.w, 1);
                ctx.globalAlpha = 1;
            }

            // Glitched number
            const jx = intensity > 0.5 ? (rng.next() - 0.5) * intensity * 6 : 0;
            const jy = intensity > 0.5 ? (rng.next() - 0.5) * intensity * 4 : 0;

            if (intensity > 0.3 && rng.next() > 0.6) {
                ctx.globalCompositeOperation = 'screen';
                ctx.font = "700 28px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                // RGB split -- const channel colors, shared alpha via globalAlpha
                ctx.globalAlpha = intensity * 0.4;
                ctx.fillStyle = '#ff0055';
                ctx.fillText(numStr, st.w / 2 + jx - 2, st.h / 2 + jy);
                ctx.fillStyle = '#00ffcc';
                ctx.fillText(numStr, st.w / 2 + jx + 2, st.h / 2 + jy);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.fillStyle = '#e2e2f0';
            ctx.font = "700 28px 'JetBrains Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(numStr, st.w / 2 + jx, st.h / 2 + jy);

            label(ctx, 'SIGNAL', st.w / 2, st.h + 12);
            if (st.focused) focusRing(ctx, st.w, st.h, 10);
        },
    };
}


// ===========================================================
//  RATING (uses slider position mapped to 1--5 stars)
// ===========================================================

/** 20. Bubble Rating -- 5 bubbles inflate based on slider position. Click pops them. */
export function BubbleRating({ seed = 42 } = {}) {
    const rng = new Random(seed);
    const R5 = ['0 / 5', '1 / 5', '2 / 5', '3 / 5', '4 / 5', '5 / 5']; // const labels
    const POPS = 32;
    const pop = [];
    for (let i = 0; i < POPS; i++) pop[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    const sizes = new Float32Array(5);
    let lastW = 200;
    function spawnPops(cx) {
        for (let j = 0; j < 5; j++) {
            for (let i = 0; i < POPS; i++) {
                const p = pop[i];
                if (p.life <= 0) {
                    const a = rng.range(0, Math.PI * 2), v = rng.range(20, 50);
                    p.x = cx; p.y = 14; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.life = 1;
                    break;
                }
            }
        }
    }
    return {
        tick(ctx, dt, now, st) {
            lastW = st.w;
            const rating = Math.round(st.val * 5);
            const gap = st.w / 5;

            for (let i = 0; i < 5; i++) {
                const active = i < rating;
                const targetSz = active ? 12 : 6;
                sizes[i] = lerp(sizes[i] || 6, targetSz, dt * 8);
                const cx = gap * i + gap / 2, cy = st.h / 2;

                // Bubble -- const color, active alpha via globalAlpha
                if (active) { ctx.fillStyle = '#38bdf8'; ctx.globalAlpha = 0.3 + sizes[i] / 20; }
                else { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.globalAlpha = 1; }
                ctx.beginPath(); ctx.arc(cx, cy, sizes[i], 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = active ? '#38bdf8' : 'rgba(255,255,255,.08)';
                ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, sizes[i], 0, Math.PI * 2); ctx.stroke();

                // Highlight
                if (active) {
                    ctx.fillStyle = 'rgba(255,255,255,.15)';
                    ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Pop particles -- fixed pool, const color, alpha via globalAlpha
            ctx.fillStyle = '#38bdf8';
            for (let i = 0; i < POPS; i++) {
                const p = pop[i];
                if (p.life <= 0) continue;
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 3 * dt;
                if (p.life <= 0) continue;
                ctx.globalAlpha = p.life;
                ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;

            label(ctx, R5[rating], st.w / 2, st.h + 12, rating >= 4 ? '#38bdf8' : '#9999b8');
            if (st.focused) focusRing(ctx, st.w, st.h, 4);
        },
        onDrag(val) {
            const rating = Math.round(val * 5);
            // Pop the newly activated bubble (position derived from st.w via lastW)
            const gap = lastW / 5;
            const cx = gap * (rating - 1) + gap / 2;
            spawnPops(cx);
        },
    };
}


// ===========================================================
//  KNOBS
// ===========================================================

/** 1. Volume Knob -- Rotary dial with tick marks and arc indicator. */
export function VolumeKnob() {
    let displayVal = 0, grad = null;
    let numStr = '0', lastNum = -1;
    return {
        init(c, w, h) {
            // Value-arc gradient depends only on w/h (fixed per mount) -> build once.
            grad = c.createLinearGradient(0, h, w, 0);
            grad.addColorStop(0, '#6ee7b6'); grad.addColorStop(1, '#38bdf8');
        },
        tick(c,dt,now,st) {
            displayVal = lerp(displayVal, st.val, dt * 12);
            const cx=st.w/2, cy=st.h/2, R=Math.min(cx,cy)-4;
            const startA=-Math.PI*0.75, endA=Math.PI*0.75, range=endA-startA;

            // Background ring
            c.strokeStyle='rgba(255,255,255,.06)'; c.lineWidth=4;
            c.beginPath(); c.arc(cx,cy,R,startA,endA); c.stroke();

            // Value arc (gradient built once in init)
            const valA = startA + displayVal * range;
            c.strokeStyle = grad || '#38bdf8'; c.lineWidth=4;
            c.beginPath(); c.arc(cx,cy,R,startA,valA); c.stroke();

            // Tick marks
            for(let i=0;i<=10;i++){
                const a=startA+i/10*range;
                const inner=R-6, outer=R+2;
                c.strokeStyle=i/10<=displayVal?'rgba(110,231,182,.5)':'rgba(255,255,255,.08)';
                c.lineWidth=1; c.beginPath();
                c.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);
                c.lineTo(cx+Math.cos(a)*outer,cy+Math.sin(a)*outer);
                c.stroke();
            }

            // Needle dot
            c.fillStyle='#fff';
            c.beginPath(); c.arc(cx+Math.cos(valA)*(R-12),cy+Math.sin(valA)*(R-12),3,0,PI2); c.fill();

            // Center
            c.fillStyle='rgba(255,255,255,.04)';
            c.beginPath(); c.arc(cx,cy,R*0.4,0,PI2); c.fill();

            // Value text (rebuilt only when the integer changes)
            const v = Math.round(displayVal * 100);
            if (v !== lastNum) { lastNum = v; numStr = String(v); }
            c.fillStyle='#e2e2f0'; c.font="700 14px 'JetBrains Mono',monospace"; c.textAlign='center'; c.textBaseline='middle';
            c.fillText(numStr,cx,cy);
            lbl(c,'VOLUME',cx,st.h+10);
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 2. Compass Knob -- Needle points based on slider value (0=N, 0.5=S, 1=N). */
export function CompassKnob() {
    const dirs = ['N', 'E', 'S', 'W'];                          // hoisted out of tick
    const cols = ['#ff6b6b', '#9999b8', '#9999b8', '#9999b8'];  // (were per-frame arrays)
    let needleA = 0;
    let degStr = '0\u00B0', lastDeg = -1;
    return {
        tick(c,dt,now,st) {
            const targetA = st.val * PI2;
            needleA = lerp(needleA, targetA, dt*8);
            const cx=st.w/2, cy=st.h/2, R=Math.min(cx,cy)-4;

            // Ring
            c.strokeStyle='rgba(255,255,255,.06)'; c.lineWidth=2;
            c.beginPath(); c.arc(cx,cy,R,0,PI2); c.stroke();

            // Cardinal marks
            for(let i=0;i<4;i++){
                const a=-Math.PI/2+i*Math.PI/2;
                c.fillStyle=cols[i]; c.font="600 9px 'JetBrains Mono',monospace"; c.textAlign='center'; c.textBaseline='middle';
                c.fillText(dirs[i],cx+Math.cos(a)*(R-10),cy+Math.sin(a)*(R-10));
            }

            // Needle
            c.save(); c.translate(cx,cy); c.rotate(needleA-Math.PI/2);
            c.fillStyle='#ff6b6b';
            c.beginPath(); c.moveTo(0,-R+18); c.lineTo(-4,4); c.lineTo(4,4); c.closePath(); c.fill();
            c.fillStyle='rgba(255,255,255,.15)';
            c.beginPath(); c.moveTo(0,R-18); c.lineTo(-4,-4); c.lineTo(4,-4); c.closePath(); c.fill();
            c.restore();

            // Center pin
            c.fillStyle='#333'; c.beginPath(); c.arc(cx,cy,4,0,PI2); c.fill();
            c.strokeStyle='rgba(255,255,255,.1)'; c.lineWidth=1; c.beginPath(); c.arc(cx,cy,4,0,PI2); c.stroke();

            const deg = Math.round(st.val * 360);
            if (deg !== lastDeg) { lastDeg = deg; degStr = deg + '\u00B0'; }
            lbl(c, degStr, cx, st.h + 10);
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}


// ===========================================================
//  PROGRESS
// ===========================================================

/** 3. Ring Progress -- Circular progress with animated fill and particles at the tip. */
export function RingProgress({seed=42}={}) {
    const rng=new Random(seed);
    // Fixed spark pool + a bounded set of conic gradients (one per progress
    // level) built in init, so the green stop still tracks the arc tip with zero
    // per-frame gradient construction.
    const SPARKS = 24;
    const spark = [];
    for (let i = 0; i < SPARKS; i++) spark[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    const GPHASES = 16;
    const grads = [];
    let displayVal = 0;
    function spawn(x, y) {
        for (let i = 0; i < SPARKS; i++) {
            const s = spark[i];
            if (s.life <= 0) { s.x = x; s.y = y; s.vx = rng.range(-20, 20); s.vy = rng.range(-20, 20); s.life = 1; return; }
        }
    }
    return {
        init(c, w, h) {
            for (let p = 0; p < GPHASES; p++) {
                const g = c.createConicGradient(-Math.PI / 2, w / 2, h / 2);
                g.addColorStop(0, '#a78bfa');
                g.addColorStop((p / (GPHASES - 1)) * 0.95, '#6ee7b6');
                g.addColorStop(1, 'rgba(110,231,182,.2)');
                grads[p] = g;
            }
        },
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*6);
            const cx=st.w/2,cy=st.h/2,R=Math.min(cx,cy)-6,lw=6;

            // Background
            c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=lw;
            c.beginPath();c.arc(cx,cy,R,0,PI2);c.stroke();

            // Fill arc (conic gradient from init; the green stop tracks the tip)
            const a=-Math.PI/2,ea=a+displayVal*PI2;
            c.strokeStyle = grads[(displayVal * (GPHASES - 1)) | 0] || '#6ee7b6';c.lineWidth=lw;
            c.beginPath();c.arc(cx,cy,R,a,ea);c.stroke();

            // Tip sparks -- fixed pool, const color, alpha via globalAlpha
            if(displayVal>0.02){
                const tx=cx+Math.cos(ea)*R,ty=cy+Math.sin(ea)*R;
                spawn(tx, ty);
            }
            c.fillStyle = '#6ee7b6';
            for(let i=0;i<SPARKS;i++){
                const s=spark[i];
                if(s.life<=0)continue;
                s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=2*dt;
                if(s.life<=0)continue;
                c.globalAlpha=s.life;
                c.beginPath();c.arc(s.x,s.y,1.5,0,PI2);c.fill();
            }
            c.globalAlpha=1;

            // Percentage
            c.fillStyle='#e2e2f0';c.font="700 16px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(PCT[Math.round(displayVal*100)],cx,cy);
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 4. Battery Gauge -- Battery icon that fills and changes color. */
export function BatteryGauge() {
    let displayVal=0;
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*8);
            const bw=st.w-16,bh=st.h-12,bx=8,by=6,r=4;

            // Shell
            c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=2;
            rr(c,bx,by,bw,bh,r);c.stroke();
            // Cap
            c.fillStyle='rgba(255,255,255,.15)';
            c.fillRect(bx+bw+1,by+bh/2-4,4,8);

            // Fill
            const fillW=Math.max(0,(bw-6)*displayVal);
            const col=displayVal<.2?'#ff6b6b':displayVal<.5?'#fbbf24':'#6ee7b6';
            c.fillStyle=col;
            rr(c,bx+3,by+3,fillW,bh-6,2);c.fill();

            // Pulse glow when charging (high values)
            if(displayVal>.8){
                const pulse=Math.sin(now/200)*.3+.7;
                c.shadowBlur=8*pulse;c.shadowColor=col;
                rr(c,bx+3,by+3,fillW,bh-6,2);c.fill();
                c.shadowBlur=0;
            }

            // Low battery flash
            if(displayVal<.15&&((now/500|0)%2===0)){
                c.fillStyle='rgba(255,80,80,.15)';rr(c,bx,by,bw,bh,r);c.fill();
            }

            c.fillStyle='#e2e2f0';c.font="600 10px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(PCT[Math.round(displayVal*100)],bx+bw/2,by+bh/2);
            if(st.focused)fr(c,st.w+4,st.h,r);
        },
    };
}

/** 5. Signal Meter -- WiFi-style signal bars. */
export function SignalMeter() {
    let bars=[0,0,0,0,0];
    return {
        tick(c,dt,now,st) {
            const level=Math.ceil(st.val*5);
            for(let i=0;i<5;i++){
                const target=i<level?1:0;
                bars[i]=lerp(bars[i],target,dt*10);
            }
            const bw=8,gap=4,total=5*(bw+gap)-gap;
            const ox=(st.w-total)/2;

            for(let i=0;i<5;i++){
                const maxH=8+i*6, h=maxH*bars[i]+2;
                const x=ox+i*(bw+gap), y=st.h-6-h;
                const active=bars[i]>.5;
                c.fillStyle=active?(st.val>.6?'#6ee7b6':st.val>.3?'#fbbf24':'#ff6b6b'):'rgba(255,255,255,.06)';
                rr(c,x,y,bw,h,2);c.fill();
            }
            lbl(c,level+'/5',st.w/2,st.h+10,st.val>.6?'#6ee7b6':'#9999b8');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ===========================================================
//  CONTROLS
// ===========================================================

/** 6. Pill Tabs -- 3 segmented tabs with sliding indicator. */
export function PillTabs() {
    let indicatorX=0, indicatorW=0, selected=0;
    const labels=['Alpha','Beta','Gamma'];
    return {
        onClick(x,y,st) {
            const idx=Math.floor(x/(st.w/3));
            selected=clamp(idx,0,2);
        },
        tick(c,dt,now,st) {
            const tw=st.w/3;
            const tx=selected*tw, targetW=tw;
            indicatorX=lerp(indicatorX,tx,dt*12);
            indicatorW=lerp(indicatorW,targetW,dt*12);

            // Background
            c.fillStyle='rgba(255,255,255,.03)';rr(c,0,0,st.w,st.h,st.h/2);c.fill();

            // Indicator
            c.fillStyle='rgba(167,139,250,.12)';c.strokeStyle='rgba(167,139,250,.25)';c.lineWidth=1;
            rr(c,indicatorX+2,2,indicatorW-4,st.h-4,st.h/2-2);c.fill();c.stroke();

            // Labels
            c.font="600 11px 'Space Grotesk',sans-serif";c.textAlign='center';c.textBaseline='middle';
            for(let i=0;i<3;i++){
                c.fillStyle=i===selected?'#c4b5fd':'#9999b8';
                c.fillText(labels[i],tw*i+tw/2,st.h/2);
            }
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 7. Stepper -- +/- buttons with spring counter. */
export function Stepper() {
    let count=0,displayCount=0,flashDir=0,flashTimer=0;
    return {
        onClick(x,y,st) {
            if(x<st.w*0.33){count=Math.max(0,count-1);flashDir=-1;}
            else if(x>st.w*0.66){count++;flashDir=1;}
            flashTimer=0.3;
        },
        tick(c,dt,now,st) {
            displayCount=lerp(displayCount,count,dt*10);
            flashTimer=Math.max(0,flashTimer-dt);

            // Background
            c.fillStyle='rgba(255,255,255,.04)';rr(c,0,0,st.w,st.h,10);c.fill();

            // Minus zone
            const third=st.w/3;
            c.fillStyle=flashDir===-1&&flashTimer>0?'rgba(255,100,100,.15)':'rgba(255,255,255,.03)';
            rr(c,2,2,third-4,st.h-4,8);c.fill();
            c.fillStyle='#ff6b6b';c.font="700 18px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText('\u2212',third/2,st.h/2);

            // Plus zone
            c.fillStyle=flashDir===1&&flashTimer>0?'rgba(110,231,182,.15)':'rgba(255,255,255,.03)';
            rr(c,third*2+2,2,third-4,st.h-4,8);c.fill();
            c.fillStyle='#6ee7b6';c.fillText('+',third*2+third/2,st.h/2);

            // Counter
            c.fillStyle='#e2e2f0';c.font="700 20px 'JetBrains Mono',monospace";
            c.fillText(Math.round(displayCount),st.w/2,st.h/2);

            if(st.focused)fr(c,st.w,st.h,10);
        },
    };
}

/** 8. Radio Orbit -- 4 options arranged in a circle. Slider picks one. */
export function RadioOrbit() {
    let selectedGlow=new Float32Array(4);
    const names=['A','B','C','D'],colors=['#ff6b6b','#fbbf24','#6ee7b6','#38bdf8'];
    const OPTS=['OPTION A','OPTION B','OPTION C','OPTION D']; // const (was 'OPTION '+name concat)
    return {
        tick(c,dt,now,st) {
            const sel=Math.round(st.val*3);
            const cx=st.w/2,cy=st.h/2,R=Math.min(cx,cy)-12;

            // Center
            c.fillStyle='rgba(255,255,255,.03)';c.beginPath();c.arc(cx,cy,8,0,PI2);c.fill();

            for(let i=0;i<4;i++){
                const a=-Math.PI/2+i*Math.PI/2;
                const ox=cx+Math.cos(a)*R, oy=cy+Math.sin(a)*R;
                const active=i===sel;
                selectedGlow[i]=lerp(selectedGlow[i],active?1:0,dt*10);

                // Orbit line -- const white, alpha via globalAlpha
                c.strokeStyle='#ffffff';c.globalAlpha=.03+selectedGlow[i]*.05;c.lineWidth=1;
                c.beginPath();c.moveTo(cx,cy);c.lineTo(ox,oy);c.stroke();c.globalAlpha=1;

                // Node
                const sz=6+selectedGlow[i]*4;
                c.fillStyle=active?colors[i]:'rgba(255,255,255,.06)';
                c.beginPath();c.arc(ox,oy,sz,0,PI2);c.fill();
                if(active){c.strokeStyle=colors[i];c.lineWidth=1;c.beginPath();c.arc(ox,oy,sz+3,0,PI2);c.stroke()}

                c.fillStyle=active?'#fff':'#9999b8';c.font="600 9px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
                c.fillText(names[i],ox,oy);
            }
            lbl(c,OPTS[sel],cx,st.h+10,colors[sel]);
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ===========================================================
//  INDICATORS
// ===========================================================

/** 9. Password Strength -- Segmented bar with color progression and label. */
export function PasswordStrength() {
    let segs=[0,0,0,0];
    const labels=['WEAK','FAIR','GOOD','STRONG'],colors=['#ff6b6b','#fbbf24','#38bdf8','#6ee7b6'];
    return {
        tick(c,dt,now,st) {
            const level=Math.ceil(st.val*4);
            for(let i=0;i<4;i++) segs[i]=lerp(segs[i],i<level?1:0,dt*10);

            const segW=(st.w-12)/4,segH=8;
            for(let i=0;i<4;i++){
                const x=2+i*(segW+2);
                c.fillStyle=segs[i]>.5?colors[Math.min(level-1,3)]:'rgba(255,255,255,.06)';
                const w=segW*segs[i];
                rr(c,x,st.h/2-segH/2,Math.max(2,w),segH,3);c.fill();

                // Empty track
                c.strokeStyle='rgba(255,255,255,.04)';c.lineWidth=1;
                rr(c,x,st.h/2-segH/2,segW,segH,3);c.stroke();
            }

            const idx=clamp(level-1,0,3);
            lbl(c,level>0?labels[idx]:'NONE',st.w/2,st.h/2+16,level>0?colors[idx]:'#666');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}

/** 10. Water Level -- Animated wave surface inside a container. */
export function WaterLevel() {
    let displayVal=0, wavePhase=0;
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*4);
            wavePhase+=dt*3;
            const bx=4,by=4,bw=st.w-8,bh=st.h-8;

            // Container
            c.strokeStyle='rgba(255,255,255,.1)';c.lineWidth=1.5;rr(c,bx,by,bw,bh,6);c.stroke();

            // Water
            const waterY=by+bh-(bh*displayVal);
            c.save();c.beginPath();rr(c,bx+1,by+1,bw-2,bh-2,5);c.clip();

            // Wave surface
            c.fillStyle=displayVal>.7?'rgba(56,189,248,.3)':displayVal>.3?'rgba(110,231,182,.25)':'rgba(251,191,36,.2)';
            c.beginPath();c.moveTo(bx,by+bh);
            for(let x=0;x<=bw;x++){
                const wave=Math.sin(wavePhase+x*0.08)*3+Math.sin(wavePhase*1.5+x*0.12)*2;
                c.lineTo(bx+x,waterY+wave);
            }
            c.lineTo(bx+bw,by+bh);c.closePath();c.fill();

            // Deeper water
            c.fillStyle=displayVal>.7?'rgba(56,189,248,.15)':displayVal>.3?'rgba(110,231,182,.1)':'rgba(251,191,36,.08)';
            c.fillRect(bx,waterY+5,bw,bh);

            c.restore();

            c.fillStyle='#e2e2f0';c.font="700 12px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(PCT[Math.round(displayVal*100)],st.w/2,st.h/2);
            if(st.focused)fr(c,st.w,st.h,6);
        },
    };
}

/** 11. Heat Map -- 5×3 grid of cells that heat up based on slider. */
export function HeatMap({seed=42}={}) {
    const rng=new Random(seed);
    const N=15,thresholds=new Float32Array(N);
    let vals=new Float32Array(N);
    // Heat-color LUT (rgb quantized by heat): a const lookup + globalAlpha
    // instead of a per-cell rgb() template every frame.
    const HEATC=[];
    for(let i=0;i<=32;i++)HEATC[i]='rgb('+Math.round(100+i/32*155)+','+Math.round(60+i/32*20)+','+Math.round(60-i/32*40)+')';
    return {
        init(){for(let i=0;i<N;i++)thresholds[i]=rng.range(0,1)},
        tick(c,dt,now,st) {
            const cols=5,rows=3,gap=3;
            const cw=(st.w-gap*(cols-1))/cols, ch=(st.h-gap*(rows-1))/rows;

            for(let i=0;i<N;i++){
                const active=st.val>=thresholds[i];
                vals[i]=lerp(vals[i],active?1:0,dt*6);
                const col=i%cols,row=(i/cols)|0;
                const x=col*(cw+gap),y=row*(ch+gap);
                const heat=vals[i];
                if(heat>.1){c.fillStyle=HEATC[(heat*32)|0]||HEATC[32];c.globalAlpha=.15+heat*.4;}
                else{c.fillStyle='rgba(255,255,255,.04)';c.globalAlpha=1;}
                rr(c,x,y,cw,ch,3);c.fill();
                c.globalAlpha=1;
            }
            lbl(c,PCT[Math.round(st.val*100)],st.w/2,st.h+10);
            if(st.focused)fr(c,st.w,st.h,3);
        },
    };
}


// ===========================================================
//  MOOD
// ===========================================================

/** 12. Day/Night Toggle -- Sun/moon transition with star particles. */
export function DayNightToggle({seed=42}={}) {
    const rng=new Random(seed);
    // Sky-color LUT (day->night rgb quantized by t): a const lookup, not an
    // rgb() template per frame. Stars are a fixed pool filled in init.
    const SKY=[];
    for(let i=0;i<=32;i++){const u=i/32;SKY[i]='rgb('+Math.round(lerp(135,10,u))+','+Math.round(lerp(206,10,u))+','+Math.round(lerp(250,30,u))+')';}
    const STARS=30;
    const star=[];
    let t=0;
    return {
        init(ctx,w,h){for(let i=0;i<STARS;i++)star[i]={x:rng.range(4,w-4),y:rng.range(4,h-4),twinkle:rng.range(0,PI2)}},
        tick(c,dt,now,st) {
            t=lerp(t,st.toggled?1:0,dt*6);

            // Sky background (LUT)
            c.fillStyle=SKY[(t*32)|0]||SKY[32];rr(c,0,0,st.w,st.h,st.h/2);c.fill();

            // Stars (night only) -- const white, per-star alpha via globalAlpha
            if(t>.3){
                c.fillStyle='#ffffff';
                for(let i=0;i<STARS;i++){
                    const s=star[i];
                    const tw=Math.sin(now/400+s.twinkle)*.5+.5;
                    c.globalAlpha=(t-.3)/.7*tw*.6;
                    c.fillRect(s.x,s.y,1,1);
                }
                c.globalAlpha=1;
            }

            // Sun/Moon
            const orbX=lerp(18,st.w-18,t);
            if(t<.5){
                // Sun
                c.fillStyle='#fbbf24';c.beginPath();c.arc(orbX,st.h/2,10,0,PI2);c.fill();
                // Rays -- const color, alpha via globalAlpha
                c.strokeStyle='#fbbf24';c.globalAlpha=.3*(1-t*2);c.lineWidth=1;
                for(let i=0;i<8;i++){const a=now/800+i*Math.PI/4;c.beginPath();c.moveTo(orbX+Math.cos(a)*12,st.h/2+Math.sin(a)*12);c.lineTo(orbX+Math.cos(a)*16,st.h/2+Math.sin(a)*16);c.stroke()}
                c.globalAlpha=1;
            } else {
                // Moon
                c.fillStyle='#d4d4e8';c.beginPath();c.arc(orbX,st.h/2,10,0,PI2);c.fill();
                // Crater shadows -- const black, alpha via globalAlpha
                c.fillStyle='#000000';c.globalAlpha=(t-.5)*2*.15;
                c.beginPath();c.arc(orbX-3,st.h/2-2,3,0,PI2);c.fill();
                c.beginPath();c.arc(orbX+4,st.h/2+3,2,0,PI2);c.fill();
                c.globalAlpha=1;
            }

            lbl(c,st.toggled?'NIGHT':'DAY',st.w/2,st.h+14,st.toggled?'#9999b8':'#fbbf24');
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 13. Reaction Picker -- 5 emoji-style circles that inflate on hover region. */
export function ReactionPicker() {
    let sizes=new Float32Array(5), selected=-1;
    const emojis=['\u{1F610}','\u{1F642}','\u{1F60A}','\u{1F604}','\u{1F929}'],colors=['#9999b8','#fbbf24','#fb923c','#f472b6','#ff6b6b'];
    const colors30=colors.map((col)=>col+'30');                  // active fill (was `${color}30`)
    const REACT_LABELS=['MEH','OK','NICE','GREAT','LOVE'];        // was a per-frame array literal
    const FONTS=[]; for(let i=0;i<=48;i++)FONTS[i]=i+'px sans-serif'; // emoji font by rounded size
    return {
        tick(c,dt,now,st,ptr) {
            const gap=st.w/5;
            const hoverIdx=st.hover?clamp(Math.floor(ptr.x/gap),0,4):-1;

            for(let i=0;i<5;i++){
                const active=i===hoverIdx;
                sizes[i]=lerp(sizes[i],active?16:10,dt*12);
                const cx=gap*i+gap/2,cy=st.h/2;

                // Circle
                c.fillStyle=active?colors30[i]:'rgba(255,255,255,.04)';
                c.beginPath();c.arc(cx,cy-sizes[i]+10,sizes[i],0,PI2);c.fill();

                // Emoji face (simplified) -- font from a const-string LUT
                c.font=FONTS[Math.round(sizes[i]*1.2)]||FONTS[48];c.textAlign='center';c.textBaseline='middle';
                c.fillText(emojis[i],cx,cy-sizes[i]+10);
            }

            // Selection line
            if(hoverIdx>=0){
                const sx=gap*hoverIdx+gap/2;
                c.fillStyle=colors[hoverIdx];
                c.fillRect(sx-10,st.h-4,20,2);
            }

            lbl(c,hoverIdx>=0?REACT_LABELS[hoverIdx]:'REACT',st.w/2,st.h+10,hoverIdx>=0?colors[hoverIdx]:'#9999b8');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}

/** 14. Notification Bell -- Bell icon with bounce and count badge. */
export function NotificationBell() {
    let count=0, bellAngle=0, bellVel=0, badgeScale=0;
    let badgeStr='0'; // rebuilt only on click (count change), not per frame
    return {
        onClick() {
            count++;bellVel=6;badgeScale=1.5;badgeStr=count>99?'99+':String(count);
        },
        tick(c,dt,now,st) {
            bellVel+=(0-bellAngle)*20*dt;bellVel*=0.9;bellAngle+=bellVel*dt;
            badgeScale=lerp(badgeScale,1,dt*8);
            const cx=st.w/2,cy=st.h/2;

            // Bell body
            c.save();c.translate(cx,cy-4);c.rotate(bellAngle*0.3);
            c.fillStyle='#fbbf24';
            c.beginPath();c.moveTo(-10,0);c.quadraticCurveTo(-12,-14,0,-18);c.quadraticCurveTo(12,-14,10,0);c.lineTo(-10,0);c.fill();
            // Clapper
            c.fillStyle='#fbbf24';c.beginPath();c.arc(0,3,3,0,PI2);c.fill();
            c.restore();

            // Badge
            if(count>0){
                const bx=cx+10,by=cy-16;
                c.save();c.translate(bx,by);c.scale(badgeScale,badgeScale);
                c.fillStyle='#ff6b6b';c.beginPath();c.arc(0,0,8,0,PI2);c.fill();
                c.fillStyle='#fff';c.font="700 8px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
                c.fillText(badgeStr,0,0);
                c.restore();
            }

            lbl(c,'NOTIFY',cx,st.h+10);
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ===========================================================
//  FEEDBACK
// ===========================================================

/** 15. Typewriter Field -- Characters appear one by one with cursor blink. */
export function TypewriterField() {
    const text='Hello World';
    let charIdx=0, timer=0, cursorBlink=0, typing=false;
    let display='', dispW=0, lastIdx=-1; // substring rebuilt only when a char lands
    return {
        onToggle(checked){typing=checked;if(checked){charIdx=0;timer=0}},
        tick(c,dt,now,st) {
            cursorBlink=(cursorBlink+dt*3)%2;
            if(typing&&charIdx<text.length){timer+=dt;if(timer>.08){timer=0;charIdx++}}

            c.fillStyle='rgba(255,255,255,.04)';rr(c,0,0,st.w,st.h,6);c.fill();
            c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;rr(c,0,0,st.w,st.h,6);c.stroke();

            c.fillStyle='#6ee7b6';c.font="500 13px 'JetBrains Mono',monospace";c.textAlign='left';c.textBaseline='middle';
            // Rebuild the visible substring + its width only when a char is added.
            if(charIdx!==lastIdx){lastIdx=charIdx;display=text.substring(0,charIdx);dispW=c.measureText(display).width;}
            c.fillText(display,8,st.h/2);

            // Cursor
            if(cursorBlink<1){
                c.fillStyle='#6ee7b6';c.fillRect(9+dispW,st.h/2-8,1.5,16);
            }

            lbl(c,typing?'TYPING...':'TOGGLE TO TYPE',st.w/2,st.h+10,typing?'#6ee7b6':'#8888aa');
            if(st.focused)fr(c,st.w,st.h,6);
        },
    };
}

/** 16. Sound Wave Button -- Oscillating waveform on press, static on idle. */
export function SoundWaveBtn() {
    let intensity=0, phase=0;
    return {
        onClick(){intensity=1},
        tick(c,dt,now,st) {
            intensity=lerp(intensity,0,dt*2);
            phase+=dt*12;

            c.fillStyle='rgba(255,255,255,.04)';rr(c,0,0,st.w,st.h,10);c.fill();

            // Waveform
            const cy=st.h/2, amp=10*intensity;
            c.strokeStyle=intensity>.1?'#f472b6':'rgba(255,255,255,.08)';c.lineWidth=2;
            c.beginPath();
            for(let x=0;x<=st.w;x++){
                const freq=x*0.1;
                const y=cy+Math.sin(phase+freq)*amp*Math.sin(x/st.w*Math.PI);
                x===0?c.moveTo(x,y):c.lineTo(x,y);
            }
            c.stroke();

            // Flatline when idle
            if(intensity<.05){
                c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;
                c.beginPath();c.moveTo(10,cy);c.lineTo(st.w-10,cy);c.stroke();
            }

            c.fillStyle=intensity>.1?'#f472b6':'#9999b8';c.font="600 11px 'Space Grotesk',sans-serif";c.textAlign='center';c.textBaseline='middle';
            c.fillText(intensity>.1?'\u25CF  REC':'RECORD',st.w/2,st.h/2);
            if(st.focused)fr(c,st.w,st.h,10);
        },
    };
}

/** 17. Upload Progress -- File icon fills from bottom as slider increases. */
export function UploadProgress() {
    let displayVal=0;
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*6);
            const cx=st.w/2,fw=30,fh=38,fx=cx-fw/2,fy=(st.h-fh)/2;

            // File icon shape
            const fold=8;
            c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=1.5;
            c.beginPath();c.moveTo(fx,fy);c.lineTo(fx+fw-fold,fy);c.lineTo(fx+fw,fy+fold);c.lineTo(fx+fw,fy+fh);c.lineTo(fx,fy+fh);c.closePath();c.stroke();
            // Fold line
            c.beginPath();c.moveTo(fx+fw-fold,fy);c.lineTo(fx+fw-fold,fy+fold);c.lineTo(fx+fw,fy+fold);c.stroke();

            // Fill
            const fillH=fh*displayVal;
            const col=displayVal>=1?'#6ee7b6':'#38bdf8';
            c.fillStyle=displayVal>=1?'#6ee7b630':'#38bdf830'; // was `${col}30`
            c.save();c.beginPath();c.rect(fx+1,fy+fh-fillH,fw-1,fillH);c.clip();
            c.beginPath();c.moveTo(fx,fy);c.lineTo(fx+fw-fold,fy);c.lineTo(fx+fw,fy+fold);c.lineTo(fx+fw,fy+fh);c.lineTo(fx,fy+fh);c.closePath();c.fill();
            c.restore();

            // Arrow or checkmark
            c.strokeStyle=col;c.lineWidth=2;c.lineCap='round';
            if(displayVal>=.99){
                c.beginPath();c.moveTo(cx-5,fy+fh/2);c.lineTo(cx-1,fy+fh/2+5);c.lineTo(cx+6,fy+fh/2-4);c.stroke();
            } else {
                c.beginPath();c.moveTo(cx,fy+fh/2+5);c.lineTo(cx,fy+fh/2-5);c.stroke();
                c.beginPath();c.moveTo(cx-4,fy+fh/2-1);c.lineTo(cx,fy+fh/2-5);c.lineTo(cx+4,fy+fh/2-1);c.stroke();
            }
            c.lineCap='butt';

            lbl(c,displayVal>=.99?'DONE':PCT[Math.round(displayVal*100)],cx,st.h+10,displayVal>=.99?'#6ee7b6':'#9999b8');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ===========================================================
//  FUN
// ===========================================================

/** 18. Scratch Reveal -- Drag to erase a mask and reveal the prize beneath. */
export function ScratchReveal({seed=42}={}) {
    const rng=new Random(seed);
    // Fixed scratch pool (holes persist). Once all SCR slots are used the scratch
    // stops adding holes -- existing marks are never overwritten, so earlier
    // scratches never "heal". Spawn position derives from st.w via lastW.
    const SCR=64;
    const scr=[];
    for(let i=0;i<SCR;i++)scr[i]={x:0,y:0,r:0,live:false};
    let revealed=0, lastW=200;
    function spawn(val){
        for(let i=0;i<SCR;i++){
            const s=scr[i];
            if(!s.live){ s.x=val*lastW; s.y=rng.range(2,26); s.r=rng.range(6,14); s.live=true; return; }
        }
    }
    return {
        onDrag(val,vx) {
            if(Math.abs(vx)>0.5){
                for(let i=0;i<3;i++)spawn(val);
                revealed=Math.min(1,revealed+0.015);
            }
        },
        tick(c,dt,now,st) {
            lastW=st.w;
            // Prize background
            c.fillStyle='rgba(110,231,182,.08)';rr(c,0,0,st.w,st.h,8);c.fill();

            // Prize text -- const color, alpha via globalAlpha
            c.fillStyle='#6ee7b6';c.globalAlpha=.1+revealed*.6;c.font="700 14px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(revealed>.6?'\u{1F389} WINNER!':'? ? ?',st.w/2,st.h/2);
            c.globalAlpha=1;

            // Scratch mask (gets holes)
            if(revealed<.95){
                c.fillStyle='rgba(40,40,60,.85)';rr(c,0,0,st.w,st.h,8);c.fill();

                // Cut holes -- fixed ring, indexed loop
                c.globalCompositeOperation='destination-out';
                for(let i=0;i<SCR;i++){
                    const s=scr[i];
                    if(!s.live)continue;
                    c.beginPath();c.arc(s.x,s.y,s.r,0,PI2);c.fill();
                }
                c.globalCompositeOperation='source-over';

                // Shimmer line
                c.fillStyle='rgba(255,255,255,.04)';
                const shimX=(now/20)%st.w;
                c.fillRect(shimX-2,0,4,st.h);
            }

            lbl(c,revealed>.6?'REVEALED!':'DRAG TO SCRATCH',st.w/2,st.h+10,revealed>.6?'#6ee7b6':'#9999b8');
            if(st.focused)fr(c,st.w,st.h,8);
        },
    };
}

/** 19. Timer Countdown -- Circular countdown timer. Toggle starts/stops. */
export function TimerCountdown() {
    let timeLeft=10, running=false, flashAlpha=0;
    let timeStr='10.0s', lastTenths=-1; // rebuilt at ~10 Hz, not per frame
    return {
        onToggle(checked) { running=checked; if(checked)timeLeft=10; },
        tick(c,dt,now,st) {
            if(running&&timeLeft>0) timeLeft=Math.max(0,timeLeft-dt);
            if(timeLeft<=0&&running) flashAlpha=Math.sin(now/150)*.5+.5;
            else flashAlpha=0;

            const cx=st.w/2,cy=st.h/2,R=Math.min(cx,cy)-4;

            // Flash bg when done
            if(flashAlpha>0){c.fillStyle='#ff6464';c.globalAlpha=flashAlpha*.1;c.beginPath();c.arc(cx,cy,R+4,0,PI2);c.fill();c.globalAlpha=1;}

            // Background ring
            c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=4;c.beginPath();c.arc(cx,cy,R,0,PI2);c.stroke();

            // Progress arc
            const progress=timeLeft/10;
            const col=timeLeft>3?'#6ee7b6':timeLeft>1?'#fbbf24':'#ff6b6b';
            c.strokeStyle=col;c.lineWidth=4;
            c.beginPath();c.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+progress*PI2,false);c.stroke();

            // Time text
            const tenths=Math.round(timeLeft*10);
            if(tenths!==lastTenths){lastTenths=tenths;timeStr=(tenths/10).toFixed(1)+'s';}
            c.fillStyle='#e2e2f0';c.font="700 16px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(timeStr,cx,cy);

            lbl(c,running?(timeLeft>0?'RUNNING':'TIME UP!'):'TOGGLE TO START',cx,st.h+10,running?col:'#8888aa');
            if(st.focused)fr(c,st.w,st.h,R);
        },
    };
}

/** 20. Pull Refresh -- Drag down to charge, release to spin. */
export function PullRefresh() {
    let pullAmt=0, spinning=false, spinAngle=0, spinTimer=0;
    return {
        onDrag(val) { if(!spinning) pullAmt=val; },
        onToggle(checked) {
            if(checked&&pullAmt>.6){ spinning=true;spinTimer=2; }
            pullAmt=0;
        },
        tick(c,dt,now,st) {
            if(spinning){spinAngle+=dt*12;spinTimer-=dt;if(spinTimer<=0){spinning=false;spinAngle=0}}
            const cx=st.w/2,cy=st.h/2;

            // Container
            c.fillStyle='rgba(255,255,255,.03)';c.beginPath();c.arc(cx,cy,24,0,PI2);c.fill();

            // Pull indicator or spinner
            if(spinning){
                // Spinner arcs
                for(let i=0;i<3;i++){
                    const a=spinAngle+i*PI2/3;
                    c.strokeStyle='#38bdf8';c.globalAlpha=.3+i*.2;c.lineWidth=3;
                    c.beginPath();c.arc(cx,cy,16,a,a+.8);c.stroke();
                }
                c.globalAlpha=1;
                lbl(c,'LOADING...',cx,st.h+10,'#38bdf8');
            } else {
                // Arrow that stretches with pull
                const stretch=pullAmt*14;
                c.strokeStyle=pullAmt>.6?'#6ee7b6':'rgba(255,255,255,.15)';c.lineWidth=2;c.lineCap='round';
                c.beginPath();c.moveTo(cx,cy-8-stretch);c.lineTo(cx,cy+4);c.stroke();
                c.beginPath();c.moveTo(cx-5,cy+0);c.lineTo(cx,cy+4);c.lineTo(cx+5,cy+0);c.stroke();
                c.lineCap='butt';

                // Fill ring
                if(pullAmt>0){
                    c.strokeStyle=pullAmt>.6?'#6ee7b6':'rgba(255,255,255,.1)';c.lineWidth=2;
                    c.beginPath();c.arc(cx,cy,20,-Math.PI/2,-Math.PI/2+pullAmt*PI2);c.stroke();
                }
                lbl(c,pullAmt>.6?'RELEASE!':'DRAG SLIDER',cx,st.h+10,pullAmt>.6?'#6ee7b6':'#9999b8');
            }
            if(st.focused)fr(c,st.w,st.h,24);
        },
    };
}


// ===========================================================
//  BARREL OBJECTS (back-compat)
// ===========================================================

export const UIFXRecipes = {
    SwarmToggle, LiquidToggle, NeonPulseToggle,
    MagneticButton, ShatterButton, ConfettiButton, GlitchButton,
    SparkSlider, CosmicSlider, LaserSlider,
};

export const UIFXRecipes2 = {
    PendulumToggle, CircuitToggle, LightningToggle, DNAToggle,
    HeartbeatButton, BreathingButton, InkSplashButton, PixelDissolveButton, FireworkButton,
    AuroraSlider, WaveSlider, ElasticBandSlider, GravitySlider,
    OrbitLoader, HelixLoader,
    RippleCheck, MorphCheck,
    FlameCounter, GlitchCounter,
    BubbleRating,
};

export const UIFXRecipes3 = {
    VolumeKnob, CompassKnob,
    RingProgress, BatteryGauge, SignalMeter,
    PillTabs, Stepper, RadioOrbit,
    PasswordStrength, WaterLevel, HeatMap,
    DayNightToggle, ReactionPicker, NotificationBell,
    TypewriterField, SoundWaveBtn, UploadProgress,
    ScratchReveal, TimerCountdown, PullRefresh,
};


// ===========================================================
//  DEFAULT EXPORT -- combined all-50 namespace
// ===========================================================

export default {
    SwarmToggle,
    LiquidToggle,
    NeonPulseToggle,
    MagneticButton,
    ShatterButton,
    ConfettiButton,
    GlitchButton,
    SparkSlider,
    CosmicSlider,
    LaserSlider,
    PendulumToggle,
    CircuitToggle,
    LightningToggle,
    DNAToggle,
    HeartbeatButton,
    BreathingButton,
    InkSplashButton,
    PixelDissolveButton,
    FireworkButton,
    AuroraSlider,
    WaveSlider,
    ElasticBandSlider,
    GravitySlider,
    OrbitLoader,
    HelixLoader,
    RippleCheck,
    MorphCheck,
    FlameCounter,
    GlitchCounter,
    BubbleRating,
    VolumeKnob,
    CompassKnob,
    RingProgress,
    BatteryGauge,
    SignalMeter,
    PillTabs,
    Stepper,
    RadioOrbit,
    PasswordStrength,
    WaterLevel,
    HeatMap,
    DayNightToggle,
    ReactionPicker,
    NotificationBell,
    TypewriterField,
    SoundWaveBtn,
    UploadProgress,
    ScratchReveal,
    TimerCountdown,
    PullRefresh,
};


// ===========================================================
//  RECIPE REGISTRY
// ===========================================================

/**
 * Every recipe factory keyed by id, for data-driven pickers (demo dropdowns,
 * random selection, config files). A null-prototype object so keys never
 * collide with Object.prototype.
 */
export const RECIPES = Object.assign(Object.create(null), {
    swarmToggle: SwarmToggle,
    liquidToggle: LiquidToggle,
    neonPulseToggle: NeonPulseToggle,
    magneticButton: MagneticButton,
    shatterButton: ShatterButton,
    confettiButton: ConfettiButton,
    glitchButton: GlitchButton,
    sparkSlider: SparkSlider,
    cosmicSlider: CosmicSlider,
    laserSlider: LaserSlider,
    pendulumToggle: PendulumToggle,
    circuitToggle: CircuitToggle,
    lightningToggle: LightningToggle,
    dnaToggle: DNAToggle,
    heartbeatButton: HeartbeatButton,
    breathingButton: BreathingButton,
    inkSplashButton: InkSplashButton,
    pixelDissolveButton: PixelDissolveButton,
    fireworkButton: FireworkButton,
    auroraSlider: AuroraSlider,
    waveSlider: WaveSlider,
    elasticBandSlider: ElasticBandSlider,
    gravitySlider: GravitySlider,
    orbitLoader: OrbitLoader,
    helixLoader: HelixLoader,
    rippleCheck: RippleCheck,
    morphCheck: MorphCheck,
    flameCounter: FlameCounter,
    glitchCounter: GlitchCounter,
    bubbleRating: BubbleRating,
    volumeKnob: VolumeKnob,
    compassKnob: CompassKnob,
    ringProgress: RingProgress,
    batteryGauge: BatteryGauge,
    signalMeter: SignalMeter,
    pillTabs: PillTabs,
    stepper: Stepper,
    radioOrbit: RadioOrbit,
    passwordStrength: PasswordStrength,
    waterLevel: WaterLevel,
    heatMap: HeatMap,
    dayNightToggle: DayNightToggle,
    reactionPicker: ReactionPicker,
    notificationBell: NotificationBell,
    typewriterField: TypewriterField,
    soundWaveBtn: SoundWaveBtn,
    uploadProgress: UploadProgress,
    scratchReveal: ScratchReveal,
    timerCountdown: TimerCountdown,
    pullRefresh: PullRefresh,
});

/**
 * Display + capability metadata for every built-in recipe, so a host can build
 * a picker without hardcoding the list. A live array: registerRecipe() updates
 * it, so existing pickers keep working.
 *
 *   type       'toggle' | 'button' | 'slider' -- the native element it mounts on
 *   family     display grouping (Toggles, Buttons, Sliders, Knobs, ...)
 *   themeable  accepts { colors, theme } (false for all until a later pass)
 *   motionSafe inherently-calm under prefers-reduced-motion (false for all)
 */
export const RECIPE_META = [
    { id: 'swarmToggle', name: 'Swarm Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'liquidToggle', name: 'Liquid Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'neonPulseToggle', name: 'Neon Pulse Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'magneticButton', name: 'Magnetic Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'shatterButton', name: 'Shatter Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'confettiButton', name: 'Confetti Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'glitchButton', name: 'Glitch Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'sparkSlider', name: 'Spark Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'cosmicSlider', name: 'Cosmic Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'laserSlider', name: 'Laser Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'pendulumToggle', name: 'Pendulum Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'circuitToggle', name: 'Circuit Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'lightningToggle', name: 'Lightning Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'dnaToggle', name: 'Dna Toggle', type: 'toggle', family: 'Toggles', themeable: false, motionSafe: false },
    { id: 'heartbeatButton', name: 'Heartbeat Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'breathingButton', name: 'Breathing Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'inkSplashButton', name: 'Ink Splash Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'pixelDissolveButton', name: 'Pixel Dissolve Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'fireworkButton', name: 'Firework Button', type: 'button', family: 'Buttons', themeable: false, motionSafe: false },
    { id: 'auroraSlider', name: 'Aurora Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'waveSlider', name: 'Wave Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'elasticBandSlider', name: 'Elastic Band Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'gravitySlider', name: 'Gravity Slider', type: 'slider', family: 'Sliders', themeable: false, motionSafe: false },
    { id: 'orbitLoader', name: 'Orbit Loader', type: 'toggle', family: 'Loaders', themeable: false, motionSafe: false },
    { id: 'helixLoader', name: 'Helix Loader', type: 'toggle', family: 'Loaders', themeable: false, motionSafe: false },
    { id: 'rippleCheck', name: 'Ripple Check', type: 'toggle', family: 'Checkboxes', themeable: false, motionSafe: false },
    { id: 'morphCheck', name: 'Morph Check', type: 'toggle', family: 'Checkboxes', themeable: false, motionSafe: false },
    { id: 'flameCounter', name: 'Flame Counter', type: 'slider', family: 'Counters', themeable: false, motionSafe: false },
    { id: 'glitchCounter', name: 'Glitch Counter', type: 'slider', family: 'Counters', themeable: false, motionSafe: false },
    { id: 'bubbleRating', name: 'Bubble Rating', type: 'slider', family: 'Rating', themeable: false, motionSafe: false },
    { id: 'volumeKnob', name: 'Volume Knob', type: 'slider', family: 'Knobs', themeable: false, motionSafe: false },
    { id: 'compassKnob', name: 'Compass Knob', type: 'slider', family: 'Knobs', themeable: false, motionSafe: false },
    { id: 'ringProgress', name: 'Ring Progress', type: 'slider', family: 'Progress', themeable: false, motionSafe: false },
    { id: 'batteryGauge', name: 'Battery Gauge', type: 'slider', family: 'Progress', themeable: false, motionSafe: false },
    { id: 'signalMeter', name: 'Signal Meter', type: 'slider', family: 'Progress', themeable: false, motionSafe: false },
    { id: 'pillTabs', name: 'Pill Tabs', type: 'button', family: 'Controls', themeable: false, motionSafe: false },
    { id: 'stepper', name: 'Stepper', type: 'button', family: 'Controls', themeable: false, motionSafe: false },
    { id: 'radioOrbit', name: 'Radio Orbit', type: 'slider', family: 'Controls', themeable: false, motionSafe: false },
    { id: 'passwordStrength', name: 'Password Strength', type: 'slider', family: 'Indicators', themeable: false, motionSafe: false },
    { id: 'waterLevel', name: 'Water Level', type: 'slider', family: 'Indicators', themeable: false, motionSafe: false },
    { id: 'heatMap', name: 'Heat Map', type: 'slider', family: 'Indicators', themeable: false, motionSafe: false },
    { id: 'dayNightToggle', name: 'Day Night Toggle', type: 'toggle', family: 'Mood', themeable: false, motionSafe: false },
    { id: 'reactionPicker', name: 'Reaction Picker', type: 'button', family: 'Mood', themeable: false, motionSafe: false },
    { id: 'notificationBell', name: 'Notification Bell', type: 'button', family: 'Mood', themeable: false, motionSafe: false },
    { id: 'typewriterField', name: 'Typewriter Field', type: 'toggle', family: 'Feedback', themeable: false, motionSafe: false },
    { id: 'soundWaveBtn', name: 'Sound Wave Btn', type: 'button', family: 'Feedback', themeable: false, motionSafe: false },
    { id: 'uploadProgress', name: 'Upload Progress', type: 'slider', family: 'Feedback', themeable: false, motionSafe: false },
    { id: 'scratchReveal', name: 'Scratch Reveal', type: 'slider', family: 'Fun', themeable: false, motionSafe: false },
    { id: 'timerCountdown', name: 'Timer Countdown', type: 'toggle', family: 'Fun', themeable: false, motionSafe: false },
    { id: 'pullRefresh', name: 'Pull Refresh', type: 'slider', family: 'Fun', themeable: false, motionSafe: false },
];

/** Names of every built-in recipe (the keys of RECIPES at load time). */
export const RECIPE_NAMES = Object.freeze(Object.keys(RECIPES));

/**
 * Register a custom recipe, or override a built-in. Instantly usable via
 * RECIPES[id] and reflected in RECIPE_META so existing pickers keep working.
 *
 * @param {string} id        the RECIPES key
 * @param {Function} factory  a recipe factory: (opts) => Recipe
 * @param {{ name?: string, type?: string, family?: string, themeable?: boolean, motionSafe?: boolean }} [meta]
 *   Omitted fields fall back to the existing entry (when overriding), then to a
 *   de-camelCased name, family 'custom', and false flags.
 * @returns {Function} the registered factory
 */
export function registerRecipe(id, factory, meta) {
    if (typeof id !== 'string' || id.length === 0) {
        throw new TypeError('registerRecipe: id must be a non-empty string');
    }
    if (typeof factory !== 'function') {
        throw new TypeError('registerRecipe: factory must be a function');
    }

    const idx = RECIPE_META.findIndex((m) => m.id === id);
    const prev = idx >= 0 ? RECIPE_META[idx] : null;
    const type = (meta && meta.type) || (prev && prev.type) || undefined;
    // A recipe's type selects its native element; a typeless recipe cannot be
    // mounted. Reject it at registration (fail closed) -- checked BEFORE any
    // mutation, so a rejected call leaves RECIPES/RECIPE_META untouched.
    if (type !== 'toggle' && type !== 'button' && type !== 'slider') {
        throw new TypeError('registerRecipe: type must be "toggle", "button", or "slider"');
    }

    RECIPES[id] = factory;
    const entry = {
        id,
        name: (meta && meta.name) || (prev && prev.name)
            || id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^[a-z]/, (c) => c.toUpperCase()),
        type,
        family: (meta && meta.family) || (prev && prev.family) || 'custom',
        themeable: meta && 'themeable' in meta ? !!meta.themeable : (prev ? prev.themeable : false),
        motionSafe: meta && 'motionSafe' in meta ? !!meta.motionSafe : (prev ? prev.motionSafe : false),
    };
    if (idx >= 0) RECIPE_META[idx] = entry; else RECIPE_META.push(entry);
    return factory;
}

/**
 * Levenshtein edit distance (module-local, for the did-you-mean hint). Bounded
 * by the short recipe-id strings; never on a hot path.
 */
function editDistance(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
            const del = prev[j] + 1;
            const ins = curr[j - 1] + 1;
            const sub = prev[j - 1] + cost;
            curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
        }
        const tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
}

/** Nearest known recipe id to a mistyped one, for the did-you-mean hint. */
function nearestRecipe(id) {
    let best = RECIPE_NAMES[0], bestD = Infinity;
    for (let i = 0; i < RECIPE_NAMES.length; i++) {
        const d = editDistance(id, RECIPE_NAMES[i]);
        if (d < bestD) { bestD = d; best = RECIPE_NAMES[i]; }
    }
    return best;
}

/**
 * Resolve a recipe id to its factory + declared type and mount it via
 * mountUIFX. Fail closed:
 *   - unknown id -> throw naming the nearest known id (did-you-mean).
 *   - options.type present and != the recipe's declared type -> throw.
 * options.type is consumed here, never forwarded as a mount option.
 *
 * @param {HTMLElement} container
 * @param {string} id
 * @param {Object} [options]
 * @returns {{ el: HTMLElement, destroy: Function }}
 */
export function mountRecipe(container, id, options) {
    const factory = RECIPES[id];
    if (typeof factory !== 'function') {
        // did-you-mean only makes sense for a string typo; a non-string id
        // (null, a number) gets the clean message without entering the helper
        // (nearestRecipe -> editDistance reads .length, which would throw on null).
        const hint = typeof id === 'string'
            ? ' Did you mean "' + nearestRecipe(id) + '"?'
            : '';
        throw new Error('mountRecipe: unknown recipe "' + id + '".' + hint);
    }
    const meta = RECIPE_META.find((m) => m.id === id) || null;
    const type = meta ? meta.type : undefined;
    if (options && 'type' in options && options.type !== type) {
        throw new Error(
            'mountRecipe: recipe "' + id + '" mounts as "' + type +
            '", not "' + options.type + '"'
        );
    }
    let mountOptions = options;
    if (options && 'type' in options) {
        mountOptions = {};
        for (const k in options) if (k !== 'type') mountOptions[k] = options[k];
    }
    return mountUIFX(container, type, factory, mountOptions);
}

