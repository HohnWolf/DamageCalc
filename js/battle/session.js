// One local doubles battle. The player is P1. P2 is a bot (L0–L3).
// No sockets, no Showdown server, no ladder.
'use strict';
const Sim = require('../../vendor/ps');
const fmt = require('../meta/format');
const bots = require('../meta/bots');
const stats = require('../meta/stats');

const WEATHER = { raindance: 'Rain', primordialsea: 'Heavy Rain', sunnyday: 'Sun', desolateland: 'Harsh Sun', sandstorm: 'Sand', snow: 'Snow', snowscape: 'Snow', hail: 'Snow' };
const TERRAIN = { electricterrain: 'Electric', grassyterrain: 'Grass', psychicterrain: 'Psychic', mistyterrain: 'Misty' };

function germanChoiceError(msg) {
  const s = String(msg || '');
  if (/more choices than unfainted/i.test(s)) return 'Zu viele Befehle für die Pokémon, die noch kämpfen.';
  if (/needs a target/i.test(s)) return 'Diese Attacke braucht ein Ziel.';
  if (/Invalid target/i.test(s)) return 'Ungültiges Ziel.';
  if (/doesn't have a move/i.test(s)) return 'Diese Attacke kann nicht eingesetzt werden.';
  if (/trapped|can't switch/i.test(s)) return 'Dieses Pokémon kann nicht wechseln.';
  if (/Can't move/i.test(s) || /Can't do anything/i.test(s)) return 'Diese Wahl ist gerade nicht möglich.';
  return 'Ungültige Wahl.';
}
function create(opts) {
  const level = Math.max(0, Math.min(3, opts.level | 0));
  const seed = opts.seed || '1,2,3,4';
  const battle = new Sim.Battle({
    formatid: fmt.FORMAT_ID,
    seed: seed,
    p1: { name: opts.nameA || 'Du', team: opts.packedA },
    p2: { name: opts.nameB || 'KI', team: opts.packedB }
  });
  const rng = stats.mulberry32(stats.hashSeed(String(seed)));
  let invalid = 0;

  function open(side) {
    const req = side.activeRequest;
    return !!(req && !req.wait && side._rlDone !== req);
  }
  function act(sideId) {
    const side = battle[sideId];
    const req = side.activeRequest;
    let choice = 'default';
    try { choice = bots.decide(battle, sideId, level, rng); }
    catch (e) { choice = 'default'; }
    let ok = false;
    try { ok = battle.choose(sideId, choice); }
    catch (e) { ok = false; }
    if (!ok) {
      invalid++;
      try { ok = battle.choose(sideId, 'default'); }
      catch (e) { ok = false; }
    }
    if (ok) side._rlDone = req;
    return ok;
  }
  function pump() {
    let guard = 0;
    while (!battle.ended && guard++ < 16) {
      if (open(battle.p1)) return;
      if (!open(battle.p2)) return;
      if (!act('p2')) return;
    }
  }
  function choose(input) {
    if (battle.ended) return { ok: false, error: 'Der Kampf ist vorbei.', view: view() };
    const side = battle.p1;
    const req = side.activeRequest;
    if (!open(side)) return { ok: false, error: 'Gerade keine Eingabe.', view: view() };
    let ok = false;
    try { ok = battle.choose('p1', input); }
    catch (e) { ok = false; }
    if (!ok) {
      invalid++;
      const err = (side.choice && side.choice.error) || 'Ungültige Wahl.';
      try { side.clearChoice(); } catch (e) { /* already clear */ }
      return { ok: false, error: germanChoiceError(err), view: view() };
    }
    side._rlDone = req;
    pump();
    return { ok: true, view: view() };
  }
  function forfeit() {
    if (!battle.ended) battle.win(battle.p2);
    return view();
  }
  function view() {
    return snapshot(battle, { invalid: invalid, level: level, seed: seed });
  }
  function stepScripted() {
    if (battle.ended || !open(battle.p1)) return { ok: false, error: 'Keine Eingabe.', view: view() };
    let choice = 'default';
    try { choice = bots.decide(battle, 'p1', level, rng); }
    catch (e) { choice = 'default'; }
    return choose(choice);
  }
  return { choose: choose, forfeit: forfeit, view: view, stepScripted: stepScripted };
}

function targetsFor(battle, poke, targetType) {
  if (!poke || !targetType || !battle.actions.targetTypeChoices(targetType)) return [];
  const out = [];
  [1, 2, -1, -2].forEach(function (loc) {
    if (!battle.validTargetLoc(loc, poke, targetType)) return;
    const tgt = poke.getAtLoc(loc);
    if (!tgt || tgt.fainted || tgt.hp <= 0) return;
    out.push({
      loc: loc,
      species: tgt.species.name,
      ally: !!(tgt.side && poke.side && tgt.side.id === poke.side.id)
    });
  });
  return out;
}
function itemName(p) {
  if (!p || !p.item) return '';
  try {
    const it = p.battle && p.battle.dex.items.get(p.item);
    if (it && it.exists && it.name && it.name !== 'No Item') return it.name;
  } catch (e) { /* ohne Dex bleibt der Rohname */ }
  if (typeof p.item === 'string') return p.item;
  return p.item.name || '';
}
function partyOf(side) {
  return side.pokemon.map(function (p, i) {
    return {
      slot: i + 1,
      species: p.species.name,
      item: itemName(p),
      hp: p.hp,
      maxhp: p.maxhp,
      status: p.status || '',
      fainted: !!p.fainted,
      active: !!p.isActive
    };
  });
}
function boostsOf(p) {
  const out = {};
  const b = p.boosts || {};
  ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'].forEach(function (k) {
    if (b[k]) out[k] = b[k];
  });
  return out;
}
function conditionsOf(side) {
  const ids = ['tailwind', 'reflect', 'lightscreen', 'auroraveil', 'safeguard'];
  const out = [];
  ids.forEach(function (id) {
    const c = side.sideConditions && side.sideConditions[id];
    if (c) out.push({ id: id, turns: c.duration || 0 });
  });
  return out;
}
function activeOf(side) {
  return side.active.map(function (p) {
    if (!p) return null;
    return {
      species: p.species.name,
      hp: p.hp,
      maxhp: p.maxhp,
      status: p.status || '',
      fainted: !!p.fainted,
      types: (p.types || []).slice(),
      boosts: boostsOf(p),
      item: (p.item && p.item.name) || ''
    };
  });
}
function moveView(battle, poke, mv, index) {
  const dex = battle.dex.moves.get(mv.id);
  return {
    slot: index + 1,
    id: mv.id,
    name: mv.move || (dex && dex.name) || mv.id,
    type: (dex && dex.type) || '',
    pp: mv.pp,
    maxpp: mv.maxpp,
    disabled: !!mv.disabled,
    target: mv.target || '',
    targets: targetsFor(battle, poke, mv.target || '')
  };
}
function requestOf(battle, side) {
  const req = side.activeRequest;
  if (!req || req.wait || side._rlDone === req) return { kind: 'wait' };
  if (req.teamPreview) {
    const foe = battle.p1 === side ? battle.p2 : battle.p1;
    return { kind: 'preview', max: req.maxChosenTeamSize || 4, party: partyOf(side), foe: partyOf(foe) };
  }
  if (req.forceSwitch) return { kind: 'switch', flags: req.forceSwitch.slice(), party: partyOf(side) };
  const active = (req.active || []).map(function (a, i) {
    const poke = side.active[i];
    if (!a || !poke || poke.fainted || poke.hp <= 0 || (poke.volatiles && poke.volatiles.commanding)) return null;
    return {
      moves: (a.moves || []).map(function (mv, k) { return moveView(battle, poke, mv, k); }),
      canMega: a.canMegaEvo ? String(a.canMegaEvo) : '',
      canTera: a.canTerastallize ? String(a.canTerastallize) : '',
      trapped: !!a.trapped,
      maybeTrapped: !!a.maybeTrapped
    };
  });
  return { kind: 'move', active: active, party: partyOf(side) };
}
function snapshot(battle, extra) {
  const log = Array.isArray(battle.log) ? battle.log : [];
  return {
    turn: battle.turn,
    ended: !!battle.ended,
    winner: battle.winner || '',
    weather: WEATHER[battle.field.weather] || '',
    weatherTurns: battle.field.weather ? (battle.field.weatherState.duration || 0) : 0,
    terrain: TERRAIN[battle.field.terrain] || '',
    terrainTurns: battle.field.terrain ? (battle.field.terrainState.duration || 0) : 0,
    trickRoom: !!battle.field.getPseudoWeather('trickroom'),
    trickRoomTurns: (battle.field.getPseudoWeather('trickroom') || {}).duration || 0,
    tailwind: [
      !!(battle.p1.sideConditions && battle.p1.sideConditions.tailwind),
      !!(battle.p2.sideConditions && battle.p2.sideConditions.tailwind)
    ],
    p1: { name: battle.p1.name, active: activeOf(battle.p1), party: partyOf(battle.p1), conditions: conditionsOf(battle.p1) },
    p2: { name: battle.p2.name, active: activeOf(battle.p2), party: partyOf(battle.p2), conditions: conditionsOf(battle.p2) },
    request: requestOf(battle, battle.p1),
    log: log.slice(-30),
    invalid: extra.invalid,
    level: extra.level,
    seed: extra.seed
  };
}

module.exports = { create: create };
