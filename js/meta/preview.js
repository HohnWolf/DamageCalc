// Instant read of a matchup. No battle is simulated: speed tiers, OHKO/2HKO and threats
// come from js/calc.js only, so it also runs in the browser and on Android.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLMetaPreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function speed(Calc, mon, mode) {
    var p = {
      species: mon.name, types: mon.types || ['Normal'], stats: mon.stats,
      boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
      ability: mon.ability || '', item: mode === 'scarf' ? 'Choice Scarf' : (mon.item || ''),
      status: 'Healthy', curHP: mon.stats.hp, maxHP: mon.stats.hp, weight: mon.weight || 50
    };
    var field = { weather: 'None', terrain: 'None', gravity: false };
    var side = { tailwind: mode === 'tailwind' };
    return Calc.getSpeed(p, field, side);
  }
  function tiers(Calc, mons) {
    return (mons || []).map(function (m) {
      return {
        name: m.name,
        base: speed(Calc, m, 'base'),
        scarf: speed(Calc, m, 'scarf'),
        tailwind: speed(Calc, m, 'tailwind')
      };
    }).sort(function (a, b) { return b.base - a.base; });
  }
  function bestHit(Calc, atk, def) {
    var field = { format: 'Doubles', weather: 'None', terrain: 'None' };
    var best = null;
    (atk.moves || []).forEach(function (mv) {
      if (!mv || mv.category === 'Status' || !mv.bp && mv.category !== 'Physical' && mv.category !== 'Special') {
        if (!mv || mv.category === 'Status') return;
      }
      if (!mv || mv.category === 'Status') return;
      var move = {
        name: mv.name, bp: mv.bp || 0, type: mv.type, category: mv.category,
        makesContact: !!mv.makesContact, isSpread: !!mv.isSpread,
        isSound: !!mv.isSound, isBullet: !!mv.isBullet, isPunch: !!mv.isPunch,
        isBite: !!mv.isBite, isPulse: !!mv.isPulse, isSlice: !!mv.isSlice,
        hasSecondaryEffect: !!mv.hasSecondaryEffect, accuracy: mv.accuracy || 100
      };
      var A = monCalc(atk), D = monCalc(def);
      var res;
      try { res = Calc.calculate(A, D, move, field, {}, {}); }
      catch (e) { return; }
      if (!res || !res.damage || res.status || res.empty) return;
      var ko = Calc.koChance(res.damage, D, { sitrus: def.item === 'Sitrus Berry' });
      var score = ko.n === 1 ? (1 + (ko.chance || 0)) : ko.n === 2 ? (0.4 + 0.3 * (ko.chance || 0)) : (ko.n ? 0.15 : 0);
      if (!best || score > best.score) best = { move: mv.name, ko: ko, score: score, acc: move.accuracy };
    });
    return best;
  }
  function monCalc(m) {
    return {
      species: m.name, types: m.types || ['Normal'], stats: m.stats,
      boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
      ability: m.ability || '', item: m.item || '', status: 'Healthy',
      curHP: m.stats.hp, maxHP: m.stats.hp, weight: m.weight || 50, canEvolve: false
    };
  }
  function matrix(Calc, atkSide, defSide) {
    return (atkSide || []).map(function (a) {
      return {
        name: a.name,
        vs: (defSide || []).map(function (d) {
          var hit = bestHit(Calc, a, d);
          return { name: d.name, hit: hit };
        })
      };
    });
  }
  function threats(Calc, mine, foes) {
    var rows = (foes || []).map(function (f) {
      var worst = null;
      (mine || []).forEach(function (m) {
        var hit = bestHit(Calc, f, m);
        if (!hit) return;
        if (!worst || hit.score > worst.score) worst = { into: m.name, hit: hit };
      });
      var danger = worst ? worst.hit.score : 0;
      var usage = f.usage || 0;
      return { name: f.name, usage: usage, danger: danger * (0.35 + usage), into: worst, ko: worst && worst.hit.ko };
    });
    rows.sort(function (a, b) { return b.danger - a.danger; });
    return rows.slice(0, 8).map(function (t) {
      var counter = null;
      (mine || []).forEach(function (m) {
        var back = bestHit(Calc, m, (foes || []).filter(function (f) { return f.name === t.name; })[0] || { moves: [], stats: { hp: 1 }, types: ['Normal'] });
        var taken = bestHit(Calc, (foes || []).filter(function (f) { return f.name === t.name; })[0] || { moves: [] }, m);
        var score = (back && back.score || 0) - (taken && taken.score || 0);
        if (!counter || score > counter.score) counter = { name: m.name, score: score, hit: back };
      });
      t.counter = counter;
      return t;
    });
  }
  function analyze(Calc, mine, foes) {
    var order = tiers(Calc, (mine || []).concat(foes || []).map(function (m) {
      return Object.assign({ side: m.side }, m);
    }));
    return {
      speeds: { mine: tiers(Calc, mine), foe: tiers(Calc, foes), all: order },
      mineHits: matrix(Calc, mine, foes),
      foeHits: matrix(Calc, foes, mine),
      threats: threats(Calc, mine, foes)
    };
  }
  return { analyze: analyze, speed: speed, tiers: tiers };
});
