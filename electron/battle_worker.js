// One interactive local battle. The Battle object stays in this thread.
'use strict';
const { parentPort } = require('worker_threads');
const session = require('../js/battle/session');
let game = null;

parentPort.on('message', function (msg) {
  try {
    if (!msg || msg.type === 'start') {
      game = session.create(msg || {});
      parentPort.postMessage({ ok: true, view: game.view() });
      return;
    }
    if (!game) { parentPort.postMessage({ ok: false, error: 'Kein Kampf.' }); return; }
    if (msg.type === 'choose') { parentPort.postMessage(game.choose(msg.choice)); return; }
    if (msg.type === 'forfeit') { parentPort.postMessage({ ok: true, view: game.forfeit() }); return; }
    parentPort.postMessage({ ok: false, error: 'Unbekannte Anweisung.' });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: String(e && e.message || e) });
  }
});
