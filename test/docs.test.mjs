// test/docs.test.mjs
// The executable doc gate (U6). Every fenced js/javascript block in README.md
// is extracted, its package specifiers are rewritten to the local files, and it
// is imported as a module under the DOM stub -- so it must resolve real exports
// and evaluate with no throw. "The docs describe the code that exists" (blueprint
// law) becomes a test, not a promise. A deliberately broken control block must
// fail the same runner, so the gate can fail.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { installDom, makeContainer, ElementStub } from './harness/dom-stub.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const require = createRequire(import.meta.url);

// --- headless DOM + a no-op clock so a real mount/destroy example runs -------
// node --test isolates each test file in its own process, so augmenting these
// globals here never leaks into the other suites.
installDom({ dpr: 1 });
globalThis.requestAnimationFrame = () => 0;   // examples mount + destroy; no frame need fire
globalThis.cancelAnimationFrame = () => {};
const doc = globalThis.document;
// README examples acquire their target via getElementById / querySelector.
// Hand back a mountable element: a body-attached div for an id (hijack container),
// a body-attached input for a selector (decorate host needs value/validity/parent).
doc.getElementById = () => makeContainer();
doc.querySelector = () => {
    const input = new ElementStub('input');
    input.type = 'text';
    input.value = '';
    input.validity = { valid: true };
    doc.body.appendChild(input);
    return input;
};

// --- specifier resolution: this package -> local files; anything else (e.g.
// @zakkster/lite-ticker) -> its real node_modules entry. All rewritten to
// absolute file URLs so the data: module needs no node_modules walk. ----------
function resolveSpec(spec) {
    if (spec === '@zakkster/lite-ui-fx') return pathToFileURL(join(ROOT, 'UIFXController.js')).href;
    if (spec === '@zakkster/lite-ui-fx/recipes') return pathToFileURL(join(ROOT, 'UIFXRecipes.js')).href;
    return pathToFileURL(require.resolve(spec)).href;
}

function rewriteSpecifiers(src) {
    return src.replace(/(from\s+|import\s+)(['"])([^'"]+)\2/g,
        (_m, kw, q, spec) => kw + q + resolveSpec(spec) + q);
}

async function runBlock(src) {
    const url = 'data:text/javascript;base64,' +
        Buffer.from(rewriteSpecifiers(src), 'utf8').toString('base64');
    await import(url);
}

function extractJsBlocks(md) {
    const blocks = [];
    const re = /```(?:js|javascript)\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(md)) !== null) blocks.push(m[1]);
    return blocks;
}

const README = readFileSync(join(ROOT, 'README.md'), 'utf8');
const blocks = extractJsBlocks(README);

describe('README doc-snippet gate (U6)', () => {
    it('README carries the expected runnable js blocks', () => {
        assert.ok(blocks.length >= 7, 'expected >= 7 js blocks, found ' + blocks.length);
    });

    for (let i = 0; i < blocks.length; i++) {
        it('README js block #' + (i + 1) + ' imports real exports and evaluates', async () => {
            await runBlock(blocks[i]);
        });
    }

    it('CONTROL: a block importing a nonexistent export fails the gate', async () => {
        await assert.rejects(
            runBlock("import { thisIsNotARealExport } from '@zakkster/lite-ui-fx';\n"),
            'a bad import name must reject -- otherwise the gate is decorative',
        );
    });
});
