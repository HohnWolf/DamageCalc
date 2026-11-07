// Randomizer für Pokémon der 4. Generation (Diamant, Perl, Platin, HeartGold, SoulSilver): verändert eine Kopie der ROM-Bytes.
// Dateiformate und Offsets folgen dem Universal Pokémon Randomizer ZX (Gen4RomHandler). Alle Änderungen haben dieselbe Größe wie das
// Original, die Archive werden also direkt in der ROM-Kopie beschrieben. Komprimierte Archive werden übersprungen und gemeldet.
(function () {
  'use strict';
  var R3 = window.CCRand3;
  var DEFAULTS = {
    seed: '', wild: 'random', wildGlobal: false, trainers: 'random', trainerLevel: 0, starters: 'keep', starterPick: [0, 0, 0],
    evo: 'keep', stats: 'keep', types: 'keep', abilities: 'keep', moves: 'keep', noLegend: false
  };
  var LEGEND_NAT = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493];
  var TN = ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', '???', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht'];
  var BAN_ABILITY = [25, 54]; // Wunderwache, Bummler
  var MAXNAT = 493;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >> 8) & 0xFF; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >> 8) & 0xFF; b[o + 2] = (v >> 16) & 0xFF; b[o + 3] = (v >>> 24) & 0xFF; }

  function validSpecies(rom, s) { return s >= 1 && s <= MAXNAT && !!rom.species[s]; }
  function bstOf(rom, s) { var b = rom.species[s].bs; return b[0] + b[1] + b[2] + b[3] + b[4] + b[5]; }
  function nameOf(rom, s) {
    var nd = window.NATDEX && window.NATDEX[s];
    return nd ? ((window.CC && window.CC.LANG === 'en') ? nd[1] : (nd[2] || nd[1])) : '#' + s;
  }
  function makePool(rom, noLegend) {
    var pool = [];
    for (var s = 1; s <= MAXNAT; s++) {
      if (!validSpecies(rom, s)) continue;
      if (noLegend && LEGEND_NAT.indexOf(s) !== -1) continue;
      pool.push(s);
    }
    return pool;
  }
  function makePicker(rom, pool, rng, bst0) {
    var sorted = pool.slice().sort(function (a, b) { return bst0[a] - bst0[b]; });
    return function (orig, similar, exclude) {
      var list = sorted;
      if (similar && bst0[orig]) {
        var t = bst0[orig], w = Math.max(30, t * 0.12);
        var near = sorted.filter(function (s) { return Math.abs(bst0[s] - t) <= w; });
        if (near.length < 6) near = sorted.slice().sort(function (a, b) { return Math.abs(bst0[a] - t) - Math.abs(bst0[b] - t); }).slice(0, 12);
        list = near;
      }
      if (exclude) { var f = list.filter(function (s) { return exclude.indexOf(s) === -1; }); if (f.length) list = f; }
      return rng.pick(list);
    };
  }
  function isMem(rom, arr) { return !!arr && arr.length > 0; }

  // ---------------- Wilde Pokémon: Liste aller Artenfelder je Spielart ----------------
  // Rückgabe: [{ file, off, size (2|4), map, kind }]
  function wildSlots(rom) {
    var files = rom.files.wild, out = [];
    if (!files) return out;
    function add(i, off, size, kind) { out.push({ file: files[i], off: off, size: size, map: i, kind: kind }); }
    var i, j, b;
    if (rom.type === 'HGSS') {
      for (i = 0; i < files.length; i++) {
        b = files[i];
        if (b.length < 196) continue;
        if (b[0]) for (j = 0; j < 36; j++) add(i, 20 + j * 2, 2, 'Gras');
        for (j = 0; j < 4; j++) add(i, 92 + j * 2, 2, 'Radio');
        for (j = 0; j < 5; j++) if (b[1]) add(i, 102 + j * 4, 2, 'Surfen');
        for (j = 0; j < 2; j++) if (b[2]) add(i, 122 + j * 4, 2, 'Felsbrecher');
        for (j = 0; j < 5; j++) if (b[3]) add(i, 130 + j * 4, 2, 'Alte Angel');
        for (j = 0; j < 5; j++) if (b[4]) add(i, 150 + j * 4, 2, 'Profi-Angel');
        for (j = 0; j < 5; j++) if (b[5]) add(i, 170 + j * 4, 2, 'Super-Angel');
        for (j = 0; j < 4; j++) add(i, 188 + j * 2, 2, 'Schwarm');
      }
    } else {
      for (i = 0; i < files.length; i++) {
        b = files[i];
        if (b.length < 424) continue;
        if (u32(b, 0)) {
          for (j = 0; j < 12; j++) add(i, 8 + j * 8, 4, 'Gras');
          for (j = 0; j < 20; j++) add(i, 100 + j * 4 + (j >= 10 ? 24 : 0), 4, 'Schwarm/Radar/GBA');
        }
        for (var k = 0; k < 5; k++) {
          if (!u32(b, 204 + k * 44) || k === 1) continue;
          for (j = 0; j < 5; j++) add(i, 204 + k * 44 + 8 + j * 8, 4, 'Wasser');
        }
      }
    }
    return out.filter(function (x) { var v = x.size === 2 ? u16(x.file, x.off) : u32(x.file, x.off); return v >= 1 && v <= MAXNAT; });
  }

  // ---------------- Entwicklungen ----------------
  function evoOk(rom) { return !!(rom.files.evo && rom.files.evo.length > MAXNAT); }

  function scan(rom, u8) {
    var w = rom.files.wild ? wildSlots(rom) : [];
    var maps = {}; w.forEach(function (x) { maps[x.map] = 1; });
    return { wildMaps: Object.keys(maps).length, wildSlots: w.length, trainers: rom.trainers.length, evo: evoOk(rom), starters: false,
      learnsets: rom.files.learn ? rom.files.learn.length : 0 };
  }

  function defaultMoves(ls, lv) {
    var m = [];
    (ls || []).forEach(function (e) { if (e[0] <= lv && m.indexOf(e[1]) === -1) m.push(e[1]); });
    return m.slice(-4);
  }

  function run(buf, rom0, userOpts) {
    var o = {}; Object.keys(DEFAULTS).forEach(function (k) { o[k] = userOpts && userOpts[k] !== undefined ? userOpts[k] : DEFAULTS[k]; });
    // Arbeitskopie: ROM neu einlesen, damit alle Archive in der Kopie liegen
    var u8 = new Uint8Array(buf);
    var rom = window.NDS.parseRom(u8);
    var seed = String(o.seed || '').trim() || String(Math.floor(Math.random() * 1e9));
    var rng = R3.makeRng(seed);
    var log = [], summary = {};
    function L(s) { log.push(s); }
    var pool = makePool(rom, o.noLegend), bst0 = [0];
    for (var s0 = 1; s0 <= MAXNAT; s0++) bst0.push(validSpecies(rom, s0) ? bstOf(rom, s0) : 0);
    var pick = makePicker(rom, pool, rng, bst0);
    var names = rom.names || {}, mvNames = names.moves || [], abNames = names.abilities || [];
    function mName(m) { return mvNames[m] || ('Attacke ' + m); }
    function aName(a) { return abNames[a] || ('Fähigkeit ' + a); }
    var ls = rom.learnsets.map(function (l) { return l ? l.map(function (e) { return e.slice(); }) : l; });
    L('Rattata Labs Randomizer – ' + (rom.gameEn || rom.title) + ' (' + rom.code + ')');
    L('Seed: ' + seed); L('');
    var F = rom.files;

    // --- Basiswerte, Typen, Fähigkeiten ---
    if ((o.stats !== 'keep' || o.types !== 'keep' || o.abilities !== 'keep') && F.personal) {
      L('=== Pokémon-Werte ===');
      var abilPool = []; for (var ab = 1; ab <= 123; ab++) if (BAN_ABILITY.indexOf(ab) === -1) abilPool.push(ab);
      var typePool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17];
      for (var s = 1; s <= MAXNAT; s++) {
        var sp = rom.species[s], d = F.personal[s];
        if (!sp || !d || d.length < 24) continue;
        var parts = [];
        if (o.stats !== 'keep' && s !== 292) {
          var st = sp.bs.slice(), ns;
          if (o.stats === 'shuffle') ns = rng.shuffle(st.slice());
          else {
            var total = st.reduce(function (a, b) { return a + b; }, 0), w = st.map(function () { return 0.4 + rng(); }), ws = w.reduce(function (a, b) { return a + b; }, 0);
            ns = w.map(function (x) { return Math.max(10, Math.min(250, Math.round(total * x / ws))); });
            var diff = total - ns.reduce(function (a, b) { return a + b; }, 0), guard = 0;
            while (diff !== 0 && guard++ < 2000) { var ix = rng.int(6), stp = diff > 0 ? 1 : -1; if (ns[ix] + stp >= 10 && ns[ix] + stp <= 250) { ns[ix] += stp; diff -= stp; } }
          }
          for (var i = 0; i < 6; i++) d[i] = ns[i];
          parts.push('Werte ' + st.join('/') + ' → ' + ns.join('/'));
        }
        if (o.types !== 'keep') {
          var t0 = sp.types, mono = t0[0] === t0[1], a = rng.pick(typePool), b = mono ? a : rng.pick(typePool);
          if (!mono && a === b) b = typePool[(typePool.indexOf(a) + 1 + rng.int(typePool.length - 1)) % typePool.length];
          d[6] = a; d[7] = b;
          parts.push('Typ ' + TN[t0[0]] + (mono ? '' : '/' + TN[t0[1]]) + ' → ' + TN[a] + (mono ? '' : '/' + TN[b]));
        }
        if (o.abilities !== 'keep') {
          var a0 = sp.abilities, single = !a0[1] || a0[1] === a0[0], x = rng.pick(abilPool), y = 0;
          if (!single) { y = rng.pick(abilPool); if (y === x) y = abilPool[(abilPool.indexOf(x) + 1) % abilPool.length]; }
          d[22] = x; d[23] = y;
          parts.push('Fähigkeit ' + aName(a0[0]) + (single ? '' : '/' + aName(a0[1])) + ' → ' + aName(x) + (single ? '' : '/' + aName(y)));
        }
        if (parts.length) L(nameOf(rom, s) + ': ' + parts.join(', '));
      }
      L('');
    }

    // --- Level-Attacken ---
    if (o.moves === 'random' && F.learn) {
      L('=== Attacken (Level-Aufstieg) ===');
      var damaging = [], byType = {}, all = [];
      for (var m = 1; m < rom.moves.length; m++) {
        if (!rom.moves[m] || m === 165) continue;
        all.push(m);
        if (rom.moves[m].power > 0) { damaging.push(m); (byType[rom.moves[m].type] = byType[rom.moves[m].type] || []).push(m); }
      }
      for (var s2 = 1; s2 <= MAXNAT; s2++) {
        var ld = F.learn[s2], sp2 = rom.species[s2];
        if (!ld || !sp2) continue;
        var tp = [F.personal[s2][6], F.personal[s2][7]], used = [], line = [];
        for (var k = 0; k * 2 + 1 < ld.length; k++) {
          var wv = u16(ld, k * 2);
          if (wv === 0xFFFF) break;
          var mv, tries = 0;
          do {
            var r = rng();
            if (r < 0.3 && byType[tp[rng.int(2)]]) mv = rng.pick(byType[tp[rng.int(2)]] || damaging);
            else if (k < 2 || r < 0.65) mv = rng.pick(damaging);
            else mv = rng.pick(all);
          } while (used.indexOf(mv) !== -1 && ++tries < 30);
          used.push(mv);
          w16(ld, k * 2, (wv & 0xFE00) | mv);
          if (ls[s2] && ls[s2][k]) ls[s2][k][1] = mv;
          line.push('Lv' + (wv >> 9) + ' ' + mName(mv));
        }
        L(nameOf(rom, s2) + ': ' + line.join(', '));
      }
      L('');
    }

    // --- Entwicklungen ---
    if (o.evo !== 'keep') {
      if (!evoOk(rom)) L('Entwicklungen: Archiv nicht gefunden oder komprimiert, übersprungen.\n');
      else {
        L('=== Entwicklungen ===');
        var pre = {}, cnt = 0;
        rng.shuffle(pool.slice()).forEach(function (sf) {
          var e = F.evo[sf];
          if (!e || e.length < 42) return;
          for (var k = 0; k < 7; k++) {
            var method = u16(e, k * 6), target = u16(e, k * 6 + 4);
            if (!method || !target || !validSpecies(rom, target)) continue;
            var cands = pool.filter(function (t) {
              if (t === sf || pre[t]) return false;
              for (var x = sf; x; x = pre[x]) if (x === t) return false;
              return true;
            });
            if (o.evo === 'similar') {
              var tb = bst0[target], near = cands.filter(function (t) { return Math.abs(bst0[t] - tb) <= Math.max(40, tb * 0.15); });
              if (near.length >= 3) cands = near;
            }
            if (!cands.length) continue;
            var nt = rng.pick(cands);
            pre[nt] = sf; w16(e, k * 6 + 4, nt); cnt++;
            L(nameOf(rom, sf) + ' → ' + nameOf(rom, nt) + ' (statt ' + nameOf(rom, target) + ')');
          }
        });
        summary.evo = cnt; L('');
      }
    }

    // --- Starter ---
    if (o.starters !== 'keep') L('Starter: für Generation 4 noch nicht unterstützt, übersprungen.\n');

    // --- Wilde Pokémon ---
    if (o.wild !== 'keep') {
      var slots = rom.files.wild ? wildSlots(rom) : [];
      if (!slots.length) L('Wilde Pokémon: Archiv nicht gefunden oder komprimiert, übersprungen.\n');
      else {
        L('=== Wilde Pokémon (' + slots.length + ' Plätze) ===');
        var map = {}, lastKey = null, line = [];
        slots.forEach(function (sl) {
          var old = sl.size === 2 ? u16(sl.file, sl.off) : u32(sl.file, sl.off), nw;
          if (o.wildGlobal) { if (!map[old]) map[old] = pick(old, o.wild === 'similar'); nw = map[old]; }
          else nw = pick(old, o.wild === 'similar');
          if (sl.size === 2) w16(sl.file, sl.off, nw); else w32(sl.file, sl.off, nw);
          var key = sl.map + ' ' + sl.kind;
          if (key !== lastKey) { if (line.length) L(line.join(', ')); line = ['Karte ' + sl.map + ' (' + sl.kind + '): ']; lastKey = key; line = [line[0] + nameOf(rom, nw)]; }
          else line.push(nameOf(rom, nw));
        });
        if (line.length) L(line.join(', '));
        summary.wild = slots.length; L('');
      }
    }

    // --- Trainer ---
    if (o.trainers !== 'keep' || +o.trainerLevel) {
      L('=== Trainer ===');
      var pct = +o.trainerLevel || 0, nTr = 0;
      rom.trainers.forEach(function (tr) {
        if (!tr.pk) return;
        var line = [];
        tr.party.forEach(function (pm, j) {
          var po = pm.idx * tr.rec, sp = pm.species, lv = pm.level;
          if (o.trainers !== 'keep') {
            sp = pick(pm.species, o.trainers === 'similar');
            w16(tr.pk, po + 4, sp);                       // Art (Bit 0–9), Form (Bit 10–15) = 0
            if (rom.type === 'HGSS') tr.pk[po + 1] &= 0xF0; // Geschlecht = Standard, Fähigkeit bleibt
          }
          if (pct) { lv = Math.max(1, Math.min(100, Math.round(pm.level * (1 + pct / 100)))); w16(tr.pk, po + 2, lv); }
          if (tr.custom && o.trainers !== 'keep') {
            var mv = defaultMoves(ls[sp], lv);
            if (!mv.length && ls[sp] && ls[sp][0]) mv = [ls[sp][0][1]];
            var mo = po + tr.head + (tr.hasItem ? 2 : 0);
            for (var k = 0; k < 4; k++) w16(tr.pk, mo + k * 2, mv[k] || 0);
          }
          line.push(nameOf(rom, sp) + ' Lv' + lv);
        });
        nTr++;
        L(((rom.classNames && rom.classNames[tr.cls]) || 'Trainer') + ' ' + tr.name + ': ' + line.join(', '));
      });
      summary.trainers = nTr; L('');
    }

    return { data: u8, log: log.join('\n'), seed: seed, summary: summary };
  }

  window.CCRandNds = { DEFAULTS: DEFAULTS, scan: scan, run: run, validSpecies: validSpecies, makePool: makePool, wildSlots: wildSlots };
})();
