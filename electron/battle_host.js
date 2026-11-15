// Desktop bridge for one local battle. A worker thread holds the simulator.
// Nothing here opens a socket or talks to a Pokémon Showdown server.
'use strict';
const { Worker } = require('worker_threads');
const path = require('path');
const { ipcMain } = require('electron');

const WORKER = path.join(__dirname, 'battle_worker.js');
let worker = null;
let pending = null;

function fail(err) {
  const p = pending;
  pending = null;
  if (p) p({ ok: false, error: String(err && err.message || err) });
}
function ensure() {
  if (worker) return;
  worker = new Worker(WORKER);
  worker.on('message', function (msg) {
    const p = pending;
    pending = null;
    if (p) p(msg || { ok: false, error: 'Leere Antwort.' });
  });
  worker.on('error', fail);
  worker.on('exit', function () { worker = null; fail('Der Kampf-Worker wurde beendet.'); });
}
function call(msg) {
  ensure();
  if (pending) return Promise.resolve({ ok: false, error: 'Der Kampf antwortet noch.' });
  return new Promise(function (resolve) {
    pending = resolve;
    try { worker.postMessage(msg); }
    catch (e) { fail(e); }
  });
}

function init() {
  const engine = function () { return require('../js/meta/engine'); };
  ipcMain.handle('battle-start', function (e, payload) {
    payload = payload || {};
    const a = engine().validatePaste(payload.pasteA);
    const b = engine().validatePaste(payload.pasteB);
    if (!a.ok) return Promise.resolve({ ok: false, errors: a.errors });
    if (!b.ok) return Promise.resolve({ ok: false, errors: b.errors });
    return call({
      type: 'start', packedA: a.packed, packedB: b.packed,
      level: payload.level, seed: payload.seed,
      nameA: payload.nameA || 'Du', nameB: payload.nameB || 'KI'
    });
  });
  ipcMain.handle('battle-choose', function (e, choice) {
    return call({ type: 'choose', choice: String(choice || '') });
  });
  ipcMain.handle('battle-forfeit', function () {
    return call({ type: 'forfeit' });
  });
}

module.exports = { init: init };
