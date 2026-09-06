---
package: "@zakkster/lite-ui-fx"
version_target: 1.2.0
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: []
findings: [U-13]
depends_on: [U1]
blocks: [U3, U4]
---

# U2 -- lite-ui-fx v1.2.0 -- recipes into the package (the restructure)

PURPOSE
  Execute the ROADMAP section-4 decision. The 50 recipes stop being a GitHub
  ZIP / copy-paste (U-13) and become versioned, typed, tested, tree-shakeable
  code behind the RECIPES/RECIPE_META registry both siblings ship, exposed as a
  `./recipes` subpath export (the lite-ambient-fx `./worker` idiom). No recipe
  BODY changes (that is U3). Module-eval only; zero runtime hot-path change.

  Record the decision in decisions/0001-recipes-position.md BEFORE coding.

===============================================================================
VERIFIED INPUTS  (every claim below was read, not assumed)
===============================================================================

- Recipe volumes to merge (2,227 lines total), all under recipes/:
    UIFXRecipes.js   629L  10 recipes  imports { lerp, clamp, easeOut } lite-lerp; { Random } lite-random
    UIFXRecipes2.js  789L  20 recipes  imports { lerp, clamp, easeOut, easeIn, easeInOut } lite-lerp; { Random }
    UIFXRecipes3.js  809L  20 recipes  imports { lerp, clamp, easeOut, easeIn } lite-lerp; { Random }
  Their d.ts: recipes/UIFXRecipes{,2,3}.d.ts (import type { UIFXRecipe } from '../UIFXController').
- Registry to PORT: LiteScratchFX/index.js:44-145 -- RECIPES = Object.assign(Object.create(null), {...});
  RECIPE_META = [ {id,name,category,themeable,needsUntaintedCanvas,motionSafe}, ... ] (a live array);
  RECIPE_NAMES = Object.freeze(Object.keys(RECIPES)); registerRecipe(id,factory,meta) with meta-merge
  (meta field -> prev entry field -> de-camelCased name / 'custom' / false). Port this verbatim, swapping
  scratch-fx's `category` for our `type` + `family`, and dropping needsUntaintedCanvas (scratch-only).
- Packaging idiom to MIRROR: LiteAmbientFX/package.json exports has "." and "./worker" (import+types);
  files[] lists the worker file. We add "./recipes" the same way.
- Current package.json (LiteUIFX): single "." export (UIFXController.js/.d.ts); files[] has NO recipe
  entries and lists recipes/UIFX-RECIPE-GUIDE.md as the guide path; version 1.1.0.
- README.md ZIP/copy-paste block: lines 43-62 ("ships only the core controller ... recipes live in the
  GitHub repo ... Download all recipes as a ZIP") and Import Map lines 100-115 (./recipes/UIFXRecipes*.js).
- llms.txt import lines 14-20; recipe list 40-63; controller VERSION line 4.
- UIFXController.js: exports mountUIFX(container, type, recipeFactory, options?), UIType {BUTTON,TOGGLE,
  SLIDER}, VERSION='1.1.0'. mountRecipe will import { mountUIFX, UIType } from it (recipes -> controller
  is allowed; controller -> recipes is FORBIDDEN, no cycle).
- Type ground truth: demo/*.html carry {type, recipe} per recipe (inline reimpl, U-12). Types validated
  against the hook each body returns (onToggle->toggle, onClick->button, onDrag->slider); every
  hook-bearing recipe agrees with its demo type. See the table below.

===============================================================================
THE RECIPE_META TABLE  (the crux -- all 50, id/export/type/family; themeable:false, motionSafe:false for all)
===============================================================================

id                     export                  type     family
-- Vol.1 --
swarmToggle            SwarmToggle             toggle   Toggles
liquidToggle           LiquidToggle            toggle   Toggles
neonPulseToggle        NeonPulseToggle         toggle   Toggles
magneticButton         MagneticButton          button   Buttons
shatterButton          ShatterButton           button   Buttons
confettiButton         ConfettiButton          button   Buttons
glitchButton           GlitchButton            button   Buttons
sparkSlider            SparkSlider             slider   Sliders
cosmicSlider           CosmicSlider            slider   Sliders
laserSlider            LaserSlider             slider   Sliders
-- Vol.2 --
pendulumToggle         PendulumToggle          toggle   Toggles
circuitToggle          CircuitToggle           toggle   Toggles
lightningToggle        LightningToggle         toggle   Toggles
dnaToggle              DNAToggle               toggle   Toggles
heartbeatButton        HeartbeatButton         button   Buttons
breathingButton        BreathingButton         button   Buttons
inkSplashButton        InkSplashButton         button   Buttons
pixelDissolveButton    PixelDissolveButton     button   Buttons
fireworkButton         FireworkButton          button   Buttons
auroraSlider           AuroraSlider            slider   Sliders
waveSlider             WaveSlider              slider   Sliders
elasticBandSlider      ElasticBandSlider       slider   Sliders
gravitySlider          GravitySlider           slider   Sliders
orbitLoader            OrbitLoader             toggle   Loaders
helixLoader            HelixLoader             toggle   Loaders
rippleCheck            RippleCheck             toggle   Checkboxes
morphCheck             MorphCheck              toggle   Checkboxes
flameCounter           FlameCounter            slider   Counters
glitchCounter          GlitchCounter           slider   Counters
bubbleRating           BubbleRating            slider   Rating
-- Vol.3 --
volumeKnob             VolumeKnob              slider   Knobs
compassKnob            CompassKnob             slider   Knobs
ringProgress           RingProgress            slider   Progress
batteryGauge           BatteryGauge            slider   Progress
signalMeter            SignalMeter             slider   Progress
pillTabs               PillTabs                button   Controls
stepper                Stepper                 button   Controls
radioOrbit             RadioOrbit              slider   Controls
passwordStrength       PasswordStrength        slider   Indicators
waterLevel             WaterLevel              slider   Indicators
heatMap                HeatMap                 slider   Indicators
dayNightToggle         DayNightToggle          toggle   Mood
reactionPicker         ReactionPicker          button   Mood
notificationBell       NotificationBell        button   Mood
typewriterField        TypewriterField         toggle   Feedback
soundWaveBtn           SoundWaveBtn            button   Feedback
uploadProgress         UploadProgress          slider   Feedback
scratchReveal          ScratchReveal           slider   Fun
timerCountdown         TimerCountdown          toggle   Fun
pullRefresh            PullRefresh             slider   Fun

Tally: toggle 14, button 14, slider 22 = 50. RECIPE_NAMES.length === 50.

ID SCHEME (decision): id = the export name with its first character lower-cased
  (SwarmToggle -> swarmToggle). Unique by construction (export names are unique)
  -> no collisions (glitchButton != glitchCounter). ONE documented exception for
  the acronym: DNAToggle -> 'dnaToggle' (not 'dNAToggle'). NOTE this differs from
  the ROADMAP's illustrative shorthand ('swarm'); the did-you-mean still names the
  real id on a typo, satisfying the assertion's intent. (If short ids are wanted
  instead, that is a one-line change + explicit Glitch* disambiguation -- flagged.)

===============================================================================
CONSOLIDATION SPEC  (mechanical, behaviour-preserving -- NO recipe body edits)
===============================================================================

The merged file recipes-into-root UIFXRecipes.js is assembled, not retyped:

1. HEADER + IMPORTS (one union block, replacing all three volumes' imports):
     import { lerp, clamp, easeOut, easeIn, easeInOut } from '@zakkster/lite-lerp';
     import { Random } from '@zakkster/lite-random';
   (Vol.1 used a subset, Vol.2 the full set, Vol.3 a subset -- the union is Vol.2's set.)

2. SHARED HELPERS -- keep every distinctly-named helper; drop ONLY the duplicate:
     - roundRect  : defined in Vol.1 (UIFXRecipes.js:38-50) AND Vol.2 (UIFXRecipes2.js:20-26).
                    The two bodies are IDENTICAL modulo whitespace (verified). Keep ONE
                    (Vol.1's pretty form); DELETE Vol.2's. Every caller keeps calling
                    roundRect(...) unchanged -> zero behaviour change.
     - keep drawFocusRing, drawStateLabel (Vol.1); label, focusRing (Vol.2);
       rr, lbl, fr, PI2 (Vol.3) -- these names do NOT collide.

3. THE 50 RECIPE FUNCTIONS verbatim, grouped by family, export names UNCHANGED.
   No edits to any recipe body. (Merge order suggestion: Vol.1, then Vol.2, then
   Vol.3 recipe blocks -- but grouped-by-family within is fine too; do not touch bodies.)

4. THREE BARREL OBJECTS kept as named exports for back-compat: UIFXRecipes (10),
   UIFXRecipes2 (20), UIFXRecipes3 (20) -- exactly their current membership.
   Default export: a combined all-50 namespace object (new; low-risk). d.ts reflects it.

5. THE REGISTRY (new, appended -- see next section).

Assembly hint to keep coder turns low: concatenate the three source files with a
one-shot shell/node step, then surgically remove Vol.2's roundRect (7 lines) and the
three import headers, prepend the union import, and hand-add sections 4-5. Then PROVE
faithfulness: `node --input-type=module -e "import * as R from './UIFXRecipes.js'; ..."`
asserts all 50 named exports exist and are functions.

===============================================================================
REGISTRY + mountRecipe SPEC  (in UIFXRecipes.js -- NOT the controller)
===============================================================================

- RECIPES = Object.assign(Object.create(null), { swarmToggle: SwarmToggle, ... }) -- all 50, keyed by id.
- RECIPE_META = [ { id, name, type, family, themeable: false, motionSafe: false }, ... ] -- a live array,
  one row per table entry above. `name` = de-camelCased display (e.g. 'Swarm Toggle').
- RECIPE_NAMES = Object.freeze(Object.keys(RECIPES)).  // length 50 at load
- registerRecipe(id, factory, meta): port LiteScratchFX/index.js:122-145 exactly, with fields
  { name, type, family, themeable, motionSafe } (drop category/needsUntaintedCanvas). Meta-merge:
  provided meta field -> existing entry field (on override) -> de-camelCased name / type undefined-guarded /
  family 'custom' / false flags. Non-string/empty id and non-function factory throw TypeError. Updates
  RECIPE_META in place (picker liveness). Returns the factory.
- mountRecipe(container, id, options?): FAIL CLOSED.
    * RECIPES[id] missing -> throw Error naming the nearest RECIPE_NAMES entry (did-you-mean; small
      edit-distance suggest, module-local -- do NOT import controller internals).
    * meta = RECIPE_META row for id. If options.type is provided and options.type !== meta.type -> throw
      (this is the "slider recipe id + toggle container type" assertion). If options.type omitted, use
      meta.type. (options.type is consumed here, not forwarded as a mount option.)
    * delegate: mountUIFX(container, meta.type, RECIPES[id], options-without-type).
  import { mountUIFX, UIType } from './UIFXController.js' at the top of the recipes module.

===============================================================================
TASKS  (2-coder split; Coder-2 depends on Coder-1's shipped module + final RECIPE_META)
===============================================================================

CODER-1  (the module + registry + package wiring + version)
  T1  Write decisions/0001-recipes-position.md (ADR): the section-4 decision, why (siblings ship a
      registry; ZIP is untested/untyped/unversioned/invisible to npm audit), the id scheme + its exception.
  T2  Assemble UIFXRecipes.js at package root per CONSOLIDATION SPEC (roundRect dedupe, import union,
      50 bodies verbatim, 3 barrels, default). ASCII-only.
  T3  Merge the 3 d.ts into UIFXRecipes.d.ts at root: all 50 declared functions + the 3 barrel consts +
      RECIPES / RECIPE_META (typed rows) / RECIPE_NAMES / registerRecipe / mountRecipe signatures + default.
      Fix the internal import path (now './UIFXController', not '../').
  T4  Append the registry + mountRecipe (REGISTRY SPEC).
  T5  Delete recipes/ dir; move UIFX-RECIPE-GUIDE.md to package root.
  T6  package.json: add exports["./recipes"] { import: ./UIFXRecipes.js, types: ./UIFXRecipes.d.ts } (keep
      "." untouched); files[] += UIFXRecipes.js, UIFXRecipes.d.ts, UIFX-RECIPE-GUIDE.md; drop the old
      recipes/UIFX-RECIPE-GUIDE.md files[] entry; bump version 1.1.0 -> 1.2.0.
  T7  Version sync: UIFXController.js VERSION const -> '1.2.0'; llms.txt VERSION line -> 1.2.0;
      test/law.test.mjs VERSION_EXPECTED -> '1.2.0'; package-lock.json own version (lines 3 and 9) -> 1.2.0.
      The recipes module carries NO VERSION const (controller stays the single versioned main file per law).
  PROVE (Coder-1): `npm test` green; a node import smoke asserting all 50 named exports are functions,
      RECIPE_NAMES.length===50, mountRecipe(c,'swrmToggle') throws naming 'swarmToggle',
      mountRecipe(c,'sparkSlider',{type:'toggle'}) throws, registerRecipe round-trips + updates META.
      HANDOFF: report the final RECIPES key list so Coder-2 wires the harness to it.

CODER-2  (META-driven torture + registry test + tree-shake + docs)
  T8  test/torture.mjs: replace any hand-listed recipe set with iteration over RECIPE_META so t0-lifecycle
      and t1-degenerate mount EVERY recipe (as meta.type) by construction. Keep the GATE line format and the
      existing tiers (t2/t4/t5/t9 from U1). A t9 control must still trip (gate can fail).
  T9  test/registry.test.mjs (NEW, node:test): port the scratch-fx registry suite -- register a new recipe,
      override a built-in, meta fallback semantics, null-prototype (no Object.prototype key bleed),
      RECIPE_NAMES frozen, mountRecipe fail-closed (unknown id did-you-mean; type mismatch throws).
  T10 test/treeshake.test.mjs (NEW): bundle a module importing ONE recipe from ./UIFXRecipes.js via esbuild;
      assert the output text lacks the function names of >=5 other recipes. esbuild is NOT installed --
      add it to devDependencies AND write the test to SKIP honestly (node:test skip w/ reason) when esbuild
      cannot be resolved. NEVER a fake pass. (If the devDep install is unavailable in this env, ship the
      skipping test + the devDep entry; note it in the release output.)
  T11 README.md: replace the ZIP/copy-paste section (43-62) + Import Map (100-115) with the ./recipes import
      story + a one-line registry/mountRecipe mention. MINIMAL edit -- the full blueprint rewrite is U6.
      llms.txt: update import lines to `from '@zakkster/lite-ui-fx/recipes'`; add registry/mountRecipe lines;
      drop "distributed as ZIP" wording.
  PROVE (Coder-2): `node --expose-gc test/torture.mjs` -> GATE ok across all 50, warnings 0; the t9 control
      trips when armed; `npm pack --dry-run` shows UIFXRecipes.js + UIFXRecipes.d.ts + UIFX-RECIPE-GUIDE.md
      PRESENT and demo/ + test/ ABSENT; `npm test` green including registry + treeshake.

===============================================================================
ASSERTIONS  (falsifiable)
===============================================================================
A1  import { SwarmToggle } from '@zakkster/lite-ui-fx/recipes' resolves; all 50 named exports present.
A2  RECIPE_NAMES.length === 50; RECIPES has null prototype (Object.getPrototypeOf === null).
A3  mountRecipe(c, 'swrmToggle') throws, message contains 'swarmToggle' (did-you-mean).
A4  mountRecipe(c, 'sparkSlider', { type: 'toggle' }) throws (type mismatch); mountRecipe(c,'sparkSlider')
    mounts as slider.
A5  registerRecipe('x', f, { type:'button', family:'Custom' }) -> RECIPES.x===f and a RECIPE_META row exists;
    calling again with { name:'Y' } merges name while keeping type (in-place update, picker liveness).
A6  npm pack --dry-run: UIFXRecipes.js, UIFXRecipes.d.ts, UIFX-RECIPE-GUIDE.md IN; demo/, test/, BRIEF*, ROADMAP OUT.
A7  node --expose-gc test/torture.mjs -> GATE leak=size 0/0 findings=0 warnings=0, gc major=0, ok; all 50 mounted.
A8  A t9 control (e.g. a recipe with no tick, or a bypass of mountRecipe's type check) makes the gate FAIL.
A9  treeshake: importing SwarmToggle yields a bundle lacking >=5 other recipe fn names (or the test SKIPs
    with a clear reason when esbuild is absent -- never silently passes).
A10 Three-place version sync: package.json === UIFXController.js VERSION === llms.txt VERSION === '1.2.0';
    law.test VERSION_EXPECTED matches.

===============================================================================
LAW / HOT-PATH NOTES
===============================================================================
- Module evaluation only; no per-frame code changes. Recipe bodies untouched -> no alloc/GC regression.
- Controller stays dependency-pure: it imports NOTHING from the recipes module (no cycle). Recipes import
  the controller (mountUIFX/UIType) -- allowed direction.
- ASCII-only across UIFXRecipes.js, its d.ts, the ADR, README, llms.txt (U+00D7, U+00B5 excepted). Grep the
  assembled file for stray tool-call tags and non-ASCII before trusting it.
- sideEffects:false must hold (it does) for the ./recipes tree-shake guarantee.
- Null-prototype RECIPES; fail-closed mountRecipe (unknown id / type mismatch throw, never shrug).

===============================================================================
NON-GOALS
===============================================================================
- No recipe body edits. Zero-GC/size-true/themeable sweep is U3.
- themeable and motionSafe stay false for all 50 until U3 makes them true.
- No new native element types (checkbox/knob/progress get real types in U4); every recipe's type is one of
  the existing toggle/button/slider here.
- demo/ untouched (U6 rebuilds it to consume the package).

===============================================================================
RISKS / OPEN DECISIONS  (surface before/at review)
===============================================================================
R1  id scheme = full lowerFirst export name (swarmToggle), NOT the roadmap's 'swarm' shorthand. Chosen for
    zero-collision safety. If short ids are preferred, Glitch{Button,Counter} need explicit disambiguation.
R2  esbuild devDep: may be uninstallable in this env. Fallback = honest-skipping treeshake test + the devDep
    entry recorded. Report which happened in the release output.
R3  PullRefresh returns onDrag AND onToggle but mounts as slider -- inert onToggle is a U3 cleanup, NOT a
    U2 bug; reviewer should not flag it.
R4  Default export of the merged module is new (combined all-50). Low risk; reviewer sanity-checks it does
    not shadow the named UIFXRecipes barrel.
R5  Recipes import lite-lerp/lite-random (runtime deps, already declared). Consolidation must union, not
    duplicate, those imports -- a double import is a redeclare error.

===============================================================================
DONE WHEN
===============================================================================
one UIFXRecipes.js shipped + typed at root; RECIPES/RECIPE_META/RECIPE_NAMES/registerRecipe/mountRecipe live;
RECIPE_META drives t0/t1 over all 50; registry.test + treeshake test pass (or honest skip); ZIP story gone
from README/llms.txt; version 1.2.0 synced three places; torture gate green + a control trips; pack clean.
