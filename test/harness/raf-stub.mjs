// test/harness/raf-stub.mjs
// Deterministic requestAnimationFrame queue. Install BEFORE the first mount so
// the shared Ticker's start() enqueues into this queue instead of a real rAF.
//
// lite-ticker anchors _lastTime = performance.now() at start() and reschedules
// on the last line of every _tick, so a self-driving loop always leaves exactly
// one pending frame. Drive frames anchored at performance.now():
//     let t = performance.now();
//     step(t += 16);   // dt 16ms -> recipes see dt 0.016 s
// Keep steps small and monotonic; the Ticker clamps dt > 100ms to 16.66.

let _id = 0;
const _queue = new Map(); // id -> callback
let _installed = false;
let _origRaf = null;
let _origCaf = null;

function install() {
    if (_installed) return;
    _installed = true;
    _origRaf = globalThis.requestAnimationFrame;
    _origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => {
        const id = ++_id;
        _queue.set(id, cb);
        return id;
    };
    globalThis.cancelAnimationFrame = (id) => { _queue.delete(id); };
}

function uninstall() {
    if (!_installed) return;
    _installed = false;
    globalThis.requestAnimationFrame = _origRaf;
    globalThis.cancelAnimationFrame = _origCaf;
    _queue.clear();
    _id = 0;
}

// Drain exactly one frame: snapshot the currently-queued callbacks, clear, then
// invoke each with timestamp t. Callbacks that reschedule land in the now-empty
// queue, so pending() reflects live loops after the step.
function step(t) {
    if (_queue.size === 0) return 0;
    const cbs = [..._queue.values()];
    _queue.clear();
    for (const cb of cbs) cb(t);
    return cbs.length;
}

function pending() { return _queue.size; }

export { install, uninstall, step, pending };
