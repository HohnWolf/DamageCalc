// Save File Editor – Kern: Speicherstände lesen, Pokémon bearbeiten, Prüfsummen neu berechnen und speichern.
// Formate und Offsets nach PKHeX (kwsch/PKHeX, GPL-3.0). Unterstützt: Generation 3 (.sav), Generation 4 (.sav/.dsv).
// Nichts wird hochgeladen: der Spielstand wird nur als Bytes im Browser verändert; die Originaldatei bleibt unverändert.
(function () {
  'use strict';
  var NDS = window.NDS, G3 = window.GEN3, P = window.PKPERSONAL;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >>> 24) & 255; }

  // ---------------- Erfahrung / Stats ----------------
  function expFor(growth, n) {
    if (n <= 1) return 0;
    var c = n * n * n;
    switch (growth) {
      case 1: return n <= 50 ? Math.floor(c * (100 - n) / 50) : n <= 68 ? Math.floor(c * (150 - n) / 100) : n <= 98 ? Math.floor(c * Math.floor((1911 - 10 * n) / 3) / 500) : Math.floor(c * (160 - n) / 100);
      case 2: return n <= 15 ? Math.floor(c * (Math.floor((n + 1) / 3) + 24) / 50) : n <= 36 ? Math.floor(c * (n + 14) / 50) : Math.floor(c * (Math.floor(n / 2) + 32) / 50);
      case 3: return Math.floor(6 * c / 5) - 15 * n * n + 100 * n - 140;
      case 4: return Math.floor(4 * c / 5);
      case 5: return Math.floor(5 * c / 4);
      default: return c;
    }
  }
  function levelFor(growth, exp) { var l = 1; while (l < 100 && expFor(growth, l + 1) <= exp) l++; return l; }
  var NAT_MOD = [[0, 0, 0, 0, 0], [1, -1, 0, 0, 0], [1, 0, -1, 0, 0], [1, 0, 0, -1, 0], [1, 0, 0, 0, -1], [-1, 1, 0, 0, 0], [0, 0, 0, 0, 0], [0, 1, -1, 0, 0], [0, 1, 0, -1, 0], [0, 1, 0, 0, -1],
    [-1, 0, 1, 0, 0], [0, -1, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, -1, 0], [0, 0, 1, 0, -1], [-1, 0, 0, 1, 0], [0, -1, 0, 1, 0], [0, 0, -1, 1, 0], [0, 0, 0, 0, 0], [0, 0, 0, 1, -1],
    [-1, 0, 0, 0, 1], [0, -1, 0, 0, 1], [0, 0, -1, 0, 1], [0, 0, 0, -1, 1], [0, 0, 0, 0, 0]]; // Angr, Vert, Init, SpA, SpV
  function calcStats(base, level, iv, ev, nature, shedinja) {
    var out = [], nm = NAT_MOD[nature] || NAT_MOD[0];
    out[0] = shedinja ? 1 : Math.floor((2 * base[0] + iv[0] + Math.floor(ev[0] / 4)) * level / 100) + level + 10;
    // Reihenfolge der Werte im Spielstand: KP, Angr, Vert, Init, SpA, SpV; Basiswerte: KP, Angr, Vert, Init, SpA, SpV
    var order = [1, 2, 3, 4, 5], mod = [nm[0], nm[1], nm[2], nm[3], nm[4]];
    for (var i = 0; i < 5; i++) {
      var s = order[i], v = Math.floor((2 * base[s] + iv[s] + Math.floor(ev[s] / 4)) * level / 100) + 5;
      out[s] = Math.floor(v * (10 + mod[i]) / 10);
    }
    return out;
  }

  // ---------------- Texte ----------------
  var G3_ENC = {}, G4_ENC = {};
  (function () {
    for (var b = 0; b < 256; b++) { var c = G3.decode(new Uint8Array([b, 0xFF]), 0, 2); if (c && !(c in G3_ENC) && b !== 0) G3_ENC[c] = b; }
    for (var k = 1; k < 0x1ED; k++) { var ch = NDS.g4char(k); if (ch && !(ch in G4_ENC)) G4_ENC[ch] = k; }
  })();
  function enc3(str, max, size) { // feste Länge, 0xFF-Terminator, Rest 0xFF (Spitzname) bzw. 0 (nicht benötigt)
    var out = new Uint8Array(size).fill(0xFF), n = 0;
    for (var i = 0; i < str.length && n < max; i++) { var c = G3_ENC[str.charAt(i)]; if (c !== undefined) out[n++] = c; }
    return out;
  }
  function enc4(str, max, size) { // u16 je Zeichen, 0xFFFF Terminator
    var out = new Uint8Array(size * 2).fill(0xFF), n = 0;
    for (var i = 0; i < str.length && n < max; i++) { var c = G4_ENC[str.charAt(i)]; if (c !== undefined) { w16(out, n * 2, c); n++; } }
    return out;
  }

  // ======================= Generation 3 =======================
  var ORDERS3 = ['GAEM', 'GAME', 'GEAM', 'GEMA', 'GMAE', 'GMEA', 'AGEM', 'AGME', 'AEGM', 'AEMG', 'AMGE', 'AMEG', 'EGAM', 'EGMA', 'EAGM', 'EAMG', 'EMGA', 'EMAG', 'MGAE', 'MGEA', 'MAGE', 'MAEG', 'MEGA', 'MEAG'];
  function sum32(u8, off) { var s = 0; for (var i = 0; i < 0xF80; i += 4) s = (s + u32(u8, off + i)) >>> 0; return ((s >>> 16) + (s & 0xFFFF)) & 0xFFFF; }

  // Pokémon (gen 3) im Klartext: 0–31 Kopf, 32 G, 44 A, 56 E, 68 M, 80+ Teamwerte (nur Team)
  var PK3 = {
    size: 80, partySize: 100, gen: 3,
    decode: function (u8, off, party) {
      var len = party ? 100 : 80;
      if (off + len > u8.length) return null;
      var pid = u32(u8, off), otid = u32(u8, off + 4);
      if (!pid && !otid) return null;
      var key = (pid ^ otid) >>> 0, d = new Uint8Array(len), sum = 0, i;
      d.set(u8.subarray(off, off + 32));
      var tmp = new Uint8Array(48);
      for (i = 0; i < 48; i += 4) { var w = (u32(u8, off + 32 + i) ^ key) >>> 0; w32(tmp, i, w); sum = (sum + (w & 0xFFFF) + (w >>> 16)) & 0xFFFF; }
      if (sum !== u16(u8, off + 28)) return null;
      var ord = ORDERS3[pid % 24];
      for (var b = 0; b < 4; b++) { var src = ord.indexOf('GAEM'.charAt(b)); d.set(tmp.subarray(src * 12, src * 12 + 12), 32 + b * 12); }
      if (party) d.set(u8.subarray(off + 80, off + 100), 80);
      var sp = u16(d, 32);
      if (!sp || sp > 411) return null;
      return d;
    },
    encode: function (d, u8, off, party) {
      var pid = u32(d, 0), otid = u32(d, 4), key = (pid ^ otid) >>> 0, ord = ORDERS3[pid % 24], tmp = new Uint8Array(48), sum = 0, i;
      for (var b = 0; b < 4; b++) { var dst = ord.indexOf('GAEM'.charAt(b)); tmp.set(d.subarray(32 + b * 12, 44 + b * 12), dst * 12); }
      for (i = 0; i < 48; i += 2) sum = (sum + u16(tmp, i)) & 0xFFFF;
      w16(d, 28, sum);
      u8.set(d.subarray(0, 32), off);
      for (i = 0; i < 48; i += 4) w32(u8, off + 32 + i, (u32(tmp, i) ^ key) >>> 0);
      if (party) u8.set(d.subarray(80, 100), off + 80);
    },
    f: {
      pid: [0, 4], tid: [4, 2], sid: [6, 2], species: [32, 2], item: [34, 2], exp: [36, 4], friendship: [41, 1],
      ev: [56, 1], pp: [56 - 12 + 8, 1]
    },
    get: function (d, k, i) {
      switch (k) {
        case 'pid': return u32(d, 0);
        case 'tid': return u16(d, 4);
        case 'sid': return u16(d, 6);
        case 'species': return u16(d, 32);
        case 'item': return u16(d, 34);
        case 'exp': return u32(d, 36);
        case 'ppups': return d[40];
        case 'friendship': return d[41];
        case 'move': return u16(d, 44 + i * 2);
        case 'pp': return d[52 + i];
        case 'ev': return d[56 + i];
        case 'iv': return (u32(d, 72) >>> (i * 5)) & 31;
        case 'egg': return (u32(d, 72) >>> 30) & 1;
        case 'abilitySlot': return (u32(d, 72) >>> 31) & 1;
        case 'nick': return G3.decode(d, 8, 10);
        case 'ot': return G3.decode(d, 20, 7);
        case 'lang': return d[18];
        case 'level': return d.length >= 100 ? d[84] : 0;
        case 'hp': return d.length >= 100 ? u16(d, 86) : 0;
        case 'status': return d.length >= 100 ? u32(d, 80) : 0;
        case 'ball': return (u16(d, 70) >> 11) & 15;
        case 'metLevel': return u16(d, 70) & 127;
        case 'form': return 0;
      }
      return 0;
    },
    set: function (d, k, v, i) {
      var t;
      switch (k) {
        case 'pid': w32(d, 0, v); break;
        case 'tid': w16(d, 4, v); break;
        case 'sid': w16(d, 6, v); break;
        case 'species': w16(d, 32, v); break;
        case 'item': w16(d, 34, v); break;
        case 'exp': w32(d, 36, v); break;
        case 'ppups': d[40] = v; break;
        case 'friendship': d[41] = v; break;
        case 'move': w16(d, 44 + i * 2, v); break;
        case 'pp': d[52 + i] = v; break;
        case 'ev': d[56 + i] = v; break;
        case 'iv': t = u32(d, 72); t = (t & ~(31 << (i * 5))) >>> 0; w32(d, 72, (t | (v << (i * 5))) >>> 0); break;
        case 'egg': t = u32(d, 72); w32(d, 72, v ? (t | 0x40000000) >>> 0 : (t & ~0x40000000) >>> 0); break;
        case 'abilitySlot': t = u32(d, 72); w32(d, 72, v ? (t | 0x80000000) >>> 0 : (t & 0x7FFFFFFF) >>> 0); break;
        case 'nick': d.set(enc3(v, 10, 10), 8); break;
        case 'ot': d.set(enc3(v, 7, 7), 20); break;
        case 'level': d[84] = v; break;
        case 'hp': w16(d, 86, v); break;
        case 'status': w32(d, 80, v); break;
        case 'ball': w16(d, 70, (u16(d, 70) & ~(15 << 11)) | (v << 11)); break;
      }
    },
    setStats: function (d, st) { for (var i = 0; i < 6; i++) w16(d, 88 + i * 2, st[i]); w16(d, 86, st[0]); },
    stats: function (d) { var o = []; for (var i = 0; i < 6; i++) o.push(u16(d, 88 + i * 2)); return o; },
    blank: function () { return null; }
  };
  PK3.setStats = function (d, st) {
    // Reihenfolge im Team: KP, Angr, Vert, Init, SpA, SpV  → Speicher: maxKP 88, Angr 90, Vert 92, Init 94, SpA 96, SpV 98
    for (var i = 0; i < 6; i++) w16(d, 88 + i * 2, st[i]);
    if (u16(d, 86) > st[0]) w16(d, 86, st[0]);
  };
  PK3.nature = function (d) { return u32(d, 0) % 25; };
  PK3.natureIsPid = true;
  PK3.levelOf = function (d, growth) { return levelFor(growth, u32(d, 36)); };

  function open3(u8) {
    if (u8.length < 0x1C000) return null;
    var best = null;
    [0, 0xE000].forEach(function (base) {
      var sec = {}, n = 0, idx = -1;
      for (var s = 0; s < 14; s++) {
        var o = base + s * 0x1000;
        if (u32(u8, o + 0xFF8) !== 0x08012025) return;
        var id = u16(u8, o + 0xFF4);
        if (id > 13 || sec[id] !== undefined) return;
        sec[id] = o; idx = u32(u8, o + 0xFFC); n++;
      }
      if (n === 14 && (!best || idx >= best.idx)) best = { base: base, sec: sec, idx: idx };
    });
    if (!best) return null;
    var data = new Uint8Array(u8);
    var sec = best.sec;
    function rd(region, off) { // region 0 klein, 1 groß (Sektoren 1–4), 2 Speicher (5–13)
      var first = region === 0 ? 0 : region === 1 ? 1 : 5, id = first + Math.floor(off / 0xF80);
      return sec[id] + (off % 0xF80);
    }
    var s0 = sec[0], code = u32(data, s0 + 0xAC), game;
    if (code === 1) game = 'FRLG';
    else if (code === 0) game = 'RS';
    else { var any = false; for (var q = 0x890; q < 0xF2C; q++) if (data[s0 + q]) { any = true; break; } game = any ? 'E' : 'RS'; }
    var cfg = { E: { party: 0x234, money: 0x490, key: 0xAC, name: 'Smaragd', nameEn: 'Emerald' }, RS: { party: 0x234, money: 0x490, key: -1, name: 'Rubin/Saphir', nameEn: 'Ruby/Sapphire' },
      FRLG: { party: 0x34, money: 0x290, key: 0xF20, name: 'Feuerrot/Blattgrün', nameEn: 'FireRed/LeafGreen' } }[game];
    var sv = { gen: 3, game: game, gameName: cfg.name, gameNameEn: cfg.nameEn, fmt: PK3, data: data, boxCount: 14, slotsPerBox: 30, ext: 'sav', partyMax: 6 };
    function key() { return cfg.key < 0 ? 0 : u32(data, s0 + cfg.key); }
    sv.getTrainer = function () {
      return { name: G3.decode(data, s0, 7), tid: u16(data, s0 + 0xA), sid: u16(data, s0 + 0xC), gender: data[s0 + 8],
        hours: u16(data, s0 + 0xE), minutes: data[s0 + 0x10], seconds: data[s0 + 0x11], money: (u32(data, rd(1, cfg.money)) ^ key()) >>> 0 };
    };
    sv.setTrainer = function (t) {
      data.set(enc3(t.name, 7, 8).subarray(0, 7), s0);
      data[s0 + 7] = 0xFF; // Terminator (letztes Byte wird vom Spiel nicht gelesen)
      w16(data, s0 + 0xA, t.tid); w16(data, s0 + 0xC, t.sid); data[s0 + 8] = t.gender ? 1 : 0;
      w16(data, s0 + 0xE, t.hours); data[s0 + 0x10] = t.minutes; data[s0 + 0x11] = t.seconds;
      w32(data, rd(1, cfg.money), ((Math.min(999999, t.money) >>> 0) ^ key()) >>> 0);
    };
    sv.partyCount = function () { return Math.min(6, data[rd(1, cfg.party)]); };
    function partyOff(i) { return rd(1, cfg.party + 4 + i * 100); }
    sv.getParty = function () {
      var out = [], n = sv.partyCount();
      for (var i = 0; i < n; i++) { var d = PK3.decode(data, partyOff(i), true); out.push(d); }
      return out;
    };
    sv.setParty = function (list) {
      var cnt = 0; list.forEach(function (d) { if (d) cnt++; });
      var packed = list.filter(Boolean), old = sv.partyCount();
      data[rd(1, cfg.party)] = packed.length;
      for (var i = 0; i < Math.max(packed.length, old); i++) {
        var o = partyOff(i);
        if (packed[i]) PK3.encode(packed[i], data, o, true); else data.fill(0, o, o + 100);
      }
    };
    function boxByte(idx, k) { return rd(2, 4 + idx * 80 + k); }
    function readBox(idx) { var b = new Uint8Array(80); for (var k = 0; k < 80; k++) b[k] = data[boxByte(idx, k)]; return b; }
    function writeBox(idx, b) { for (var k = 0; k < 80; k++) data[boxByte(idx, k)] = b[k]; }
    sv.getBoxMon = function (box, slot) { var idx = box * 30 + slot, b = readBox(idx); return PK3.decode(b, 0, false); };
    sv.setBoxMon = function (box, slot, d) {
      var idx = box * 30 + slot, tmp = new Uint8Array(80);
      if (d) PK3.encode(d, tmp, 0, false);
      writeBox(idx, tmp);
    };
    sv.getBoxName = function (b) { var o = rd(2, 0x8344 + b * 9), t = new Uint8Array(9); for (var k = 0; k < 9; k++) t[k] = data[rd(2, 0x8344 + b * 9 + k)]; return G3.decode(t, 0, 9); };
    sv.growthOf = function (species) { var nat = G3.defaultNat(species); var e = P.g3[nat]; return e ? e[6] : 0; };
    sv.baseOf = function (species) { var e = P.g3[G3.defaultNat(species)]; return e ? e.slice(0, 6) : [50, 50, 50, 50, 50, 50]; };
    sv.natOf = function (species) { return G3.defaultNat(species); };
    sv.speciesFromNat = function (nat) { if (nat <= 251) return nat; var i = HOENN.indexOf(nat); return i >= 0 ? 277 + i : 0; };
    sv.maxSpecies = 386;
    sv.finish = function () {
      var out = new Uint8Array(data);
      // beide Spielstand-Kopien bleiben wie sie waren; nur der aktive Block wird neu berechnet
      for (var id = 0; id < 14; id++) w16(out, sec[id] + 0xFF6, sum32(out, sec[id]));
      return out;
    };
    return sv;
  }
  // interne Art → Pokédex-Nr. wird über GEN3.defaultNat gelöst; Umkehrung:
  var HOENN = [252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 290, 291, 292, 276,
    277, 285, 286, 327, 278, 279, 283, 284, 320, 321, 300, 301, 352, 343, 344, 299, 324, 302, 339, 340, 370, 341, 342, 349, 350, 318, 319, 328, 329, 330,
    296, 297, 309, 310, 322, 323, 363, 364, 365, 331, 332, 361, 362, 337, 338, 298, 325, 326, 311, 312, 303, 307, 308, 333, 334, 360, 355, 356, 315, 287,
    288, 289, 316, 317, 357, 293, 294, 295, 366, 367, 368, 359, 353, 354, 336, 335, 369, 304, 305, 306, 351, 313, 314, 345, 346, 347, 348, 280, 281,
    282, 371, 372, 373, 374, 375, 376, 377, 378, 379, 382, 383, 384, 380, 381, 385, 386, 358];

  // ======================= Generation 4 =======================
  var G4GAMES = {
    DP: { name: 'Diamant/Perl', nameEn: 'Diamond/Pearl', gSize: 0xC100, sStart: 0xC100, sSize: 0x121E0, trainer: 0x64, party: 0x98, footer: 0x14, box: 4, stride: 0xFF0, names: 0x11EE4 },
    Pt: { name: 'Platin', nameEn: 'Platinum', gSize: 0xCF2C, sStart: 0xCF2C, sSize: 0x121E4, trainer: 0x68, party: 0xA0, footer: 0x14, box: 4, stride: 0xFF0, names: 0x11EE4 },
    HGSS: { name: 'HeartGold/SoulSilver', nameEn: 'HeartGold/SoulSilver', gSize: 0xF628, sStart: 0xF700, sSize: 0x12310, trainer: 0x64, party: 0x98, footer: 0x10, box: 0, stride: 0x1000, names: 0x12008 }
  };
  // Pokémon (gen 4) im Klartext: 0–7 Kopf (PID, 0, Prüfsumme), 8 A, 40 B, 72 C, 104 D, 136+ Teamwerte
  var PK4 = {
    size: 136, partySize: 236, gen: 4,
    decode: function (u8, off, party) {
      var len = party ? 236 : 136;
      if (off + len > u8.length) return null;
      var pid = u32(u8, off), chk = u16(u8, off + 6);
      if (u16(u8, off + 4) !== 0 || (!pid && !chk)) return null;
      var e = u8.slice(off, off + len);
      NDS.crypt(e, 8, 136, chk);
      var sum = 0, i;
      for (i = 8; i < 136; i += 2) sum = (sum + u16(e, i)) & 0xFFFF;
      if (sum !== chk) return null;
      var d = new Uint8Array(len), sv = (pid >>> 13) & 31;
      d.set(e.subarray(0, 8));
      for (var b = 0; b < 4; b++) { var src = NDS.BLOCK_POS[sv * 4 + b]; d.set(e.subarray(8 + src * 32, 40 + src * 32), 8 + b * 32); }
      if (party) { d.set(e.subarray(136), 136); NDS.crypt(d, 136, len, pid); }
      var sp = u16(d, 8);
      if (!sp || sp > 493) return null;
      return d;
    },
    encode: function (d, u8, off, party) {
      var pid = u32(d, 0), sv = (pid >>> 13) & 31, sum = 0, i;
      for (i = 8; i < 136; i += 2) sum = (sum + u16(d, i)) & 0xFFFF;
      w16(d, 6, sum);
      var e = new Uint8Array(party ? 236 : 136);
      e.set(d.subarray(0, 8));
      for (var b = 0; b < 4; b++) { var dst = NDS.BLOCK_POS[sv * 4 + b]; e.set(d.subarray(8 + b * 32, 40 + b * 32), 8 + dst * 32); }
      NDS.crypt(e, 8, 136, sum);
      if (party) { var pt = d.slice(136); NDS.crypt(pt, 0, pt.length, pid); e.set(pt, 136); }
      u8.set(e, off);
    },
    get: function (d, k, i) {
      switch (k) {
        case 'pid': return u32(d, 0);
        case 'species': return u16(d, 8);
        case 'item': return u16(d, 10);
        case 'tid': return u16(d, 12);
        case 'sid': return u16(d, 14);
        case 'exp': return u32(d, 16);
        case 'friendship': return d[20];
        case 'ability': return d[21];
        case 'ev': return d[24 + i];
        case 'move': return u16(d, 40 + i * 2);
        case 'pp': return d[48 + i];
        case 'ppups': return d[52 + i];
        case 'iv': return (u32(d, 56) >>> (i * 5)) & 31;
        case 'egg': return (u32(d, 56) >>> 30) & 1;
        case 'nicknamed': return (u32(d, 56) >>> 31) & 1;
        case 'form': return d[64] >> 3;
        case 'gender': return (d[64] >> 1) & 3;
        case 'nick': return NDS.g4str(d, 72, 11);
        case 'ot': return NDS.g4str(d, 104, 8);
        case 'ball': return d[131];
        case 'metLevel': return d[132] & 127;
        case 'level': return d.length >= 236 ? d[140] : 0;
        case 'hp': return d.length >= 236 ? u16(d, 142) : 0;
        case 'status': return d.length >= 236 ? u32(d, 136) : 0;
      }
      return 0;
    },
    set: function (d, k, v, i) {
      var t;
      switch (k) {
        case 'pid': w32(d, 0, v); break;
        case 'species': w16(d, 8, v); break;
        case 'item': w16(d, 10, v); break;
        case 'tid': w16(d, 12, v); break;
        case 'sid': w16(d, 14, v); break;
        case 'exp': w32(d, 16, v); break;
        case 'friendship': d[20] = v; break;
        case 'ability': d[21] = v; break;
        case 'ev': d[24 + i] = v; break;
        case 'move': w16(d, 40 + i * 2, v); break;
        case 'pp': d[48 + i] = v; break;
        case 'ppups': d[52 + i] = v; break;
        case 'iv': t = u32(d, 56); t = (t & ~(31 << (i * 5))) >>> 0; w32(d, 56, (t | (v << (i * 5))) >>> 0); break;
        case 'egg': t = u32(d, 56); w32(d, 56, v ? (t | 0x40000000) >>> 0 : (t & ~0x40000000) >>> 0); break;
        case 'nicknamed': t = u32(d, 56); w32(d, 56, v ? (t | 0x80000000) >>> 0 : (t & 0x7FFFFFFF) >>> 0); break;
        case 'form': d[64] = (d[64] & 7) | (v << 3); break;
        case 'nick': d.set(enc4(v, 10, 11), 72); break;
        case 'ot': d.set(enc4(v, 7, 8), 104); break;
        case 'ball': d[131] = v; break;
        case 'level': d[140] = v; break;
        case 'hp': w16(d, 142, v); break;
        case 'status': w32(d, 136, v); break;
      }
    },
    setStats: function (d, st) { for (var i = 0; i < 6; i++) w16(d, 144 + i * 2, st[i]); if (u16(d, 142) > st[0]) w16(d, 142, st[0]); },
    stats: function (d) { var o = []; for (var i = 0; i < 6; i++) o.push(u16(d, 144 + i * 2)); return o; },
    nature: function (d) { return u32(d, 0) % 25; },
    natureIsPid: true
  };
  // Stat-Reihenfolge im Team (Gen 4): KP, Angr, Vert, Init, SpA, SpV  – genau wie unsere Basiswerte

  function crc16(u8, start, end) { return NDS.crc16(u8, start, end); }
  function open4(u8raw) {
    var u8 = u8raw;
    if (u8.length === 0x80000 + 0x7A) u8 = u8.subarray(0, 0x80000);
    else if (u8.length === 0x80000 + 0xA4) u8 = u8.subarray(0xA4);
    if (u8.length < 0x80000) return null;
    var key = null, g;
    ['DP', 'Pt', 'HGSS'].some(function (k) {
      var x = G4GAMES[k];
      var ok = function (end, size) { var m = u32(u8, end - 8); return u32(u8, end - 12) === size && (m === 0x20060623 || m === 0x20070903); };
      if (ok(x.gSize, x.gSize) || ok(0x40000 + x.gSize, x.gSize)) { key = k; g = x; return true; }
      return false;
    });
    if (!g) return null;
    var data = new Uint8Array(u8.subarray(0, 0x80000));
    function footerOk(end, size) { var m = u32(data, end - 8); return u32(data, end - 12) === size && (m === 0x20060623 || m === 0x20070903); }
    function newer(a, b) {
      if (a === 0xFFFFFFFF && b !== 0xFFFFFFFE) return 1;
      if (b === 0xFFFFFFFF && a !== 0xFFFFFFFE) return 0;
      return b > a ? 1 : a > b ? 0 : -1;
    }
    function active(begin, len) {
      var okA = footerOk(begin + len, len), okB = footerOk(0x40000 + begin + len, len);
      if (okA !== okB) return okA ? 0 : 0x40000;
      var o = begin + len - 0x14, r = newer(u32(data, o), u32(data, o + 0x40000));
      if (r < 0) r = newer(u32(data, o + 4), u32(data, o + 4 + 0x40000));
      return r === 1 ? 0x40000 : 0;
    }
    var gb = active(0, g.gSize), sb = active(g.sStart, g.sSize) + g.sStart;
    var hg = key === 'HGSS';
    var sv = { gen: 4, game: key, gameName: g.name, gameNameEn: g.nameEn, fmt: PK4, data: data, boxCount: 18, slotsPerBox: 30, ext: 'sav', partyMax: 6 };
    if (hg) { var ver = data[gb + g.trainer + 0x1C]; if (ver === 7) sv.gameName = sv.gameNameEn = 'HeartGold'; if (ver === 8) sv.gameName = sv.gameNameEn = 'SoulSilver'; }
    var to = gb + g.trainer;
    sv.getTrainer = function () {
      return { name: NDS.g4str(data, to, 8), tid: u16(data, to + 0x10), sid: u16(data, to + 0x12), money: u32(data, to + 0x14), gender: data[to + 0x18],
        hours: u16(data, gb + (hg ? 0x3BB0 : key === 'Pt' ? 0x3BB0 : 0x3BB0) * 0), minutes: 0, seconds: 0 };
    };
    sv.setTrainer = function (t) {
      data.set(enc4(t.name, 7, 8), to);
      w16(data, to + 0x10, t.tid); w16(data, to + 0x12, t.sid);
      w32(data, to + 0x14, Math.min(999999, t.money)); data[to + 0x18] = t.gender ? 1 : 0;
    };
    sv.partyCount = function () { return Math.min(6, data[gb + g.party - 4]); };
    sv.getParty = function () {
      var out = [], n = sv.partyCount();
      for (var i = 0; i < n; i++) out.push(PK4.decode(data, gb + g.party + i * 236, true));
      return out;
    };
    sv.setParty = function (list) {
      var packed = list.filter(Boolean), old = sv.partyCount();
      data[gb + g.party - 4] = packed.length;
      for (var i = 0; i < Math.max(packed.length, old); i++) {
        var o = gb + g.party + i * 236;
        if (packed[i]) PK4.encode(packed[i], data, o, true); else data.fill(0, o, o + 236);
      }
    };
    function boxOff(b, s) { return sb + g.box + b * g.stride + s * 136; }
    sv.getBoxMon = function (b, s) { return PK4.decode(data, boxOff(b, s), false); };
    sv.setBoxMon = function (b, s, d) { var o = boxOff(b, s); if (d) PK4.encode(d, data, o, false); else data.fill(0, o, o + 136); };
    sv.getBoxName = function (b) { return NDS.g4str(data, sb + g.names + b * 0x28, 20); };
    sv.growthOf = function (species) { var e = P.g4[species]; return e ? e[6] : 0; };
    sv.baseOf = function (species) { var e = P.g4[species]; return e ? e.slice(0, 6) : [50, 50, 50, 50, 50, 50]; };
    sv.natOf = function (s) { return s; };
    sv.speciesFromNat = function (n) { return n; };
    sv.maxSpecies = 493;
    sv.finish = function () {
      var out = new Uint8Array(data);
      [[gb, g.gSize], [sb, sb === g.sStart ? g.sSize : g.sSize]].forEach(function (x) {
        var start = x[0], size = x[1];
        w16(out, start + size - 2, crc16(out, start, start + size - g.footer));
      });
      return out;
    };
    return sv;
  }

  function open(buf) {
    var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return open3(u8) || open4(u8) || null;
  }

  window.CCSave = { open: open, expFor: expFor, levelFor: levelFor, calcStats: calcStats, NAT_MOD: NAT_MOD, PK3: PK3, PK4: PK4 };
})();
