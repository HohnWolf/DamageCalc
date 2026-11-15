// Matchlog: Ausschnitt, weiße Schrift mit dunkler Kontur, UI-Text, Änderungserkennung.
// Es wird nur erkannt, wenn sich der Ausschnitt geändert hat und genug Schriftpixel da sind.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogPrep = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function crop(img, box) {
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3];
    var w = x1 - x0, h = y1 - y0;
    var data = new Uint8Array(w * h * 4);
    var src = img.data, W = img.width;
    for (var y = 0; y < h; y++) {
      var s = ((y0 + y) * W + x0) * 4;
      data.set(src.subarray(s, s + w * 4), y * w * 4);
    }
    return { width: w, height: h, data: data };
  }
  function lumOf(r, g, b) { return (r * 77 + g * 150 + b * 29) >> 8; }

  // Weiße Glyphe mit dunkler Kontur (Kampftext). Kleine helle Punkte (Bodenlichter) fallen weg.
  function outlineMask(c) {
    var w = c.width, h = c.height, src = c.data;
    var lum = new Uint8Array(w * h);
    for (var i = 0, p = 0; i < src.length; i += 4, p++) lum[p] = lumOf(src[i], src[i + 1], src[i + 2]);
    var ink = new Uint8Array(w * h);
    var count = 0;
    for (var y = 2; y < h - 2; y++) {
      for (var x = 2; x < w - 2; x++) {
        var p = y * w + x;
        if (lum[p] < 175) continue;
        var dark = 0;
        for (var dy = -2; dy <= 2 && !dark; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            if (lum[(y + dy) * w + (x + dx)] < 75) { dark = 1; break; }
          }
        }
        if (!dark) continue;
        ink[p] = 1; count++;
      }
    }
    return { ink: ink, count: count, w: w, h: h };
  }
  // Helle Schrift auf farbiger Fläche (Teamvorschau, Menüs). Keine Kontur nötig.
  function uiMask(c) {
    var w = c.width, h = c.height, src = c.data;
    var ink = new Uint8Array(w * h);
    var count = 0;
    for (var i = 0, p = 0; i < src.length; i += 4, p++) {
      var r = src[i], g = src[i + 1], b = src[i + 2];
      var L = lumOf(r, g, b);
      if (L > 195 && Math.max(r, g, b) - Math.min(r, g, b) < 50) { ink[p] = 1; count++; }
    }
    return { ink: ink, count: count, w: w, h: h };
  }
  // Helle KP-Ziffern (nicht reinweiß, JPEG drückt sie auf ~160–180).
  function digitMask(c) {
    var w = c.width, h = c.height, src = c.data;
    var ink = new Uint8Array(w * h);
    var count = 0;
    for (var i = 0, p = 0; i < src.length; i += 4, p++) {
      var r = src[i], g = src[i + 1], b = src[i + 2];
      var L = lumOf(r, g, b);
      if (L > 148 && r > 115 && g > 125 && b > 85 && (g - b) < 90 && (g - r) < 70) { ink[p] = 1; count++; }
    }
    return { ink: ink, count: count, w: w, h: h };
  }

  function components(mask, minArea) {
    var m = mask.ink, w = mask.w, h = mask.h;
    var seen = new Uint8Array(w * h);
    var out = [];
    var qx = new Int16Array(w * h), qy = new Int16Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var s = y * w + x;
      if (!m[s] || seen[s]) continue;
      var qs = 0, qe = 0;
      qx[qe] = x; qy[qe] = y; qe++; seen[s] = 1;
      var minx = x, maxx = x, miny = y, maxy = y, area = 0;
      while (qs < qe) {
        var cx = qx[qs], cy = qy[qs]; qs++; area++;
        if (cx < minx) minx = cx; if (cx > maxx) maxx = cx;
        if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          var ni = ny * w + nx;
          if (!m[ni] || seen[ni]) continue;
          seen[ni] = 1; qx[qe] = nx; qy[qe] = ny; qe++;
        }
      }
      if (area >= minArea) out.push({ x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1, area: area });
    }
    out.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    return out;
  }
  function dropSpecks(mask, minArea) {
    var comps = components(mask, 1);
    var m = mask.ink, w = mask.w;
    var keep = 0;
    comps.forEach(function (c) {
      if (c.area >= minArea && c.h >= 6 && c.w >= 2) { keep += c.area; return; }
      for (var y = c.y; y < c.y + c.h; y++) for (var x = c.x; x < c.x + c.w; x++) m[y * w + x] = 0;
    });
    mask.count = keep;
    return mask;
  }
  function hashMask(mask) {
    var m = mask.ink, w = mask.w, h = mask.h, hsh = 2166136261;
    var step = w > 400 ? 4 : 2;
    for (var y = 0; y < h; y += step) {
      var row = y * w;
      for (var x = 0; x < w; x += step) {
        hsh ^= m[row + x] ? 1 : 0;
        hsh = Math.imul(hsh, 16777619);
      }
    }
    return (hsh >>> 0) + ':' + mask.count;
  }
  function bbox(mask) {
    var m = mask.ink, w = mask.w, h = mask.h;
    var minx = w, miny = h, maxx = 0, maxy = 0, n = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (m[y * w + x]) {
      n++;
      if (x < minx) minx = x; if (y < miny) miny = y;
      if (x > maxx) maxx = x; if (y > maxy) maxy = y;
    }
    if (!n) return null;
    return { x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1, n: n };
  }
  // Schwarze Schrift auf Weiß, 2×, als ABGR für BMP. Leere Ränder weg.
  function render(mask, scale) {
    var bb = bbox(mask);
    if (!bb || bb.w < 8 || bb.h < 8) return null;
    scale = scale || 2;
    var pad = 4;
    var sw = bb.w + pad * 2, sh = bb.h + pad * 2;
    var dw = sw * scale, dh = sh * scale;
    if (dw > 1600) { var k = 1600 / dw; dw = 1600; dh = Math.max(8, Math.round(dh * k)); }
    var abgr = new Uint8Array(dw * dh * 4);
    abgr.fill(255);
    var m = mask.ink, w = mask.w;
    for (var y = 0; y < dh; y++) {
      var sy = bb.y - pad + Math.floor(y * sh / dh);
      if (sy < 0 || sy >= mask.h) continue;
      for (var x = 0; x < dw; x++) {
        var sx = bb.x - pad + Math.floor(x * sw / dw);
        if (sx < 0 || sx >= w || !m[sy * w + sx]) continue;
        var o = (y * dw + x) * 4;
        abgr[o] = 255; abgr[o + 1] = 0; abgr[o + 2] = 0; abgr[o + 3] = 0;
      }
    }
    return { width: dw, height: dh, abgr: abgr, ink: bb.n };
  }
  function prepare(img, box, mode) {
    var c = crop(img, box);
    var mask = mode === 'ui' ? uiMask(c) : mode === 'digit' ? digitMask(c) : outlineMask(c);
    var minA = mode === 'digit' ? 8 : 28;
    dropSpecks(mask, minA);
    return { mask: mask, hash: hashMask(mask), image: mask.count >= 40 ? render(mask, mode === 'digit' ? 3 : 2) : null, count: mask.count };
  }
  return {
    crop: crop, lumOf: lumOf, outlineMask: outlineMask, uiMask: uiMask, digitMask: digitMask,
    components: components, dropSpecks: dropSpecks, hashMask: hashMask, bbox: bbox, render: render, prepare: prepare
  };
});
