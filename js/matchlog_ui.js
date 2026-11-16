// Matchlog-Oberfläche im Capture-Projektor. Der Kern (js/matchlog*.js) bleibt ohne UI.
// Liest denselben Capture-Strom wie der Projektor, etwa 8 Bilder/s, OCR über den Desktop-Prozess.
(function () {
  var A = window.CC;
  if (!A || !window.CCMatchlog) return;
  var el = A.el, de = A.LANG === 'de';
  var S = de ? {
    title: 'Matchlog (Test)',
    sub: 'Liest Doppelkämpfe aus dem Capture-Bild und schreibt das Protokoll selbst. Das Kampf-Log im Spiel bleibt zu.',
    on: 'Matchlog lesen',
    need: 'Erst eine Quelle verbinden.',
    desk: 'Die Texterkennung läuft in der Desktop-App (im Prozess, ohne PowerShell).',
    scene: 'Szene',
    ocr: 'Letzte OCR',
    roi: 'ROI und letztes Bild',
    save: 'JSON speichern',
    clear: 'Protokoll leeren',
    empty: 'Noch nichts erkannt.',
    fps: 'Abtastung 8 Bilder/s'
  } : {
    title: 'Matchlog (test)',
    sub: 'Reads doubles from the capture and writes the log itself. The in-game battle log stays closed.',
    on: 'Read Matchlog',
    need: 'Connect a source first.',
    desk: 'Text recognition runs in the desktop app (in-process, no PowerShell).',
    scene: 'Scene',
    ocr: 'Last OCR',
    roi: 'ROIs and last frame',
    save: 'Save JSON',
    clear: 'Clear log',
    empty: 'Nothing recognized yet.',
    fps: 'Sampling 8 frames/s'
  };
  function t(k) { return S[k]; }

  var engine = null, timer = null, busy = false, grabbing = false, enabled = false, showRoi = false;
  var hidden = null, cap = null, capTrack = null, capFailed = false;
  var grabCanvas = null, gctx = null, overlay = null, octx = null;
  var logEl = null, sceneEl = null, ocrEl = null, timeEl = null;
  var lastJobs = [];

  function makeEngine() {
    var lex = window.CCMatchlogLex.fromGlobals();
    engine = window.CCMatchlog.create({ lex: lex, digits: window.CCMatchlogDigits || null });
  }
  function stream() {
    var V = window.CCProjectorView;
    var s = V && V.stream ? V.stream() : null;
    if (s) return s;
    var P = window.CCProjector;
    return P && P.stream ? P.stream() : null;
  }
  function liveTrack(s) {
    var list = s && s.getVideoTracks ? s.getVideoTracks() : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].readyState === 'live') return list[i];
    }
    return null;
  }
  function resetSource() {
    cap = null; capTrack = null; capFailed = false;
    if (hidden) {
      try { hidden.pause(); } catch (e) { /* egal */ }
      hidden.srcObject = null;
    }
  }
  function attach(s) {
    if (!hidden) {
      hidden = document.createElement('video');
      hidden.muted = true;
      hidden.playsInline = true;
      hidden.setAttribute('aria-hidden', 'true');
      // Keine opacity: 0: Chromium drosselt sonst das Video-Decoding im Hintergrund.
      hidden.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.002;pointer-events:none;z-index:-1';
      document.body.appendChild(hidden);
    }
    if (hidden.srcObject !== s) {
      hidden.srcObject = s;
      var p = hidden.play();
      if (p && p.catch) p.catch(function () {});
    }
  }
  function drawSource(src, w, h) {
    if (w < 16 || h < 16) return null;
    if (!grabCanvas) {
      grabCanvas = document.createElement('canvas');
      gctx = grabCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (grabCanvas.width !== w) grabCanvas.width = w;
    if (grabCanvas.height !== h) grabCanvas.height = h;
    gctx.drawImage(src, 0, 0, w, h);
    var im = gctx.getImageData(0, 0, w, h);
    return { width: w, height: h, data: im.data };
  }
  function grabVideo(s) {
    var V = window.CCProjectorView;
    var pv = V && V.videoEl ? V.videoEl() : null;
    if (pv && pv.srcObject === s && !pv.paused && pv.readyState >= 2 && pv.videoWidth >= 16) {
      return drawSource(pv, pv.videoWidth, pv.videoHeight);
    }
    attach(s);
    if (!hidden || hidden.readyState < 2) return null;
    return drawSource(hidden, hidden.videoWidth, hidden.videoHeight);
  }
  function grabStream(s) {
    var tr = liveTrack(s);
    if (tr && !capFailed && typeof window.ImageCapture === 'function') {
      if (capTrack !== tr) {
        capTrack = tr;
        try { cap = new window.ImageCapture(tr); } catch (e) { cap = null; capFailed = true; }
      }
      if (cap && typeof cap.grabFrame === 'function') {
        return cap.grabFrame().then(function (bmp) {
          var im = null;
          try { im = drawSource(bmp, bmp.width, bmp.height); }
          finally { try { bmp.close(); } catch (e) { /* schon zu */ } }
          return im;
        }, function () {
          capFailed = true;
          return grabVideo(s);
        });
      }
    }
    return Promise.resolve(grabVideo(s));
  }
  function b64(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function recognize(image) {
    var D = window.desktop && window.desktop.matchlog;
    if (!D || !D.recognize) return Promise.resolve({ error: t('desk'), text: '' });
    return D.recognize({ width: image.width, height: image.height, b64: b64(image.abgr) });
  }
  function paint() {
    if (!logEl || !engine) return;
    var text = engine.text();
    logEl.textContent = text && text.trim() ? text : t('empty');
    var st = engine.state;
    if (sceneEl) sceneEl.textContent = t('scene') + ': ' + (st.debug.scene || '–');
    if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + (st.debug.lastText || '–');
  }
  function drawRoi(image) {
    if (!overlay || !showRoi || !image) return;
    var dw = 480, dh = Math.round(dw * image.height / image.width);
    if (overlay.width !== dw) overlay.width = dw;
    if (overlay.height !== dh) overlay.height = dh;
    octx.drawImage(grabCanvas, 0, 0, dw, dh);
    var Lay = window.CCMatchlogLayout;
    var sx = dw / image.width, sy = dh / image.height;
    octx.strokeStyle = 'rgba(242,201,76,.95)';
    octx.lineWidth = 1;
    var boxes = [Lay.L.battleText, Lay.L.wait, Lay.L.bannerOwn1, Lay.L.bannerOwn2].concat(Lay.L.ownHp, Lay.L.oppPct, Lay.L.moves);
    boxes.forEach(function (b) {
      var s = Lay.scale(image, b);
      octx.strokeRect(s[0] * sx, s[1] * sy, (s[2] - s[0]) * sx, (s[3] - s[1]) * sy);
    });
  }
  function runJobs(jobs, t0, frameInfo) {
    var i = 0;
    function next() {
      if (!enabled || i >= jobs.length) {
        busy = false;
        if (timeEl) timeEl.textContent = t('fps') + (frameInfo ? ' · ' + frameInfo : '') + (jobs.length ? ' · OCR ' + jobs.length : '');
        paint();
        return;
      }
      var job = jobs[i++];
      var ts = Date.now();
      recognize(job.image).then(function (r) {
        engine.apply(job, (r && r.text) || '', { t: t0 });
        if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + ((r && (r.text || r.error)) || '–') + (r && r.ms ? ' (' + r.ms + ' ms)' : ' (' + (Date.now() - ts) + ' ms)');
        next();
      }, function (err) {
        busy = false;
        if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + (err && err.message || err);
      });
    }
    next();
  }
  function tick() {
    if (!enabled) return;
    var s = stream();
    if (!s) {
      resetSource();
      if (sceneEl) sceneEl.textContent = t('need');
      return;
    }
    if (busy || grabbing) return;
    grabbing = true;
    grabStream(s).then(function (image) {
      grabbing = false;
      if (!enabled || !image) return;
      var frameInfo = image.width + '×' + image.height;
      var step = engine.step(image, { t: Date.now() / 1000 });
      if (sceneEl) sceneEl.textContent = t('scene') + ': ' + step.scene;
      drawRoi(image);
      if (step.jobs && step.jobs.length) {
        busy = true;
        lastJobs = step.jobs;
        runJobs(step.jobs, Date.now() / 1000, frameInfo);
      } else {
        if (timeEl) timeEl.textContent = t('fps') + ' · ' + frameInfo;
        paint();
      }
    }, function () {
      grabbing = false;
    });
  }
  function setOn(on) {
    enabled = !!on;
    if (enabled) {
      if (!engine) makeEngine();
      if (!timer) timer = setInterval(tick, 125);
      tick();
    } else if (timer) {
      clearInterval(timer);
      timer = null;
      busy = false;
      grabbing = false;
    }
  }

  function mount(host) {
    if (!host || host.querySelector('.ml-panel')) return;
    makeEngine();
    var box = el('section', { class: 'ml-panel' });
    box.appendChild(el('h3', { text: t('title') }));
    box.appendChild(el('p', { class: 'ml-sub', text: t('sub') }));
    var row = el('div', { class: 'ml-row' });
    var on = el('input', { type: 'checkbox', id: 'mlOn' });
    on.addEventListener('change', function () { setOn(on.checked); });
    var lab = el('label', { class: 'ml-check' });
    lab.appendChild(on);
    lab.appendChild(el('span', { text: t('on') }));
    row.appendChild(lab);
    var roi = el('input', { type: 'checkbox' });
    roi.addEventListener('change', function () {
      showRoi = roi.checked;
      if (overlay) overlay.hidden = !showRoi;
    });
    var rl = el('label', { class: 'ml-check' });
    rl.appendChild(roi);
    rl.appendChild(el('span', { text: t('roi') }));
    row.appendChild(rl);
    var save = el('button', { type: 'button', class: 'tbtn', text: t('save') });
    save.addEventListener('click', function () {
      var snap = engine.snapshot();
      snap.text = engine.text();
      A.saveFile('matchlog.json', JSON.stringify(snap, null, 2), 'application/json');
    });
    row.appendChild(save);
    var clear = el('button', { type: 'button', class: 'tbtn', text: t('clear') });
    clear.addEventListener('click', function () { makeEngine(); paint(); });
    row.appendChild(clear);
    box.appendChild(row);
    if (!(window.desktop && window.desktop.matchlog)) box.appendChild(el('p', { class: 'ml-sub', text: t('desk') }));
    sceneEl = el('div', { class: 'ml-debug', text: t('scene') + ': –' });
    ocrEl = el('div', { class: 'ml-debug', text: t('ocr') + ': –' });
    timeEl = el('div', { class: 'ml-debug', text: t('fps') });
    box.appendChild(sceneEl);
    box.appendChild(ocrEl);
    box.appendChild(timeEl);
    overlay = el('canvas', { class: 'ml-roi' });
    overlay.hidden = true;
    octx = overlay.getContext('2d');
    box.appendChild(overlay);
    logEl = el('pre', { class: 'ml-log', text: t('empty') });
    box.appendChild(logEl);
    host.appendChild(box);
  }
  window.CCMatchlogUI = { mount: mount, setOn: setOn };
})();
