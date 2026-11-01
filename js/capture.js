// Spielaufzeichnung für den Shiny-Zähler.
// Quelle (Bildschirm/Fenster über getDisplayMedia bzw. die Desktop-Quellenliste, oder Kamera/Capture-Karte),
// Ausschnitt im Bild, Graustufen-Vergleich und Windows-Texterkennung (electron/ocr.js, nur Desktop-App).
// Das Bild verlässt den Rechner nicht. Die Zustandsmaschine bleibt im Shiny-Zähler.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  var D = window.desktop && window.desktop.shiny ? window.desktop.shiny : null;
  var S = de ? {
    sources: 'Bildschirm oder Fenster wählen', cancel: 'Abbrechen',
    screen: 'Bildschirm / Fenster', camera: 'Kamera / Capture-Karte'
  } : {
    sources: 'Choose a screen or window', cancel: 'Cancel',
    screen: 'Screen / window', camera: 'Camera / capture card'
  };
  function t(k) { return S[k] != null ? S[k] : k; }

  function openStream(src) {
    if (src.kind === 'camera') {
      // without a size Chromium opens cameras and capture cards at 640x480; ask for Full HD (the device's best below that otherwise)
      var v = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
      if (src.id) v.deviceId = { exact: src.id };
      return navigator.mediaDevices.getUserMedia({ video: v, audio: false });
    }
    if (D && src.id) D.chooseSource(src.id);
    return navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 20 }, audio: false });
  }

  function chooseScreen(cb) {
    if (!D) { cb({ kind: 'screen', id: '', label: t('screen') }); return; }
    D.captureSources().then(function (list) {
      var m = el('div', { class: 'modal' });
      var bx = el('div', { class: 'modal-box wide' });
      bx.appendChild(el('h3', { text: t('sources') }));
      var grid = el('div', { class: 'det-sources' });
      list.forEach(function (s) {
        var b = el('button', { class: 'det-src' });
        if (s.thumb) b.appendChild(el('img', { src: s.thumb, alt: '' }));
        b.appendChild(el('span', { text: s.name }));
        b.addEventListener('click', function () { m.remove(); cb({ kind: 'screen', id: s.id, label: s.name }); });
        grid.appendChild(b);
      });
      bx.appendChild(grid);
      var act = el('div', { class: 'modal-actions' });
      var cc = el('button', { text: t('cancel') });
      cc.addEventListener('click', function () { m.remove(); });
      act.appendChild(cc); bx.appendChild(act);
      m.appendChild(bx);
      m.addEventListener('mousedown', function (ev) { if (ev.target === m) m.remove(); });
      document.body.appendChild(m);
    });
  }

  function cleanRefs(refs) {
    if (!Array.isArray(refs)) return [];
    var bad = refs.some(function (r) { return !r || !r.d || Object.keys(r).length !== 3; });
    return bad ? refs.filter(function (r) { return r && r.d && r.w && r.h; }).map(function (r) { return { w: r.w, h: r.h, d: r.d }; }) : refs;
  }

  function regionPx(video, r) {
    var vw = video.videoWidth, vh = video.videoHeight;
    return { x: Math.round(r.x * vw), y: Math.round(r.y * vh), w: Math.max(2, Math.round(r.w * vw)), h: Math.max(2, Math.round(r.h * vh)) };
  }
  function sampleSize(video, r) {
    var p = regionPx(video, r), w = 48, h = Math.max(6, Math.min(64, Math.round(48 * p.h / p.w)));
    return { w: w, h: h, p: p };
  }

  function createSampler() {
    var work = document.createElement('canvas');
    var wctx = work.getContext('2d', { willReadFrequently: true });
    var ocrCanvas = document.createElement('canvas'), octx = ocrCanvas.getContext('2d');
    function sample(video, r, size) {
      var z = size || sampleSize(video, r), p = z.p || regionPx(video, r);
      work.width = z.w; work.height = z.h;
      wctx.drawImage(video, p.x, p.y, p.w, p.h, 0, 0, z.w, z.h);
      var d = wctx.getImageData(0, 0, z.w, z.h).data, g = new Uint8Array(z.w * z.h);
      for (var i = 0, j = 0; i < d.length; i += 4, j++) g[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
      return { w: z.w, h: z.h, g: g };
    }
    function ocrImage(video, r) {
      var p = regionPx(video, r);
      var dw = p.w, dh = p.h;
      if (dw > 1800) { var s = 1800 / dw; dw = 1800; dh = Math.max(1, Math.round(p.h * s)); }
      // small text reads better a bit larger; Windows OCR takes at most about 2600 px per side
      var k = Math.min(dh < 80 ? 2 : 1, 2400 / dw, 2400 / dh);
      ocrCanvas.width = Math.max(1, Math.round(dw * k)); ocrCanvas.height = Math.max(1, Math.round(dh * k));
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(video, p.x, p.y, p.w, p.h, 0, 0, ocrCanvas.width, ocrCanvas.height);
      return ocrCanvas.toDataURL('image/png').split(',')[1];
    }
    return { regionPx: regionPx, sampleSize: function (video, r) { return sampleSize(video, r); }, sample: sample, ocrImage: ocrImage };
  }

  function similarity(a, b) {
    var n = a.length, ma = 0, mb = 0, i;
    for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    var va = 0, vb = 0, cov = 0, mad = 0;
    for (i = 0; i < n; i++) { var x = a[i] - ma, y = b[i] - mb; va += x * x; vb += y * y; cov += x * y; mad += Math.abs(a[i] - b[i]); }
    mad /= n;
    var sMad = Math.max(0, 1 - mad / 64);
    var sa = Math.sqrt(va / n), sb = Math.sqrt(vb / n);
    if (sa < 4 || sb < 4) return sMad; // flat areas: only the brightness difference counts
    var r = cov / Math.sqrt(va * vb);
    return 0.6 * Math.max(0, r) + 0.4 * sMad;
  }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  var refCache = new WeakMap();
  function refData(ref) {
    var g = refCache.get(ref);
    if (!g) { g = unb64(ref.d); refCache.set(ref, g); }
    return g;
  }

  var TEXT_THR = 0.8;
  function normWords(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
      .split(/[^a-z0-9]+/).filter(Boolean);
  }
  function lev(a, b) {
    var m = a.length, n = b.length, prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  // 1 = the wanted text stands as its own word(s); one misread letter in a 5+ letter name still reaches 0.8.
  // Compared against 1–3 neighbouring words, so "Ratt fratz" still fits, but "Abra" does not fire on "Kadabra".
  function textScore(read, wanted) {
    var words = normWords(read), best = 0;
    wanted.forEach(function (w) {
      var target = normWords(w).join('');
      if (!target) return;
      for (var i = 0; i < words.length; i++) {
        var cand = '';
        for (var k = i; k < Math.min(words.length, i + 3); k++) {
          cand += words[k];
          var sc = 1 - lev(target, cand) / Math.max(target.length, cand.length);
          if (sc > best) best = sc;
        }
      }
    });
    return best;
  }

  window.CCCapture = {
    openStream: openStream, chooseScreen: chooseScreen, cleanRefs: cleanRefs, createSampler: createSampler,
    similarity: similarity, b64: b64, unb64: unb64, refData: refData,
    normWords: normWords, lev: lev, textScore: textScore, TEXT_THR: TEXT_THR,
    ocr: D && D.ocr ? D.ocr : null,
    hasOCR: function () { return !!(D && D.ocr); },
    screenLabel: function () { return t('screen'); },
    cameraLabel: function () { return t('camera'); }
  };
})();
