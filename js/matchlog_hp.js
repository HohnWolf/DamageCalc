// Matchlog: eigene KP als Bruch (167/167) und gegnerische KP als ganze Prozent.
// Ziffernvorlagen statt OCR: die Kontur-Schrift liest "19/167" wo "79/167" steht.
// Vorlagen werden aus einem bekannten Frame gelernt (learn) und können mitgegeben werden.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogHp = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var Prep = typeof module === 'object' && module.exports ? require('./matchlog_prep') : window.CCMatchlogPrep;
  var Lay = typeof module === 'object' && module.exports ? require('./matchlog_layout') : window.CCMatchlogLayout;
  var GW = 16, GH = 16;

  function resize(bits, sw, sh, dw, dh) {
    var out = new Uint8Array(dw * dh);
    for (var y = 0; y < dh; y++) {
      var sy = Math.min(sh - 1, Math.floor(y * sh / dh));
      for (var x = 0; x < dw; x++) {
        var sx = Math.min(sw - 1, Math.floor(x * sw / dw));
        out[y * dw + x] = bits[sy * sw + sx] ? 1 : 0;
      }
    }
    return out;
  }
  function cropBits(mask, x, y, w, h) {
    var bits = new Uint8Array(w * h);
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var sx = x + xx, sy = y + yy;
      if (sx >= 0 && sy >= 0 && sx < mask.w && sy < mask.h && mask.ink[sy * mask.w + sx]) bits[yy * w + xx] = 1;
    }
    return bits;
  }
  function colSum(bits, w, h) {
    var col = new Array(w);
    for (var x = 0; x < w; x++) {
      var n = 0;
      for (var y = 0; y < h; y++) if (bits[y * w + x]) n++;
      col[x] = n;
    }
    return col;
  }
  // Berührende Ziffern an der schwächsten Spalte trennen.
  function explode(bits, w, h, depth) {
    if (w < 2 || h < 4) return [];
    var col = colSum(bits, w, h);
    var segs = [], start = -1;
    for (var x = 0; x <= w; x++) {
      var on = x < w && col[x] > 0;
      if (on && start < 0) start = x;
      if (!on && start >= 0) { segs.push([start, x]); start = -1; }
    }
    if (!segs.length) return [];
    if (segs.length === 1 && depth < 6) {
      var a = segs[0][0], b = segs[0][1], ww = b - a;
      var nDig = Math.round(ww / Math.max(6, h * 0.7));
      if (nDig >= 2 && nDig <= 4 && ww > h * 1.2) {
        var cuts = [];
        for (var k = 1; k < nDig; k++) {
          var center = a + Math.round(k * ww / nDig);
          var lo = Math.max(a + 2, center - 3), hi = Math.min(b - 2, center + 3);
          var best = center, bestV = 1e9;
          for (var i = lo; i <= hi; i++) if (col[i] < bestV) { bestV = col[i]; best = i; }
          cuts.push(best);
        }
        var parts = [], cursor = a;
        cuts.forEach(function (cut) {
          if (cut > cursor + 1) parts.push([cursor, cut]);
          cursor = cut;
        });
        if (b > cursor + 1) parts.push([cursor, b]);
        if (parts.length >= 2) {
          var out = [];
          parts.forEach(function (p) {
            var slice = cropBits({ ink: bits, w: w, h: h }, p[0], 0, p[1] - p[0], h);
            out = out.concat(explode(slice, p[1] - p[0], h, depth + 1));
          });
          return out;
        }
      }
    }
    var out = [];
    segs.forEach(function (sg) {
      var sw = sg[1] - sg[0];
      if (sw < 1) return;
      var slice = cropBits({ ink: bits, w: w, h: h }, sg[0], 0, sw, h);
      if (sw > h * 1.35 && depth < 6) out = out.concat(explode(slice, sw, h, depth + 1));
      else out.push({ bits: slice, w: sw, h: h, x: sg[0] });
    });
    return out;
  }
  function tight(g) {
    var minx = g.w, miny = g.h, maxx = 0, maxy = 0, n = 0;
    for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) if (g.bits[y * g.w + x]) {
      n++;
      if (x < minx) minx = x; if (y < miny) miny = y;
      if (x > maxx) maxx = x; if (y > maxy) maxy = y;
    }
    if (!n) return null;
    var w = maxx - minx + 1, h = maxy - miny + 1;
    var bits = cropBits({ ink: g.bits, w: g.w, h: g.h }, minx, miny, w, h);
    return { bits: bits, w: w, h: h, area: n };
  }
  function glyphsOf(mask) {
    var comps = Prep.components(mask, 8).filter(function (c) { return c.h >= 7 && c.w >= 2; });
    if (!comps.length) return [];
    var ys = comps.map(function (c) { return c.y + c.h / 2; }).sort(function (a, b) { return a - b; });
    var mid = ys[ys.length >> 1];
    var line = comps.filter(function (c) { return Math.abs(c.y + c.h / 2 - mid) < Math.max(10, c.h); });
    var all = [];
    line.sort(function (a, b) { return a.x - b.x; });
    line.forEach(function (c) {
      var bits = cropBits(mask, c.x, c.y, c.w, c.h);
      explode(bits, c.w, c.h, 0).forEach(function (g) {
        var t = tight(g);
        if (!t || t.area < 8 || t.h < 6) return;
        t.sep = t.w <= 3 || (t.w / t.h < 0.34 && t.area < t.h * 2);
        t.norm = resize(t.bits, t.w, t.h, GW, GH);
        all.push(t);
      });
    });
    return all;
  }
  function pack(bits) {
    var s = '';
    for (var i = 0; i < bits.length; i++) s += bits[i] ? '1' : '0';
    return s;
  }
  function unpack(s) {
    var a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) === 49 ? 1 : 0;
    return a;
  }
  function ham(a, b) {
    var n = 0;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return 1 - n / a.length;
  }
  function createBank(seed) {
    var bank = {};
    function add(ch, bits) {
      if (!bank[ch]) bank[ch] = [];
      var p = pack(bits);
      if (bank[ch].some(function (s) { return ham(unpack(s), bits) > 0.9; })) return;
      if (bank[ch].length < 4) bank[ch].push(p);
    }
    function match(bits) {
      var bestC = '', best = 0;
      Object.keys(bank).forEach(function (ch) {
        bank[ch].forEach(function (s) {
          var sc = ham(bits, unpack(s));
          if (sc > best) { best = sc; bestC = ch; }
        });
      });
      return best >= 0.72 ? { ch: bestC, score: best } : null;
    }
    function learnFromMask(mask, expected) {
      var glyphs = glyphsOf(mask).filter(function (g) { return !g.sep; });
      var chars = String(expected).replace(/[^0-9%]/g, '').split('');
      if (glyphs.length === chars.length - 1 && chars.length) {
        var widest = 0;
        for (var i = 1; i < glyphs.length; i++) if (glyphs[i].w > glyphs[widest].w) widest = i;
        var g = glyphs[widest];
        var mid = g.w >> 1;
        var left = tight({ bits: cropBits({ ink: g.bits, w: g.w, h: g.h }, 0, 0, mid, g.h), w: mid, h: g.h });
        var right = tight({ bits: cropBits({ ink: g.bits, w: g.w, h: g.h }, mid, 0, g.w - mid, g.h), w: g.w - mid, h: g.h });
        if (left && right) {
          left.norm = resize(left.bits, left.w, left.h, GW, GH);
          right.norm = resize(right.bits, right.w, right.h, GW, GH);
          glyphs = glyphs.slice(0, widest).concat([left, right], glyphs.slice(widest + 1));
        }
      }
      if (glyphs.length !== chars.length || !chars.length) return { ok: false, got: glyphs.length, want: chars.length };
      for (var i = 0; i < chars.length; i++) add(chars[i], glyphs[i].norm);
      return { ok: true, n: chars.length };
    }
    function readMask(mask) {
      var glyphs = glyphsOf(mask);
      if (!glyphs.length) return '';
      var s = '';
      glyphs.forEach(function (g) {
        if (g.sep) { if (s && s[s.length - 1] !== '/') s += '/'; return; }
        var m = match(g.norm);
        s += m ? m.ch : '?';
      });
      return s;
    }
    if (seed) Object.keys(seed).forEach(function (ch) { (seed[ch] || []).forEach(function (p) { add(ch, unpack(p)); }); });
    return {
      add: add, match: match, learnFromMask: learnFromMask, readMask: readMask,
      export: function () { return JSON.parse(JSON.stringify(bank)); },
      size: function () { return Object.keys(bank).reduce(function (n, k) { return n + bank[k].length; }, 0); }
    };
  }

  function parseFraction(s) {
    var src = String(s || '');
    var m = src.match(/(\d{1,3})\D+(\d{1,3})/);
    if (!m) {
      var d = src.replace(/\D/g, '');
      if (d.length === 6 || d.length === 4) m = [d, d.slice(0, d.length / 2), d.slice(d.length / 2)];
    }
    if (!m) return null;
    var cur = +m[1], max = +m[2];
    if (max < 20 || max > 500 || cur > max) return null;
    return { cur: cur, max: max, pct: Math.round(100 * cur / max) };
  }
  function parsePct(s) {
    var src = String(s || '').trim();
    // Ohne Prozentzeichen sind zwei Ziffern auf dem Spielfeld meist Rauschen. 100 darf ohne Zeichen bleiben.
    if (!/^\d{1,3}%$/.test(src) && src !== '100' && src !== '0') return null;
    var n = parseInt(src, 10);
    if (isNaN(n) || n > 100) return null;
    return { pct: n };
  }
  function readBox(img, box, bank, kind) {
    var prep = Prep.prepare(img, box, 'digit');
    var text = bank.readMask(prep.mask);
    var clean = text.indexOf('?') < 0;
    var val = null;
    if (clean && kind === 'hp') val = parseFraction(text);
    if (clean && kind === 'pct' && prep.count >= 30 && prep.count <= 500) val = parsePct(text);
    if (!val && kind === 'pct') {
      var ui = Prep.prepare(img, box, 'ui');
      var t2 = bank.readMask(ui.mask);
      if (t2.indexOf('?') < 0 && ui.count >= 20 && ui.count <= 500) {
        val = parsePct(t2);
        if (val) text = t2;
      }
    }
    return { text: text, value: val, count: prep.count };
  }
  function read(img, bank) {
    var out = { slots: {} };
    Lay.L.ownHp.forEach(function (b, i) {
      var r = readBox(img, Lay.scale(img, b), bank, 'hp');
      out.slots[i === 0 ? 'ownA' : 'ownB'] = r;
    });
    Lay.L.oppPct.forEach(function (b, i) {
      var r = readBox(img, Lay.scale(img, b), bank, 'pct');
      out.slots[i === 0 ? 'oppA' : 'oppB'] = r;
    });
    return out;
  }
    function learn(img, bank, samples) {
    var notes = [];
    (samples || []).forEach(function (s) {
      var prep = Prep.prepare(img, Lay.scale(img, s.box), 'digit');
      var r = bank.learnFromMask(prep.mask, s.text);
      var ui = Prep.prepare(img, Lay.scale(img, s.box), 'ui');
      var r2 = bank.learnFromMask(ui.mask, s.text);
      var best = r.ok ? r : r2.ok ? r2 : (r.got > r2.got ? r : r2);
      notes.push({ text: s.text, ok: !!best.ok, got: best.got, want: best.want });
    });
    return notes;
  }
  return { createBank: createBank, read: read, learn: learn, parseFraction: parseFraction, parsePct: parsePct, glyphsOf: glyphsOf };
});
