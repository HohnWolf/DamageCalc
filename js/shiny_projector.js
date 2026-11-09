/* Projektor des Shiny-Zählers (nur Desktop-App).
   Spiegelt das rohe <video> der Aufnahme (js/shiny_detect.js, sessions[].video) in ein eigenes Fenster.
   Der gelbe Erkennungsrahmen liegt nur auf dem Vorschau-Canvas der Erkennung und wird hier nie gelesen.
   Beide Quellen (Bildschirm und Capture-Karte) laufen über denselben Weg, die Karte wird nicht ein zweites Mal geöffnet. */
(function (root) {
  var MAX_W = 1920, MAX_H = 1080, FPS = 20, FPS_MIN = 10, FPS_MAX = 60, JPEG_Q = 0.8;

  // Ziel-Bilder/s: ganze Zahl 10–60. Leer, unlesbar oder außerhalb wird auf die Grenzen bzw. 20 gesetzt.
  function clampFps(v) {
    if (v == null || typeof v === 'boolean') return FPS;
    if (typeof v === 'string') { v = v.trim(); if (v === '') return FPS; }
    var n = Number(v);
    if (!isFinite(n)) return FPS;
    n = Math.round(n);
    if (n < FPS_MIN) return FPS_MIN;
    if (n > FPS_MAX) return FPS_MAX;
    return n;
  }
  // true = jetzt ein Bild schicken. encoding blockt (kein Stau), gleicher Quellframe wird nicht nochmal kodiert.
  function shouldSend(now, state, fps, frameId) {
    if (!state || state.encoding) return false;
    var cap = clampFps(fps);
    if (state.last > 0 && now - state.last < 1000 / cap) return false;
    if (frameId != null && frameId === state.frameId) return false;
    return true;
  }
  function sourceFrameId(v) {
    if (!v) return null;
    try {
      var q = v.getVideoPlaybackQuality && v.getVideoPlaybackQuality();
      if (q && typeof q.totalVideoFrames === 'number' && q.totalVideoFrames > 0) return 'q' + q.totalVideoFrames;
    } catch (e) { /* manche Streams haben die API nicht */ }
    if (typeof v.webkitDecodedFrameCount === 'number' && v.webkitDecodedFrameCount > 0) return 'w' + v.webkitDecodedFrameCount;
    if (typeof v.currentTime === 'number' && v.currentTime > 0) return 't' + v.currentTime;
    return null;
  }
  var portHandler = null, earlyPort = null;

  function fitSize(vw, vh) {
    vw = vw | 0; vh = vh | 0;
    if (vw < 2 || vh < 2) return null;
    var w = vw, h = vh;
    if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
    w -= w % 2; h -= h % 2;
    if (w < 2 || h < 2) return null;
    return { w: w, h: h };
  }

  // Nur ein <video>. Ein Canvas (der Erkennungsrahmen) wird abgelehnt.
  function isRawVideo(video) {
    return !!(video && String(video.tagName).toUpperCase() === 'VIDEO');
  }
  function drawRaw(ctx, video, w, h) {
    if (!isRawVideo(video) || !ctx || !w || !h) return false;
    ctx.drawImage(video, 0, 0, w, h);
    return true;
  }

  // Lautstärke 0–100. Leer oder unlesbar wird 80.
  function clampScale(v) {
    if (v == null || v === '') return 100;
    var n = Number(v);
    if (!isFinite(n)) return 100;
    n = Math.round(n);
    if (n < 50) return 50;
    if (n > 300) return 300;
    return n;
  }
  // x/y in percent of the window. The scaled box stays inside.
  function placeCounter(x, y, scale, boxW, boxH, winW, winH) {
    scale = clampScale(scale);
    if (x == null || x === '') x = 2;
    if (y == null || y === '') y = 2;
    x = Number(x); y = Number(y);
    if (!isFinite(x)) x = 2;
    if (!isFinite(y)) y = 2;
    boxW = Math.max(1, Number(boxW) || 1);
    boxH = Math.max(1, Number(boxH) || 1);
    winW = Math.max(1, Number(winW) || 1);
    winH = Math.max(1, Number(winH) || 1);
    var sw = boxW * scale / 100, sh = boxH * scale / 100;
    var maxX = Math.max(0, (winW - sw) / winW * 100);
    var maxY = Math.max(0, (winH - sh) / winH * 100);
    if (x < 0) x = 0; if (x > maxX) x = maxX;
    if (y < 0) y = 0; if (y > maxY) y = maxY;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scale: scale };
  }
  function clampVolume(v) {
    if (v == null || v === '' || typeof v === 'boolean') return 80;
    var n = Number(v);
    if (!isFinite(n)) return 80;
    n = Math.round(n);
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }
  // Die Vorschau im Hauptfenster bleibt stumm. Ton gibt es nur im Projektor, nie doppelt.
  function silencePreview(video) {
    if (!video) return;
    try { video.muted = true; } catch (e) { /* schon weg */ }
    try { video.volume = 0; } catch (e) { /* kein Lautstärkeregler */ }
  }
  function liveAudioTrack(stream) {
    var list = stream && stream.getAudioTracks ? stream.getAudioTracks() : [];
    for (var i = 0; i < list.length; i++) {
      var tr = list[i];
      if (tr && tr.readyState !== 'ended') return tr;
    }
    return null;
  }
  function nowMs() { return root.performance && root.performance.now ? root.performance.now() : Date.now(); }

  // Ein Frame der Videoquelle, ohne JPEG und ohne den Vorschau-Canvas (dort liegt der gelbe Rahmen).
  function grabFrame(video, sz) {
    var CIB = root.createImageBitmap;
    if (!CIB) return Promise.reject(new Error('kein createImageBitmap'));
    var opts = { resizeWidth: sz.w, resizeHeight: sz.h, resizeQuality: 'high' };
    return CIB.call(root, video, opts).catch(function () { return CIB.call(root, video); });
  }

  function startMirror(getVideo, port, getFps) {
    var canvas = null, ctx = null;
    var state = { encoding: false, last: 0, frameId: null, since: 0 };
    var dead = false;
    function release() { state.encoding = false; state.since = 0; }
    function jpeg(v, sz, t) {
      if (!canvas) {
        canvas = root.document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:fixed;left:0;top:0;width:8px;height:8px;opacity:0;pointer-events:none';
        if (root.document.body) root.document.body.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
      }
      if (canvas.width !== sz.w || canvas.height !== sz.h) { canvas.width = sz.w; canvas.height = sz.h; }
      if (!drawRaw(ctx, v, sz.w, sz.h)) { release(); return; }
      var done = false;
      var timer = root.setTimeout(function () {
        if (done || dead) return;
        done = true;
        console.error('Projektor: Bildkodierung ohne Antwort');
        release();
      }, 400);
      canvas.toBlob(function (blob) {
        if (done) return;
        done = true;
        root.clearTimeout(timer);
        if (!blob || dead) { release(); return; }
        blob.arrayBuffer().then(function (buf) {
          release();
          if (dead) return;
          try { port.postMessage({ kind: 'jpeg', w: sz.w, h: sz.h, sw: v.videoWidth, sh: v.videoHeight, t: t, buf: buf }, [buf]); }
          catch (e) { dead = true; console.error('Projektor: Bildübertragung', e); }
        }, function (err) { release(); console.error('Projektor: Bildpuffer', err); });
      }, 'image/jpeg', JPEG_Q);
    }
    function tick() {
      if (dead || !port) return;
      var t = nowMs();
      if (state.encoding) {
        if (state.since && t - state.since > 500) { console.error('Projektor: Bild hängt, nächster Frame'); release(); }
        else return;
      }
      var v = typeof getVideo === 'function' ? getVideo() : getVideo;
      var cap = typeof getFps === 'function' ? getFps() : getFps;
      var fid = isRawVideo(v) ? sourceFrameId(v) : null;
      if (!shouldSend(t, state, cap, fid)) return;
      if (!isRawVideo(v) || v.readyState < 2 || !v.videoWidth) return;
      var sz = fitSize(v.videoWidth, v.videoHeight);
      if (!sz) return;
      state.encoding = true; state.since = t; state.last = t; state.frameId = fid;
      grabFrame(v, sz).then(function (bmp) {
        if (dead) { try { bmp.close(); } catch (e) { /* schon zu */ } release(); return; }
        try { port.postMessage({ kind: 'bmp', w: bmp.width || sz.w, h: bmp.height || sz.h, sw: v.videoWidth, sh: v.videoHeight, t: t, bmp: bmp }, [bmp]); release(); }
        catch (e) {
          console.error('Projektor: Bitmap', e);
          try { bmp.close(); } catch (e2) { /* schon übertragen */ }
          jpeg(v, sz, t);
        }
      }, function (err) {
        console.error('Projektor: Frame', err);
        jpeg(v, sz, t);
      });
    }
    // setInterval, nicht requestAnimationFrame: das Hauptfenster verliert den Fokus, sobald der Projektor aufgeht.
    var handle = root.setInterval(tick, 15);
    tick();
    return function stop() {
      dead = true;
      root.clearInterval(handle);
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }

  // Dieselbe Tonspur, direkt auf die Ausgabe. Kein zweites Gerät, kein PCM, die stumme Vorschau spielt nicht mit.
  function startAudio(video, stream, getOpts) {
    silencePreview(video);
    var track = liveAudioTrack(stream);
    var stats = root.__projectorAudioMain = { underruns: 0, peak: 0, playing: false };
    if (!track) return { ok: false, reason: 'no-track', stop: function () {} };
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) { console.error('Projektor: kein AudioContext'); return { ok: false, reason: 'no-api', stop: function () {} }; }
    var ctx, srcNode, gain, analyser, poll, applyTimer, ready = false, stopping = false;
    try {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
      srcNode = ctx.createMediaStreamSource(new MediaStream([track]));
      gain = ctx.createGain();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      srcNode.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(analyser);
      if (ctx.state === 'running') ready = true;
      ctx.onstatechange = function () {
        if (stopping) return;
        if (!ready) { if (ctx.state === 'running') ready = true; return; }
        if (ctx.state === 'interrupted' || ctx.state === 'suspended') {
          stats.underruns++;
          console.error('Projektor: Ton unterbrochen', ctx.state);
          if (ctx.resume) ctx.resume();
        }
      };
      if (ctx.resume) ctx.resume();
    } catch (e) {
      console.error('Projektor: Ton konnte nicht verbunden werden', e);
      try { if (ctx) ctx.close(); } catch (e2) { /* schon zu */ }
      return { ok: false, reason: 'graph', stop: function () {} };
    }
    function level() {
      var o = {};
      try { o = (typeof getOpts === 'function' ? getOpts() : getOpts) || {}; } catch (err) { o = {}; }
      var on = !o || o.sound !== false;
      var vol = clampVolume(o && o.volume) / 100;
      gain.gain.value = on ? vol : 0;
      stats.playing = on && ctx.state === 'running';
    }
    var wave = new root.Uint8Array(analyser.fftSize);
    function measure() {
      silencePreview(video);
      level();
      analyser.getByteTimeDomainData(wave);
      var peak = 0;
      for (var i = 0; i < wave.length; i += 8) { var d = wave[i] - 128; if (d < 0) d = -d; if (d > peak) peak = d; }
      stats.peak = peak;
    }
    level();
    applyTimer = root.setInterval(level, 100);
    poll = root.setInterval(measure, 80);
    measure();
    return {
      ok: true,
      stop: function () {
        stopping = true;
        root.clearInterval(applyTimer); root.clearInterval(poll);
        stats.playing = false;
        try { srcNode.disconnect(); gain.disconnect(); analyser.disconnect(); } catch (e) { /* schon getrennt */ }
        try { ctx.close(); } catch (e) { /* schon zu */ }
      }
    };
  }

  function setPortHandler(fn) {
    portHandler = fn;
    if (earlyPort && fn) { var p = earlyPort; earlyPort = null; fn(p); }
  }
  function takePort(p) {
    if (!p) return;
    try { if (p.start) p.start(); } catch (e) { /* schon gestartet */ }
    if (portHandler) portHandler(p);
    else earlyPort = p;
  }
  if (root.addEventListener) {
    root.addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || d.type !== 'rl-projector-port') return;
      takePort(ev.ports && ev.ports[0]);
    });
  }

  // Steuerung: Fenster auf/zu, Spiegel starten, Optionen merken. api kommt aus js/shiny.js.
  var api = null, desktop = null, huntId = null, opened = false, stopMirror = null, stopAudio = null, port = null, audioWarned = false;
  function paint() {
    if (!root.document) return;
    var on = opened;
    root.document.querySelectorAll('[data-projector]').forEach(function (b) { b.classList.toggle('on', on); });
  }
  function soundOpts() {
    var o = api && api.opts ? api.opts() : {};
    return { sound: !o || o.sound !== false, volume: clampVolume(o && o.volume) };
  }
  function warnNoAudio() {
    var o = soundOpts();
    if (!o.sound || audioWarned) return;
    audioWarned = true;
    console.error('Projektor: Quelle ohne Tonspur');
    if (api && api.toast) api.toast(api.noAudio);
    try { if (port) port.postMessage({ kind: 'audio-status', ok: false }); } catch (e) { console.error('Projektor: Hinweis', e); }
  }
  // Bildrate der Aufnahme: nativ bis 60, oder eine Obergrenze. Kein zweites Gerät.
  function limitCapture(video, native, fps) {
    var list = video && video.srcObject && video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks() : [];
    var rate = native ? { ideal: 60, max: 60 } : { ideal: clampFps(fps), max: clampFps(fps) };
    list.forEach(function (tr) {
      if (!tr.applyConstraints) return;
      tr.applyConstraints({ frameRate: rate }).catch(function (e) { console.error('Projektor: Bildrate', e); });
    });
  }
  function easeCapture(video) {
    var list = video && video.srcObject && video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks() : [];
    list.forEach(function (tr) {
      if (!tr.applyConstraints) return;
      tr.applyConstraints({ frameRate: { ideal: 30, max: 60 } }).catch(function () {});
    });
  }
  function feed() {
    var v = api && api.video(huntId);
    var o = soundOpts();
    return { stream: v && v.srcObject || null, sound: o.sound, volume: o.volume };
  }
  function popupUrl() {
    var path = (root.location && root.location.pathname) || '';
    if (/projector_harness\.html$/.test(path)) return 'projector.html';
    return 'electron/projector.html';
  }
  function openPopup() {
    root.__rlProjectorFeed = feed;
    var child = root.open(popupUrl(), 'rl-projector', 'popup=yes,width=960,height=540');
    if (!child) { console.error('Projektor: Fenster blockiert'); if (api) api.toast(api.openFail); return false; }
    return true;
  }
  function syncLimit() {
    var v = api && api.video(huntId);
    if (!v) return;
    var o = api.opts();
    limitCapture(v, o.native !== false, o.fps);
  }
  function restart() {
    var v = api && api.video(huntId);
    if (!v || !v.srcObject) { warnNoAudio(); return; }
    silencePreview(v);
    var tracks = v.srcObject.getAudioTracks ? v.srcObject.getAudioTracks() : [];
    if (!tracks.length) warnNoAudio();
    else audioWarned = false;
    syncLimit();
  }
  function payload() {
    var o = api.opts();
    return {
      onTop: !!o.onTop, hideCursor: !!o.hideCursor, overlay: o.overlay !== false,
      fullscreen: !!o.fullscreen, displayId: o.displayId == null ? null : o.displayId, bounds: o.bounds || null,
      sound: o.sound !== false, volume: clampVolume(o.volume), mode: o.mode === 'fast' ? 'fast' : 'classic',
      counterX: o.counterX, counterY: o.counterY, counterScale: o.counterScale,
      theme: api.theme(), lang: api.lang, overlayUrl: api.overlayUrl()
    };
  }
  function toggle(id) {
    try {
      if (!api) { console.error('Projektor: nicht bereit'); return; }
      // desktop ist schon die Projektor-Brücke (window.desktop.projector), nicht noch einmal .projector.
      if (!desktop || typeof desktop.open !== 'function') {
        console.error('Projektor: Desktop-Brücke fehlt');
        api.toast(api.noDesktop);
        return;
      }
      if (opened && huntId === id) { easeCapture(api.video(id)); desktop.close(); return; }
      var v = api.video(id);
      if (!v || !v.srcObject) {
        console.error('Projektor: keine laufende Aufnahme');
        api.toast(api.noVideo);
        return;
      }
      huntId = id;
      var pending = desktop.open(payload());
      if (!pending || typeof pending.then !== 'function') { opened = true; if (openPopup()) { restart(); paint(); } return; }
      pending.then(function (r) {
        if (r && r.ok === false) {
          console.error('Projektor', r);
          api.toast(r.message || api.openFail);
          return;
        }
        opened = true;
        if (!openPopup()) return;
        restart();
        paint();
      }, function (err) {
        console.error('Projektor: Öffnen fehlgeschlagen', err);
        api.toast(api.openFail);
      });
    } catch (e) {
      console.error('Projektor: Öffnen fehlgeschlagen', e);
      if (api && api.toast) api.toast(api.openFail);
    }
  }
  function sourceStopped(id) {
    if (id != null && id !== huntId) return;
    if (desktop && desktop.close) desktop.close();
  }
  function bind(next) {
    api = next;
    desktop = root.desktop && root.desktop.projector;
    if (!desktop) return;
    setPortHandler(function (p) { port = p; restart(); });
    desktop.onClosed(function () {
      var v = api && api.video(huntId);
      easeCapture(v);
      opened = false; huntId = null; audioWarned = false;
      if (stopMirror) { stopMirror(); stopMirror = null; }
      if (stopAudio) { stopAudio(); stopAudio = null; }
      paint();
    });
    desktop.onBounds(function (b) { if (b && api) api.save({ bounds: b }); });
    desktop.onOpts(function (o) {
      if (!o || !api) return;
      api.save({
        onTop: !!o.onTop, hideCursor: !!o.hideCursor, overlay: o.overlay !== false,
        fullscreen: !!o.fullscreen, displayId: o.displayId == null ? null : o.displayId,
        sound: o.sound !== false, volume: clampVolume(o.volume), mode: o.mode === 'fast' ? 'fast' : 'classic',
        counterX: o.counterX, counterY: o.counterY, counterScale: o.counterScale
      });
      if (opened) syncLimit();
    });
    if (desktop.onError) desktop.onError(function (o) {
      console.error('Projektor', o && o.message || o);
      if (api && api.toast) api.toast((o && o.message) || api.openFail);
    });
    if (root.MutationObserver && root.document) {
      new root.MutationObserver(function () {
        if (opened) desktop.set({ theme: api.theme() });
      }).observe(root.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
    desktop.state().then(function (s) {
      if (s && s.open) { opened = true; paint(); }
    }, function () {});
  }
  function syncOverlay(url) {
    if (opened && desktop) desktop.set({ overlayUrl: url });
  }
  function syncMode() { if (opened && desktop && api) desktop.set({ mode: api.opts().mode === 'fast' ? 'fast' : 'classic' }); }
  function isOpen() { return opened; }

  root.CCProjectorMirror = {
    fitSize: fitSize, isRawVideo: isRawVideo, drawRaw: drawRaw, startMirror: startMirror, startAudio: startAudio,
    clampFps: clampFps, shouldSend: shouldSend, sourceFrameId: sourceFrameId, setPortHandler: setPortHandler,
    clampVolume: clampVolume, clampScale: clampScale, placeCounter: placeCounter, silencePreview: silencePreview, liveAudioTrack: liveAudioTrack, grabFrame: grabFrame,
    MAX_W: MAX_W, MAX_H: MAX_H, FPS: FPS, FPS_MIN: FPS_MIN, FPS_MAX: FPS_MAX
  };
  root.CCProjector = { bind: bind, toggle: toggle, sourceStopped: sourceStopped, syncOverlay: syncOverlay, syncLimit: syncLimit, syncMode: syncMode, isOpen: isOpen };
})(typeof window !== 'undefined' ? window : globalThis);
