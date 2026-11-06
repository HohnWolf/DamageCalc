// Randomizer für Pokémon der 3. Generation (Rubin, Saphir, Smaragd, Feuerrot, Blattgrün): verändert eine Kopie der ROM-Bytes.
// Baut auf js/gen3.js auf (parseRom liefert Basiswerte, Level-Attacken, Trainer samt Offsets). Wilde Pokémon, Starter und Entwicklungen
// werden hier über ihre Byte-Muster gesucht. Nichts wird hochgeladen; die Originaldatei bleibt unverändert.
// Gleiche ROM + gleiche Einstellungen + gleicher Seed ergeben immer dieselbe Randomisierung.
(function () {
  'use strict';
  var G = window.GEN3;

  var DEFAULTS = {
    seed: '', wild: 'random', wildGlobal: false, trainers: 'random', trainerLevel: 0, starters: 'random', starterPick: [0, 0, 0],
    evo: 'keep', stats: 'keep', types: 'keep', abilities: 'keep', moves: 'keep', noLegend: false
  };
  var LEGEND_NAT = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386];
  var KIND = [['land', 12], ['water', 5], ['rock', 5], ['fish', 10]];
  var BAN_ABILITY = [25, 54]; // Wunderwache, Bummler
  var TN = ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', '???', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht'];
  var BAN_MOVE = [165];       // Verzweifler

  function u16(u8, o) { return u8[o] | (u8[o + 1] << 8); }
  function w16(u8, o, v) { u8[o] = v & 0xFF; u8[o + 1] = (v >> 8) & 0xFF; }
  function u32(u8, o) { return (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0; }

  // ---------------- Zufall (Seed als Text) ----------------
  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function makeRng(seed) {
    var a = hashSeed(String(seed));
    function next() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    next.int = function (n) { return Math.floor(next() * n); };
    next.pick = function (arr) { return arr[Math.floor(next() * arr.length)]; };
    next.shuffle = function (arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    return next;
  }

  // ---------------- Arten und Hilfen ----------------
  function validSpecies(rom, s) { return ((s >= 1 && s <= 251) || (s >= 277 && s <= 411)) && rom.species[s] && rom.species[s].nat > 0; }
  function bstOf(rom, s) { var b = rom.species[s].bs; return b[0] + b[1] + b[2] + b[3] + b[4] + b[5]; }
  function nameOf(rom, s) { var sp = rom.species[s]; return sp ? (sp.name || ('#' + sp.nat)) : '#' + s; }
  function makePool(rom, noLegend) {
    var pool = [];
    for (var s = 1; s < rom.species.length; s++) {
      if (!validSpecies(rom, s)) continue;
      if (noLegend && LEGEND_NAT.indexOf(rom.species[s].nat) !== -1) continue;
      pool.push(s);
    }
    return pool;
  }
  // zufällig ersetzen, "similar": nur Arten mit ähnlicher Gesamtstärke (Basiswertesumme)
  function makePicker(rom, pool, rng, bst0) {
    var sorted = pool.slice().sort(function (a, b) { return bst0[a] - bst0[b]; });
    return function (orig, similar, exclude) {
      var list = sorted;
      if (similar) {
        var t = bst0[orig], w = Math.max(30, t * 0.12);
        var near = sorted.filter(function (s) { return Math.abs(bst0[s] - t) <= w; });
        if (near.length < 6) {
          var by = sorted.slice().sort(function (a, b) { return Math.abs(bst0[a] - t) - Math.abs(bst0[b] - t); });
          near = by.slice(0, 12);
        }
        list = near;
      }
      if (exclude) { var f = list.filter(function (s) { return exclude.indexOf(s) === -1; }); if (f.length) list = f; }
      return rng.pick(list);
    };
  }

  // ---------------- Wilde Pokémon: gWildMonHeaders ----------------
  // Eintrag (20 Byte): Gruppe, Karte, 2 Byte Füllung, danach 4 Zeiger (Land, Wasser, Felsen, Angeln) auf je { Rate, Zeiger auf Liste }.
  // Liste: { minLevel, maxLevel, Art(u16) } × 12 / 5 / 5 / 10.
  function romPtr(u8, o) { var p = u32(u8, o); return p >= 0x08000000 && p < 0x08000000 + u8.length ? p - 0x08000000 : -1; }
  function wildArrayOk(rom, u8, off, n) {
    if (off < 0 || off % 2 || off + n * 4 > u8.length) return false;
    for (var i = 0; i < n; i++) {
      var mn = u8[off + i * 4], mx = u8[off + i * 4 + 1], sp = u16(u8, off + i * 4 + 2);
      if (mn < 1 || mx > 100 || mn > mx || !validSpecies(rom, sp)) return false;
    }
    return true;
  }
  function wildEntryOk(rom, u8, p, out) {
    if (u8[p + 2] || u8[p + 3]) return false;
    var any = false;
    for (var k = 0; k < 4; k++) {
      var raw = u32(u8, p + 4 + k * 4);
      if (raw === 0) continue;
      var info = romPtr(u8, p + 4 + k * 4);
      if (info < 0) return false;
      var arr = romPtr(u8, info + 4);
      if (!wildArrayOk(rom, u8, arr, KIND[k][1])) return false;
      any = true;
      if (out) out.push({ off: arr, n: KIND[k][1], kind: KIND[k][0], map: u8[p] + ':' + u8[p + 1] });
    }
    return any;
  }
  function findWild(rom, u8) {
    var best = -1, bestLen = 0;
    for (var p = 0; p + 20 <= u8.length; p += 4) {
      if (u8[p + 2] || u8[p + 3] || u8[p] === 0xFF) continue;
      var b = romPtr(u8, p + 4), c = romPtr(u8, p + 8), d = romPtr(u8, p + 12), e = romPtr(u8, p + 16);
      if (b < 0 && c < 0 && d < 0 && e < 0) continue;
      if (!wildEntryOk(rom, u8, p)) continue;
      var n = 1;
      while (p + (n + 1) * 20 <= u8.length && u8[p + n * 20] !== 0xFF && wildEntryOk(rom, u8, p + n * 20)) n++;
      if (n > bestLen) { bestLen = n; best = p; }
      p += n * 20 - 4;
    }
    if (bestLen < 30) return { arrays: [], maps: 0 };
    var raw = [];
    for (var i = 0; i < bestLen; i++) wildEntryOk(rom, u8, best + i * 20, raw);
    var seen = {}, arrays = [];
    raw.forEach(function (a) { if (!seen[a.off]) { seen[a.off] = 1; arrays.push(a); } });
    return { arrays: arrays, maps: bestLen };
  }

  // ---------------- Starter ----------------
  function findStarters(rom, u8) {
    var found = [], i;
    if (!rom.frlg) {
      for (i = 0; i + 6 <= u8.length; i += 2) if (u16(u8, i) === 277 && u16(u8, i + 2) === 280 && u16(u8, i + 4) === 283) found.push(i);
      return found.length ? found[0] : -1;
    }
    for (i = 0; i + 6 <= u8.length; i += 2) {
      var a = u16(u8, i), b = u16(u8, i + 2), c = u16(u8, i + 4);
      if (a !== b && b !== c && a !== c && [a, b, c].every(function (v) { return v === 1 || v === 4 || v === 7; })) found.push(i);
    }
    return found.length === 1 ? found[0] : -1;
  }

  // ---------------- Entwicklungen: 5 Einträge à 8 Byte pro Art (Methode, Wert, Ziel, Füllung) ----------------
  function findEvo(u8) {
    var head = [4, 0, 16, 0, 2, 0, 0, 0], second = [4, 0, 32, 0, 3, 0, 0, 0];
    for (var i = 0; i + 120 < u8.length; i += 4) {
      var ok = true, k;
      for (k = 0; k < 8; k++) if (u8[i + k] !== head[k]) { ok = false; break; }
      if (!ok) continue;
      for (k = 8; k < 40; k++) if (u8[i + k] !== 0) { ok = false; break; }
      if (!ok) continue;
      for (k = 0; k < 8; k++) if (u8[i + 40 + k] !== second[k]) { ok = false; break; }
      if (ok) return i - 40; // Eintrag der Art 1 beginnt bei i
    }
    return -1;
  }

  // Attackennamen (englische ROMs): Tabelle mit 13 Byte pro Name, beginnt mit POUND / KARATE CHOP; sonst nur Nummern
  function findMoveNames(u8) {
    var a = [0xCA, 0xC9, 0xCF, 0xC8, 0xBE, 0xFF], b = [0xC5, 0xBB];
    for (var i = 13; i + 40 < u8.length; i++) {
      if (u8[i] !== a[0]) continue;
      var ok = true, k;
      for (k = 0; k < 6; k++) if (u8[i + k] !== a[k]) { ok = false; break; }
      if (ok && u8[i + 13] === b[0] && u8[i + 14] === b[1] && u8[i - 13] === 0xAE) return i - 13;
    }
    return -1;
  }

  function scan(rom, u8) {
    var wild = findWild(rom, u8);
    return { wildArrays: wild.arrays.length, wildMaps: wild.maps, starterOff: findStarters(rom, u8), evoOff: findEvo(u8),
      trainers: rom.trainers.length, learnsets: rom.off && rom.off.learn.filter(function (x) { return x >= 0; }).length || 0 };
  }

  // ---------------- Hauptfunktion ----------------
  function run(buf, rom, userOpts) {
    var o = {}; Object.keys(DEFAULTS).forEach(function (k) { o[k] = userOpts && userOpts[k] !== undefined ? userOpts[k] : DEFAULTS[k]; });
    var u8 = new Uint8Array(buf); // Kopie
    var seed = String(o.seed || '').trim() || String(Math.floor(Math.random() * 1e9));
    var rng = makeRng(seed);
    var log = [], summary = {};
    function L(s) { log.push(s); }
    var nsp = rom.species.length, pool = makePool(rom, o.noLegend);
    var bst0 = []; for (var s0 = 0; s0 < nsp; s0++) bst0.push(validSpecies(rom, s0) ? bstOf(rom, s0) : 0);
    var pick = makePicker(rom, pool, rng, bst0);
    var mnOff = findMoveNames(u8);
    function mName(m) { return mnOff >= 0 ? G.decode(u8, mnOff + m * 13, 13) : 'Attacke ' + m; }
    var ls = rom.learnsets.map(function (l) { return l.map(function (e) { return e.slice(); }); }); // wird beim Attackenmischen angepasst
    L('Rattata Labs Randomizer – ' + (rom.gameEn || rom.title) + ' (' + rom.code + ')');
    L('Seed: ' + seed);
    L('');

    // --- Basiswerte, Typen, Fähigkeiten ---
    var base = rom.off.bs, doBase = o.stats !== 'keep' || o.types !== 'keep' || o.abilities !== 'keep';
    if (doBase) {
      L('=== Pokémon-Werte ===');
      var abilPool = []; for (var ab = 1; ab <= 76; ab++) if (BAN_ABILITY.indexOf(ab) === -1) abilPool.push(ab);
      var typePool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17];
      rom.species.map(function (_, i) { return i; }).filter(function (s) { return validSpecies(rom, s); }).forEach(function (s) {
        var e = base + s * 28, sp = rom.species[s], parts = [];
        if (o.stats !== 'keep' && sp.nat !== 292) {
          var st = sp.bs.slice(), ns;
          if (o.stats === 'shuffle') ns = rng.shuffle(st.slice());
          else {
            var total = st.reduce(function (a, b) { return a + b; }, 0), w = st.map(function () { return 0.4 + rng(); }), ws = w.reduce(function (a, b) { return a + b; }, 0);
            ns = w.map(function (x) { return Math.max(10, Math.min(250, Math.round(total * x / ws))); });
            var diff = total - ns.reduce(function (a, b) { return a + b; }, 0), guard = 0;
            while (diff !== 0 && guard++ < 2000) { var ix = rng.int(6), step = diff > 0 ? 1 : -1; if (ns[ix] + step >= 10 && ns[ix] + step <= 250) { ns[ix] += step; diff -= step; } }
          }
          for (var i = 0; i < 6; i++) u8[e + i] = ns[i];
          parts.push('Werte ' + st.join('/') + ' → ' + ns.join('/'));
        }
        if (o.types !== 'keep') {
          var t0 = sp.types, mono = t0[0] === t0[1], a = rng.pick(typePool), b = mono ? a : rng.pick(typePool);
          if (!mono && a === b) b = typePool[(typePool.indexOf(a) + 1 + rng.int(typePool.length - 1)) % typePool.length];
          u8[e + 6] = a; u8[e + 7] = b;
          parts.push('Typ ' + TN[t0[0]] + (mono ? '' : '/' + TN[t0[1]]) + ' → ' + TN[a] + (mono ? '' : '/' + TN[b]));
        }
        if (o.abilities !== 'keep') {
          var a0 = sp.abilities, single = !a0[1] || a0[1] === a0[0], x = rng.pick(abilPool), y = 0;
          if (!single) { y = rng.pick(abilPool); if (y === x) y = abilPool[(abilPool.indexOf(x) + 1) % abilPool.length]; }
          u8[e + 22] = x; u8[e + 23] = y;
          parts.push('Fähigkeit-ID ' + a0[0] + (single ? '' : '/' + a0[1]) + ' → ' + x + (single ? '' : '/' + y));
        }
        if (parts.length) L(nameOf(rom, s) + ': ' + parts.join(', '));
      });
      L('');
    }

    // --- Level-Attacken ---
    if (o.moves === 'random') {
      L('=== Attacken (Level-Aufstieg) ===');
      var nMoves = rom.moves.length, damaging = [], byType = {}, all = [];
      for (var m = 1; m < nMoves; m++) {
        if (BAN_MOVE.indexOf(m) !== -1) continue;
        all.push(m);
        if (rom.moves[m].power > 0) { damaging.push(m); (byType[rom.moves[m].type] = byType[rom.moves[m].type] || []).push(m); }
      }
      var doneOff = {};
      for (var s = 1; s < nsp; s++) {
        var lp = rom.off.learn[s];
        if (!validSpecies(rom, s) || lp < 0 || doneOff[lp]) continue;
        doneOff[lp] = 1;
        var tp = [u8[base + s * 28 + 6], u8[base + s * 28 + 7]], used = [], line = [];
        for (var k = 0; k < 40; k++) {
          var w = u16(u8, lp + k * 2);
          if (w === 0xFFFF) break;
          var mv, tries = 0;
          do {
            var r = rng();
            if (r < 0.3 && byType[tp[rng.int(2)]]) mv = rng.pick(byType[tp[rng.int(2)]] || damaging);
            else if (k < 2 || r < 0.65) mv = rng.pick(damaging);
            else mv = rng.pick(all);
          } while (used.indexOf(mv) !== -1 && ++tries < 30);
          used.push(mv);
          w16(u8, lp + k * 2, (w & 0xFE00) | mv);
          if (ls[s][k]) ls[s][k][1] = mv;
          line.push('Lv' + (w >> 9) + ' ' + mName(mv));
        }
        L(nameOf(rom, s) + ': ' + line.join(', '));
      }
      L('');
    }

    // --- Entwicklungen ---
    if (o.evo !== 'keep') {
      var evoOff = findEvo(u8);
      if (evoOff < 0) L('Entwicklungen: Tabelle nicht gefunden, übersprungen.');
      else {
        L('=== Entwicklungen ===');
        var pre = {}, order = rng.shuffle(pool.slice()), cnt = 0;
        order.forEach(function (s) {
          for (var k = 0; k < 5; k++) {
            var eo = evoOff + s * 40 + k * 8, method = u16(u8, eo), target = u16(u8, eo + 4);
            if (!method || !target || method === 14 || !validSpecies(rom, target)) continue;
            var cands = pool.filter(function (t) {
              if (t === s || pre[t]) return false;
              for (var x = s; x; x = pre[x]) if (x === t) return false;
              return true;
            });
            if (o.evo === 'similar') {
              var tb = bst0[target], near = cands.filter(function (t) { return Math.abs(bst0[t] - tb) <= Math.max(40, tb * 0.15); });
              if (near.length >= 3) cands = near;
            }
            if (!cands.length) continue;
            var nt = rng.pick(cands);
            pre[nt] = s;
            w16(u8, eo + 4, nt); cnt++;
            L(nameOf(rom, s) + ' → ' + nameOf(rom, nt) + ' (statt ' + nameOf(rom, target) + ')');
          }
        });
        summary.evo = cnt; L('');
      }
    }

    // --- Starter ---
    if (o.starters !== 'keep') {
      var so = findStarters(rom, u8);
      if (so < 0) L('Starter: Tabelle nicht gefunden, übersprungen.\n');
      else {
        L('=== Starter ===');
        var picks = [];
        for (var q = 0; q < 3; q++) {
          var old = u16(u8, so + q * 2), nw;
          if (o.starters === 'custom' && validSpecies(rom, o.starterPick[q])) nw = o.starterPick[q];
          else nw = pick(old, false, picks);
          picks.push(nw); w16(u8, so + q * 2, nw);
          L(nameOf(rom, old) + ' → ' + nameOf(rom, nw));
        }
        L('');
      }
    }

    // --- Wilde Pokémon ---
    if (o.wild !== 'keep') {
      var wi = findWild(rom, u8);
      if (!wi.arrays.length) L('Wilde Pokémon: Tabelle nicht gefunden, übersprungen.\n');
      else {
        L('=== Wilde Pokémon (' + wi.arrays.length + ' Gebiete) ===');
        var map = {}, nWild = 0;
        wi.arrays.forEach(function (a) {
          var line = [];
          for (var i = 0; i < a.n; i++) {
            var eo = a.off + i * 4 + 2, old = u16(u8, eo), nw;
            if (o.wildGlobal) { if (!map[old]) map[old] = pick(old, o.wild === 'similar'); nw = map[old]; }
            else nw = pick(old, o.wild === 'similar');
            w16(u8, eo, nw); nWild++;
            line.push(nameOf(rom, nw) + ' Lv' + u8[a.off + i * 4] + (u8[a.off + i * 4] !== u8[a.off + i * 4 + 1] ? '-' + u8[a.off + i * 4 + 1] : ''));
          }
          L('Karte ' + a.map + ' (' + a.kind + '): ' + line.join(', '));
        });
        summary.wild = nWild; L('');
      }
    }

    // --- Trainer ---
    if (o.trainers !== 'keep' || +o.trainerLevel) {
      L('=== Trainer ===');
      var pct = +o.trainerLevel || 0, nTr = 0;
      rom.trainers.forEach(function (tr) {
        if (tr.partyOff < 0 || !tr.party.length) return;
        var flags = u8[tr.off], hasItem = !!(flags & 2), custom = !!(flags & 1), line = [];
        tr.party.forEach(function (pm, j) {
          var mo = tr.partyOff + j * tr.partySize, sp = pm.species, lv = pm.level;
          if (o.trainers !== 'keep') { sp = pick(pm.species, o.trainers === 'similar'); w16(u8, mo + 4, sp); }
          if (pct) { lv = Math.max(1, Math.min(100, Math.round(pm.level * (1 + pct / 100)))); u8[mo + 2] = lv; }
          if (custom && o.trainers !== 'keep') {
            var mv = G.defaultMoves({ learnsets: ls }, sp, lv);
            if (!mv.length && ls[sp] && ls[sp][0]) mv = [ls[sp][0][1]];
            var mOff = mo + (hasItem ? 8 : 6);
            for (var k = 0; k < 4; k++) w16(u8, mOff + k * 2, mv[k] || 0);
          }
          line.push(nameOf(rom, sp) + ' Lv' + lv);
        });
        nTr++;
        L(((rom.classNames && rom.classNames[tr.cls]) || 'Trainer') + ' ' + tr.name + ': ' + line.join(', '));
      });
      summary.trainers = nTr; L('');
    }

    // Prüfsumme des GBA-Kopfes (0xBD) bleibt gültig: der Kopf wurde nicht verändert.
    return { data: u8, log: log.join('\n'), seed: seed, summary: summary };
  }

  window.CCRand3 = { DEFAULTS: DEFAULTS, scan: scan, run: run, makeRng: makeRng, findWild: findWild, findStarters: findStarters, findEvo: findEvo, validSpecies: validSpecies, makePool: makePool };
})();
