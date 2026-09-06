# 0001 -- Recipes ship inside the package

Status: accepted
Date: 2026-09-06
Scope: @zakkster/lite-ui-fx v1.2.0

## Context

Through v1.1.0 the package shipped only the core controller
(`UIFXController.js`). The 50 canvas recipes lived in the GitHub repo as three
loose volumes (`recipes/UIFXRecipes{,2,3}.js`) that a consumer copy-pasted or
downloaded as a ZIP. That distribution has four concrete costs:

- untested -- the ZIP files never run under `node --test` or the torture gate,
  so a regression in a recipe body ships silently.
- untyped at the install site -- the `.d.ts` files never reach `node_modules`,
  so editors get no completion for `SwarmToggle` and friends.
- unversioned -- a copy-pasted recipe has no semver; a consumer cannot tell
  which revision they hold, and a fix cannot be delivered through `npm update`.
- invisible to `npm audit` / provenance -- code outside the published tarball is
  outside every supply-chain check the registry performs.

Both sibling packages already solve this the other way: they ship a recipe/theme
registry inside the tarball (`RECIPES` + `RECIPE_META`, e.g. LiteScratchFX's
`registerRecipe`, lite-ambient's `registerTheme` + `THEME_META`). lite-ui-fx was
the outlier.

## Decision

Consolidate the three volumes into ONE shipped file, `UIFXRecipes.js`, at the
package root, exposed as a `./recipes` subpath export (the lite-ambient-fx
`./worker` idiom):

    import { SwarmToggle } from '@zakkster/lite-ui-fx/recipes';

The file carries the same registry surface both siblings ship:

- `RECIPES` -- a null-prototype map, keyed by id, of all 50 recipe factories.
- `RECIPE_META` -- a live array of `{ id, name, type, family, themeable,
  motionSafe }` rows, one per recipe, so a host builds a picker without
  hardcoding the list.
- `RECIPE_NAMES` -- `Object.freeze(Object.keys(RECIPES))`.
- `registerRecipe(id, factory, meta?)` -- add or override a recipe; updates
  `RECIPE_META` in place so existing pickers keep working.
- `mountRecipe(container, id, options?)` -- resolve id -> factory + type and
  delegate to `mountUIFX`. Fail closed: an unknown id throws with a did-you-mean
  hint naming the nearest real id; a caller-supplied `options.type` that
  disagrees with the recipe's declared type throws.

The three original barrel objects (`UIFXRecipes` = 10, `UIFXRecipes2` = 20,
`UIFXRecipes3` = 20) remain named exports for back-compat; a combined default
export exposes all 50 factories.

No recipe body is edited in this change -- this is a structural move only. The
controller imports NOTHING from the recipes module (recipes -> controller is the
only allowed direction; there is no cycle).

## ID scheme

An id is the export name with its first character lower-cased, verbatim:

    SwarmToggle   -> swarmToggle
    MagneticButton -> magneticButton

Export names are unique, so ids are unique by construction -- `glitchButton` and
`glitchCounter` never collide. There is ONE documented exception, for the
acronym in the only all-caps-prefixed export:

    DNAToggle -> dnaToggle   (not 'dNAToggle')

This differs from an earlier illustrative shorthand ('swarm'); the did-you-mean
on a typo still names the real id, which is what the fail-closed contract needs.

## Consequences

- Recipes are now tested (torture + registry suites), typed at the install site,
  versioned with the package, and inside every supply-chain check.
- `sideEffects: false` still holds, so `import { SwarmToggle }` tree-shakes the
  other 49 recipes out of a consumer bundle.
- The recipes module carries NO `VERSION` const -- the controller stays the
  single versioned main file per packaging law.

MIT (c) Zahary Shinikchiev <shinikchiev@yahoo.com>
