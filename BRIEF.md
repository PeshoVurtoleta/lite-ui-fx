# BRIEF -- U0 session plan -- lite-ui-fx v1.0.5

Planner-stage operationalization of ROADMAP.md session U0 (truth pass, law
pass, torture skeleton). Supersedes nothing; feeds the coder. No behaviour
changes anywhere in this session -- U-01/U-02/U-09/U-10/U-11 are pinned as
they are today and fixed in U1.

```markdown
---
package: "@zakkster/lite-ui-fx"
version_target: 1.0.5
status: ready-for-coder
gc_maxMajor: 0
gc_maxPauseMs: 4
alloc_bytes_per_op: 0
leak_cycles: 4096
peers: ["@zakkster/lite-gc-profiler ^1.16.0", "@zakkster/lite-leak ^1.10.0", "@zakkster/lite-signal ^1.5.1"]
findings: [U-04, U-07, U-08]
depends_on: []
blocks: [U1..U8]
---
```

## 0. Verified inputs (2026-09-06 -- facts the tasks below lean on)

| Fact | Evidence |
| --- | --- |
| GitHub remote == local tree, byte-for-byte, with exactly two deltas: remote HAS `LICENSE` (MIT, "Zahary Shinikchiev", name-law clean), local HAS `demo/` | shallow clone + `diff -qr` |
| Remote is a single branch `main` @ c76b027 | `git ls-remote` |
| Local controller and llms.txt are byte-identical to published 1.0.4 | tarball diff |
| 1.0.0 -> 1.0.3 changed ONLY README.md; **1.0.4 REMOVED `"sideEffects": false`** (present in 1.0.3) | consecutive tarball diffs |
| Publish dates: 1.0.0/1/2/3 on 2026-03-25 (23-minute burst), 1.0.4 on 2026-03-26 | `npm view time` |
| Gate deps current: lite-gc-profiler 1.16.0, lite-leak 1.10.0, lite-signal 1.5.1 (leak's peer). Local dirs: `../LiteGCProfiler` (capital GC), `../LiteLeak` | `npm view`; `ls` |
| Local node v26.3.1 (`node --test` fine; engines floor >=18) | `node --version` |
| Reusable DOM stub exists: `../LiteAmbientFX/test/_helpers/dom-stub.mjs` (242 lines) + `dom-install.mjs` (11) | `wc -l` |
| The vitest suite holds **27 portable assertions**; only 4 tests + `beforeEach` touch the dead `_tickAll`/`_clear` imports | read of UIFXController.test.js |
| The vitest file's canvas mock enumerates the exact 30 ctx members recipes use -- it IS the recording-stub starter | test file lines 6-21 |

## 1. Task list (atomic, in order)

### T0 -- adopt the git history

1. `git clone --no-checkout https://github.com/PeshoVurtoleta/lite-ui-fx.git`
   into a temp dir; move its `.git/` into the package root.
2. `git checkout -- LICENSE` (restores the one file local lacks). Verify
   `git status` then shows only untracked `demo/`, `ROADMAP.md`, `BRIEF.md`
   and nothing modified -- this proves the adoption touched no content.
3. Add `.gitignore`: `node_modules/`, `*.tgz`, `.DS_Store`.
4. Commit baseline: `chore: adopt repo history; import demo pages, roadmap,
   brief`. **Do not push without the owner's go-ahead.**

DONE: `git status --porcelain` empty; `git log` shows remote history plus
one local commit; `LICENSE` present locally.

### T1 -- truth pass (U-04)

1. package.json description: "30 built-in recipes" -> "50 built-in recipes".
2. llms.txt line 2: same fix. Add a `VERSION 1.0.5` line under the title
   (the third sync point; see T2.4). Repair the broken import quote on
   line 16 (`from ./recipes/...` -> `from './recipes/...`).
3. README.md line 55: guide link `blob/main/UIFX-RECIPE-GUIDE.md` ->
   `blob/main/recipes/UIFX-RECIPE-GUIDE.md` (the 200-verified path).
4. Make the "included in the package" claim TRUE instead of deleting it:
   `files[]` += `recipes/UIFX-RECIPE-GUIDE.md`. (Recipe .js files still do
   NOT ship -- that is U2's decision, not U0's.)
5. Grep sweep: no remaining "30 built-in", no root-level guide path, no
   other count/path claim that a grep can falsify.

DONE: the greps in section 3, rows A6-A7.

### T2 -- packaging law (U-08, metadata half)

1. package.json: restore `"sideEffects": false` (1.0.4 regression -- name
   it in the CHANGELOG); add `"engines": { "node": ">=18" }`; scripts ->
   `"test": "node --test test/*.test.mjs"`, `"torture": "node --expose-gc
   test/torture.mjs"`; devDependencies -> `@zakkster/lite-gc-profiler
   ^1.16.0`, `@zakkster/lite-leak ^1.10.0`, `@zakkster/lite-signal ^1.5.1`
   (leak's peer), **vitest removed**; `files[]` -> exactly
   `["UIFXController.js", "UIFXController.d.ts", "llms.txt",
   "recipes/UIFX-RECIPE-GUIDE.md", "CHANGELOG.md", "README.md", "LICENSE"]`.
2. CHANGELOG.md (new), backfilled from the tarball evidence, no invention:
   - 1.0.0 (2026-03-25) initial release: controller + 50 GitHub recipes.
   - 1.0.1-1.0.3 (2026-03-25) README-only patches.
   - 1.0.4 (2026-03-26) metadata patch; **regression: dropped
     `sideEffects: false`** (restored in 1.0.5).
   - 1.0.5 (unreleased -> dated at publish): U-04 truth fixes, U-07
     node:test port + torture skeleton, U-08 law pass, `VERSION` export,
     guide now ships. **Known issues** subsection naming U-01, U-02, U-03,
     U-05, U-06, U-09..U-13 with one line each and "see ROADMAP.md".
3. `export const VERSION = '1.0.5';` at the top of UIFXController.js with
   the three-place sync comment (copy the idiom from
   `../LiteScratchFx/index.js:14-16`); declare it in UIFXController.d.ts.
4. Bump package.json to 1.0.5. The triple (package.json / VERSION const /
   llms.txt line) is now live and gated by T4's law test.

DONE: `npm pack --dry-run` lists exactly the 8 files in section 3 row A5.

### T3 -- ASCII sweep (U-08, source half)

Scope: every tracked file EXCEPT `demo/` (the three demo pages are deleted
and rebuilt in U6; sweeping ~3,200 lines of dead-by-U6 HTML is invented
work -- the law test carries a `TODO(U6)` exemption comment naming this).

Replacement table, applied mechanically:

| From | To |
| --- | --- |
| em/en dash | `--` |
| right arrow | `->` |
| box-drawing rules in comment banners | `-` / `=` runs |
| multiplication sign in prose | keep (U+00D7 is excepted) or `x` |
| emoji (README headings) | delete; headings stand on words |
| curly quotes, ellipsis | `'` / `"` / `...` |

Files in scope and their current non-ASCII line counts (from the U-08
reproduction): UIFXController.js 24, UIFXRecipes.js 32, UIFXRecipes2.js 45,
UIFXRecipes3.js 43, UIFX-RECIPE-GUIDE.md 29, README.md 55, llms.txt 8.
(UIFXController.test.js dies in T4; its replacement is born clean.)

The recipe .js edits here are comment/string-literal char swaps ONLY --
zero code-shape changes, or the U3 sweep's "identical draw calls" baseline
is polluted. Reviewer instruction: the vol-file diffs must show only
character substitutions.

DONE: perl scan (section 3 row A3) reports 0 lines outside U+00D7/U+00B5,
demo/ excluded.

### T4 -- port the suite to node:test (U-07)

1. `test/harness/dom-stub.mjs`: start from
   `../LiteAmbientFX/test/_helpers/dom-stub.mjs`, extend for what the 27
   tests exercise: `Event`/`PointerEvent`/`FocusEvent` constructables +
   `dispatchEvent`/listener registry honouring `AbortSignal`,
   `getBoundingClientRect` (zeros), `document.head` child tracking,
   `appendChild`/`remove`, `style` object, `classList`, checkbox/range
   value+checked semantics. Fold in the canvas recording context from the
   old vitest mock (same 30 members; record every call + property write
   into a flat log array -- t3/U3 will read it later).
2. `test/harness/raf-stub.mjs`: install-before-import queue stub --
   `install()` patches globalThis.requestAnimationFrame/cancelAnimationFrame,
   `step(t)` drains one frame, `pending()` count. This replaces `_tickAll`.
   `_clear()` is replaced by discipline: every test destroys what it
   mounts (the shared ticker self-resets at refcount 0), and a shared
   afterEach asserts `pending() === 0` after the last destroy.
3. `test/controller.test.mjs`: port all 27 assertions 1:1.
   Mechanical map: `describe/it` -> `node:test` `describe/it`;
   `expect(x).toBe(y)` -> `assert.equal`; `toBeCloseTo(v, 2)` ->
   `assert.ok(Math.abs(a - v) < 5e-3)`; `vi.fn()` -> local
   `makeSpy()` returning a function with a `.calls` array;
   `toHaveBeenCalledWith(...)` -> `assert.deepEqual(spy.calls[0], [...])`.
   No assertion may be dropped or weakened; the four `_tickAll` tests
   re-express as raf-stub steps (dt semantics identical: step(t0+16)).
4. Delete `UIFXController.test.js`. Add `test/law.test.mjs`: (a) the ASCII
   scan from T3 as a standing test; (b) VERSION triple equality
   (package.json version === module VERSION === llms.txt line); (c)
   `files[]` sanity -- contains no `test/`, no `demo/`, no recipe `.js`.

DONE: `node --test` green with >= 29 tests (27 ported + law tests); grep
finds no vitest anywhere including package.json.

### T5 -- torture skeleton (ROADMAP section 3)

1. `test/torture/harness.mjs`: re-exports the dom/raf stubs, seeded
   xorshift PRNG (`TORTURE_SEED` env override; print seed on failure), and
   the two gate wrappers wired per `/torture-harness` law: lite-leak
   tracker with owner-cascade + timer + **listener** kernels under
   lite-signal `createRoot`/`effect` churn (cleanup closures hold detached
   primitives, never the instance), and `GcProfiler` + `checkNoGc`
   (`maxMajor: 0`, `maxPauseMs: 4`) with the settle-tick await before
   `summary()`. Read `../LiteGCProfiler/llms.txt` and
   `../LiteLeak/llms.txt` for the live surfaces before writing a line --
   note the directory is `LiteGCProfiler`, capital GC.
2. `test/torture.mjs`: runs tiers sequentially, prints exactly `ok` on
   success, exit 0/1. `TORTURE_CONTROL=<name>` env activates one t9
   control variant (expected exit: non-zero).
3. Tiers wired NOW:
   - `t0-lifecycle.mjs`: mount/destroy every UIType with a counting
     recipe; destroy idempotence; wrapper removal; ticker refcount
     conservation (RAF pending returns to 0). The head-childCount check
     asserts the CURRENT slider behaviour explicitly:
     `assert.equal(styleDelta, N) // KNOWN-U-09, flips to 0 in U1`.
     A pinned wrong value that will fail loudly when U1 fixes it is the
     point -- never a loose `>= 0`.
   - `t1-degenerate.mjs`: pins CURRENT fail-open behaviour verbatim with
     `// TODO(U1) flip` markers: unknown option key silently ignored
     (width falls back 160), `() => ({})` mounts without throwing (do NOT
     step a frame on it -- that kills the loop, U-02; comment says so),
     width 0 / dpr 3 construct.
   - `t4-soak.mjs`: `leak_cycles: 4096` mount/interact/destroy churn on
     BUTTON + TOGGLE (sliders excluded from the leak gate until U1 --
     U-09 makes them fail by design; one separate slider block asserts
     the known leak count instead). Tracker size returns to 0; no
     listener/timer orphans; heap sampled across cycles.
   - `t9-controls.mjs`: (a) `alloc` -- a recipe allocating an object per
     tick under the phase-2 gc gate; (b) `listener` -- a recipe whose
     destroy leaks a window listener under the lite-leak gate. Each must
     drive exit != 0.
4. Tiers registered EMPTY with a skip line naming their filling session:
   `t2-a11y` (U1), `t3-frame-alloc` (U3), `t5-scale` (U3/U5).

DONE: `node --expose-gc test/torture.mjs` prints `ok`, exit 0;
`TORTURE_CONTROL=alloc` and `=listener` runs exit non-zero.

### T6 -- ship

1. `npm pack --dry-run` against section 3 row A5; fix drift before publish.
2. Commit(s) with the U0 findings in the message; **push and
   `npm publish` are owner actions** (auth + OTP) -- hand over a ready
   tree and the exact two commands.
3. Post-publish verification (owner or next session):
   `npm view @zakkster/lite-ui-fx version` -> 1.0.5; registry description
   says 50.

## 2. Explicitly NOT in this session

No behaviour change of any kind: U-01 (Space), U-02 (loop kill), U-09
(style leak -- pinned at its wrong value), U-10 (fail-open options --
pinned), U-11 (rect reads) all wait for U1. No recipe code-shape edits
(U3). No recipe shipping, no registry (U2). demo/ untouched, ASCII-exempt
until U6. No new docs structure (U6 owns the blueprint rewrite).

## 3. Assertions (all falsifiable by command)

| ID | Command | Pass condition |
| --- | --- | --- |
| A1 | `node --test test/*.test.mjs` | exit 0, >= 29 pass, 0 skip/todo |
| A2 | `grep -ri vitest . --exclude-dir=node_modules --exclude-dir=demo --exclude-dir=.git` | no output |
| A3 | `perl -ne 'print "$ARGV:$.: $_" if /[^\x00-\x7F]/ && $_ !~ /^[\x00-\x7F\xd7\xb5]*$/' <tracked files minus demo/>` (law test encodes the exact walk) | no output |
| A4 | `node --expose-gc test/torture.mjs` | prints exactly `ok`, exit 0 |
| A4c | `TORTURE_CONTROL=alloc ...` and `TORTURE_CONTROL=listener ...` | both exit non-zero |
| A5 | `npm pack --dry-run` | exactly: package.json, README.md, CHANGELOG.md, LICENSE, llms.txt, UIFXController.js, UIFXController.d.ts, recipes/UIFX-RECIPE-GUIDE.md |
| A6 | `grep -rn "30 built-in" . --exclude-dir=.git --exclude-dir=node_modules` | no output |
| A7 | `grep -n "blob/main/UIFX-RECIPE-GUIDE" README.md` | no output (recipes/ path only) |
| A8 | `node -e "import('./UIFXController.js').then(m => console.log(m.VERSION))"` | `1.0.5`, equal to package.json and the llms.txt line (law test A-triple) |
| A9 | `grep -c '"sideEffects": false' package.json` | 1 |
| A10 | `git status --porcelain` after final commit | empty |
| A11 | grep new/edited files for stray tool-call tag fragments | no output |
| A12 | (post-publish, owner) `npm view @zakkster/lite-ui-fx version` | 1.0.5 |

## 4. Done when

Tree under git with adopted history; every doc claim grep-true; node:test
green with all 27 legacy assertions preserved; torture prints ok and its
controls provably fail; pack list exact; 1.0.5 ready for the owner's
publish command. Then U1.
