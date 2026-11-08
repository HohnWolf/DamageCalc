// Randomizer für Pokémon der 6. und 7. Generation (X/Y, Omega Rubin/Alpha Saphir, Sonne/Mond, Ultra Sonne/Ultra Mond), entschlüsselte .cxi / .3ds.
// Dateiformate nach dem Universal Pokémon Randomizer ZX (Gen6RomHandler, Gen7RomHandler). Die ROM wird nie komplett geladen: es werden nur die nötigen
// Archive (GARC) gelesen und geändert; die neue Datei entsteht als Blob aus den Original-Abschnitten plus Änderungen (mit neu berechnetem RomFS-Hashbaum).
(function () {
  'use strict';
  var C = window.CCRandCore, CTR = window.CTR;
  var u16 = CTR.u16, u32 = CTR.u32;
  function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }

  var TN = ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht', 'Fee'];
  var LEGEND = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
    494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 716, 717, 718, 719, 720, 721, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807];
  // Spiele: Produktcode (ohne Regionsbuchstabe) → Daten (Pfade im RomFS)
  var GAMES = {
    'CTR-P-EKJ': { gen: 6, type: 'xy', name: 'X', nameEn: 'X', max: 721, maxMove: 617, maxAbility: 191, stats: 'a/2/1/8', learn: 'a/2/1/4', evo: 'a/2/1/5', move: 'a/2/1/2', wild: 'a/0/1/2', trd: 'a/0/3/8', trp: 'a/0/4/0' },
    'CTR-P-EK2': { gen: 6, type: 'xy', name: 'Y', nameEn: 'Y', max: 721, maxMove: 617, maxAbility: 191, stats: 'a/2/1/8', learn: 'a/2/1/4', evo: 'a/2/1/5', move: 'a/2/1/2', wild: 'a/0/1/2', trd: 'a/0/3/8', trp: 'a/0/4/0' },
    'CTR-P-ECR': { gen: 6, type: 'oras', name: 'Omega Rubin', nameEn: 'Omega Ruby', max: 721, maxMove: 621, maxAbility: 191, stats: 'a/1/9/5', learn: 'a/1/9/1', evo: 'a/1/9/2', move: 'a/1/8/9', wild: 'a/0/1/3', trd: 'a/0/3/6', trp: 'a/0/3/8' },
    'CTR-P-ECL': { gen: 6, type: 'oras', name: 'Alpha Saphir', nameEn: 'Alpha Sapphire', max: 721, maxMove: 621, maxAbility: 191, stats: 'a/1/9/5', learn: 'a/1/9/1', evo: 'a/1/9/2', move: 'a/1/8/9', wild: 'a/0/1/3', trd: 'a/0/3/6', trp: 'a/0/3/8' },
    'CTR-P-BND': { stat: 'a/1/5/5', skipStatics: [1, 4, 9, 14, 19, 24, 33, 39, 45].concat([8, 13, 17, 18, 23, 31, 32, 37, 38, 43, 44, 48, 49]), gen: 7, type: 'sm', name: 'Sonne', nameEn: 'Sun', max: 802, maxMove: 719, maxAbility: 233, stats: 'a/0/1/7', learn: 'a/0/1/3', evo: 'a/0/1/4', move: 'a/0/1/1', wild: 'a/0/8/2', trd: 'a/1/0/5', trp: 'a/1/0/6' },
    'CTR-P-BNE': { stat: 'a/1/5/5', skipStatics: [1, 4, 9, 14, 19, 24, 33, 39, 45].concat([8, 13, 17, 18, 23, 31, 32, 37, 38, 43, 44, 48, 49]), gen: 7, type: 'sm', name: 'Mond', nameEn: 'Moon', max: 802, maxMove: 719, maxAbility: 233, stats: 'a/0/1/7', learn: 'a/0/1/3', evo: 'a/0/1/4', move: 'a/0/1/1', wild: 'a/0/8/3', trd: 'a/1/0/5', trp: 'a/1/0/6' },
    'CTR-P-A2A': { stat: 'a/1/5/9', skipStatics: [1, 4, 9, 14, 19, 24, 33, 39, 45, 137, 146, 158, 159, 160, 162, 229, 231, 249].concat([8, 13, 17, 18, 23, 31, 32, 37, 38, 43, 44, 48, 49, 140, 141, 147, 148, 163, 164, 230, 232, 250]), gen: 7, type: 'usum', name: 'Ultra Sonne', nameEn: 'Ultra Sun', max: 807, maxMove: 728, maxAbility: 233, stats: 'a/0/1/7', learn: 'a/0/1/3', evo: 'a/0/1/4', move: 'a/0/1/1', wild: 'a/0/8/2', trd: 'a/1/0/6', trp: 'a/1/0/7' },
    'CTR-P-A2B': { stat: 'a/1/5/9', skipStatics: [1, 4, 9, 14, 19, 24, 33, 39, 45, 137, 146, 158, 159, 160, 162, 229, 231, 249].concat([8, 13, 17, 18, 23, 31, 32, 37, 38, 43, 44, 48, 49, 140, 141, 147, 148, 163, 164, 230, 232, 250]), gen: 7, type: 'usum', name: 'Ultra Mond', nameEn: 'Ultra Moon', max: 807, maxMove: 728, maxAbility: 233, stats: 'a/0/1/7', learn: 'a/0/1/3', evo: 'a/0/1/4', move: 'a/0/1/1', wild: 'a/0/8/3', trd: 'a/1/0/6', trp: 'a/1/0/7' }
  };
  // Plätze für wilde Pokémon: [Anfang, Anzahl, Name] (je 4 Byte: Art+Form, Mindest-, Höchstlevel)
  var XY_SLOTS = [[0, 12, 'Gras'], [48, 12, 'Gelbe Blumen'], [96, 12, 'Violette Blumen'], [144, 12, 'Rote Blumen'], [192, 12, 'Hohes Gras'], [240, 5, 'Surfen'], [260, 5, 'Felsbrecher'],
    [280, 3, 'Alte Angel'], [292, 3, 'Profi-Angel'], [304, 3, 'Super-Angel'], [316, 5, 'Horde häufig'], [336, 5, 'Horde selten'], [356, 5, 'Horde sehr selten']];
  var ORAS_SLOTS = [[0, 12, 'Gras'], [48, 12, 'Hohes Gras'], [96, 3, 'DexNav'], [108, 5, 'Surfen'], [128, 5, 'Felsbrecher'], [148, 3, 'Alte Angel'], [160, 3, 'Profi-Angel'], [172, 3, 'Super-Angel'],
    [184, 5, 'Horde häufig'], [204, 5, 'Horde selten'], [224, 5, 'Horde sehr selten']];

  // ---------- Quelle ----------
  function fileSource(file) {
    return {
      size: file.size,
      read: async function (o, l) { return new Uint8Array(await file.slice(o, o + l).arrayBuffer()); },
      slice: function (a, b) { return file.slice(a, b); }
    };
  }

  async function open(source) {
    var info = await CTR.openNcch(source), code = info.product.slice(0, 9), g = GAMES[code];
    if (!g) throw new Error('ctr:game:' + info.product);
    return { info: info, source: source, g: g, code: info.product };
  }

  // ---------- Aufbau des Modells ----------
  async function loadGarc(ctx, path, whole) {
    var f = CTR.findFile(ctx.info, path); if (!f) return null;
    if (whole) {
      var data = await ctx.source.read(f.off, f.size), g = CTR.parseGarc(data);
      if (g) { g.fileOff = f.off; g.whole = true; }
      return g;
    }
    var g2 = await CTR.openGarc(ctx.source, f.off); if (g2) g2.fileOff = f.off; return g2;
  }
  function entry(g, i) { return CTR.garcFile(g, i, 0); }

  async function scan(ctx) {
    var m = await buildModel(ctx, true);
    return m.scanInfo;
  }

  async function buildModel(ctx, scanOnly) {
    var g = ctx.g, max = g.max, patches = [];
    var stats = await loadGarc(ctx, g.stats, true), learn = await loadGarc(ctx, g.learn, true), evo = await loadGarc(ctx, g.evo, true);
    var trd = await loadGarc(ctx, g.trd, true), trp = await loadGarc(ctx, g.trp, true), moveG = await loadGarc(ctx, g.move, true);
    if (!stats || !learn) throw new Error('ctr:data');
    var T0 = window.PKTEXT, lang = (window.CC && window.CC.LANG === 'en') ? 'en' : 'de', TX = T0 ? T0[lang] : null;
    var abilityPool = []; for (var ab = 1; ab <= g.maxAbility; ab++) if (ab !== 25 && ab !== 54) abilityPool.push(ab);
    var species = [], learnsets = {}, s;
    for (s = 1; s <= max; s++) {
      var d = entry(stats, s); if (!d || d.length < 28) continue;
      species[s] = { bs: [d[0], d[1], d[2], d[3], d[4], d[5]], types: [d[6], d[7]], abilities: [d[24], d[25], d[26]] };
      var ld = entry(learn, s), list = [];
      if (ld) for (var q = 0; q + 3 < ld.length; q += 4) { if (u16(ld, q) === 0xFFFF && u16(ld, q + 2) === 0xFFFF) break; list.push([u16(ld, q + 2), u16(ld, q)]); }
      learnsets[s] = list;
    }
    // Attacken-Daten (Stärke, Typ)
    var moves = [], moveBuf = [], moveDirty = false;
    try {
      var mini = g.type === 'oras' ? CTR.unpackMini(entry(moveG, 0), 'WD') : null;
      for (var mv = 1; mv <= g.maxMove; mv++) {
        var md = mini ? mini[mv] : entry(moveG, mv);
        if (md && md.length > 6) { moves[mv] = { power: md[3], type: md[0], acc: md[4], pp: md[5], cat: md[2] === 1 ? 0 : md[2] === 2 ? 1 : 2 }; moveBuf[mv] = md; }
      }
    } catch (e) { moves = null; }
    var model = {
      title: ctx.g.nameEn + ' (' + ctx.code + ')', maxNat: max, species: species, typeNames: TN, typePool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], abilityPool: abilityPool,
      abilityNames: TX ? TX.abilities : [], moveNames: TX ? TX.moves : [], legends: LEGEND, noStatsFor: [292], learnsets: learnsets, moves: moves && moves.length ? moves : null, maxMove: g.maxMove, bannedMoves: [165],
      wild: [], trainers: [], evos: [], memoWild: true
    };
    // Attacken-Daten: Typ 0, Art 2 (1 = physisch, 2 = speziell), Stärke 3, Genauigkeit 4, AP 5
    model.setMove = function (m, ch) {
      var d = moveBuf[m]; if (!d) return;
      if (ch.type !== undefined) d[0] = ch.type;
      if (ch.cat !== undefined) d[2] = ch.cat === 0 ? 1 : 2;
      if (ch.power !== undefined) d[3] = Math.min(255, ch.power);
      if (ch.acc !== undefined) d[4] = ch.acc;
      if (ch.pp !== undefined) d[5] = ch.pp;
      moveDirty = true;
    };
    model.setGrowth = function (n, v) { var d = entry(stats, n); if (d && d.length > 21) d[21] = v; };
    model.catchRate = { get: function (n) { return entry(stats, n)[8]; }, set: function (n, v) { entry(stats, n)[8] = v; } };
    model.evoInfo = { level: 4, stone: 8, trade: 5, tradeItem: 6, tradeSpecial: 7, friendDay: 2, friendNight: 3, beauty: 16, electrified: 25, moss: 26, icy: 27, withMove: 21, withOther: 22, itemDay: 19, itemNight: 20,
      levelMethods: [4, 9, 10, 11, 12, 13, 14, 15, 23, 24, 28, 30, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41], items: { water: 84, sun: 80, moon: 81, leaf: 85, dawn: 109 } };
    model.commitSpecies = function () {
      species.forEach(function (sp, n) {
        if (!sp) return;
        var d = entry(stats, n);
        for (var i = 0; i < 6; i++) d[i] = sp.bs[i];
        d[6] = sp.types[0]; d[7] = sp.types[1];
        d[24] = sp.abilities[0] || 0; d[25] = sp.abilities[1] || 0; d[26] = sp.abilities[2] || 0;
      });
    };
    model.setLearnset = function (n, list) {
      var d = entry(learn, n);
      for (var k = 0; k < list.length && k * 4 + 3 < d.length; k++) { w16(d, k * 4, list[k][1]); w16(d, k * 4 + 2, list[k][0]); }
    };
    // Entwicklungen: Gen 6 = 8 × 6 Byte, Gen 7 = 8 × 8 Byte (dort steht hinter dem Ziel noch die Form)
    if (evo) {
      var es = g.gen === 6 ? 6 : 8;
      C.makeEvoTable(model, function (n) { return entry(evo, n); }, function (n, k) { return k * es; }, 8, max, null, g.gen === 7 ? function (b, eo) { b[eo + 6] = 0; } : null);
    }
    // Gen 7: Geschenke (Datei 0, 0x14 Byte je Eintrag, ab Nr. 3 – davor die Starter) und statische Begegnungen (Datei 1, 0x38 Byte; ohne Totem- und Begleiter-Einträge)
    var statG = g.stat ? await loadGarc(ctx, g.stat, true) : null;
    if (statG) {
      var gifts = entry(statG, 0), stEnc = entry(statG, 1);
      model.statics = [];
      var addStatic = function (buf, off, lvOff, extra) {
        var sp0 = u16(buf, off); if (!species[sp0]) return;
        model.statics.push({
          isEgg: !!(extra && extra.egg), level: buf[off + lvOff],
          get: function () { return u16(buf, off); },
          set: function (n) { w16(buf, off, n); buf[off + 2] = 0; if (extra && extra.resetMoves) for (var q = 12; q <= 18; q += 2) w16(buf, off + q, 0); },
          setLevel: function (l) { buf[off + lvOff] = l; }
        });
      };
      if (gifts) for (var gi = 3; gi < Math.floor(gifts.length / 0x14); gi++) addStatic(gifts, gi * 0x14, 3, { egg: gifts[gi * 0x14 + 10] === 1 });
      if (stEnc) for (var si = 0; si < Math.floor(stEnc.length / 0x38); si++) if (g.skipStatics.indexOf(si) === -1) addStatic(stEnc, si * 0x38, 3, { resetMoves: true });
      // Ingame-Tausche (Datei 4, 0x34 Byte je Eintrag): gegebene Art bei +0 (Form bei +4), verlangte Art bei +0x2C
      var tradeF = entry(statG, 4);
      if (tradeF) {
        model.trades = [];
        for (var ti = 0; ti < Math.floor(tradeF.length / 0x34); ti++) (function (o) {
          if (!species[u16(tradeF, o)] || !species[u16(tradeF, o + 0x2C)]) return;
          model.trades.push({
            given: function () { return u16(tradeF, o); }, setGiven: function (n) { w16(tradeF, o, n); tradeF[o + 4] = 0; },
            requested: function () { return u16(tradeF, o + 0x2C); }, setRequested: function (n) { w16(tradeF, o + 0x2C, n); }
          });
        })(ti * 0x34);
      }
    }

    // Trainer
    var trNum = 0;
    if (trd && trp) {
      for (var t = 1; t < trd.files.length && t < trp.files.length; t++) {
        var th = entry(trd, t), tp = entry(trp, t);
        if (!th || !tp) continue;
        var flags, count, rec = 8, hasItem = false, hasMoves = false, base = 0;
        if (g.gen === 7) { count = th[3]; hasItem = true; hasMoves = true; rec = 32; }
        else if (g.type === 'oras') { flags = u16(th, 0); count = th[7]; hasMoves = !!(flags & 1); hasItem = !!(flags & 2); rec = 8 + (hasItem ? 2 : 0) + (hasMoves ? 8 : 0); }
        else { flags = th[0]; count = th[3]; hasMoves = !!(flags & 1); hasItem = !!(flags & 2); rec = 8 + (hasItem ? 2 : 0) + (hasMoves ? 8 : 0); }
        if (!count || count > 6 || tp.length < count * rec) continue;
        var tm = { label: 'Trainer ' + t, mons: [] };
        for (var n = 0; n < count; n++) (function (n, tp, th) {
          var o = n * rec, lvO = g.gen === 7 ? 14 : 2, spO = g.gen === 7 ? 16 : 4, frO = spO + 2;
          var sp = u16(tp, o + spO), lv = u16(tp, o + lvO);
          if (!sp || !species[sp]) return;
          tm.mons.push({
            level: lv,
            get: function () { return u16(tp, o + spO); },
            set: function (nn) { w16(tp, o + spO, nn); w16(tp, o + frO, 0); if (g.gen !== 7) tp[o + 1] &= 0x0F; else tp[o] &= 0x0F; },
            setLevel: function (l) { w16(tp, o + lvO, l); },
            refresh: function (nn, lvl, ls) {
              if (!hasMoves) return;
              var mvs = []; (ls || []).forEach(function (en) { if (en[0] <= lvl && mvs.indexOf(en[1]) === -1) mvs.push(en[1]); });
              mvs = mvs.slice(-4);
              var mo = g.gen === 7 ? o + 24 : o + 8 + (hasItem ? 2 : 0);
              for (var k = 0; k < 4; k++) w16(tp, mo + k * 2, mvs[k] || 0);
            }
          });
        })(n, tp, th);
        if (tm.mons.length) { model.trainers.push(tm); trNum++; }
      }
    }
    // Wilde Pokémon (komprimierte Einträge: entpackt bearbeiten, beim Schreiben wieder packen)
    var wg = await loadGarc(ctx, g.wild, false), dirty = {}, wildAreas = 0;
    function addSlot(key, table, buf, off, entryIdx) {
      var sp = u16(buf, off) & 0x7FF;
      if (sp < 1 || !species[sp]) return;
      model.wild.push({ key: key, table: table, get: function () { return u16(buf, off) & 0x7FF; }, set: function (nn) { w16(buf, off, nn); dirty[entryIdx] = buf; },
        scale: function (p) { buf[off + 2] = C.scaleLv(buf[off + 2], p); buf[off + 3] = C.scaleLv(buf[off + 3], p); dirty[entryIdx] = buf; } });
    }
    async function wildEntry(i) {
      var loc = wg.entryLoc(i, 0); if (!loc || loc.size < 8) return null;
      var raw = await ctx.source.read(loc.off, loc.size), cmp = raw[0] === 0x11 || raw[0] === 0x10;
      var data = cmp ? CTR.lz11(raw) : raw;
      return { loc: loc, data: data, cmp: cmp, raw: raw };
    }
    ctx.wildInfo = { entries: {}, wg: wg };
    if (wg) {
      if (g.gen === 6) {
        var cnt = wg.files.length - (g.type === 'oras' ? 2 : 1);
        for (var i = 0; i < cnt; i++) {
          var we = await wildEntry(i); if (!we || we.data.length < 0x20) continue;
          var b = we.data, off = u32(b, 0x10) + (g.type === 'oras' ? 0xE : 0x10), slots = g.type === 'oras' ? ORAS_SLOTS : XY_SLOTS;
          var need = g.type === 'oras' ? 0xF6 : 0x178, avail = g.type === 'oras' ? u32(b, 0x14) - off : b.length - off;
          if (avail < need || off + need > b.length) continue;
          ctx.wildInfo.entries[i] = we; wildAreas++;
          slots.forEach(function (sl) {
            for (var j = 0; j < sl[1]; j++) addSlot('Gebiet ' + i + ' (' + sl[2] + ')', 'g' + i, b, off + sl[0] + j * 4, i);
          });
        }
      } else {
        var areas = Math.floor(wg.files.length / 11);
        for (var a = 0; a < areas; a++) {
          var idx = 9 + 11 * a, we2 = await wildEntry(idx); if (!we2 || we2.data.length < 8) continue;
          var tables = CTR.unpackMini(we2.data, 'EA'); if (!tables) continue;
          var used = false;
          tables.forEach(function (tb, ti) {
            if (tb.length < 4 + 0x164) return;
            var halves = tb.length >= 4 + 0x2C8 ? 2 : 1;
            for (var hv = 0; hv < halves; hv++) {
              var bs = 4 + hv * 0x164;
              for (var k = 0; k < 10; k++) {
                var o = bs + 0xC + k * 4;
                if (!(u16(tb, o) & 0x7FF)) continue;
                for (var jj = 0; jj < 8; jj++) addSlot('Gebiet ' + a + ' Tabelle ' + (ti + 1) + (halves > 1 ? (hv ? ' Nacht' : ' Tag') : ''), 'a' + a, tb, o + 40 * jj, idx);
              }
              for (var w = 0; w < 6; w++) addSlot('Gebiet ' + a + ' Tabelle ' + (ti + 1) + ' Wetter', 'a' + a, tb, bs + 0x14C + w * 4, idx);
            }
            used = true;
          });
          if (used) { ctx.wildInfo.entries[idx] = we2; wildAreas++; }
        }
      }
    }
    model.scanInfo = { wildMaps: wildAreas, wildSlots: model.wild.length, trainers: trNum, evo: model.evos.length > 0, starters: false, learnsets: Object.keys(learnsets).length };

    // Programmcode (ExeFS .code, BLZ-komprimiert): TM-Attacken und – nur Gen 6 – Ingame-Tausche
    var codeEx = null, code = null, codeDirty = false;
    if (!scanOnly) { try { codeEx = await CTR.readCode(ctx.info); code = codeEx && codeEx.code; } catch (e0) { codeEx = code = null; } }
    var hexBytes = function (h) { var r = []; for (var q = 0; q < h.length; q += 2) r.push(parseInt(h.substr(q, 2), 16)); return r; };
    var findCode = function (pat) {
      if (!code) return -1;
      for (var x = 0; x + pat.length <= code.length; x++) {
        if (code[x] !== pat[0]) continue;
        var okp = true; for (var y = 1; y < pat.length; y++) if (code[x + y] !== pat[y]) { okp = false; break; }
        if (okp) return x + pat.length;
      }
      return -1;
    };
    if (code) {
      var oras = g.type === 'oras', pre = g.gen === 6 ? 'D400AE02AF02B002' : g.type === 'usum' ? '03BC03BD03BE03BF03' : '034003410342034303', base3 = findCode(hexBytes(pre));
      if (base3 > 0) {
        var tmOff = function (i) { return i < 92 ? base3 + i * 2 : base3 + (g.gen === 6 ? (oras ? 98 : 97) * 2 : 92 * 2) + (i - 92) * 2; };
        var tms3 = [], hms3 = [], i3, hmN = g.gen === 6 ? (oras ? 7 : 5) : 0;
        for (i3 = 0; i3 < 100; i3++) tms3.push(u16(code, tmOff(i3)));
        if (g.gen === 6) {
          for (i3 = 0; i3 < 5; i3++) hms3.push(u16(code, base3 + 92 * 2 + i3 * 2));
          if (oras) { hms3.push(u16(code, base3 + 92 * 2 + 10)); hms3.push(u16(code, base3 + 92 * 2 + 28)); }
        }
        if (tms3.concat(hms3).every(function (m) { return m >= 1 && m <= g.maxMove; })) {
          var cp3 = [];
          for (var s3 = 1; s3 <= max; s3++) {
            var sd = entry(stats, s3); if (!species[s3] || !sd || sd.length < 54) continue;
            var fl3 = [false]; for (var b3 = 0; b3 < 100 + hmN; b3++) fl3.push(!!(sd[40 + (b3 >> 3)] & (1 << (b3 & 7))));
            cp3.push({ key: s3, nat: s3, types: species[s3].types.slice(), flags: fl3, data: sd });
          }
          model.tm = {
            tms: tms3, hms: hms3, compat: cp3, earlyHM: [],
            setTMs: function (list) { list.forEach(function (m, i) { w16(code, tmOff(i), m); }); codeDirty = true; },
            commit: function () {
              cp3.forEach(function (c) {
                for (var j = 0; j < 14; j++) c.data[40 + j] = 0;
                for (var f = 1; f < c.flags.length; f++) if (c.flags[f]) { var bb = f - 1; c.data[40 + (bb >> 3)] |= 1 << (bb & 7); }
              });
            }
          };
        }
      }
      if (g.gen === 6) {
        var tb = findCode(hexBytes(oras ? '810B7A0097000A00000047006B000A00' : 'BA0A02015E000100BC0A150069000100')), tcount = oras ? 3 : 9;
        if (tb > 0 && tb + tcount * 0x24 <= code.length) {
          model.trades = [];
          for (var t3 = 0; t3 < tcount; t3++) (function (o) {
            if (!species[u16(code, o)]) return;
            model.trades.push({
              given: function () { return u16(code, o); }, setGiven: function (n) { w16(code, o, n); codeDirty = true; },
              requested: function () { return u16(code, o + 0x20); }, setRequested: function (n) { if (u16(code, o + 0x20)) { w16(code, o + 0x20, n); codeDirty = true; } }
            });
          })(tb + t3 * 0x24);
        }
      }
    }

    // Schreiben: kleine Archive komplett, wilde Pokémon je Eintrag (neu gepackt, wenn es in den alten Platz passt)
    model.commit = async function () {
      var skipped = 0, written = 0;
      [stats, learn, evo, trd, trp].concat(moveDirty ? [moveG] : []).concat(statG ? [statG] : []).forEach(function (gr) { if (gr && gr.whole) patches.push({ off: gr.fileOff, bytes: gr.data }); });
      var keys = Object.keys(dirty);
      for (var q = 0; q < keys.length; q++) {
        var ix = +keys[q], we = ctx.wildInfo.entries[ix], bytes;
        if (!we) continue;
        // g.gen 7: der Mini-Inhalt liegt im selben Puffer wie we.data (unpackMini liefert Teilansichten) → we.data ist bereits geändert
        if (we.cmp) {
          bytes = CTR.lz11Compress(we.data);
          if (bytes.length > we.loc.size) { skipped++; continue; }
          var padded = new Uint8Array(we.loc.size); padded.set(bytes); bytes = padded;
        } else bytes = we.data;
        patches.push({ off: we.loc.off, bytes: bytes }); written++;
      }
      model.commitInfo = { skipped: skipped, written: written };
      var exefsNew = null;
      if (codeDirty && codeEx) {
        exefsNew = await CTR.buildExefs(ctx.info, codeEx, code);
        if (!exefsNew) model.commitInfo.codeSkipped = true;
      }
      return CTR.build(ctx.info, patches, ctx.source, undefined, exefsNew);
    };
    return model;
  }

  async function run(ctx, opts) {
    var model = await buildModel(ctx, false), res = await C.run(model, opts);
    if (model.commitInfo && model.commitInfo.skipped) res.log += '\n\nHinweis: ' + model.commitInfo.skipped + ' Gebiete der wilden Pokémon blieben unverändert (die neuen Daten passten nicht in den vorhandenen Platz).';
    if (model.commitInfo && model.commitInfo.codeSkipped) res.log += '\n\nHinweis: Die TM-/Tausch-Änderungen im Programmcode wurden nicht gespeichert (der geänderte Code ließ sich nicht klein genug komprimieren).';
    return res;
  }
  window.CCRand3DS = { CAPS: { moves: true, tm: true, evoFix: true, extra: true, noTutor: true }, DEFAULTS: C.DEFAULTS, open: open, scan: scan, run: run, fileSource: fileSource, GAMES: GAMES, buildModel: buildModel };
  if (typeof module !== 'undefined') module.exports = window.CCRand3DS;
})();
