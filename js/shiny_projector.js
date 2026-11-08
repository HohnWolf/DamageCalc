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
  // Ein PCM-Päckchen aus einem AudioBuffer. sound aus → null (nichts schicken).
  function pcmMessage(input, opts, now) {
    if (!input || !opts || opts.sound === false) return null;
    var n = input.length | 0;
    if (n < 1 || !input.getChannelData) return null;
    var F = root.Float32Array;
    var a = new F(n), b = new F(n);
    a.set(input.getChannelData(0));
    if (input.numberOfChannels > 1) b.set(input.getChannelData(1));
    else b.set(a);
    return { kind: 'pcm', rate: opts.rate || 48000, t: now || 0, a: a, b: b };
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
          try { port.postMessage({ kind: 'jpeg', w: sz.w, h: sz.h, t: root.performance ? root.performance.now() : 0, buf: buf }, [buf]); }
          catch (e) { dead = true; console.error('Projektor: Bildübertragung', e); }
        }, function () { state.encoding = false; });
      }, 'image/jpeg', JPEG_Q);
    }
    root.requestAnimationFrame(tick);
    return function stop() { dead = true; };
  }

  // Dieselbe Tonspur der schon offenen Aufnahme. Das Gerät wird hier nicht noch einmal geöffnet.
  // Im Hauptfenster nur mit Verstärkung 0 anfassen (sonst spielt der Prozessor nicht), hörbar wird es im Projektor.
  function startAudio(video, stream, port, getOpts) {
    silencePreview(video);
    var track = liveAudioTrack(stream);
    if (!track) return { ok: false, reason: 'no-track', stop: function () {} };
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) { console.error('Projektor: kein AudioContext'); return { ok: false, reason: 'no-api', stop: function () {} }; }
    var ctx, srcNode, mute, proc, dead = false;
    try {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
      srcNode = ctx.createMediaStreamSource(new MediaStream([track]));
      mute = ctx.createGain();
      mute.gain.value = 0;
      try { proc = ctx.createScriptProcessor(1024, 2, 2); }
      catch (e) { proc = ctx.createScriptProcessor(1024, 1, 1); }
      srcNode.connect(proc);
      proc.connect(mute);
      mute.connect(ctx.destination);
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    } catch (e) {
      console.error('Projektor: Ton konnte nicht verbunden werden', e);
      try { if (ctx) ctx.close(); } catch (e2) { /* schon zu */ }
      return { ok: false, reason: 'graph', stop: function () {} };
    }
    proc.onaudioprocess = function (ev) {
      if (dead || !port) return;
      silencePreview(video);
      var o = {};
      try { o = (typeof getOpts === 'function' ? getOpts() : getOpts) || {}; } catch (err) { o = {}; }
      var msg = pcmMessage(ev.inputBuffer, { sound: o.sound !== false, volume: o.volume, rate: ctx.sampleRate }, root.performance ? root.performance.now() : 0);
      if (!msg) return;
      try { port.postMessage(msg, [msg.a.buffer, msg.b.buffer]); }
      catch (err) { dead = true; console.error('Projektor: Tonübertragung', err); }
    };
    return {
      ok: true,
      stop: function () {
        dead = true;
        try { proc.onaudioprocess = null; proc.disconnect(); srcNode.disconnect(); mute.disconnect(); } catch (e) { /* schon getrennt */ }
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
  function restart() {
    if (stopMirror) { stopMirror(); stopMirror = null; }
    if (stopAudio) { stopAudio(); stopAudio = null; }
    if (!port || huntId == null) return;
    var getV = function () { return api && api.video(huntId); };
    stopMirror = startMirror(getV, port, function () { return api && api.opts ? api.opts().fps : FPS; });
    var v = getV();
    var stream = v && v.srcObject;
    var audio = startAudio(v, stream, port, soundOpts);
    stopAudio = audio.stop;
    if (!audio.ok) warnNoAudio();
    else audioWarned = false;
  }
  function payload() {
    var o = api.opts();
    return {
      onTop: !!o.onTop, hideCursor: !!o.hideCursor, overlay: o.overlay !== false,
      fullscreen: !!o.fullscreen, displayId: o.displayId == null ? null : o.displayId, bounds: o.bounds || null,
      sound: o.sound !== false, volume: clampVolume(o.volume),
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
      if (opened && huntId === id) { desktop.close(); return; }
      var v = api.video(id);
      if (!v || !v.srcObject) {
        console.error('Projektor: keine laufende Aufnahme');
        api.toast(api.noVideo);
        return;
      }
      huntId = id;
      var pending = desktop.open(payload());
      if (!pending || typeof pending.then !== 'function') { opened = true; restart(); paint(); return; }
      pending.then(function (r) {
        if (r && r.ok === false) {
          console.error('Projektor', r);
          api.toast(r.message || api.openFail);
          return;
        }
        opened = true; restart(); paint();
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
        sound: o.sound !== false, volume: clampVolume(o.volume)
      });
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
  function isOpen() { return opened; }

  root.CCProjectorMirror = {
    fitSize: fitSize, isRawVideo: isRawVideo, drawRaw: drawRaw, startMirror: startMirror, startAudio: startAudio,
    clampFps: clampFps, shouldSend: shouldSend, sourceFrameId: sourceFrameId, setPortHandler: setPortHandler,
    clampVolume: clampVolume, silencePreview: silencePreview, liveAudioTrack: liveAudioTrack, pcmMessage: pcmMessage,
    MAX_W: MAX_W, MAX_H: MAX_H, FPS: FPS, FPS_MIN: FPS_MIN, FPS_MAX: FPS_MAX
  };
  root.CCProjector = { bind: bind, toggle: toggle, sourceStopped: sourceStopped, syncOverlay: syncOverlay, isOpen: isOpen };
})(typeof window !== 'undefined' ? window : globalThis);
