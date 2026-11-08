// Save File Editor – Generation 6 (X/Y, Omega Rubin/Alpha Saphir) und Generation 7 (Sonne/Mond, Ultra Sonne/Ultra Mond), "main"-Datei.
// Formate nach PKHeX (kwsch/PKHeX, GPL-3.0): SAV6, SAV7, PK6, PK7, PokeCrypto, BlockInfo3DS (CRC16-Prüfsummen je Block).
(function () {
  'use strict';
  var NDS = window.NDS, P = window.PKPERSONAL, BL = window.PKBLOCKS67;
  if (!NDS || !P || !BL) return;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >>> 24) & 255; }

  // ---------------- Prüfsummen ----------------
  // Gen 6: CRC16-CCITT (PKHeX), Gen 7: CRC16 (reflektiert, Startwert 0xFFFF) invertiert
  var T7 = null;
  function crc7(u8, start, end) {
    if (!T7) { T7 = []; for (var i = 0; i < 256; i++) { var c = i; for (var k = 0; k < 8; k++) c = (c & 1) ? (c >>> 1) ^ 0xA001 : c >>> 1; T7.push(c); } }
    var chk = 0xFFFF;
    for (var j = start; j < end; j++) chk = T7[(u8[j] ^ chk) & 255] ^ (chk >>> 8);
    return (~chk) & 0xFFFF;
  }

  // ---------------- Text (UTF-16, 0-terminiert) ----------------
  var SPECIAL = { 0xE08E: '♂', 0xE08F: '♀', 0xE08A: '…' }, SPECIAL_REV = {};
  Object.keys(SPECIAL).forEach(function (k) { SPECIAL_REV[SPECIAL[k]] = +k; });
  function dec(u8, off, max) {
    var s = '';
    for (var i = 0; i < max; i++) { var c = u16(u8, off + i * 2); if (!c) break; s += SPECIAL[c] || String.fromCharCode(c); }
    return s;
  }
  function enc(str, max, bytes) {
    var out = new Uint8Array(bytes), n = 0;
    for (var i = 0; i < str.length && n < max; i++) { var ch = str.charAt(i); w16(out, n * 2, SPECIAL_REV[ch] || str.charCodeAt(i)); n++; }
    return out;
  }

  // ---------------- Verschlüsselung (PokeCrypto) ----------------
  function crypt(arr, start, end, seed) {
    seed = seed >>> 0;
    for (var i = start; i < end; i += 2) {
      seed = (Math.imul(0x41C64E6D, seed) + 0x6073) >>> 0;
      var x = seed >>> 16; arr[i] ^= x & 255; arr[i + 1] ^= x >> 8;
    }
  }
  var BP = window.NDS.BLOCK_POS;
  function decode(u8, off, party) {
    var len = party ? 260 : 232;
    if (off + len > u8.length) return null;
    var ec = u32(u8, off);
    if (!ec) return null;
    var e = u8.slice(off, off + len), sv = (ec >>> 13) & 31, i;
    crypt(e, 8, 232, ec);
    if (party) crypt(e, 232, 260, ec);
    var d = new Uint8Array(len);
    d.set(e.subarray(0, 8));
    for (var b = 0; b < 4; b++) { var src = BP[sv * 4 + b]; d.set(e.subarray(8 + src * 56, 64 + src * 56), 8 + b * 56); }
    if (party) d.set(e.subarray(232), 232);
    var sum = 0; for (i = 8; i < 232; i += 2) sum = (sum + u16(d, i)) & 0xFFFF;
    if (sum !== u16(d, 6)) return null;
    return d;
  }
  function encode(d, u8, off, party) {
    var len = party ? 260 : 232, ec = u32(d, 0), sv = (ec >>> 13) & 31, sum = 0, i;
    for (i = 8; i < 232; i += 2) sum = (sum + u16(d, i)) & 0xFFFF;
    w16(d, 6, sum);
    var e = new Uint8Array(len);
    e.set(d.subarray(0, 8));
    for (var b = 0; b < 4; b++) { var dst = BP[sv * 4 + b]; e.set(d.subarray(8 + b * 56, 64 + b * 56), 8 + dst * 56); }
    if (party) e.set(d.subarray(232, 260), 232);
    crypt(e, 8, 232, ec);
    if (party) crypt(e, 232, 260, ec);
    u8.set(e, off);
  }

  // ---------------- Pokémon (PK6 / PK7, gleiche Felder) ----------------
  function mk(gen) {
    var F = { gen: gen, size: 232, partySize: 260, natureIsPid: false, gen67: true, extras: true };
    F.decode = function (u8, off, party) {
      var d = decode(u8, off, party); if (!d) return null;
      var sp = u16(d, 8); if (!sp || sp > (gen === 6 ? 721 : 807)) return null;
      return d;
    };
    F.encode = encode;
    F.get = function (d, k, i) {
      switch (k) {
        case 'pokerus': return d[0x2B];
        case 'otGender': return d[0xDD] >> 7;
        case 'eggYear': return d[0xD1];
        case 'eggMonth': return d[0xD2];
        case 'eggDay': return d[0xD3];
        case 'metYear': return d[0xD4];
        case 'metMonth': return d[0xD5];
        case 'metDay': return d[0xD6];
        case 'contest': return d[0x24 + i];
        case 'metLoc': return u16(d, 0xDA);
        case 'eggLoc': return u16(d, 0xD8);
        case 'lang': return d[0xE3];
        case 'pid': return u32(d, 0x18);
        case 'ec': return u32(d, 0);
        case 'species': return u16(d, 8);
        case 'item': return u16(d, 0x0A);
        case 'tid': return u16(d, 0x0C);
        case 'sid': return u16(d, 0x0E);
        case 'exp': return u32(d, 0x10);
        case 'ability': return d[0x14];
        case 'abilityNum': return d[0x15];
        case 'hiddenAbility': return d[0x15] === 4 ? 1 : 0;
        case 'nature': return d[0x1C];
        case 'gender': return (d[0x1D] >> 1) & 3;
        case 'form': return d[0x1D] >> 3;
        case 'ev': return d[0x1E + i];
        case 'move': return u16(d, 0x5A + i * 2);
        case 'pp': return d[0x62 + i];
        case 'ppups': return d[0x66 + i];
        case 'iv': return (u32(d, 0x74) >>> (i * 5)) & 31;
        case 'egg': return (u32(d, 0x74) >>> 30) & 1;
        case 'nicknamed': return (u32(d, 0x74) >>> 31) & 1;
        case 'nick': return dec(d, 0x40, 12);
        case 'ot': return dec(d, 0xB0, 12);
        case 'friendship': return d[0xCA];
        case 'ball': return d[0xDC];
        case 'metLevel': return d[0xDD] & 127;
        case 'level': return d.length >= 260 ? d[0xEC] : 0;
        case 'hp': return d.length >= 260 ? u16(d, 0xF0) : 0;
      }
      return 0;
    };
    F.set = function (d, k, v, i) {
      var t;
      switch (k) {
        case 'pokerus': d[0x2B] = v; break;
        case 'otGender': d[0xDD] = (d[0xDD] & 0x7F) | ((v & 1) << 7); break;
        case 'metLevel': d[0xDD] = (d[0xDD] & 0x80) | (v & 127); break;
        case 'eggYear': d[0xD1] = v; break;
        case 'eggMonth': d[0xD2] = v; break;
        case 'eggDay': d[0xD3] = v; break;
        case 'metYear': d[0xD4] = v; break;
        case 'metMonth': d[0xD5] = v; break;
        case 'metDay': d[0xD6] = v; break;
        case 'contest': d[0x24 + i] = v; break;
        case 'metLoc': w16(d, 0xDA, v); break;
        case 'eggLoc': w16(d, 0xD8, v); break;
        case 'lang': d[0xE3] = v; break;
        case 'pid': w32(d, 0x18, v); break;
        case 'ec': w32(d, 0, v); break;
        case 'species': w16(d, 8, v); break;
        case 'item': w16(d, 0x0A, v); break;
        case 'tid': w16(d, 0x0C, v); break;
        case 'sid': w16(d, 0x0E, v); break;
        case 'exp': w32(d, 0x10, v); break;
        case 'ability': d[0x14] = v; break;
        case 'abilityNum': d[0x15] = v; break;
        case 'hiddenAbility': d[0x15] = v ? 4 : 1; break;
        case 'nature': d[0x1C] = v; break;
        case 'gender': d[0x1D] = (d[0x1D] & ~6) | (v << 1); break;
        case 'form': d[0x1D] = (d[0x1D] & 7) | (v << 3); break;
        case 'ev': d[0x1E + i] = v; break;
        case 'move': w16(d, 0x5A + i * 2, v); break;
        case 'pp': d[0x62 + i] = v; break;
        case 'ppups': d[0x66 + i] = v; break;
        case 'iv': t = u32(d, 0x74); t = (t & ~(31 << (i * 5))) >>> 0; w32(d, 0x74, (t | (v << (i * 5))) >>> 0); break;
        case 'egg': t = u32(d, 0x74); w32(d, 0x74, v ? (t | 0x40000000) >>> 0 : (t & ~0x40000000) >>> 0); break;
        case 'nicknamed': t = u32(d, 0x74); w32(d, 0x74, v ? (t | 0x80000000) >>> 0 : (t & 0x7FFFFFFF) >>> 0); break;
        case 'nick': d.set(enc(v, 12, 0x1A), 0x40); break;
        case 'ot': d.set(enc(v, 12, 0x1A), 0xB0); break;
        case 'friendship': d[0xCA] = v; break;
        case 'ball': d[0xDC] = v; break;
        case 'level': d[0xEC] = v; break;
        case 'hp': w16(d, 0xF0, v); break;
      }
    };
    F.nature = function (d) { return d[0x1C]; };
    F.setStats = function (d, st) {
      w16(d, 0xF2, st[0]); w16(d, 0xF4, st[1]); w16(d, 0xF6, st[2]); w16(d, 0xF8, st[3]); w16(d, 0xFA, st[4]); w16(d, 0xFC, st[5]);
      if (u16(d, 0xF0) > st[0]) w16(d, 0xF0, st[0]);
    };
    F.stats = function (d) { return [u16(d, 0xF2), u16(d, 0xF4), u16(d, 0xF6), u16(d, 0xF8), u16(d, 0xFA), u16(d, 0xFC)]; };
    return F;
  }
  var PK6 = mk(6), PK7 = mk(7);

  // ---------------- Spielstand ----------------
  var GAMES = {
    xy: { gen: 6, size: 0x65600, name: 'X/Y', nameEn: 'X/Y', trainer: 17, misc: 11, party: 18, boxLayout: 12, box: 53, boxes: 31, otOff: 0x48, moneyOff: 0x8, maxSpecies: 721, maxMove: 617, maxItem: 717, maxAbility: 191, version: 24 },
    ao: { gen: 6, size: 0x76000, name: 'Omega Rubin/Alpha Saphir', nameEn: 'Omega Ruby/Alpha Sapphire', trainer: 17, misc: 11, party: 18, boxLayout: 12, box: 56, boxes: 31, otOff: 0x48, moneyOff: 0x8, maxSpecies: 721, maxMove: 621, maxItem: 775, maxAbility: 191, version: 27 },
    sm: { gen: 7, size: 0x6BE00, name: 'Sonne/Mond', nameEn: 'Sun/Moon', trainer: 3, misc: 9, party: 4, boxLayout: 13, box: 14, boxes: 32, otOff: 0x38, moneyOff: 0x4, maxSpecies: 802, maxMove: 719, maxItem: 920, maxAbility: 233, version: 30 },
    usum: { gen: 7, size: 0x6CC00, name: 'Ultra Sonne/Ultra Mond', nameEn: 'Ultra Sun/Ultra Moon', trainer: 3, misc: 9, party: 4, boxLayout: 13, box: 14, boxes: 32, otOff: 0x38, moneyOff: 0x4, maxSpecies: 807, maxMove: 728, maxItem: 959, maxAbility: 233, version: 32 }
  };
  function open(u8raw) {
    var u8 = u8raw, key = null;
    Object.keys(GAMES).some(function (k) { if (u8.length === GAMES[k].size && u32(u8, u8.length - 0x1F0) === 0x42454546) { key = k; return true; } return false; });
    if (!key) return null;
    var g = GAMES[key], blocks = BL[key], meta = g.size - 0x200, data = new Uint8Array(u8), F = g.gen === 6 ? PK6 : PK7;
    var tr = blocks[g.trainer][0], misc = blocks[g.misc][0], party = blocks[g.party][0], box = blocks[g.box][0], bl = blocks[g.boxLayout][0];
    var sv = { gen: g.gen, game: key, gameName: g.name, gameNameEn: g.nameEn, fmt: F, data: data, boxCount: g.boxes, slotsPerBox: 30, ext: 'sav', partyMax: 6, gb: false };
    sv.blocks = blocks;
    sv.getTrainer = function () { return { name: dec(data, tr + g.otOff, 12), tid: u16(data, tr), sid: u16(data, tr + 2), gender: data[tr + 5], money: u32(data, misc + g.moneyOff), hours: 0, minutes: 0, seconds: 0 }; };
    sv.setTrainer = function (t) {
      data.set(enc(t.name, 12, 0x1A), tr + g.otOff); w16(data, tr, t.tid); w16(data, tr + 2, t.sid); data[tr + 5] = t.gender ? 1 : 0;
      w32(data, misc + g.moneyOff, Math.min(t.money, 9999999));
    };
    sv.partyCount = function () { return Math.min(6, data[party + 6 * 260]); };
    sv.getParty = function () { var out = [], n = sv.partyCount(); for (var i = 0; i < n; i++) out.push(F.decode(data, party + i * 260, true)); return out; };
    sv.setParty = function (list) {
      var packed = list.filter(Boolean), old = sv.partyCount();
      data[party + 6 * 260] = packed.length;
      for (var i = 0; i < Math.max(packed.length, old, 6); i++) {
        var o = party + i * 260;
        if (packed[i]) F.encode(packed[i], data, o, true); else data.fill(0, o, o + 260);
      }
    };
    function off(b, s) { return box + (b * 30 + s) * 232; }
    sv.getBoxMon = function (b, s) { return F.decode(data, off(b, s), false); };
    sv.setBoxMon = function (b, s, d) { var o = off(b, s); if (d) F.encode(d, data, o, false); else data.fill(0, o, o + 232); };
    sv.getBoxName = function (b) { return dec(data, bl + b * 0x22, 16); };
    sv.setBoxName = function (b, name) { data.fill(0, bl + b * 0x22, bl + b * 0x22 + 0x22); data.set(enc(name, 14, 0x20), bl + b * 0x22); };
    var tab = P['g' + g.gen];
    sv.growthOf = function (sp) { var e = tab[sp]; return e ? e[6] : 0; };
    sv.baseOf = function (sp) { var e = tab[sp]; return e ? e.slice(0, 6) : [50, 50, 50, 50, 50, 50]; };
    sv.natOf = function (n) { return n; }; sv.speciesFromNat = function (n) { return n; };
    sv.maxSpecies = g.maxSpecies; sv.maxMove = g.maxMove; sv.maxItem = g.maxItem; sv.maxAbility = g.maxAbility; sv.items = 'items';
    sv.finish = function () {
      var out = new Uint8Array(data), crc = g.gen === 6 ? function (a, s, e) { return NDS.crc16(a, s, e); } : crc7;
      for (var i = 0; i < blocks.length; i++) w16(out, meta + 0x14 + i * 8 + 6, crc(out, blocks[i][0], blocks[i][0] + blocks[i][1]));
      return out;
    };
    // Neues Pokémon (Gen 6/7)
    sv.blank = function (species, t) {
      var d = new Uint8Array(260), rnd = function () { return ((Math.random() * 0x10000) << 16 | (Math.random() * 0x10000)) >>> 0; };
      F.set(d, 'ec', rnd()); F.set(d, 'pid', rnd()); F.set(d, 'species', species); F.set(d, 'tid', t.tid); F.set(d, 'sid', t.sid);
      var pe = tab[species] || [], gr = pe[6] || 0;
      F.set(d, 'exp', window.CCSave.expFor(gr, 5)); F.set(d, 'ability', pe[8] || 1); F.set(d, 'abilityNum', 1);
      for (var i = 0; i < 6; i++) F.set(d, 'iv', 31, i);
      F.set(d, 'friendship', 70); F.set(d, 'ot', t.name); d[0xDD] = 5 | ((t.gender ? 1 : 0) << 7);
      F.set(d, 'ball', 4); d[0xDF] = g.version; d[0xE3] = 2; d[0x93] = 0; F.set(d, 'level', 5);
      F.set(d, 'move', 1, 0); F.set(d, 'pp', 35, 0);
      var gr2 = pe[7]; F.set(d, 'gender', gr2 === 255 ? 2 : gr2 === 254 ? 1 : gr2 === 0 ? 0 : ((F.get(d, 'pid') & 0xFF) < gr2 ? 1 : 0));
      return d;
    };
    return sv;
  }

  window.CCSave3DS = { open: open, PK6: PK6, PK7: PK7, crc7: crc7 };
})();
