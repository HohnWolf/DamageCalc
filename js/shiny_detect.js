// Automatische Erkennung für den Shiny-Zähler (ALPHA).
// Ablauf: Quelle wählen (Bildschirm/Fenster oder Kamera/Capture-Karte) → Bereich im Bild markieren →
// Referenz aufnehmen, während die Begegnung zu sehen ist (z. B. Kampfbeginn, Textbox) → Erkennung starten.
// Jedes Bild wird im markierten Bereich verkleinert, in Graustufen mit den Referenzen verglichen
// (Korrelation + mittlere Abweichung) und über eine Zustandsmaschine gezählt:
//   bereit → Treffer in Folge ≥ N → +1 und gesperrt → Ähnlichkeit fällt unter die Schwelle → Abklingzeit → bereit
// So zählt eine Begegnung genau einmal. Alles läuft lokal; das Bild verlässt den Rechner nicht.
// Modus „Text suchen“ (nur Windows-App): statt eines Bildvergleichs liest die Windows-Texterkennung den Text im Rahmen
// (electron/ocr.js) und zählt, sobald der gesuchte Name darin steht; kleine Lesefehler werden toleriert.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  var D = window.desktop && window.desktop.shiny ? window.desktop.shiny : null;
  var S = de ? {
    title: 'Automatische Erkennung', off: 'aus', ready: 'bereit', latched: 'erkannt', cooldown: 'Pause', noSource: 'keine Quelle',
    screen: 'Bildschirm / Fenster', camera: 'Kamera / Capture-Karte', cameraN: 'Kamera {0}', pickSource: 'Quelle wählen', reconnect: 'Verbinden: {0}',
    disconnect: 'Quelle trennen', regionHint: 'Ziehe im Bild einen Rahmen um eine Stelle, die nur bei einer Begegnung so aussieht (z. B. die KP-Leiste des Gegners oder die Textbox).',
    refs: 'Referenzen', addRef: 'Begegnung jetzt aufnehmen', addRefT: 'Klicken, während die Begegnung zu sehen ist', noRefs: 'Noch keine Referenz.',
    score: 'Ähnlichkeit {0} · Schwelle {1}', thr: 'Schwelle', calib: 'Ruhewert messen', calibT: 'Klicken, während KEINE Begegnung zu sehen ist (z. B. in der Oberwelt). Misst 3 Sekunden und setzt die Schwelle passend.',
    calibDone: 'Schwelle auf {0} gesetzt (Ruhewert {1})', measuring: 'Messe …', hits: 'Treffer in Folge', cool: 'Pause nach Treffer (s)',
    startDet: 'Erkennung starten', stopDet: 'Erkennung stoppen', test: 'Nur testen (nicht zählen)', counted: 'In dieser Sitzung erkannt: {0}',
    noRegion: 'Erst einen Bereich markieren.', noRef: 'Erst eine Referenz aufnehmen.', regionChanged: 'Der Bereich hat sich geändert: vorhandene Referenzen passen nicht mehr und wurden entfernt.',
    errSource: 'Die Quelle konnte nicht geöffnet werden: {0}', del: 'Entfernen', sources: 'Bildschirm oder Fenster wählen', cancel: 'Abbrechen',
    alphaNote: 'Frühe Testversion: Bitte mit „Nur testen“ prüfen, ob jede Begegnung genau einmal erkannt wird, bevor du sie zählen lässt.',
    testHit: 'Test: Begegnung erkannt',
    modeImage: 'Bild vergleichen', modeText: 'Text suchen', modeTextT: 'Liest den Text im Rahmen (Windows-Texterkennung) und zählt, sobald der gesuchte Name darin steht',
    words: 'Gesuchter Text', wordsHint: 'Mehrere Varianten mit Komma trennen. Leer = Name des Hunts ({0}).', wordsHintNone: 'Mehrere Varianten mit Komma trennen.',
    regionHintText: 'Ziehe im Bild einen Rahmen um die Stelle, an der der Name steht (z. B. die Textbox „Ein wildes … erscheint!“ oder das Namensfeld des Gegners).',
    read: 'Gelesen: {0}', readNone: '(kein Text)', match: 'Übereinstimmung {0} · nötig {1}', reading: 'Lese …',
    noWords: 'Erst den gesuchten Text eingeben.', ocrDesktop: 'Texterkennung gibt es nur in der Windows-App.', ocrErr: 'Texterkennung: {0}'
  } : {
    title: 'Auto detection', off: 'off', ready: 'ready', latched: 'detected', cooldown: 'cooldown', noSource: 'no source',
    screen: 'Screen / window', camera: 'Camera / capture card', cameraN: 'Camera {0}', pickSource: 'Choose source', reconnect: 'Connect: {0}',
    disconnect: 'Disconnect source', regionHint: 'Drag a frame in the picture around a spot that only looks like this during an encounter (e.g. the opponent’s HP bar or the text box).',
    refs: 'References', addRef: 'Capture encounter now', addRefT: 'Click while the encounter is visible', noRefs: 'No reference yet.',
    score: 'Similarity {0} · threshold {1}', thr: 'Threshold', calib: 'Measure idle value', calibT: 'Click while NO encounter is visible (e.g. in the overworld). Measures 3 seconds and sets a fitting threshold.',
    calibDone: 'Threshold set to {0} (idle value {1})', measuring: 'Measuring …', hits: 'Hits in a row', cool: 'Pause after a hit (s)',
    startDet: 'Start detection', stopDet: 'Stop detection', test: 'Test only (do not count)', counted: 'Detected in this session: {0}',
    noRegion: 'Mark an area first.', noRef: 'Capture a reference first.', regionChanged: 'The area changed: existing references no longer fit and were removed.',
    errSource: 'The source could not be opened: {0}', del: 'Remove', sources: 'Choose a screen or window', cancel: 'Cancel',
    alphaNote: 'Early test version: use "Test only" to check that every encounter is detected exactly once before letting it count.',
    testHit: 'Test: encounter detected',
    modeImage: 'Compare picture', modeText: 'Find text', modeTextT: 'Reads the text in the frame (Windows text recognition) and counts as soon as the wanted name appears',
    words: 'Wanted text', wordsHint: 'Separate several variants with commas. Empty = name of the hunt ({0}).', wordsHintNone: 'Separate several variants with commas.',
    regionHintText: 'Drag a frame in the picture around the spot where the name appears (e.g. the text box "A wild … appeared!" or the opponent’s name field).',
    read: 'Read: {0}', readNone: '(no text)', match: 'Match {0} · needed {1}', reading: 'Reading …',
    noWords: 'Enter the wanted text first.', ocrDesktop: 'Text recognition is only available in the Windows app.', ocrErr: 'Text recognition: {0}'
  };
  function t(k) { var s = S[k] != null ? S[k] : k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }
  function num(x, d) { return x.toLocaleString(de ? 'de-DE' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  var sessions = {};
  // up to 1.3.0 the decoded pixels (_g) were stored along with each reference and came back broken after a restart;
  // keep only w, h and d (the picture itself is intact in d)
  function cleanRefs(refs) {
    if (!Array.isArray(refs)) return [];
    var bad = refs.some(function (r) { return !r || !r.d || Object.keys(r).length !== 3; });
    return bad ? refs.filter(function (r) { return r && r.d && r.w && r.h; }).map(function (r) { return { w: r.w, h: r.h, d: r.d }; }) : refs;
  }
  function cfg(h) {
    h.detect = h.detect || {};
    var c = h.detect;
    if (c.thr == null) c.thr = 0.85;
    if (c.hits == null) c.hits = 3;
    if (c.cool == null) c.cool = 1.5;
    if (c.mode !== 'text') c.mode = 'image';
    if (typeof c.words !== 'string') c.words = '';
    c.refs = cleanRefs(c.refs);
    return c;
  }

  // ---------------- sources ----------------
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
  function connect(h, src, api) {
    stop(h.id);
    return openStream(src).then(function (stream) {
      var video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream;
      video.play().catch(function () { /* autoplay is allowed for muted video */ });
      var s = sessions[h.id] = { stream: stream, video: video, src: src, running: false, state: 'idle', hitsN: 0, missN: 0, until: 0, score: 0, counted: 0, api: api, hunt: h };
      stream.getVideoTracks().forEach(function (tr) { tr.addEventListener('ended', function () { stop(h.id); if (s.api && s.api.persist) s.api.persist(); rerenderPanel(h.id); }); });
      cfg(h).source = { kind: src.kind, id: src.id, label: src.label };
      return s;
    });
  }
  function stop(id) {
    var s = sessions[id];
    if (!s) return;
    clearInterval(s.loop);
    try { s.stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { /* already stopped */ }
    delete sessions[id];
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

  // ---------------- image comparison ----------------
  var work = document.createElement('canvas');
  var wctx = work.getContext('2d', { willReadFrequently: true });
  function regionPx(video, r) {
    var vw = video.videoWidth, vh = video.videoHeight;
    return { x: Math.round(r.x * vw), y: Math.round(r.y * vh), w: Math.max(2, Math.round(r.w * vw)), h: Math.max(2, Math.round(r.h * vh)) };
  }
  function sampleSize(video, r) {
    var p = regionPx(video, r), w = 48, h = Math.max(6, Math.min(64, Math.round(48 * p.h / p.w)));
    return { w: w, h: h, p: p };
  }
  function sample(video, r, size) {
    var z = size || sampleSize(video, r), p = z.p || regionPx(video, r);
    work.width = z.w; work.height = z.h;
    wctx.drawImage(video, p.x, p.y, p.w, p.h, 0, 0, z.w, z.h);
    var d = wctx.getImageData(0, 0, z.w, z.h).data, g = new Uint8Array(z.w * z.h);
    for (var i = 0, j = 0; i < d.length; i += 4, j++) g[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    return { w: z.w, h: z.h, g: g };
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
  // decoded reference pixels live only in memory: the stored reference is just { w, h, d } (d = base64)
  var refCache = new WeakMap();
  function refData(ref) {
    var g = refCache.get(ref);
    if (!g) { g = unb64(ref.d); refCache.set(ref, g); }
    return g;
  }
  function scoreNow(s, c) {
    var v = s.video;
    if (!c.region || !c.refs.length || v.readyState < 2 || !v.videoWidth) return null;
    var ref0 = c.refs[0];
    var cur = sample(v, c.region, { w: ref0.w, h: ref0.h, p: regionPx(v, c.region) });
    var best = 0;
    c.refs.forEach(function (r) { if (r.w === cur.w && r.h === cur.h) best = Math.max(best, similarity(refData(r), cur.g)); });
    return best;
  }

  // ---------------- text search (Windows OCR, electron/ocr.js) ----------------
  var TEXT_THR = 0.8;
  var OCR = D && D.ocr ? D.ocr : null;
  // lower case, no accents, ß → ss, everything else than letters and digits becomes a word gap
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
  function wantedTexts(c, api) {
    var list = String(c.words || '').split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!list.length && api && api.name) { var nm = api.name(); if (nm) list = [nm]; }
    return list;
  }
  var ocrCanvas = document.createElement('canvas'), octx = ocrCanvas.getContext('2d');
  function ocrImage(video, r) {
    var p = regionPx(video, r);
    // small text reads better a bit larger; Windows OCR takes at most about 2600 px per side
    var k = Math.min(p.h < 80 ? 2 : 1, 2400 / p.w, 2400 / p.h);
    ocrCanvas.width = Math.max(1, Math.round(p.w * k)); ocrCanvas.height = Math.max(1, Math.round(p.h * k));
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(video, p.x, p.y, p.w, p.h, 0, 0, ocrCanvas.width, ocrCanvas.height);
    return ocrCanvas.toDataURL('image/png').split(',')[1];
  }
  // one picture at a time, at most 5 per second
  function textTick(s, c) {
    var v = s.video;
    if (!OCR || s.ocrBusy || !c.region || v.readyState < 2 || !v.videoWidth || Date.now() - (s.ocrAt || 0) < 200) return;
    var img;
    try { img = ocrImage(v, c.region); } catch (e) { return; }
    s.ocrBusy = true; s.ocrAt = Date.now();
    OCR(img).then(function (r) {
      s.ocrBusy = false;
      if (sessions[s.hunt.id] !== s) return; // disconnected meanwhile
      var cc = cfg(s.hunt);
      if (cc.mode !== 'text') return;
      if (!r || r.error) { s.ocrErr = r ? r.error : '?'; s.score = 0; return; }
      s.ocrErr = ''; s.ocrText = r.text || '';
      s.score = textScore(s.ocrText, wantedTexts(cc, s.api));
      if (s.running) step(s, cc, s.score, TEXT_THR);
    }, function (e) { s.ocrBusy = false; s.ocrErr = String(e && e.message || e); });
  }

  // ---------------- detection loop ----------------
  // ready → N hits in a row → +1 and latched → score drops below the threshold → cooldown → ready
  function step(s, c, sc, thr) {
    var now = Date.now();
    if (s.state === 'idle') {
      if (sc >= thr) { s.hitsN++; if (s.hitsN >= c.hits) { s.state = 'latched'; s.missN = 0; hit(s); } }
      else s.hitsN = 0;
    } else if (s.state === 'latched') {
      if (sc < thr - 0.08) { s.missN++; if (s.missN >= 3) { s.state = 'cooldown'; s.until = now + c.cool * 1000; } }
      else s.missN = 0;
    } else if (s.state === 'cooldown' && now >= s.until) { s.state = 'idle'; s.hitsN = 0; }
  }
  function startLoop(s) {
    clearInterval(s.loop);
    s.loop = setInterval(function () {
      var h = s.hunt, c = cfg(h);
      if (c.mode === 'text') { textTick(s, c); return; }
      var sc = scoreNow(s, c);
      if (sc == null) return;
      s.score = sc;
      if (s.calib) { s.calib.push(sc); }
      if (s.running) step(s, c, sc, c.thr);
    }, 100);
  }
  function hit(s) {
    s.counted++;
    if (cfg(s.hunt).test) { A.toast(t('testHit')); return; }
    if (s.api && s.api.count) s.api.count();
  }

  // ---------------- panel ----------------
  var panels = {};
  function rerenderPanel(id) { var p = panels[id]; if (p && document.contains(p.box)) panel(p.box, p.h, p.api); }
  function panel(box, h, api) {
    panels[h.id] = { box: box, h: h, api: api };
    var c = cfg(h), s = sessions[h.id];
    if (s) { s.api = api; s.hunt = h; }
    box.innerHTML = '';
    var head = el('div', { class: 'det-head' });
    var ttl = el('span', { class: 'sl-title', text: t('title') });
    ttl.appendChild(el('span', { class: 'alpha-badge', text: 'ALPHA' }));
    head.appendChild(ttl);
    var stEl = el('span', { class: 'det-state' });
    head.appendChild(stEl);
    box.appendChild(head);
    box.appendChild(el('div', { class: 'det-alpha', text: t('alphaNote') }));
    if (!s) {
      var row = el('div', { class: 'det-row' });
      var sb = el('button', { class: 'tbtn', text: t('screen') });
      sb.addEventListener('click', function () { chooseScreen(function (src) { go(src); }); });
      row.appendChild(sb);
      var camSel = el('select', { class: 'det-cam' });
      camSel.appendChild(el('option', { value: '', text: t('camera') + ' …' }));
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(function (devs) {
          var i = 0;
          devs.forEach(function (d) { if (d.kind === 'videoinput') { i++; camSel.appendChild(el('option', { value: d.deviceId, text: d.label || t('cameraN', i) })); } });
        });
      }
      camSel.addEventListener('change', function () {
        if (!camSel.value && camSel.selectedIndex === 0) return;
        go({ kind: 'camera', id: camSel.value, label: camSel.options[camSel.selectedIndex].text });
      });
      row.appendChild(camSel);
      if (c.source && c.source.label) {
        var rc = el('button', { class: 'tbtn', text: t('reconnect', c.source.label) });
        rc.addEventListener('click', function () { go(c.source); });
        row.appendChild(rc);
      }
      box.appendChild(row);
      stEl.textContent = t('noSource');
      return;
    }
    function go(src) {
      connect(h, src, api).then(function () { api.persist(); panel(box, h, api); }, function (e) { A.toast(t('errSource', e && e.message ? e.message : e)); });
    }

    var textMode = c.mode === 'text';
    var mr = el('div', { class: 'det-row' });
    var mg = el('div', { class: 'btn-group' });
    [['image', t('modeImage')], ['text', t('modeText')]].forEach(function (m) {
      var b = el('button', { class: c.mode === m[0] ? 'on' : '', text: m[1] });
      if (m[0] === 'text') { b.title = OCR ? t('modeTextT') : t('ocrDesktop'); b.disabled = !OCR; }
      b.addEventListener('click', function () {
        if (c.mode === m[0]) return;
        c.mode = m[0]; s.running = false; s.state = 'idle'; s.hitsN = 0; s.score = 0; s.ocrText = ''; s.ocrErr = '';
        api.persist(); panel(box, h, api);
      });
      mg.appendChild(b);
    });
    mr.appendChild(mg);
    box.appendChild(mr);

    // preview with region selection
    var cv = el('canvas', { class: 'det-preview' });
    box.appendChild(cv);
    box.appendChild(el('div', { class: 'hint', text: t(textMode ? 'regionHintText' : 'regionHint') }));
    var ctx = cv.getContext('2d');
    var drag = null;
    function rel(ev) { var r = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) }; }
    cv.addEventListener('mousedown', function (ev) { drag = { a: rel(ev), b: rel(ev) }; });
    window.addEventListener('mousemove', function mm(ev) { if (!document.contains(cv)) { window.removeEventListener('mousemove', mm); return; } if (drag) drag.b = rel(ev); });
    window.addEventListener('mouseup', function mu(ev) {
      if (!document.contains(cv)) { window.removeEventListener('mouseup', mu); return; }
      if (!drag) return;
      drag.b = rel(ev);
      var x = Math.min(drag.a.x, drag.b.x), y = Math.min(drag.a.y, drag.b.y), w = Math.abs(drag.a.x - drag.b.x), hh = Math.abs(drag.a.y - drag.b.y);
      drag = null;
      if (w < 0.01 || hh < 0.01) return;
      if (c.refs.length && !textMode) { c.refs = []; A.toast(t('regionChanged')); }
      c.region = { x: x, y: y, w: w, h: hh };
      api.persist(); panel(box, h, api);
    });
    function draw() {
      if (!document.contains(cv)) return;
      var v = s.video;
      if (v.videoWidth) {
        var W = cv.clientWidth || 480, H = Math.round(W * v.videoHeight / v.videoWidth);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        ctx.drawImage(v, 0, 0, W, H);
        var r = drag ? { x: Math.min(drag.a.x, drag.b.x), y: Math.min(drag.a.y, drag.b.y), w: Math.abs(drag.a.x - drag.b.x), h: Math.abs(drag.a.y - drag.b.y) } : c.region;
        if (r) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = s.state === 'latched' ? '#3fae6a' : '#f2c94c';
          ctx.strokeRect(r.x * W, r.y * H, r.w * W, r.h * H);
        }
      }
      // state and score
      var st = !s.running ? t('off') : t(s.state === 'idle' ? 'ready' : s.state);
      stEl.textContent = (s.src.label || '') + ' · ' + st;
      stEl.className = 'det-state ' + (s.running ? s.state : 'off');
      if (meterFill) {
        var thr = textMode ? TEXT_THR : c.thr;
        meterFill.style.width = Math.round((s.score || 0) * 100) + '%';
        meterFill.className = (s.score || 0) >= thr ? 'on' : '';
        meterMark.style.left = Math.round(thr * 100) + '%';
        if (textMode) {
          var rd = s.ocrErr ? t('ocrErr', s.ocrErr) : s.ocrText == null ? t('reading') : t('read', s.ocrText ? '„' + s.ocrText.replace(/\s+/g, ' ').slice(0, 90) + '“' : t('readNone'));
          meterTxt.textContent = rd + ' · ' + t('match', num(s.score || 0, 2), num(thr, 2));
        } else meterTxt.textContent = t('score', num(s.score || 0, 2), num(c.thr, 2));
        cntTxt.textContent = t('counted', s.counted);
      }
      requestAnimationFrame(draw);
    }
    var tools = el('div', { class: 'det-row' });
    var dc = el('button', { class: 'tbtn', text: t('disconnect') });
    dc.addEventListener('click', function () { stop(h.id); api.persist(); panel(box, h, api); });
    tools.appendChild(dc);
    box.appendChild(tools);

    // text mode: what to look for (empty = name of the hunt)
    if (textMode) {
      var nm = api.name ? api.name() : '';
      var wr = el('div', { class: 'det-words' });
      var wl = el('label', { class: 'nc-sel' });
      wl.appendChild(el('span', { text: t('words') }));
      var wi = el('input', { type: 'text', value: c.words, placeholder: nm, spellcheck: 'false' });
      wi.addEventListener('input', function () { c.words = wi.value; api.persist(); });
      wl.appendChild(wi);
      wr.appendChild(wl);
      wr.appendChild(el('div', { class: 'hint', text: nm ? t('wordsHint', nm) : t('wordsHintNone') }));
      box.appendChild(wr);
    }
    // references
    var rf = el('div', { class: 'det-refs' });
    if (textMode) rf.hidden = true;
    rf.appendChild(el('span', { class: 'sh-lbl', text: t('refs') }));
    if (!c.refs.length) rf.appendChild(el('span', { class: 'hint', text: t('noRefs') }));
    c.refs.forEach(function (r, i) {
      var tc = el('canvas', { class: 'det-ref', width: r.w, height: r.h, title: t('del') });
      var tctx = tc.getContext('2d'), img = tctx.createImageData(r.w, r.h), g = refData(r);
      for (var k = 0; k < g.length; k++) { img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = g[k]; img.data[k * 4 + 3] = 255; }
      tctx.putImageData(img, 0, 0);
      tc.addEventListener('click', function () { c.refs.splice(i, 1); api.persist(); panel(box, h, api); });
      rf.appendChild(tc);
    });
    var ar = el('button', { class: 'tbtn', text: t('addRef'), title: t('addRefT') });
    ar.addEventListener('click', function () {
      if (!c.region) { A.toast(t('noRegion')); return; }
      var smp = c.refs.length ? sample(s.video, c.region, { w: c.refs[0].w, h: c.refs[0].h, p: regionPx(s.video, c.region) }) : sample(s.video, c.region);
      c.refs.push({ w: smp.w, h: smp.h, d: b64(smp.g) });
      api.persist(); panel(box, h, api);
    });
    rf.appendChild(ar);
    box.appendChild(rf);

    // score meter + threshold
    var meter = el('div', { class: 'det-meter' });
    var meterFill = el('span');
    var meterMark = el('i');
    meter.appendChild(meterFill); meter.appendChild(meterMark);
    box.appendChild(meter);
    var meterTxt = el('div', { class: 'hint' });
    box.appendChild(meterTxt);
    var set = el('div', { class: 'det-row' });
    var tw = el('label', { class: 'nc-sel' }); tw.appendChild(el('span', { text: t('thr') }));
    var tr = el('input', { type: 'range', min: 50, max: 99, value: Math.round(c.thr * 100) });
    tr.addEventListener('input', function () { c.thr = +tr.value / 100; api.persist(); });
    tw.appendChild(tr); if (!textMode) set.appendChild(tw);
    var cal = el('button', { class: 'tbtn', text: t('calib'), title: t('calibT') });
    cal.addEventListener('click', function () {
      if (!c.refs.length) { A.toast(t('noRef')); return; }
      cal.disabled = true; cal.textContent = t('measuring');
      s.calib = [];
      if (!s.loop) startLoop(s);
      setTimeout(function () {
        var vals = s.calib || []; s.calib = null;
        var mx = vals.length ? Math.max.apply(null, vals) : 0.5;
        c.thr = Math.min(0.97, Math.max(0.6, Math.round((mx + (1 - mx) / 2) * 100) / 100));
        api.persist(); A.toast(t('calibDone', num(c.thr, 2), num(mx, 2)));
        panel(box, h, api);
      }, 3000);
    });
    if (!textMode) set.appendChild(cal);
    var hw = el('label', { class: 'nc-sel' }); hw.appendChild(el('span', { text: t('hits') }));
    var hi = el('input', { type: 'number', min: 1, max: 20, value: c.hits });
    hi.addEventListener('change', function () { c.hits = Math.max(1, Math.min(20, +hi.value || 3)); api.persist(); });
    hw.appendChild(hi); set.appendChild(hw);
    var cw = el('label', { class: 'nc-sel' }); cw.appendChild(el('span', { text: t('cool') }));
    var ci = el('input', { type: 'number', min: 0, max: 60, step: 0.5, value: c.cool });
    ci.addEventListener('change', function () { c.cool = Math.max(0, Math.min(60, +ci.value || 0)); api.persist(); });
    cw.appendChild(ci); set.appendChild(cw);
    box.appendChild(set);

    var run = el('div', { class: 'det-row' });
    var rb = el('button', { class: s.running ? 'tbtn danger' : 'primary-btn', text: s.running ? t('stopDet') : t('startDet') });
    rb.addEventListener('click', function () {
      if (!s.running) {
        if (!c.region) { A.toast(t('noRegion')); return; }
        if (textMode) {
          if (!OCR) { A.toast(t('ocrDesktop')); return; }
          if (!wantedTexts(c, api).length) { A.toast(t('noWords')); return; }
        } else if (!c.refs.length) { A.toast(t('noRef')); return; }
        s.running = true; s.state = 'idle'; s.hitsN = 0;
      } else s.running = false;
      if (!s.loop) startLoop(s);
      panel(box, h, api);
    });
    run.appendChild(rb);
    var tl = el('label', { class: 'nc-check sh-chk' });
    var tc2 = el('input', { type: 'checkbox' }); tc2.checked = !!c.test;
    tc2.addEventListener('change', function () { c.test = tc2.checked; api.persist(); });
    tl.appendChild(tc2); tl.appendChild(document.createTextNode(' ' + t('test')));
    run.appendChild(tl);
    var cntTxt = el('span', { class: 'hint' });
    run.appendChild(cntTxt);
    box.appendChild(run);
    if (!s.loop) startLoop(s);
    requestAnimationFrame(draw);
  }

  window.CCShinyDetect = {
    panel: panel, stop: stop, cleanRefs: cleanRefs,
    isRunning: function (id) { return !!(sessions[id] && sessions[id].running); },
    _similarity: similarity, _sessions: sessions, _textScore: textScore,
    // for tests: use any MediaStream (e.g. canvas.captureStream()) as the source
    _attach: function (h, stream, api) {
      stop(h.id);
      var video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream; video.play().catch(function () {});
      sessions[h.id] = { stream: stream, video: video, src: { kind: 'test', label: 'Test' }, running: false, state: 'idle', hitsN: 0, missN: 0, until: 0, score: 0, counted: 0, api: api, hunt: h };
      return sessions[h.id];
    }
  };
})();
