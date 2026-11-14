// Bot vs bot: N games, fixed seeds, side swap, Wilson intervals.
// Unfinished games are not losses.
'use strict';
const engine = require('./engine');
const stats = require('./stats');

function runMatchup(opts) {
  const n = opts.games | 0;
  const base = opts.baseSeed >>> 0 || 1;
  const onProgress = opts.onGame || function () {};
  let winsA = 0, winsB = 0, ties = 0, unfinished = 0, errors = 0, turnSum = 0, decided = 0;
  const games = [];
  const leadCount = {};
  const koBy = {};
  const faintBy = {};
  const koMatrix = {};
  for (let i = 0; i < n; i++) {
    if (opts.shouldStop && opts.shouldStop()) break;
    const seed = stats.seedFor(base, i);
    const swap = i % 2 === 1;
    const needLog = !!(opts.keepLog || (opts.keepReplay && games.length < (opts.keepReplay | 0)));
    const g = engine.runGame({
      packedA: opts.packedA,
      packedB: opts.packedB,
      levelA: opts.levelA,
      levelB: opts.levelB,
      seed: seed,
      swap: swap,
      maxTurns: opts.maxTurns,
      maxMs: opts.maxMs,
      needLog: needLog
    });
    errors += g.errors;
    if (g.result === 'unfinished') unfinished++;
    else if (g.result === 'tie') ties++;
    else if (g.result === 'a') { winsA++; decided++; turnSum += g.turns; }
    else if (g.result === 'b') { winsB++; decided++; turnSum += g.turns; }
    const leadKey = (g.leadsA || []).join(' + ');
    if (leadKey) leadCount[leadKey] = (leadCount[leadKey] || 0) + 1;
    (g.kos || []).forEach(function (k) {
      const srcSide = engine.sideOf(k.source);
      const tgtSide = engine.sideOf(k.target);
      const srcName = engine.nameOf(k.source);
      const tgtName = engine.nameOf(k.target);
      const userSrc = (srcSide === 'p1') !== swap;
      const userTgt = (tgtSide === 'p1') !== swap;
      if (userSrc && !userTgt && srcName) koBy[srcName] = (koBy[srcName] || 0) + 1;
      if (userTgt && tgtName) faintBy[tgtName] = (faintBy[tgtName] || 0) + 1;
      if (userSrc && !userTgt && srcName && tgtName) {
        koMatrix[srcName] = koMatrix[srcName] || {};
        koMatrix[srcName][tgtName] = (koMatrix[srcName][tgtName] || 0) + 1;
      }
    });
    if (opts.keepLog) games.push({ result: g.result, turns: g.turns, seed: seed, swap: swap, leads: g.leadsA, log: g.log, errors: g.errors });
    else if (opts.keepReplay && g.result !== 'unfinished' && games.length < (opts.keepReplay | 0)) {
      games.push({ result: g.result, turns: g.turns, seed: seed, leads: g.leadsA, log: g.log });
    }
    onProgress({ index: i, game: g });
  }
  const played = winsA + winsB + ties + unfinished;
  const ci = stats.wilson(winsA, winsA + winsB);
  const leads = Object.keys(leadCount).map(function (k) { return { lead: k, n: leadCount[k] }; }).sort(function (a, b) { return b.n - a.n; });
  const koList = Object.keys(koBy).map(function (k) { return { name: k, kos: koBy[k], faints: faintBy[k] || 0 }; });
  koList.sort(function (a, b) { return b.kos - a.kos || a.faints - b.faints; });
  const weak = koList.slice().sort(function (a, b) { return (b.faints - a.faints) || (a.kos - b.kos); });
  return {
    winsA: winsA, winsB: winsB, ties: ties, unfinished: unfinished, errors: errors,
    played: played, decided: winsA + winsB,
    avgTurns: decided ? turnSum / decided : 0,
    ci: ci,
    leads: leads.slice(0, 6),
    mvp: koList[0] || null,
    weakest: weak[0] || null,
    koBy: koBy,
    faintBy: faintBy,
    koMatrix: koMatrix,
    games: games
  };
}

module.exports = { runMatchup: runMatchup };
