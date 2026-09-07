# 0002 -- One recipe option convention (theming, fonts, label-in-name)

Status: accepted (U3b, v1.4.0)
Supersedes nothing. Follows 0001 (recipes position).
Findings: U-06.

## Context

U3 (1.3.0) made all 50 recipes allocation-free (U-03) and size-true (U-05) but
deferred U-06. Theming is still three conventions plus hardcoded hex; fonts are
baked at ~35 sites across two families (`'Space Grotesk',sans-serif`,
`'JetBrains Mono',monospace`); ten recipes paint a hardcoded canvas label
(`'MAGNETIC'`, `'SHATTER'`, ...) the accessible `label` can never match -- a WCAG
2.5.3 label-in-name failure. `RECIPE_META.themeable` is `false` for all 50.

The controller option allowlist (`KNOWN_OPTIONS`, UIFXController.js) is
fail-closed: any key not on it throws did-you-mean. So a themed mount throws
today until the allowlist admits the theming keys. The controller already
forwards the whole options object to the factory (`recipeFactory(options)`), so
no new plumbing is needed once the keys are allowed.

## Decision

One reserved, global, optional option set across all 50 factories:

    { seed?: number,
      colors?: string[],             // positional palette override; WINS over theme
      theme?: { light, mid, dark },  // named roles; strings; partial/extra keys throw
      text?: string,                 // canvas label; falls back to label, then default
      font?: string }                // falls back to the recipe's current font literal

1. **Reserved, not free-form.** The allowlist stays fail-closed. These five keys
   are added to `KNOWN_OPTIONS` and validated; truly recipe-specific knobs stay
   out of scope (a bare `SwarmToggle({seed,count})`-style factory arg still works
   because the controller forwards options -- but only the reserved keys are
   controller-validated). Unknown keys still throw did-you-mean.

2. **Role vocabulary.** Each themeable recipe declares `DEFAULT_<NAME>`, a frozen
   object keyed by role: `accent` (the signature/bright color), `dim` (muted /
   secondary), `surface` (dark track / background), plus any extra named roles
   (e.g. `text`, `warn`). `theme` maps `light -> accent`, `mid -> dim`,
   `dark -> surface`. `colors` overrides positionally over `Object.keys(DEFAULT)`
   (accent, dim, surface, extras...). `colors` applied after `theme` (wins).

3. **Resolution is COLD.** `resolveTheme(options, DEFAULT)` runs once in the
   factory / `init`, returning a per-instance palette object. `tick` reads only
   the resolved const strings (+ globalAlpha) and any const LUT built from them in
   `init`. Nothing in `tick` reads `theme`/`colors`/`seed` or builds a string from
   them. The t3 gate is re-run under a themed driver to prove this.

4. **Defaults are byte-identical (U3 invariant).** `DEFAULT_<NAME>` holds today's
   exact literals, so a bare mount renders byte-for-byte as 1.3.0 -- colors, fonts,
   labels unchanged. Theming is purely additive.

5. **label-in-name.** Every hardcoded canvas label becomes `text`, resolved in ONE
   place as `text ?? label ?? recipeDefault`. `mountUIFX` forwards both `text` and
   `label`, so a mount that sets only the accessible `label` also drives the
   visible text -- the visible string equals the accessible name by construction.

6. **hueforge is an AUTHORING tool, never a runtime dep.** `DEFAULT_<NAME>` stays
   the current hex (byte-parity). A non-shipped `tools/palettes.mjs` (devDependency
   `@zakkster/lite-hueforge`) VERIFIES each text-bearing recipe's label-vs-surface
   APCA (`apcaPair` >= `APCA_THRESHOLDS`) and emits example `theme` triples via
   `forgePalette` / `deriveTheme` for the docs. It does NOT overwrite the defaults
   (that would break byte-parity). An APCA miss on a shipped default is reported as
   a finding, not silently mutated -- fixing it changes visuals and is the owner's
   call. Runtime `theme`/`colors` overrides are honored as given.

7. **Legacy palette options preserved.** The initial grep for
   `options.colors`/`options.color` missed the factory-SIGNATURE reads:
   ConfettiButton already destructured `colors` (a 5-colour array) and SparkSlider
   `color` (a single hex), and FireworkButton / AuroraSlider / RadioOrbit /
   PasswordStrength / ReactionPicker each carry an internal palette array. These
   are honoured, not broken: a recipe whose palette IS an array keeps reading
   `colors` (now the global reserved key, normalised to the array length it needs);
   SparkSlider's `color` folds into the default accent so `theme`/`colors` still
   override it. For an array-palette recipe, `theme` seeds the array as
   `[light, mid, dark]`.

## Consequences

- `RECIPE_META.themeable` flips `true` for all 50 (motionSafe stays `false` -- U5).
- One `RecipeOptions` base in `UIFXRecipes.d.ts`.
- The recipe guide's per-frame performance section (deferred from U3) is rewritten
  to match the t3 gate.
- lite-ui-fx runtime dependency set is unchanged (no hueforge at runtime).
