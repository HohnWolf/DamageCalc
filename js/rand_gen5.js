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
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
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
        set: function (n) { w16(x.file, x.off, n); }, // Form = 0
        scale: function (p) { x.file[x.off + 2] = C.scaleLv(x.file[x.off + 2], p); x.file[x.off + 3] = C.scaleLv(x.file[x.off + 3], p); }
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
          hasItem: !!tr.hasItem, setItem: function (it) { w16(tr.pk, po + tr.head, it); },
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
    // Entwicklungen: 7 Einträge à 6 Byte je Art
    if (F.evo && F.evo.length > 649) window.CCRandCore.makeEvoTable(model, function (n) { var e = F.evo[n]; return e && e.length >= 42 ? e : null; }, function (n, k) { return k * 6; }, 7, 649);
    model.evoInfo = { level: 4, stone: 8, trade: 5, tradeItem: 6, tradeSpecial: 7, friendDay: 2, friendNight: 3, beauty: 16, electrified: 25, moss: 26, icy: 27, withMove: 21, withOther: 22, itemDay: 19, itemNight: 20,
      levelMethods: [4, 9, 10, 11, 12, 13, 14, 15, 23, 24], items: { water: 84, sun: 80, moon: 81, leaf: 85, dawn: 109 } };
    model.setGrowth = function (n, v) { var d = F.personal[n]; if (d) d[0x15] = v; };
    model.catchRate = { get: function (n) { return F.personal[n][8]; }, set: function (n, v) { F.personal[n][8] = v; } };
    // Attacken-Daten (a/0/2/1): Typ 0, Art 2 (1 = physisch, 2 = speziell), Stärke 3, Genauigkeit 4, AP 5
    model.setMove = function (m, ch) {
      var d = F.moves && F.moves[m]; if (!d || d.length < 21) return;
      if (ch.type !== undefined) d[0] = unType(ch.type);
      if (ch.cat !== undefined) d[2] = ch.cat === 0 ? 1 : 2;
      if (ch.power !== undefined) d[3] = Math.min(255, ch.power);
      if (ch.acc !== undefined) d[4] = ch.acc;
      if (ch.pp !== undefined) d[5] = ch.pp;
    };
    // TMs/HMs: Tabelle im arm9 (Muster 87 03 88 03), danach 92 TMs, 6 HMs, 3 TMs; Kompatibilität in den Basiswerten ab Byte 40 (13 Byte = TM1-92, HM1-6, TM93-95)
    var a9 = u32(u8, 0x20), a9len = u32(u8, 0x2C), at = -1, TM1 = 92, HMN = 6, TM2 = 3;
    for (var ai = a9; ai < a9 + a9len - 4; ai++) if (u8[ai] === 0x87 && u8[ai + 1] === 3 && u8[ai + 2] === 0x88 && u8[ai + 3] === 3) { at = ai + 4; break; }
    if (at > 0 && F.personal) {
      var tmOff = function (i) { return i < TM1 ? at + i * 2 : at + (i + HMN) * 2; }, tms = [], hms = [];
      for (var ti = 0; ti < TM1 + TM2; ti++) tms.push(u16(u8, tmOff(ti)));
      for (var hi = 0; hi < HMN; hi++) hms.push(u16(u8, at + (TM1 + hi) * 2));
      var bitOf = function (idx) { return idx <= TM1 ? idx : idx <= TM1 + TM2 ? idx + HMN : idx - TM2; }; // Position in der Liste (TMs, dann HMs, 1-basiert) → Bit-Nummer (1-basiert)
      var compat = [];
      for (var pi = 1; pi < F.personal.length; pi++) {
        var pd = F.personal[pi], sp0 = rom.species[pi];
        if (!pd || pd.length < 53 || !sp0) continue;
        var fl = [false];
        for (var fi = 1; fi <= TM1 + TM2 + HMN; fi++) { var b = bitOf(fi) - 1; fl.push(!!(pd[40 + (b >> 3)] & (1 << (b & 7)))); }
        compat.push({ key: pi, nat: sp0.nat, types: sp0.types.slice(), flags: fl, data: pd });
      }
      model.tm = {
        tms: tms, hms: hms, compat: compat, earlyHM: [],
        setTMs: function (list) { list.forEach(function (m, i) { w16(u8, tmOff(i), m); }); },
        commit: function () {
          compat.forEach(function (c) {
            for (var j = 0; j < 13; j++) c.data[40 + j] = 0;
            for (var f = 1; f < c.flags.length; f++) if (c.flags[f]) { var b2 = bitOf(f) - 1; c.data[40 + (b2 >> 3)] |= 1 << (b2 & 7); }
          });
        }
      };
    }
    // Statische Begegnungen und Ingame-Tausche (Offsets aus data/gen5_offsets.js): Arten stehen als Wort in den Skript-Dateien (a/0/5/7 bzw. a/0/5/6)
    var offs = window.GEN5_OFFS && rom.code && window.GEN5_OFFS[rom.code], N = window.NDS, scripts = null, tradeFiles = null;
    try {
      if (offs && N && N.nitroFile) {
        var sf = offs.scripts && N.nitroFile(u8, offs.scripts); scripts = sf ? N.narc(sf) : null;
        var tf = offs.tradesFile && N.nitroFile(u8, offs.tradesFile); tradeFiles = tf ? N.narc(tf) : null;
      }
    } catch (e0) { scripts = tradeFiles = null; }
    if (scripts) {
      var okRef = function (r, n) { var f = scripts[r[0]]; return !!f && r[1] + n <= f.length; };
      model.statics = [];
      offs.statics.forEach(function (st, si) {
        if (!st.s.length || !st.s.every(function (r) { return okRef(r, 2); }) || !st.l.every(function (r) { return okRef(r, 1); }) || !st.f.every(function (r) { return okRef(r, 1); })) return;
        if (!species[u16(scripts[st.s[0][0]], st.s[0][1])]) return;
        model.statics.push({
          isEgg: offs.eggs.indexOf(si) !== -1, level: st.l.length ? scripts[st.l[0][0]][st.l[0][1]] : 0,
          get: function () { return u16(scripts[st.s[0][0]], st.s[0][1]); },
          set: function (n) { st.s.forEach(function (r) { w16(scripts[r[0]], r[1], n); }); st.f.forEach(function (r) { scripts[r[0]][r[1]] = 0; }); },
          setLevel: function (l) { st.l.forEach(function (r) { scripts[r[0]][r[1]] = l; }); }
        });
      });
    }
    if (tradeFiles && offs) {
      model.trades = [];
      var scr = 0;
      tradeFiles.forEach(function (tf2, ti) {
        if (offs.unused.indexOf(ti) !== -1 || tf2.length < 0x60) return;
        var ts = offs.trades[model.trades.length] || [];
        if (!species[u16(tf2, 4)] || !species[u16(tf2, 0x5C)]) return;
        model.trades.push({
          given: function () { return u16(tf2, 4); },
          setGiven: function (n) { w16(tf2, 4, n); w16(tf2, 6, 0); w16(tf2, 8, 0); w16(tf2, 0x2C, 0xFF); ts.forEach(function (r) { if (scripts && scripts[r[0]]) w16(scripts[r[0]], r[2], n); }); },
          requested: function () { return u16(tf2, 0x5C); },
          setRequested: function (n) { w16(tf2, 0x5C, n); ts.forEach(function (r) { if (scripts && scripts[r[0]]) w16(scripts[r[0]], r[1], n); }); }
        });
      });
    }
    // Items: Listen aus data/items_data.js; Feld- und versteckte Items stehen als "setvar"-Befehle in den Skript-Dateien, BW2-Shops in einem eigenen Archiv
    if (window.CC_ITEMS) {
      var IT = window.CC_ITEMS[5];
      model.itemData = { allowed: IT.allowed.items, tms: IT.allowed.tms, nonBad: (rom.type === 'B2W2' ? IT.nonBad2 : IT.nonBad).items, shop: IT.shop, op: IT.op };
    }
    model.field = [];
    if (scripts && offs) {
      var scan5 = function (fileNo, skip, cmdWant, varWant) {
        var f = scripts[fileNo]; if (!f) return;
        var off = 0;
        for (var guard = 0; guard < 4096 && off + 4 <= f.length; guard++) {
          if (u16(f, off) === 0xFD13) break;
          var at = u32(f, off) + off + 4; off += 4;
          if (at > f.length || at + 8 > f.length) break;
          if (skip.indexOf(off / 4 - 1) !== -1) continue;
          if (u16(f, at + 2) === cmdWant && u16(f, at + 4) === varWant) (function (io) { model.field.push({ get: function () { return u16(f, io); }, set: function (n) { w16(f, io, n); } }); })(at + 6);
        }
      };
      if (offs.ball !== undefined) scan5(offs.ball, offs.ballSkip, 0x28, 0x800C);
      if (offs.hiddenFile !== undefined) scan5(offs.hiddenFile, offs.hiddenSkip, 0x2A, 0x8000);
    }
    if (offs && offs.shopsFile && offs.shopCount) {
      var shn = null;
      try { var shf = N.nitroFile(u8, offs.shopsFile); shn = shf ? N.narc(shf) : null; } catch (e1) { shn = null; }
      if (shn) {
        model.shops = [];
        for (var si2 = 0; si2 < offs.shopCount && si2 < shn.length; si2++) {
          if (offs.shopSkip.indexOf(si2) !== -1) continue;
          (function (sf, idx) {
            var list = []; for (var j = 0; j + 2 <= sf.length; j += 2) list.push(u16(sf, j));
            if (list.length) model.shops.push({ name: 'Shop ' + idx, items: list, set: function (items) { items.forEach(function (it, k) { w16(sf, k * 2, it); }); } });
          })(shn[si2], si2);
        }
      }
    }
    // Overlay-Daten: Shops von Schwarz/Weiß (Teil 1) und Attacken-Lehrer von Schwarz 2/Weiß 2 (nicht komprimierte Overlays)
    var ovl = function (n) { try { return N && N.overlay ? N.overlay(u8, n) : null; } catch (e2) { return null; } };
    if (offs && offs.shopOvl && !offs.shopsFile && offs.shopCount) {
      var so5 = ovl(offs.shopOvl[0]);
      if (so5) {
        model.shops = model.shops || [];
        for (var sh5 = 0; sh5 < offs.shopCount; sh5++) {
          if (offs.shopSkip.indexOf(sh5) !== -1) continue;
          var sbase = offs.shopOvl[1][sh5], ssz = offs.shopOvl[2][sh5];
          if (sbase === undefined || sbase + ssz * 2 > so5.length) continue;
          (function (base, n, idx) {
            var list = []; for (var j = 0; j < n; j++) list.push(u16(so5, base + j * 2));
            if (list.every(function (v) { return v > 0 && v < 700; })) model.shops.push({ name: 'Shop ' + idx, items: list, set: function (items) { items.forEach(function (it, k) { w16(so5, base + k * 2, it); }); } });
          })(sbase, ssz, sh5);
        }
      }
    }
    if (offs && offs.tutor && F.personal) {
      var to5 = ovl(offs.tutor[0]);
      if (to5 && offs.tutor[1] + 60 * 12 <= to5.length) {
        var tm5 = [];
        for (var tq = 0; tq < 60; tq++) tm5.push(u16(to5, offs.tutor[1] + tq * 12));
        if (tm5.every(function (m) { return m >= 1 && m <= 559; })) {
          // Flags in Lehrer-Reihenfolge (13, 15, 15, 17); in den Basiswerten liegen sie ab Byte 60 in der Reihenfolge (15, 17, 13, 15) = Gruppen 1, 3, 0, 2
          var cMove = [13, 15, 15, 17], cPers = [15, 17, 13, 15], p2m = [1, 3, 0, 2], startOf = [0, 13, 28, 43], tcp = [];
          for (var pi5 = 1; pi5 < F.personal.length; pi5++) {
            var pd5 = F.personal[pi5], sp5 = rom.species[pi5];
            if (!pd5 || pd5.length < 76 || !sp5) continue;
            var fl5 = new Array(61).fill(false);
            for (var mt = 0; mt < 4; mt++) for (var b5 = 0; b5 < cPers[mt]; b5++) fl5[startOf[p2m[mt]] + 1 + b5] = !!(pd5[60 + mt * 4 + (b5 >> 3)] & (1 << (b5 & 7)));
            tcp.push({ key: pi5, nat: sp5.nat, types: sp5.types.slice(), flags: fl5, data: pd5 });
          }
          model.tutor = {
            moves: tm5, compat: tcp, setMoves: function (list) { list.forEach(function (m, i) { w16(to5, offs.tutor[1] + i * 12, m); }); },
            commit: function () {
              tcp.forEach(function (c) {
                for (var q = 0; q < 16; q++) c.data[60 + q] = 0;
                for (var mt2 = 0; mt2 < 4; mt2++) for (var bb = 0; bb < cPers[mt2]; bb++) if (c.flags[startOf[p2m[mt2]] + 1 + bb]) c.data[60 + mt2 * 4 + (bb >> 3)] |= 1 << (bb & 7);
              });
            }
          };
        }
      }
    }
    // Pickup: 29 Items im Pickup-Overlay (nicht komprimiert)
    if (offs && offs.pickupOvl !== undefined && N && N.overlay) {
      var pov = null; try { pov = N.overlay(u8, offs.pickupOvl); } catch (e5) { pov = null; }
      var ppat = [0x19, 0, 0x5C, 0, 0xDD, 0], pat5 = -1;
      if (pov) for (var px = 0; px + ppat.length <= pov.length && pat5 < 0; px++) {
        if (pov[px] !== ppat[0]) continue;
        var okp5 = true; for (var py = 1; py < ppat.length; py++) if (pov[px + py] !== ppat[py]) { okp5 = false; break; }
        if (okp5) pat5 = px;
      }
      if (pat5 >= 0 && pat5 + 58 <= pov.length) {
        model.pickup = [];
        for (var pq = 0; pq < 29; pq++) (function (po) { model.pickup.push({ get: function () { return u16(pov, po); }, set: function (n) { w16(pov, po, n); } }); })(pat5 + pq * 2);
      }
    }
    model.commit = function () { return u8; };
    return model;
  }

  function run(buf, rom0, opts) {
    var u8 = new Uint8Array(buf), rom = window.NDS.parseRom(u8);
    return C.run(buildModel(rom, u8), opts);
  }
  window.CCRandGen5 = { CAPS: { moves: true, tm: true, extra: true, evoFix: true, items: true }, DEFAULTS: C.DEFAULTS, scan: scan, run: run, buildModel: buildModel, makePool: function (rom, noLegend) {
    var p = []; for (var s = 1; s <= 649; s++) if (rom.species[s] && (!noLegend || LEGEND.indexOf(s) === -1)) p.push(s); return p;
  } };
})();
