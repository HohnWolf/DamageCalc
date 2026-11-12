// Rough doubles check for Android and the browser. Damage only, via js/calc.js.
// It is not the Showdown simulator. The full simulator runs in the desktop app.
importScripts('../calc.js');
var Calc = self.Calc;

function mean(rolls) {
  if (!rolls || !rolls.length) return 0;
  var s = 0;
  for (var i = 0; i < rolls.length; i++) s += rolls[i];
  return s / rolls.length;
}
function mon(src) {
  return {
    name: src.name, types: src.types, stats: src.stats, ability: src.ability, item: src.item,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, status: 'Healthy',
    curHP: src.stats.hp, maxHP: src.stats.hp, weight: src.weight || 50, moves: src.moves || [],
    hp: src.stats.hp, fainted: false, activeTurns: 0
  };
}
function hit(atk, def, mv) {
  if (!mv || mv.category === 'Status') return 0;
  var move = {
    name: mv.name, bp: mv.bp || 0, type: mv.type, category: mv.category,
    makesContact: !!mv.makesContact, isSpread: !!mv.isSpread, isSound: !!mv.isSound,
    isPunch: !!mv.isPunch, isBite: !!mv.isBite, isSlice: !!mv.isSlice, isPulse: !!mv.isPulse,
    hasSecondaryEffect: !!mv.hasSecondaryEffect
  };
  try {
    var res = Calc.calculate(atk, def, move, { format: 'Doubles', weather: 'None', terrain: 'None' }, {}, {});
    if (!res || !res.damage || res.status) return 0;
    var acc = mv.accuracy == null || mv.accuracy === true ? 1 : Math.max(0, Math.min(100, mv.accuracy)) / 100;
    return mean(res.damage) * acc;
  } catch (e) { return 0; }
}
function best(atk, foes) {
  var pick = null;
  atk.moves.forEach(function (mv) {
    if (!mv || mv.category === 'Status') return;
    if (mv.name === 'Fake Out' && atk.activeTurns > 0) return;
    var d0 = foes[0] && !foes[0].fainted ? hit(atk, foes[0], mv) : 0;
    var d1 = foes[1] && !foes[1].fainted ? hit(atk, foes[1], mv) : 0;
    var score = mv.isSpread ? d0 + d1 : Math.max(d0, d1);
    if (mv.name === 'Fake Out' && atk.activeTurns === 0) score += 40;
    if (!pick || score > pick.score) pick = { mv: mv, d0: d0, d1: d1, score: score, spread: !!mv.isSpread };
  });
  return pick;
}
function game(mine, foe, rng) {
  var A = mine.slice(0, 4).map(mon);
  var B = foe.slice(0, 4).map(mon);
  function intimidate(lead, other) {
    lead.forEach(function (p) {
      if (p.ability !== 'Intimidate') return;
      other.forEach(function (q) { if (q && !q.fainted) q.boosts.at = Math.max(-6, (q.boosts.at || 0) - 1); });
    });
  }
  var aAct = [A[0], A[1]], bAct = [B[0], B[1]], ai = 2, bi = 2;
  intimidate(aAct, bAct); intimidate(bAct, aAct);
  for (var turn = 0; turn < 40; turn++) {
    if (aAct.every(function (p) { return !p || p.fainted; }) && ai >= A.length) return 'b';
    if (bAct.every(function (p) { return !p || p.fainted; }) && bi >= B.length) return 'a';
    var queue = [];
    function plan(arr, foes, side) {
      arr.forEach(function (p, i) {
        if (!p || p.fainted) return;
        var b = best(p, foes);
        if (!b) return;
        queue.push({ p: p, b: b, side: side, i: i, pri: b.mv.name === 'Fake Out' && p.activeTurns === 0 ? 3 : 0, spe: Calc.getSpeed(p, { weather: 'None', terrain: 'None' }, {}) });
      });
    }
    plan(aAct, bAct, 'a');
    plan(bAct, aAct, 'b');
    queue.sort(function (x, y) { return y.pri - x.pri || y.spe - x.spe || (rng() - 0.5); });
    var flinch = {};
    queue.forEach(function (q) {
      if (q.p.fainted || q.p.hp <= 0) return;
      if (flinch[q.side + q.i]) return;
      var foes = q.side === 'a' ? bAct : aAct;
      var foeKey = q.side === 'a' ? 'b' : 'a';
      if (q.b.mv.name === 'Fake Out' && q.p.activeTurns === 0) {
        var ti = q.b.d0 >= q.b.d1 ? 0 : 1;
        if (foes[ti] && !foes[ti].fainted) flinch[foeKey + ti] = 1;
      }
      [0, 1].forEach(function (ti) {
        var d = ti === 0 ? q.b.d0 : q.b.d1;
        if (!d || !foes[ti] || foes[ti].fainted) return;
        if (!q.b.spread && d < (ti === 0 ? q.b.d1 : q.b.d0)) return;
        if (!q.b.spread && ti !== (q.b.d0 >= q.b.d1 ? 0 : 1)) return;
        foes[ti].hp -= d;
        foes[ti].curHP = foes[ti].hp;
        if (foes[ti].hp <= 0) foes[ti].fainted = true;
      });
      q.p.activeTurns++;
    });
    function refill(act, pool, idx) {
      for (var s = 0; s < act.length; s++) {
        if (act[s] && !act[s].fainted) continue;
        while (idx.n < pool.length && pool[idx.n].fainted) idx.n++;
        if (idx.n < pool.length) { act[s] = pool[idx.n]; act[s].activeTurns = 0; idx.n++; }
      }
    }
    var ia = { n: ai }, ib = { n: bi };
    refill(aAct, A, ia); refill(bAct, B, ib); ai = ia.n; bi = ib.n;
    if (aAct.every(function (p) { return !p || p.fainted; })) return 'b';
    if (bAct.every(function (p) { return !p || p.fainted; })) return 'a';
  }
  var ah = 0, bh = 0;
  aAct.forEach(function (p) { if (p && !p.fainted) ah += p.hp; });
  bAct.forEach(function (p) { if (p && !p.fainted) bh += p.hp; });
  if (ah === bh) return 'tie';
  return ah > bh ? 'a' : 'b';
}
function mulberry(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
self.onmessage = function (ev) {
  var msg = ev.data || {};
  var rng = mulberry(msg.seed || 1);
  var wins = 0, losses = 0, ties = 0, n = Math.max(1, Math.min(50, msg.games | 0 || 30));
  for (var i = 0; i < n; i++) {
    var r = game(msg.mine || [], msg.foe || [], rng);
    if (r === 'a') wins++; else if (r === 'b') losses++; else ties++;
    if (i % 5 === 4) self.postMessage({ type: 'tick', done: i + 1, total: n });
  }
  self.postMessage({ type: 'done', wins: wins, losses: losses, ties: ties, games: n });
};
