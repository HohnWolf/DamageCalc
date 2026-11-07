// Randomizer – gemeinsamer Kern für die Generationen 1, 2 und 5–7. Die Logik (Auswahl, Seeds, Protokoll) ist für alle gleich;
// jede Generation liefert ein "Modell" (Arten, Wild-Plätze, Trainer, Entwicklungen, Attacken) und schreibt es am Ende zurück.
// Vorgehen und Datenformate der einzelnen Spiele folgen dem Universal Pokémon Randomizer ZX (Ajarmar/universal-pokemon-randomizer-zx, GPL-3.0).
(function () {
  'use strict';
  var R3 = window.CCRand3;
  var DEFAULTS = {
    seed: '', wild: 'random', wildGlobal: false, trainers: 'random', trainerLevel: 0, starters: 'keep', starterPick: [0, 0, 0],
    evo: 'keep', stats: 'keep', types: 'keep', abilities: 'keep', moves: 'keep', noLegend: false
  };
  function nameOf(nat) {
    var nd = window.NATDEX && window.NATDEX[nat];
    return nd ? ((window.CC && window.CC.LANG === 'en') ? nd[1] : (nd[2] || nd[1])) : '#' + nat;
  }
  function bst(s) { var b = s.bs, t = 0; for (var i = 0; i < b.length; i++) t += b[i]; return s.shared ? t : t; }

  // model: { title, maxNat, species[nat] = { bs: [KP, Angr, Vert, Init, SpA, SpV], types: [t1, t2], abilities: [..] }, typeNames, typePool, abilityPool,
  //          legends, specialShared, noStatsFor: [nat], wild: [{ key, get(), set(nat) }], trainers: [{ label, mons: [{ get(), set(nat), level, setLevel(l), refresh(nat, lvl) }] }],
  //          starters: [{ get(), set(nat) }], evos: [{ from, get(), set(nat) }], learnsets: { nat: [[lvl, move]] }, setLearnset(nat, list),
  //          moves: [{ power, type }], maxMove, bannedMoves, moveNames, abilityNames, commit() -> Uint8Array | Blob | Promise }
  function run(model, userOpts) {
    var o = {}; Object.keys(DEFAULTS).forEach(function (k) { o[k] = userOpts && userOpts[k] !== undefined ? userOpts[k] : DEFAULTS[k]; });
    var seed = String(o.seed || '').trim() || String(Math.floor(Math.random() * 1e9));
    var rng = R3.makeRng(seed), log = [], summary = {};
    function L(s) { log.push(s); }
    var sp = model.species, max = model.maxNat, pool = [], bst0 = [0], s;
    for (s = 1; s <= max; s++) {
      bst0.push(sp[s] ? bst(sp[s]) : 0);
      if (!sp[s]) continue;
      if (o.noLegend && model.legends && model.legends.indexOf(s) !== -1) continue;
      pool.push(s);
    }
    var sorted = pool.slice().sort(function (a, b) { return bst0[a] - bst0[b]; });
    function pick(orig, similar, exclude) {
      var list = sorted;
      if (similar && bst0[orig]) {
        var t = bst0[orig], w = Math.max(30, t * 0.12);
        var near = sorted.filter(function (x) { return Math.abs(bst0[x] - t) <= w; });
        if (near.length < 6) near = sorted.slice().sort(function (a, b) { return Math.abs(bst0[a] - t) - Math.abs(bst0[b] - t); }).slice(0, 12);
        list = near;
      }
      if (exclude) { var f = list.filter(function (x) { return exclude.indexOf(x) === -1; }); if (f.length) list = f; }
      return rng.pick(list);
    }
    var TN = model.typeNames || [], AN = model.abilityNames || [], MN = model.moveNames || [];
    function tName(t) { return TN[t] || ('Typ ' + t); }
    function aName(a) { return AN[a] || ('Fähigkeit ' + a); }
    function mName(m) { return MN[m] || ('Attacke ' + m); }
    L('Rattata Labs Randomizer – ' + model.title); L('Seed: ' + seed); L('');

    // --- Basiswerte, Typen, Fähigkeiten ---
    if (o.stats !== 'keep' || o.types !== 'keep' || (o.abilities !== 'keep' && model.abilityPool)) {
      L('=== Pokémon-Werte ===');
      var typePool = model.typePool || [];
      for (s = 1; s <= max; s++) {
        var e = sp[s]; if (!e) continue;
        var parts = [];
        if (o.stats !== 'keep' && !(model.noStatsFor && model.noStatsFor.indexOf(s) !== -1)) {
          var n = model.specialShared ? 5 : 6, old = e.bs.slice(0, n), ns;
          if (o.stats === 'shuffle') ns = rng.shuffle(old.slice());
          else {
            var total = old.reduce(function (a, b) { return a + b; }, 0), w = old.map(function () { return 0.4 + rng(); }), ws = w.reduce(function (a, b) { return a + b; }, 0);
            ns = w.map(function (x) { return Math.max(10, Math.min(250, Math.round(total * x / ws))); });
            var diff = total - ns.reduce(function (a, b) { return a + b; }, 0), guard = 0;
            while (diff !== 0 && guard++ < 2000) { var ix = rng.int(n), stp = diff > 0 ? 1 : -1; if (ns[ix] + stp >= 10 && ns[ix] + stp <= 250) { ns[ix] += stp; diff -= stp; } }
          }
          for (var i = 0; i < n; i++) e.bs[i] = ns[i];
          if (model.specialShared) e.bs[5] = e.bs[4];
          parts.push('Werte ' + old.join('/') + ' → ' + ns.join('/'));
        }
        if (o.types !== 'keep' && typePool.length) {
          var t0 = e.types, mono = t0[0] === t0[1], a = rng.pick(typePool), b = mono ? a : rng.pick(typePool);
          if (!mono && a === b) b = typePool[(typePool.indexOf(a) + 1 + rng.int(typePool.length - 1)) % typePool.length];
          e.types = [a, b];
          parts.push('Typ ' + tName(t0[0]) + (mono ? '' : '/' + tName(t0[1])) + ' → ' + tName(a) + (mono ? '' : '/' + tName(b)));
        }
        if (o.abilities !== 'keep' && model.abilityPool && e.abilities) {
          var ab = model.abilityPool, a0 = e.abilities.slice(), na = a0.map(function (x, k) {
            if (!x) return 0;
            if (k > 0 && x === a0[0]) return null; // gleiche zweite Fähigkeit bleibt gleich der ersten
            return rng.pick(ab);
          });
          na = na.map(function (x, k) { return x === null ? na[0] : x; });
          if (na[1] && na[1] === na[0] && a0[1] !== a0[0]) na[1] = ab[(ab.indexOf(na[0]) + 1) % ab.length];
          e.abilities = na;
          parts.push('Fähigkeit ' + a0.filter(Boolean).map(aName).join('/') + ' → ' + na.filter(Boolean).map(aName).join('/'));
        }
        if (parts.length) L(nameOf(s) + ': ' + parts.join(', '));
      }
      if (model.commitSpecies) model.commitSpecies();
      L('');
    }

    // --- Level-Attacken ---
    if (o.moves === 'random' && model.learnsets && model.setLearnset) {
      L('=== Attacken (Level-Aufstieg) ===');
      var damaging = [], byType = {}, all = [], banned = model.bannedMoves || [];
      for (var m = 1; m <= model.maxMove; m++) {
        if (banned.indexOf(m) !== -1) continue;
        var mi = model.moves && model.moves[m];
        if (model.moves && !mi) continue;
        all.push(m);
        if (mi && mi.power > 0) { damaging.push(m); (byType[mi.type] = byType[mi.type] || []).push(m); }
      }
      if (!damaging.length) damaging = all;
      for (s = 1; s <= max; s++) {
        var ld = model.learnsets[s], e2 = sp[s];
        if (!ld || !e2) continue;
        var tp = e2.types, used = [], line = [], out = [];
        for (var k = 0; k < ld.length; k++) {
          var mv, tries = 0;
          do {
            var r = rng();
            if (r < 0.3 && byType[tp[rng.int(2)]]) mv = rng.pick(byType[tp[rng.int(2)]] || damaging);
            else if (k < 2 || r < 0.65) mv = rng.pick(damaging);
            else mv = rng.pick(all);
          } while (used.indexOf(mv) !== -1 && ++tries < 30);
          used.push(mv); out.push([ld[k][0], mv]);
          line.push('Lv' + ld[k][0] + ' ' + mName(mv));
        }
        model.setLearnset(s, out); model.learnsets[s] = out;
        L(nameOf(s) + ': ' + line.join(', '));
      }
      L('');
    }

    // --- Entwicklungen ---
    if (o.evo !== 'keep' && model.evos && model.evos.length) {
      L('=== Entwicklungen ===');
      var pre = {}, cnt = 0, byFrom = {};
      model.evos.forEach(function (ev) { (byFrom[ev.from] = byFrom[ev.from] || []).push(ev); });
      rng.shuffle(pool.slice()).forEach(function (sf) {
        (byFrom[sf] || []).forEach(function (ev) {
          var target = ev.get(), cands = pool.filter(function (t) {
            if (t === sf || pre[t]) return false;
            for (var x = sf; x; x = pre[x]) if (x === t) return false;
            return true;
          });
          if (o.evo === 'similar') {
            var tb = bst0[target], near = cands.filter(function (t) { return Math.abs(bst0[t] - tb) <= Math.max(40, tb * 0.15); });
            if (near.length >= 3) cands = near;
          }
          if (!cands.length) return;
          var nt = rng.pick(cands);
          pre[nt] = sf; ev.set(nt); cnt++;
          L(nameOf(sf) + ' → ' + nameOf(nt) + ' (statt ' + nameOf(target) + ')');
        });
      });
      summary.evo = cnt; L('');
    }

    // --- Starter ---
    if (o.starters !== 'keep' && model.starters && model.starters.length) {
      L('=== Starter ===');
      var chosen = [];
      model.starters.forEach(function (st, i) {
        var oldS = st.get(), nw;
        if (o.starters === 'custom' && o.starterPick && o.starterPick[i % 3]) nw = o.starterPick[i % 3];
        else nw = pick(oldS, false, chosen);
        chosen.push(nw); st.set(nw);
        L(nameOf(oldS) + ' → ' + nameOf(nw));
      });
      L('');
    }

    // --- Wilde Pokémon ---
    if (o.wild !== 'keep' && model.wild && model.wild.length) {
      L('=== Wilde Pokémon (' + model.wild.length + ' Plätze) ===');
      var map = {}, memo = {}, lastKey = null, line2 = [];
      model.wild.forEach(function (sl) {
        var old2 = sl.get(), nw2, mk = sl.table ? sl.table + '|' + old2 : null;
        if (o.wildGlobal) { if (!map[old2]) map[old2] = pick(old2, o.wild === 'similar'); nw2 = map[old2]; }
        else if (model.memoWild && mk) { if (!memo[mk]) memo[mk] = pick(old2, o.wild === 'similar'); nw2 = memo[mk]; } // gleiche Art im selben Gebiet bleibt gleich (hält die Daten kompakt)
        else nw2 = pick(old2, o.wild === 'similar');
        sl.set(nw2);
        if (sl.key !== lastKey) { if (line2.length) L(line2.join(', ')); lastKey = sl.key; line2 = [sl.key + ': ' + nameOf(nw2)]; }
        else line2.push(nameOf(nw2));
      });
      if (line2.length) L(line2.join(', '));
      summary.wild = model.wild.length; L('');
    }

    // --- Trainer ---
    if ((o.trainers !== 'keep' || +o.trainerLevel) && model.trainers && model.trainers.length) {
      L('=== Trainer ===');
      var pct = +o.trainerLevel || 0, nTr = 0;
      model.trainers.forEach(function (tr) {
        var line3 = [];
        tr.mons.forEach(function (pm) {
          var cur = pm.get(), lv = pm.level;
          if (o.trainers !== 'keep') cur = pick(cur, o.trainers === 'similar');
          if (pct) lv = Math.max(1, Math.min(100, Math.round(pm.level * (1 + pct / 100))));
          if (o.trainers !== 'keep') pm.set(cur);
          if (pct) pm.setLevel(lv);
          if (o.trainers !== 'keep' && pm.refresh) pm.refresh(cur, lv, model.learnsets && model.learnsets[cur]);
          line3.push(nameOf(cur) + ' Lv' + lv);
        });
        nTr++;
        L(tr.label + ': ' + line3.join(', '));
      });
      summary.trainers = nTr; L('');
    }

    return Promise.resolve(model.commit()).then(function (data) { return { data: data, log: log.join('\n'), seed: seed, summary: summary }; });
  }

  window.CCRandCore = { DEFAULTS: DEFAULTS, run: run, nameOf: nameOf };
})();
