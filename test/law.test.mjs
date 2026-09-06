// test/law.test.mjs
// Standing law gates: ASCII-only source, the version triple, files[] sanity.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const VERSION_EXPECTED = '1.0.5';

describe('law', () => {
    it('ASCII-only source across tracked files (U+00D7 and U+00B5 excepted)', () => {
        // TODO(U6) demo exemption -- the three demo pages are deleted and rebuilt
        // in U6; sweeping dead-by-U6 HTML is invented work, so demo/ is excluded
        // here and re-enters the gate when U6 rewrites it.
        const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
            .split('\n')
            .filter(Boolean)
            .filter((f) => !f.startsWith('demo/'));

        const offenders = [];
        for (const f of tracked) {
            let text;
            try { text = readFileSync(join(ROOT, f), 'utf8'); }
            catch { continue; } // deleted-but-staged etc.
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                for (const ch of lines[i]) {
                    const cp = ch.codePointAt(0);
                    if (cp > 0x7F && cp !== 0x00D7 && cp !== 0x00B5) {
                        offenders.push(f + ':' + (i + 1) + ' U+' + cp.toString(16).toUpperCase());
                        break;
                    }
                }
            }
        }
        assert.equal(offenders.length, 0, 'non-ASCII found:\n' + offenders.join('\n'));
    });

    it('version triple is equal (package.json / VERSION const / llms.txt)', async () => {
        const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
        const mod = await import('../UIFXController.js');
        const llms = readFileSync(join(ROOT, 'llms.txt'), 'utf8');
        const m = llms.match(/^VERSION\s+(\S+)/m);

        assert.equal(pkg.version, VERSION_EXPECTED, 'package.json version');
        assert.equal(mod.VERSION, VERSION_EXPECTED, 'UIFXController VERSION const');
        assert.ok(m, 'llms.txt has a VERSION line');
        assert.equal(m[1], VERSION_EXPECTED, 'llms.txt VERSION line');
        assert.equal(pkg.version, mod.VERSION);
        assert.equal(mod.VERSION, m[1]);
    });

    it('files[] carries no test/, demo/, or recipe .js entry', () => {
        const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
        const files = pkg.files || [];
        for (const f of files) {
            assert.ok(!f.startsWith('test/'), 'files[] leaks test/: ' + f);
            assert.ok(!f.startsWith('demo/'), 'files[] leaks demo/: ' + f);
            assert.ok(
                !(f.startsWith('recipes/') && f.endsWith('.js')),
                'files[] leaks a recipe .js: ' + f,
            );
        }
    });
});
