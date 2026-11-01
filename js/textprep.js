// Isolates the white, dark-outlined battle text Pokémon Champions draws on the 3D background
// (no solid text box). Tuned on the send-out frame in test/fixtures/champions_sendout.png:
// "Jake716 sent out Rillaboom and Sneasler!" in the lower left.
// Returns black glyphs on white, which is what the OCR engine reads. No network.
(function (root) {
  'use strict';

  function lumOf(r, g, b) { return (r * 77 + g * 150 + b * 29) >> 8; }

  function minFilter(src, w, h, rad) {
    var tmp = new Uint8Array(w * h);
    var out = new Uint8Array(w * h);
    var y, x, m, x0, x1, xx, y0, y1, yy, row;
    for (y = 0; y < h; y++) {
      row = y * w;
      for (x = 0; x < w; x++) {
        m = 255; x0 = x - rad; x1 = x + rad;
        if (x0 < 0) x0 = 0;
        if (x1 >= w) x1 = w - 1;
        for (xx = x0; xx <= x1; xx++) if (src[row + xx] < m) m = src[row + xx];
        tmp[row + x] = m;
      }
    }
    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) {
        m = 255; y0 = y - rad; y1 = y + rad;
        if (y0 < 0) y0 = 0;
        if (y1 >= h) y1 = h - 1;
        for (yy = y0; yy <= y1; yy++) if (tmp[yy * w + x] < m) m = tmp[yy * w + x];
        out[y * w + x] = m;
      }
    }
    return out;
  }

  function dropSpecks(ink, w, h) {
    var seen = new Uint8Array(w * h);
    var stack = [];
    var y, x, p, area, minX, maxX, i, np, nx, ny, q;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        p = y * w + x;
        if (!ink[p] || seen[p]) continue;
        stack.length = 0; stack.push(p); seen[p] = 1;
        area = 0; minX = x; maxX = x;
        var cells = [];
        while (stack.length) {
          q = stack.pop();
          cells.push(q);
          area++;
          nx = q % w;
          if (nx < minX) minX = nx;
          if (nx > maxX) maxX = nx;
          ny = (q - nx) / w;
          var nbs = [q - 1, q + 1, q - w, q + w];
          for (i = 0; i < 4; i++) {
            np = nbs[i];
            if (np < 0 || np >= ink.length || seen[np] || !ink[np]) continue;
            if (i < 2 && (Math.floor(np / w) !== ny)) continue;
            seen[np] = 1;
            stack.push(np);
          }
        }
        if (area < 24 && (maxX - minX) < 8) {
          for (i = 0; i < cells.length; i++) ink[cells[i]] = 0;
        }
      }
    }
  }

  // src is a Uint8ClampedArray / Uint8Array of RGBA (or RGB if channels === 3).
  function prepOutlinedText(src, w, h, channels) {
    channels = channels || 4;
    var n = w * h;
    var lum = new Uint8Array(n);
    var chroma = new Uint8Array(n);
    var i, p, r, g, b, L, mx, mn;
    for (p = 0, i = 0; p < n; p++, i += channels) {
      r = src[i]; g = src[i + 1]; b = src[i + 2];
      L = lumOf(r, g, b);
      lum[p] = L;
      mx = r > g ? r : g; if (b > mx) mx = b;
      mn = r < g ? r : g; if (b < mn) mn = b;
      chroma[p] = mx - mn;
    }
    var local = minFilter(lum, w, h, 3);
    var ink = new Uint8Array(n);
    for (p = 0; p < n; p++) {
      L = lum[p];
      if (L >= 210 && chroma[p] <= 40 && (L - local[p]) >= 90) ink[p] = 1;
    }
    var grow = new Uint8Array(ink);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        p = y * w + x;
        if (ink[p]) continue;
        L = lum[p];
        if (L < 150 || chroma[p] > 50 || (L - local[p]) < 40) continue;
        if ((x > 0 && ink[p - 1]) || (x + 1 < w && ink[p + 1]) || (y > 0 && ink[p - w]) || (y + 1 < h && ink[p + w])) grow[p] = 1;
      }
    }
    var rows = new Int32Array(h);
    var peak = 0;
    for (p = 0; p < n; p++) if (grow[p]) { var ry = (p / w) | 0; rows[ry]++; if (rows[ry] > peak) peak = rows[ry]; }
    // Keep a component only when it crosses a dense text row, so the glyph stays whole
    // and the highlights above the line (they never cross that row) drop off.
    if (peak >= 30) {
      var dense = new Uint8Array(h);
      var core = Math.max(24, peak * 0.35);
      for (y = 0; y < h; y++) if (rows[y] >= core) dense[y] = 1;
      var seen = new Uint8Array(n);
      var stack = [];
      for (y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          p = y * w + x;
          if (!grow[p] || seen[p]) continue;
          stack.length = 0; stack.push(p); seen[p] = 1;
          var cells = [p];
          var hits = dense[y] ? 1 : 0;
          while (stack.length) {
            var q = stack.pop();
            var qx = q % w, qy = (q / w) | 0;
            var nbs = [q - 1, q + 1, q - w, q + w];
            for (var ni = 0; ni < 4; ni++) {
              var np = nbs[ni];
              if (np < 0 || np >= n || seen[np] || !grow[np]) continue;
              if (ni < 2 && ((np / w) | 0) !== qy) continue;
              seen[np] = 1;
              stack.push(np);
              cells.push(np);
              if (dense[(np / w) | 0]) hits++;
            }
          }
          if (!hits) { for (var ci = 0; ci < cells.length; ci++) grow[cells[ci]] = 0; }
        }
      }
    }
    dropSpecks(grow, w, h);

    var y0 = h, y1 = -1, x0 = w, x1 = -1;
    for (p = 0; p < n; p++) if (grow[p]) {
      var xx = p % w, yy = (p / w) | 0;
      if (yy < y0) y0 = yy;
      if (yy > y1) y1 = yy;
      if (xx < x0) x0 = xx;
      if (xx > x1) x1 = xx;
    }
    if (y1 < 0) {
      var blank = new Uint8ClampedArray(w * h * 4);
      blank.fill(255);
      return { data: blank, w: w, h: h, ink: 0 };
    }
    var pad = 8;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    var scale = ch < 64 ? 2 : 1;
    var ow = cw * scale, oh = ch * scale;
    var out = new Uint8ClampedArray(ow * oh * 4);
    var inkN = 0;
    for (var oy = 0; oy < oh; oy++) {
      var sy = y0 + ((oy / scale) | 0);
      for (var ox = 0; ox < ow; ox++) {
        var sx = x0 + ((ox / scale) | 0);
        var on = grow[sy * w + sx] ? 0 : 255;
        if (!on) inkN++;
        var oi = (oy * ow + ox) * 4;
        out[oi] = out[oi + 1] = out[oi + 2] = on;
        out[oi + 3] = 255;
      }
    }
    return { data: out, w: ow, h: oh, ink: inkN };
  }

  root.CCTextPrep = { prepOutlinedText: prepOutlinedText };
})(typeof window !== 'undefined' ? window : globalThis);
