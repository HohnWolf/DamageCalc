// Matchlog-Oberfläche unter VGC.
// Verknüpft direkt mit dem RattataLab Teambuilder (cc_builder.teams[].id),
// dem Game Projector (CCProjectorView) und der Team-Analyse (CCMatch.importMatchlog).
// Speichert nur kompakte Showdown-Text-Logs im Archiv (kein Video/Frames); Video nur auf Klick behalten.
(function () {
  var A = window.CC, C = window.CCCapture;
  if (!A || !window.CCMatchlog) return;
  var el = A.el, de = A.LANG === 'de';
  var S = de ? {
    title: 'Matchlog',
    alphaNote: 'Sammelt während des Spiels leichtgewichtig Keyframes (ohne OCR-Last) und erstellt per Antigravity oder Gemini automatisch ein Showdown-Replay-Log für deine Team-Analyse.',
    sub: 'Nutzt eine eigene Capture-Quelle oder automatisch den laufenden Stream vom Game Projector.',
    camera: 'Capture-Karte / Kamera …',
    screen: 'Bildschirm / Fenster',
    projector: 'Game Projector',
    refresh: 'Geräte neu suchen',
    disconnect: 'Trennen',
    cameraN: 'Kamera {0}',
    srcNone: 'Keine Quelle verbunden. Oben eine Quelle wählen oder zuerst im Game Projector verbinden.',
    srcOwn: 'Verbunden: {0}',
    srcProj: 'Nutzt laufende Quelle vom Game Projector.',
    srcFail: 'Die Quelle konnte nicht geöffnet werden.',
    teamLabel: 'Team (Teambuilder):',
    verLabel: 'Version:',
    verNone: '–',
    teamNone: 'Ohne Team',
    guideTitle: 'Anleitung: So nutzt du Matchlog (Schritt für Schritt)',
    guideSteps: [
      '1. Quelle verbinden: Oben deine Capture-Karte auswählen oder auf „Game Projector“ klicken (Matchlog nutzt den laufenden Projektor-Stream automatisch mit).',
      '2. Team & Version wählen: Im Dropdown „Team (Teambuilder)“ und daneben die passende „Version“ (z. B. v1, v2) auswählen.',
      '3. Vor dem Kampf: Kurz vor oder in der Team-Preview auf „Match aufnehmen“ klicken (sammelt automatisch Keyframes im Hintergrund, ohne Ruckeln).',
      '4. Nach dem Kampf: Auf „Aufnahme stoppen“ klicken. Antigravity erstellt automatisch das Showdown-Replay-Log, speichert nur den kompakten Text im Archiv und übernimmt das Spiel direkt in die Team-Analyse.',
      '5. Video optional: Nur wenn du das Video auf der Festplatte behalten willst, auf „Video behalten“ klicken – sonst wird es beim nächsten Match platzsparend verworfen. Ohne Antigravity kannst du alternativ „Mit Gemini API“ oder „Für Google AI Pro exportieren“ nutzen.'
    ],
    teamEmptyHint: 'Lege im Teambuilder ein Team an, um Matchlogs direkt nach Team zu sortieren.',
    on: 'Live-Abtastung (8 FPS)',
    aiMode: 'Live ohne OCR (Keyframes)',
    autoAgy: 'Nach Aufnahme automatisch an Antigravity',
    autoAnalysis: 'Direkt in Team-Analyse übernehmen',
    need: 'Erst eine Quelle verbinden.',
    desk: 'Antigravity / OCR läuft nur in der Desktop-App.',
    scene: 'Szene',
    ocr: 'Status',
    roi: 'ROI-Vorschau',
    copySd: 'Showdown-Log kopieren',
    sendAnalysis: 'In Team-Analyse',
    saveArchive: 'Im Archiv speichern',
    save: 'JSON speichern',
    clear: 'Protokoll leeren',
    empty: 'Noch nichts erkannt.',
    fps: 'Abtastung 8 Bilder/s',
    recStart: 'Match aufnehmen',
    recStop: 'Aufnahme stoppen',
    saveVideo: 'Video behalten',
    recRun: 'Aufnahme läuft: ',
    recFail: 'Videoaufnahme wird hier nicht unterstützt.',
    agyBtn: 'Mit Antigravity auswerten',
    agyBusy: 'Antigravity wertet aus…',
    gemBtn: 'Mit Gemini API',
    gemBusy: 'Gemini wertet aus…',
    gemKeyPh: 'Optional: Gemini API Key (Kostenlose Stufe)',
    gemKeyMissing: 'Bitte Gemini API Key eintragen.',
    noKeyframes: 'Keine Keyframes gesammelt.',
    gemErr: 'Gemini-Fehler: ',
    expBtn: 'Für Google AI Pro exportieren',
    archiveTitle: 'Gespeicherte Matchlogs (nur Text-Logs)',
    archiveAll: 'Alle Teams',
    archiveEmpty: 'Noch keine Matchlogs gespeichert.',
    show: 'Anzeigen',
    copy: 'Kopieren',
    del: 'Löschen',
    win: 'Sieg',
    loss: 'Niederlage',
    unk: 'Unbekannt',
    addedAnalysis: 'In Team-Analyse übernommen.',
    dupAnalysis: 'Dieses Log ist bereits in der Team-Analyse.',
    copied: 'Showdown-Log kopiert.'
  } : {
    title: 'Matchlog',
    alphaNote: 'Collects lightweight keyframes during play (zero OCR lag) and generates a Showdown replay log via Antigravity or Gemini directly for Team Analysis.',
    sub: 'Uses its own capture source or automatically shares the active Game Projector feed.',
    camera: 'Capture card / camera …',
    screen: 'Screen / window',
    projector: 'Game Projector',
    refresh: 'Rescan devices',
    disconnect: 'Disconnect',
    cameraN: 'Camera {0}',
    srcNone: 'No source connected. Pick a source above or connect one in Game Projector first.',
    srcOwn: 'Connected: {0}',
    srcProj: 'Using active source from Game Projector.',
    srcFail: 'The source could not be opened.',
    teamLabel: 'Team (Teambuilder):',
    verLabel: 'Version:',
    verNone: '–',
    teamNone: 'No team',
    guideTitle: 'Guide: How to use Matchlog (Step by Step)',
    guideSteps: [
      '1. Connect source: Pick your capture card above or click “Game Projector” (Matchlog automatically shares the active projector stream).',
      '2. Pick Team & Version: Choose your team in “Team (Teambuilder)” and the matching “Version” (e.g. v1, v2) next to it.',
      '3. Before the match: Click “Record match” right before or during Team Preview (collects lightweight keyframes in the background with zero lag).',
      '4. After the match: Click “Stop recording”. Antigravity automatically builds the Showdown replay log, saves only the compact text log to the archive, and imports the match straight into Team Analysis.',
      '5. Video optional: Click “Keep video” only if you want to save the recording to disk — otherwise it is discarded on the next match to save space. Without Antigravity you can use “Use Gemini API” or “Export for Google AI Pro”.'
    ],
    teamEmptyHint: 'Create a team in the Teambuilder to group matchlogs by team.',
    on: 'Live capture (8 FPS)',
    aiMode: 'Live without OCR (Keyframes)',
    autoAgy: 'Auto-send to Antigravity on stop',
    autoAnalysis: 'Auto-add to Team Analysis',
    need: 'Connect a source first.',
    desk: 'Antigravity / OCR requires the desktop app.',
    scene: 'Scene',
    ocr: 'Status',
    roi: 'ROI preview',
    copySd: 'Copy Showdown log',
    sendAnalysis: 'Send to Team Analysis',
    saveArchive: 'Save to archive',
    save: 'Save JSON',
    clear: 'Clear log',
    empty: 'Nothing recognized yet.',
    fps: 'Sampling 8 frames/s',
    recStart: 'Record match',
    recStop: 'Stop recording',
    saveVideo: 'Keep video',
    recRun: 'Recording: ',
    recFail: 'Video recording is not supported here.',
    agyBtn: 'Analyze with Antigravity',
    agyBusy: 'Antigravity analyzing…',
    gemBtn: 'Use Gemini API',
    gemBusy: 'Gemini analyzing…',
    gemKeyPh: 'Optional: Gemini API Key (Free tier)',
    gemKeyMissing: 'Please enter a Gemini API key.',
    noKeyframes: 'No keyframes collected.',
    gemErr: 'Gemini error: ',
    expBtn: 'Export for Google AI Pro',
    archiveTitle: 'Saved Matchlogs (text logs only)',
    archiveAll: 'All teams',
    archiveEmpty: 'No matchlogs saved yet.',
    show: 'View',
    copy: 'Copy',
    del: 'Delete',
    win: 'Win',
    loss: 'Loss',
    unk: 'Unknown',
    addedAnalysis: 'Added to Team Analysis.',
    dupAnalysis: 'This log is already in Team Analysis.',
    copied: 'Showdown log copied.'
  };
  function t(k, a) { var s = S[k] != null ? S[k] : k; return a == null ? s : s.replace('{0}', a); }

  var engine = null, kf = null, aiShowdownLog = '';
  var timer = null, busy = false, grabbing = false, enabled = false, showRoi = false;
  var hidden = null, cap = null, capTrack = null, capFailed = false;
  var grabCanvas = null, gctx = null, overlay = null, octx = null;
  var logEl = null, sceneEl = null, ocrEl = null, timeEl = null, kfStatsEl = null;
  var btnRec = null, btnSaveVid = null, chkLive = null, chkAiMode = null, chkAutoAgy = null, chkAutoAnalysis = null;
  var btnAgy = null, selAgyModel = null, btnGem = null, inpGemKey = null, selGemModel = null;
  var selTeam = null, selVersion = null, selArchiveTeam = null, archiveBox = null;
  var root = null, camSel = null, statusEl = null, btnDisc = null;
  var ownStream = null, ownLabel = '';
  var recorder = null, recChunks = [], recTimer = null, recStartAt = 0;
  var recordedBlob = null;
  var archiveLogs = [];
  var selectedTeamId = '';
  var selectedVersionId = '';

  function genId(prefix) {
    return (prefix || 'ml') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }
  function builderTeams() {
    var b = A.load('cc_builder', null);
    var list = (b && Array.isArray(b.teams)) ? b.teams : [];
    var changed = false;
    list.forEach(function (tm) {
      if (!tm) return;
      if (!tm.id) { tm.id = genId('tm'); changed = true; }
      if (!Array.isArray(tm.versions) || !tm.versions.length) {
        var v0 = { id: genId('ver'), name: 'v1', mons: Array.isArray(tm.mons) ? tm.mons : [] };
        tm.versions = [v0];
        tm.curVer = v0.id;
        changed = true;
      } else {
        tm.versions.forEach(function (v, idx) {
          if (v && !v.id) { v.id = genId('ver'); changed = true; }
          if (v && !v.name) { v.name = 'v' + (idx + 1); changed = true; }
        });
      }
    });
    if (changed && b) A.save('cc_builder', b);
    return { list: list, cur: (b && b.cur) || '' };
  }
  function teamById(id) {
    if (!id) return null;
    var list = builderTeams().list;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function teamNameOf(id) {
    if (!id) return t('teamNone');
    var tm = teamById(id);
    return tm ? (tm.name || tm.id) : id;
  }
  function versionNameOf(teamId, verId) {
    if (!teamId || !verId) return '';
    var tm = teamById(teamId);
    if (!tm || !Array.isArray(tm.versions)) return '';
    for (var i = 0; i < tm.versions.length; i++) {
      if (tm.versions[i].id === verId) return tm.versions[i].name || ('v' + (i + 1));
    }
    return '';
  }
  function loadArchive() {
    var D = window.desktop && window.desktop.matchlog;
    var apply = function (data) {
      archiveLogs = (data && Array.isArray(data.logs)) ? data.logs : [];
      renderArchive();
    };
    if (D && D.loadStore) {
      D.loadStore().then(apply, function () { apply(A.load('cc_matchlog_archive', null)); });
    } else {
      apply(A.load('cc_matchlog_archive', null));
    }
  }
  function saveArchive() {
    var payload = { v: 1, logs: archiveLogs };
    A.save('cc_matchlog_archive', payload);
    var D = window.desktop && window.desktop.matchlog;
    if (D && D.saveStore) D.saveStore(payload).catch(function () {});
  }
  function parseLogMeta(showdownText) {
    var lines = String(showdownText || '').split(/\r?\n/);
    var p1 = '', p2 = '', win = '';
    lines.forEach(function (l) {
      if (l.indexOf('|player|p1|') === 0) p1 = (l.split('|')[3] || '').trim();
      else if (l.indexOf('|player|p2|') === 0) p2 = (l.split('|')[3] || '').trim();
      else if (l.indexOf('|win|') === 0) win = (l.split('|')[2] || '').trim();
    });
    var result = 'unknown';
    if (win) {
      if (p1 && win.toLowerCase() === p1.toLowerCase()) result = 'win';
      else if (p2 && win.toLowerCase() === p2.toLowerCase()) result = 'loss';
    }
    return { p1: p1 || 'You', foe: p2 || 'Opponent', result: result };
  }
  function storeLog(showdownText, source) {
    var clean = String(showdownText || '').trim();
    if (!clean) return null;
    var meta = parseLogMeta(clean);
    var entry = {
      id: genId('log'),
      teamId: selectedTeamId || '',
      teamName: teamNameOf(selectedTeamId),
      versionId: selectedVersionId || '',
      versionName: versionNameOf(selectedTeamId, selectedVersionId),
      when: Date.now(),
      foe: meta.foe,
      result: meta.result,
      source: source || 'manual',
      showdown: clean
    };
    archiveLogs.unshift(entry);
    saveArchive();
    renderArchive();
    return entry;
  }
  function sendToAnalysis(showdownText, teamId, versionId, silent) {
    var clean = String(showdownText || '').trim();
    if (!clean || !window.CCMatch || !window.CCMatch.importMatchlog) return;
    var res = window.CCMatch.importMatchlog(clean, teamId || '', versionId || '');
    if (!silent && A && A.toast) {
      if (res && res.status === 'ok') A.toast(t('addedAnalysis'));
      else if (res && res.status === 'dup') A.toast(t('dupAnalysis'));
    }
  }

  function makeEngine() {
    var lex = window.CCMatchlogLex.fromGlobals();
    engine = window.CCMatchlog.create({ lex: lex, digits: window.CCMatchlogDigits || null });
    if (window.CCMatchlogKeyframes) {
      if (!kf) kf = window.CCMatchlogKeyframes.create();
      else kf.reset();
    }
    aiShowdownLog = '';
    paintKfStats();
  }
  function paintKfStats() {
    if (!kfStatsEl || !kf) return;
    var s = kf.stats();
    kfStatsEl.textContent = 'Keyframes: Team-Preview ' + (s.hasTeamPreview ? '✓' : '–') + ' · ' + s.frameCount + ' Momente (' + s.sheetCount + ' Bögen)';
  }
  function stream() {
    if (ownStream) return ownStream;
    var V = window.CCProjectorView;
    var s = V && V.stream ? V.stream() : null;
    if (s) return s;
    var P = window.CCProjector;
    return P && P.stream ? P.stream() : null;
  }
  function syncSourceStatus() {
    if (!statusEl) return;
    if (ownStream) {
      statusEl.textContent = t('srcOwn', ownLabel);
      if (btnDisc) btnDisc.disabled = false;
      return;
    }
    if (btnDisc) btnDisc.disabled = true;
    statusEl.textContent = stream() ? t('srcProj') : t('srcNone');
  }
  function disconnectOwn() {
    if (ownStream) {
      ownStream.getTracks().forEach(function (tr) { try { tr.onended = null; tr.stop(); } catch (e) {} });
    }
    ownStream = null;
    ownLabel = '';
    if (camSel) camSel.value = '';
    resetSource();
    syncSourceStatus();
  }
  function connectOwn(src) {
    if (!C || !C.openStream) return Promise.resolve(null);
    disconnectOwn();
    if (statusEl) statusEl.textContent = '…';
    return C.openStream(src).then(function (s) {
      ownStream = s;
      ownLabel = (src && src.label) || '';
      s.getVideoTracks().forEach(function (tr) { tr.onended = function () { disconnectOwn(); }; });
      syncSourceStatus();
      return s;
    }, function () {
      ownStream = null;
      syncSourceStatus();
      if (A && A.toast) A.toast(t('srcFail'));
      return null;
    });
  }
  function fillCameras() {
    if (!camSel || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    var keep = camSel.value || '';
    navigator.mediaDevices.enumerateDevices().then(function (devs) {
      if (!camSel) return;
      camSel.innerHTML = '';
      camSel.appendChild(el('option', { value: '', text: t('camera') }));
      var n = 0;
      devs.forEach(function (d) {
        if (d.kind !== 'videoinput') return;
        n++;
        camSel.appendChild(el('option', { value: d.deviceId, text: d.label || t('cameraN', n) }));
      });
      if (keep) camSel.value = keep;
    }, function () {});
  }
  function fillVersions() {
    var tm = teamById(selectedTeamId);
    var vers = (tm && Array.isArray(tm.versions)) ? tm.versions : [];
    if (!vers.length) {
      selectedVersionId = '';
    } else if (!selectedVersionId || !vers.some(function (v) { return v.id === selectedVersionId; })) {
      selectedVersionId = (tm && tm.curVer && vers.some(function (v) { return v.id === tm.curVer; })) ? tm.curVer : vers[0].id;
    }
    if (selVersion) {
      selVersion.innerHTML = '';
      if (!vers.length) {
        selVersion.appendChild(el('option', { value: '', text: t('verNone') }));
        selVersion.disabled = true;
      } else {
        vers.forEach(function (v, idx) {
          selVersion.appendChild(el('option', { value: v.id, text: v.name || ('v' + (idx + 1)) }));
        });
        selVersion.disabled = false;
        selVersion.value = selectedVersionId || vers[0].id;
      }
    }
  }
  function fillTeams() {
    var bt = builderTeams();
    if (!selectedTeamId) {
      var saved = A.load('cc_matchlog_team', '');
      if (saved && bt.list.some(function (x) { return x.id === saved; })) selectedTeamId = saved;
      else if (bt.cur) selectedTeamId = bt.cur;
      else if (bt.list[0]) selectedTeamId = bt.list[0].id;
      selectedVersionId = A.load('cc_matchlog_ver', '') || '';
    } else if (selectedTeamId && !bt.list.some(function (x) { return x.id === selectedTeamId; })) {
      selectedTeamId = bt.cur || (bt.list[0] ? bt.list[0].id : '');
      selectedVersionId = '';
    }
    if (selTeam) {
      selTeam.innerHTML = '';
      selTeam.appendChild(el('option', { value: '', text: t('teamNone') }));
      bt.list.forEach(function (tm) {
        selTeam.appendChild(el('option', { value: tm.id, text: (tm.name || tm.id) }));
      });
      selTeam.value = selectedTeamId || '';
    }
    fillVersions();
    if (selArchiveTeam) {
      var keep = selArchiveTeam.value || '__all__';
      selArchiveTeam.innerHTML = '';
      selArchiveTeam.appendChild(el('option', { value: '__all__', text: t('archiveAll') }));
      selArchiveTeam.appendChild(el('option', { value: '', text: t('teamNone') }));
      bt.list.forEach(function (tm) {
        selArchiveTeam.appendChild(el('option', { value: tm.id, text: (tm.name || tm.id) }));
      });
      selArchiveTeam.value = keep;
      if (!selArchiveTeam.value && keep !== '') selArchiveTeam.value = '__all__';
    }
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
      try { hidden.pause(); } catch (e) {}
      hidden.srcObject = null;
    }
  }
  function attach(s) {
    if (!hidden) {
      hidden = document.createElement('video');
      hidden.muted = true;
      hidden.playsInline = true;
      hidden.setAttribute('aria-hidden', 'true');
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
          finally { try { bmp.close(); } catch (e) {} }
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
  function recognize(image, whitelist) {
    var D = window.desktop && window.desktop.matchlog;
    if (!D || !D.recognize) return Promise.resolve({ error: t('desk'), text: '' });
    return D.recognize({ width: image.width, height: image.height, b64: b64(image.abgr), whitelist: whitelist || '' });
  }
  function currentShowdown() {
    return aiShowdownLog || (engine && engine.showdown ? engine.showdown() : '');
  }
  function paint() {
    if (!logEl || !engine) return;
    var text = aiShowdownLog || engine.text();
    logEl.textContent = text && text.trim() ? text : t('empty');
    var st = engine.state;
    if (sceneEl) sceneEl.textContent = t('scene') + ': ' + (st.debug.scene || '–');
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
      recognize(job.image, job.whitelist).then(function (r) {
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
    if (grabbing) return;
    grabbing = true;
    grabStream(s).then(function (image) {
      grabbing = false;
      if (!enabled || !image) return;
      var nowT = Date.now() / 1000;
      var frameInfo = image.width + '×' + image.height;
      drawRoi(image);

      if (kf && grabCanvas) {
        var kr = kf.step(image, grabCanvas, { t: nowT });
        if (kr.added) paintKfStats();
        if (chkAiMode && chkAiMode.checked) {
          if (sceneEl) sceneEl.textContent = t('scene') + ': ' + (kr.scene || '–');
          if (!recorder && timeEl) timeEl.textContent = t('fps') + ' · ' + frameInfo + ' · Keyframes';
          return;
        }
      }

      if (busy) return;
      var step = engine.step(image, { t: nowT });
      if (sceneEl) sceneEl.textContent = t('scene') + ': ' + step.scene;
      if (step.jobs && step.jobs.length) {
        busy = true;
        runJobs(step.jobs, nowT, frameInfo);
      } else {
        if (!recorder && timeEl) timeEl.textContent = t('fps') + ' · ' + frameInfo;
        paint();
      }
    }, function () {
      grabbing = false;
    });
  }
  function setOn(on) {
    enabled = !!on;
    if (chkLive) chkLive.checked = enabled;
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
  function fmtSec(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }
  function syncRecUi() {
    var recOn = !!(recorder && recorder.state === 'recording');
    if (btnRec) {
      btnRec.textContent = recOn ? t('recStop') : t('recStart');
      btnRec.classList.toggle('is-rec', recOn);
      btnRec.disabled = false;
    }
    if (btnSaveVid) btnSaveVid.disabled = !recordedBlob || recOn;
  }
  function onAiLogReady(text, source, ms) {
    aiShowdownLog = text || '';
    paint();
    if (!aiShowdownLog) return;
    storeLog(aiShowdownLog, source);
    if (chkAutoAnalysis && chkAutoAnalysis.checked) {
      sendToAnalysis(aiShowdownLog, selectedTeamId, selectedVersionId, false);
    }
    if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + source + ' fertig (' + (ms || 0) + ' ms, ' + aiShowdownLog.split('\n').length + ' Zeilen)';
  }
  function buildAiContext() {
    var tm = teamById(selectedTeamId);
    var srcMons = [];
    if (tm) {
      if (selectedVersionId && Array.isArray(tm.versions)) {
        tm.versions.some(function (v) {
          if (v && v.id === selectedVersionId && Array.isArray(v.mons)) { srcMons = v.mons; return true; }
          return false;
        });
      }
      if (!srcMons.length && Array.isArray(tm.mons)) srcMons = tm.mons;
    }
    var teamMons = srcMons.map(function (m) {
      if (!m) return null;
      var s = m.set || {};
      var sp = (s.forme && s.forme.indexOf('Mega ') !== 0) ? s.forme : (m.species || '');
      if (!sp) return null;
      var moves = (s.moves || []).filter(function (mv) { return mv && mv !== '(No Move)'; });
      return { species: sp, item: s.item || '', ability: s.ability || '', moves: moves };
    }).filter(Boolean);
    var mStore = A.load('cc_match', null);
    var pName = '';
    if (mStore && mStore.names) {
      pName = String(mStore.names).split(',')[0].trim();
    }
    return {
      playerName: pName,
      teamName: tm ? (tm.name || '') : '',
      versionName: versionNameOf(selectedTeamId, selectedVersionId),
      teamMons: teamMons
    };
  }
  function fillAgyModels() {
    if (!selAgyModel) return;
    var saved = A.load('cc_matchlog_agy_model', '') || '';
    var fallback = [
      { id: '', label: de ? 'Antigravity Standard' : 'Antigravity Default' },
      { id: 'gemini-3.8-flash-medium', label: 'Gemini 3.8 Flash (Medium)' },
      { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
      { id: 'gemini-4-neon-medium', label: 'Gemini 4 Neon (Medium)' },
      { id: 'gemini-4-neon-high', label: 'Gemini 4 Neon (High)' },
      { id: 'claude-sonnet-5-5-medium', label: 'Claude Sonnet 5.5 (Medium)' }
    ];
    function paintOpts(list) {
      selAgyModel.innerHTML = '';
      selAgyModel.appendChild(el('option', { value: '', text: de ? 'Modell: Standard' : 'Model: Default' }));
      list.forEach(function (m) {
        if (!m || !m.id) return;
        selAgyModel.appendChild(el('option', { value: m.id, text: m.label || m.id }));
      });
      if (saved && Array.from(selAgyModel.options).some(function (o) { return o.value === saved; })) {
        selAgyModel.value = saved;
      }
    }
    paintOpts(fallback.slice(1));
    var D = window.desktop && window.desktop.matchlog;
    if (D && D.agyModels) {
      D.agyModels().then(function (r) {
        if (r && r.ok && Array.isArray(r.models) && r.models.length) paintOpts(r.models);
      }, function () {});
    }
  }
  function runAntigravity() {
    var D = window.desktop && window.desktop.matchlog;
    if (!D || !D.antigravity) { if (ocrEl) ocrEl.textContent = t('desk'); return; }
    if (!kf) return;
    var sheets = kf.buildSheets();
    if (!sheets.length) { if (ocrEl) ocrEl.textContent = t('ocr') + ': Keine Keyframes gesammelt.'; return; }
    var model = (selAgyModel && selAgyModel.value) || '';
    if (btnAgy) { btnAgy.disabled = true; btnAgy.textContent = t('agyBusy'); }
    if (ocrEl) ocrEl.textContent = t('ocr') + ': Antigravity' + (model ? ' (' + model + ')' : '') + ' wertet ' + sheets.length + ' Kontaktbogen-Bild(er) aus…';
    D.antigravity({ prompt: kf.buildPrompt(buildAiContext()), sheets: sheets, model: model }).then(function (r) {
      if (btnAgy) { btnAgy.disabled = false; btnAgy.textContent = t('agyBtn'); }
      if (!r || !r.ok) {
        if (ocrEl) ocrEl.textContent = t('ocr') + ': Antigravity-Fehler: ' + (r && r.error || 'Unbekannt');
        return;
      }
      onAiLogReady(r.text, 'Antigravity', r.ms);
    }, function (err) {
      if (btnAgy) { btnAgy.disabled = false; btnAgy.textContent = t('agyBtn'); }
      if (ocrEl) ocrEl.textContent = t('ocr') + ': Antigravity-Fehler: ' + (err && err.message || err);
    });
  }
  function runGemini() {
    var D = window.desktop && window.desktop.matchlog;
    if (!D || !D.gemini) { if (ocrEl) ocrEl.textContent = t('desk'); return; }
    if (!kf) return;
    var apiKey = (inpGemKey && inpGemKey.value || '').trim();
    if (!apiKey) { if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + t('gemKeyMissing'); return; }
    A.save('cc_matchlog_gemini_key', apiKey);
    var sheets = kf.buildSheets();
    if (!sheets.length) { if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + t('noKeyframes'); return; }
    var model = (selGemModel && selGemModel.value) || 'gemini-3.8-flash';
    if (btnGem) { btnGem.disabled = true; btnGem.textContent = t('gemBusy'); }
    if (ocrEl) ocrEl.textContent = t('ocr') + ': Gemini (' + model + ') wertet ' + sheets.length + ' Bild(er) aus…';
    D.gemini({ apiKey: apiKey, model: model, prompt: kf.buildPrompt(buildAiContext()), sheets: sheets }).then(function (r) {
      if (btnGem) { btnGem.disabled = false; btnGem.textContent = t('gemBtn'); }
      if (!r || !r.ok) {
        if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + t('gemErr') + (r && r.error || t('unk'));
        return;
      }
      onAiLogReady(r.text, 'Gemini', r.ms);
    }, function (err) {
      if (btnGem) { btnGem.disabled = false; btnGem.textContent = t('gemBtn'); }
      if (ocrEl) ocrEl.textContent = t('ocr') + ': ' + t('gemErr') + (err && err.message || err);
    });
  }
  function startRec() {
    var s = stream();
    if (!s) {
      if (sceneEl) sceneEl.textContent = t('need');
      if (A && A.toast) A.toast(t('need'));
      return;
    }
    var vt = liveTrack(s);
    if (!vt || typeof window.MediaRecorder !== 'function') {
      if (A && A.toast) A.toast(t('recFail'));
      return;
    }
    makeEngine();
    paint();
    recordedBlob = null;
    recChunks = [];
    var recStream = new MediaStream([vt]);
    var opts = { videoBitsPerSecond: 2500000 };
    if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) opts.mimeType = 'video/webm;codecs=vp8';
    else if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported('video/webm')) opts.mimeType = 'video/webm';
    recorder = new window.MediaRecorder(recStream, opts);
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = function () {
      if (recTimer) { clearInterval(recTimer); recTimer = null; }
      recordedBlob = new Blob(recChunks, { type: (recorder && recorder.mimeType) || 'video/webm' });
      recorder = null;
      syncRecUi();
      paint();
      if (chkAutoAgy && chkAutoAgy.checked && kf && kf.stats().sheetCount > 0) {
        runAntigravity();
      }
    };
    recStartAt = Date.now();
    recorder.start(500);
    setOn(true);
    if (recTimer) clearInterval(recTimer);
    recTimer = setInterval(function () {
      if (timeEl) timeEl.textContent = t('recRun') + fmtSec((Date.now() - recStartAt) / 1000);
    }, 500);
    if (timeEl) timeEl.textContent = t('recRun') + '00:00';
    syncRecUi();
  }
  function stopRec() {
    setOn(false);
    if (recorder && recorder.state === 'recording') recorder.stop();
  }
  function toggleRec() {
    if (recorder && recorder.state === 'recording') stopRec();
    else startRec();
  }

  function renderArchive() {
    if (!archiveBox) return;
    archiveBox.innerHTML = '';
    var filter = selArchiveTeam ? selArchiveTeam.value : '__all__';
    var filtered = archiveLogs.filter(function (l) {
      if (filter === '__all__') return true;
      return (l.teamId || '') === filter;
    });
    if (!filtered.length) {
      archiveBox.appendChild(el('div', { class: 'ml-sub', text: t('archiveEmpty') }));
      return;
    }
    var groups = {}, order = [];
    filtered.forEach(function (l) {
      var key = (l.teamId || '') + '::' + (l.versionId || '');
      if (!groups[key]) { groups[key] = { teamId: l.teamId || '', versionId: l.versionId || '', versionName: l.versionName || '', items: [] }; order.push(key); }
      groups[key].items.push(l);
    });
    order.sort(function (a, b) {
      var ga = groups[a], gb = groups[b];
      if (!ga.teamId && gb.teamId) return 1;
      if (ga.teamId && !gb.teamId) return -1;
      var cmp = teamNameOf(ga.teamId).localeCompare(teamNameOf(gb.teamId), 'de');
      if (cmp) return cmp;
      var va = versionNameOf(ga.teamId, ga.versionId) || ga.versionName || '';
      var vb = versionNameOf(gb.teamId, gb.versionId) || gb.versionName || '';
      return va.localeCompare(vb, 'de', { numeric: true });
    });
    order.forEach(function (gKey) {
      var g = groups[gKey];
      var items = g.items;
      var vName = versionNameOf(g.teamId, g.versionId) || g.versionName || '';
      var grp = el('div', { class: 'ml-arch-group' });
      var hd = el('div', { class: 'ml-arch-head' });
      hd.appendChild(el('span', { text: teamNameOf(g.teamId) + (vName ? ' · ' + vName : '') + ' (' + items.length + ')' }));
      hd.appendChild(el('span', { class: 'ml-arch-id', text: g.teamId ? ('ID: ' + g.teamId + (g.versionId ? ' / ' + g.versionId : '')) : t('teamNone') }));
      grp.appendChild(hd);
      items.forEach(function (entry) {
        var dt = new Date(entry.when || Date.now()).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
        var resText = entry.result === 'win' ? t('win') : entry.result === 'loss' ? t('loss') : t('unk');
        var resCls = entry.result === 'win' ? 'ml-win' : entry.result === 'loss' ? 'ml-loss' : '';
        var row = el('div', { class: 'ml-arch-item' });
        var meta = el('div', { class: 'ml-arch-meta' });
        var title = el('div', { class: 'ml-arch-title' });
        title.appendChild(el('span', { text: 'vs ' + (entry.foe || 'Opponent') + ' · ' }));
        title.appendChild(el('span', { class: resCls, text: resText }));
        meta.appendChild(title);
        meta.appendChild(el('div', { class: 'ml-sub', text: dt + ' · ' + entry.showdown.split('\n').length + ' Zeilen' }));
        row.appendChild(meta);

        var acts = el('div', { class: 'ml-arch-acts' });
        var bShow = el('button', { type: 'button', class: 'tbtn', text: t('show') });
        bShow.addEventListener('click', function () { aiShowdownLog = entry.showdown; paint(); });
        var bAna = el('button', { type: 'button', class: 'tbtn', text: t('sendAnalysis') });
        bAna.addEventListener('click', function () { sendToAnalysis(entry.showdown, entry.teamId, entry.versionId, false); });
        var bCopy = el('button', { type: 'button', class: 'tbtn', text: t('copy') });
        bCopy.addEventListener('click', function () {
          if (navigator.clipboard) navigator.clipboard.writeText(entry.showdown);
          if (A && A.toast) A.toast(t('copied'));
        });
        var bDel = el('button', { type: 'button', class: 'tbtn', text: '✕', title: t('del') });
        bDel.addEventListener('click', function () {
          archiveLogs = archiveLogs.filter(function (x) { return x.id !== entry.id; });
          saveArchive();
          renderArchive();
        });
        acts.appendChild(bShow);
        acts.appendChild(bAna);
        acts.appendChild(bCopy);
        acts.appendChild(bDel);
        row.appendChild(acts);
        grp.appendChild(row);
      });
      archiveBox.appendChild(grp);
    });
  }

  function mount(host) {
    if (!host || host.querySelector('.ml-panel')) return;
    makeEngine();
    var box = el('section', { class: 'ml-panel' });
    box.appendChild(el('p', { class: 'ml-sub', text: t('sub') }));

    // Team- & Versions-Auswahl (Teambuilder-ID + Version-ID)
    var teamRow = el('div', { class: 'ml-row' });
    teamRow.appendChild(el('label', { class: 'ml-sub', text: t('teamLabel') }));
    selTeam = el('select', { class: 'det-cam', id: 'mlTeamSel' });
    selTeam.addEventListener('change', function () {
      selectedTeamId = selTeam.value || '';
      selectedVersionId = '';
      fillVersions();
      A.save('cc_matchlog_team', selectedTeamId);
      A.save('cc_matchlog_ver', selectedVersionId);
    });
    teamRow.appendChild(selTeam);
    teamRow.appendChild(el('label', { class: 'ml-sub', text: t('verLabel') }));
    selVersion = el('select', { class: 'det-cam', id: 'mlVerSel' });
    selVersion.addEventListener('change', function () {
      selectedVersionId = selVersion.value || '';
      A.save('cc_matchlog_ver', selectedVersionId);
    });
    teamRow.appendChild(selVersion);
    box.appendChild(teamRow);

    // Aufnahme & Live-Steuerung
    var row = el('div', { class: 'ml-row' });
    btnRec = el('button', { type: 'button', class: 'tbtn ml-rec', id: 'mlRecBtn', text: t('recStart') });
    btnRec.addEventListener('click', toggleRec);
    row.appendChild(btnRec);

    btnSaveVid = el('button', { type: 'button', class: 'tbtn', id: 'mlSaveVidBtn', text: t('saveVideo'), disabled: true });
    btnSaveVid.addEventListener('click', function () {
      if (!recordedBlob) return;
      var stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      A.saveFile('matchlog-' + stamp + '.webm', recordedBlob, recordedBlob.type || 'video/webm');
    });
    row.appendChild(btnSaveVid);

    chkLive = el('input', { type: 'checkbox', id: 'mlOn' });
    chkLive.addEventListener('change', function () { setOn(chkLive.checked); });
    var lab = el('label', { class: 'ml-check' });
    lab.appendChild(chkLive);
    lab.appendChild(el('span', { text: t('on') }));
    row.appendChild(lab);

    chkAiMode = el('input', { type: 'checkbox', id: 'mlAiMode' });
    chkAiMode.checked = true;
    var labAi = el('label', { class: 'ml-check' });
    labAi.appendChild(chkAiMode);
    labAi.appendChild(el('span', { text: t('aiMode') }));
    row.appendChild(labAi);

    var roi = el('input', { type: 'checkbox' });
    roi.addEventListener('change', function () {
      showRoi = roi.checked;
      if (overlay) overlay.hidden = !showRoi;
    });
    var rl = el('label', { class: 'ml-check' });
    rl.appendChild(roi);
    rl.appendChild(el('span', { text: t('roi') }));
    row.appendChild(rl);
    box.appendChild(row);

    // KI-Auswertung (Antigravity / Gemini)
    var aiRow = el('div', { class: 'ml-row' });
    btnAgy = el('button', { type: 'button', class: 'tbtn', text: t('agyBtn') });
    btnAgy.addEventListener('click', runAntigravity);
    aiRow.appendChild(btnAgy);

    selAgyModel = el('select', { class: 'det-cam', id: 'mlAgyModelSel', title: de ? 'Antigravity-Modell wählen' : 'Choose Antigravity model' });
    selAgyModel.addEventListener('change', function () {
      A.save('cc_matchlog_agy_model', selAgyModel.value || '');
    });
    aiRow.appendChild(selAgyModel);

    chkAutoAgy = el('input', { type: 'checkbox', id: 'mlAutoAgy' });
    chkAutoAgy.checked = true;
    var labAuto = el('label', { class: 'ml-check' });
    labAuto.appendChild(chkAutoAgy);
    labAuto.appendChild(el('span', { text: t('autoAgy') }));
    aiRow.appendChild(labAuto);

    chkAutoAnalysis = el('input', { type: 'checkbox', id: 'mlAutoAna' });
    chkAutoAnalysis.checked = true;
    var labAna = el('label', { class: 'ml-check' });
    labAna.appendChild(chkAutoAnalysis);
    labAna.appendChild(el('span', { text: t('autoAnalysis') }));
    aiRow.appendChild(labAna);
    box.appendChild(aiRow);

    // Optional: Gemini API + Google AI Pro Export
    var gemRow = el('div', { class: 'ml-row' });
    inpGemKey = el('input', { type: 'password', class: 'det-cam', placeholder: t('gemKeyPh'), autocomplete: 'off' });
    inpGemKey.value = A.load('cc_matchlog_gemini_key', '') || '';
    inpGemKey.addEventListener('change', function () { A.save('cc_matchlog_gemini_key', inpGemKey.value.trim()); });
    gemRow.appendChild(inpGemKey);
    selGemModel = el('select', { class: 'det-cam' });
    ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-2.5-flash-lite'].forEach(function (m) {
      selGemModel.appendChild(el('option', { value: m, text: m }));
    });
    gemRow.appendChild(selGemModel);
    btnGem = el('button', { type: 'button', class: 'tbtn', text: t('gemBtn') });
    btnGem.addEventListener('click', runGemini);
    gemRow.appendChild(btnGem);
    var btnExp = el('button', { type: 'button', class: 'tbtn', text: t('expBtn') });
    btnExp.addEventListener('click', function () {
      var D = window.desktop && window.desktop.matchlog;
      if (!D || !D.exportSheets || !kf) return;
      var sheets = kf.buildSheets();
      if (!sheets.length) return;
      var prompt = kf.buildPrompt(buildAiContext());
      if (navigator.clipboard) navigator.clipboard.writeText(prompt);
      D.exportSheets({ sheets: sheets, prompt: prompt });
    });
    gemRow.appendChild(btnExp);
    box.appendChild(gemRow);

    // Protokoll-Aktionen
    var actRow = el('div', { class: 'ml-row' });
    var bCopySd = el('button', { type: 'button', class: 'tbtn', text: t('copySd') });
    bCopySd.addEventListener('click', function () {
      var sd = currentShowdown();
      if (!sd) return;
      if (navigator.clipboard) navigator.clipboard.writeText(sd);
      if (A && A.toast) A.toast(t('copied'));
    });
    actRow.appendChild(bCopySd);
    var bSend = el('button', { type: 'button', class: 'tbtn', text: t('sendAnalysis') });
    bSend.addEventListener('click', function () { sendToAnalysis(currentShowdown(), selectedTeamId, selectedVersionId, false); });
    actRow.appendChild(bSend);
    var bArch = el('button', { type: 'button', class: 'tbtn', text: t('saveArchive') });
    bArch.addEventListener('click', function () { storeLog(currentShowdown(), 'manual'); });
    actRow.appendChild(bArch);
    var save = el('button', { type: 'button', class: 'tbtn', text: t('save') });
    save.addEventListener('click', function () {
      var snap = engine.snapshot();
      snap.teamId = selectedTeamId || '';
      snap.teamName = teamNameOf(selectedTeamId);
      snap.versionId = selectedVersionId || '';
      snap.versionName = versionNameOf(selectedTeamId, selectedVersionId);
      snap.text = engine.text();
      snap.showdown = currentShowdown();
      A.saveFile('matchlog.json', JSON.stringify(snap, null, 2), 'application/json');
    });
    actRow.appendChild(save);
    var clear = el('button', { type: 'button', class: 'tbtn', text: t('clear') });
    clear.addEventListener('click', function () { makeEngine(); paint(); });
    actRow.appendChild(clear);
    box.appendChild(actRow);

    if (!(window.desktop && window.desktop.matchlog)) box.appendChild(el('p', { class: 'ml-sub', text: t('desk') }));
    kfStatsEl = el('div', { class: 'ml-debug', text: 'Keyframes: Team-Preview – · 0 Momente (0 Bögen)' });
    sceneEl = el('div', { class: 'ml-debug', text: t('scene') + ': –' });
    ocrEl = el('div', { class: 'ml-debug', text: t('ocr') + ': –' });
    timeEl = el('div', { class: 'ml-debug', text: t('fps') });
    box.appendChild(kfStatsEl);
    box.appendChild(sceneEl);
    box.appendChild(ocrEl);
    box.appendChild(timeEl);

    overlay = el('canvas', { class: 'ml-roi' });
    overlay.hidden = true;
    octx = overlay.getContext('2d');
    box.appendChild(overlay);

    logEl = el('pre', { class: 'ml-log', text: t('empty') });
    box.appendChild(logEl);

    // Archiv-Sektion (nach Team sortiert, nur Text-Logs)
    var archSec = el('section', { class: 'ml-panel' });
    var archHead = el('div', { class: 'ml-row' });
    archHead.appendChild(el('h3', { text: t('archiveTitle') }));
    selArchiveTeam = el('select', { class: 'det-cam' });
    selArchiveTeam.addEventListener('change', renderArchive);
    archHead.appendChild(selArchiveTeam);
    archSec.appendChild(archHead);
    archiveBox = el('div', { class: 'ml-arch-list' });
    archSec.appendChild(archiveBox);
    box.appendChild(archSec);

    host.appendChild(box);
    fillTeams();
    fillAgyModels();
    loadArchive();
  }

  function buildView() {
    root.innerHTML = '';
    var head = el('div', { class: 'ml-head' });
    var back = el('button', { type: 'button', class: 'tbtn pv-back', text: '←' });
    back.addEventListener('click', function () { A.showView('start'); });
    head.appendChild(back);
    var h2 = el('h2');
    h2.appendChild(document.createTextNode(t('title') + ' '));
    h2.appendChild(el('span', { class: 'alpha-badge', text: 'ALPHA' }));
    head.appendChild(h2);
    root.appendChild(head);
    root.appendChild(el('p', { class: 'ml-alpha-note', text: t('alphaNote') }));

    var guide = el('details', { class: 'ml-guide' });
    guide.appendChild(el('summary', { text: t('guideTitle') }));
    var list = el('div', { class: 'ml-guide-body' });
    (S.guideSteps || []).forEach(function (line) {
      list.appendChild(el('p', { text: line }));
    });
    guide.appendChild(list);
    root.appendChild(guide);

    var srcRow = el('div', { class: 'ml-src-row' });
    camSel = el('select', { class: 'det-cam', 'aria-label': t('camera') });
    camSel.addEventListener('change', function () {
      if (!camSel.value) return;
      connectOwn({ kind: 'camera', id: camSel.value, label: camSel.options[camSel.selectedIndex].text });
    });
    srcRow.appendChild(camSel);
    var rf = el('button', { class: 'tbtn', type: 'button', text: '↻', title: t('refresh') });
    rf.addEventListener('click', fillCameras);
    srcRow.appendChild(rf);
    if (C && C.chooseScreen) {
      var sb = el('button', { class: 'tbtn', type: 'button', text: t('screen') });
      sb.addEventListener('click', function () { C.chooseScreen(connectOwn); });
      srcRow.appendChild(sb);
    }
    var pb = el('button', { class: 'tbtn', type: 'button', text: t('projector') });
    pb.addEventListener('click', function () { A.showView('projector'); });
    srcRow.appendChild(pb);
    btnDisc = el('button', { class: 'tbtn', type: 'button', text: t('disconnect'), disabled: true });
    btnDisc.addEventListener('click', disconnectOwn);
    srcRow.appendChild(btnDisc);
    root.appendChild(srcRow);

    statusEl = el('div', { class: 'ml-status' });
    root.appendChild(statusEl);

    var mountHost = el('div', { id: 'matchlogMount' });
    root.appendChild(mountHost);
    mount(mountHost);
    fillCameras();
    syncSourceStatus();
  }
  function render() {
    root = document.getElementById('matchlogView');
    if (!root) return;
    if (!root.firstChild) buildView();
    else { fillCameras(); fillTeams(); syncSourceStatus(); renderArchive(); }
  }
  window.CCMatchlogUI = { render: render, mount: mount, setOn: setOn, stream: stream, disconnect: disconnectOwn };
})();
