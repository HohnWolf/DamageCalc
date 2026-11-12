// One simulation worker. Battles stay in this process. No network.
'use strict';
const { parentPort } = require('worker_threads');
const harness = require('../js/meta/harness');

parentPort.on('message', function (msg) {
  if (!msg || msg.type !== 'match') return;
  try {
    const result = harness.runMatchup({
      packedA: msg.packedA,
      packedB: msg.packedB,
      levelA: msg.levelA | 0,
      levelB: msg.levelB | 0,
      games: msg.games | 0,
      baseSeed: msg.baseSeed >>> 0,
      keepReplay: 2,
      maxTurns: msg.maxTurns,
      onGame: function (info) {
        parentPort.postMessage({ type: 'tick', id: msg.id, index: info.index });
      }
    });
    const games = (result.games || []).map(function (g) {
      return { result: g.result, turns: g.turns, seed: g.seed, leads: g.leads, log: g.log };
    });
    parentPort.postMessage({
      type: 'done', id: msg.id,
      result: {
        winsA: result.winsA, winsB: result.winsB, ties: result.ties,
        unfinished: result.unfinished, errors: result.errors,
        decided: result.decided, avgTurns: result.avgTurns, ci: result.ci,
        leads: result.leads, mvp: result.mvp, weakest: result.weakest,
        koMatrix: result.koMatrix, games: games
      }
    });
  } catch (e) {
    parentPort.postMessage({ type: 'done', id: msg.id, error: String(e && e.stack || e) });
  }
});
