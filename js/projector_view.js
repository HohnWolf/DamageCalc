// Capture-Projektor: zeigt eine Capture-Karte (oder einen Bildschirm) im Projektor-Fenster, ohne Zähler, Quote oder Timer.
// Nutzt dieselbe Fensterbrücke wie der Shiny-Zähler (js/shiny_projector.js, electron/projector.js), nur mit eigener Steuerung und ohne Overlay.
// Nur Desktop-App.
(function () {
  'use strict';
  var A = window.CC, C = window.CCCapture;
  if (!A || !C) return;
  var el = A.el, de = A.LANG === 'de';
  var KEY = 'cc_projector';
  var D = window.desktop && window.desktop.projector ? window.desktop.projector : null;
  var ID = 'capture-only';

  var S = de ? {
    title: 'Game Projector',
    sub: 'Zeigt das Bild deiner Capture-Karte (oder eines Bildschirms) in einem eigenen Fenster. Ohne Zähler, Quote oder Timer, nur das reine Bild.',
    desktopOnly: 'Den Game Projector gibt es nur in der Desktop-App.',
    source: 'Quelle', camera: 'Capture-Karte / Kamera …', screen: 'Bildschirm / Fenster', cameraN: 'Kamera {0}', refresh: 'Geräte neu suchen',
    reconnect: 'Verbinden: {0}', autoConnect: 'Aufnahme automatisch wieder verbinden',
    autoConnectT: 'Verbindet beim Öffnen automatisch wieder mit der zuletzt genutzten Capture-Karte bzw. dem Fenster.',
    connect: 'Verbunden: {0}', none: 'Keine Quelle verbunden.', disconnect: 'Trennen', fail: 'Die Quelle konnte nicht geöffnet werden.',
    project: 'Projizieren', stop: 'Projektor schließen', noVideo: 'Erst eine Quelle verbinden.', openFail: 'Das Projektor-Fenster konnte nicht geöffnet werden.',
    noAudio: 'Diese Quelle liefert keinen Ton. Das Bild wird trotzdem gezeigt.',
    window: 'Fenster', onTop: 'Immer im Vordergrund', hideCursor: 'Mauszeiger ausblenden', fullscreen: 'Vollbild',
    sound: 'Ton', volume: 'Lautstärke', fps: 'Bilder/s',
    hint: 'Im Projektor: Rechtsklick öffnet das Menü, F11 schaltet Vollbild, Esc verlässt es.'
  } : {
    title: 'Game Projector',
    sub: 'Shows the picture of your capture card (or a screen) in its own window. No counter, odds or timer, just the raw picture.',
    desktopOnly: 'The Game Projector is only available in the desktop app.',
    source: 'Source', camera: 'Capture card / camera …', screen: 'Screen / window', cameraN: 'Camera {0}', refresh: 'Rescan devices',
    reconnect: 'Connect: {0}', autoConnect: 'Reconnect the capture automatically',
    autoConnectT: 'Reconnects to the last used capture card or window when the Game Projector opens.',
    connect: 'Connected: {0}', none: 'No source connected.', disconnect: 'Disconnect', fail: 'The source could not be opened.',
    project: 'Project', stop: 'Close projector', noVideo: 'Connect a source first.', openFail: 'The projector window could not be opened.',
    noAudio: 'This source has no audio. The picture is still shown.',
    window: 'Window', onTop: 'Always on top', hideCursor: 'Hide cursor', fullscreen: 'Fullscreen',
    sound: 'Sound', volume: 'Volume', fps: 'Frames/s',
    hint: 'In the projector: right-click opens the menu, F11 toggles fullscreen, Esc leaves it.'
  };
  function t(k, a) { var s = S[k] != null ? S[k] : k; return a == null ? s : s.replace('{0}', a); }

  var MIR = window.CCProjectorMirror;
  function clean(o) {
    o = o || {};
    return {
      onTop: !!o.onTop, hideCursor: !!o.hideCursor, fullscreen: !!o.fullscreen,
      displayId: o.displayId == null ? null : o.displayId, bounds: o.bounds || null,
      sound: o.sound !== false, volume: MIR ? MIR.clampVolume(o.volume) : 80,
      fps: MIR ? MIR.clampFps(o.fps) : 20,
      autoConnect: !!o.autoConnect,
      source: o.source && typeof o.source === 'object' ? { kind: o.source.kind === 'camera' ? 'camera' : 'screen', id: String(o.source.id || ''), label: String(o.source.label || '') } : null
    };
  }
  var store = clean(A.load ? A.load(KEY, {}) : {});
  function persist() { try { A.save(KEY, store); } catch (e) { /* Speicher gesperrt */ } }

  var video = null, stream = null, root = null, statusEl = null, btnProject = null, btnDisc = null, btnRec = null, camSel = null;
  var autoTried = false, autoPending = false;

  // Steuerung für CCProjector: kein Overlay, keine Zählerwerte.
  var api = {
    video: function () { return video; },
    overlayUrl: function () { return ''; },
    // Eigenes Match an: 21:9 mit meinem Team links, dem Gegner rechts (js/overlay.js)
    teamUrls: function () { return window.CCOverlay && window.CCOverlay.teamUrls ? window.CCOverlay.teamUrls() : null; },
    opts: function () { return Object.assign({}, store, { overlay: false }); },
    save: function (patch) {
      patch = patch || {};
      delete patch.overlay; delete patch.counterX; delete patch.counterY; delete patch.counterScale;
      store = clean(Object.assign({}, store, patch));
      persist(); syncControls();
    },
    theme: function () { return document.documentElement.getAttribute('data-theme') || 'oled'; },
    lang: de ? 'de' : 'en',
    toast: function (m) { A.toast(m); },
    noDesktop: S.desktopOnly, noVideo: S.noVideo, openFail: S.openFail, noAudio: S.noAudio
  };

  function ensureBound() {
    if (window.CCProjector && !window.CCProjector.isBound()) window.CCProjector.bind(api);
  }
  function isOpen() { return !!(window.CCProjector && window.CCProjector.isOpen()); }

  var DS = window.desktop && window.desktop.shiny ? window.desktop.shiny : null;
  function resolveSource(src) {
    if (!src) return Promise.resolve(null);
    if (src.kind === 'screen') {
      if (!DS || !DS.captureSources) return Promise.resolve(src);
      return DS.captureSources().then(function (list) {
        var m = list.filter(function (x) { return x.id === src.id; })[0] || list.filter(function (x) { return x.name === src.label; })[0];
        return m ? { kind: 'screen', id: m.id, label: m.name } : null;
      }, function () { return src; });
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve(src);
    return navigator.mediaDevices.enumerateDevices().then(function (devs) {
      var cams = devs.filter(function (d) { return d.kind === 'videoinput'; });
      if (!cams.length) return src;
      var m = cams.filter(function (d) { return src.id && d.deviceId === src.id; })[0] ||
        cams.filter(function (d) { return src.label && d.label === src.label; })[0];
      return m ? { kind: 'camera', id: m.deviceId, label: m.label || src.label } : src;
    }, function () { return src; });
  }
  function autoConnect() {
    if (stream || autoPending || !store.source || !(store.source.id || store.source.label)) return Promise.resolve(null);
    autoPending = true;
    return resolveSource(store.source).then(function (src) {
      if (!src) throw new Error(store.source.label || '');
      return connect(src, true);
    }).then(function (s) {
      autoPending = false;
      return s;
    }, function (err) {
      autoPending = false;
      console.warn('Capture-Projektor: Auto-Verbinden fehlgeschlagen', err);
      paint();
      return null;
    });
  }

  function disconnect() {
    if (isOpen() && window.CCProjector.sourceStopped) window.CCProjector.sourceStopped(ID);
    if (stream) { stream.getTracks().forEach(function (tr) { try { tr.onended = null; tr.stop(); } catch (e) { /* schon weg */ } }); }
    stream = null;
    if (video) { try { video.pause(); } catch (e) { /* egal */ } video.srcObject = null; }
    paint();
  }
  function connect(src, silent) {
    disconnect();
    if (statusEl) statusEl.textContent = '…';
    return C.openStream(src).then(function (s) {
      stream = s;
      video.srcObject = s;
      video.muted = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* Autoplay: Strom läuft trotzdem */ });
      s.getVideoTracks().forEach(function (tr) { tr.onended = function () { disconnect(); }; });
      store.source = { kind: src.kind, id: src.id || '', label: src.label || '' };
      persist();
      if (src.kind === 'camera' && camSel && src.id) camSel.value = src.id;
      paint();
      return s;
    }, function (err) {
      stream = null;
      if (!silent) {
        console.error('Capture-Projektor: Quelle', err);
        A.toast(t('fail'));
      }
      paint();
      if (silent) throw err;
      return null;
    });
  }

  function paint() {
    if (!root) return;
    var on = !!(stream && video && video.srcObject);
    statusEl.textContent = on ? t('connect', store.source && store.source.label || '') : t('none');
    btnDisc.disabled = !on;
    if (btnRec) {
      var hasLast = !on && !!(store.source && store.source.label);
      btnRec.hidden = !hasLast;
      if (hasLast) btnRec.textContent = t('reconnect', store.source.label);
    }
    btnProject.disabled = !on && !isOpen();
    btnProject.textContent = isOpen() ? t('stop') : t('project');
    btnProject.classList.toggle('on', isOpen());
    root.classList.toggle('has-video', on);
    // Läuft der Projektor, zeichnet die Vorschau dasselbe Bild ein zweites Mal (1080p, 50 fps) und kostet Frames. Der Strom bleibt, nur die Vorschau pausiert.
    if (on && video) {
      if (isOpen()) { try { video.pause(); } catch (e) { /* egal */ } }
      else { var pl = video.play(); if (pl && pl.catch) pl.catch(function () { /* Autoplay */ }); }
    }
  }

  function fillCameras() {
    if (!camSel) return;
    var keep = camSel.value || (stream && store.source && store.source.kind === 'camera' ? store.source.id : '');
    camSel.innerHTML = '';
    camSel.appendChild(el('option', { value: '', text: t('camera') }));
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (devs) {
      var i = 0;
      devs.forEach(function (d) {
        if (d.kind !== 'videoinput') return;
        i++;
        camSel.appendChild(el('option', { value: d.deviceId, text: d.label || t('cameraN', i) }));
      });
      camSel.value = keep;
      if (camSel.selectedIndex < 0) camSel.selectedIndex = 0;
    });
  }

  var ctl = {};
  function syncControls() {
    if (!ctl.onTop) return;
    ctl.onTop.checked = !!store.onTop;
    ctl.hideCursor.checked = !!store.hideCursor;
    ctl.fullscreen.checked = !!store.fullscreen;
    ctl.sound.checked = store.sound !== false;
    ctl.volume.value = String(store.volume);
    ctl.fps.value = String(store.fps);
    if (ctl.autoConnect) ctl.autoConnect.checked = !!store.autoConnect;
  }
  function check(key, label, onChange) {
    var inp = el('input', { type: 'checkbox' });
    inp.addEventListener('change', function () {
      var patch = {}; patch[key] = inp.checked;
      api.save(patch);
      if (isOpen() && D && key !== 'autoConnect') { var o = {}; o[key] = inp.checked; D.set(o); }
      if (onChange) onChange();
    });
    ctl[key] = inp;
    var lab = el('label', { class: 'pv-check' });
    lab.appendChild(inp); lab.appendChild(el('span', { text: label }));
    return lab;
  }

  function build() {
    root.innerHTML = '';
    var head = el('div', { class: 'pv-head' });
    head.appendChild(el('h2', { text: t('title') }));
    head.appendChild(el('p', { class: 'pv-sub', text: t('sub') }));
    root.appendChild(head);
    if (!D) { root.appendChild(el('p', { class: 'pv-note', text: t('desktopOnly') })); return; }

    var row = el('div', { class: 'pv-row' });
    camSel = el('select', { class: 'det-cam', 'aria-label': t('source') });
    camSel.addEventListener('change', function () {
      if (!camSel.value) return;
      connect({ kind: 'camera', id: camSel.value, label: camSel.options[camSel.selectedIndex].text });
    });
    row.appendChild(camSel);
    var rf = el('button', { class: 'tbtn', type: 'button', text: '↻', title: t('refresh') });
    rf.addEventListener('click', fillCameras);
    row.appendChild(rf);
    var sb = el('button', { class: 'tbtn', type: 'button', text: t('screen') });
    sb.addEventListener('click', function () { C.chooseScreen(connect); });
    row.appendChild(sb);
    btnRec = el('button', { class: 'tbtn', type: 'button' });
    btnRec.hidden = true;
    btnRec.addEventListener('click', function () {
      if (!store.source) return;
      resolveSource(store.source).then(function (src) { connect(src || store.source); });
    });
    row.appendChild(btnRec);
    btnDisc = el('button', { class: 'tbtn', type: 'button', text: t('disconnect') });
    btnDisc.addEventListener('click', disconnect);
    row.appendChild(btnDisc);
    root.appendChild(row);

    statusEl = el('div', { class: 'pv-status' });
    root.appendChild(statusEl);

    var stage = el('div', { class: 'pv-stage' });
    video = el('video', { class: 'pv-video', autoplay: '', playsinline: '', muted: '' });
    video.muted = true;
    stage.appendChild(video);
    root.appendChild(stage);

    var act = el('div', { class: 'pv-row' });
    btnProject = el('button', { class: 'tbtn pv-go', type: 'button' });
    btnProject.addEventListener('click', function () {
      ensureBound();
      if (!window.CCProjector) { A.toast(t('desktopOnly')); return; }
      window.CCProjector.toggle(ID, api);
      window.setTimeout(paint, 300);
    });
    act.appendChild(btnProject);
    root.appendChild(act);

    var opt = el('div', { class: 'pv-opts' });
    var ac = check('autoConnect', t('autoConnect'), function () {
      if (store.autoConnect && !stream && store.source && (store.source.id || store.source.label)) {
        autoTried = true;
        autoConnect();
      }
    });
    ac.title = t('autoConnectT');
    opt.appendChild(ac);
    opt.appendChild(check('onTop', t('onTop')));
    opt.appendChild(check('hideCursor', t('hideCursor')));
    opt.appendChild(check('fullscreen', t('fullscreen')));
    opt.appendChild(check('sound', t('sound')));
    var vl = el('label', { class: 'pv-check' });
    vl.appendChild(el('span', { text: t('volume') }));
    ctl.volume = el('input', { type: 'range', min: '0', max: '100', step: '1' });
    ctl.volume.addEventListener('input', function () {
      api.save({ volume: Number(ctl.volume.value) });
      if (isOpen() && D) D.set({ volume: store.volume });
    });
    vl.appendChild(ctl.volume);
    opt.appendChild(vl);
    var fl = el('label', { class: 'pv-check' });
    fl.appendChild(el('span', { text: t('fps') }));
    ctl.fps = el('input', { type: 'number', min: '10', max: '60', step: '1' });
    ctl.fps.addEventListener('change', function () { api.save({ fps: ctl.fps.value }); if (isOpen()) window.CCProjector.syncLimit(); });
    fl.appendChild(ctl.fps);
    opt.appendChild(fl);
    root.appendChild(opt);
    root.appendChild(el('p', { class: 'pv-note', text: t('hint') }));

    fillCameras();
    syncControls();
    paint();
  }

  function render() {
    root = document.getElementById('projectorView');
    if (!root) return;
    if (!root.firstChild) {
      // Das Video bleibt beim Ansichtswechsel am Leben, nur neu bauen, wenn noch nichts da ist.
      build();
    } else {
      fillCameras();
      syncControls();
      paint();
    }
    if (D && store.autoConnect && !stream && !autoTried && store.source && (store.source.id || store.source.label)) {
      autoTried = true;
      autoConnect();
    }
  }

  if (D && D.onClosed) D.onClosed(function () { window.setTimeout(paint, 0); });
  window.CCProjectorView = {
    render: render,
    stream: function () { return stream; },
    videoEl: function () { return video; },
    getAuto: function (k) { return k === 'connect' || !k ? !!store.autoConnect : false; },
    setAuto: function (k, v) {
      if (k && k !== 'connect') return;
      api.save({ autoConnect: !!v });
      if (store.autoConnect && !stream && root && document.body && document.body.dataset.view === 'projector') {
        autoTried = true;
        autoConnect();
      }
    },
    autoConnect: autoConnect,
    _store: function () { return store; }
  };
})();
