// Randomizer – gemeinsamer Kern für die Generationen 1, 2 und 5–7. Die Logik (Auswahl, Seeds, Protokoll) ist für alle gleich;
// jede Generation liefert ein "Modell" (Arten, Wild-Plätze, Trainer, Entwicklungen, Attacken) und schreibt es am Ende zurück.
// Vorgehen und Datenformate der einzelnen Spiele folgen dem Universal Pokémon Randomizer ZX (Ajarmar/universal-pokemon-randomizer-zx, GPL-3.0).
(function () {
  'use strict';
  var R3 = window.CCRand3;
  var DEFAULTS = {
    seed: '', wild: 'random', wildGlobal: false, trainers: 'random', trainerLevel: 0, starters: 'keep', starterPick: [0, 0, 0],
    evo: 'keep', stats: 'keep', types: 'keep', abilities: 'keep', moves: 'keep', noLegend: false,
    // Optionen nach dem Universal Pokémon Randomizer ZX
    followEvoTypes: false, followEvoAbilities: false, allowWonderGuard: false, banTrapping: false, banNegative: false, moveTypePct: 30,
    evoSameType: false, evoForceChange: false, evoLimit3: false, starterTwoEvo: false, starterSameType: false,
    wildAreaType: false, wildArea1to1: false, wildCatchAll: false, trainerTypeTheme: false, trainerNoDup: false,
    // Attacken-Daten, TMs/HMs (Modell mit setMove bzw. tm)
    movePower: false, moveAcc: false, movePP: false, moveType: false, moveCat: false,
    tmMoves: 'keep', tmGoodDamaging: false, tmGoodPct: 60, tmKeepField: true, tmCompat: 'keep', tmFollowEvo: false, tmSanity: true,
    wildLevelPct: 0, catchRate: 'keep', pickupItems: 'keep', fieldItems: 'keep', fieldTMShuffle: true, shops: 'keep', shopBanRegular: false, shopBanOP: false, trainerItems: 'keep', itemsBanBad: false,
    evoImpossible: false, evoNoTime: false, evoEasier: false, expCurve: 'keep', expLegendsSlow: false,
    tutorMoves: 'keep', tutorCompat: 'keep', statics: 'keep', staticLegendSwap: false, staticLevelPct: 0, trades: 'keep', tradeRequested: false
  };
  // Attacken, die keine "guten Schadensattacken" sind bzw. nicht rollen sollen (GlobalConstants des UPR)
  var BAN_DMG = [120, 138, 153, 173, 206, 248, 252, 264, 353, 364, 387, 389, 132, 99, 205, 301, 485, 492, 255, 49, 82, 32, 12, 90, 329];
  var FIELD_MOVES = [15, 19, 57, 70, 148, 91, 100, 127, 230, 291];
  var TRAPPING = [23, 42, 71], NEGATIVE = [54, 96, 100, 103, 112, 129]; // Schattentag/Magnetfalle/Fallensteller; Bummler, Normalisieren, Fehlgriff, Trampel, Anlaufzeit, Defätist
  function scaleLv(v, pct) { return Math.max(1, Math.min(100, Math.round(v * (1 + pct / 100)))); }
  function nameOfDefault(nat) {
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
    function pick(orig, similar, exclude, filter) {
      var list = sorted;
      if (filter) { var fl = sorted.filter(filter); if (fl.length) list = fl; }
      if (similar && bst0[orig]) {
        var t = bst0[orig], w = Math.max(30, t * 0.12);
        var near = list.filter(function (x) { return Math.abs(bst0[x] - t) <= w; });
        if (near.length < 6) near = list.slice().sort(function (a, b) { return Math.abs(bst0[a] - t) - Math.abs(bst0[b] - t); }).slice(0, 12);
        list = near;
      }
      if (exclude) { var f = list.filter(function (x) { return exclude.indexOf(x) === -1; }); if (f.length) list = f; }
      return rng.pick(list);
    }
    // Entwicklungsketten (Zustand vor dem Randomisieren) für "Entwicklungen folgen"
    var preOf0 = {};
    (model.evos || []).forEach(function (ev) { var t = ev.get(); if (t && t !== ev.from && !preOf0[t]) preOf0[t] = ev.from; });
    function depth0(x) { var d = 0, g = 0; while (preOf0[x] && g++ < 10) { x = preOf0[x]; d++; } return d; }
    var nameOf = model.nameOf || nameOfDefault;
    var TN = model.typeNames || [], AN = model.abilityNames || [], MN = model.moveNames || [];
    function tName(t) { return TN[t] || ('Typ ' + t); }
    function aName(a) { return AN[a] || ('#' + a); }
    function mName(m) { return MN[m] || ('Attacke ' + m); }
    L('Rattata Labs Randomizer – ' + model.title); L('Seed: ' + seed); L('');

    // --- Attacken-Daten (Stärke, Genauigkeit, AP, Typ, Art) ---
    if ((o.movePower || o.moveAcc || o.movePP || o.moveType || o.moveCat) && model.moves && model.setMove) {
      L('=== Attacken-Daten ===');
      var mvs = model.moves, mmax = model.maxMove || mvs.length - 1, cats = ['Physisch', 'Speziell', 'Status'], touched = {};
      var oldMv = {};
      for (var mi0 = 1; mi0 <= mmax; mi0++) if (mvs[mi0]) oldMv[mi0] = { power: mvs[mi0].power, acc: mvs[mi0].acc, pp: mvs[mi0].pp, type: mvs[mi0].type, cat: mvs[mi0].cat };
      for (var mi1 = 1; mi1 <= mmax; mi1++) {
        var mv0 = mvs[mi1]; if (!mv0 || mi1 === 165) continue;
        var ch = {};
        if (o.movePower && mv0.power >= 10) {
          var pw = rng.int(3) !== 2 ? rng.int(11) * 5 + 50 : rng.int(27) * 5 + 20;
          for (var q = 0; q < 2; q++) if (rng.int(100) === 0) pw += 50;
          var hc = mv0.hits ? (mv0.hits[1] === 5 ? 19 / 6 : (mv0.hits[0] + mv0.hits[1]) / 2) : 1;
          if (hc !== 1) { pw = Math.round(pw / hc / 5) * 5; if (pw === 0) pw = 5; }
          ch.power = pw;
        }
        if (o.movePP) ch.pp = rng.int(3) !== 2 ? rng.int(3) * 5 + 15 : rng.int(8) * 5 + 5;
        if (o.moveAcc && mv0.acc >= 5) {
          var ac;
          if (mv0.acc <= 50) { ac = rng.int(7) * 5 + 20; if (rng.int(10) === 0) ac = Math.floor(Math.floor(ac * 3 / 2) / 5) * 5; }
          else { ac = 100; var stop = mv0.acc < 90 ? 2 : 4; while (ac > 20) { if (rng.int(10) < stop) break; ac -= 5; } }
          ch.acc = ac;
        }
        if (o.moveType && (model.typePool || []).length && mv0.type !== undefined && mv0.type !== null) ch.type = rng.pick(model.typePool);
        if (o.moveCat && mv0.cat !== undefined && mv0.cat !== 2 && rng.int(2) === 0) ch.cat = mv0.cat === 0 ? 1 : 0;
        if (Object.keys(ch).length) { model.setMove(mi1, ch); Object.keys(ch).forEach(function (k) { mv0[k] = ch[k]; }); touched[mi1] = 1; }
      }
      Object.keys(touched).forEach(function (k) {
        var a = oldMv[k], b = mvs[k], parts2 = [];
        if (a.power !== b.power) parts2.push('Stärke ' + a.power + ' → ' + b.power);
        if (a.acc !== b.acc) parts2.push('Genauigkeit ' + a.acc + ' → ' + b.acc);
        if (a.pp !== b.pp) parts2.push('AP ' + a.pp + ' → ' + b.pp);
        if (a.type !== b.type) parts2.push('Typ ' + tName(a.type) + ' → ' + tName(b.type));
        if (a.cat !== b.cat) parts2.push('Art ' + cats[a.cat] + ' → ' + cats[b.cat]);
        if (parts2.length) L(mName(+k) + ': ' + parts2.join(', '));
      });
      L('');
    }

    // --- Basiswerte, Typen, Fähigkeiten ---
    if (o.stats !== 'keep' || o.types !== 'keep' || (o.abilities !== 'keep' && model.abilityPool)) {
      L('=== Pokémon-Werte ===');
      var typePool = model.typePool || [];
      var abPool = model.abilityPool ? model.abilityPool.filter(function (a) {
        return !(o.banTrapping && TRAPPING.indexOf(a) !== -1) && !(o.banNegative && NEGATIVE.indexOf(a) !== -1) && !(a === 25 && !o.allowWonderGuard);
      }) : null;
      if (abPool && o.allowWonderGuard && abPool.indexOf(25) === -1) abPool.push(25);
      var order = [];
      for (s = 1; s <= max; s++) order.push(s);
      if (o.followEvoTypes || o.followEvoAbilities) order.sort(function (a, b) { return depth0(a) - depth0(b) || a - b; });
      for (var oi = 0; oi < order.length; oi++) {
        s = order[oi];
        var e = sp[s]; if (!e) continue;
        var pr = preOf0[s] && sp[preOf0[s]] ? sp[preOf0[s]] : null;
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
        if (o.types !== 'keep' && typePool.length && o.followEvoTypes && pr) {
          var tp0 = e.types; e.types = pr.types.slice();
          parts.push('Typ ' + tName(tp0[0]) + (tp0[0] === tp0[1] ? '' : '/' + tName(tp0[1])) + ' → ' + tName(e.types[0]) + (e.types[0] === e.types[1] ? '' : '/' + tName(e.types[1])) + ' (wie Vorstufe)');
        } else if (o.types !== 'keep' && typePool.length) {
          var t0 = e.types, mono = t0[0] === t0[1], a = rng.pick(typePool), b = mono ? a : rng.pick(typePool);
          if (!mono && a === b) b = typePool[(typePool.indexOf(a) + 1 + rng.int(typePool.length - 1)) % typePool.length];
          e.types = [a, b];
          parts.push('Typ ' + tName(t0[0]) + (mono ? '' : '/' + tName(t0[1])) + ' → ' + tName(a) + (mono ? '' : '/' + tName(b)));
        }
        if (o.abilities !== 'keep' && abPool && e.abilities && o.followEvoAbilities && pr && pr.abilities) {
          var a1 = e.abilities.slice(); e.abilities = pr.abilities.slice();
          parts.push('Fähigkeit ' + a1.filter(Boolean).map(aName).join('/') + ' → ' + e.abilities.filter(Boolean).map(aName).join('/') + ' (wie Vorstufe)');
        } else if (o.abilities !== 'keep' && abPool && e.abilities) {
          var ab = abPool, a0 = e.abilities.slice(), na = a0.map(function (x, k) {
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
            if (r < (+o.moveTypePct || 0) / 100 && byType[tp[rng.int(2)]]) mv = rng.pick(byType[tp[rng.int(2)]] || damaging);
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

    // --- TMs, HMs und Attacken-Lehrer ---
    var tmm = model.tm, tut = model.tutor;
    var wantTm = tmm && (o.tmMoves === 'random' || o.tmCompat !== 'keep'), wantTut = tut && (o.tutorMoves === 'random' || o.tutorCompat !== 'keep');
    if (wantTm || wantTut) {
      var mvs2 = model.moves, perfect = mvs2[129] ? mvs2[129].acc : 0;
      var hcOf = function (m) { return m.hits ? (m.hits[1] === 5 ? 19 / 6 : (m.hits[0] + m.hits[1]) / 2) : 1; };
      var goodDmg = function (m) { var pw2 = m.power * hcOf(m); return pw2 >= 100 || (pw2 >= 50 && (m.acc >= 90 || m.acc === perfect)); };
      var pickList = function (oldList, protect) {
        var usable = [], usableDmg = [], keepN = 0, banned2 = [];
        if (o.tmKeepField) oldList.forEach(function (m) { if (FIELD_MOVES.indexOf(m) !== -1) { banned2.push(m); keepN++; } });
        for (var mq = 1; mq <= (model.maxMove || mvs2.length - 1); mq++) {
          var mm = mvs2[mq]; if (!mm || mq === 165 || protect.indexOf(mq) !== -1 || banned2.indexOf(mq) !== -1) continue;
          usable.push(mq);
          if (BAN_DMG.indexOf(mq) === -1 && goodDmg(mm)) usableDmg.push(mq);
        }
        var need = oldList.length - keepN, picked = [], dmgLeft = o.tmGoodDamaging ? Math.round((+o.tmGoodPct || 0) / 100 * need) : 0;
        for (var tq = 0; tq < need; tq++) {
          var from = dmgLeft > 0 && usableDmg.length ? usableDmg : usable, mp = rng.pick(from);
          picked.push(mp); usable.splice(usable.indexOf(mp), 1);
          if (usableDmg.indexOf(mp) !== -1) usableDmg.splice(usableDmg.indexOf(mp), 1);
          dmgLeft--;
        }
        rng.shuffle(picked);
        return oldList.map(function (m) { return o.tmKeepField && FIELD_MOVES.indexOf(m) !== -1 ? m : picked.shift(); });
      };
      var doCompat = function (label, compat, moveIds, mode, early) {
        L('=== ' + label + ' (' + mode + ') ===');
        var byKey = {}; compat.forEach(function (c) { byKey[c.key] = c; });
        var typePref = mode === 'type';
        var prob = function (c, mv, e) {
          var p = 0.5;
          if (typePref) p = (c.types[0] === mv.type || c.types[1] === mv.type) ? 0.9 : mv.type === 0 ? 0.5 : 0.25;
          return e ? Math.min(1, p * 1.8) : p;
        };
        var randomCompat = function (c) {
          for (var i = 1; i <= moveIds.length; i++) c.flags[i] = rng() < prob(c, mvs2[moveIds[i - 1]] || { type: -1 }, early && early.indexOf(moveIds[i - 1]) !== -1);
        };
        var copyUp = function (from, to) {
          for (var i = 1; i <= moveIds.length; i++) {
            if (from.flags[i]) { to.flags[i] = true; continue; }
            var pr2 = 0.25;
            if (typePref) {
              var mt = (mvs2[moveIds[i - 1]] || {}).type;
              pr2 = 0.1;
              if ((to.types[0] === mt && to.types[0] !== from.types[0] && to.types[0] !== from.types[1]) || (to.types[1] !== to.types[0] && to.types[1] === mt && to.types[1] !== from.types[1] && to.types[1] !== from.types[0])) pr2 = 0.9;
            }
            to.flags[i] = rng() < pr2;
          }
        };
        if (mode === 'full') compat.forEach(function (c) { for (var i = 1; i < c.flags.length; i++) c.flags[i] = true; });
        else if (o.tmFollowEvo) {
          compat.slice().sort(function (a, b) { return depth0(a.nat) - depth0(b.nat); }).forEach(function (c) {
            var pc = byKey[preOf0[c.nat]]; if (pc && c.key === c.nat) copyUp(pc, c); else randomCompat(c);
          });
        } else compat.forEach(randomCompat);
        L('Fertig für ' + compat.length + ' Arten und Formen.'); L('');
      };
      var sanity = function (compat, moveIds) {
        if (!o.tmSanity || !model.learnsets) return;
        var idx = {}; moveIds.forEach(function (m, i) { idx[m] = i + 1; });
        compat.forEach(function (c) { (model.learnsets[c.nat] || []).forEach(function (e) { if (idx[e[1]]) c.flags[idx[e[1]]] = true; }); });
      };
      if (wantTm) {
        if (o.tmMoves === 'random') {
          L('=== TMs ===');
          var oldTMs = tmm.tms.slice(), newTMs = pickList(oldTMs, tmm.hms || []);
          newTMs.forEach(function (m, i) { L('TM' + (i + 1 < 10 ? '0' : '') + (i + 1) + ': ' + mName(oldTMs[i]) + ' → ' + mName(m)); });
          tmm.tms = newTMs; tmm.setTMs(newTMs); L('');
        }
        if (o.tmCompat !== 'keep' && tmm.compat) doCompat('TM/HM-Kompatibilität', tmm.compat, tmm.tms.concat(tmm.hms || []), o.tmCompat, tmm.earlyHM);
        if (tmm.compat && (o.tmMoves === 'random' || o.tmCompat !== 'keep')) sanity(tmm.compat, tmm.tms.concat(tmm.hms || []));
        if (tmm.commit) tmm.commit();
      }
      if (wantTut) {
        if (o.tutorMoves === 'random') {
          L('=== Attacken-Lehrer ===');
          var oldTut = tut.moves.slice(), newTut = pickList(oldTut, tmm ? tmm.hms || [] : []);
          newTut.forEach(function (m, i) { L('Lehrer ' + (i + 1) + ': ' + mName(oldTut[i]) + ' → ' + mName(m)); });
          tut.moves = newTut; tut.setMoves(newTut); L('');
        }
        if (o.tutorCompat !== 'keep' && tut.compat) doCompat('Lehrer-Kompatibilität', tut.compat, tut.moves, o.tutorCompat, null);
        if (tut.compat && (o.tutorMoves === 'random' || o.tutorCompat !== 'keep')) sanity(tut.compat, tut.moves);
        if (tut.commit) tut.commit();
      }
    }

    // --- Entwicklungen ---
    if (o.evo !== 'keep' && model.evos && model.evos.length) {
      L('=== Entwicklungen ===');
      var pre = {}, cnt = 0, byFrom = {};
      model.evos.forEach(function (ev) { (byFrom[ev.from] = byFrom[ev.from] || []).push(ev); });
      function height(x, g) {
        g = g || 0; var h = 0;
        if (g > 4) return 0;
        (byFrom[x] || []).forEach(function (ev) { var t = ev.get(); if (t !== x) h = Math.max(h, 1 + height(t, g + 1)); });
        return h;
      }
      rng.shuffle(pool.slice()).forEach(function (sf) {
        (byFrom[sf] || []).forEach(function (ev) {
          var target = ev.get(), stage = 1; for (var xs = sf; pre[xs] && stage < 10; xs = pre[xs]) stage++;
          var cands = pool.filter(function (t) {
            if (t === sf || pre[t]) return false;
            if (o.evoForceChange && t === target) return false;
            if (o.evoSameType && sp[sf] && sp[t] && sp[t].types.indexOf(sp[sf].types[0]) === -1 && sp[t].types.indexOf(sp[sf].types[1]) === -1) return false;
            if (o.evoLimit3 && stage + 1 + height(t) > 3) return false;
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

    // --- Entwicklungen reparieren (unmögliche, zeitabhängige, leichtere) ---
    var EI = model.evoInfo;
    if ((o.evoImpossible || o.evoNoTime || o.evoEasier) && EI && model.evos && model.evos.length) {
      L('=== Entwicklungen anpassen ===');
      var fromMap = {}, rebuild = function () { fromMap = {}; model.evos.forEach(function (ev) { (fromMap[ev.from] = fromMap[ev.from] || []).push(ev); }); };
      rebuild();
      var isLevelM = function (m) { return EI.levelMethods.indexOf(m) !== -1; };
      var toLevel = function (ev, lv, why) { ev.setMethod(EI.level); ev.setParam(lv); L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': ' + why + ' → Level ' + lv); };
      var toStone = function (ev, item, why) { ev.setMethod(EI.stone); ev.setParam(item); L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': ' + why + ' → Stein (Item ' + item + ')'); };
      if (o.evoImpossible) {
        model.evos.slice().forEach(function (ev) {
          var m = ev.method();
          if (EI.beauty && m === EI.beauty) toLevel(ev, 35, 'Schönheit');
          else if (EI.electrified && m === EI.electrified) toLevel(ev, 40, 'Magnetfeld');
          else if (EI.moss && m === EI.moss) toStone(ev, EI.items.leaf, 'Moosfelsen');
          else if (EI.icy && m === EI.icy) toStone(ev, EI.items.dawn, 'Eisfelsen');
          else if (EI.withMove && m === EI.withMove && o.moves !== 'keep') {
            var lvl = 1; ((model.learnsets || {})[ev.from] || []).some(function (e) { if (e[1] === ev.param()) { lvl = e[0]; return true; } });
            toLevel(ev, lvl <= 1 ? 45 : lvl, 'Attacke');
          } else if (m === EI.trade || (EI.tradeSpecial && m === EI.tradeSpecial)) toLevel(ev, 37, 'Tausch');
          else if (m === EI.tradeItem) {
            var it = ev.param();
            if (ev.from === 79) toStone(ev, EI.items.water, 'Tausch mit Item');
            else if (EI.itemDay && model.addEvo) {
              ev.setMethod(EI.itemDay); model.addEvo(ev.from, EI.itemNight, it, ev.get());
              L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': Tausch mit Item → Level mit Item (Tag oder Nacht)');
            } else toLevel(ev, 37, 'Tausch mit Item');
          }
        });
        rebuild();
      }
      if (o.evoNoTime) {
        model.evos.slice().forEach(function (ev) {
          var m = ev.method(), has = function (mm, it) { return (fromMap[ev.from] || []).some(function (e) { return e.method() === mm && e.param() === it; }); };
          if (EI.friendDay && m === EI.friendDay) {
            if (ev.from === 133) toStone(ev, EI.items.sun, 'Freundschaft (Tag)');
            else if (model.addEvo && model.addEvo(ev.from, EI.friendNight, 0, ev.get())) L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': Freundschaft jetzt Tag und Nacht');
          } else if (EI.friendNight && m === EI.friendNight) {
            if (ev.from === 133) toStone(ev, EI.items.moon, 'Freundschaft (Nacht)');
            else if (model.addEvo && model.addEvo(ev.from, EI.friendDay, 0, ev.get())) L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': Freundschaft jetzt Tag und Nacht');
          } else if (EI.itemDay && m === EI.itemDay && !has(EI.itemNight, ev.param())) {
            if (model.addEvo) model.addEvo(ev.from, EI.itemNight, ev.param(), ev.get());
          } else if (EI.itemNight && m === EI.itemNight && !has(EI.itemDay, ev.param())) {
            if (model.addEvo) model.addEvo(ev.from, EI.itemDay, ev.param(), ev.get());
          }
        });
        rebuild();
      }
      if (o.evoEasier) {
        model.evos.forEach(function (ev) {
          var m = ev.method(), lv = ev.param();
          if (isLevelM(m)) {
            var inter = (fromMap[ev.get()] || []).length > 0;
            if (lv > 30 && inter) { ev.setParam(30); L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': Level ' + lv + ' → 30'); }
            else if (lv > 40) { ev.setParam(40); L(nameOf(ev.from) + ' → ' + nameOf(ev.get()) + ': Level ' + lv + ' → 40'); }
          } else if (EI.withOther && m === EI.withOther && o.wild !== 'keep') toLevel(ev, 35, 'Begleiter im Team');
        });
      }
      L('');
    }

    // --- EP-Kurven ---
    if (o.expCurve !== 'keep' && model.setGrowth) {
      L('=== EP-Kurven (' + o.expCurve + ') ===');
      var CURVES = { mediumFast: 0, erratic: 1, fluctuating: 2, mediumSlow: 3, fast: 4, slow: 5 }, gv = CURVES[o.expCurve];
      if (gv !== undefined) {
        var legs2 = model.legends || [], gn = 0;
        for (s = 1; s <= max; s++) { if (!sp[s]) continue; model.setGrowth(s, o.expLegendsSlow && legs2.indexOf(s) !== -1 ? 5 : gv); gn++; }
        L('Kurve für ' + gn + ' Arten gesetzt.'); L('');
      }
    }

    // --- Mindest-Fangrate ---
    if (o.catchRate !== 'keep' && model.catchRate) {
      var CR = { 1: [75, 37], 2: [128, 64], 3: [200, 100], 4: [255, 255] }[o.catchRate];
      if (CR) {
        L('=== Mindest-Fangrate (' + CR[0] + ' / Legendäre ' + CR[1] + ') ===');
        var crN = 0, legs3 = model.legends || [];
        for (s = 1; s <= max; s++) {
          if (!sp[s]) continue;
          var cur3 = model.catchRate.get(s), want = Math.max(cur3, legs3.indexOf(s) !== -1 ? CR[1] : CR[0]);
          if (want !== cur3) { model.catchRate.set(s, want); crN++; }
        }
        L(crN + ' Arten angepasst.'); L('');
      }
    }

    // --- Starter ---
    if (o.starters !== 'keep' && model.starters && model.starters.length) {
      L('=== Starter ===');
      var chosen = [], sFilter = null, nxt = {};
      (model.evos || []).forEach(function (ev) { var t = ev.get(); if (t !== ev.from) (nxt[ev.from] = nxt[ev.from] || []).push(t); });
      if (o.starters === 'random' && o.starterTwoEvo) {
        var two = pool.filter(function (x) { return !preOf0[x] && (nxt[x] || []).some(function (y) { return (nxt[y] || []).length; }); });
        if (two.length >= model.starters.length) sFilter = function (x) { return two.indexOf(x) !== -1; };
      }
      if (o.starters === 'random' && o.starterSameType) {
        var tmap = {};
        pool.forEach(function (x) { if (sFilter && !sFilter(x)) return; sp[x].types.filter(function (t, k, a) { return a.indexOf(t) === k; }).forEach(function (t) { (tmap[t] = tmap[t] || []).push(x); }); });
        var tkeys = Object.keys(tmap).filter(function (t) { return tmap[t].length >= model.starters.length; });
        if (tkeys.length) { var tt = rng.pick(tkeys), tl = tmap[tt]; sFilter = function (x) { return tl.indexOf(x) !== -1; }; L('Typ der Starter: ' + tName(+tt)); }
      }
      model.starters.forEach(function (st, i) {
        var oldS = st.get(), nw;
        if (o.starters === 'custom' && o.starterPick && o.starterPick[i % 3]) nw = o.starterPick[i % 3];
        else nw = pick(oldS, false, chosen, sFilter);
        chosen.push(nw); st.set(nw);
        L(nameOf(oldS) + ' → ' + nameOf(nw));
      });
      L('');
    }

    // --- Wilde Pokémon ---
    if (o.wild !== 'keep' && model.wild && model.wild.length) {
      L('=== Wilde Pokémon (' + model.wild.length + ' Plätze) ===');
      var map = {}, memo = {}, lastKey = null, line2 = [], areaMap = {}, areaType = {}, forced = {}, typePool2 = model.typePool || [];
      if (o.wildCatchAll) { // jede Art kommt mindestens einmal vor
        var idx = rng.shuffle(model.wild.map(function (_, i) { return i; })), spp = rng.shuffle(pool.slice());
        for (var q = 0; q < Math.min(idx.length, spp.length); q++) forced[idx[q]] = spp[q];
        L('Alle ' + Math.min(idx.length, spp.length) + ' Arten kommen mindestens einmal vor' + (spp.length > idx.length ? ' (nur ' + idx.length + ' von ' + spp.length + ' Plätzen)' : '') + '.');
      }
      model.wild.forEach(function (sl, si) {
        var old2 = sl.get(), nw2, mk = sl.table ? sl.table + '|' + old2 : null, area = sl.area || sl.key, wf = null;
        if (o.wildAreaType && typePool2.length) {
          if (areaType[area] === undefined) areaType[area] = rng.pick(typePool2);
          var wt = areaType[area]; wf = function (x) { return sp[x].types.indexOf(wt) !== -1; };
        }
        if (forced[si] !== undefined) nw2 = forced[si];
        else if (o.wildArea1to1) { var am = areaMap[area] = areaMap[area] || {}; if (!am[old2]) am[old2] = pick(old2, o.wild === 'similar', null, wf); nw2 = am[old2]; }
        else if (o.wildAreaType) nw2 = pick(old2, o.wild === 'similar', null, wf);
        else if (o.wildGlobal) { if (!map[old2]) map[old2] = pick(old2, o.wild === 'similar'); nw2 = map[old2]; }
        else if (model.memoWild && mk) { if (!memo[mk]) memo[mk] = pick(old2, o.wild === 'similar'); nw2 = memo[mk]; } // gleiche Art im selben Gebiet bleibt gleich (hält die Daten kompakt)
        else nw2 = pick(old2, o.wild === 'similar');
        sl.set(nw2);
        if (sl.key !== lastKey) { if (line2.length) L(line2.join(', ')); lastKey = sl.key; line2 = [sl.key + ': ' + nameOf(nw2)]; }
        else line2.push(nameOf(nw2));
      });
      if (line2.length) L(line2.join(', '));
      summary.wild = model.wild.length; L('');
    }

    // --- Statische Begegnungen und Geschenk-Pokémon ---
    if ((o.statics !== 'keep' || +o.staticLevelPct) && model.statics && model.statics.length) {
      L('=== Statische Pokémon (' + model.statics.length + ') ===');
      var legs = model.legends || [], spct = +o.staticLevelPct || 0;
      model.statics.forEach(function (st2) {
        var old3 = st2.get(), nw3 = old3, lv3 = st2.level;
        if (o.statics !== 'keep' && !st2.isEgg) {
          var lf = null;
          if (o.staticLegendSwap) { var wasLeg = legs.indexOf(old3) !== -1; lf = function (x) { return (legs.indexOf(x) !== -1) === wasLeg; }; }
          nw3 = pick(old3, o.statics === 'similar', null, lf);
          st2.set(nw3);
        } else if (o.statics !== 'keep') { nw3 = pick(old3, o.statics === 'similar'); st2.set(nw3); }
        if (spct && st2.setLevel && lv3) { lv3 = Math.max(1, Math.min(100, Math.round(lv3 * (1 + spct / 100)))); st2.setLevel(lv3); }
        L((st2.label ? st2.label + ': ' : '') + nameOf(old3) + ' → ' + nameOf(nw3) + (lv3 ? ' Lv' + lv3 : '') + (st2.isEgg ? ' (Ei)' : ''));
      });
      summary.statics = model.statics.length; L('');
    }

    // --- Ingame-Tausche ---
    if (o.trades !== 'keep' && model.trades && model.trades.length) {
      L('=== Ingame-Tausche (' + model.trades.length + ') ===');
      model.trades.forEach(function (tr2, ti2) {
        var g0 = tr2.given(), r0 = tr2.requested(), g1 = pick(g0, o.trades === 'similar'), r1 = r0;
        if (o.tradeRequested && r0) { r1 = pick(r0, false, [g1]); tr2.setRequested(r1); }
        tr2.setGiven(g1);
        L('Tausch ' + (ti2 + 1) + ': ' + nameOf(r1) + ' gegen ' + nameOf(g1) + ' (vorher ' + nameOf(r0) + ' gegen ' + nameOf(g0) + ')');
      });
      L('');
    }

    // --- Items: Feld, versteckt, Shops ---
    var ID = model.itemData, itemName = function (i) { return (model.itemNames && model.itemNames[i]) || ('Item ' + i); };
    if (ID) {
      var tmSet = {}, okSet = {}, poolArr = [], regSet = {}, opSet = {};
      ID.tms.forEach(function (i) { tmSet[i] = 1; });
      ID.allowed.forEach(function (i) { okSet[i] = 1; });
      (o.itemsBanBad ? ID.nonBad : ID.allowed).forEach(function (i) { if (!tmSet[i]) poolArr.push(i); });
      var randItem = function () { return rng.pick(poolArr); };
      if (o.fieldItems !== 'keep' && model.field && model.field.length) {
        L('=== Items auf dem Feld (' + model.field.length + ') ===');
        var regSlots = [], tmSlots = [];
        model.field.forEach(function (f) { var id = f.get(); if (tmSet[id]) tmSlots.push(f); else if (okSet[id]) regSlots.push(f); });
        regSlots.forEach(function (f) { var old4 = f.get(), nw4 = randItem(); f.set(nw4); L((f.label ? f.label + ': ' : '') + itemName(old4) + ' → ' + itemName(nw4)); });
        if (o.fieldTMShuffle && tmSlots.length > 1) {
          var tmVals = rng.shuffle(tmSlots.map(function (f) { return f.get(); }));
          tmSlots.forEach(function (f, i) { f.set(tmVals[i]); });
          L(tmSlots.length + ' Feld-TMs untereinander gemischt.');
        }
        summary.fieldItems = regSlots.length; L('');
      }
      if (o.pickupItems !== 'keep' && model.pickup && model.pickup.length) {
        L('=== Pickup-Items (' + model.pickup.length + ') ===');
        var pk = (o.itemsBanBad ? ID.nonBad : ID.allowed).filter(function (i) { return model.pickupTMs || !tmSet[i]; });
        model.pickup.forEach(function (sl) { var old5 = sl.get(), nw5 = rng.pick(pk); sl.set(nw5); L(itemName(old5) + ' → ' + itemName(nw5)); });
        L('');
      }
      if (o.shops !== 'keep' && model.shops && model.shops.length) {
        L('=== Shops (' + model.shops.length + ') ===');
        var banned3 = {};
        if (o.shopBanRegular) (ID.shop || []).forEach(function (i) { banned3[i] = 1; });
        if (o.shopBanOP) (ID.op || []).forEach(function (i) { banned3[i] = 1; });
        var shopPool = poolArr.filter(function (i) { return !banned3[i]; }), used3 = {};
        model.shops.forEach(function (sh) {
          var out2 = sh.items.map(function () {
            var tries = 0, it2;
            do { it2 = rng.pick(shopPool); } while (used3[it2] && ++tries < 200);
            used3[it2] = 1; return it2;
          });
          sh.set(out2); L(sh.name + ': ' + out2.map(itemName).join(', '));
        });
        L('');
      }
    }

    // --- Level der wilden Pokémon ---
    if (+o.wildLevelPct && model.wild && model.wild.length) {
      var wn = 0; model.wild.forEach(function (sl) { if (sl.scale) { sl.scale(+o.wildLevelPct); wn++; } });
      L('=== Wilde Pokémon: Level ' + (o.wildLevelPct > 0 ? '+' : '') + o.wildLevelPct + ' % (' + wn + ' Plätze) ==='); L('');
    }

    // --- Trainer ---
    if ((o.trainers !== 'keep' || +o.trainerLevel) && model.trainers && model.trainers.length) {
      L('=== Trainer ===');
      var pct = +o.trainerLevel || 0, nTr = 0;
      model.trainers.forEach(function (tr) {
        var line3 = [], tf = null, party = [], tTheme = null;
        if (o.trainers !== 'keep' && o.trainerTypeTheme && (model.typePool || []).length) {
          tTheme = rng.pick(model.typePool); tf = function (x) { return sp[x].types.indexOf(tTheme) !== -1; };
        }
        tr.mons.forEach(function (pm) {
          var cur = pm.get(), lv = pm.level;
          if (o.trainers !== 'keep') { cur = pick(cur, o.trainers === 'similar', o.trainerNoDup ? party : null, tf); party.push(cur); }
          if (o.trainerItems !== 'keep' && pm.setItem && ID && pm.hasItem) { var ti = rng.pick((o.itemsBanBad ? ID.nonBad : ID.nonBad).filter(function (x) { return !tmSet[x]; })); pm.setItem(ti); }
          if (pct) lv = Math.max(1, Math.min(100, Math.round(pm.level * (1 + pct / 100))));
          if (o.trainers !== 'keep') pm.set(cur);
          if (pct) pm.setLevel(lv);
          if (o.trainers !== 'keep' && pm.refresh) pm.refresh(cur, lv, model.learnsets && model.learnsets[cur]);
          line3.push(nameOf(cur) + ' Lv' + lv);
        });
        nTr++;
        L(tr.label + (tTheme !== null ? ' [' + tName(tTheme) + ']' : '') + ': ' + line3.join(', '));
      });
      summary.trainers = nTr; L('');
    }

    return Promise.resolve(model.commit()).then(function (data) { return { data: data, log: log.join('\n'), seed: seed, summary: summary }; });
  }

  // Entwicklungs-Tabelle: Einträge aus Methode (u16), Wert (u16), Ziel (u16) in bufOf(Art) an Position offOf(Art, Platz); leere Plätze (Methode 0) nimmt addEvo
  function makeEvoTable(model, bufOf, offOf, slots, maxId, skipMethods, onSetTarget) {
    var sp = model.species;
    function u16(b, o) { return b[o] | (b[o + 1] << 8); }
    function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }
    function entry(s, b, eo) {
      return { from: s, get: function () { return u16(b, eo + 4); }, set: function (n) { w16(b, eo + 4, n); if (onSetTarget) onSetTarget(b, eo); },
        method: function () { return u16(b, eo); }, setMethod: function (m) { w16(b, eo, m); }, param: function () { return u16(b, eo + 2); }, setParam: function (v) { w16(b, eo + 2, v); } };
    }
    model.evos = [];
    for (var s = 1; s <= maxId; s++) {
      var b = sp[s] && bufOf(s);
      if (!b) continue;
      for (var k = 0; k < slots; k++) {
        var eo = offOf(s, k);
        if (eo + 6 > b.length) break;
        var m = u16(b, eo), t = u16(b, eo + 4);
        if (!m || !t || !sp[t] || (skipMethods && skipMethods.indexOf(m) !== -1)) continue;
        model.evos.push(entry(s, b, eo));
      }
    }
    model.addEvo = function (s, method, param, target) {
      var b = bufOf(s);
      if (!b) return false;
      for (var k = 0; k < slots; k++) {
        var eo = offOf(s, k);
        if (eo + 6 > b.length || u16(b, eo)) continue;
        w16(b, eo, method); w16(b, eo + 2, param); w16(b, eo + 4, target);
        model.evos.push(entry(s, b, eo)); return true;
      }
      return false;
    };
  }

  window.CCRandCore = { scaleLv: scaleLv, makeEvoTable: makeEvoTable, DEFAULTS: DEFAULTS, run: run, nameOf: nameOfDefault };
})();
