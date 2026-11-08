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

  function startMirror(getVideo, port, getFps) {
    var canvas = root.document.createElement('canvas');
    var ctx = canvas.getContext('2d', { alpha: false });
    var state = { encoding: false, last: 0, frameId: null };
    var dead = false;
    function tick(ts) {
      if (dead) return;
      root.requestAnimationFrame(tick);
      if (!port) return;
      var v = typeof getVideo === 'function' ? getVideo() : getVideo;
      var cap = typeof getFps === 'function' ? getFps() : getFps;
      var fid = isRawVideo(v) ? sourceFrameId(v) : null;
      if (!shouldSend(ts, state, cap, fid)) return;
      if (!isRawVideo(v) || v.readyState < 2 || !v.videoWidth) return;
      var sz = fitSize(v.videoWidth, v.videoHeight);
      if (!sz) return;
      if (canvas.width !== sz.w || canvas.height !== sz.h) { canvas.width = sz.w; canvas.height = sz.h; }
      if (!drawRaw(ctx, v, sz.w, sz.h)) return;
      state.encoding = true; state.last = ts; state.frameId = fid;
      canvas.toBlob(function (blob) {
        if (!blob || dead) { state.encoding = false; return; }
        blob.arrayBuffer().then(function (buf) {
          state.encoding = false;
          if (dead) return;
          try { port.postMessage({ kind: 'jpeg', w: sz.w, h: sz.h, buf: buf }, [buf]); }
          catch (e) { dead = true; }
        }, function () { state.encoding = false; });
      }, 'image/jpeg', JPEG_Q);
    }
    root.requestAnimationFrame(tick);
    return function stop() { dead = true; };
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
  var api = null, desktop = null, huntId = null, opened = false, stopMirror = null, port = null;
  function paint() {
    if (!root.document) return;
    var on = opened;
    root.document.querySelectorAll('[data-projector]').forEach(function (b) { b.classList.toggle('on', on); });
  }
  function restart() {
    if (stopMirror) { stopMirror(); stopMirror = null; }
    if (!port || huntId == null) return;
    stopMirror = startMirror(function () { return api && api.video(huntId); }, port, function () { return api && api.opts ? api.opts().fps : FPS; });
  }
  function payload() {
    var o = api.opts();
    return {
      onTop: !!o.onTop, hideCursor: !!o.hideCursor, overlay: o.overlay !== false,
      fullscreen: !!o.fullscreen, displayId: o.displayId == null ? null : o.displayId, bounds: o.bounds || null,
      theme: api.theme(), lang: api.lang, overlayUrl: api.overlayUrl()
    };
  }
  function toggle(id) {
    if (!desktop) { if (api) api.toast(api.noDesktop); return; }
    if (opened && huntId === id) { desktop.projector.close(); return; }
    var v = api.video(id);
    if (!v) { api.toast(api.noVideo); return; }
    huntId = id;
    desktop.projector.open(payload()).then(function () { opened = true; restart(); paint(); }, function () { api.toast(api.noDesktop); });
  }
  function sourceStopped(id) {
    if (id != null && id !== huntId) return;
    if (desktop) desktop.projector.close();
  }
  function bind(next) {
    api = next;
    desktop = root.desktop && root.desktop.projector;
    if (!desktop) return;
    setPortHandler(function (p) { port = p; restart(); });
    desktop.onClosed(function () {
      opened = false; huntId = null;
      if (stopMirror) { stopMirror(); stopMirror = null; }
      paint();
    });
    desktop.onBounds(function (b) { if (b && api) api.save({ bounds: b }); });
    desktop.onOpts(function (o) {
      if (!o || !api) return;
      api.save({
        onTop: !!o.onTop, hideCursor: !!o.hideCursor, overlay: o.overlay !== false,
        fullscreen: !!o.fullscreen, displayId: o.displayId == null ? null : o.displayId
      });
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
  function isOpen() { return opened; }

  root.CCProjectorMirror = {
    fitSize: fitSize, isRawVideo: isRawVideo, drawRaw: drawRaw, startMirror: startMirror,
    clampFps: clampFps, shouldSend: shouldSend, sourceFrameId: sourceFrameId, setPortHandler: setPortHandler,
    MAX_W: MAX_W, MAX_H: MAX_H, FPS: FPS, FPS_MIN: FPS_MIN, FPS_MAX: FPS_MAX
  };
  root.CCProjector = { bind: bind, toggle: toggle, sourceStopped: sourceStopped, syncOverlay: syncOverlay, isOpen: isOpen };
})(typeof window !== 'undefined' ? window : globalThis);
