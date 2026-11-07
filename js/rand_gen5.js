// Randomizer für Pokémon der 5. Generation (Schwarz, Weiß, Schwarz 2, Weiß 2): verändert eine Kopie der ROM-Bytes.
// Formate nach dem Universal Pokémon Randomizer ZX (Gen5RomHandler): Basiswerte a/0/1/6, Entwicklungen a/0/1/9, Attacken a/0/1/8,
// Trainer (BW: a/0/9/2+3, BW2: a/0/9/1+2), wilde Pokémon (BW: a/1/2/6, BW2: a/1/2/7; 4 Jahreszeiten à 232 Bytes). Alle Änderungen behalten die Größe.
(function () {
  'use strict';
  var C = window.CCRandCore;
  var LEGEND = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
    494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649];
  var TN = ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', '???', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht'];
  var AMOUNTS = [12, 12, 12, 5, 5, 5, 5], SEASON = 232;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >> 8) & 0xFF; }
  function unType(t) { return t <= 8 ? t : t - 1; } // Zahlen wie in Gen 4 (mit "???") → Gen-5-Datei

  // wilde Plätze: [{ file, off, map, type }]
  function wildSlots(rom) {
    var files = rom.files.wild, out = [];
    if (!files) return out;
    files.forEach(function (b, idx) {
      if (!b || b.length < SEASON) return;
      var seasons = b.length >= SEASON * 4 ? 4 : 1;
      for (var s = 0; s < seasons; s++) {
        var start = s * SEASON, off = start + 8;
        for (var t = 0; t < 7; t++) {
          if (b[start + t]) for (var j = 0; j < AMOUNTS[t]; j++) {
            var sp = u16(b, off + j * 4) & 0x7FF;
            if (sp >= 1 && sp <= 649) out.push({ file: b, off: off + j * 4, map: idx, type: t, season: s });
          }
          off += AMOUNTS[t] * 4;
        }
      }
    });
    return out;
  }
  var TYPE_NAMES = ['Gras/Höhle', 'Doppelkampf-Gras', 'Raschelndes Gras', 'Surfen', 'Surfen (selten)', 'Angeln', 'Angeln (selten)'], SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'];

  function scan(rom) {
    var w = wildSlots(rom), maps = {}; w.forEach(function (x) { maps[x.map] = 1; });
    return { wildMaps: Object.keys(maps).length, wildSlots: w.length, trainers: rom.trainers.length, evo: !!(rom.files.evo && rom.files.evo.length > 649), starters: false, learnsets: rom.files.learn ? rom.files.learn.length : 0 };
  }

  function buildModel(rom, u8) {
    var F = rom.files, names = rom.names || {};
    var typePool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17], abilityPool = [];
    for (var ab = 1; ab <= 164; ab++) if (ab !== 25 && ab !== 54) abilityPool.push(ab); // ohne Wunderwache, Bummler
    var species = [];
    for (var s = 1; s <= 649; s++) {
      var e = rom.species[s]; if (!e || !F.personal[s] || F.personal[s].length < 0x1B) continue;
      species[s] = { bs: e.bs.slice(), types: e.types.slice(), abilities: (e.abilities || [0, 0, 0]).slice(0, 3) };
    }
    var learnsets = {};
    for (s = 1; s <= 649; s++) if (rom.learnsets[s] && species[s]) learnsets[s] = rom.learnsets[s].map(function (x) { return x.slice(); });
    var model = {
      title: (rom.gameEn || rom.title) + ' (' + rom.code + ')', maxNat: 649, species: species, typeNames: TN, typePool: typePool, abilityPool: abilityPool,
      abilityNames: names.abilities || [], moveNames: names.moves || [], legends: LEGEND, noStatsFor: [292], learnsets: learnsets, moves: rom.moves, maxMove: 559, bannedMoves: [165],
      wild: [], trainers: [], evos: []
    };
    model.commitSpecies = function () {
      species.forEach(function (sp, n) {
        if (!sp) return;
        var d = F.personal[n];
        for (var i = 0; i < 6; i++) d[i] = sp.bs[i];
        d[6] = unType(sp.types[0]); d[7] = unType(sp.types[1]);
        for (var k = 0; k < 3; k++) d[0x18 + k] = sp.abilities[k] || 0;
      });
    };
    model.setLearnset = function (n, list) {
      var d = F.learn[n];
      for (var k = 0; k < list.length && k * 4 + 3 < d.length; k++) { w16(d, k * 4, list[k][1]); w16(d, k * 4 + 2, list[k][0]); }
    };
    // wild
    wildSlots(rom).forEach(function (x) {
      model.wild.push({
        key: 'Karte ' + x.map + (x.season || x.file.length >= SEASON * 4 ? ' ' + SEASONS[x.season] : '') + ' (' + TYPE_NAMES[x.type] + ')',
        get: function () { return u16(x.file, x.off) & 0x7FF; },
        set: function (n) { w16(x.file, x.off, n); } // Form = 0
      });
    });
    // Trainer
    rom.trainers.forEach(function (tr) {
      var tm = { label: ((rom.classNames && rom.classNames[tr.cls]) || 'Trainer') + ' ' + tr.name, mons: [] };
      tr.party.forEach(function (pm) {
        var po = pm.idx * tr.rec;
        tm.mons.push({
          level: pm.level,
          get: function () { return pm.species; },
          set: function (n) { pm.species = n; w16(tr.pk, po + 4, n); w16(tr.pk, po + 6, 0); tr.pk[po + 1] &= 0x0F; },
          setLevel: function (l) { tr.pk[po + 2] = l; w16(tr.pk, po + 2, l); },
          refresh: function (n, lv, ls) {
            if (!tr.custom) return;
            var mv = []; (ls || []).forEach(function (en) { if (en[0] <= lv && mv.indexOf(en[1]) === -1) mv.push(en[1]); });
            mv = mv.slice(-4);
            if (!mv.length && ls && ls[0]) mv = [ls[0][1]];
            var mo = po + tr.head + (tr.hasItem ? 2 : 0);
            for (var k = 0; k < 4; k++) w16(tr.pk, mo + k * 2, mv[k] || 0);
          }
        });
      });
      model.trainers.push(tm);
    });
    // Entwicklungen
    if (F.evo && F.evo.length > 649) {
      for (s = 1; s <= 649; s++) {
        var ev = F.evo[s];
        if (!ev || ev.length < 42 || !species[s]) continue;
        for (var k = 0; k < 7; k++) (function (ev, k, s) {
          var method = u16(ev, k * 6), target = u16(ev, k * 6 + 4);
          if (!method || !target || !species[target]) return;
          model.evos.push({ from: s, get: function () { return u16(ev, k * 6 + 4); }, set: function (n) { w16(ev, k * 6 + 4, n); } });
        })(ev, k, s);
      }
    }
    model.commit = function () { return u8; };
    return model;
  }

  function run(buf, rom0, opts) {
    var u8 = new Uint8Array(buf), rom = window.NDS.parseRom(u8);
    return C.run(buildModel(rom, u8), opts);
  }
  window.CCRandGen5 = { DEFAULTS: C.DEFAULTS, scan: scan, run: run, buildModel: buildModel, makePool: function (rom, noLegend) {
    var p = []; for (var s = 1; s <= 649; s++) if (rom.species[s] && (!noLegend || LEGEND.indexOf(s) === -1)) p.push(s); return p;
  } };
})();
