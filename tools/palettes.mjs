// tools/palettes.mjs -- AUTHORING TOOL. Never shipped (not in package.json
// files[]); @zakkster/lite-hueforge is a dev-only dependency and never enters
// lite-ui-fx's runtime dependency set. See decisions/0002-recipe-options.md.
//
// It (A) audits the shipped default label colours for APCA 0.1.9 contrast against
// a canonical dark UI surface and (B) synthesises APCA-honest example
// { light, mid, dark } theme triples for the docs/demo. Report only: a low-contrast
// shipped default is surfaced as a FINDING, never mutated here (that would break
// the byte-identical-defaults invariant; changing a shipped colour is the owner's
// call).
//
// Run:  node tools/palettes.mjs
// hueforge is imported from the sibling suite checkout; override with
//   LITE_HUEFORGE=/abs/path/to/Hueforge.js node tools/palettes.mjs

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const HF = process.env.LITE_HUEFORGE || path.resolve(HERE, '..', '..', 'LiteHueforge', 'Hueforge.js');
let H;
try {
    H = await import(pathToFileURL(HF).href);
} catch (e) {
    console.error('tools/palettes.mjs needs @zakkster/lite-hueforge (OKLCH + APCA).\n' +
        'Set LITE_HUEFORGE=/abs/path/to/Hueforge.js, or install the package.\n' + e.message);
    process.exit(2);
}
const { forgePalette, deriveTheme, apcaPair, APCA_THRESHOLDS, fromHex, toHex } = H;

const SURFACE = '#12121a';             // a canonical dark UI ground the labels sit on
const FLOOR = APCA_THRESHOLDS.MIN;     // 30 -- the legibility floor for incidental text
const LARGE = APCA_THRESHOLDS.LARGE;   // 45 -- large/mono label target

// The label/text roles the shipped recipe defaults paint: accent = the active
// state label, dim = the inactive caption, plus the fixed light readouts.
const LABEL_COLORS = {
    'accent green  (#6ee7b6)': '#6ee7b6', 'accent sky    (#38bdf8)': '#38bdf8',
    'accent amber  (#fbbf24)': '#fbbf24', 'accent red    (#ff6b6b)': '#ff6b6b',
    'accent pink   (#f472b6)': '#f472b6', 'accent purple (#c084fc)': '#c084fc',
    'accent violet (#a78bfa)': '#a78bfa', 'accent cyan   (#22d3ee)': '#22d3ee',
    'readout       (#e2e2f0)': '#e2e2f0', 'dim           (#9999b8)': '#9999b8',
    'dim2          (#8888aa)': '#8888aa', 'none          (#666)   ': '#666',
};

const surf = fromHex(SURFACE);
const findings = [];

console.log('== A. APCA audit of shipped default label colours on ' + SURFACE + ' ==');
console.log('   APCA MIN floor ' + FLOOR + '; large-text target ' + LARGE + '\n');
for (const [name, hex] of Object.entries(LABEL_COLORS)) {
    const lc = Math.round(Math.abs(apcaPair(fromHex(hex), surf)));
    const mark = lc >= LARGE ? 'PASS  ' : lc >= FLOOR ? 'min   ' : 'FINDING';
    if (lc < FLOOR) findings.push(name.trim() + ' Lc=' + lc);
    console.log('   ' + mark + ' Lc=' + String(lc).padStart(3) + '  ' + name);
}

console.log('\n== B. hueforge example themes (APCA-audited; paste into docs/demo) ==\n');
const SEEDS = { emerald: '#6ee7b6', sky: '#38bdf8', magenta: '#f472b6', amber: '#fbbf24' };
for (const [name, seed] of Object.entries(SEEDS)) {
    const pal = forgePalette(fromHex(seed), { model: 'analogous', count: 3 });
    const [light, mid, dark] = pal.map(toHex);
    const theme = deriveTheme(pal, { scheme: 'dark', contrast: 'normal' });
    const passes = theme.audit.filter((r) => r.pass).length;
    console.log('   ' + name.padEnd(8) + '{ light: "' + light + '", mid: "' + mid + '", dark: "' + dark + '" }' +
        '   deriveTheme APCA ' + passes + '/' + theme.audit.length + ' pass');
}

if (findings.length) {
    console.log('\nFINDINGS (' + findings.length + ' shipped label colour(s) below the APCA MIN floor on ' +
        SURFACE + '):');
    for (const f of findings) console.log('   - ' + f);
    console.log('These are pre-existing defaults, kept byte-identical this pass. Changing a shipped');
    console.log('colour is a visual change and the owner\'s call; a themed mount can raise contrast now.');
} else {
    console.log('\nAll shipped label colours clear the APCA MIN floor on ' + SURFACE + '.');
}
// Report-only: never fail the run on a pre-existing shipped default.
process.exit(0);
