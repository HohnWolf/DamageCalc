// One local doubles game. No sockets, no Showdown server, no ladder.
'use strict';
const Sim = require('../../vendor/ps');
const fmt = require('./format');
const errors = require('./de_errors');
const stats = require('./stats');
const bots = require('./bots');

const FORMAT_ID = fmt.FORMAT_ID;
let validator;

function getValidator() {
  if (!validator) validator = new Sim.TeamValidator(FORMAT_ID);
  return validator;
}

function validatePaste(paste) {
  const sets = Sim.Teams.import(String(paste || ''));
  if (!sets || !sets.length) return { ok: false, errors: ['Kein Pokémon im Text erkannt.'] };
  const problems = getValidator().validateTeam(sets);
  if (problems && problems.length) return { ok: false, errors: errors.translate(problems), raw: problems };
  return { ok: true, sets: sets, packed: Sim.Teams.pack(sets) };
}

function leadsFrom(side, choice) {
  const nums = String(choice || '').match(/\d+/g) || [];
  return nums.slice(0, 2).map(function (n) {
    const p = side.pokemon[(+n) - 1];
    return p ? p.species.name : '';
  }).filter(Boolean);
}

function parseKos(log) {
  const lines = Array.isArray(log) ? log : String(log || '').split('\n');
  const lastHit = {};
  const kos = [];
  lines.forEach(function (line) {
    const parts = String(line).split('|');
    const a = parts[0] === '' ? parts : [''].concat(parts);
    const t = a[1];
    if (t === 'move') {
      const src = a[2] || '';
      const tgt = a[4] || '';
      if (tgt && tgt.charAt(0) === 'p') lastHit[tgt] = src;
      lastHit._src = src;
    } else if (t === '-damage') {
      const tgt = a[2] || '';
      if (!tgt) return;
      const ofTag = a.find(function (x) { return /^\[of\]\s*p[12]/.test(x || ''); });
      const fromTag = a.some(function (x) { return /^\[from\]/.test(x || ''); });
      if (ofTag) lastHit[tgt] = ofTag.replace(/^\[of\]\s*/, '');
      else if (!fromTag && lastHit._src) lastHit[tgt] = lastHit._src;
    } else if (t === 'turn' || t === 'upkeep') {
      lastHit._src = '';
    } else if (t === 'faint') {
      const tgt = a[2] || '';
      kos.push({ target: tgt, source: lastHit[tgt] || '' });
    }
  });
  return kos;
}

function sideOf(ident) {
  const m = /^p([12])/.exec(ident || '');
  return m ? ('p' + m[1]) : '';
}
function nameOf(ident) {
  const i = String(ident || '').indexOf(':');
  return i >= 0 ? ident.slice(i + 1).trim() : String(ident || '');
}

function runGame(opts) {
  const levelA = opts.levelA | 0;
  const levelB = opts.levelB | 0;
  const maxTurns = opts.maxTurns || fmt.MAX_TURNS;
  const maxMs = opts.maxMs || 8000;
  const seed = opts.seed || '1,2,3,4';
  const swap = !!opts.swap;
  const packedA = opts.packedA;
  const packedB = opts.packedB;
  const p1pack = swap ? packedB : packedA;
  const p2pack = swap ? packedA : packedB;
  const level = { p1: swap ? levelB : levelA, p2: swap ? levelA : levelB };
  const rng = stats.mulberry32(stats.hashSeed(seed + (swap ? ':s' : '')));
  const t0 = Date.now();
  const battle = new Sim.Battle({
    formatid: FORMAT_ID,
    seed: seed,
    p1: { name: 'P1', team: p1pack },
    p2: { name: 'P2', team: p2pack }
  });
  let choiceErrors = 0;
  let unfinished = false;
  const leads = { p1: [], p2: [] };
  let guard = 0;
  while (!battle.ended && battle.turn < maxTurns && guard++ < 900) {
    if (Date.now() - t0 > maxMs) { unfinished = true; break; }
    let acted = false;
    for (let s = 0; s < 2; s++) {
      const id = s === 0 ? 'p1' : 'p2';
      const side = battle[id];
      const req = side.activeRequest;
      if (!req || req.wait) continue;
      if (side._rlDone === req) continue;
      let choice;
      try { choice = bots.decide(battle, id, level[id], rng); }
      catch (e) { choice = 'default'; choiceErrors++; }
      if (req.teamPreview && !leads[id].length) leads[id] = leadsFrom(side, choice);
      let ok = false;
      try { ok = battle.choose(id, choice); }
      catch (e) { ok = false; }
      if (!ok) {
        choiceErrors++;
        try { ok = battle.choose(id, 'default'); }
        catch (e) { ok = false; }
      }
      if (!ok) { unfinished = true; break; }
      side._rlDone = req;
      acted = true;
    }
    if (unfinished || !acted) break;
  }
  if (!battle.ended) unfinished = true;
  let winner = 'unfinished';
  if (battle.ended && !unfinished) {
    if (battle.winner === 'P1') winner = 'p1';
    else if (battle.winner === 'P2') winner = 'p2';
    else winner = 'tie';
  } else if (!battle.ended) winner = 'unfinished';
  const userIsP1 = !swap;
  let result = 'unfinished';
  if (winner === 'tie') result = 'tie';
  else if (winner === 'p1' || winner === 'p2') result = ((winner === 'p1') === userIsP1) ? 'a' : 'b';
  const kos = parseKos(battle.log);
  return {
    result: result,
    winner: winner,
    turns: battle.turn,
    errors: choiceErrors,
    unfinished: result === 'unfinished',
    ms: Date.now() - t0,
    leadsA: userIsP1 ? leads.p1 : leads.p2,
    leadsB: userIsP1 ? leads.p2 : leads.p1,
    kos: kos,
    log: opts.needLog === false ? '' : battle.log.join('\n'),
    seed: seed,
    swap: swap
  };
}

module.exports = {
  FORMAT_ID: FORMAT_ID,
  validatePaste: validatePaste,
  runGame: runGame,
  parseKos: parseKos,
  sideOf: sideOf,
  nameOf: nameOf
};
