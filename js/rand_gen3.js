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

  // ---------------- Modell für den gemeinsamen Kern (js/rand_core.js) ----------------
  function buildModel(rom, u8) {
    var species = [], learnsets = [], s, nsp = rom.species.length, base = rom.off.bs;
    var abilityPool = []; for (var ab = 1; ab <= 76; ab++) if (BAN_ABILITY.indexOf(ab) === -1) abilityPool.push(ab);
    var legends = [], shedinja = [];
    for (s = 0; s < nsp; s++) {
      learnsets[s] = rom.learnsets[s] ? rom.learnsets[s].map(function (l) { return l.slice(); }) : [];
      if (!validSpecies(rom, s)) continue;
      var e = rom.species[s];
      species[s] = { bs: e.bs.slice(), types: e.types.slice(), abilities: e.abilities.slice(0, 2) };
      if (LEGEND_NAT.indexOf(e.nat) !== -1) legends.push(s);
      if (e.nat === 292) shedinja.push(s);
    }
    var mnOff = findMoveNames(u8), moveNames = [];
    if (mnOff >= 0) for (var mi = 0; mi < rom.moves.length; mi++) moveNames.push(G.decode(u8, mnOff + mi * 13, 13));
    var model = {
      title: (rom.gameEn || rom.title) + ' (' + rom.code + ')', maxNat: nsp - 1, species: species, typeNames: TN, typePool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17],
      abilityPool: abilityPool, moveNames: moveNames, legends: legends, noStatsFor: shedinja, learnsets: learnsets, moves: rom.moves, maxMove: rom.moves.length - 1,
      bannedMoves: BAN_MOVE, wild: [], trainers: [], evos: [], starters: [],
      nameOf: function (id) { return nameOf(rom, id); }
    };
    model.commitSpecies = function () {
      species.forEach(function (sp, n) {
        if (!sp) return;
        var o = base + n * 28;
        for (var i = 0; i < 6; i++) u8[o + i] = sp.bs[i];
        u8[o + 6] = sp.types[0]; u8[o + 7] = sp.types[1]; u8[o + 22] = sp.abilities[0] || 0; u8[o + 23] = sp.abilities[1] || 0;
      });
    };
    model.setLearnset = function (n, list) {
      var lp = rom.off.learn[n]; if (lp < 0 || lp === undefined) return;
      for (var k = 0; k < list.length; k++) w16(u8, lp + k * 2, ((list[k][0] & 0x7F) << 9) | list[k][1]);
    };
    // Attacken-Daten: 12 Byte je Attacke (Wirkung, Stärke, Typ, Genauigkeit, AP); die Art (physisch/speziell) hängt in Gen 3 am Typ
    model.setMove = function (m, ch) {
      var o = rom.off.mv + m * 12;
      if (ch.power !== undefined) u8[o + 1] = Math.min(255, ch.power);
      if (ch.type !== undefined) u8[o + 2] = ch.type;
      if (ch.acc !== undefined) u8[o + 3] = ch.acc;
      if (ch.pp !== undefined) u8[o + 4] = ch.pp;
    };
    rom.moves.forEach(function (m) { if (m) m.cat = undefined; });
    // Wilde Pokémon
    findWild(rom, u8).arrays.forEach(function (a) {
      for (var i = 0; i < a.n; i++) (function (eo) {
        model.wild.push({ key: 'Karte ' + a.map + ' (' + a.kind + ')', get: function () { return u16(u8, eo); }, set: function (n) { w16(u8, eo, n); },
          scale: function (p) { var C = window.CCRandCore; u8[eo - 2] = C.scaleLv(u8[eo - 2], p); u8[eo - 1] = C.scaleLv(u8[eo - 1], p); } });
      })(a.off + i * 4 + 2);
    });
    // Trainer
    rom.trainers.forEach(function (tr) {
      if (tr.partyOff < 0 || !tr.party.length) return;
      var flags = u8[tr.off], hasItem = !!(flags & 2), custom = !!(flags & 1);
      var tm = { label: ((rom.classNames && rom.classNames[tr.cls]) || 'Trainer') + ' ' + tr.name, mons: [] };
      tr.party.forEach(function (pm, j) {
        var mo = tr.partyOff + j * tr.partySize;
        tm.mons.push({
          level: pm.level,
          get: function () { return u16(u8, mo + 4); },
          set: function (n) { w16(u8, mo + 4, n); },
          setLevel: function (l) { u8[mo + 2] = l; },
          hasItem: hasItem, setItem: function (it) { w16(u8, mo + 6, it); },
          refresh: function (n, lv) {
            if (!custom) return;
            var mv = G.defaultMoves({ learnsets: learnsets }, n, lv);
            if (!mv.length && learnsets[n] && learnsets[n][0]) mv = [learnsets[n][0][1]];
            var mOff = mo + (hasItem ? 8 : 6);
            for (var k = 0; k < 4; k++) w16(u8, mOff + k * 2, mv[k] || 0);
          }
        });
      });
      model.trainers.push(tm);
    });
    // Entwicklungen: 5 Einträge à 8 Byte je Art (Methode 14 = Nebenentwicklung Ninjask/Shedinja bleibt unberührt)
    var evoOff = findEvo(u8);
    if (evoOff >= 0) window.CCRandCore.makeEvoTable(model, function () { return u8; }, function (s, k) { return evoOff + s * 40 + k * 8; }, 5, nsp - 1, [14]);
    model.evoInfo = { level: 4, stone: 7, trade: 5, tradeItem: 6, friendDay: 2, friendNight: 3, beauty: 15, levelMethods: [4, 8, 9, 10, 11, 12, 13, 14], items: { water: 97, sun: 93, moon: 94, leaf: 98, dawn: 0 } };
    model.setGrowth = function (n, v) { u8[base + n * 28 + 19] = v; };
    model.catchRate = { get: function (n) { return u8[base + n * 28 + 8]; }, set: function (n, v) { u8[base + n * 28 + 8] = v; } };
    // Starter
    var so = findStarters(rom, u8);
    if (so >= 0) for (var q = 0; q < 3; q++) (function (o2) {
      model.starters.push({ get: function () { return u16(u8, o2); }, set: function (n) { w16(u8, o2, n); } });
    })(so + q * 2);
    // TMs/HMs: 50 TMs + 8 HMs als u16-Liste (beginnt mit Gebirgsdurchbruch-Folge Fokusstoß, Drachenklaue, Aquaknarre, Chaosstrahl); die Kompatibilitätstabelle wird nicht angefasst
    var tbl = window.GEN3_OFFS && window.GEN3_OFFS[rom.code + u8[0xBC]];
    var moveOk = function (m) { return m >= 1 && m < rom.moves.length; };
    var tmAt = -1, seq = [264, 337, 352, 347];
    if (tbl && tbl.tm && tbl.tm + 116 <= u8.length && u16(u8, tbl.tm) === seq[0]) tmAt = tbl.tm;
    for (var ti = 0; ti + 116 <= u8.length && tmAt < 0; ti += 2) {
      if (u16(u8, ti) === seq[0] && u16(u8, ti + 2) === seq[1] && u16(u8, ti + 4) === seq[2] && u16(u8, ti + 6) === seq[3]) tmAt = ti;
    }
    if (tmAt >= 0) {
      var tms = [], hms = [], i2;
      for (i2 = 0; i2 < 50; i2++) tms.push(u16(u8, tmAt + i2 * 2));
      for (i2 = 0; i2 < 8; i2++) hms.push(u16(u8, tmAt + (50 + i2) * 2));
      if (tms.concat(hms).every(moveOk)) {
        model.tm = { tms: tms, hms: hms, setTMs: function (list) { list.forEach(function (m, i) { w16(u8, tmAt + i * 2, m); }); } };
        // Kompatibilität: 8 Byte je Art (nach ROM-interner Nummer), Bit 0 = TM01 … Bit 49 = TM50, danach HM01–08
        if (tbl && tbl.compat && tbl.compat + nsp * 8 <= u8.length) {
          var cp = [];
          for (s = 1; s < nsp; s++) {
            if (!species[s]) continue;
            var co = tbl.compat + s * 8, fl = [false];
            for (var b = 0; b < 58; b++) fl.push(!!(u8[co + (b >> 3)] & (1 << (b & 7))));
            cp.push({ key: s, nat: s, types: species[s].types, flags: fl, off: co });
          }
          model.tm.compat = cp; model.tm.earlyHM = [];
          model.tm.commit = function () {
            cp.forEach(function (c) {
              for (var j = 0; j < 8; j++) u8[c.off + j] = 0;
              for (var f = 1; f < c.flags.length; f++) if (c.flags[f]) { var bb = f - 1; u8[c.off + (bb >> 3)] |= 1 << (bb & 7); }
            });
          };
        }
      }
    }
    if (tbl) {
      // Attacken-Lehrer (Smaragd, Feuerrot, Blattgrün): Attacken als u16-Liste, danach 1 Bit je Attacke und Art
      if (tbl.tut && /^(BPEE|BPR|BPG)/.test(rom.code)) {
        var tdata = tbl.tut[0], tcount = tbl.tut[1], tmoves = [];
        for (var tq = 0; tq < tcount; tq++) tmoves.push(u16(u8, tdata + tq * 2));
        if (tmoves.every(moveOk)) {
          var tcomp = tdata + tcount * 2, tbytes = (tcount + 7) >> 3, tcp = [];
          for (s = 1; s < nsp; s++) {
            if (!species[s]) continue;
            var to = tcomp + s * tbytes, tf = [false];
            for (var tb = 0; tb < tcount; tb++) tf.push(!!(u8[to + (tb >> 3)] & (1 << (tb & 7))));
            tcp.push({ key: s, nat: s, types: species[s].types, flags: tf, off: to });
          }
          model.tutor = {
            moves: tmoves, compat: tcp, setMoves: function (list) { list.forEach(function (m, i) { w16(u8, tdata + i * 2, m); }); },
            commit: function () {
              tcp.forEach(function (c) {
                for (var j = 0; j < tbytes; j++) u8[c.off + j] = 0;
                for (var f = 1; f < c.flags.length; f++) if (c.flags[f]) { var bb = f - 1; u8[c.off + (bb >> 3)] |= 1 << (bb & 7); }
              });
            }
          };
        }
      }
      // Statische Begegnungen: Arten-Wort an allen Fundstellen, Level als Byte (ohne die Patches des UPR für Rivalenkampf/Geister-Knogga/Zugvögel)
      model.statics = [];
      (tbl.statics || []).forEach(function (st3, si) {
        if (!st3[0].length || !species[u16(u8, st3[0][0])]) return;
        model.statics.push({
          isEgg: tbl.eggs.indexOf(si) !== -1, level: st3[1].length ? u8[st3[1][0]] : 0,
          get: function () { return u16(u8, st3[0][0]); },
          set: function (n) { st3[0].forEach(function (o3) { w16(u8, o3, n); }); },
          setLevel: function (l) { st3[1].forEach(function (o3) { u8[o3] = l; }); }
        });
      });
      // Ingame-Tausche: 60 Byte je Eintrag, Art, die man bekommt, bei +12; gewünschte Art bei +56
      if (tbl.trade) {
        model.trades = [];
        for (var te = 0; te < tbl.trade[1]; te++) {
          if (tbl.trade[2].indexOf(te) !== -1) continue;
          (function (eo) {
            if (!species[u16(u8, eo + 12)] || !species[u16(u8, eo + 56)]) return;
            model.trades.push({
              given: function () { return u16(u8, eo + 12); }, setGiven: function (n) { w16(u8, eo + 12, n); },
              requested: function () { return u16(u8, eo + 56); }, setRequested: function (n) { w16(u8, eo + 56, n); }
            });
          })(tbl.trade[0] + te * 60);
        }
      }
    }
    // Items: Listen aus data/items_data.js; Feld-Items und versteckte Items liegen in den Karten-Ereignissen, Shops an festen Offsets
    if (window.CC_ITEMS) {
      var IT = window.CC_ITEMS[3];
      model.itemData = { allowed: IT.allowed.items, tms: IT.allowed.tms, nonBad: (rom.frlg ? IT.nonBad2 : IT.nonBad).items, shop: IT.shop, op: IT.op };
      model.itemNames = (rom.items || []).map(function (i) { return i.name; });
    }
    var ptr = function (o) { if (o < 0 || o + 4 > u8.length) return -1; var p2 = u32(u8, o); return p2 >= 0x08000000 && p2 < 0x08000000 + u8.length ? p2 - 0x08000000 : -1; };
    var mapBase = -1, pat = [0x80, 0x18, 0x00, 0x68, 0x89, 0x0B, 0x09, 0x18, 0x08, 0x68, 0x70, 0x47];
    for (var mi2 = 0; mi2 + 16 <= u8.length && mapBase < 0; mi2 += 2) {
      if (u8[mi2] !== pat[0]) continue;
      var hitm = true; for (var pj = 1; pj < pat.length; pj++) if (u8[mi2 + pj] !== pat[pj]) { hitm = false; break; }
      if (hitm) mapBase = mi2;
    }
    model.field = [];
    if (tbl && tbl.ball !== undefined && mapBase >= 0 && ptr(mapBase + 12) >= 0) {
      var mapHeaders = ptr(mapBase + 12), banks = [], off2 = mapHeaders;
      for (var guard = 0; guard < 200; guard++) {
        var skipb = false; banks.forEach(function (mb) { if (mapHeaders < mb && off2 >= mb) skipb = true; });
        if (skipb) break;
        var nb = ptr(off2); if (nb < 0) break;
        banks.push(nb); off2 += 4;
      }
      banks.forEach(function (bo) {
        var cnt = 0, o3 = bo;
        for (var g2 = 0; g2 < 600; g2++) {
          var stop = false; banks.forEach(function (mb) { if (bo < mb && o3 >= mb) stop = true; });
          if (stop || (bo < mapHeaders && o3 >= mapHeaders)) break;
          var mh = ptr(o3); if (mh < 0) break;
          cnt++; o3 += 4;
          var ev = ptr(mh + 4);
          if (ev < 0 || ev + 20 > u8.length) continue;
          var pc = u8[ev], sc = u8[ev + 3], pe = ptr(ev + 4), sp2 = ptr(ev + 16);
          if (pc > 0 && pe >= 0) for (var q = 0; q < pc; q++) {
            var spr = u8[pe + q * 24 + 1], so2 = ptr(pe + q * 24 + 16);
            if (spr === tbl.ball && so2 >= 0 && u8[so2] === 0x1A && u8[so2 + 1] === 0 && u8[so2 + 2] === 0x80 && u8[so2 + 5] === 0x1A && u8[so2 + 6] === 1 && u8[so2 + 7] === 0x80 && u8[so2 + 10] === 9 && (u8[so2 + 11] === 0 || u8[so2 + 11] === 1)) {
              (function (io) { model.field.push({ get: function () { return u16(u8, io); }, set: function (n) { w16(u8, io, n); } }); })(so2 + 3);
            }
          }
          if (sc > 0 && sp2 >= 0) for (var q2 = 0; q2 < sc; q2++) {
            var ty = u8[sp2 + q2 * 12 + 5], io2 = sp2 + q2 * 12 + 8;
            if (ty >= 5 && ty <= 7 && u16(u8, io2) !== 0) (function (io) { model.field.push({ get: function () { return u16(u8, io); }, set: function (n) { w16(u8, io, n); } }); })(io2);
          }
        }
      });
    }
    if (tbl && tbl.pickup) {
      var ploc = tbl.pickup[0], pbytes = [], pcnt = tbl.pickup[1], pstep = rom.code.slice(0, 3) === 'BPE' ? 2 : 4, pat3 = -1;
      for (var ph = 0; ph < ploc.length; ph += 2) pbytes.push(parseInt(ploc.substr(ph, 2), 16));
      for (var pa = 0; pa + pbytes.length <= u8.length && pat3 < 0; pa += 2) {
        if (u8[pa] !== pbytes[0]) continue;
        var pm = true; for (var pj = 1; pj < pbytes.length; pj++) if (u8[pa + pj] !== pbytes[pj]) { pm = false; break; }
        if (pm) pat3 = pa;
      }
      if (pat3 >= 0 && pat3 + pcnt * pstep <= u8.length) {
        model.pickup = []; model.pickupTMs = true;
        for (var pi3 = 0; pi3 < pcnt; pi3++) (function (po) { model.pickup.push({ get: function () { return u16(u8, po); }, set: function (n) { w16(u8, po, n); } }); })(pat3 + pi3 * pstep);
      }
    }
    if (tbl && tbl.shops) {
      model.shops = [];
      tbl.shops[0].forEach(function (so3, i) {
        if (tbl.shops[1].indexOf(i) !== -1) return;
        var list = [], o4 = so3, v;
        while (o4 + 2 <= u8.length && (v = u16(u8, o4)) !== 0 && list.length < 64) { list.push(v); o4 += 2; }
        if (!list.length) return;
        model.shops.push({ name: 'Shop ' + i, isMain: tbl.shops[2].indexOf(i) !== -1, items: list, set: function (items) { items.forEach(function (it, k) { w16(u8, so3 + k * 2, it); }); } });
      });
    }
    model.commit = function () { return u8; };
    return model;
  }

  function run(buf, rom, userOpts) {
    var u8 = new Uint8Array(buf); // Kopie
    return window.CCRandCore.run(buildModel(rom, u8), userOpts);
  }

  window.CCRand3 = { CAPS: { moves: true, tm: true, extra: true, evoFix: true, items: true }, get DEFAULTS() { var d = JSON.parse(JSON.stringify(window.CCRandCore.DEFAULTS)); d.starters = 'random'; return d; }, buildModel: buildModel, scan: scan, run: run, makeRng: makeRng, findWild: findWild, findStarters: findStarters, findEvo: findEvo, validSpecies: validSpecies, makePool: makePool };
})();
