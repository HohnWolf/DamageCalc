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
    return { wildMaps: Object.keys(maps).length, wildSlots: w.length, trainers: rom.trainers.length, evo: evoOk(rom), starters: !!(window.GEN4_OFFS && window.GEN4_OFFS[rom.code + u8[0x1E]] && window.GEN4_OFFS[rom.code + u8[0x1E]].starter),
      learnsets: rom.files.learn ? rom.files.learn.length : 0 };
  }

  function defaultMoves(ls, lv) {
    var m = [];
    (ls || []).forEach(function (e) { if (e[0] <= lv && m.indexOf(e[1]) === -1) m.push(e[1]); });
    return m.slice(-4);
  }

  // ---------------- Modell für den gemeinsamen Kern (js/rand_core.js) ----------------
  function buildModel(rom, u8) {
    var F = rom.files, names = rom.names || {}, C = window.CCRandCore;
    var typePool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17], abilityPool = [];
    for (var ab = 1; ab <= 123; ab++) if (BAN_ABILITY.indexOf(ab) === -1) abilityPool.push(ab);
    var species = [], s;
    for (s = 1; s <= MAXNAT; s++) {
      var e = rom.species[s], d = F.personal && F.personal[s];
      if (!e || !d || d.length < 24) continue;
      species[s] = { bs: e.bs.slice(), types: e.types.slice(), abilities: (e.abilities || [0, 0]).slice(0, 2) };
    }
    var learnsets = {}, ls = rom.learnsets;
    for (s = 1; s <= MAXNAT; s++) if (ls[s] && species[s]) learnsets[s] = ls[s].map(function (x) { return x.slice(); });
    var model = {
      title: (rom.gameEn || rom.title) + ' (' + rom.code + ')', maxNat: MAXNAT, species: species, typeNames: TN, typePool: typePool, abilityPool: abilityPool,
      abilityNames: names.abilities || [], moveNames: names.moves || [], legends: LEGEND_NAT, noStatsFor: [292], learnsets: learnsets, moves: rom.moves,
      maxMove: rom.moves.length - 1, bannedMoves: [165], wild: [], trainers: [], evos: [], starters: []
    };
    model.commitSpecies = function () {
      species.forEach(function (sp, n) {
        if (!sp) return;
        var d = F.personal[n];
        for (var i = 0; i < 6; i++) d[i] = sp.bs[i];
        d[6] = sp.types[0]; d[7] = sp.types[1]; d[22] = sp.abilities[0] || 0; d[23] = sp.abilities[1] || 0;
      });
    };
    model.setLearnset = function (n, list) {
      var d = F.learn && F.learn[n]; if (!d) return;
      for (var k = 0; k < list.length && k * 2 + 1 < d.length; k++) w16(d, k * 2, ((list[k][0] & 0x7F) << 9) | list[k][1]);
    };
    model.setMove = function (m, ch) {
      var d = F.moves && F.moves[m]; if (!d || d.length < 12) return;
      if (ch.cat !== undefined) d[2] = ch.cat;
      if (ch.power !== undefined) d[3] = Math.min(255, ch.power);
      if (ch.type !== undefined) d[4] = ch.type;
      if (ch.acc !== undefined) d[5] = ch.acc;
      if (ch.pp !== undefined) d[6] = ch.pp;
    };
    // Wilde Pokémon
    wildSlots(rom).forEach(function (x) {
      model.wild.push({
        key: 'Karte ' + x.map + ' (' + x.kind + ')',
        get: function () { return x.size === 2 ? u16(x.file, x.off) : u32(x.file, x.off); },
        set: function (n) { if (x.size === 2) w16(x.file, x.off, n); else w32(x.file, x.off, n); },
        // Level: DPPt Gras = u32 vor der Art; Wasser = Min/Max vor der Art; HGSS Wasser/Angeln = Min/Max vor der Art (Gras, Radio und Schwärme bleiben unverändert)
        scale: function (p) {
          var Cc = window.CCRandCore, b = x.file;
          if (x.size === 4 && x.kind === 'Gras') b[x.off - 4] = Cc.scaleLv(b[x.off - 4], p);
          else if (x.size === 4 && x.kind === 'Wasser') { b[x.off - 4] = Cc.scaleLv(b[x.off - 4], p); b[x.off - 3] = Cc.scaleLv(b[x.off - 3], p); }
          else if (x.size === 2 && ['Surfen', 'Felsbrecher', 'Alte Angel', 'Profi-Angel', 'Super-Angel'].indexOf(x.kind) !== -1) { b[x.off - 2] = Cc.scaleLv(b[x.off - 2], p); b[x.off - 1] = Cc.scaleLv(b[x.off - 1], p); }
        }
      });
    });
    // Trainer
    rom.trainers.forEach(function (tr) {
      if (!tr.pk) return;
      var tm = { label: ((rom.classNames && rom.classNames[tr.cls]) || 'Trainer') + ' ' + tr.name, mons: [] };
      tr.party.forEach(function (pm) {
        var po = pm.idx * tr.rec;
        tm.mons.push({
          level: pm.level,
          get: function () { return pm.species; },
          set: function (n) { pm.species = n; w16(tr.pk, po + 4, n); if (rom.type === 'HGSS') tr.pk[po + 1] &= 0xF0; },
          setLevel: function (l) { w16(tr.pk, po + 2, l); },
          hasItem: !!tr.hasItem, setItem: function (it) { w16(tr.pk, po + tr.head, it); },
          refresh: function (n, lv, lsn) {
            if (!tr.custom) return;
            var mv = defaultMoves(lsn, lv);
            if (!mv.length && lsn && lsn[0]) mv = [lsn[0][1]];
            var mo = po + tr.head + (tr.hasItem ? 2 : 0);
            for (var k = 0; k < 4; k++) w16(tr.pk, mo + k * 2, mv[k] || 0);
          }
        });
      });
      model.trainers.push(tm);
    });
    // Entwicklungen: 7 Einträge à 6 Byte je Art
    if (evoOk(rom)) window.CCRandCore.makeEvoTable(model, function (n) { var e = F.evo[n]; return e && e.length >= 42 ? e : null; }, function (n, k) { return k * 6; }, 7, MAXNAT);
    model.evoInfo = { level: 4, stone: 7, trade: 5, tradeItem: 6, friendDay: 2, friendNight: 3, beauty: 15, electrified: 24, moss: 25, icy: 26, withMove: 20, withOther: 21, itemDay: 18, itemNight: 19,
      levelMethods: [4, 8, 9, 10, 11, 12, 13, 14, 22, 23], items: { water: 84, sun: 80, moon: 81, leaf: 85, dawn: 109 } };
    model.setGrowth = function (n, v) { var d = F.personal[n]; if (d) d[19] = v; };
    model.catchRate = { get: function (n) { return F.personal[n][8]; }, set: function (n, v) { F.personal[n][8] = v; } };
    // TMs/HMs: 92 TMs + 8 HMs im arm9 (Muster je nach Spiel), Kompatibilität in den Basiswerten ab Byte 28 (13 Byte)
    var a9 = u32(u8, 0x20), a9len = u32(u8, 0x2C), pat = rom.type === 'HGSS' ? [0x1E, 0, 0x32, 0] : [0xD1, 0, 0xD2, 0, 0xD3, 0, 0xD4, 0], at = -1;
    for (var ai = a9; ai > 0 && ai < a9 + a9len - pat.length; ai++) {
      var hit = true; for (var pj = 0; pj < pat.length; pj++) if (u8[ai + pj] !== pat[pj]) { hit = false; break; }
      if (hit) { at = ai + pat.length; break; }
    }
    if (at > 0 && F.personal) {
      var tms = [], hms = [], i2;
      for (i2 = 0; i2 < 92; i2++) tms.push(u16(u8, at + i2 * 2));
      for (i2 = 0; i2 < 8; i2++) hms.push(u16(u8, at + (92 + i2) * 2));
      var plausible = tms.every(function (m) { return m >= 1 && m < rom.moves.length; }) && hms.every(function (m) { return m >= 1 && m < rom.moves.length; });
      if (plausible) {
        var compat = [];
        for (var pi = 1; pi < F.personal.length; pi++) {
          var pd = F.personal[pi], sp0 = rom.species[pi];
          if (!pd || pd.length < 41 || !sp0) continue;
          var fl = [false];
          for (var fi = 0; fi < 100; fi++) fl.push(!!(pd[28 + (fi >> 3)] & (1 << (fi & 7))));
          compat.push({ key: pi, nat: sp0.nat, types: sp0.types.slice(), flags: fl, data: pd });
        }
        model.tm = {
          tms: tms, hms: hms, compat: compat, earlyHM: [],
          setTMs: function (list) { list.forEach(function (m, i) { w16(u8, at + i * 2, m); }); },
          commit: function () {
            compat.forEach(function (c) {
              for (var j = 0; j < 13; j++) c.data[28 + j] = 0;
              for (var f = 1; f < c.flags.length; f++) if (c.flags[f]) { var b = f - 1; c.data[28 + (b >> 3)] |= 1 << (b & 7); }
            });
          }
        };
      }
    }
    // Statische Begegnungen und Ingame-Tausche (Offsets aus data/gen4_offsets.js, Schlüssel = Spielcode + Versionsbyte): Arten stehen als Wort in den Skript-Dateien
    var offs = window.GEN4_OFFS && window.GEN4_OFFS[rom.code + u8[0x1E]], N = window.NDS, scripts = null, tradeFiles = null;
    try {
      if (offs && N && N.nitroFile) {
        var sf = offs.scripts && N.nitroFile(u8, offs.scripts); scripts = sf ? N.narc(sf) : null;
        var tf = offs.tradesFile && N.nitroFile(u8, offs.tradesFile); tradeFiles = tf ? N.narc(tf) : null;
      }
    } catch (e0) { scripts = tradeFiles = null; }
    if (scripts) {
      var okRef = function (r, n) { var f = scripts[r[0]]; return !!f && r[1] + n <= f.length; };
      model.statics = [];
      offs.statics.forEach(function (st) {
        if (!st.s.length || !st.s.every(function (r) { return okRef(r, 2); }) || !st.l.every(function (r) { return okRef(r, 1); }) || !st.f.every(function (r) { return okRef(r, 1); })) return;
        if (!species[u16(scripts[st.s[0][0]], st.s[0][1])]) return;
        model.statics.push({
          level: st.l.length ? scripts[st.l[0][0]][st.l[0][1]] : 0,
          isEgg: !st.l.length,
          get: function () { return u16(scripts[st.s[0][0]], st.s[0][1]); },
          set: function (n) { st.s.forEach(function (r) { w16(scripts[r[0]], r[1], n); }); st.f.forEach(function (r) { scripts[r[0]][r[1]] = 0; }); },
          setLevel: function (l) { st.l.forEach(function (r) { scripts[r[0]][r[1]] = l; }); }
        });
      });
    }
    // Starter (nach dem Universal Pokémon Randomizer ZX, Gen4RomHandler): Arten im Overlay (Diamant/Perl/Platin) bzw. im arm9 (HeartGold/SoulSilver),
    // dazu die Rivalen- und Tag-Battle-Skripte, die feste Artnummern vergleichen. Texte und Starter-Grafik der Auswahl bleiben (nur Platin/DP: Grafik wird angepasst).
    model.starters = [];
    (function () {
      var st = offs && offs.starter, sc4 = scripts;
      if (!st || !sc4 || !N || !N.overlay) return;
      var hg = rom.type === 'HGSS';
      var hex = function (h) { var a = []; for (var i = 0; i < h.length; i += 2) a.push(parseInt(h.substr(i, 2), 16)); return a; };
      var search = function (buf, pat, from, to) {
        var r = []; from = from || 0; to = Math.min(to === undefined ? buf.length : to, buf.length);
        for (var i = from; i + pat.length <= to; i++) { var ok = true; for (var j = 0; j < pat.length; j++) if (buf[i + j] !== pat[j]) { ok = false; break; } if (ok) r.push(i); }
        return r;
      };
      var s32 = function (b, o) { return u32(b, o) | 0; };
      var ovl = null, base = 0, a9 = 0, a9len = 0, hgRaw = null;
      if (hg) {
        a9 = u32(u8, 0x20); a9len = u32(u8, 0x2C);
        var tailPat = [0x03, 0x03, 0x1A, 0x12, 0x01, 0x23, 0x00, 0x00];
        var tail = search(u8, tailPat, a9, a9 + a9len); ovl = u8;
        if (!tail.length && window.CTR && window.CTR.blzDecode) { // das arm9 von HeartGold/SoulSilver ist BLZ-komprimiert
          try { hgRaw = window.CTR.blzDecode(u8.slice(a9, a9 + a9len)); } catch (e1) { hgRaw = null; }
          if (!hgRaw) return;
          tail = search(hgRaw, tailPat); ovl = hgRaw;
        }
        if (tail.length !== 1) return;
        base = tail[0] - 13;
      } else {
        try { ovl = N.overlay(u8, st.ovl); } catch (e) { ovl = null; }
        if (!ovl || st.off === undefined) return;
        base = st.off;
      }
      if (base + 10 > ovl.length) return;
      var vals = [u16(ovl, base), u16(ovl, base + 4), u16(ovl, base + 8)];
      if (!vals.every(function (v) { return species[v]; })) return;
      var plat = offs.type === 'Plat';
      var files = hg ? [7, 23, 96, 110, 819, 850, 866] : plat ? [31, 36, 112, 123, 186, 427, 429, 1096] : [34, 90, 118, 180, 195, 394];
      var tagFiles = plat ? [2, 136, 201, 236] : [2, 131, 230];
      var pend = vals.slice(), done = false;
      var apply = function (nw) {
        if (done) return; done = true;
        w16(ovl, base, nw[0]); w16(ovl, base + 4, nw[1]); w16(ovl, base + 8, nw[2]);
        if (hg) {
          if (hgRaw) { // arm9 neu komprimieren; muss in den alten Platz passen (Länge im Kopf und Prüfsumme werden angepasst)
            var enc = window.CTR.blzEncode(hgRaw);
            if (!enc || enc.length > a9len) { done = false; return; }
            var foot = u8.slice(a9 + a9len, a9 + a9len + 12);
            u8.fill(0xFF, a9, a9 + a9len + 12); u8.set(enc, a9); u8.set(foot, a9 + enc.length);
            w32(u8, 0x2C, enc.length);
            var crc = 0xFFFF; for (var ci = 0; ci < 0x15E; ci++) { crc ^= u8[ci]; for (var ck = 0; ck < 8; ck++) crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1; }
            w16(u8, 0x15E, crc);
          }
          var magic = [0xCE, 0x00, 0x0C, 0x80, 0x11, 0x00, 0x0C, 0x80, 152, 0, 0x1C, 0x00, 0x05];
          files.forEach(function (fi) {
            var f = sc4[fi]; if (!f) return;
            var m = search(f, magic); if (m.length !== 1) return;
            var b = m[0]; w16(f, b + 8, nw[0]);
            var second = s32(f, b + 13) + b + 17;
            if (second + 5 <= f.length && f[second] === 0x11 && f[second + 4] === 155) w16(f, second + 4, nw[1]);
          });
          var cry = null; try { cry = N.overlay(u8, st.ovl); } catch (e2) { cry = null; }
          if (cry) {
            var cp = search(cry, hex('0004000C10BD0000000000000000000000E000000000000000E0000000000200'));
            if (cp.length) { var o = cp[0] + 32; for (var q = 0; q < 3; q++) w32(cry, o + q * 4, nw[q]); }
          }
          return;
        }
        if (st.gfx) { // Grafik der Starter-Auswahl (ARM-Thumb-Code im Overlay)
          var gp = search(ovl, hex(st.gfx));
          if (gp.length) {
            var off = gp[0] + st.gfx.length / 2;
            if (gp[0] > 0) {
              w16(ovl, off + 0xC, u16(ovl, off + 0xA)); if (off % 4 === 0) ovl[off + 0xC] = (ovl[off + 0xC] - 1) & 0xFF;
              w16(ovl, off + 0xA, u16(ovl, off + 0x8)); ovl[off + 0xA] = (ovl[off + 0xA] - 1) & 0xFF;
              w16(ovl, off + 0x8, u16(ovl, off + 0x6)); w16(ovl, off + 0x6, u16(ovl, off + 0x4)); w16(ovl, off + 0x4, u16(ovl, off + 0x2));
              w16(ovl, off + 0x2, 0x6828); w16(ovl, off, 0x182D);
              off += 0x16; w16(ovl, off, 0x6828); off += 0xA;
              for (var i = 0; i < 3; i++) {
                var diff = nw[i] - 4 * (i + 1), i1 = 0x3200, i2 = 0x3200;
                if (diff < 0) { i1 |= 0x800; diff = Math.abs(diff); } else if (diff > 255) { i2 |= 0xFF; diff -= 255; }
                i1 |= diff & 0xFF;
                ovl[off] = 4 * (i + 1);
                w16(ovl, off + 2, u16(ovl, off + 4)); w16(ovl, off + 4, i1); w16(ovl, off + 8, i2);
                off += 0xE;
              }
              ovl[off] = 1;
              if (st.gfxInner) { var ip = search(ovl, hex(st.gfxInner)); if (ip.length && ip[0] > 0) ovl[ip[0] + st.gfxInner.length / 2 + 1] = 0x68; }
            }
          }
        }
        var rm = [0xDE, 0x00, 0x0C, 0x80, 0x11, 0x00, 0x0C, 0x80, 0x83, 0x01, 0x1C, 0x00, 0x01];
        files.forEach(function (fi) {
          var f = sc4[fi]; if (!f) return;
          search(f, rm).forEach(function (b) {
            var jl = b + rm.length, jt = s32(f, jl) + jl + 4;
            if (jt < 0 || jt + 2 > f.length) return;
            var w = u16(f, jt); if (w !== 0xE5 && w !== 0x28F && !(w === 0x125 && plat)) return;
            w16(f, b + 8, nw[0]); w16(f, b + 0x15, nw[1]);
          });
        });
        var t1 = [0xDE, 0x00, 0x0C, 0x80, 0x28, 0x00, 0x04, 0x80], t2 = [0x11, 0x00, 0x0C, 0x80, 0x86, 0x01, 0x1C, 0x00, 0x01];
        tagFiles.forEach(function (fi) {
          var f = sc4[fi]; if (!f) return;
          search(f, t1).forEach(function (b) {
            var p2 = b + t1.length + 2; if (p2 + t2.length + 4 > f.length) return;
            for (var k = 0; k < t2.length; k++) if (f[p2 + k] !== t2[k]) return;
            var jl = p2 + t2.length, jt = s32(f, jl) + jl + 4;
            if (jt < 0 || jt + 2 > f.length || u16(f, jt) !== 0x1B) return;
            w16(f, b + 0x21, u16(f, b + 0x21) === 387 ? nw[0] : nw[2]);
            w16(f, b + 0xE, nw[1]);
          });
        });
      };
      if (!hg && st.script !== undefined && st.item !== undefined && sc4[st.script] && st.item + 2 <= sc4[st.script].length) { // Item, das der Starter trägt (nur Diamant/Perl/Platin)
        var sfile = sc4[st.script];
        model.starterItem = { get: function () { return u16(sfile, st.item); }, set: function (n) { w16(sfile, st.item, n); } };
      }
      for (var k = 0; k < 3; k++) (function (k) {
        model.starters.push({ get: function () { return vals[k]; }, set: function (n) { pend[k] = n; if (k === 2) apply(pend); } });
      })(k);
    })();
    if (tradeFiles && offs) {
      model.trades = [];
      tradeFiles.forEach(function (tf2, ti) {
        if (offs.spTrades.indexOf(ti) !== -1 || tf2.length < 0x50) return;
        if (!species[u32(tf2, 0)] || !species[u32(tf2, 0x4C)]) return;
        model.trades.push({
          given: function () { return u32(tf2, 0); }, setGiven: function (n) { w32(tf2, 0, n); },
          requested: function () { return u32(tf2, 0x4C); }, setRequested: function (n) { w32(tf2, 0x4C, n); if (tf2.length > 0x50) w32(tf2, 0x50, 0); },
          setIvs: function (a) { for (var iv = 0; iv < 6; iv++) w32(tf2, 4 + iv * 4, a[iv]); },
          setItem: function (n) { w32(tf2, 0x3C, n); }
        });
      });
    }
    // Items: Feld-Items als "setvar"-Befehle in den Skripten, versteckte Items und Shops im arm9
    if (window.CC_ITEMS) {
      var IT = window.CC_ITEMS[4];
      model.itemData = { allowed: IT.allowed.items, tms: IT.allowed.tms, nonBad: IT.nonBad.items, shop: IT.shop, op: IT.op };
    }
    model.field = [];
    if (scripts && offs && offs.ball !== undefined && scripts[offs.ball]) {
      var f4 = scripts[offs.ball], setVar = offs.type === 'HGSS' ? 0x29 : 0x28, off4 = 0;
      for (var g4i = 0; g4i < 4096 && off4 + 4 <= f4.length; g4i++) {
        if (u16(f4, off4) === 0xFD13) break;
        var at4 = u32(f4, off4) + off4 + 4; off4 += 4;
        if (at4 + 6 > f4.length) break;
        if (offs.ballSkip.indexOf(off4 / 4 - 1) !== -1) continue;
        if (u16(f4, at4) === setVar && u16(f4, at4 + 2) === 0x8008) (function (io) { model.field.push({ get: function () { return u16(f4, io); }, set: function (n) { w16(f4, io, n); } }); })(at4 + 4);
      }
    }
    if (offs && offs.hidden && a9 > 0 && a9 + offs.hidden[0] + offs.hidden[1] * 8 <= u8.length) {
      for (var hi = 0; hi < offs.hidden[1]; hi++) (function (io) {
        model.field.push({ get: function () { return u16(u8, io); }, set: function (n) { w16(u8, io, n); } });
      })(a9 + offs.hidden[0] + hi * 8);
    }
    if (offs && offs.shops && a9 > 0) {
      var sp4 = offs.shops, pat2 = []; for (var hp = 0; hp < sp4[0].length; hp += 2) pat2.push(parseInt(sp4[0].substr(hp, 2), 16));
      var sat = -1;
      for (var sa = a9; sa < a9 + a9len - pat2.length && sat < 0; sa++) {
        if (u8[sa] !== pat2[0]) continue;
        var sh2 = true; for (var sj = 1; sj < pat2.length; sj++) if (u8[sa + sj] !== pat2[sj]) { sh2 = false; break; }
        if (sh2) sat = sa + pat2.length;
      }
      if (sat > 0) {
        model.shops = [];
        var so4 = sat;
        for (var shi = 0; shi < sp4[1] && so4 < u8.length - 2; shi++) {
          var slots = [], list4 = [];
          while (so4 + 2 <= u8.length && u16(u8, so4) !== 0xFFFF) { var v4 = u16(u8, so4); if (v4 !== 0) { slots.push(so4); list4.push(v4); } so4 += 2; }
          so4 += 2;
          if (sp4[2].indexOf(shi) !== -1 || !list4.length) continue;
          (function (sl, ls4, idx) {
            model.shops.push({ name: 'Shop ' + idx, isMain: sp4[3].indexOf(idx) !== -1, items: ls4, set: function (items) { items.forEach(function (it, k) { w16(u8, sl[k], it); }); } });
          })(slots, list4, shi);
        }
      }
    }
    // Attacken-Lehrer (Platin, HeartGold, SoulSilver): Attacken im Feld-Overlay, Kompatibilität im Overlay (Platin) bzw. in waza_oshie.bin (HGSS); nur nicht komprimierte Overlays
    if (offs && offs.tutor && N && N.overlay && F.personal) {
      var T = offs.tutor, tOv = null, cBuf = null;
      try {
        tOv = N.overlay(u8, T.ovl);
        if (T.cFile) cBuf = N.nitroFile(u8, T.cFile); else cBuf = T.cOvl === T.ovl ? tOv : N.overlay(u8, T.cOvl);
      } catch (e3) { tOv = cBuf = null; }
      if (tOv && cBuf && T.moves + T.count * T.step <= tOv.length) {
        var tmv = [], tq;
        for (tq = 0; tq < T.count; tq++) tmv.push(u16(tOv, T.moves + tq * T.step));
        if (tmv.every(function (m) { return m >= 1 && m < rom.moves.length; })) {
          var tcp = [];
          for (var pi4 = 1; pi4 < F.personal.length; pi4++) {
            var sp4 = rom.species[pi4], co = T.compat + (pi4 - 1) * T.cbytes;
            if (!sp4 || co + T.cbytes > cBuf.length) continue;
            var fl4 = [false];
            for (var b4 = 0; b4 < T.count; b4++) fl4.push(!!(cBuf[co + (b4 >> 3)] & (1 << (b4 & 7))));
            tcp.push({ key: pi4, nat: sp4.nat, types: sp4.types.slice(), flags: fl4, off: co });
          }
          model.tutor = {
            moves: tmv, compat: tcp, setMoves: function (list) { list.forEach(function (m, i) { w16(tOv, T.moves + i * T.step, m); }); },
            commit: function () {
              tcp.forEach(function (c) {
                for (var j = 0; j < T.cbytes; j++) cBuf[c.off + j] = 0;
                for (var f = 1; f < c.flags.length; f++) if (c.flags[f]) { var bb = f - 1; cBuf[c.off + (bb >> 3)] |= 1 << (bb & 7); }
              });
            }
          };
        }
      }
    }
    // Pickup: 18 häufige + 11 seltene Items im Kampf-Overlay (nicht komprimiert)
    if (offs && offs.battleOvl !== undefined && N && N.overlay) {
      var bov = null; try { bov = N.overlay(u8, offs.battleOvl); } catch (e4) { bov = null; }
      var hexOf = function (h) { var r = []; for (var q = 0; q < h.length; q += 2) r.push(parseInt(h.substr(q, 2), 16)); return r; };
      var findIn = function (buf, pat) { for (var x = 0; x + pat.length <= buf.length; x++) { if (buf[x] !== pat[0]) continue; var okp = true; for (var y = 1; y < pat.length; y++) if (buf[x + y] !== pat[y]) { okp = false; break; } if (okp) return x; } return -1; };
      if (bov) {
        var c0 = findIn(bov, hexOf('110012001A000300')), r0 = findIn(bov, hexOf('19005C00DD00'));
        if (c0 >= 0 && r0 >= 0) {
          model.pickup = []; model.pickupTMs = true;
          for (var pc = 0; pc < 18; pc++) (function (po) { model.pickup.push({ get: function () { return u16(bov, po); }, set: function (n) { w16(bov, po, n); } }); })(c0 + pc * 2);
          for (var pr = 0; pr < 11; pr++) (function (po) { model.pickup.push({ get: function () { return u16(bov, po); }, set: function (n) { w16(bov, po, n); } }); })(r0 + pr * 2);
        }
      }
    }
    model.commit = function () { return u8; };
    return model;
  }

  function run(buf, rom0, userOpts) {
    var u8 = new Uint8Array(buf), rom = window.NDS.parseRom(u8); // Arbeitskopie: ROM neu einlesen, damit alle Archive in der Kopie liegen
    return window.CCRandCore.run(buildModel(rom, u8), userOpts);
  }


  window.CCRandNds = { CAPS: { moves: true, tm: true, extra: true, evoFix: true, items: true }, get DEFAULTS() { return window.CCRandCore.DEFAULTS; }, buildModel: buildModel, scan: scan, run: run, validSpecies: validSpecies, makePool: makePool, wildSlots: wildSlots };
})();
