// Save File Editor – Erweiterungen nach PKHeX (GPLv3): Item-Taschen, Pokédex und Event-Flags für alle Generationen (1–7).
// Offsets und Listen stammen aus PKHeX (data/pkhex_data.js, erzeugt von tools/build_pkhex_data.mjs).
(function () {
  'use strict';
  var X = window.PKHEX;
  if (!X) return;
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >>> 8) & 255; b[o + 2] = (v >>> 16) & 255; b[o + 3] = (v >>> 24) & 255; }
  function getBit(b, base, n) { return (b[base + (n >> 3)] >> (n & 7)) & 1; }
  function setBit(b, base, n, v) { var o = base + (n >> 3), m = 1 << (n & 7); b[o] = v ? (b[o] | m) : (b[o] & ~m); }

  var G4 = { DP: { dex: 0x12DC, work: 0xD9C, flag: 0xFDC }, Pt: { dex: 0x1328, work: 0xDAC, flag: 0xFEC }, HGSS: { dex: 0x12B8, work: 0xDE4, flag: 0x10C4 } };
  var G5 = { BW: { items: 0x18400, dex: 0x21600, ev: 0x20100, work: 0x13E, flags: 0xB60 }, B2W2: { items: 0x18400, dex: 0x21400, ev: 0x1FF00, work: 0x1AF, flags: 0xBF8 } };
  // Gen 3: Offsets im großen Block (Sektoren 1–4); Inventar, Ereignisse, Seen-Spiegel
  var G3 = { RS: { inv: 0x498, flag: 0x1220, work: 0x1340, flags: 288 * 8, seen2: 0x938, seen3: 0x3A8C, key: false }, E: { inv: 0x498, flag: 0x1270, work: 0x139C, flags: 300 * 8, seen2: 0x988, seen3: 0x3B24, key: true }, FRLG: { inv: 0x298, flag: 0xEE0, work: 0x1000, flags: 288 * 8, seen2: 0x5F8, seen3: 0x3A18, key: true } };
  // Gen 6/7: Blöcke (Index in der Blocktabelle)
  var G6 = { XY: { items: 1, ev: 19, dex: 20, work: 0x178, flags: 0xD00, max: 721 }, AO: { items: 1, ev: 19, dex: 20, work: 0x178, flags: 0xD00, max: 721 } };
  var G7 = { SM: { items: 0, ev: 5, dex: 6, work: 1000, flags: 4000, max: 802 }, USUM: { items: 0, ev: 5, dex: 6, work: 1000, flags: 4960, max: 807 } };

  function personalGender(P, gen, n) { var t = P && P['g' + (gen >= 6 ? gen : gen)]; var e = t && t[n]; return e ? e[7] : 127; }

  window.CCSaveExt = function (sv, P) {
    var data = sv.data, gen = sv.gen, key = gen >= 6 ? String(sv.game).toUpperCase() : sv.game;
    // ---------- Item-Taschen ----------
    var info = gen === 1 ? X.gb.gen1 : gen === 2 ? X.gb.gen2[key] : X.bags[key];
    if (info) {
      var pouches = info.pouches, rd8, wr8;
      if (gen === 3) {
        var gc = G3[key], baseOff = gc.inv, secKey = gc.key && sv.key3 ? sv.key3() & 0xFFFF : 0;
        rd8 = function (o) { return data[sv.addr(1, baseOff + o)]; };
        wr8 = function (o, v) { data[sv.addr(1, baseOff + o)] = v; };
        sv.bag = {
          pouches: pouches,
          read: function (pi) {
            var p = pouches[pi], out = [], xk = p.k === 'PCItems' ? 0 : secKey;
            for (var i = 0; i < p.size; i++) { var o = p.off + i * 4, id = rd8(o) | (rd8(o + 1) << 8), cnt = (rd8(o + 2) | (rd8(o + 3) << 8)) ^ xk; if (id) out.push({ id: id, count: cnt }); }
            return out;
          },
          write: function (pi, items) {
            var p = pouches[pi], xk = p.k === 'PCItems' ? 0 : secKey, list = items.filter(function (x) { return x.id && x.count; });
            for (var i = 0; i < p.size; i++) {
              var o = p.off + i * 4, it = list[i], id = it ? it.id : 0, cnt = it ? Math.min(p.max, it.count) : 0, c2 = (cnt ^ xk) & 0xFFFF;
              wr8(o, id & 255); wr8(o + 1, id >> 8); wr8(o + 2, c2 & 255); wr8(o + 3, c2 >> 8);
            }
          },
          maxFor: function (pi, id) { var p = pouches[pi]; return p.k === 'TMHMs' && id >= 339 && id <= 346 ? 1 : p.max; }
        };
      } else if (gen === 1 || gen === 2) {
        sv.bag = {
          pouches: pouches,
          read: function (pi) {
            var p = pouches[pi], out = [], i;
            if (p.k === 'TMHMs') { for (i = 0; i < p.ids.length; i++) { var c = data[p.off + i]; if (c) out.push({ id: p.ids[i], count: c }); } return out; }
            var n = data[p.off]; if (n > p.size) n = 0;
            for (i = 0; i < n; i++) {
              if (p.k === 'KeyItems') out.push({ id: data[p.off + 1 + i], count: 1 });
              else out.push({ id: data[p.off + 1 + i * 2], count: data[p.off + 2 + i * 2] });
            }
            return out;
          },
          write: function (pi, items) {
            var p = pouches[pi], list = items.filter(function (x) { return x.id && x.count; }), i;
            if (p.k === 'TMHMs') {
              for (i = 0; i < p.ids.length; i++) data[p.off + i] = 0;
              list.forEach(function (x) { var ix = p.ids.indexOf(x.id); if (ix >= 0) data[p.off + ix] = Math.min(99, x.count); });
              return;
            }
            list = list.slice(0, p.size); data[p.off] = list.length;
            if (p.k === 'KeyItems') { list.forEach(function (x, k) { data[p.off + 1 + k] = x.id; }); data[p.off + 1 + list.length] = 0xFF; }
            else { list.forEach(function (x, k) { data[p.off + 1 + k * 2] = x.id; data[p.off + 2 + k * 2] = Math.min(99, x.count); }); data[p.off + 1 + list.length * 2] = 0xFF; }
          },
          maxFor: function (pi, id) { return pouches[pi].k === 'KeyItems' ? 1 : (gen === 1 && id >= 196 && id <= 200) ? 1 : 99; }
        };
      } else {
        var base = gen === 4 ? sv.gbase + info.base : gen === 5 ? G5[key].items : sv.blocks[(gen === 6 ? G6 : G7)[key].items][0];
        var g7 = gen === 7;
        sv.bag = {
          pouches: pouches,
          read: function (pi) {
            var p = pouches[pi], out = [];
            for (var i = 0; i < p.size; i++) {
              var o = base + p.off + i * 4;
              if (g7) { var v = u32(data, o), id = v & 0x3FF; if (id) out.push({ id: id, count: (v >>> 10) & 0x3FF, extra: ((v >>> 20) & 0x3FF) | (v & 0x40000000 ? 0x400 : 0) }); }
              else { var id2 = u16(data, o); if (id2) out.push({ id: id2, count: u16(data, o + 2) }); }
            }
            return out;
          },
          write: function (pi, items) {
            var p = pouches[pi], list = items.filter(function (x) { return x.id && x.count; });
            for (var i = 0; i < p.size; i++) {
              var o = base + p.off + i * 4, it = list[i], cnt = it ? Math.min(p.max, it.count) : 0;
              if (g7) { var ex = it && it.extra ? it.extra : 0; w32(data, o, it ? ((it.id & 0x3FF) | ((cnt & 0x3FF) << 10) | ((ex & 0x3FF) << 20) | (ex & 0x400 ? 0x40000000 : 0)) >>> 0 : 0); }
              else { w16(data, o, it ? it.id : 0); w16(data, o + 2, cnt); }
            }
          },
          maxFor: function (pi, id) {
            var p = pouches[pi];
            if (gen === 4 && p.k === 'TMHMs' && id >= 420 && id <= 427) return 1;
            if (gen === 7 && p.k === 'KeyItems' && id === 797) return 2;
            return p.max;
          }
        };
      }
    }

    // ---------- Pokédex ----------
    var gset = function (r, n, v) { setBit(data, r, n - 1, v); };
    if (gen === 1 || gen === 2) {
      var dr = gen === 1 ? { c: 0x25A3, s: 0x25B6, max: 151 } : key === 'C' ? { c: 0x2A27, s: 0x2A47, max: 251 } : { c: 0x2A4C, s: 0x2A6C, max: 251 };
      sv.dex = { max: dr.max, get: function (n) { return { seen: !!getBit(data, dr.s, n - 1), caught: !!getBit(data, dr.c, n - 1) }; },
        set: function (n, seen, caught) { gset(dr.c, n, caught); gset(dr.s, n, seen || caught); } };
    } else if (gen === 3) {
      var gc3 = G3[key];
      sv.dex = { max: 386,
        get: function (n) { return { seen: !!getBit(data, sv.s0 + 0x5C, n - 1), caught: !!getBit(data, sv.s0 + 0x28, n - 1) }; },
        set: function (n, seen, caught) {
          var i = n - 1, sn = seen || caught;
          setBit(data, sv.s0 + 0x28, i, caught); setBit(data, sv.s0 + 0x5C, i, sn);
          [gc3.seen2, gc3.seen3].forEach(function (o) { var a = sv.addr(1, o + (i >> 3)); data[a] = sn ? (data[a] | (1 << (i & 7))) : (data[a] & ~(1 << (i & 7))); });
        } };
    } else if (gen === 4) {
      var d4 = sv.gbase + G4[key].dex;
      sv.dex = { max: 493,
        get: function (n) { return { seen: !!getBit(data, d4 + 4 + 0x40, n - 1), caught: !!getBit(data, d4 + 4, n - 1) }; },
        set: function (n, seen, caught) {
          var i = n - 1, fem = personalGender(P, 4, n) === 254 ? 1 : 0;
          setBit(data, d4 + 4, i, caught); setBit(data, d4 + 4 + 0x40, i, seen || caught);
          if (seen || caught) { if (!getBit(data, d4 + 4 + 0x80, i) && !getBit(data, d4 + 4 + 0xC0, i)) { setBit(data, d4 + 4 + 0x80, i, fem); setBit(data, d4 + 4 + 0xC0, i, fem); } }
          else { setBit(data, d4 + 4 + 0x80, i, 0); setBit(data, d4 + 4 + 0xC0, i, 0); }
        } };
    } else {
      // Generation 5/6: 9 Bitregionen (gefangen, 4x gesehen, 4x angezeigt); Gen 7: Regionen nach den Misc-Daten
      var dd = gen === 5 ? { o: G5[key].dex, c: 8, s: 8 + 0x54, step: 0x54, disp: 8 + 0x54 * 5, max: 649 } :
        gen === 6 ? { o: sv.blocks[G6[key].dex][0], c: 8, s: 8 + 0x60, step: 0x60, disp: 8 + 0x60 * 5, max: 721 } :
        { o: sv.blocks[G7[key].dex][0], c: 0x88, s: 0x88 + 0x68, step: 0x8C, disp: 0x88 + 0x68 + 0x8C * 4, max: G7[key].max };
      sv.dex = { max: dd.max,
        get: function (n) { var i = n - 1, s = 0; for (var r = 0; r < 4; r++) s |= getBit(data, dd.o + dd.s + dd.step * r, i); return { seen: !!s, caught: !!getBit(data, dd.o + dd.c, i) }; },
        set: function (n, seen, caught) {
          var i = n - 1, fem = personalGender(P, gen, n) === 254, any = seen || caught;
          setBit(data, dd.o + dd.c, i, caught);
          for (var r = 0; r < 4; r++) { setBit(data, dd.o + dd.s + dd.step * r, i, 0); setBit(data, dd.o + dd.disp + dd.step * r, i, 0); }
          if (any) { setBit(data, dd.o + dd.s + (fem ? dd.step : 0), i, 1); setBit(data, dd.o + dd.disp + (fem ? dd.step : 0), i, 1); }
        } };
    }

    // ---------- Event-Flags und Arbeitswerte ----------
    var fl;
    if (gen === 1) {
      fl = { flagCount: 0xA00, workCount: 0x100, workMax: 255, getFlag: function (n) { return !!getBit(data, 0x29F3, n); }, setFlag: function (n, v) { setBit(data, 0x29F3, n, v); }, getWork: function (n) { return data[0x289C + n]; }, setWork: function (n, v) { data[0x289C + n] = v & 255; } };
    } else if (gen === 2) {
      var cbi = key === 'C' ? 0x2700 : 0x2724, ef = cbi - (key === 'C' ? 0x100 : 0x105);
      fl = { flagCount: 2000, workCount: 0x100, workMax: 255, getFlag: function (n) { return !!getBit(data, ef, n); }, setFlag: function (n, v) { setBit(data, ef, n, v); }, getWork: function (n) { return data[ef - 0x100 + n]; }, setWork: function (n, v) { data[ef - 0x100 + n] = v & 255; } };
    } else if (gen === 3) {
      var g3c = G3[key];
      fl = { flagCount: g3c.flags, workCount: 0x100,
        getFlag: function (n) { return !!((data[sv.addr(1, g3c.flag + (n >> 3))] >> (n & 7)) & 1); },
        setFlag: function (n, v) { var a = sv.addr(1, g3c.flag + (n >> 3)); data[a] = v ? (data[a] | (1 << (n & 7))) : (data[a] & ~(1 << (n & 7))); },
        getWork: function (n) { return data[sv.addr(1, g3c.work + n * 2)] | (data[sv.addr(1, g3c.work + n * 2 + 1)] << 8); },
        setWork: function (n, v) { data[sv.addr(1, g3c.work + n * 2)] = v & 255; data[sv.addr(1, g3c.work + n * 2 + 1)] = (v >> 8) & 255; } };
    } else if (gen === 4) {
      var wb = sv.gbase + G4[key].work, fb = sv.gbase + G4[key].flag;
      fl = { flagCount: 0xB60, workCount: (G4[key].flag - G4[key].work) >> 1, getFlag: function (n) { return !!getBit(data, fb, n); }, setFlag: function (n, v) { setBit(data, fb, n, v); }, getWork: function (n) { return u16(data, wb + n * 2); }, setWork: function (n, v) { w16(data, wb + n * 2, v); } };
    } else {
      var ev = gen === 5 ? { o: G5[key].ev, work: G5[key].work, flags: G5[key].flags } : gen === 6 ? { o: sv.blocks[G6[key].ev][0], work: G6[key].work, flags: G6[key].flags } : { o: sv.blocks[G7[key].ev][0], work: G7[key].work, flags: G7[key].flags };
      var fo = ev.o + ev.work * 2;
      fl = { flagCount: ev.flags, workCount: ev.work, getFlag: function (n) { return !!getBit(data, fo, n); }, setFlag: function (n, v) { setBit(data, fo, n, v); }, getWork: function (n) { return u16(data, ev.o + n * 2); }, setWork: function (n, v) { w16(data, ev.o + n * 2, v); } };
    }
    fl.names = X.flags[key] || { flags: [], work: [] };
    sv.events = fl;

    // ---------- Orden (Quelle: PKHeX) ----------
    var bd = null;
    if (gen === 1) bd = { n: 8, get: function (i) { return (data[0x2602] >> i) & 1; }, set: function (i, v) { data[0x2602] = v ? (data[0x2602] | (1 << i)) : (data[0x2602] & ~(1 << i)); } };
    else if (gen === 2) { var jb = key === 'C' ? 0x23E5 : 0x23E4; bd = { n: 16, get: function (i) { return (data[jb + (i >> 3)] >> (i & 7)) & 1; }, set: function (i, v) { var o = jb + (i >> 3); data[o] = v ? (data[o] | (1 << (i & 7))) : (data[o] & ~(1 << (i & 7))); } }; }
    else if (gen === 3) { var bs = { RS: 0x807, E: 0x867, FRLG: 0x820 }[key]; bd = { n: 8, get: function (i) { return fl.getFlag(bs + i) ? 1 : 0; }, set: function (i, v) { fl.setFlag(bs + i, !!v); } }; }
    else if (gen === 4) { var to = sv.gbase + ({ DP: 0x64, Pt: 0x68, HGSS: 0x64 })[key]; bd = { n: key === 'HGSS' ? 16 : 8, get: function (i) { return i < 8 ? (data[to + 0x1A] >> i) & 1 : (data[to + 0x1F] >> (i - 8)) & 1; }, set: function (i, v) { var o = i < 8 ? to + 0x1A : to + 0x1F, b = i & 7; data[o] = v ? (data[o] | (1 << b)) : (data[o] & ~(1 << b)); } }; }
    else if (gen === 5) { var mo = (key === 'BW' ? 0x21200 : 0x21100) + 4; bd = { n: 8, get: function (i) { return (data[mo] >> i) & 1; }, set: function (i, v) { data[mo] = v ? (data[mo] | (1 << i)) : (data[mo] & ~(1 << i)); } }; }
    else if (gen === 6) { var m6 = sv.blocks[11][0] + 0xC; bd = { n: 8, get: function (i) { return (data[m6] >> i) & 1; }, set: function (i, v) { data[m6] = v ? (data[m6] | (1 << i)) : (data[m6] & ~(1 << i)); } }; }
    sv.badges = bd;

    // ---------- Spielzeit, Münzen, Kampfpunkte (Quelle: PKHeX) ----------
    var tm = null;
    function mkTime(hOff, hBytes, hBig, mOff, sOff, hMax) { return { get: function () { return { h: hBytes === 1 ? data[hOff] : hBig ? (data[hOff] << 8) | data[hOff + 1] : u16(data, hOff), m: data[mOff], s: data[sOff] }; },
      set: function (t) { var h = Math.min(hMax, t.h); if (hBytes === 1) data[hOff] = h; else if (hBig) { data[hOff] = h >> 8; data[hOff + 1] = h & 255; } else w16(data, hOff, h); data[mOff] = Math.min(59, t.m); data[sOff] = Math.min(59, t.s); } }; }
    if (gen === 1) { tm = mkTime(0x2CED, 1, false, 0x2CEF, 0x2CF0, 255); }
    else if (gen === 2) { var tp = key === 'C' ? 0x2052 : 0x2053; tm = mkTime(tp, 2, true, tp + 2, tp + 3, 65535); }
    else if (gen === 3) { tm = mkTime(sv.s0 + 0xE, 2, false, sv.s0 + 0x10, sv.s0 + 0x11, 65535); }
    else if (gen === 4) { var t4 = sv.gbase + ({ DP: 0x64, Pt: 0x68, HGSS: 0x64 })[key] + 0x22; tm = mkTime(t4, 2, false, t4 + 2, t4 + 3, 65535); }
    else if (gen === 5) { tm = mkTime(0x19400 + 0x24, 2, false, 0x19400 + 0x26, 0x19400 + 0x27, 65535); }
    else { var pb = sv.blocks[gen === 6 ? 6 : 16][0]; tm = mkTime(pb, 2, false, pb + 2, pb + 3, 65535); }
    sv.playTime = tm;
    var cn = [];
    if (gen === 1) cn.push({ k: 'coins', max: 9999, get: function () { return ((data[0x2850] >> 4) * 1000) + ((data[0x2850] & 15) * 100) + ((data[0x2851] >> 4) * 10) + (data[0x2851] & 15); }, set: function (v) { v = Math.min(9999, v); data[0x2850] = ((Math.floor(v / 1000) % 10) << 4) | (Math.floor(v / 100) % 10); data[0x2851] = ((Math.floor(v / 10) % 10) << 4) | (v % 10); } });
    if (gen === 3) { var co = key === 'FRLG' ? 0x294 : 0x494, ck = (key !== 'RS' && sv.key3) ? sv.key3() & 0xFFFF : 0; cn.push({ k: 'coins', max: 9999, get: function () { return (data[sv.addr(1, co)] | (data[sv.addr(1, co + 1)] << 8)) ^ ck; }, set: function (v) { var x = (Math.min(9999, v) ^ ck) & 0xFFFF; data[sv.addr(1, co)] = x & 255; data[sv.addr(1, co + 1)] = x >> 8; } }); }
    if (gen === 4) {
      var tr4 = sv.gbase + ({ DP: 0x64, Pt: 0x68, HGSS: 0x64 })[key], bpo = ({ DP: 0x65F8, Pt: 0x7234, HGSS: 0x5BB8 })[key];
      cn.push({ k: 'coins', max: 50000, get: function () { return u16(data, tr4 + 0x20); }, set: function (v) { w16(data, tr4 + 0x20, Math.min(50000, v)); } });
      cn.push({ k: 'bp', max: 9999, get: function () { return u16(data, sv.gbase + bpo); }, set: function (v) { w16(data, sv.gbase + bpo, Math.min(9999, v)); } });
    }
    if (gen === 6) { var bo6 = sv.blocks[11][0] + (key === 'XY' ? 0x3C : 0x30); cn.push({ k: 'bp', max: 9999, get: function () { return u16(data, bo6); }, set: function (v) { w16(data, bo6, Math.min(9999, v)); } }); }
    if (gen === 7) { var bo7 = sv.blocks[9][0] + 0x11C; cn.push({ k: 'bp', max: 9999, get: function () { return u32(data, bo7); }, set: function (v) { w32(data, bo7, Math.min(9999, v)); } }); }
    sv.counters = cn;
  };
})();
