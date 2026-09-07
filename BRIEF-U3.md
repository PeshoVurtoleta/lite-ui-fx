# BRIEF-U3 -- lite-ui-fx v1.3.0 -- the recipe sweep (zero-GC, size-true, themeable)

```yaml
package: "@zakkster/lite-ui-fx"
version_target: 1.3.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-gc-profiler"]
findings: [U-03, U-05, U-06]
depends_on: [U2]        # shipped 1.2.0 on 2026-09-06
blocks: [U4]
```

One sweep over the ONE consolidated `UIFXRecipes.js` (2470 lines, 50 recipes)
fixing the three S2s together, because they touch the same fifty factory
bodies: allocation-free frames (U-03), geometry derived from state (U-05), one
option convention with theming (U-06). Three separate sweeps means reading the
file three times -- batch them.

This brief is grounded against the CONSOLIDATED file as of 1.2.0. Every line
number below was read on 2026-09-07; the ROADMAP's U-03/U-05/U-06 line refs
predate the U2 merge and are STALE -- use these.

---

## 0. Verified inputs (scan of UIFXRecipes.js @ 1.2.0)

- **50 recipes, 14 families** (RECIPE_META @ 2306-2356 is authoritative -- id,
  name, type, family, themeable:false, motionSafe:false for all).
- **U-03 allocation shapes found** (exact counts, consolidated lines):
  - per-frame template-literal colors: **38 sites** across ~26 recipes
    (ROADMAP guessed ~31; it is 38).
  - `createLinearGradient`: **3** -- LaserSlider[612], AuroraSlider[1001],
    VolumeKnob[1395]. `createRadialGradient`: **0**.
  - particle `push`: 18 / `splice`: 13 -- pool churn across ~13 recipes.
  - `setLineDash`: 7 -- five in the SHARED focus helpers
    (drawFocusRing[60,63], focusRing[78,79], fr[84]) + CircuitToggle[686,688].
  - per-frame value-label strings: the 18 `JetBrains Mono` label sites; plus
    one `toFixed` (TimerCountdown[2091]).
- **U-05 geometry offenders (concrete):** NeonPulseToggle ring origin
  `checked ? 46 : 18` [206]; SparkSlider spawn `x: val * 200` [480];
  ScratchReveal spawn `x: val * 200` [2030]. 232 draw lines ALREADY derive from
  `st.w/st.h` -- U-05 is a residual fix, not a rewrite. **Do NOT touch**
  `Math.round(st.val * N)` [1247,1284,1330,1363,1557,1659,1701] (semantic
  value->count: stars/bars/segments) or CosmicSlider `* 200` [565-566] (a
  force/accel constant, not geometry).
- **U-06 theming:** 28 baked font literals (10 `Space Grotesk` + 18
  `JetBrains Mono`); three theming conventions today -- ConfettiButton
  `colors: string[]` [356], SparkSlider `color: string` [468], FireworkButton
  internal literal no option [942], the rest hardcode hex. Hardcoded canvas
  LABELS ('MAGNETIC' etc.) feed the WCAG label-in-name fix.
- **7 recipes show ZERO hot-path pattern hits** -- swarmToggle, liquidToggle,
  pendulumToggle, lightningToggle, orbitLoader, signalMeter, passwordStrength.
  LIKELY clean, but the scan does not catch bare `{}`/`[]` literals or string
  concat: **t3 is the arbiter, verify -- do not assume.**
- **t3 does NOT exist.** `test/torture.mjs:113` = `skip tier=t3-frame-alloc
  (fills in U3)`. t9's `runAllocControl` is already written and waiting for t3
  to gate it. t5 is partial (scale-cost/alloc deferred here / to U5).

---

## 1. THE DECISION -- drop into `decisions/0002-recipe-options.md` BEFORE coding

```markdown
# 0002 -- one recipe-option shape, with theming

## Status
Accepted (U3, v1.3.0).

## Context
The 50 recipes carried three incompatible theming conventions (ConfettiButton
colors[], SparkSlider color, FireworkButton internal literal, ~45 hardcoded
hex) and 28 baked font literals, and every visible canvas label was a hardcoded
string that the accessible `label` option could never match (WCAG 2.5.3
label-in-name). U3 sweeps all 50 at once; it needs ONE option shape.

## Decision
Every factory accepts one options object:

    { seed?, colors?: string[], theme?: { light, mid, dark },
      text?: string, font?: string, ...recipe-specific knobs }

- `colors` wins over `theme`. `theme` maps { light, mid, dark } onto each
  recipe's own ramp. The { light, mid, dark } shape matches lite-scratch-fx so
  one theme object drives both packages.
- Defaults live in `DEFAULT_<NAME>` consts seeded from TODAY's exact literals,
  so a bare factory renders byte-identically to 1.2.0 (this is gated -- A1).
- Legacy one-offs stay working for ONE minor as documented aliases:
  ConfettiButton `colors` is already canonical; SparkSlider `color` aliases
  `colors[0]`.
- `text` replaces every hardcoded canvas label; when omitted it defaults to
  `options.label` (mountUIFX forwards it), closing label-in-name by
  construction.
- `font` defaults to the recipe's current literal.

## Consequences
RECIPE_META.themeable flips true per recipe as it lands (the suite iterates
META, so coverage is automatic). Palette/ramp resolution happens in `init`
(cold); no per-frame allocation is added by theming.
```

---

## 2. Per-family allocation inventory (the map the sweep works from)

Lines are consolidated-file. "clean?" = zero scan hits, t3-verify only.
U-06 is hex-in-body unless a knob is named.

### Toggles (7) + Loaders (2) + Checkboxes (2)  -> TASK T3
| id | line | U-03 | U-05 | U-06 |
| --- | --- | --- | --- | --- |
| swarmToggle | 98 | clean (typed-array formation; the zero-GC reference) | verify phyllotaxis inset | hex |
| liquidToggle | 167 | clean? | - | hex |
| neonPulseToggle | 200 | push[206] splice[222] tmpl-color[223] | **ring origin 46/18 [206]** | hex |
| pendulumToggle | 642 | clean? | - | hex |
| circuitToggle | 670 | push[675,703] splice[696] setLineDash[686,688] | - | hex |
| lightningToggle | 715 | clean? | - | hex |
| dnaToggle | 750 | tmpl-color[765,767] | - | hex |
| orbitLoader | 1096 | clean? | - | hex |
| helixLoader | 1126 | tmpl-color[1139,1141,1144] | - | hex |
| rippleCheck | 1159 | push[1162] splice[1174] tmpl-color[1175] | - | hex |
| morphCheck | 1197 | tmpl-color[1204] | - | hex |

### Buttons (9)  -> TASK T4 (particle-pool heavy)
| id | line | U-03 | U-06 |
| --- | --- | --- | --- |
| magneticButton | 253 | light | font[277]; label 'MAGNETIC' |
| shatterButton | 296 | push[308] splice[346] | font[328]; label 'SHATTER' |
| confettiButton | 356 | push[367] splice[405] | `colors[]` (canonical alias); font[389] |
| glitchButton | 421 | tmpl-color[444,445] | font[434] |
| heartbeatButton | 789 | push[797] splice[823] tmpl-color[824] | hex |
| breathingButton | 834 | tmpl-color[843,844,849] | font[854] |
| inkSplashButton | 862 | push[871] splice[885] tmpl-color[886] | font[879] |
| pixelDissolveButton | 895 | verify dissolve grid pool | font[930] |
| fireworkButton | 942 | push[949,966] splice[968,976] | internal color literal->theme; font[955] |

### Sliders (7)  -> TASK T5 (+ the 3 gradients)
| id | line | U-03 | U-05 | U-06 |
| --- | --- | --- | --- | --- |
| sparkSlider | 468 | push[479] tmpl-color[508,521] splice[518] | **spawn val*200 [480]** | `color` alias |
| cosmicSlider | 540 | push[547] tmpl-color[585] | (`*200`@565 is accel, keep) | hex |
| laserSlider | 596 | **linearGrad[612]** tmpl-color[629] | - | hex |
| auroraSlider | 992 | **linearGrad[1001]** tmpl[1010] | - | hex |
| waveSlider | 1017 | tmpl[1032] | - | hex |
| elasticBandSlider | 1039 | tmpl[1056] | - | hex |
| gravitySlider | 1063 | tmpl[1084] | - | hex |

### Counters (2) + Rating (1) + Knobs (2) + Progress (3)  -> TASK T6 (value-label 10Hz)
| id | line | U-03 | U-06 |
| --- | --- | --- | --- |
| flameCounter | 1242 | push[1251] splice[1261] tmpl-color[1263] label-str[1270] | font |
| glitchCounter | 1280 | tmpl-color[1291,1301,1304] label-str[1302,1310] | font |
| bubbleRating | 1325 | tmpl-color[1340,1356,1359] splice[1355] push[1369] | hex |
| volumeKnob | 1381 | **linearGrad[1395]** label-str[1420] | font |
| compassKnob | 1429 | light | font[1445] |
| ringProgress | 1473 | push[1495] splice[1499] tmpl-color[1500] label-str[1504] | font |
| batteryGauge | 1512 | light | font[1545] |
| signalMeter | 1553 | clean? | hex |

### Controls (3) + Indicators (3) + Mood (3) + Feedback (3) + Fun (3)  -> TASK T7
| id | line | U-03 | U-05 | U-06 |
| --- | --- | --- | --- | --- |
| pillTabs | 1584 | light | - | font[1606] |
| stepper | 1617 | light | - | font[1636,1645] |
| radioOrbit | 1654 | tmpl-color[1672] | - | font[1681] |
| passwordStrength | 1696 | clean? | - | hex |
| waterLevel | 1724 | light | - | font[1754] |
| heatMap | 1762 | tmpl-color[1779] | - | hex |
| dayNightToggle | 1794 | push[1798] tmpl-color[1804,1810,1821,1827] (worst) | - | hex |
| reactionPicker | 1839 | tmpl-color[1853,1857] | - | hex |
| notificationBell | 1875 | light | - | font[1899] |
| typewriterField | 1916 | light | - | font[1929] (decorate cand. U4) |
| soundWaveBtn | 1945 | light | - | font[1972] |
| uploadProgress | 1980 | tmpl-color[1997] | - | hex |
| scratchReveal | 2024 | push[2030] tmpl-color[2039] label-str[2039] | **spawn val*200 [2030]** | hex |
| timerCountdown | 2066 | tmpl-color[2078] label-str[2090] toFixed[2091] | - | hex |
| pullRefresh | 2100 | tmpl-color[2120] | - | hex |

---

## 3. Atomic task split

**T1 -- shared foundation (BLOCKS every recipe task).** Record 0002. Add to
UIFXRecipes.js: a cold `resolvePalette({ colors, theme })` helper; per-recipe
`DEFAULT_<NAME>` consts extracted VERBATIM from today's literals (byte-identical
is gated); ONE module-level dash const to replace `setLineDash([4,3])` (fixes
the shared focus helpers 60/63/78/79/84 + CircuitToggle 686/688 at once); a
`font` param threaded through the shared `label`/`lbl`/`drawStateLabel` helpers
(69/75/83); a 10Hz frame-mask label helper for value strings. Borrow
lite-ambient-fx's sprite-cache glow for shadowBlur-heavy recipes -- do not
invent one, and only where T2's timing shows it matters.

**T2 -- BUILD `test/torture/t3-frame-alloc.mjs` and SEE IT FAIL FIRST.** Heap
gate (lite-gc-profiler `checkNoGc`, maxMajor 0, maxPauseMs 4) PLUS structural
gates a heap gate cannot substitute for, read off the recording context, per
recipe over 100 frames with hover/drag/toggle/click churn: zero DISTINCT
`fillStyle` string allocations per frame at steady state; zero
`createLinearGradient`/`createRadialGradient` after `init`; zero pool growth
after `init`. Iterate RECIPE_META. Replace the `torture.mjs:113` skip; make
t9 `runAllocControl` fail t3. Capture the pre-sweep RED (t3 failing on 1.2.0
code) in the CHANGELOG rejection ledger before any recipe is edited.

**T3..T7 -- per-family sweeps** (each fixes U-03 + U-05 + U-06 for its rows,
lands green under t3, flips META.themeable as it goes):
- T3: Toggles+Loaders+Checkboxes (11) -- includes the 46/18 geometry fix.
- T4: Buttons (9) -- the push/splice pool set; convert to preallocated
  fixed-size pools with dead flags (no push/splice on interaction).
- T5: Sliders (7) -- classify the 3 gradients init-vs-tick; move per-frame ones
  to init + threshold-rebuild; sparkSlider spawn -> st.w.
- T6: Counters+Rating+Knobs+Progress (8) -- value labels to 10Hz frame-mask;
  VolumeKnob gradient.
- T7: Controls+Indicators+Mood+Feedback+Fun (15) -- dayNight 4-site color,
  scratchReveal spawn -> st.w, timerCountdown toFixed throttle.

**T8 -- docs + gates + META.** Update UIFXRecipes.d.ts (one `RecipeOptions`
base). llms.txt: line 82 "Zero-GC in all built-in recipes" is now TRUE (leave
it, it stops being a lie) -- add the option shape + theme lines. Rewrite the
UIFX-RECIPE-GUIDE.md "splice is fine"/perf section (it now contradicts the
gate). README theming + options delta. Add the t1 width-300 geometry gate.
CHANGELOG 1.3.0 entry. `npm pack --dry-run` unchanged (decisions/ stays out of
files[]).

---

## 4. Falsifiable assertions

- **A1** Every no-option recipe renders byte-identically to 1.2.0 at default
  size: recording-context draw-call sequence AND fillStyle string set diff both
  empty (the DEFAULT_<NAME> consts must reproduce today's literals exactly).
- **A2** t3 green 50/50 at maxMajor 0: zero distinct fillStyle string allocs
  per frame at steady state; zero gradient constructions after init; zero pool
  growth after init.
- **A3** t3 was SEEN to fail on 1.2.0 code before the sweep (logged); after the
  sweep the t9 `runAllocControl` recipe still FAILS t3 (gate not decorative).
- **A4** width-300 t1 gate: every recipe's draws stay inside the padded canvas;
  no `46`/`18`/`* 200` literals remain in any draw/spawn path (neonPulse[206],
  sparkSlider[480], scratchReveal[2030] derive from st.w).
- **A5** `colors` wins over `theme`; `theme {light,mid,dark}` maps onto each
  themed recipe's ramp; RECIPE_META.themeable === true for every themed recipe.
- **A6** Legacy aliases render as before: ConfettiButton `{colors:[...]}` and
  SparkSlider `{color:'...'}` (one-minor documented aliases).
- **A7** `text` renders and equals the accessible name (t2 label-in-name);
  mountUIFX forwards `options.label` as the default `text`; no hardcoded
  'MAGNETIC'/'SHATTER'/... canvas labels remain.
- **A8** 28 baked font literals -> 0 outside DEFAULT_<NAME>; `font` option
  defaults per recipe to its current literal.
- **A9** Value-label recipes rebuild their label string at <=10Hz (frame-mask);
  TimerCountdown toFixed[2091] throttled.
- **A10** `node --expose-gc test/torture.mjs` prints ok exit 0 end-to-end;
  `node --test` green; pack tarball file list unchanged from 1.2.0.

---

## 5. Risks / deltas from the ROADMAP

- **Build t3 before touching a recipe.** It is the review instrument; a sweep
  with no gate to fail first proves nothing (ROADMAP HOT PATH).
- **The 7 "clean?" recipes are unverified, not proven clean.** The scan misses
  bare `{}`/`[]` literals and string concat. t3 decides.
- **CosmicSlider `* 200` [565-566] and the `Math.round(st.val * N)` sites are
  NOT U-05 bugs** -- accel constant and semantic count maps. "Fixing" them to
  st.w changes physics/semantics. Only 206 / 480 / 2030 are geometry.
- **Gradients (612/1001/1395) may already be in init** -- if so, only a
  threshold-rebuild guard is needed, not a move.
- **`radialGradient` count is 0** -- keep the "no gradient after init" gate
  anyway (guards regressions) but know it is currently vacuous for radial.
- **Confirm the controller forwards `options` (incl. `label`) to the recipe
  factory** before wiring the `text` default in T1 -- if it does not, that
  forwarding is a small controller change (verify against UIFXController.js;
  recipes already read `colors`, so options do reach them).
- Recipe count is **50**, confirmed from RECIPE_META, not re-derived.

## 6. Non-goals / done-when

Non-goals: no recipe-contract interface change (law 2); no new recipes or
element types (U4); no demo work (U6); themeable/motionSafe stay driven by META
(motionSafe is U5, not this session).

DONE WHEN: t3 green 50/50; one option convention; every size-dependent constant
derived; the `zero-gc` keyword is true for the first time.
```
