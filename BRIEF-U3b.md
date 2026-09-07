===============================================================================
# U3b -- lite-ui-fx v1.4.0 -- the theming pass (U-06), the deferred half of U3
===============================================================================

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.4.0     # see "Versioning" -- renumbers the roadmap tail; owner's call
status: planned
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
findings: [U-06]
depends_on: [U3]          # 1.3.0 landed U-03 (zero-GC) + U-05 (size-true); U-06 was deferred
blocks: [U4, U5, U8]      # every downstream session needs the option/theme shape
authoring_tool: "@zakkster/lite-hueforge 1.10.0 (OKLCH + APCA) -- AUTHORING TIME ONLY, never a runtime dep"
peers: ["@zakkster/lite-gc-profiler"]
---

# lite-ui-fx -- one option convention, themeable for the first time,
# label-in-name closed, zero-GC held

PURPOSE
  Finish U3. The 1.3.0 sweep made all 50 recipes allocation-free (U-03) and
  size-true (U-05) but deferred the third S2, U-06: theming is still half-built
  with three conventions (ConfettiButton `colors`, SparkSlider `color`, ~45
  hardcoded hex), fonts are baked at ~28 sites, and every button label is a
  hardcoded canvas string ('MAGNETIC', 'SHATTER', ...) that the accessible
  `label` can never match -- a WCAG 2.5.3 label-in-name failure by construction.
  META.themeable / motionSafe are still `false` for all 50. This session applies
  ONE option convention across all 50 factories, flips themeable true, closes
  label-in-name, and does it WITHOUT reintroducing a single per-frame allocation
  (the t3 gate is re-run under themed mounts as the proof).

VERIFIED INPUTS (state as of 1.3.0, read before planning)
  - Controller allowlist is strict and fail-closed: KNOWN_OPTIONS =
    ['width','height','padding','label','value','checked','disabled']
    (UIFXController.js:87); an unlisted key throws did-you-mean
    (UIFXController.js:191-192). A themed mount ({theme}/{colors}/{text}/{font})
    THROWS today -- the allowlist must grow first.
  - The controller already forwards the whole options object to the factory:
    `const recipe = recipeFactory(options)` (UIFXController.js:219). The 1.3.0
    CHANGELOG calls this "inert until the U-06 theming pass uses it" -- this is
    that pass. No new plumbing needed; the recipe reads options.* directly.
  - U3 already gave the shared label helpers (label/lbl/drawStateLabel) a `font`
    param and introduced module consts (DASH_FOCUS, PCT, per-recipe color/LUT
    consts). The theming sweep swaps those hardcoded consts for values resolved
    once in init -- the same cold-path-resolve, hot-path-read discipline.
  - decisions/ holds only 0001-recipes-position.md. This session records 0002.
  - lite-hueforge exports (node-safe, pure): forgePalette(seed,opts)->OklchColor[],
    monochromeScale/zoneScale, deriveTheme(input,opts)->{tokens,audit}
    (every fg/surface pair APCA-SOLVED), apcaPair + APCA_THRESHOLDS, deltaEok,
    toHex/fromHex. NOTE: bakeSliderTrack and extractPaletteFromImage are
    browser-only -- never call them here. createScale/createPalette are REACTIVE
    (own lite-signal nodes) -- never call them here either.

THE DECISION (record as decisions/0002-recipe-options.md BEFORE coding)
  1. One option shape, a small GLOBAL reserved set (not per-recipe free-for-all,
     because the controller allowlist is fail-closed):
        { seed?: number,
          colors?: string[],            // positional palette override, wins over theme
          theme?: { light, mid, dark }, // named roles; strings; partial/wrong-shape throws
          text?: string,                // canvas label; falls back to label, then recipe default
          font?: string }               // falls back to the recipe's current font const
     colors WINS over theme; theme maps {light,mid,dark} onto each recipe's role
     slots; a bare factory renders byte-identical to 1.3.0 (defaults preserved).
     The {light,mid,dark} shape matches lite-scratch-fx so a themed host drives
     both packages with one object. Legacy one-offs (ConfettiButton `colors`,
     SparkSlider `color`) keep working as documented aliases for one minor.
  2. Resolution is COLD. Each recipe resolves a `pal` (named role strings) and
     any value-indexed color LUT ONCE in init(), from theme || colors || the
     baked DEFAULT_<NAME>. tick() reads only concrete const strings + globalAlpha
     and const LUTs -- exactly the post-U3 hot-path shape. NOTHING in tick reads
     theme/colors/seed or builds a string from them.
  3. Zero new RUNTIME deps. lite-hueforge is an AUTHORING tool, not a dependency:
     a non-shipped tools/palettes.mjs (devDependency: lite-hueforge) generates
     each recipe's DEFAULT ramp in OKLCH (forgePalette / monochromeScale /
     deriveTheme) and APCA-verifies each text-bearing recipe's label-vs-background
     via apcaPair >= APCA_THRESHOLDS, then emits the baked hex consts that ship in
     UIFXRecipes.js. The recipe source imports NOTHING from hueforge. Runtime
     theme/colors overrides are honored as given (user-supplied strings, or the
     user's own hueforge output); the OKLCH/APCA guarantee is on the shipped
     DEFAULTS. LUT recipes that need N shades from 3 anchors interpolate in init
     (cold), sRGB-lerp acceptable -- perceptual correctness lives in the defaults.

TASKS
  - Controller (UIFXController.js): extend KNOWN_OPTIONS with
    'colors','theme','text','font','seed'. Validate each fail-closed beside the
    existing value/checked/disabled block (colors: array of strings; theme:
    object with string light/mid/dark, reject partial/extra keys; text/font:
    string; seed: finite number). Forwarding is already done (line 219). Resolve
    the label-in-name default in ONE place: the shared label helper renders
    text ?? label ?? recipeDefault, so no recipe can forget the fallback.
  - tools/palettes.mjs (NOT in files[]; devDependency lite-hueforge): the palette
    generator + APCA gate described in decision 3. Deterministic (seeded); re-run
    regenerates byte-for-byte. Emits DEFAULT_<NAME> consts (or a defaults block)
    into UIFXRecipes.js. Fails if any text-bearing default misses the APCA floor.
  - Theming sweep, all 50 recipes: replace every hardcoded hex/font/label with a
    role resolved in init from the reserved options; delete the three legacy
    conventions in favor of the one shape (keep the two legacy aliases working);
    the ~28 baked fonts become `font` (default = current string); every hardcoded
    canvas label becomes `text` (default = the current visible string, so a bare
    mount is unchanged) and flows through the label helper's text??label resolve.
  - RECIPE_META: flip themeable -> true per recipe as it lands (the suite iterates
    META, so t1/t2/t3 coverage is automatic). motionSafe STAYS false (that is U5).
  - Torture t3 (test/torture/t3-scan.mjs + t3-frame-alloc.mjs): add a THEMED
    driver variant -- mount each recipe with a custom { colors|theme, text, font }
    and assert the SAME gate (major===0, gradInTick===0, cdist<=64). This is the
    proof that palette resolution stayed in init. The __alloc_control__ must still
    fail. Keep HOT and the child-process --max-semi-space-size=1 launch.
  - Torture t2 (accessibility): assert the rendered canvas text equals the
    accessible name (label-in-name) for every text-bearing recipe, at default and
    with a custom { text }.
  - Docs (NOT the full README blueprint -- that is U6): UIFXRecipes.d.ts gains one
    RecipeOptions base ({ seed?, colors?, theme?, text?, font? }); llms.txt gains
    the option convention + "themeable: true"; UIFX-RECIPE-GUIDE.md -- rewrite the
    "splice is fine" / per-frame performance section deferred from U3 (it now
    contradicts the t3 gate) and document the theming options. CHANGELOG 1.4.0.

HOT PATH
  This session must not cost one byte on a frame. The review IS t3 under the
  themed driver: zero string allocations at steady state, zero gradient
  constructions after init, cdist within budget -- with a non-default palette.
  Any recipe that reads options.theme/colors inside tick, or rebuilds a LUT or a
  gradient per frame after a theme swap, fails the gate. Palette resolve, LUT
  build, gradient build, font-string pick: all init(), all once.

ASSERTIONS (falsifiable)
  - Bare mount of every recipe is byte-identical to 1.3.0 at default size
    (recording-context draw-call + color diff): defaults preserved.
  - Mount with { theme: {light,mid,dark} } recolors; { colors: [...] } wins over
    theme; the ConfettiButton `colors` and SparkSlider `color` legacy aliases
    still work.
  - Mount with { theme: { light } } (partial) throws; { fribble: 1 } still throws
    did-you-mean (allowlist stayed fail-closed).
  - { text: 'Go' } renders 'Go' on the canvas AND equals the accessible name
    (t2); with no text, the recipe's default visible string is used and label,
    when given, overrides it.
  - t3 GREEN across all 50 under BOTH the default and the themed driver
    (major===0, grad===0, cdist<=64); __alloc_control__ still FAILS.
  - tools/palettes.mjs re-run: every text-bearing recipe default clears
    apcaPair >= APCA_THRESHOLDS; regeneration is byte-stable.
  - RECIPE_META.themeable === true for all 50; motionSafe === false for all 50.
  - npm test green; node --expose-gc test/torture.mjs prints ok; npm pack
    --dry-run: tools/ absent, UIFX-RECIPE-GUIDE.md present.

NON-GOALS
  No reduced motion, no state.budget, no motionSafe flip (U5). No new element
  types, no decorate mode (U4). No new recipes (U8). No full README blueprint
  rewrite (U6) -- only the recipe guide's performance section + option docs.
  No lite-hueforge in dependencies (authoring tool only). No recipe-interface
  change (law 2): theming rides the existing options arg, not a new hook. No
  particle-engine migration -- do NOT swap the 1.3.0-gated hand-rolled pools for
  lite-particles here; that is a separate consolidation session, and theming must
  not churn proven pool code.

DONE WHEN
  one option convention across all 50; themeable true for the first time;
  label-in-name closed by construction; the shipped default palettes are
  OKLCH-correct and APCA-verified; t3 green for 50/50 under a themed mount;
  a bare factory still renders byte-identical to 1.3.0
```

-------------------------------------------------------------------------------
## Versioning (owner's release-planning call)

U3 split into two shipped sessions (1.3.0 zero-GC + size-true; this pass for
theming). Adding the reserved option surface (colors/theme/text/font/seed) and
flipping themeable is backward-compatible NEW functionality -> semver MINOR ->
**1.4.0** (a patch would understate a new public option surface). Consequence:
the roadmap tail shifts one minor -- U4 -> 1.5.0, U5 -> 1.6.0, U6 -> 1.7.0,
U7 -> 1.8.0 or 2.0.0, U8 -> 1.9.0. Alternatively fold nothing and keep the
roadmap numbers by treating this as "U3 completion" -- but the honest semver is
1.4.0. Recommend 1.4.0 + renumber; your call before the pipeline runs.

## Why this is the next session (not U4/U5/U6)

U4 "builds on the option/theme shape from U3"; U5 needs "the option convention
(U3)"; U8 needs it too. U-06 is the one unmet piece of U3's DONE-WHEN and the
hard dependency under almost everything downstream. META.themeable is a
registry flag whose entire purpose is to eventually be true; today it is an
honest `false` waiting on exactly this sweep. Finishing it unblocks the most and
keeps every later session born themeable.
