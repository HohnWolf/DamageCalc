// Save File Editor – Ruhmeshalle (Hall of Fame) nach PKHeX (GPLv3): Gen 1, 3, 4 und 6 lesen und die Einträge löschen.
// sv.hof = { clears, entries(): [{ date, n, team: [{ species, level, nick, shiny, moves }] }], clear() }  (neueste zuerst)
(function () {
  'use strict';
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >>> 8) & 255; b[o + 2] = (v >>> 16) & 255; b[o + 3] = (v >>> 24) & 255; }
  function shiny(tid, sid, pid) { return (((tid ^ sid) ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) < 8; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function crc16(b, s, e) { var c = 0xFFFF; for (var i = s; i < e; i++) { c ^= b[i] << 8; for (var k = 0; k < 8; k++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c; }

  window.CCSaveHof = function (sv) {
    var data = sv.data, gen = sv.gen, G3 = window.GEN3, NDS = window.NDS;
    if (gen === 1 && sv.decStr && window.PKGB && data.length >= 0x2900) {
      // Gen 1 (PKHeX HallOfFameReader1): 50 Teams x 6 Plätze x 0x10 Byte ab 0x598 (Art intern, Level, Spitzname 11 Byte); Zähler bei 0x284E, älteste Teams zuerst
      var HB1 = 0x598, EN1 = 0x10, TEAM1 = 6 * EN1, CNT1 = 0x284E;
      sv.hof = {
        entries: function () {
          var clears = data[CNT1], used = Math.min(clears, 50), out = [];
          for (var t = used - 1; t >= 0; t--) {
            var team = [];
            for (var m = 0; m < 6; m++) {
              var o = HB1 + t * TEAM1 + m * EN1, sp = data[o];
              if (sp === 0xFF || sp === 0) break;
              var nat = window.PKGB.toNat[sp] || 0;
              if (!nat) continue;
              team.push({ species: nat, level: data[o + 1], nick: sv.decStr(o + 2, 11), shiny: false, moves: null });
            }
            if (team.length) out.push({ n: clears > 50 ? clears - (used - 1 - t) : t + 1, date: '', team: team });
          }
          return out;
        },
        clear: function () {
          for (var t = 0; t < 50; t++) for (var m = 0; m < 6; m++) {
            var o = HB1 + t * TEAM1 + m * EN1;
            for (var i = 0; i < EN1; i++) data[o + i] = 0;
            data[o] = 0xFF; for (var k = 2; k < 13; k++) data[o + k] = 0x50;
          }
          data[CNT1] = 0;
        }
      };
      return;
    }
    if (gen === 2 && sv.decStr && data.length >= 0x3E00) {
      // Gen 2 (pokegold/pokecrystal): 30 Teams ab 0x3200, je 0x61 Bytes (1 Byte WinCount + 6 x 0x10 Bytes: species, id(2), dv(2), level, nick(10))
      var HB2 = 0x3200, REC2 = 0x61, EN2 = 0x10;
      sv.hof = {
        entries: function () {
          var out = [];
          for (var t = 0; t < 30; t++) {
            var base = HB2 + t * REC2, win = data[base];
            if (!win || win === 0xFF) break;
            var team = [];
            for (var m = 0; m < 6; m++) {
              var o = base + 1 + m * EN2, sp = data[o];
              if (!sp || sp === 0xFF || sp > 251) break;
              var dv1 = data[o + 3], dv2 = data[o + 4];
              var sh = (dv2 & 0x0F) === 10 && (dv2 >> 4) === 10 && (dv1 & 0x0F) === 10 && (((dv1 >> 4) & 2) !== 0);
              team.push({ species: sp, level: data[o + 5], nick: sv.decStr(o + 6, 10), shiny: sh, moves: null });
            }
            if (team.length) out.push({ n: win, date: '', team: team });
          }
          return out;
        },
        clear: function () { for (var i = 0; i < 30 * REC2; i++) data[HB2 + i] = 0; }
      };
      return;
    }
    if (gen === 3 && data.length >= 0x1E000) {
      var US = 0xF80, SZ = 0x14, TEAM = 6 * SZ;
      // Zwei Sektoren bilden einen zusammenhängenden Puffer (je 0xF80 Bytes)
      var at = function (i) { return i < US ? 0x1C000 + i : 0x1D000 + (i - US); };
      var read = function (o, n) { var r = new Uint8Array(n); for (var i = 0; i < n; i++) r[i] = data[at(o + i)]; return r; };
      sv.hof = {
        entries: function () {
          if (u32(data, 0x1C000 + 0xFF8) !== 0x08012025) return [];
          var out = [];
          for (var e = 0; e < 50; e++) {
            var raw = read(e * TEAM, TEAM), team = [];
            for (var m = 0; m < 6; m++) {
              var o = m * SZ, sl = u16(raw, o + 8);
              if (!(sl & 0x1FF)) continue;
              var nat = sv.natOf(sl & 0x1FF);
              if (!nat || nat > sv.maxSpecies) continue;
              team.push({ species: nat, level: sl >> 9, nick: G3.decode(raw, o + 10, 10), shiny: shiny(u16(raw, o), u16(raw, o + 2), u32(raw, o + 4)) });
            }
            if (team.length) out.push({ n: e + 1, date: '', team: team });
          }
          return out.reverse();
        },
        clear: function () {
          for (var i = 0; i < 50 * TEAM; i++) data[at(i)] = 0;
          [0x1C000, 0x1D000].forEach(function (b) { // Sektor-Prüfsumme neu berechnen
            var sum = 0; for (var q = 0; q < US; q += 4) sum = (sum + u32(data, b + q)) >>> 0;
            var c = (((sum >>> 16) + sum) & 0xFFFF); data[b + 0xFF6] = c & 255; data[b + 0xFF7] = c >> 8;
          });
        }
      };
    } else if (gen === 4) {
      var HB = { DP: 0x20000, Pt: 0x20000, HGSS: 0x23000 }[sv.game];
      if (!HB) return;
      var REC = 0x16C, EN = 0x3C;
      // Beide Hälften prüfen; die mit mehr Durchläufen (und gültigen Daten) ist die aktive
      var pick = function () {
        var best = 0, bc = -1;
        [0, 0x40000].forEach(function (off) {
          if (HB + off + 0x2AC0 > data.length) return;
          var c = u32(data, HB + off + 0x2AAC);
          if (c > 9999) c = 0;
          if (c > bc) { bc = c; best = off; }
        });
        return best;
      };
      sv.hof = {
        entries: function () {
          var b = HB + pick(), clears = Math.min(9999, u32(data, b + 0x2AAC)), next = u32(data, b + 0x2AA8) % 30, out = [], cnt = Math.min(30, clears);
          for (var k = 1; k <= cnt; k++) {
            var idx = (next - k + 60) % 30, r = b + idx * REC, team = [];
            for (var m = 0; m < 6; m++) {
              var o = r + m * EN, sp = u16(data, o);
              if (!sp) continue;
              team.push({ species: sp, level: data[o + 2], nick: NDS.g4str(data, o + 0x0C, 11), shiny: shiny(u16(data, o + 8), u16(data, o + 10), u32(data, o + 4)),
                moves: [u16(data, o + 0x32), u16(data, o + 0x34), u16(data, o + 0x36), u16(data, o + 0x38)] });
            }
            if (team.length) out.push({ n: clears - k + 1, date: (function (y) { return y < 100 ? 2000 + y : y; })(u16(data, r + REC - 4)) + '-' + pad(data[r + REC - 2]) + '-' + pad(data[r + REC - 1]), team: team });
          }
          return out;
        },
        clear: function () {
          [0, 0x40000].forEach(function (off) {
            var b = HB + off; if (b + 0x2AC0 > data.length) return;
            for (var i = 0; i < 0x2AB0; i++) data[b + i] = 0;
            var c = crc16(data, b, b + 0x2AB0 + 0xE); data[b + 0x2AB0 + 0xE] = c & 255; data[b + 0x2AB0 + 0xF] = c >> 8;
          });
        }
      };
    } else if (gen === 5) {
      // Gen 5 (PKHeX SAV5): BW = 0x7C800 / 0x7E000, B2W2 = 0x74000 / 0x75800; 15 Einträge x 0x16C (6 x 0x3C + 4 Byte Datum)
      var HB5 = sv.game === 'BW' ? 0x7C800 : 0x74000, REC5 = 0x16C, EN5 = 0x3C;
      if (HB5 + 0x155C > data.length) return;
      var dec5 = function (o, max) { var s = ''; for (var i = 0; i < max; i++) { var c = u16(data, o + i * 2); if (!c || c === 0xFFFF) break; s += String.fromCharCode(c); } return s; };
      sv.hof = {
        entries: function () {
          var out = [];
          for (var e = 0; e < 15; e++) {
            var r = HB5 + e * REC5, team = [];
            for (var m = 0; m < 6; m++) {
              var o = r + m * EN5, sp = u16(data, o);
              if (!sp || sp > 649) continue;
              team.push({ species: sp, level: data[o + 2], nick: dec5(o + 0x0C, 11), shiny: shiny(u16(data, o + 8), u16(data, o + 10), u32(data, o + 4)),
                moves: [u16(data, o + 0x32), u16(data, o + 0x34), u16(data, o + 0x36), u16(data, o + 0x38)] });
            }
            if (team.length) {
              var y = u16(data, r + REC5 - 4);
              out.push({ n: e + 1, date: y ? (y < 100 ? 2000 + y : y) + '-' + pad(data[r + REC5 - 2]) + '-' + pad(data[r + REC5 - 1]) : '', team: team });
            }
          }
          return out.reverse();
        },
        clear: function () {
          [HB5, HB5 + 0x1800].forEach(function (b) {
            if (b + 0x155C > data.length) return;
            for (var i = 0; i < 0x155C; i++) data[b + i] = 0;
          });
        }
      };
    } else if (gen === 6 && sv.blocks && sv.blocks[36]) {
      var bo = sv.blocks[36][0], ES = 0x1B4, PS = 0x48;
      var dec = function (o, max) { var s = ''; for (var i = 0; i < max; i++) { var c = u16(data, o + i * 2); if (!c) break; s += String.fromCharCode(c); } return s; };
      sv.hof = {
        entries: function () {
          var out = [];
          for (var e = 15; e >= 0; e--) {
            var eo = bo + e * ES, ix = u32(data, eo + ES - 4);
            if (!(ix >>> 31)) continue;
            var team = [];
            for (var m = 0; m < 6; m++) {
              var o = eo + m * PS, sp = u16(data, o);
              if (!sp) continue;
              var pk = u32(data, o + 0x14);
              team.push({ species: sp, level: (pk >>> 7) & 0x7F, nick: dec(o + 0x18, 12), shiny: !!((pk >>> 14) & 1), moves: [u16(data, o + 4), u16(data, o + 6), u16(data, o + 8), u16(data, o + 10)] });
            }
            out.push({ n: ix & 0x3FFF, date: (2000 + ((ix >>> 14) & 0xFF)) + '-' + pad((ix >>> 22) & 0xF) + '-' + pad((ix >>> 26) & 0x1F), team: team });
          }
          return out;
        },
        clear: function () { for (var i = 0; i < 16 * ES; i++) data[bo + i] = 0; }
      };
    } else if (gen === 7 && sv.blocks && sv.blocks[5]) {
      // Gen 7 (PKHeX HallOfFame7): direkt nach den Event-Flags in Block 5 (SM: +0x9C4, USUM: +0xA3C), 2 Teams x 6 u16 (Erst-Einzug & Aktuell)
      var bo7 = sv.blocks[5][0] + (String(sv.game).toUpperCase() === 'USUM' ? 0xA3C : 0x9C4);
      if (bo7 + 24 > data.length) return;
      sv.hof = {
        entries: function () {
          var out = [], labels = ['Erst-Einzug', 'Aktueller Champ'];
          for (var t = 1; t >= 0; t--) {
            var team = [];
            for (var m = 0; m < 6; m++) {
              var sp = u16(data, bo7 + (t * 6 + m) * 2);
              if (sp && sp <= 807) team.push({ species: sp, level: 0, nick: '', shiny: false, moves: null });
            }
            if (team.length) out.push({ n: t + 1, date: labels[t], team: team });
          }
          return out;
        },
        clear: function () { for (var i = 0; i < 24; i++) data[bo7 + i] = 0; }
      };
    }
  };
})();
