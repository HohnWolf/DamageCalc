// Randomizer für Pokémon der 1. und 2. Generation (Rot, Blau, Gelb, Gold, Silber, Kristall): verändert eine Kopie der ROM-Bytes.
// Offsets und Formate folgen dem Universal Pokémon Randomizer ZX (Gen1RomHandler, Gen2RomHandler, gen1/gen2_offsets.ini; GPL-3.0).
// Alle Änderungen behalten die Größe; erkannt werden die Original-ROMs (alle Sprachen, die in der Offset-Liste stehen).
(function () {
  'use strict';
  var C = window.CCRandCore, GB = window.PKGB;
  var TN = ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', '???', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht'];
  var T1 = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 7: 6, 8: 7, 20: 10, 21: 11, 22: 12, 23: 13, 24: 14, 25: 15, 26: 16 };
  var T2 = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 7: 6, 8: 7, 9: 8, 19: 9, 20: 10, 21: 11, 22: 12, 23: 13, 24: 14, 25: 15, 26: 16, 27: 17 };
  function inv(m) { var o = {}; Object.keys(m).forEach(function (k) { o[m[k]] = +k; }); return o; }
  var T1i = inv(T1), T2i = inv(T2);
  var LEGEND = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251];

  function ascii(b, o, n) { var s = ''; for (var i = 0; i < n; i++) s += String.fromCharCode(b[o + i]); return s; }
  function rw(b, o) { return b[o] | (b[o + 1] << 8); }
  function bankOf(off) { return Math.floor(off / 0x4000); }
  function calc(bank, ptr) { return ptr < 0x4000 ? ptr : (ptr % 0x4000) + bank * 0x4000; }

  function parseRom(u8) {
    if (u8.length < 0x100000 || u8.length > 0x400000) throw new Error('gb:size');
    var gbc = u8[0x143] === 0x80 || u8[0x143] === 0xC0, ver = u8[0x14C], nonjap = u8[0x14A], crc = (u8[0x14E] << 8) | u8[0x14F], R = window.GBROMS, hit = null, i;
    if (!R) throw new Error('gb:nodata');
    if (gbc) {
      var code = ascii(u8, 0x13F, 4);
      for (i = 0; i < R.g2.length && !hit; i++) { var e = R.g2[i]; if (e.Game === code && e.Version === ver && e.NonJapanese === nonjap && e.CRCInHeader === crc) hit = e; }
      for (i = 0; i < R.g2.length && !hit; i++) { var e2 = R.g2[i]; if (e2.Game === code && e2.Version === ver && e2.NonJapanese === nonjap && e2.CRCInHeader === undefined) hit = e2; }
      if (!hit) throw new Error('gb:rom:' + code);
      return { gen: 2, entry: hit, code: code, title: ascii(u8, 0x134, 11), game: hit.name, gameEn: hit.name, crystal: /Crystal/.test(hit.name) };
    }
    var title = ascii(u8, 0x134, 16);
    for (i = 0; i < R.g1.length && !hit; i++) { var f = R.g1[i]; if (title.indexOf(f.Game) === 0 && f.Version === ver && f.NonJapanese === nonjap && f.CRCInHeader === crc) hit = f; }
    for (i = 0; i < R.g1.length && !hit; i++) { var f2 = R.g1[i]; if (title.indexOf(f2.Game) === 0 && f2.Version === ver && f2.NonJapanese === nonjap && f2.CRCInHeader === undefined) hit = f2; }
    if (!hit) throw new Error('gb:rom:' + title);
    return { gen: 1, entry: hit, code: title.replace(/\0+$/, ''), title: title, game: hit.name, gameEn: hit.name, yellow: hit.Type === 'Y' || /Yellow|YEL/.test(hit.name) };
  }

  // Zeiger-Liste der Pokémon-Daten (Entwicklungen + Level-Attacken) je Art
  function readSets(u8, rom, internalOf) {
    var e = rom.entry, tbl = e.PokemonMovesetsTableOffset, count = rom.gen === 1 ? e.InternalPokemonCount : 251, out = {}, i;
    for (i = 1; i <= count; i++) {
      var nat = internalOf(i); if (!nat) continue;
      var p = calc(bankOf(tbl), rw(u8, tbl + (i - 1) * 2)), evos = [], learn = [];
      while (u8[p]) {
        var method = u8[p], stone = rom.gen === 1 ? method === 2 : method === 5, len = stone ? 4 : 3;
        evos.push({ off: p + 2 + (stone ? 1 : 0), method: method, long4: stone });
        p += len;
      }
      p++;
      while (u8[p]) { learn.push({ off: p }); p += 2; }
      out[nat] = { evos: evos, learn: learn };
    }
    return out;
  }

  function scan(rom, u8) {
    var m = buildModel(rom, u8);
    return { wildMaps: m.wildAreas, wildSlots: m.wild.length, trainers: m.trainers.length, evo: m.evos.length > 0, starters: m.starters.length > 0, learnsets: Object.keys(m.learnsets).length };
  }

  function buildModel(rom, u8) {
    var e = rom.entry, g1 = rom.gen === 1, TM = g1 ? T1 : T2, TI = g1 ? T1i : T2i, max = g1 ? 151 : 251, rec = g1 ? 28 : 32;
    var T0 = window.PKTEXT, TX = T0 ? T0[(window.CC && window.CC.LANG === 'en') ? 'en' : 'de'] : null;
    var internal = function (nat) { return g1 ? (GB.toInt[nat] || 0) : nat; }, natOf = function (id) { return g1 ? (GB.toNat[id] || 0) : id; };
    var statOff = function (nat) { return g1 && nat === 151 && !rom.yellow ? e.MewStatsOffset : e.PokemonStatsOffset + (nat - 1) * rec; };
    var species = [], i;
    for (i = 1; i <= max; i++) {
      var o = statOff(i);
      if (g1) species[i] = { bs: [u8[o + 1], u8[o + 2], u8[o + 3], u8[o + 4], u8[o + 5], u8[o + 5]], types: [TM[u8[o + 6]] || 0, TM[u8[o + 7]] || 0] };
      else species[i] = { bs: [u8[o + 1], u8[o + 2], u8[o + 3], u8[o + 4], u8[o + 5], u8[o + 6]], types: [TM[u8[o + 7]] || 0, TM[u8[o + 8]] || 0] };
    }
    var sets = readSets(u8, rom, natOf), learnsets = {}, startMoves = {};
    Object.keys(sets).forEach(function (k) {
      var nat = +k, list = [];
      if (g1) { // Startattacken stehen in den Basiswerten (Bytes 15–18)
        var so = statOff(nat), cnt = 0;
        for (var q = 0; q < 4; q++) if (u8[so + 15 + q]) { list.push([1, u8[so + 15 + q]]); cnt++; }
        startMoves[nat] = cnt;
      }
      sets[k].learn.forEach(function (l) { list.push([u8[l.off], u8[l.off + 1]]); });
      learnsets[nat] = list;
    });
    var moves = [], mo = e.MoveDataOffset, msz = g1 ? 6 : 7, mc = g1 ? e.MoveCount : 251;
    for (i = 1; i <= mc; i++) {
      var mq = mo + (i - 1) * msz;
      if (u8[mq + 2] !== undefined) moves[i] = { power: u8[mq + 2], type: TM[u8[mq + 3]] || 0, acc: Math.round(u8[mq + 4] * 100 / 255), pp: u8[mq + 5] };
    }
    var model = {
      title: rom.gameEn + ' (' + rom.code + ')', maxNat: max, species: species, typeNames: TN, typePool: g1 ? [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17],
      specialShared: g1, legends: LEGEND, noStatsFor: [], learnsets: learnsets, moves: moves, maxMove: mc, bannedMoves: [165], moveNames: TX ? TX.moves : [],
      wild: [], trainers: [], evos: [], starters: [], wildAreas: 0
    };
    // Attacken-Daten: 6 Byte (Gen 1) bzw. 7 Byte (Gen 2) je Attacke: Animation, Wirkung, Stärke, Typ, Genauigkeit (0–255), AP; die Art hängt am Typ
    model.setMove = function (m, ch) {
      var q = mo + (m - 1) * msz;
      if (ch.power !== undefined) u8[q + 2] = Math.min(255, ch.power);
      if (ch.type !== undefined && TI[ch.type] !== undefined) u8[q + 3] = TI[ch.type];
      if (ch.acc !== undefined) u8[q + 4] = Math.min(255, Math.round(ch.acc * 255 / 100));
      if (ch.pp !== undefined) u8[q + 5] = ch.pp;
    };
    // EP-Kurve: Byte 19 (Gen 1) bzw. 22 (Gen 2); "unregelmäßig/schwankend" gibt es dort nicht
    model.catchRate = { get: function (n) { return u8[statOff(n) + (g1 ? 8 : 9)]; }, set: function (n, v) { u8[statOff(n) + (g1 ? 8 : 9)] = v; } };
    model.setGrowth = function (n, v) { if (v === 1 || v === 2) return; u8[statOff(n) + (g1 ? 19 : 22)] = v; };
    model.commitSpecies = function () {
      for (var n = 1; n <= max; n++) {
        var sp = species[n], o2 = statOff(n);
        if (g1) { u8[o2 + 1] = sp.bs[0]; u8[o2 + 2] = sp.bs[1]; u8[o2 + 3] = sp.bs[2]; u8[o2 + 4] = sp.bs[3]; u8[o2 + 5] = sp.bs[4]; u8[o2 + 6] = TI[sp.types[0]]; u8[o2 + 7] = TI[sp.types[1]]; }
        else { for (var k = 0; k < 6; k++) u8[o2 + 1 + k] = sp.bs[k]; u8[o2 + 7] = TI[sp.types[0]]; u8[o2 + 8] = TI[sp.types[1]]; }
      }
    };
    model.setLearnset = function (nat, list) {
      var s = sets[nat], k = 0, so = statOff(nat);
      if (g1) { for (var q = 0; q < startMoves[nat]; q++) u8[so + 15 + q] = list[k++][1]; }
      s.learn.forEach(function (l) { if (list[k]) { u8[l.off + 1] = list[k][1]; k++; } });
    };
    model.evoInfo = g1 ? { level: 1, trade: 3, stone: 2, levelMethods: [1], items: { water: 24, sun: 0, moon: 0, leaf: 0, dawn: 0 } }
      : { level: 1, trade: 3, tradeItem: 99, stone: 2, levelMethods: [1], items: { water: 24, sun: 0, moon: 0, leaf: 0, dawn: 0 } };
    // Entwicklungen
    Object.keys(sets).forEach(function (k) {
      sets[k].evos.forEach(function (ev) {
        var tg = natOf(u8[ev.off]);
        if (!tg || !species[tg]) return;
        var long4 = ev.long4, pm = ev.off - 2 - (long4 ? 1 : 0), from = +k;
        model.evos.push({ from: from, get: function () { return natOf(u8[ev.off]); }, set: function (n) { u8[ev.off] = internal(n); },
          // Gen 2: Methode 3 mit Item (nicht 0xFF) = Tausch mit Item, wird hier als Methode 99 gemeldet
          method: function () { var m = u8[pm]; return !g1 && m === 3 && u8[pm + 1] !== 0xFF ? 99 : m; },
          setMethod: function (m) { u8[pm] = m; }, param: function () { return u8[pm + 1]; }, setParam: function (v) { u8[pm + 1] = v; } });
      });
    });
    function addWild(key, table, off, lvOff) { // off = Position der Art, lvOff = Position des Levels
      var nat = natOf(g1 ? u8[off] : u8[off]);
      if (!nat || !species[nat]) return;
      model.wild.push({ key: key, table: table, get: function () { return natOf(u8[off]); }, set: function (n) { u8[off] = internal(n); },
        scale: lvOff === undefined ? null : function (p) { u8[lvOff] = C.scaleLv(u8[lvOff], p); } });
    }
    var tp, tr, area;
    if (g1) {
      var tOff = e.WildPokemonTableOffset, tBank = bankOf(tOff), used = {}, mapId = -1;
      while (rw(u8, tOff) !== 0xFFFF && tOff < u8.length - 2) {
        mapId++;
        var off = calc(tBank, rw(u8, tOff));
        if (!used[off]) {
          used[off] = 1;
          for (var a = 0; a < 2; a++) {
            var rate = u8[off++];
            if (rate > 0) { for (var sl = 0; sl < 10; sl++) { addWild('Karte ' + mapId + (a ? ' (Surfen)' : ' (Gras/Höhle)'), 'm' + mapId + a, off + 1, off); off += 2; } model.wildAreas++; }
          }
        }
        tOff += 2;
      }
      var old = e.OldRodOffset; addWild('Alte Angel', 'oldrod', old + 1, old + 2); model.wildAreas++;
      var good = e.GoodRodOffset; for (i = 0; i < 2; i++) addWild('Profi-Angel', 'goodrod', good + i * 2 + 1, good + i * 2);
      var sr = e.SuperRodTableOffset;
      if (rom.yellow) { while (u8[sr] !== 0xFF && sr < u8.length - 9) { var mp = u8[sr++]; for (i = 0; i < 4; i++) { addWild('Super-Angel (Karte ' + mp + ')', 'sr' + mp, sr, sr + 1); sr += 2; } model.wildAreas++; } }
      else {
        var srBank = bankOf(sr), usedSR = {};
        while (u8[sr] !== 0xFF && sr < u8.length - 4) {
          var map2 = u8[sr++], so2 = calc(srBank, rw(u8, sr)); sr += 2;
          if (usedSR[so2]) continue; usedSR[so2] = 1;
          var cnt2 = u8[so2++];
          for (i = 0; i < cnt2; i++) { addWild('Super-Angel (Karte ' + map2 + ')', 'sr' + so2, so2 + 1, so2); so2 += 2; }
          model.wildAreas++;
        }
      }
      // Trainer
      var trOff = e.TrainerDataTableOffset, limits = e.TrainerDataClassCounts, idx = 0;
      for (var c = 1; c <= limits.length - 1; c++) {
        var p = calc(bankOf(trOff), rw(u8, trOff + (c - 1) * 2));
        for (var t = 0; t < limits[c]; t++) {
          idx++;
          var tm = { label: 'Trainer ' + idx + ' (Klasse ' + c + ')', mons: [] }, type = u8[p++];
          if (type === 0xFF) {
            while (u8[p]) (function (p) { tm.mons.push(gbMon(p + 1, p)); })(p), p += 2;
          } else {
            var lvPos = p - 1;
            while (u8[p]) (function (p, lvPos) { tm.mons.push(gbMon(p, lvPos, type)); })(p, lvPos), p++;
          }
          p++;
          if (tm.mons.length) model.trainers.push(tm);
        }
      }
      function gbMon(spOff, lvOff, lv0) {
        return { level: lv0 || u8[lvOff], get: function () { return natOf(u8[spOff]); }, set: function (n) { u8[spOff] = internal(n); }, setLevel: function (l) { u8[lvOff] = l; } };
      }
      var sc = rom.yellow ? 2 : 3;
      for (i = 1; i <= sc; i++) (function (offs) {
        model.starters.push({ get: function () { return natOf(u8[offs[0]]); }, set: function (n) { offs.forEach(function (x) { u8[x] = internal(n); }); } });
      })(e['StarterOffsets' + i]);
    } else {
      // Gen 2: Gras / Wasser (Johto, Kanto, Spezial)
      var wo = e.WildPokemonOffset, names = ['Johto', 'Kanto', 'Spezial'];
      for (var part = 0; part < 3; part++) {
        while (u8[wo] !== 0xFF && wo < u8.length - 50) {
          var bk = u8[wo], mn = u8[wo + 1], tk = names[part] + ' ' + bk + '-' + mn;
          for (var td = 0; td < 3; td++) for (var j = 0; j < 7; j++) addWild(tk + ' Gras (' + ['Morgen', 'Tag', 'Nacht'][td] + ')', tk + 'g', wo + 5 + td * 14 + j * 2 + 1, wo + 5 + td * 14 + j * 2);
          model.wildAreas++;
          wo += 47;
        }
        wo++;
        while (u8[wo] !== 0xFF && wo < u8.length - 10) {
          var tk2 = names[part] + ' ' + u8[wo] + '-' + u8[wo + 1];
          for (j = 0; j < 3; j++) addWild(tk2 + ' Surfen', tk2 + 's', wo + 3 + j * 2 + 1, wo + 3 + j * 2);
          model.wildAreas++;
          wo += 9;
        }
        wo++;
      }
      var fo = e.FishingWildsOffset;
      for (var fk = 0; fk < 12; fk++) for (j = 0; j < 11; j++) { var fp = fo + (fk * 11 + j) * 3; if (u8[fp + 1]) addWild('Angelgruppe ' + (fk + 1), 'f' + fk, fp + 1, fp + 2); }
      model.wildAreas += 12;
      var ho = e.HeadbuttWildsOffset;
      for (var hs = 0; hs < e.HeadbuttTableSize; hs++) {
        while (u8[ho] !== 0xFF && ho < u8.length - 3) { addWild('Kopfnuss-Bäume ' + (hs + 1), 'h' + hs, ho + 1, ho + 2); ho += 3; }
        ho++;
      }
      var bo = e.BCCWildsOffset;
      while (u8[bo] !== 0xFF && bo < u8.length - 4) { addWild('Insektenturnier', 'bcc', bo + 1, bo + 2); bo += 4; }
      model.wildAreas += 2;
      // Trainer
      var tOff2 = e.TrainerDataTableOffset, amount = e.TrainerClassAmount, lim2 = e.TrainerDataClassCounts, idx2 = 0;
      for (var c2 = 0; c2 < amount; c2++) {
        var p2 = calc(bankOf(tOff2), rw(u8, tOff2 + c2 * 2));
        for (var t2 = 0; t2 < lim2[c2]; t2++) {
          idx2++;
          while (u8[p2] !== 0x50 && u8[p2] !== undefined) p2++;
          p2++;
          var dtype = u8[p2++], tm2 = { label: 'Trainer ' + idx2 + ' (Klasse ' + c2 + ')', mons: [] };
          while (u8[p2] !== 0xFF && p2 < u8.length - 3) {
            (function (p3) {
              var hasItem = !!(dtype & 2), hasMoves = !!(dtype & 1), mvOff = p3 + 2 + (hasItem ? 1 : 0);
              tm2.mons.push({
                level: u8[p3], get: function () { return u8[p3 + 1]; }, set: function (n) { u8[p3 + 1] = n; }, setLevel: function (l) { u8[p3] = l; },
                refresh: function (n, lv, ls) {
                  if (!hasMoves) return;
                  var mv = []; (ls || []).forEach(function (en) { if (en[0] <= lv && mv.indexOf(en[1]) === -1) mv.push(en[1]); });
                  mv = mv.slice(-4);
                  for (var k = 0; k < 4; k++) u8[mvOff + k] = mv[k] || 0;
                }
              });
            })(p2);
            p2 += 2 + ((dtype & 2) ? 1 : 0) + ((dtype & 1) ? 4 : 0);
          }
          p2++;
          if (tm2.mons.length) model.trainers.push(tm2);
        }
      }
      for (i = 1; i <= 3; i++) (function (offs) {
        model.starters.push({ get: function () { return u8[offs[0]]; }, set: function (n) { offs.forEach(function (x) { u8[x] = n; }); } });
      })(e['StarterOffsets' + i]);
    }
    // TMs/HMs: 50 TMs (je 1 Byte) + HMs (5 bzw. 7) ab TMMovesOffset; Kompatibilität in den Basiswerten (Gen 1 ab Byte 20, 7 Byte; Gen 2 ab Byte 24, 8 Byte)
    if (e.TMMovesOffset && e.TMMovesOffset + 57 <= u8.length) {
      var tmo = e.TMMovesOffset, nHm = g1 ? 5 : 7, tms = [], hms = [], q2;
      for (q2 = 0; q2 < 50; q2++) tms.push(u8[tmo + q2]);
      for (q2 = 0; q2 < nHm; q2++) hms.push(u8[tmo + 50 + q2]);
      var plaus = tms.concat(hms).every(function (m) { return m >= 1 && m <= mc; });
      if (plaus) {
        var cOff = g1 ? 20 : 24, nBytes = g1 ? 7 : 8, cp = [];
        for (i = 1; i <= max; i++) {
          var so3 = statOff(i), fl = [false];
          for (var b = 0; b < 50 + nHm; b++) fl.push(!!(u8[so3 + cOff + (b >> 3)] & (1 << (b & 7))));
          cp.push({ key: i, nat: i, types: species[i].types, flags: fl, off: so3 + cOff });
        }
        model.tm = {
          tms: tms, hms: hms, compat: cp, earlyHM: [],
          setTMs: function (list) { list.forEach(function (m, k) { u8[tmo + k] = m; }); },
          commit: function () {
            cp.forEach(function (c) {
              for (var j = 0; j < nBytes; j++) {
                var v = 0;
                for (var bit = 0; bit < 8; bit++) { var f = j * 8 + bit + 1; if (f < c.flags.length && c.flags[f]) v |= 1 << bit; }
                if (!g1 && rom.crystal && j === 7) v = (v & 1) | (u8[c.off + j] & 0x0E); // Crystal: Bits 1–3 sind Attacken-Lehrer
                u8[c.off + j] = v;
              }
            });
          }
        };
      }
    }
    // Statische Begegnungen und Geschenke (feste Offsets aus data/gb_roms.js): Art als Byte (Gen 1: interne Nummer), Level als Byte
    if (e.statics && e.statics.length) {
      model.statics = [];
      e.statics.forEach(function (st) {
        if (!st.s.length || !species[natOf(u8[st.s[0]])]) return;
        model.statics.push({
          isEgg: !st.l.length, level: st.l.length ? u8[st.l[0]] : 0,
          get: function () { return natOf(u8[st.s[0]]); },
          set: function (n) { st.s.forEach(function (o) { u8[o] = internal(n); }); },
          setLevel: function (l) { st.l.forEach(function (o) { u8[o] = l; }); }
        });
      });
    }
    // Ingame-Tausche: Gen 1 = verlangt, gegeben, Tauschpartner-Nr., Spitzname (Länge + 3 je Eintrag); Gen 2 = Nr., verlangt, gegeben, Spitzname, Werte, Item, ID, OT (auf gerade Länge)
    if (e.TradeTableOffset && e.TradeTableSize) {
      var tlen = g1 ? e.TradeNameLength + 3 : e.TradeNameLength + e.TradeOTLength + 9, unused = e.TradesUnused || [];
      if (!g1 && tlen % 2) tlen++;
      model.trades = [];
      for (var te = 0; te < e.TradeTableSize; te++) {
        if (unused.indexOf(te) !== -1) continue;
        (function (eo) {
          var ro = eo + (g1 ? 0 : 1), go = eo + (g1 ? 1 : 2);
          if (eo + tlen > u8.length || !species[natOf(u8[ro])] || !species[natOf(u8[go])]) return;
          model.trades.push({
            given: function () { return natOf(u8[go]); }, setGiven: function (n) { u8[go] = internal(n); },
            requested: function () { return natOf(u8[ro]); }, setRequested: function (n) { u8[ro] = internal(n); }
          });
        })(e.TradeTableOffset + te * tlen);
      }
    }
    model.commit = function () {
      // Globale Prüfsumme (Bytes 0x14E/0x14F) neu berechnen
      var sum = 0; for (var k = 0; k < u8.length; k++) if (k !== 0x14E && k !== 0x14F) sum = (sum + u8[k]) & 0xFFFF;
      u8[0x14E] = sum >> 8; u8[0x14F] = sum & 255;
      return u8;
    };
    return model;
  }

  function run(buf, rom0, opts) {
    var u8 = new Uint8Array(buf), rom = parseRom(u8);
    return C.run(buildModel(rom, u8), opts);
  }
  window.CCRandGB = { CAPS: { moves: true, tm: true, evoFix: true, extra: true, noTutor: true }, DEFAULTS: C.DEFAULTS, parseRom: parseRom, scan: scan, run: run, buildModel: buildModel };
})();
