// Clips für den Shiny-Zähler: Replay-Puffer wie in OBS. Die Spielquelle (Bildschirm/Fenster, Kamera/Capture-Karte
// oder die Quelle der automatischen Erkennung) wird im Hintergrund aufgenommen; ein Clip speichert die letzten
// Sekunden plus ein paar danach. Auslöser: Knopf, globaler Hotkey, „Gefunden!“ und Phase (einstellbar).
// Ablauf: MediaRecorder lassen sich nicht vorn kürzen. Deshalb startet alle <davor> Sekunden ein neuer Rekorder und
// alte werden verworfen; beim Clip nimmt der älteste weiter auf (er hat <davor> bis 2 × <davor> Sekunden) und hört
// <danach> Sekunden später auf. So entsteht immer eine vollständige, abspielbare Datei.
// Gespeichert wird in der Desktop-App im Ordner „Videos\Rattata Lab Clips“ (electron/shiny.js), im Browser als Download.
// Das Bild verlässt den Rechner nicht.
(function () {
  'use strict';
  var A = window.CC, Cap = window.CCCapture;
  if (!A || !Cap) return;
  var el = A.el, de = A.LANG === 'de';
  var D = window.desktop && window.desktop.shiny ? window.desktop.shiny : null;
  var S = de ? {
    title: 'Clips', off: 'aus', buffering: 'Puffer läuft ({0})', saving: 'Clip wird aufgenommen …', noRec: 'Aufnahme wird hier nicht unterstützt.',
    hint: 'Nimmt die Spielquelle im Hintergrund auf und speichert auf Knopfdruck, per Hotkey oder automatisch die letzten Sekunden als Video.',
    screen: 'Bildschirm / Fenster', camera: 'Kamera / Capture-Karte', cameraN: 'Kamera {0}', fromDetect: 'Quelle der Erkennung', reconnect: 'Verbinden: {0}', stop: 'Puffer stoppen',
    save: '● Clip speichern', before: 'Sekunden davor', after: 'Sekunden danach', quality: 'Qualität', audio: 'Tonquellen', audioAdd: '+ Tonquelle hinzufügen …',
    audioNone: 'Keine Tonquelle ausgewählt (Clip ohne Ton).', audioSys: 'Systemton (Desktop / Spiel / Discord)', audioDetect: 'Ton der Erkennung',
    audioIn: 'Eingang: {0}', audioInN: 'Eingang {0}', audioDel: 'Tonquelle entfernen', audioVol: 'Lautstärke',
    audioHint: 'Tipp: Für getrenntes Spiel- & Discord-Audio virtuelle Eingänge (z. B. VB-Cable, VoiceMeeter, Wave Link) oder Capture-Karte + Systemton nutzen.',
    audioRestart: 'Neue Tonquelle wird beim nächsten Start des Puffers aktiv.', errAudio: 'Tonquelle „{0}“ nicht verfügbar: {1}',
    autoFound: 'Bei „Gefunden!“', autoPhase: 'Bei Phase / Entkommen', counter: 'Zähler im Clip', counterT: 'Zähler, Quote und Timer wie im Projektor ins Video zeichnen (wirkt ab dem nächsten Start des Puffers)',
    saved: 'Clip gespeichert: {0}', failed: 'Clip fehlgeschlagen: {0}', busy: 'Es wird schon ein Clip aufgenommen.', notOn: 'Für Clips erst eine Quelle wählen.',
    recent: 'Letzte Clips', open: 'Abspielen', folder: 'Ordner öffnen', show: 'Im Ordner zeigen', errSource: 'Die Quelle konnte nicht geöffnet werden: {0}',
    r_manual: 'Clip', r_found: 'Shiny', r_phase: 'Phase', warmup: 'Der Puffer läuft erst {0} s: der Clip wird kürzer.', browser: 'Im Browser wird der Clip heruntergeladen.'
  } : {
    title: 'Clips', off: 'off', buffering: 'Buffer running ({0})', saving: 'Recording clip …', noRec: 'Recording is not supported here.',
    hint: 'Records the game source in the background and saves the last seconds as a video on a click, a hotkey or automatically.',
    screen: 'Screen / window', camera: 'Camera / capture card', cameraN: 'Camera {0}', fromDetect: 'Source of the detection', reconnect: 'Connect: {0}', stop: 'Stop buffer',
    save: '● Save clip', before: 'Seconds before', after: 'Seconds after', quality: 'Quality', audio: 'Sound sources', audioAdd: '+ Add sound source …',
    audioNone: 'No sound source selected (clip without sound).', audioSys: 'System sound (desktop / game / Discord)', audioDetect: 'Detection sound',
    audioIn: 'Input: {0}', audioInN: 'Input {0}', audioDel: 'Remove sound source', audioVol: 'Volume',
    audioHint: 'Tip: For separate game & Discord audio, use virtual inputs (e.g. VB-Cable, VoiceMeeter, Wave Link) or capture card + system sound.',
    audioRestart: 'New sound source takes effect next time the buffer starts.', errAudio: 'Sound source "{0}" unavailable: {1}',
    autoFound: 'On "Found!"', autoPhase: 'On phase / got away', counter: 'Counter in clip', counterT: 'Draw counter, odds and timer into the video like the projector does (takes effect when the buffer starts next)',
    saved: 'Clip saved: {0}', failed: 'Clip failed: {0}', busy: 'A clip is already being recorded.', notOn: 'Choose a source for clips first.',
    recent: 'Recent clips', open: 'Play', folder: 'Open folder', show: 'Show in folder', errSource: 'The source could not be opened: {0}',
    r_manual: 'Clip', r_found: 'Shiny', r_phase: 'Phase', warmup: 'The buffer has only run for {0} s: the clip will be shorter.', browser: 'In the browser the clip is downloaded.'
  };
  function t(k) { var s = S[k] != null ? S[k] : k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }

  var cfg = null, persist = function () {}, onChange = function () {};
  function clampVol(v) {
    var n = Number(v);
    if (!isFinite(n)) return 1;
    return Math.max(0, Math.min(2, Math.round(n * 20) / 20));
  }
  function normalizeAudio(c) {
    if (Array.isArray(c.audioSources)) {
      var list = [], seen = {};
      c.audioSources.forEach(function (item) {
        if (!item || typeof item.id !== 'string' || !item.id) return;
        if (item.id !== 'system' && item.id !== 'detect' && !/^in:.+/.test(item.id)) return;
        if (item.id === 'system' && !D) return;
        if (seen[item.id]) return;
        seen[item.id] = true;
        list.push({ id: item.id, label: typeof item.label === 'string' ? item.label : '', volume: clampVol(item.volume) });
      });
      return list;
    }
    if (typeof c.audio === 'string') {
      if (c.audio === 'system' && D) return [{ id: 'system', label: '', volume: 1 }];
      if (/^in:.+/.test(c.audio)) return [{ id: c.audio, label: '', volume: 1 }];
      return [];
    }
    return D ? [{ id: 'system', label: '', volume: 1 }] : [];
  }
  function defaults(c) {
    c = c || {};
    c.before = Math.max(5, Math.min(120, +c.before || 30));
    c.after = Math.max(0, Math.min(30, c.after == null ? 5 : +c.after));
    c.quality = c.quality === '1080' ? '1080' : '720';
    c.audioSources = normalizeAudio(c);
    c.autoFound = c.autoFound !== false;
    c.autoPhase = c.autoPhase !== false;
    c.counter = c.counter !== false;
    c.list = Array.isArray(c.list) ? c.list.slice(0, 20) : [];
    if (!c.source || typeof c.source !== 'object') c.source = null;
    return c;
  }

  // ---------------- source ----------------
  var src = null; // { stream, own, ac, dest, audioNodes, label, kind }
  var recs = [], tickTimer = null, pending = null, mime = '', meterRaf = 0, meterGen = 0;
  function canRecord() { return typeof MediaRecorder !== 'undefined'; }
  function pickMime(audio) {
    var list = audio
      ? ['video/mp4;codecs=avc1,opus', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function openInputAudio(devId, label) {
    return navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: devId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    }).then(function (as) {
      return as.getAudioTracks();
    }, function (err) {
      A.toast(t('errAudio', label || devId, err && err.message ? err.message : err));
      return [];
    });
  }
  function openSystemLoopback() {
    if (!D) return Promise.resolve([]);
    return navigator.mediaDevices.getDisplayMedia({ video: { width: 160, height: 90, frameRate: 1 }, audio: true }).then(function (vs) {
      vs.getVideoTracks().forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } });
      return vs.getAudioTracks();
    }, function (err) {
      A.toast(t('errAudio', t('audioSys'), err && err.message ? err.message : err));
      return [];
    });
  }
  function connectAudioNode(ac, dest, id, tracks, volume) {
    var ms = new MediaStream(tracks);
    var node = ac.createMediaStreamSource(ms);
    var gain = ac.createGain();
    gain.gain.value = clampVol(volume);
    node.connect(gain);
    gain.connect(dest);
    var analyser = null, buf = null;
    if (ac.createAnalyser) {
      analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;
      gain.connect(analyser);
      buf = new Uint8Array(analyser.fftSize);
    }
    return { id: id, node: node, gain: gain, analyser: analyser, buf: buf, level: 0, tracks: tracks };
  }
  function disconnectAudioNode(entry) {
    if (!entry) return;
    try { entry.node.disconnect(); } catch (e) { /* */ }
    try { entry.gain.disconnect(); } catch (e) { /* */ }
    if (entry.analyser) { try { entry.analyser.disconnect(); } catch (e) { /* */ } }
    (entry.tracks || []).forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } });
  }
  function sampleAudioLevel(entry) {
    if (!entry || !entry.analyser || !entry.buf) return 0;
    entry.analyser.getByteTimeDomainData(entry.buf);
    var sum = 0;
    for (var i = 0; i < entry.buf.length; i++) {
      var v = (entry.buf[i] - 128) / 128;
      sum += v * v;
    }
    var rms = Math.sqrt(sum / entry.buf.length);
    var db = 20 * Math.log10(Math.max(rms, 1e-5));
    var pct = Math.max(0, Math.min(100, (db + 55) / 55 * 100));
    entry.level = Math.max(pct, (entry.level || 0) * 0.82);
    return entry.level;
  }
  function cleanupSource(s) {
    if (!s) return;
    if (s.comp) { try { s.comp.stop(); } catch (e) { /* */ } }
    if (s.audioNodes) Object.keys(s.audioNodes).forEach(function (k) { disconnectAudioNode(s.audioNodes[k]); });
    (s.own || []).forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } });
    if (s.ac && s.ac.close) try { s.ac.close(); } catch (e) { /* */ }
  }
  function openSource(kind, id, label, base, baseAudio) {
    stopBuffer();
    var sources = cfg.audioSources || [];
    var wantSys = sources.some(function (s) { return s.id === 'system'; });
    var video;
    // own copies: stopping one does not stop the other
    if (base) video = Promise.resolve(new MediaStream([base.clone()]));
    else if (kind === 'camera') {
      var v = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
      if (id) v.deviceId = { exact: id };
      video = navigator.mediaDevices.getUserMedia({ video: v, audio: false });
    } else {
      if (D && id) D.chooseSource(id);
      video = navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: wantSys });
    }
    return video.then(function (vs) {
      var vt = vs.getVideoTracks()[0];
      if (!vt) throw new Error('no video');
      var screenSysTracks = kind === 'screen' && wantSys ? vs.getAudioTracks() : [];
      var tasks = sources.map(function (item) {
        if (item.id === 'system') {
          var p = kind === 'screen' ? Promise.resolve(screenSysTracks) : openSystemLoopback();
          return p.then(function (tracks) { return { item: item, tracks: tracks }; });
        }
        if (item.id === 'detect') {
          var dt = base ? (baseAudio || []).map(function (a) { return a.clone(); }) : [];
          return Promise.resolve({ item: item, tracks: dt });
        }
        if (/^in:/.test(item.id)) {
          return openInputAudio(item.id.slice(3), item.label).then(function (tracks) { return { item: item, tracks: tracks }; });
        }
        return Promise.resolve({ item: item, tracks: [] });
      });
      return Promise.all(tasks).then(function (opened) {
        // smaller pictures for the buffer: less memory and CPU (the source itself stays as it is)
        var h = cfg.quality === '1080' ? 1080 : 720;
        return Promise.resolve(vt.applyConstraints({ height: { max: h }, frameRate: { max: 30 } })).catch(function () { /* keep the size */ }).then(function () {
          var activeAudio = opened.filter(function (o) { return o.tracks && o.tracks.length > 0; });
          var own = [vt];
          var audioTracks = [];
          var ac = null, dest = null, audioNodes = {};
          var AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (activeAudio.length && AudioCtx) {
            ac = new AudioCtx();
            if (ac.state === 'suspended' && ac.resume) ac.resume().catch(function () {});
            dest = ac.createMediaStreamDestination();
            activeAudio.forEach(function (o) {
              own = own.concat(o.tracks);
              audioNodes[o.item.id] = connectAudioNode(ac, dest, o.item.id, o.tracks, o.item.volume);
            });
            audioTracks = dest.stream.getAudioTracks();
          } else if (activeAudio.length) {
            activeAudio.forEach(function (o) {
              own = own.concat(o.tracks);
              audioTracks = audioTracks.concat(o.tracks);
            });
          }
          var comp = cfg.counter ? composeTrack(vt) : null;
          var stream = new MediaStream([comp ? comp.track : vt].concat(audioTracks));
          src = { stream: stream, own: own, ac: ac, dest: dest, audioNodes: audioNodes, label: label, kind: kind, comp: comp, vt: vt };
          if (kind !== 'detect') { cfg.source = { kind: kind, id: id || '', label: label || '' }; persist(); }
          vt.addEventListener('ended', function () { stopBuffer(); onChange(); });
          startBuffer();
          onChange();
        });
      });
    });
  }
  function stopBuffer() {
    clearInterval(tickTimer); tickTimer = null;
    meterGen++;
    if (meterRaf && typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(meterRaf); meterRaf = 0; }
    recs.forEach(function (r) { if (!r.keep) { try { r.mr.stop(); } catch (e) { /* stopped */ } } });
    recs = recs.filter(function (r) { return r.keep; });
    if (src && !pending) cleanupSource(src);
    if (!pending) src = null;
    else { var s = src; pending.then(function () { cleanupSource(s); }); src = null; }
  }
  function setAudioVolume(id, vol) {
    var v = clampVol(vol);
    for (var i = 0; i < cfg.audioSources.length; i++) {
      if (cfg.audioSources[i].id === id) { cfg.audioSources[i].volume = v; break; }
    }
    if (src && src.audioNodes && src.audioNodes[id]) {
      src.audioNodes[id].gain.gain.value = v;
    }
  }
  function removeAudioSource(id) {
    cfg.audioSources = cfg.audioSources.filter(function (s) { return s.id !== id; });
    persist();
    if (src && src.audioNodes && src.audioNodes[id]) {
      disconnectAudioNode(src.audioNodes[id]);
      delete src.audioNodes[id];
    }
  }
  function addAudioSource(id, label) {
    if (!id || cfg.audioSources.some(function (s) { return s.id === id; })) return;
    var item = { id: id, label: label || '', volume: 1 };
    cfg.audioSources.push(item);
    persist();
    if (src) {
      if (src.ac && src.dest && /^in:/.test(id)) {
        var curSrc = src;
        openInputAudio(id.slice(3), label).then(function (tracks) {
          if (!tracks.length) return;
          if (src !== curSrc) { tracks.forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } }); return; }
          curSrc.own = curSrc.own.concat(tracks);
          curSrc.audioNodes[id] = connectAudioNode(curSrc.ac, curSrc.dest, id, tracks, item.volume);
        });
      } else {
        A.toast(t('audioRestart'));
      }
    }
  }

  // ---------------- counter in the picture ----------------
  // The projector lays the counter over the video as its own layer; the recorder only sees the raw source.
  // So the clip gets its own picture: every source frame is copied onto a canvas and the counter drawn on top.
  // overlayFn(huntId) -> { state, ov, x, y, scale } or null (no counter); set by js/shiny.js.
  var overlayFn = null, curHunt = '';
  function overlayInfo() {
    if (!overlayFn || !cfg.counter) return null;
    var id = (ctx && ctx.hunt && ctx.hunt()) || curHunt;
    try { return id ? overlayFn(id) : null; } catch (e) { return null; }
  }
  function durText(ms) {
    var x = Math.max(0, Math.floor(ms / 1000)), p = function (n) { return ('0' + n).slice(-2); };
    return Math.floor(x / 3600) + ':' + p(Math.floor(x / 60) % 60) + ':' + p(x % 60);
  }
  function off(v) { return v != null && !v; }
  function hex(c, def) { if (!c || c === 'transparent') return def; return c.charAt(0) === '#' ? c : '#' + c; }
  function drawCounter(g, W, H, info) {
    var st = info.state, ov = info.ov || {}, col = hex(ov.color, '#ffffff');
    var s = (+ov.size || 1) * ((+info.scale || 100) / 100) * (H / 1080);
    var font = "'Segoe UI', system-ui, sans-serif", lines = [];
    if (!off(ov.name) && st.name) lines.push({ text: st.name, px: 20, w: 700, color: col, a: 1 });
    lines.push({ text: String(st.count) + (st.found ? ' ★' : ''), px: 54, w: 800, color: hex(ov.accent, '#f2c94c'), a: 1, big: true });
    if (!off(ov.odds) && st.oddsText) lines.push({ text: st.oddsText + (st.chanceText ? ' · ' + st.chanceText : ''), px: 15, w: 400, color: col, a: 0.92 });
    if (!off(ov.phase) && st.phaseText) lines.push({ text: st.phaseText, px: 15, w: 400, color: col, a: 0.92 });
    if (!off(ov.timer)) lines.push({ text: durText((st.timeMs || 0) + (st.runStart ? Date.now() - st.runStart : 0)), px: 15, w: 400, color: col, a: 0.92 });
    var padX = 18 * s, padY = 12 * s, gap = 2 * s, wMax = 0, hSum = 0;
    lines.forEach(function (l) {
      g.font = l.w + ' ' + Math.round(l.px * s) + 'px ' + font;
      l.h = l.px * s * (l.big ? 1 : 1.3);
      wMax = Math.max(wMax, g.measureText(l.text).width); hSum += l.h;
    });
    hSum += gap * (lines.length - 1);
    var x = (+info.x || 0) / 100 * W, y = (+info.y || 0) / 100 * H;
    g.save();
    var bg = hex(ov.bg, '');
    if (bg) {
      var bw = wMax + 2 * padX, bh = hSum + 2 * padY, r = 10 * s;
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + bw, y, x + bw, y + bh, r); g.arcTo(x + bw, y + bh, x, y + bh, r);
      g.arcTo(x, y + bh, x, y, r); g.arcTo(x, y, x + bw, y, r); g.closePath(); g.fill();
    }
    g.textBaseline = 'top';
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowOffsetY = 2 * s; g.shadowBlur = 4 * s;
    var cy = y + padY;
    lines.forEach(function (l) {
      g.font = l.w + ' ' + Math.round(l.px * s) + 'px ' + font;
      g.globalAlpha = l.a; g.fillStyle = l.color;
      g.fillText(l.text, x + padX, cy + (l.big ? 0 : l.px * s * 0.15));
      cy += l.h + gap;
    });
    g.restore();
  }
  // returns { track, stop }, or null when this cannot be done here (the clip then stays without counter)
  function composeTrack(vt) {
    if (!overlayFn) return null;
    var info = null, infoAt = 0;
    function getInfo() { var now = Date.now(); if (now - infoAt > 250) { info = overlayInfo(); infoAt = now; } return info; }
    // frame by frame: keeps running while the window is hidden or minimised
    if (typeof MediaStreamTrackProcessor === 'function' && typeof MediaStreamTrackGenerator === 'function' &&
        typeof OffscreenCanvas === 'function' && typeof VideoFrame === 'function') {
      try {
        var proc = new MediaStreamTrackProcessor({ track: vt }), gen = new MediaStreamTrackGenerator({ kind: 'video' });
        var reader = proc.readable.getReader(), writer = gen.writable.getWriter(), cv = null, g = null, stopped = false;
        var pump = function () {
          if (stopped) return;
          reader.read().then(function (r) {
            if (r.done || stopped) { if (r.value) r.value.close(); return; }
            var f = r.value, inf = getInfo(), outF = f;
            try {
              if (inf) {
                var W = f.displayWidth, H = f.displayHeight;
                if (!cv || cv.width !== W || cv.height !== H) { cv = new OffscreenCanvas(W, H); g = cv.getContext('2d'); }
                g.drawImage(f, 0, 0, W, H);
                drawCounter(g, W, H, inf);
                outF = new VideoFrame(cv, { timestamp: f.timestamp });
                f.close();
              }
            } catch (e) { if (outF !== f) { try { outF.close(); } catch (e2) { /* */ } } outF = f; }
            writer.write(outF).then(pump, function () { /* generator stopped */ });
          }, function () { /* source ended */ });
        };
        pump();
        return { track: gen, stop: function () { stopped = true; try { reader.cancel(); } catch (e) { /* */ } try { gen.stop(); } catch (e) { /* */ } } };
      } catch (e) { /* fall back to the canvas */ }
    }
    // fallback: <video> + canvas.captureStream (the main window runs without background throttling)
    var c = document.createElement('canvas');
    if (!c.captureStream) return null;
    var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([vt]);
    var pl = v.play(); if (pl && pl.catch) pl.catch(function () { /* */ });
    var g2 = c.getContext('2d'), out = c.captureStream(30), tm = setInterval(function () {
      if (!v.videoWidth) return;
      if (c.width !== v.videoWidth || c.height !== v.videoHeight) { c.width = v.videoWidth; c.height = v.videoHeight; }
      g2.drawImage(v, 0, 0, c.width, c.height);
      var inf = getInfo(); if (inf) drawCounter(g2, c.width, c.height, inf);
    }, 33);
    return { track: out.getVideoTracks()[0], stop: function () { clearInterval(tm); out.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } }); v.srcObject = null; } };
  }

  // ---------------- replay buffer ----------------
  function spawn() {
    if (!src) return;
    var hasAudio = src.stream.getAudioTracks().length > 0;
    mime = pickMime(hasAudio);
    var opts = { videoBitsPerSecond: cfg.quality === '1080' ? 8000000 : 5000000 };
    if (mime) opts.mimeType = mime;
    if (hasAudio) opts.audioBitsPerSecond = 160000;
    var r = { chunks: [], start: Date.now(), keep: false };
    try { r.mr = new MediaRecorder(src.stream, opts); } catch (e) { r.mr = new MediaRecorder(src.stream); }
    mime = r.mr.mimeType || mime;
    r.mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) r.chunks.push(ev.data); };
    r.mr.start(1000);
    recs.push(r);
  }
  function tick() {
    if (!src) return;
    var P = cfg.before * 1000, now = Date.now(), newest = recs.filter(function (r) { return !r.keep; }).pop();
    if (!newest || now - newest.start >= P) spawn();
    recs = recs.filter(function (r) {
      if (!r.keep && now - r.start > 2 * P + 1500) { try { r.mr.stop(); } catch (e) { /* */ } return false; }
      return true;
    });
    onChange(true);
  }
  function startBuffer() {
    if (!canRecord() || !src) return;
    recs = [];
    spawn();
    tickTimer = setInterval(tick, 1000);
  }
  function bufferAge() {
    var free = recs.filter(function (r) { return !r.keep; });
    return free.length ? Date.now() - free[0].start : 0;
  }
  function stamp(d) {
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
  }
  function fileName(at, name, reason) {
    var n = String(name || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return stamp(at) + (n ? ' ' + n : '') + ' ' + t('r_' + reason) + '.' + (/mp4/.test(mime) ? 'mp4' : 'webm');
  }
  // reason: 'manual' | 'found' | 'phase'; resolves with the list entry, or null
  function trigger(reason, name, hunt) {
    if (!src || !canRecord()) { if (reason === 'manual') A.toast(t('notOn')); return Promise.resolve(null); }
    if (pending) { if (reason === 'manual') A.toast(t('busy')); return pending; }
    var free = recs.filter(function (r) { return !r.keep; });
    var r = free[0];
    if (!r) return Promise.resolve(null);
    var age = Date.now() - r.start;
    if (age < cfg.before * 1000 - 500) A.toast(t('warmup', Math.round(age / 1000)));
    r.keep = true;
    var at = new Date(), type = (r.mr.mimeType || mime || 'video/webm').split(';')[0];
    pending = new Promise(function (resolve) {
      var done = false;
      r.mr.onstop = function () {
        if (done) return;
        done = true;
        var blob = new Blob(r.chunks, { type: type });
        recs = recs.filter(function (x) { return x !== r; });
        var name2 = fileName(at, name, reason);
        store(blob, name2).then(function (path) {
          var entry = { file: name2, path: path || '', at: at.getTime(), reason: reason, hunt: hunt || '', size: blob.size };
          cfg.list.unshift(entry); cfg.list = cfg.list.slice(0, 20);
          persist();
          A.toast(t('saved', name2));
          pending = null; onChange(); resolve(entry);
        }, function (e) { A.toast(t('failed', e && e.message ? e.message : e)); pending = null; onChange(); resolve(null); });
      };
      setTimeout(function () {
        if (done) return;
        try {
          if (r.mr.state !== 'inactive') r.mr.stop();
          else r.mr.onstop();
        } catch (e) { done = true; pending = null; onChange(); resolve(null); }
      }, cfg.after * 1000);
    });
    onChange();
    // the buffer keeps going with a fresh recorder right away
    if (!recs.some(function (x) { return !x.keep; })) spawn();
    return pending;
  }
  function store(blob, name) {
    if (D && D.saveClip) return blob.arrayBuffer().then(function (buf) { return D.saveClip(name, new Uint8Array(buf)); }).then(function (r) {
      if (!r || r.error) throw new Error(r ? r.error : 'save');
      return r.path;
    });
    var a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
    return Promise.resolve('');
  }

  // ---------------- panel ----------------
  var box = null, ctx = null, autoFollow = true, lastDetStream = null;
  function connectFromDetect(detStream) {
    if (!canRecord() || !detStream || !detStream.getVideoTracks().length) return Promise.resolve(false);
    lastDetStream = detStream;
    return openSource('detect', '', t('fromDetect'), detStream.getVideoTracks()[0], detStream.getAudioTracks()).then(
      function () { return true; },
      function (e) { A.toast(t('errSource', e && e.message ? e.message : e)); return false; }
    );
  }
  function syncDetect(huntId, detStream) {
    if (ctx && ctx.hunt && ctx.hunt() !== huntId) return;
    if (huntId) curHunt = huntId;
    if (detStream && detStream.getVideoTracks().length) {
      if (lastDetStream === detStream && src && src.kind === 'detect') return;
      if (!src || src.kind === 'detect') {
        autoFollow = true;
        connectFromDetect(detStream);
      }
      return;
    }
    lastDetStream = null;
    if (src && src.kind === 'detect') { stopBuffer(); onChange(); }
  }
  function panel(b, c) {
    box = b; ctx = c || {};
    if (ctx.hunt && ctx.hunt()) curHunt = ctx.hunt();
    var det = ctx.stream && ctx.stream();
    if (!src && autoFollow && det && det.getVideoTracks().length && lastDetStream !== det) {
      connectFromDetect(det);
    }
    render();
  }
  function stateText() {
    if (pending) return t('saving');
    if (!src) return t('off');
    var s = Math.round(Math.min(bufferAge(), cfg.before * 1000) / 1000);
    return t('buffering', s + ' / ' + cfg.before + ' s');
  }
  function render() {
    if (!box || !document.contains(box)) return;
    box.innerHTML = '';
    var head = el('div', { class: 'det-head' });
    head.appendChild(el('span', { class: 'sl-title', text: t('title') }));
    var st = el('span', { class: 'det-state clip-state' + (src ? ' on' : ''), text: stateText() });
    head.appendChild(st);
    box.appendChild(head);
    if (!canRecord()) { box.appendChild(el('div', { class: 'hint', text: t('noRec') })); return; }
    box.appendChild(el('div', { class: 'hint', text: t('hint') + (D ? '' : ' ' + t('browser')) }));
    var row = el('div', { class: 'det-row' });
    if (!src) {
      var sb = el('button', { class: 'tbtn', text: t('screen') });
      sb.addEventListener('click', function () { Cap.chooseScreen(function (s) { go(openSource('screen', s.id, s.label)); }); });
      row.appendChild(sb);
      var cam = el('select', { class: 'det-cam' });
      cam.appendChild(el('option', { value: '', text: t('camera') + ' …' }));
      row.appendChild(cam);
      var det = ctx.stream && ctx.stream();
      if (det && det.getVideoTracks().length) {
        var db = el('button', { class: 'tbtn', text: t('fromDetect') });
        db.addEventListener('click', function () { autoFollow = true; lastDetStream = det; go(openSource('detect', '', t('fromDetect'), det.getVideoTracks()[0], det.getAudioTracks())); });
        row.appendChild(db);
      }
      if (cfg.source && cfg.source.label) {
        var rc = el('button', { class: 'tbtn', text: t('reconnect', cfg.source.label) });
        rc.addEventListener('click', function () { go(openSource(cfg.source.kind, cfg.source.id, cfg.source.label)); });
        row.appendChild(rc);
      }
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) navigator.mediaDevices.enumerateDevices().then(function (devs) {
        var i = 0;
        devs.forEach(function (d) { if (d.kind === 'videoinput') { i++; cam.appendChild(el('option', { value: d.deviceId, text: d.label || t('cameraN', i) })); } });
      });
      cam.addEventListener('change', function () {
        if (cam.selectedIndex === 0) return;
        go(openSource('camera', cam.value, cam.options[cam.selectedIndex].text));
      });
    } else {
      row.appendChild(el('span', { class: 'clip-src', text: src.label }));
      var sv = el('button', { class: 'primary-btn clip-save', text: t('save') });
      sv.disabled = !!pending;
      sv.addEventListener('click', function () { trigger('manual', ctx.name ? ctx.name() : '', ctx.hunt ? ctx.hunt() : ''); });
      row.appendChild(sv);
      var xb = el('button', { class: 'tbtn', text: t('stop') });
      xb.addEventListener('click', function () { autoFollow = false; stopBuffer(); render(); });
      row.appendChild(xb);
    }
    box.appendChild(row);
    function go(p) { p.then(function () { render(); }, function (e) { A.toast(t('errSource', e && e.message ? e.message : e)); render(); }); }

    // settings
    var opts = el('div', { class: 'det-row clip-opts' });
    function num(label, key, lo, hi) {
      var w = el('label', { class: 'nc-sel' }); w.appendChild(el('span', { text: label }));
      var i = el('input', { type: 'number', min: lo, max: hi, value: cfg[key] });
      i.addEventListener('change', function () { cfg[key] = Math.max(lo, Math.min(hi, Math.round(+i.value) || lo)); i.value = cfg[key]; persist(); });
      w.appendChild(i); opts.appendChild(w);
    }
    num(t('before'), 'before', 5, 120);
    num(t('after'), 'after', 0, 30);
    var qw = el('label', { class: 'nc-sel' }); qw.appendChild(el('span', { text: t('quality') }));
    var qs = el('select');
    [['720', '720p'], ['1080', '1080p']].forEach(function (x) { var o = el('option', { value: x[0], text: x[1] }); if (cfg.quality === x[0]) o.selected = true; qs.appendChild(o); });
    qs.addEventListener('change', function () { cfg.quality = qs.value; persist(); });
    qw.appendChild(qs); opts.appendChild(qw);
    [['autoFound', t('autoFound')], ['autoPhase', t('autoPhase')]].concat(overlayFn ? [['counter', t('counter'), t('counterT')]] : []).forEach(function (x) {
      var c = el('label', { class: 'nc-check sh-chk', title: x[2] || '' }); var cb = el('input', { type: 'checkbox' }); cb.checked = !!cfg[x[0]];
      cb.addEventListener('change', function () { cfg[x[0]] = cb.checked; persist(); });
      c.appendChild(cb); c.appendChild(document.createTextNode(' ' + x[1])); opts.appendChild(c);
    });
    box.appendChild(opts);

    // audio sources & volume mixer
    var audioBox = el('div', { class: 'clip-audio' });
    var ah = el('div', { class: 'det-row' });
    var aw = el('label', { class: 'nc-sel' }); aw.appendChild(el('span', { text: t('audio') }));
    var as = el('select');
    as.appendChild(el('option', { value: '', text: t('audioAdd') }));
    function hasAudioId(id) { return cfg.audioSources.some(function (s) { return s.id === id; }); }
    function sourceLabel(item, devMap) {
      if (item.id === 'system') return t('audioSys');
      if (item.id === 'detect') return t('audioDetect');
      if (devMap && devMap[item.id]) return devMap[item.id];
      return item.label || item.id.slice(3);
    }
    if (D && !hasAudioId('system')) as.appendChild(el('option', { value: 'system', text: t('audioSys') }));
    if (ctx.stream && ctx.stream() && !hasAudioId('detect')) as.appendChild(el('option', { value: 'detect', text: t('audioDetect') }));
    as.addEventListener('change', function () {
      if (!as.value) return;
      var opt = as.options[as.selectedIndex];
      addAudioSource(as.value, opt ? opt.text : '');
      render();
    });
    aw.appendChild(as); ah.appendChild(aw);
    audioBox.appendChild(ah);

    var aList = el('div', { class: 'clip-audio-list' });
    var nameEls = {};
    var meterEls = {};
    if (!cfg.audioSources.length) {
      aList.appendChild(el('div', { class: 'hint', text: t('audioNone') }));
    } else {
      cfg.audioSources.forEach(function (item) {
        var r = el('div', { class: 'clip-audio-row' });
        var info = el('div', { class: 'clip-audio-info' });
        var nm = el('span', { class: 'clip-audio-name', text: sourceLabel(item, null), title: sourceLabel(item, null) });
        nameEls[item.id] = nm;
        info.appendChild(nm);
        var meter = el('div', { class: 'clip-audio-meter', 'aria-hidden': 'true' });
        var mFill = el('div', { class: 'clip-audio-meter-fill' });
        meter.appendChild(mFill);
        meterEls[item.id] = { bar: meter, fill: mFill };
        info.appendChild(meter);
        r.appendChild(info);
        var pct = Math.round(clampVol(item.volume) * 100);
        var sl = el('input', { type: 'range', min: 0, max: 200, step: 5, value: pct, title: t('audioVol') });
        var vl = el('span', { class: 'clip-audio-vol', text: pct + ' %' });
        sl.addEventListener('input', function () {
          var v = Math.max(0, Math.min(200, Math.round(+sl.value) || 0));
          vl.textContent = v + ' %';
          setAudioVolume(item.id, v / 100);
        });
        sl.addEventListener('change', function () { persist(); });
        r.appendChild(sl);
        r.appendChild(vl);
        var db = el('button', { class: 'tbtn', text: '✕', title: t('audioDel') });
        db.addEventListener('click', function () { removeAudioSource(item.id); render(); });
        r.appendChild(db);
        aList.appendChild(r);
      });
    }
    audioBox.appendChild(aList);
    audioBox.appendChild(el('div', { class: 'hint', text: t('audioHint') }));
    box.appendChild(audioBox);

    meterGen++;
    if (meterRaf) { cancelAnimationFrame(meterRaf); meterRaf = 0; }
    if (src && cfg.audioSources.length && typeof requestAnimationFrame === 'function') {
      var gen = meterGen;
      var stepMeter = function () {
        meterRaf = 0;
        if (gen !== meterGen) return;
        if (!src || box.isConnected === false) return;
        // Pegel nur zeichnen, wenn die Anzeige zu sehen ist; sonst selten nachsehen statt 60-mal pro Sekunde
        if ((typeof document !== 'undefined' && document.hidden) || (box.getClientRects && !box.getClientRects().length)) {
          setTimeout(function () { if (gen === meterGen) meterRaf = requestAnimationFrame(stepMeter); }, 400);
          return;
        }
        Object.keys(meterEls).forEach(function (id) {
          var node = src.audioNodes && src.audioNodes[id];
          var lvl = sampleAudioLevel(node);
          var m = meterEls[id];
          if (m && m.fill && m.fill.style && m.fill.style.setProperty) {
            m.fill.style.setProperty('--lvl', lvl.toFixed(1) + '%');
          }
          if (m && m.bar && m.bar.classList && m.bar.classList.toggle) {
            m.bar.classList.toggle('is-active', lvl > 4);
          }
        });
        meterRaf = requestAnimationFrame(stepMeter);
      };
      meterRaf = requestAnimationFrame(stepMeter);
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) navigator.mediaDevices.enumerateDevices().then(function (devs) {
      var i = 0, devMap = {};
      devs.forEach(function (d) {
        if (d.kind !== 'audioinput' || d.deviceId === 'default' || d.deviceId === 'communications') return;
        i++;
        var id = 'in:' + d.deviceId;
        var lbl = d.label ? t('audioIn', d.label) : t('audioInN', i);
        devMap[id] = lbl;
        if (!hasAudioId(id)) as.appendChild(el('option', { value: id, text: lbl }));
      });
      Object.keys(nameEls).forEach(function (id) {
        if (devMap[id]) { nameEls[id].textContent = devMap[id]; nameEls[id].title = devMap[id]; }
      });
    });

    // recent clips
    if (cfg.list.length || D) {
      var lh = el('div', { class: 'det-row' });
      lh.appendChild(el('span', { class: 'sh-lbl', text: t('recent') }));
      if (D && D.openClipDir) { var fb = el('button', { class: 'tbtn', text: t('folder') }); fb.addEventListener('click', function () { D.openClipDir(); }); lh.appendChild(fb); }
      box.appendChild(lh);
      var ul = el('div', { class: 'clip-list' });
      cfg.list.slice(0, 5).forEach(function (c) {
        var r = el('div', { class: 'clip-row' });
        r.appendChild(el('span', { class: 'clip-name', text: c.file }));
        r.appendChild(el('span', { class: 'hint', text: (c.size / 1048576).toFixed(1) + ' MB' }));
        if (D && c.path) {
          var ob = el('button', { class: 'tbtn', text: '▶ ' + t('open') }); ob.addEventListener('click', function () { D.openClip(c.path); }); r.appendChild(ob);
          var shb = el('button', { class: 'tbtn', text: t('show') }); shb.addEventListener('click', function () { D.showClip(c.path); }); r.appendChild(shb);
        }
        ul.appendChild(r);
      });
      box.appendChild(ul);
    }
  }
  // the buffer state line updates every second without rebuilding the panel
  onChange = function (light) {
    if (!box || !document.contains(box)) return;
    if (light) { var st = box.querySelector('.clip-state'); if (st) st.textContent = stateText(); return; }
    render();
  };

  function disconnectAll() {
    autoFollow = false;
    stopBuffer();
    if (cfg) cfg.source = null;
    persist();
    if (box && document.contains(box)) render();
  }

  window.CCShinyClip = {
    init: function (c, p, ov) { cfg = defaults(c); persist = p || persist; if (typeof ov === 'function') overlayFn = ov; return cfg; },
    panel: panel, trigger: trigger, syncDetect: syncDetect, disconnectAll: disconnectAll,
    active: function () { return !!src; },
    // the current picture of the clip source (raw, without counter) as a <video> to draw from, or null
    video: function () {
      if (!src || !src.vt || src.vt.readyState !== 'live') return Promise.resolve(null);
      var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([src.vt]);
      return new Promise(function (resolve) {
        var done = false, fin = function (ok) { if (done) return; done = true; resolve(ok ? v : null); };
        v.addEventListener('loadeddata', function () { fin(true); });
        setTimeout(function () { fin(v.readyState >= 2); }, 2000);
        var p = v.play(); if (p && p.catch) p.catch(function () { /* */ });
      });
    },
    open: function (path) { if (D && D.openClip && path) D.openClip(path); }
  };
})();
