// Local decision bots for doubles. They only emit choices the simulator accepts.
// L0 random, L1 max damage (js/calc.js), L2 doubles heuristics, L3 one-turn lookahead.
// Damage, accuracy, immunities and targets come from the battle plus Calc.calculate.
'use strict';
const Calc = require('../calc');

const PROTECT = {
  protect: 1, detect: 1, spikyshield: 1, banefulbunker: 1, burningbulwark: 1,
  silktrap: 1, obstruct: 1, kingsshield: 1, maxguard: 1
};
const REDIRECT = { followme: 1, ragepowder: 1 };
const STATUS_MAP = { brn: 'Burned', par: 'Paralyzed', psn: 'Poisoned', tox: 'Badly Poisoned', slp: 'Asleep', frz: 'Frozen' };
const WEATHER = { sunnyday: 'Sun', raindance: 'Rain', sandstorm: 'Sand', snow: 'Snow', snowscape: 'Snow', desolateland: 'Harsh Sun', primordialsea: 'Heavy Rain' };
const TERRAIN = { electricterrain: 'Electric', grassyterrain: 'Grass', psychicterrain: 'Psychic', mistyterrain: 'Misty' };

function fieldOf(battle) {
  const w = battle.field.weather;
  const t = battle.field.terrain;
  return {
    format: 'Doubles',
    weather: WEATHER[w] || 'None',
    terrain: TERRAIN[t] || 'None',
    gravity: !!battle.field.getPseudoWeather('gravity'),
    trickRoom: !!battle.field.getPseudoWeather('trickroom')
  };
}
function sideMods(side) {
  const c = side.sideConditions;
  return {
    helpingHand: 0,
    reflect: !!(c.reflect),
    lightScreen: !!(c.lightscreen),
    auroraVeil: !!(c.auroraveil)
  };
}
function toCalcMove(move) {
  const flags = move.flags || {};
  const acc = move.accuracy === true || move.accuracy == null ? 100 : move.accuracy;
  let hits = 1;
  if (Array.isArray(move.multihit)) hits = move.multihit[1];
  else if (typeof move.multihit === 'number') hits = move.multihit;
  return {
    name: move.name,
    bp: typeof move.basePower === 'number' ? move.basePower : 0,
    type: move.type,
    category: move.category,
    accuracy: acc,
    makesContact: !!flags.contact,
    hasSecondaryEffect: !!((move.secondaries && move.secondaries.length) || move.secondary),
    isSound: !!flags.sound,
    isBullet: !!flags.bullet,
    isPunch: !!flags.punch,
    isBite: !!flags.bite,
    isPulse: !!flags.pulse,
    isSlice: !!flags.slice,
    isSpread: move.target === 'allAdjacent' || move.target === 'allAdjacentFoes',
    recoilHP: move.recoil ? 1 : 0,
    hasCrash: !!move.hasCrashDamage,
    alwaysCrit: !!move.willCrit,
    hits: hits > 1 ? hits : 0,
    priority: move.priority || 0,
    target: move.target
  };
}
function natureName(poke) {
  const n = poke.set && poke.set.nature;
  if (!n) return 'Serious';
  const got = poke.battle.dex.natures.get(n);
  return (got && got.name) || n;
}
function pokeCalc(poke, megaName) {
  const emptyBoost = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
  if (!megaName) {
    return {
      species: poke.species.name,
      types: poke.types.slice(),
      stats: {
        hp: poke.maxhp, at: poke.storedStats.atk, df: poke.storedStats.def,
        sa: poke.storedStats.spa, sd: poke.storedStats.spd, sp: poke.storedStats.spe
      },
      boosts: {
        at: poke.boosts.atk, df: poke.boosts.def, sa: poke.boosts.spa,
        sd: poke.boosts.spd, sp: poke.boosts.spe
      },
      ability: poke.getAbility().name,
      item: poke.getItem().name,
      status: STATUS_MAP[poke.status] || 'Healthy',
      curHP: poke.hp, maxHP: poke.maxhp,
      weight: poke.getWeight(),
      canEvolve: false
    };
  }
  const spc = poke.battle.dex.species.get(megaName);
  const set = poke.set || { evs: {} };
  const ev = set.evs || {};
  const sps = { hp: ev.hp || 0, at: ev.atk || 0, df: ev.def || 0, sa: ev.spa || 0, sd: ev.spd || 0, sp: ev.spe || 0 };
  const nature = natureName(poke);
  const stats = {
    hp: Calc.calcStat('hp', spc.baseStats.hp, sps.hp, nature, spc.name),
    at: Calc.calcStat('at', spc.baseStats.atk, sps.at, nature, spc.name),
    df: Calc.calcStat('df', spc.baseStats.def, sps.df, nature, spc.name),
    sa: Calc.calcStat('sa', spc.baseStats.spa, sps.sa, nature, spc.name),
    sd: Calc.calcStat('sd', spc.baseStats.spd, sps.sd, nature, spc.name),
    sp: Calc.calcStat('sp', spc.baseStats.spe, sps.sp, nature, spc.name)
  };
  const ability = spc.abilities['0'] || poke.getAbility().name;
  return {
    species: spc.name, types: spc.types.slice(), stats: stats, boosts: emptyBoost,
    ability: ability, item: poke.getItem().name,
    status: STATUS_MAP[poke.status] || 'Healthy',
    curHP: stats.hp, maxHP: stats.hp, weight: spc.weightkg || poke.getWeight(), canEvolve: false
  };
}
function mean(rolls) {
  if (!rolls || !rolls.length) return 0;
  let s = 0;
  for (let i = 0; i < rolls.length; i++) s += rolls[i];
  return s / rolls.length;
}
function expected(battle, atk, def, move, megaName) {
  if (!def || def.fainted || def.hp <= 0) return { dmg: 0, acc: 0, ko: false };
  let cm;
  try { cm = toCalcMove(move); }
  catch (e) { return { dmg: 0, acc: 0, ko: false }; }
  if (cm.category === 'Status' || !cm.type) return { dmg: 0, acc: cm.accuracy || 100, ko: false, status: true };
  const field = fieldOf(battle);
  let res;
  try {
    res = Calc.calculate(pokeCalc(atk, megaName), pokeCalc(def), cm, field, sideMods(atk.side), sideMods(def.side));
  } catch (e) {
    return { dmg: 0, acc: cm.accuracy, ko: false };
  }
  const rolls = res && res.damage;
  if (!rolls || !rolls.length || res.status || res.empty) return { dmg: 0, acc: cm.accuracy, ko: false };
  const avg = mean(rolls);
  const acc = Math.max(0, Math.min(100, cm.accuracy || 100)) / 100;
  const dmg = avg * acc;
  return { dmg: dmg, acc: cm.accuracy, ko: rolls[0] * acc >= def.hp, max: rolls[rolls.length - 1], min: rolls[0] };
}
function speedOf(poke, battle) {
  try { return poke.getStat('spe'); }
  catch (e) { return poke.storedStats ? poke.storedStats.spe : 1; }
}
function protectedLast(poke) {
  return !!(poke.lastMove && PROTECT[poke.lastMove.id]);
}
function benchSlots(side) {
  const active = new Set(side.active.filter(Boolean));
  const out = [];
  side.pokemon.forEach(function (p, i) {
    if (p && !p.fainted && !active.has(p)) out.push(i + 1);
  });
  return out;
}
function livingActive(side) {
  const out = [];
  side.active.forEach(function (p, i) { if (p && !p.fainted && p.hp > 0) out.push(i); });
  return out;
}
function foeSide(battle, side) {
  return battle.sides[side.n === 0 ? 1 : 0];
}
function legalLocs(battle, poke, targetType) {
  if (!battle.actions.targetTypeChoices(targetType)) return [0];
  const locs = [];
  [1, 2, -1, -2].forEach(function (loc) {
    if (!battle.validTargetLoc(loc, poke, targetType)) return;
    const tgt = poke.getAtLoc(loc);
    if (tgt && !tgt.fainted && tgt.hp > 0) locs.push(loc);
  });
  return locs;
}
function moveStr(slot, loc, mega) {
  let s = 'move ' + slot;
  if (loc) s += ' ' + loc;
  if (mega) s += ' mega';
  return s;
}
function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function chooseTeam(battle, side, level, rng) {
  const n = side.pokemon.length;
  const size = Math.min(n, side.pickedTeamSize ? side.pickedTeamSize() : 4);
  if (level <= 0) {
    const bag = [];
    for (let i = 1; i <= n; i++) bag.push(i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
    return 'team ' + bag.slice(0, size).join('');
  }
  const metas = side.pokemon.map(function (p, idx) {
    const moves = (p.moveSlots || []).map(function (m) { return m.id; });
    return { i: idx + 1, ability: p.ability || '', item: p.item || '', moves: moves, mega: !!(p.item && /ite$/.test(p.item) && p.item !== 'eviolite') };
  });
  function pairScore(a, b, bench) {
    let score = 40;
    const leads = [a, b];
    const all = leads.concat(bench);
    function has(list, id) { return list.some(function (m) { return m.moves.indexOf(id) !== -1; }); }
    function ab(list, id) { return list.some(function (m) { return m.ability === id; }); }
    [['drought', 'chlorophyll'], ['drizzle', 'swiftswim'], ['sandstream', 'sandrush'], ['snowwarning', 'slushrush']].forEach(function (pair) {
      if (ab(leads, pair[0]) && ab(leads, pair[1])) score += 36;
      else if (ab(leads, pair[0])) score += 16;
    });
    if (has(leads, 'fakeout')) score += 28;
    if (has(leads, 'fakeout') && leads[0].moves.indexOf('fakeout') !== -1 && leads[1].moves.indexOf('fakeout') !== -1) score -= 20;
    if (has(leads, 'tailwind')) score += 26;
    if (has(leads, 'trickroom')) score += 30;
    if (has(leads, 'followme') || has(leads, 'ragepowder')) score += 18;
    if (ab(leads, 'intimidate')) score += 18;
    const megas = all.filter(function (m) { return m.mega; }).length;
    if (megas === 1) score += 20;
    else if (megas > 1) score -= 40;
    if (has(bench, 'fakeout') || has(bench, 'extremespeed') || has(bench, 'suckerpunch')) score += 8;
    return score;
  }
  if (level === 1) {
    const order = metas.slice().sort(function (a, b) { return b.i - a.i; });
    const ranked = side.pokemon.map(function (p, idx) {
      const off = (p.storedStats.atk + p.storedStats.spa) + p.storedStats.spe * 0.25;
      return { i: idx + 1, off: off };
    }).sort(function (a, b) { return b.off - a.off || a.i - b.i; });
    return 'team ' + ranked.slice(0, size).map(function (x) { return x.i; }).join('');
  }
  let best = null;
  for (let i = 0; i < metas.length; i++) {
    for (let j = i + 1; j < metas.length; j++) {
      const rest = metas.filter(function (m) { return m !== metas[i] && m !== metas[j]; });
      for (let a = 0; a < rest.length; a++) {
        for (let b = a + 1; b < rest.length; b++) {
          const score = pairScore(metas[i], metas[j], [rest[a], rest[b]]);
          const order = [metas[i].i, metas[j].i, rest[a].i, rest[b].i];
          if (!best || score > best.score) best = { score: score, order: order };
        }
      }
    }
  }
  if (!best) return 'team ' + [1, 2, 3, 4].slice(0, size).join('');
  if (level >= 2 && rng) {
    // Softmax among squads is expensive to store; jitter the winner slightly so leads vary, still legal.
    const jitter = (rng() - 0.5) * 8;
    if (jitter > 3 && best.order.length >= 4) {
      const swap = best.order.slice();
      const tmp = swap[0]; swap[0] = swap[1]; swap[1] = tmp;
      best = { score: best.score, order: swap };
    }
  }
  return 'team ' + best.order.slice(0, size).join('');
}

function slotCandidates(battle, side, slot, level, reqActive) {
  const poke = side.active[slot];
  const info = reqActive && reqActive[slot];
  if (!poke || poke.fainted || poke.hp <= 0) return [{ str: 'pass', kind: 'pass', score: 0, dmg: [0, 0] }];
  const foe = foeSide(battle, side);
  const foes = foe.active;
  const ally = side.active[slot === 0 ? 1 : 0];
  const moves = (info && info.moves) || [];
  const canMega = !!(info && info.canMegaEvo) && !side.pokemon.some(function (p) { return p && p.volatiles && p.volatiles.transformed; });
  const alreadyMega = side.pokemon.some(function (p) { return p && p.species && p.species.isMega; });
  const megaOk = canMega && !alreadyMega;
  const list = [];
  const field = fieldOf(battle);
  for (let m = 0; m < moves.length; m++) {
    const mv = moves[m];
    if (!mv || mv.disabled) continue;
    const move = battle.dex.moves.get(mv.id);
    if (!move || !move.exists) continue;
    // A missing target on the request means the sim will reject a target
    // (locked Solar Beam, recharge, self/spread already resolved).
    const reqTarget = mv.target;
    const targetType = reqTarget == null || reqTarget === '' ? '' : reqTarget;
    let useLocs;
    if (!targetType) useLocs = [0];
    else {
      const locs = legalLocs(battle, poke, targetType);
      if (battle.actions.targetTypeChoices(targetType) && !locs.length) continue;
      useLocs = locs.length ? locs : [0];
    }
    const megas = megaOk ? [false, true] : [false];
    megas.forEach(function (mega) {
      const megaName = mega ? (info.canMegaEvo) : '';
      useLocs.forEach(function (loc) {
        const act = actionOf(battle, poke, ally, foes, move, m + 1, loc, mega, megaName, level, field);
        if (act) list.push(act);
      });
    });
  }
  if (!info || !info.trapped) {
    benchSlots(side).forEach(function (partySlot) {
      const incoming = side.pokemon[partySlot - 1];
      let score = level >= 2 ? -30 : -80;
      if (level >= 2 && incoming) {
        if (incoming.ability === 'intimidate') score += 35;
        const types = incoming.types || [];
        foes.forEach(function (f) {
          if (!f || f.fainted) return;
          f.types.forEach(function (ft) {
            const eff = Calc.typeEff(ft, types, {});
            if (eff === 0) score += 40;
            else if (eff < 1) score += 12;
            else if (eff > 1) score -= 18;
          });
        });
      }
      list.push({ str: 'switch ' + partySlot, kind: 'switch', score: score, dmg: [0, 0], party: partySlot, priority: 6 });
    });
  }
  if (!list.length) list.push({ str: 'move 1', kind: 'move', score: 0, dmg: [0, 0], priority: 0 });
  return list;
}

function actionOf(battle, poke, ally, foes, move, slot, loc, mega, megaName, level, field) {
  const id = move.id;
  const cm = toCalcMove(move);
  const dmg = [0, 0];
  let score = 0;
  const kind = PROTECT[id] ? 'protect' : REDIRECT[id] ? 'redirect' : id === 'helpinghand' ? 'helpinghand' : id === 'tailwind' ? 'tailwind' : id === 'trickroom' ? 'trickroom' : (cm.category === 'Status' ? 'status' : 'attack');
  if (kind === 'attack') {
    const targets = [];
    const hitsAll = cm.isSpread || move.target === 'all' || move.target === 'foeSide';
    if (hitsAll) {
      foes.forEach(function (f, i) { if (f && !f.fainted) targets.push(i); });
    } else if (loc > 0) {
      const t = poke.getAtLoc(loc);
      const idx = foes.indexOf(t);
      if (idx >= 0) targets.push(idx);
      else if (loc === 1 || loc === 2) targets.push(loc - 1);
    } else if (loc < 0) {
      score -= 200;
    } else {
      const i = foes.findIndex(function (f) { return f && !f.fainted; });
      if (i >= 0) targets.push(i);
    }
    targets.forEach(function (i) {
      const est = expected(battle, poke, foes[i], move, megaName);
      dmg[i] = est.dmg;
      score += est.dmg;
    });
    if (move.target === 'allAdjacent' && ally && ally.hp > 0 && level >= 2) {
      const splash = expected(battle, poke, ally, move, megaName);
      if (splash.dmg > 0) score -= splash.dmg * 1.4 + 30;
    }
    if (id === 'fakeout') {
      if (poke.activeMoveActions > 0) score -= 500;
      else if (level >= 2) score += 160;
      else score += 20;
    }
  } else if (kind === 'protect') {
    if (protectedLast(poke)) score -= 400;
    else if (level >= 2) {
      let threat = 0;
      foes.forEach(function (f) {
        if (!f || f.fainted) return;
        (f.moveSlots || []).forEach(function (ms) {
          const mv = battle.dex.moves.get(ms.id);
          if (!mv || mv.category === 'Status') return;
          const est = expected(battle, f, poke, mv, '');
          if (est.dmg > threat) threat = est.dmg;
        });
      });
      if (threat >= poke.hp * 0.55) score += 110 + Math.min(80, threat / 4);
      else score += 8;
    } else score -= 15;
  } else if (kind === 'tailwind') {
    const up = poke.side.sideConditions.tailwind;
    if (up) score -= 300;
    else if (level >= 2) score += field.trickRoom ? 10 : 70;
    else score += 5;
  } else if (kind === 'trickroom') {
    const tr = field.trickRoom;
    const my = speedOf(poke, battle);
    let foeSpe = 0, n = 0;
    foes.forEach(function (f) { if (f && !f.fainted) { foeSpe += speedOf(f, battle); n++; } });
    foeSpe = n ? foeSpe / n : my;
    if (level >= 2) {
      if (!tr && my + 15 < foeSpe) score += 130;
      else if (tr && my > foeSpe + 15) score += 90;
      else score -= 80;
    } else score += 4;
  } else if (kind === 'redirect') {
    score += level >= 2 ? 55 : 6;
  } else if (kind === 'helpinghand') {
    score += level >= 2 ? 40 : 4;
  } else {
    score += level >= 2 ? 6 : 1;
  }
  if (mega && level >= 1) score += (kind === 'attack' ? 8 : 0);
  return {
    str: moveStr(slot, loc, mega),
    kind: kind, score: score, dmg: dmg, mega: mega, id: id,
    priority: (id === 'fakeout' && poke.activeMoveActions === 0) ? 3 : (cm.priority || 0),
    loc: loc, slot: slot, spread: !!cm.isSpread, target: move.target
  };
}

function jointScore(a, b, foes, level) {
  if (!b) return a.score;
  let s = a.score + b.score;
  if (level < 2) return s;
  const hp = [foes[0] && !foes[0].fainted ? foes[0].hp : 0, foes[1] && !foes[1].fainted ? foes[1].hp : 0];
  for (let i = 0; i < 2; i++) {
    if (!hp[i]) continue;
    const dealt = (a.dmg[i] || 0) + (b.dmg[i] || 0);
    if (dealt <= 0) continue;
    const useful = Math.min(dealt, hp[i]);
    s += useful * 0.15;
    if (dealt >= hp[i]) s += 90;
    if (dealt > hp[i] * 1.35 && (a.dmg[i] > 0 && b.dmg[i] > 0)) s -= (dealt - hp[i]) * 0.2;
  }
  if (a.kind === 'protect' && b.kind === 'protect') s -= 70;
  if (a.kind === 'tailwind' && b.kind === 'trickroom') s -= 200;
  if (a.kind === 'trickroom' && b.kind === 'tailwind') s -= 200;
  if (a.kind === 'helpinghand' && b.kind === 'attack') s += 50;
  if (b.kind === 'helpinghand' && a.kind === 'attack') s += 50;
  if (a.kind === 'redirect' && (b.kind === 'attack' || b.kind === 'tailwind' || b.kind === 'trickroom')) s += 40;
  if (b.kind === 'redirect' && (a.kind === 'attack' || a.kind === 'tailwind' || a.kind === 'trickroom')) s += 40;
  if (a.kind === 'fakeout' && b.kind === 'fakeout') s -= 40;
  if ((a.target === 'allAdjacent' && b.kind !== 'protect') || (b.target === 'allAdjacent' && a.kind !== 'protect')) {
    // splash penalty already on the action; a small extra if both would eat it
  }
  if (a.kind === 'switch' && b.kind === 'switch') s -= 40;
  return s;
}

function bestPair(c0, c1, foes, level) {
  let best = null;
  const A = c0.length > 8 ? c0.slice().sort(function (x, y) { return y.score - x.score; }).slice(0, 8) : c0;
  const B = c1 && c1.length > 8 ? c1.slice().sort(function (x, y) { return y.score - x.score; }).slice(0, 8) : (c1 || []);
  if (!B.length) {
    A.forEach(function (a) {
      const s = a.score;
      if (!best || s > best.s) best = { s: s, a: a, b: null };
    });
    return best;
  }
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      if (A[i].mega && B[j].mega) continue;
      if (A[i].kind === 'switch' && B[j].kind === 'switch' && A[i].party && A[i].party === B[j].party) continue;
      const s = jointScore(A[i], B[j], foes, level);
      if (!best || s > best.s) best = { s: s, a: A[i], b: B[j] };
    }
  }
  return best;
}

function topPairs(c0, c1, foes, level, k) {
  const A = c0.slice().sort(function (x, y) { return y.score - x.score; }).slice(0, 6);
  const B = (c1 || []).slice().sort(function (x, y) { return y.score - x.score; }).slice(0, 6);
  const out = [];
  if (!B.length) {
    A.forEach(function (a) { out.push({ s: a.score, a: a, b: null }); });
  } else {
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        if (A[i].mega && B[j].mega) continue;
        if (A[i].kind === 'switch' && B[j].kind === 'switch' && A[i].party && A[i].party === B[j].party) continue;
        out.push({ s: jointScore(A[i], B[j], foes, level), a: A[i], b: B[j] });
      }
    }
  }
  out.sort(function (x, y) { return y.s - x.s; });
  return out.slice(0, k);
}

function outcomeScore(our, opp, myPokes, foePokes, tr) {
  // One-turn damage exchange. Priority and speed order, Fake Out flinches, Protect blocks.
  const actors = [];
  function add(act, poke, side) {
    if (!act || act.kind === 'pass' || act.kind === 'switch') return;
    actors.push({ act: act, poke: poke, side: side, spe: speedOf(poke), pri: act.priority || 0 });
  }
  if (myPokes[0]) add(our.a, myPokes[0], 'me');
  if (myPokes[1] && our.b) add(our.b, myPokes[1], 'me');
  if (foePokes[0]) add(opp.a, foePokes[0], 'foe');
  if (foePokes[1] && opp.b) add(opp.b, foePokes[1], 'foe');
  actors.sort(function (x, y) {
    if (y.pri !== x.pri) return y.pri - x.pri;
    const xs = tr ? -x.spe : x.spe;
    const ys = tr ? -y.spe : y.spe;
    return ys - xs;
  });
  const hp = {
    me: [myPokes[0] ? myPokes[0].hp : 0, myPokes[1] ? myPokes[1].hp : 0],
    foe: [foePokes[0] ? foePokes[0].hp : 0, foePokes[1] ? foePokes[1].hp : 0]
  };
  const max = {
    me: [myPokes[0] ? myPokes[0].maxhp : 1, myPokes[1] ? myPokes[1].maxhp : 1],
    foe: [foePokes[0] ? foePokes[0].maxhp : 1, foePokes[1] ? foePokes[1].maxhp : 1]
  };
  const prot = { me: [false, false], foe: [false, false] };
  const flinch = { me: [false, false], foe: [false, false] };
  actors.forEach(function (ac) {
    const idx = ac.side === 'me' ? (ac.act === our.a ? 0 : 1) : (ac.act === opp.a ? 0 : 1);
    if (hp[ac.side][idx] <= 0) return;
    if (flinch[ac.side][idx]) return;
    if (ac.act.kind === 'protect') { prot[ac.side][idx] = true; return; }
    if (ac.act.kind === 'fakeout' || ac.act.id === 'fakeout') {
      const tgtSide = ac.side === 'me' ? 'foe' : 'me';
      const loc = ac.act.loc;
      const ti = loc === 2 ? 1 : 0;
      if (!prot[tgtSide][ti] && hp[tgtSide][ti] > 0) flinch[tgtSide][ti] = true;
    }
    if (ac.act.kind !== 'attack' && ac.act.id !== 'fakeout') return;
    const tgtSide = ac.side === 'me' ? 'foe' : 'me';
    [0, 1].forEach(function (ti) {
      const dealt = ac.act.dmg[ti] || 0;
      if (!dealt) return;
      if (prot[tgtSide][ti]) return;
      hp[tgtSide][ti] = Math.max(0, hp[tgtSide][ti] - dealt);
    });
  });
  let s = 0;
  for (let i = 0; i < 2; i++) {
    s += (hp.me[i] / max.me[i]) - (hp.foe[i] / max.foe[i]);
    if (myPokes[i] && hp.me[i] <= 0) s -= 0.8;
    if (foePokes[i] && hp.foe[i] <= 0) s += 0.8;
  }
  if (our.a && (our.a.kind === 'tailwind' || (our.b && our.b.kind === 'tailwind'))) s += 0.15;
  return s;
}

function chooseMoves(battle, side, level, rng) {
  const req = side.activeRequest;
  const alive = livingActive(side);
  if (!alive.length) return 'default';
  const foe = foeSide(battle, side);
  const c0 = slotCandidates(battle, side, alive[0], level, req.active);
  const c1 = alive.length > 1 ? slotCandidates(battle, side, alive[1], level, req.active) : null;
  if (level <= 0) {
    const a = pick(rng, c0);
    if (!c1) return a.str;
    let b = pick(rng, c1);
    if (a.mega && b.mega) b = Object.assign({}, b, { mega: false, str: String(b.str).replace(/ mega$/, '') });
    if (a.kind === 'switch' && b.kind === 'switch' && a.party && a.party === b.party) {
      const alt = c1.filter(function (x) { return !(x.kind === 'switch' && x.party === a.party); })[0];
      if (alt) b = alt;
    }
    return a.str + ', ' + b.str;
  }
  if (level >= 3) {
    const ours = topPairs(c0, c1, foe.active, 2, 4);
    const fAlive = livingActive(foe);
    const fc0 = fAlive.length ? slotCandidates(battle, foe, fAlive[0], 2, foe.activeRequest && foe.activeRequest.active) : [];
    const fc1 = fAlive.length > 1 ? slotCandidates(battle, foe, fAlive[1], 2, foe.activeRequest && foe.activeRequest.active) : null;
    const theirs = fc0.length ? topPairs(fc0, fc1, side.active, 2, 3) : [];
    if (ours.length && theirs.length) {
      const tr = !!fieldOf(battle).trickRoom;
      let best = null;
      ours.forEach(function (o) {
        let sum = 0;
        theirs.forEach(function (t) {
          sum += outcomeScore(o, t, [side.active[alive[0]], alive[1] != null ? side.active[alive[1]] : null], [foe.active[fAlive[0]], fAlive[1] != null ? foe.active[fAlive[1]] : null], tr);
        });
        const avg = sum / theirs.length;
        if (!best || avg > best.avg) best = { avg: avg, o: o };
      });
      if (best) {
        return best.o.b ? (best.o.a.str + ', ' + best.o.b.str) : best.o.a.str;
      }
    }
  }
  const best = bestPair(c0, c1, foe.active, level);
  if (!best) return 'default';
  return best.b ? (best.a.str + ', ' + best.b.str) : best.a.str;
}

function chooseSwitch(battle, side, level, rng) {
  const flags = side.activeRequest.forceSwitch || [];
  const parts = [];
  const used = {};
  for (let i = 0; i < flags.length; i++) {
    if (!flags[i]) continue;
    let bench = benchSlots(side).filter(function (s) { return !used[s]; });
    if (!bench.length) { parts.push('pass'); continue; }
    let slot;
    if (level <= 0) slot = pick(rng, bench);
    else if (level === 1) {
      slot = bench.slice().sort(function (a, b) {
        return side.pokemon[b - 1].hp - side.pokemon[a - 1].hp;
      })[0];
    } else {
      const foes = foeSide(battle, side).active.filter(function (p) { return p && !p.fainted; });
      slot = bench.slice().sort(function (a, b) {
        return switchScore(side.pokemon[b - 1], foes) - switchScore(side.pokemon[a - 1], foes);
      })[0];
    }
    used[slot] = 1;
    parts.push('switch ' + slot);
  }
  return parts.length ? parts.join(', ') : 'default';
}
function switchScore(poke, foes) {
  let s = poke.hp / (poke.maxhp || 1) * 20;
  if (poke.ability === 'intimidate') s += 25;
  foes.forEach(function (f) {
    (f.types || []).forEach(function (ft) {
      const eff = Calc.typeEff(ft, poke.types, {});
      if (eff === 0) s += 30;
      else if (eff < 1) s += 8;
      else if (eff > 1) s -= 12;
    });
  });
  return s;
}

function decide(battle, sideId, level, rng) {
  const side = battle[sideId];
  const req = side.activeRequest;
  if (!req || req.wait) return 'default';
  if (req.teamPreview) return chooseTeam(battle, side, level, rng);
  if (req.forceSwitch) return chooseSwitch(battle, side, level, rng);
  return chooseMoves(battle, side, level, rng);
}

module.exports = { decide: decide };
