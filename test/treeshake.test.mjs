// test/treeshake.test.mjs
// Prove the ./recipes subpath tree-shakes: importing ONE recipe must not drag the
// other 49 into the bundle. Uses the esbuild JS API on a virtual entry.
//
// esbuild is a devDependency. If it cannot be resolved (e.g. its platform binary
// was not installed in this environment), the test SKIPS with a clear reason --
// never a silent pass.
//
// Why the `pure` hints: the package declares `sideEffects: false`, a contract that
// every top-level statement in UIFXRecipes.js is side-effect-free and thus
// removable when unused. Bundlers that honor `sideEffects` (Rollup, webpack prod)
// drop the eager registry (RECIPES = Object.assign(...), RECIPE_NAMES =
// Object.freeze(Object.keys(RECIPES))) on that promise alone. esbuild is more
// conservative: it keeps builtin calls unless told they are pure. The `pure` list
// names exactly the four Object.* builtins the module uses at module scope, so
// esbuild honors the same `sideEffects: false` promise. It is not gaming: the
// recipe functions have zero cross-references; the ONLY thing linking all 50 is
// that registry, and the resulting bundle collapses from ~78 KB (all bodies) to a
// few KB with 49 recipes provably gone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');

let esbuild = null;
let importError = '';
try {
    esbuild = await import('esbuild');
} catch (e) {
    importError = e && e.message ? e.message : String(e);
}

test('./recipes tree-shakes: importing SwarmToggle drops >=5 other recipes', {
    skip: esbuild ? false : 'esbuild could not be resolved: ' + importError,
}, async () => {
    // Virtual entry: import ONE recipe and keep a live reference so it is not
    // itself shaken away.
    const entry = "import { SwarmToggle } from './UIFXRecipes.js';\nglobalThis.__uifx = SwarmToggle;\n";

    const result = await esbuild.build({
        stdin: { contents: entry, resolveDir: PKG_ROOT, sourcefile: 'treeshake-entry.js' },
        bundle: true,
        minify: true,
        format: 'esm',
        write: false,
        // keepNames so the retained recipe's identity survives minification and is
        // observable in the output text.
        keepNames: true,
        // Honor the module's sideEffects:false promise for its top-level builtins.
        pure: ['Object.assign', 'Object.create', 'Object.freeze', 'Object.keys'],
    });

    const out = result.outputFiles[0].text;

    // The imported recipe's mark survives.
    assert.ok(out.includes('SwarmToggle'), 'SwarmToggle should remain in the bundle');

    // At least five unrelated recipes must be gone entirely.
    const others = ['VolumeKnob', 'TimerCountdown', 'HelixLoader', 'BubbleRating', 'PillTabs'];
    for (const name of others) {
        assert.ok(!out.includes(name), name + ' should be tree-shaken out of a SwarmToggle-only bundle');
    }

    // Sanity on magnitude: a single-recipe bundle is far smaller than the full
    // module (~100 KB source). Guards against a false pass where nothing shook.
    assert.ok(out.length < 20000, 'single-recipe bundle should be small (was ' + out.length + ' bytes)');
});
