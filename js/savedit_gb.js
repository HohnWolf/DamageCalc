// Save File Editor – Generation 1 (Rot/Blau/Gelb) und Generation 2 (Gold/Silber/Kristall), internationale Spielstände (.sav, 32 KB).
// Formate nach PKHeX (kwsch/PKHeX, GPL-3.0): SAV1, SAV2, PK1, PK2, PokeList1/2, StringConverter1.
// Pokémon werden im Editor als Byte-Feld gehalten: [gespeichertes Pokémon (+ Teamwerte)] [Spitzname 11] [Ursprungstrainer 11] [Ei-Flag].
(function () {
  'use strict';
  var GB = window.PKGB, P = window.PKPERSONAL;
  if (!GB || !P) return;

  // ---------------- Zeichensatz (StringConverter1, international) ----------------
  var TABLE = [];
  // Lage nach PKHeX-Tabelle (Zeile für Zeile)
  (function () {
    var rows = {
      0x80: 'ABCDEFGHIJKLMNOP', 0x90: 'QRSTUVWXYZ():;[]', 0xA0: 'abcdefghijklmnop', 0xB0: 'qrstuvwxyzàèéùÀÁ',
      0xC0: 'ÄÖÜäöüÈÉÌÍÑÒÓÙÚá', 0xD0: 'ìíñòóúº\u0000\u0000\u0000\u0000\u0000\u0000\u0000←\'', 0xE0: '’\u0000\u0000-\u0000\u0000?!․&é→▷▶▼♂',
      0xF0: '¥×./,♀0123456789'
    };
    for (var i = 0; i < 256; i++) TABLE[i] = '';
    Object.keys(rows).forEach(function (k) { var s = rows[k]; for (var j = 0; j < s.length; j++) TABLE[+k + j] = s.charAt(j) === '\u0000' ? '' : s.charAt(j); });
    TABLE[0x7F] = ' ';
  })();
  var ENC = {};
  for (var ti = 0; ti < 256; ti++) if (TABLE[ti] && !(TABLE[ti] in ENC)) ENC[TABLE[ti]] = ti;
  function decStr(u8, off, len) {
    var s = '';
    for (var i = 0; i < len; i++) { var b = u8[off + i]; if (b === 0x50 || b === 0) break; s += TABLE[b] || ''; }
    return s;
  }
  function encStr(str, max, size) { // feste Länge, 0x50-Terminator, Rest 0
    var out = new Uint8Array(size), n = 0;
    for (var i = 0; i < str.length && n < max; i++) { var c = ENC[str.charAt(i)]; if (c === undefined) c = ENC[str.charAt(i).toUpperCase()]; if (c !== undefined) out[n++] = c; }
    out[n] = 0x50;
    return out;
  }

  // ---------------- Berechnungen ----------------
  function bcd(u8, off, n) { var v = 0; for (var i = 0; i < n; i++) v = v * 100 + (u8[off + i] >> 4) * 10 + (u8[off + i] & 15); return v; }
  function wbcd(u8, off, n, v) { for (var i = n - 1; i >= 0; i--) { var d = v % 100; v = Math.floor(v / 100); u8[off + i] = ((Math.floor(d / 10)) << 4) | (d % 10); } }
  function be16(b, o) { return (b[o] << 8) | b[o + 1]; }
  function wbe16(b, o, v) { b[o] = (v >> 8) & 255; b[o + 1] = v & 255; }
  function isqrtCeil(n) { var r = Math.ceil(Math.sqrt(n)); return r > 255 ? 255 : r; }
  function statExpBonus(se) { return Math.floor(isqrtCeil(se) / 4); }
  // Gen 1/2: Reihenfolge der Werte KP, Angr, Vert, Init, Spezial (SpA = SpV)
  function calc(base, level, dv, se) {
    var hpDv = ((dv[0] & 1) << 3) | ((dv[1] & 1) << 2) | ((dv[2] & 1) << 1) | (dv[3] & 1);
    var out = [Math.floor(((base[0] + hpDv) * 2 + statExpBonus(se[0])) * level / 100) + level + 10];
    var map = [[1, 0], [2, 1], [3, 2], [4, 3]];
    for (var i = 0; i < 4; i++) out.push(Math.floor(((base[map[i][0]] + dv[map[i][1]]) * 2 + statExpBonus(se[i + 1])) * level / 100) + 5);
    return out; // KP, Angr, Vert, Init, Spezial
  }
  function expForGB(growth, n) { return window.CCSave.expFor(growth, n); }

  // ---------------- Pokémon-Formate ----------------
  // Gemeinsame Schnittstelle (wie savedit.js): get/set(d, key, value, index). Arten sind Pokédex-Nummern.
  function mk(gen) {
    var STORED = gen === 1 ? 33 : 32, PARTY = gen === 1 ? 44 : 48, NICK = PARTY, OT = PARTY + 11, EGG = PARTY + 22, SIZE = PARTY + 23;
    var F = { gen: gen, gb: true, size: SIZE, partySize: SIZE, STORED: STORED, PARTY: PARTY, NICK: NICK, OT: OT, EGG: EGG };
    F.get = function (d, k, i) {
      var j;
      switch (k) {
        case 'species': return gen === 1 ? (GB.toNat[d[0]] || 0) : d[0];
        case 'item': return gen === 1 ? 0 : d[1];
        case 'move': return d[gen === 1 ? 8 + i : 2 + i];
        case 'pp': return d[gen === 1 ? 29 + i : 23 + i] & 63;
        case 'ppups': return d[gen === 1 ? 29 + i : 23 + i] >> 6;
        case 'tid': return gen === 1 ? be16(d, 12) : be16(d, 6);
        case 'sid': return 0;
        case 'exp': j = gen === 1 ? 14 : 8; return (d[j] << 16) | (d[j + 1] << 8) | d[j + 2];
        case 'ev': j = gen === 1 ? 17 : 11; return be16(d, j + i * 2); // Reihenfolge KP, Angr, Vert, Init, Spezial
        case 'dv': j = gen === 1 ? 27 : 21; return i === 0 ? d[j] >> 4 : i === 1 ? d[j] & 15 : i === 2 ? d[j + 1] >> 4 : d[j + 1] & 15; // Angr, Vert, Init, Spezial
        case 'friendship': return gen === 1 ? 0 : d[27];
        case 'level': return gen === 1 ? (d[33] || d[3]) : d[31];
        case 'hp': return be16(d, 1);
        case 'maxhp': return be16(d, gen === 1 ? 34 : 36);
        case 'nick': return decStr(d, NICK, 11);
        case 'ot': return decStr(d, OT, 11);
        case 'egg': return d[EGG];
      }
      return 0;
    };
    F.set = function (d, k, v, i) {
      var j;
      switch (k) {
        case 'species':
          if (gen === 1) {
            d[0] = GB.toInt[v] || 0; var ty = GB.types[v] || [0, 0]; d[5] = ty[0]; d[6] = ty[1]; d[7] = GB.catchRate[v] || 0;
          } else d[0] = v;
          break;
        case 'item': if (gen === 2) d[1] = v; break;
        case 'move': d[gen === 1 ? 8 + i : 2 + i] = v; break;
        case 'pp': j = gen === 1 ? 29 + i : 23 + i; d[j] = (d[j] & 0xC0) | (v & 63); break;
        case 'ppups': j = gen === 1 ? 29 + i : 23 + i; d[j] = (d[j] & 63) | (v << 6); break;
        case 'tid': wbe16(d, gen === 1 ? 12 : 6, v); break;
        case 'exp': j = gen === 1 ? 14 : 8; d[j] = (v >> 16) & 255; d[j + 1] = (v >> 8) & 255; d[j + 2] = v & 255; break;
        case 'ev': j = gen === 1 ? 17 : 11; wbe16(d, j + i * 2, v); break;
        case 'dv':
          j = gen === 1 ? 27 : 21;
          if (i === 0) d[j] = (d[j] & 15) | (v << 4); else if (i === 1) d[j] = (d[j] & 0xF0) | v;
          else if (i === 2) d[j + 1] = (d[j + 1] & 15) | (v << 4); else d[j + 1] = (d[j + 1] & 0xF0) | v;
          break;
        case 'friendship': if (gen === 2) d[27] = v; break;
        case 'level': if (gen === 1) { d[3] = v; d[33] = v; } else d[31] = v; break;
        case 'hp': wbe16(d, 1, v); break;
        case 'nick': d.set(encStr(v, 10, 11), NICK); break;
        case 'ot': d.set(encStr(v, 7, 11), OT); break;
        case 'egg': d[EGG] = v ? 1 : 0; break;
      }
    };
    F.setStats = function (d, st) { // KP, Angr, Vert, Init, Spezial
      if (gen === 1) { wbe16(d, 34, st[0]); wbe16(d, 36, st[1]); wbe16(d, 38, st[2]); wbe16(d, 40, st[3]); wbe16(d, 42, st[4]); }
      else { wbe16(d, 36, st[0]); wbe16(d, 38, st[1]); wbe16(d, 40, st[2]); wbe16(d, 42, st[3]); wbe16(d, 44, st[4]); wbe16(d, 46, st[4]); }
    };
    F.stats = function (d) {
      if (gen === 1) return [be16(d, 34), be16(d, 36), be16(d, 38), be16(d, 40), be16(d, 42)];
      return [be16(d, 36), be16(d, 38), be16(d, 40), be16(d, 42), be16(d, 44)];
    };
    F.shiny = function (d) { // nur Gen 2
      if (gen !== 2) return false;
      var a = F.get(d, 'dv', 0);
      return F.get(d, 'dv', 1) === 10 && F.get(d, 'dv', 2) === 10 && F.get(d, 'dv', 3) === 10 && [2, 3, 6, 7, 10, 11, 14, 15].indexOf(a) >= 0;
    };
    F.setShiny = function (d, on) {
      if (gen !== 2) return;
      if (on) { F.set(d, 'dv', 10, 1); F.set(d, 'dv', 10, 2); F.set(d, 'dv', 10, 3); if ([2, 3, 6, 7, 10, 11, 14, 15].indexOf(F.get(d, 'dv', 0)) < 0) F.set(d, 'dv', 10, 0); }
      else if (F.shiny(d)) F.set(d, 'dv', 9, 1);
    };
    F.blank = function (species, tid, otName, level) {
      var d = new Uint8Array(SIZE), g = (P.g2 && P.g2[species]) || [50, 50, 50, 50, 50, 50, 0];
      F.set(d, 'species', species); F.set(d, 'tid', tid);
      F.set(d, 'nick', ''); F.set(d, 'ot', otName);
      var gr = gen === 1 ? (P.g1[species] || g)[6] : g[6];
      F.set(d, 'level', level || 5); F.set(d, 'exp', expForGB(gr, level || 5));
      for (var i = 0; i < 4; i++) F.set(d, 'dv', 8, i);
      F.set(d, 'move', 33, 0); F.set(d, 'pp', 35, 0);
      if (gen === 2) { d[27] = 70; }
      return d;
    };
    return F;
  }
  var PK1 = mk(1), PK2 = mk(2);

  // ---------------- Pokémon-Listen (PokeList1/2) ----------------
  // Liest eine Liste: [Anzahl][Arten × cap][0xFF][Pokémon × cap][OT × cap][Spitzname × cap]
  function unpack(F, u8, off, cap, party) {
    var n = Math.min(u8[off], cap), out = [], mon = party ? F.PARTY : F.STORED;
    var mOff = off + cap + 2, oOff = mOff + cap * mon, nOff = oOff + cap * 11;
    for (var i = 0; i < n; i++) {
      var d = new Uint8Array(F.size), sp = u8[off + 1 + i];
      d.set(u8.subarray(mOff + i * mon, mOff + (i + 1) * mon), 0);
      if (!d[0]) d[0] = sp === 0xFD || sp === 0xFF ? 0 : sp;
      if (F.gen === 1 && (!d[0] || d[0] > 190)) { out.push(null); continue; }
      if (F.gen === 2 && (!d[0] || d[0] > 251) && sp !== 0xFD) { out.push(null); continue; }
      d.set(u8.subarray(nOff + i * 11, nOff + (i + 1) * 11), F.NICK);
      d.set(u8.subarray(oOff + i * 11, oOff + (i + 1) * 11), F.OT);
      if (F.gen === 2 && sp === 0xFD) d[F.EGG] = 1;
      if (F.gen === 1 && !party) d[33] = d[3]; // Boxlevel
      out.push(d);
    }
    return out;
  }
  function pack(F, list, u8, off, cap, party) {
    var mon = party ? F.PARTY : F.STORED, packed = list.filter(Boolean).slice(0, cap), i;
    var mOff = off + cap + 2, oOff = mOff + cap * mon, nOff = oOff + cap * 11;
    u8.fill(0, off, nOff + cap * 11);
    u8[off] = packed.length;
    for (i = 0; i < packed.length; i++) {
      var d = packed[i], sp = d[0];
      u8[off + 1 + i] = F.gen === 2 && d[F.EGG] ? 0xFD : sp;
      u8.set(d.subarray(0, mon), mOff + i * mon);
      u8.set(d.subarray(F.OT, F.OT + 11), oOff + i * 11);
      u8.set(d.subarray(F.NICK, F.NICK + 11), nOff + i * 11);
    }
    u8[off + 1 + packed.length] = 0xFF;
    for (i = packed.length + 1; i <= cap; i++) u8[off + 1 + i] = 0;
    // restliche Namen als Terminator
    for (i = packed.length; i < cap; i++) { u8[oOff + i * 11] = 0x50; u8[nOff + i * 11] = 0x50; }
  }
  function listOk(u8, off, max) { var c = u8[off]; return c <= max && u8[off + 1 + c] === 0xFF; }

  // ---------------- Generation 1 ----------------
  var I1 = { OT: 0x2598, Money: 0x25F3, TID: 0x2605, CurrentBoxIndex: 0x284C, Coin: 0x2850, Party: 0x2F2C, CurrentBox: 0x30C0, Check: 0x3523, Starter: 0x29C3, PikaFr: 0x271C };
  function sum1(u8) { var s = 0; for (var i = I1.OT; i < I1.Check; i++) s = (s + u8[i]) & 255; return (~s) & 255; }
  function open1(u8) {
    if (u8.length !== 0x8000) return null;
    if (!(listOk(u8, I1.Party, 6) && listOk(u8, I1.CurrentBox, 20))) return null;
    var data = new Uint8Array(u8), sumOk = sum1(data) === data[I1.Check];
    var yellow = data[I1.Starter] ? data[I1.Starter] === 0x54 : data[I1.PikaFr] !== 0;
    var sv = { gen: 1, game: yellow ? 'Y' : 'RB', gameName: yellow ? 'Gelb' : 'Rot/Blau', gameNameEn: yellow ? 'Yellow' : 'Red/Blue', fmt: PK1, data: data, boxCount: 12, slotsPerBox: 20, partyMax: 6, ext: 'sav', gb: true, checksumOk: sumOk };
    var cur = data[I1.CurrentBoxIndex] & 0x7F, init = (data[I1.CurrentBoxIndex] & 0x80) !== 0;
    var boxes = [], party = unpack(PK1, data, I1.Party, 6, true), i;
    function boxOff(b) { return b < 6 ? 0x4000 + b * 0x462 : 0x6000 + (b - 6) * 0x462; }
    for (i = 0; i < 12; i++) {
      if (i === cur) boxes.push(unpack(PK1, data, I1.CurrentBox, 20, false));
      else boxes.push(init ? unpack(PK1, data, boxOff(i), 20, false) : []);
    }
    sv.getTrainer = function () { return { name: decStr(data, I1.OT, 11), tid: be16(data, I1.TID), sid: 0, gender: 0, money: bcd(data, I1.Money, 3), noSid: true, noGender: true, hours: 0, minutes: 0, seconds: 0 }; };
    sv.setTrainer = function (t) { data.set(encStr(t.name, 7, 11), I1.OT); wbe16(data, I1.TID, t.tid); wbcd(data, I1.Money, 3, Math.min(999999, t.money)); };
    sv.partyCount = function () { return party.length; };
    sv.getParty = function () { return party.map(function (d) { return d ? new Uint8Array(d) : null; }); };
    sv.setParty = function (list) { party = list.filter(Boolean).slice(0, 6); };
    sv.getBoxMon = function (b, s) { var d = boxes[b] && boxes[b][s]; return d ? new Uint8Array(d) : null; };
    sv.setBoxMon = function (b, s, d) {
      var l = boxes[b].slice(); while (l.length < s) l.push(null);
      if (d) { if (s < l.length) l[s] = d; else l.push(d); } else if (s < l.length) l.splice(s, 1);
      boxes[b] = l.filter(Boolean);
    };
    // Gen 1 kennt keine freien Plätze in der Box: neue Pokémon rutschen ans Ende der Liste
    sv.getBoxName = function (b) { return ''; };
    sv.growthOf = function (sp) { var e = P.g1[sp]; return e ? e[6] : 0; };
    sv.baseOf = function (sp) { var e = P.g1[sp]; return e ? e.slice(0, 5) : [50, 50, 50, 50, 50]; };
    sv.natOf = function (n) { return n; }; sv.speciesFromNat = function (n) { return n; };
    sv.maxSpecies = 151; sv.maxMove = 165; sv.maxItem = 255; sv.maxAbility = 0; sv.items = 'items1';
    sv.finish = function () {
      var out = new Uint8Array(data), c = cur;
      var hasOther = boxes.some(function (b, k) { return k !== cur && b.length; });
      if (!init && hasOther) { init = true; }
      out[I1.CurrentBoxIndex] = (c & 0x7F) | (init ? 0x80 : 0);
      for (var b = 0; b < 12; b++) {
        var o = boxOff(b);
        if (init || b === cur) pack(PK1, boxes[b], out, o, 20, false);
        if (b === cur) pack(PK1, boxes[b], out, I1.CurrentBox, 20, false);
      }
      pack(PK1, party, out, I1.Party, 6, true);
      out[I1.Check] = sum1(out);
      return out;
    };
    return sv;
  }

  // ---------------- Generation 2 ----------------
  var I2 = {
    GS: { Party: 0x288A, CurrentBox: 0x2D6C, BoxNames: 0x2727, CurrentBoxIndex: 0x2724, Money: 0x23DB, End: 0x2D68, Sum1: 0x2D69, Sum2: 0x7E6D, Gender: -1 },
    C: { Party: 0x2865, CurrentBox: 0x2D10, BoxNames: 0x2703, CurrentBoxIndex: 0x2700, Money: 0x23DC, End: 0x2B82, Sum1: 0x2D0D, Sum2: 0x1F0D, Gender: 0x3E3D }
  };
  function sum2(u8, o) { var s = 0; for (var i = 0x2009; i <= o.End; i++) s = (s + u8[i]) & 0xFFFF; return s; }
  function open2(u8) {
    if (u8.length !== 0x8000) return null;
    var key = null, o;
    ['C', 'GS'].some(function (k) {
      var x = I2[k]; if (!(listOk(u8, x.Party, 6) && listOk(u8, x.CurrentBox, 20))) return false;
      if (sum2(u8, x) === (u8[x.Sum1] | (u8[x.Sum1 + 1] << 8))) { key = k; o = x; return true; }
      return false;
    });
    if (!key) return null;
    var crystal = key === 'C', data = new Uint8Array(u8);
    var sv = { gen: 2, game: crystal ? 'C' : 'GS', gameName: crystal ? 'Kristall' : 'Gold/Silber', gameNameEn: crystal ? 'Crystal' : 'Gold/Silver', fmt: PK2, data: data, boxCount: 14, slotsPerBox: 20, partyMax: 6, ext: 'sav', gb: true, checksumOk: true };
    function boxOff(b) { return b < 7 ? 0x4000 + b * 0x450 : 0x6000 + (b - 7) * 0x450; }
    var party = unpack(PK2, data, o.Party, 6, true), boxes = [], b;
    for (b = 0; b < 14; b++) boxes.push(unpack(PK2, data, boxOff(b), 20, false));
    var cur = data[o.CurrentBoxIndex] & 0x7F;
    sv.getTrainer = function () {
      return { name: decStr(data, 0x200B, 11), tid: be16(data, 0x2009), sid: 0, gender: crystal ? data[o.Gender] : 0, noSid: true, noGender: !crystal,
        money: (data[o.Money] << 16) | (data[o.Money + 1] << 8) | data[o.Money + 2], hours: 0, minutes: 0, seconds: 0 };
    };
    sv.setTrainer = function (t) {
      data.set(encStr(t.name, 7, 11), 0x200B); wbe16(data, 0x2009, t.tid);
      var m = Math.min(999999, t.money); data[o.Money] = (m >> 16) & 255; data[o.Money + 1] = (m >> 8) & 255; data[o.Money + 2] = m & 255;
      if (crystal) data[o.Gender] = t.gender ? 1 : 0;
    };
    sv.partyCount = function () { return party.length; };
    sv.getParty = function () { return party.map(function (d) { return d ? new Uint8Array(d) : null; }); };
    sv.setParty = function (list) { party = list.filter(Boolean).slice(0, 6); };
    sv.getBoxMon = function (bx, s) { var d = boxes[bx] && boxes[bx][s]; return d ? new Uint8Array(d) : null; };
    sv.setBoxMon = function (bx, s, d) {
      var l = boxes[bx].slice();
      if (d) { if (s < l.length) l[s] = d; else l.push(d); } else if (s < l.length) l.splice(s, 1);
      boxes[bx] = l.filter(Boolean);
    };
    sv.getBoxName = function (bx) { return decStr(data, o.BoxNames + bx * 9, 9); };
    sv.setBoxName = function (bx, name) { data.set(encStr(name, 8, 9), o.BoxNames + bx * 9); };
    sv.growthOf = function (sp) { var e = P.g2[sp]; return e ? e[6] : 0; };
    sv.baseOf = function (sp) { var e = P.g2[sp]; return e ? e.slice(0, 6) : [50, 50, 50, 50, 50, 50]; };
    sv.natOf = function (n) { return n; }; sv.speciesFromNat = function (n) { return n; };
    sv.maxSpecies = 251; sv.maxMove = 251; sv.maxItem = 255; sv.maxAbility = 0; sv.items = 'items2';
    sv.finish = function () {
      var out = new Uint8Array(data), bx;
      for (bx = 0; bx < 14; bx++) {
        pack(PK2, boxes[bx], out, boxOff(bx), 20, false);
        if (bx === cur) pack(PK2, boxes[bx], out, o.CurrentBox, 20, false);
      }
      pack(PK2, party, out, o.Party, 6, true);
      var s = sum2(out, o); out[o.Sum1] = s & 255; out[o.Sum1 + 1] = s >> 8; out[o.Sum2] = s & 255; out[o.Sum2 + 1] = s >> 8;
      // Sicherungskopien der Daten (wie PKHeX)
      if (crystal) out.set(out.subarray(0x2009, 0x2009 + 0xB7A), 0x1209);
      else {
        out.set(out.subarray(0x2009, 0x222F), 0x15C7); out.set(out.subarray(0x222F, 0x23D9), 0x3D69); out.set(out.subarray(0x23D9, 0x2856), 0x0C6B);
        out.set(out.subarray(0x2856, 0x288A), 0x7E39); out.set(out.subarray(0x288A, 0x2D69), 0x10E8);
      }
      return out;
    };
    return sv;
  }

  window.CCSaveGB = { open1: open1, open2: open2, PK1: PK1, PK2: PK2, calc: calc, expForGB: expForGB, decStr: decStr, encStr: encStr };
})();
