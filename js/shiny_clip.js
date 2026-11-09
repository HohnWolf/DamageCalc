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
    save: '● Clip speichern', before: 'Sekunden davor', after: 'Sekunden danach', quality: 'Qualität', audio: 'Ton', audioNone: 'kein Ton',
    audioSys: 'Systemton (Bildschirm)', audioIn: 'Eingang: {0}', audioInN: 'Eingang {0}', autoFound: 'Bei „Gefunden!“', autoPhase: 'Bei Phase / Entkommen',
    saved: 'Clip gespeichert: {0}', failed: 'Clip fehlgeschlagen: {0}', busy: 'Es wird schon ein Clip aufgenommen.', notOn: 'Für Clips erst eine Quelle wählen.',
    recent: 'Letzte Clips', open: 'Abspielen', folder: 'Ordner öffnen', show: 'Im Ordner zeigen', errSource: 'Die Quelle konnte nicht geöffnet werden: {0}',
    r_manual: 'Clip', r_found: 'Shiny', r_phase: 'Phase', warmup: 'Der Puffer läuft erst {0} s: der Clip wird kürzer.', browser: 'Im Browser wird der Clip heruntergeladen.'
  } : {
    title: 'Clips', off: 'off', buffering: 'Buffer running ({0})', saving: 'Recording clip …', noRec: 'Recording is not supported here.',
    hint: 'Records the game source in the background and saves the last seconds as a video on a click, a hotkey or automatically.',
    screen: 'Screen / window', camera: 'Camera / capture card', cameraN: 'Camera {0}', fromDetect: 'Source of the detection', reconnect: 'Connect: {0}', stop: 'Stop buffer',
    save: '● Save clip', before: 'Seconds before', after: 'Seconds after', quality: 'Quality', audio: 'Sound', audioNone: 'no sound',
    audioSys: 'System sound (screen)', audioIn: 'Input: {0}', audioInN: 'Input {0}', autoFound: 'On "Found!"', autoPhase: 'On phase / got away',
    saved: 'Clip saved: {0}', failed: 'Clip failed: {0}', busy: 'A clip is already being recorded.', notOn: 'Choose a source for clips first.',
    recent: 'Recent clips', open: 'Play', folder: 'Open folder', show: 'Show in folder', errSource: 'The source could not be opened: {0}',
    r_manual: 'Clip', r_found: 'Shiny', r_phase: 'Phase', warmup: 'The buffer has only run for {0} s: the clip will be shorter.', browser: 'In the browser the clip is downloaded.'
  };
  function t(k) { var s = S[k] != null ? S[k] : k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }

  var cfg = null, persist = function () {}, onChange = function () {};
  function defaults(c) {
    c = c || {};
    c.before = Math.max(5, Math.min(120, +c.before || 30));
    c.after = Math.max(0, Math.min(30, c.after == null ? 5 : +c.after));
    c.quality = c.quality === '1080' ? '1080' : '720';
    c.audio = typeof c.audio === 'string' ? c.audio : (D ? 'system' : ''); // desktop app: system sound by default
    c.autoFound = c.autoFound !== false;
    c.autoPhase = c.autoPhase !== false;
    c.list = Array.isArray(c.list) ? c.list.slice(0, 20) : [];
    if (!c.source || typeof c.source !== 'object') c.source = null;
    return c;
  }

  // ---------------- source ----------------
  var src = null; // { stream: what we record, own: tracks to stop, label, kind }
  var recs = [], tickTimer = null, pending = null, mime = '';
  function canRecord() { return typeof MediaRecorder !== 'undefined'; }
  function pickMime(audio) {
    var list = audio
      ? ['video/mp4;codecs=avc1,opus', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function openSource(kind, id, label, base, baseAudio) {
    stopBuffer();
    var wantSys = cfg.audio === 'system' && kind === 'screen', inDev = /^in:/.test(cfg.audio) ? cfg.audio.slice(3) : '';
    var video;
    // own copies: stopping one does not stop the other; the detection's sound comes along unless "no sound" is chosen
    if (base) video = Promise.resolve(new MediaStream([base.clone()].concat(cfg.audio ? (baseAudio || []).map(function (a) { return a.clone(); }) : [])));
    else if (kind === 'camera') {
      var v = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
      if (id) v.deviceId = { exact: id };
      video = navigator.mediaDevices.getUserMedia({ video: v, audio: false });
    } else {
      if (D && id) D.chooseSource(id);
      video = navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: wantSys });
    }
    return video.then(function (vs) {
      var tracks = vs.getVideoTracks().map(function (tr) { return tr; });
      var audio = wantSys || base ? vs.getAudioTracks() : [];
      var more = inDev ? navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: inDev }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }) : Promise.resolve(null);
      return more.then(function (as) {
        if (as) audio = audio.concat(as.getAudioTracks());
        var vt = tracks[0];
        if (!vt) throw new Error('no video');
        // smaller pictures for the buffer: less memory and CPU (the source itself stays as it is)
        var h = cfg.quality === '1080' ? 1080 : 720;
        return Promise.resolve(vt.applyConstraints({ height: { max: h }, frameRate: { max: 30 } })).catch(function () { /* keep the size */ }).then(function () {
          var stream = new MediaStream([vt].concat(audio));
          src = { stream: stream, own: stream.getTracks(), label: label, kind: kind };
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
    recs.forEach(function (r) { if (!r.keep) { try { r.mr.stop(); } catch (e) { /* stopped */ } } });
    recs = recs.filter(function (r) { return r.keep; });
    if (src && !pending) src.own.forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } });
    if (!pending) src = null;
    else { var s = src; pending.then(function () { s.own.forEach(function (tr) { try { tr.stop(); } catch (e) { /* */ } }); }); src = null; }
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
      setTimeout(function () {
        r.mr.onstop = function () {
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
        try { r.mr.stop(); } catch (e) { pending = null; resolve(null); }
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
  var box = null, ctx = null;
  function panel(b, c) {
    box = b; ctx = c || {};
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
        db.addEventListener('click', function () { go(openSource('detect', '', t('fromDetect'), det.getVideoTracks()[0], det.getAudioTracks())); });
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
      xb.addEventListener('click', function () { stopBuffer(); render(); });
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
    var aw = el('label', { class: 'nc-sel' }); aw.appendChild(el('span', { text: t('audio') }));
    var as = el('select');
    as.appendChild(el('option', { value: '', text: t('audioNone') }));
    if (D) as.appendChild(el('option', { value: 'system', text: t('audioSys') }));
    as.value = cfg.audio === 'system' && D ? 'system' : '';
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) navigator.mediaDevices.enumerateDevices().then(function (devs) {
      var i = 0;
      devs.forEach(function (d) {
        if (d.kind !== 'audioinput' || d.deviceId === 'default' || d.deviceId === 'communications') return;
        i++;
        as.appendChild(el('option', { value: 'in:' + d.deviceId, text: d.label ? t('audioIn', d.label) : t('audioInN', i) }));
      });
      as.value = cfg.audio;
      if (as.value !== cfg.audio) as.value = '';
    });
    as.addEventListener('change', function () { cfg.audio = as.value; persist(); });
    aw.appendChild(as); opts.appendChild(aw);
    [['autoFound', t('autoFound')], ['autoPhase', t('autoPhase')]].forEach(function (x) {
      var c = el('label', { class: 'nc-check sh-chk' }); var cb = el('input', { type: 'checkbox' }); cb.checked = !!cfg[x[0]];
      cb.addEventListener('change', function () { cfg[x[0]] = cb.checked; persist(); });
      c.appendChild(cb); c.appendChild(document.createTextNode(' ' + x[1])); opts.appendChild(c);
    });
    box.appendChild(opts);

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

  window.CCShinyClip = {
    init: function (c, p) { cfg = defaults(c); persist = p || persist; return cfg; },
    panel: panel, trigger: trigger,
    active: function () { return !!src; },
    open: function (path) { if (D && D.openClip && path) D.openClip(path); }
  };
})();
