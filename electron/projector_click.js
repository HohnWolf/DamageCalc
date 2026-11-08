// Wird nur mit --projector-click-test ausgeführt: echter „Projektor“-Knopf und Strg+Alt+P.
(async function () {
  var D = window.desktop && window.desktop.projector;
  var out = { steps: [] };
  function step(m) { out.steps.push(String(m)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var finished = false;
  function fail(msg) {
    if (finished) return;
    finished = true;
    out.ok = false; out.error = String(msg);
    console.error('Projektor-Klick-Test', msg);
    console.error(out.steps.join('\n'));
    if (D) D.testDone(out);
  }
  try {
    setTimeout(function () { if (!out.ok) fail('Zeit überschritten'); }, 40000);
    for (var i = 0; i < 80 && !(window.CC && window.CC.showView && window.CCShiny && window.CCShinyDetect && window.CCProjector); i++) await sleep(100);
    step('boot shiny=' + !!window.CCShiny + ' bridge=' + !!(D && D.open));
    if (!window.CCShiny || !D || typeof D.open !== 'function') return fail('App nicht bereit');
    window.CC.showView('shiny');
    var store = window.CCShiny._store();
    var h = { id: 'htest', species: 25, title: 'Test', game: 'sv', method: 'full', params: { charm: false }, step: 1, count: 0, total: 0, phases: [], timeMs: 0, runStart: 0, status: 'active', hotkey: true, created: Date.now(), days: {} };
    store.hunts.unshift(h); store.sel = h.id;
    window.CCShiny.render();
    await sleep(40);
    var early = document.querySelector('[data-projector]');
    if (!early) return fail('Knopf fehlt ohne Aufnahme');
    early.click();
    await sleep(40);
    var toast0 = document.querySelector('.toast');
    out.noVideoToast = toast0 ? toast0.textContent : '';
    step('ohne quelle: ' + out.noVideoToast);
    if (!/Aufnahme/.test(out.noVideoToast)) return fail('kein deutscher Hinweis ohne Aufnahme');
    var info0 = await D.testInfo();
    if (info0 && info0.open) return fail('Fenster öffnete sich ohne Aufnahme');

    var canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 180;
    var ctx = canvas.getContext('2d');
    var stepN = 0;
    function paint() {
      stepN++;
      ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 160, 180);
      ctx.fillStyle = '#00ff00'; ctx.fillRect(160, 0, 160, 180);
      ctx.fillStyle = '#0000ff';
      ctx.fillRect((stepN % 24) * 5, 6, 22, 22);
    }
    paint();
    setInterval(paint, 40);
    h.detect = { region: { x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, refs: [], mode: 'image', thr: 0.85 };
    var vstream = canvas.captureStream(15);
    var actx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = actx.createOscillator();
    var dest = actx.createMediaStreamDestination();
    osc.frequency.value = 440; osc.connect(dest); osc.start();
    var stream = new MediaStream([].concat(vstream.getVideoTracks(), dest.stream.getAudioTracks()));
    window.CCShinyDetect._attach(h, stream, { count: function () {}, persist: function () {} });
    var vid = window.CCShinyDetect.video(h.id);
    if (vid) { try { await vid.play(); } catch (e) { step('play ' + (e && e.message)); } }
    for (var w = 0; w < 30 && !(vid && vid.videoWidth); w++) { paint(); await sleep(40); }
    window.CCShiny.render();
    await sleep(30);
    var btn = document.querySelector('[data-projector]');
    step('knopf=' + (btn ? btn.textContent : 'fehlt') + ' video=' + !!(vid && vid.videoWidth) + ' audio=' + stream.getAudioTracks().length);
    if (!btn) return fail('Knopf fehlt trotz Aufnahme');
    var ovUrl = '';
    for (var oi = 0; oi < 40; oi++) {
      var ov = await window.desktop.shiny.overlayInfo();
      if (ov && /\/overlay/.test(ov.url || '')) { ovUrl = ov.url; break; }
      await sleep(50);
    }
    if (!ovUrl) return fail('echte Overlay-Adresse fehlt');
    btn.click();
    function red(p) { return p && p.r > 220 && p.g < 40 && p.b < 40; }
    function green(p) { return p && p.g > 220 && p.r < 40 && p.b < 40; }
    var info = null, heard = null;
    for (var t = 0; t < 50; t++) {
      info = await D.testInfo({ sample: true });
      heard = window.__projectorAudioMain;
      var page = info && info.page;
      var colors = info && info.sample && red(info.sample.left) && green(info.sample.right);
      var realOv = page && page.overlay && !page.overlay.hidden && /\/overlay/.test(page.overlay.src) && page.overlay.real;
      var frames = page && page.frames && page.frames.n > 0 && page.frames.w > 0;
      if (info && info.visible && colors && realOv && frames && heard && heard.playing && heard.peak > 8 && heard.underruns === 0) break;
      await sleep(100);
    }
    await sleep(400);
    heard = window.__projectorAudioMain;
    info = await D.testInfo({ sample: true });
    out.click = { visible: !!(info && info.visible), sample: info && info.sample, frames: info && info.page, audio: heard ? { underruns: heard.underruns, peak: heard.peak, playing: heard.playing } : null };
    var left = info && info.sample && info.sample.left, right = info && info.sample && info.sample.right;
    var page = info && info.page;
    step('klick sichtbar=' + !!(info && info.visible) + ' links=' + JSON.stringify(left) + ' rechts=' + JSON.stringify(right) + ' overlay=' + JSON.stringify(page && page.overlay) + ' frames=' + JSON.stringify(page && page.frames) + ' ton=' + JSON.stringify(heard));
    if (!info || !info.visible) return fail('Klick öffnet kein sichtbares Fenster');
    if (!page || !page.overlay || page.overlay.hidden || !/\/overlay/.test(page.overlay.src) || !page.overlay.real) return fail('echtes Overlay ist nicht geladen');
    if (!/transparent=1/.test(page.overlay.src)) return fail('Overlay ist nicht durchsichtig eingebunden');
    if (!page.frames || page.frames.n < 1 || page.frames.w < 2) return fail('kein Bild im Projektor angekommen');
    if (!red(left) || !green(right)) return fail('Rot-Grün-Muster liegt unter dem Overlay');
    D.set({ overlay: false });
    var bare = null;
    for (var y = 0; y < 15; y++) {
      bare = await D.testInfo({ sample: true });
      if (bare && bare.sample && bare.sample.yellow === 0 && bare.sample.center && bare.sample.center.r > 170) break;
      await sleep(80);
    }
    out.bare = bare && bare.sample;
    if (!bare || !bare.sample || bare.sample.yellow !== 0) return fail('Gelber Erkennungsrahmen im Projektor');
    if (!red(bare.sample.left) || !green(bare.sample.right)) return fail('Bild verschwindet ohne Overlay');
    D.set({ overlay: true });
    if (!heard || !heard.playing || heard.peak < 8) return fail('Ton der Aufnahme ist nicht zu hören');
    if (heard.underruns !== 0) return fail('Ton reißt ab (' + heard.underruns + ')');
    out.previewMuted = !!(vid && vid.muted && vid.volume === 0);

    var menuInfo = await D.testInfo({ menu: true });
    out.menu = menuInfo && menuInfo.menu;
    step('menü ' + JSON.stringify(out.menu));
    if (!out.menu || out.menu.hidden || !/Ton/.test(out.menu.text) || !out.menu.hasRange) return fail('Menü ohne Ton oder Lautstärke');

    D.set({ sound: false, volume: 35 });
    var saved = null;
    for (var s = 0; s < 20; s++) {
      saved = store.projector;
      if (saved && saved.sound === false && saved.volume === 35) break;
      await sleep(50);
    }
    out.saved = saved ? { sound: saved.sound, volume: saved.volume } : null;
    if (!saved || saved.sound !== false || saved.volume !== 35) return fail('Ton oder Lautstärke nicht gespeichert');
    D.set({ sound: true, volume: 80 });

    window.CCShiny._hotkey('projector');
    var closed = null;
    for (var c = 0; c < 30; c++) {
      closed = await D.testInfo();
      if (closed && !closed.open) break;
      await sleep(50);
    }
    if (!closed || closed.open) return fail('Hotkey schließt das Fenster nicht');
    window.CCShiny._hotkey('projector');
    var again = null;
    for (var u = 0; u < 40; u++) {
      again = await D.testInfo();
      if (again && again.visible) break;
      await sleep(100);
    }
    out.hotkey = { accel: store.hotkeys && store.hotkeys.projector, registered: !!(again && again.hotkey), visible: !!(again && again.visible) };
    step('hotkey ' + JSON.stringify(out.hotkey));
    if (out.hotkey.accel !== 'CommandOrControl+Alt+P') return fail('Hotkey ist nicht Strg+Alt+P');
    if (!out.hotkey.visible) return fail('Strg+Alt+P öffnet kein sichtbares Fenster');
    out.ok = !!(out.previewMuted && out.noVideoToast && out.saved.volume === 35);
    if (!out.ok) return fail('Vorschau spielt den Ton mit oder Hinweis fehlt');
    finished = true;
    D.testDone(out);
  } catch (e) {
    fail(e && e.stack || e);
  }
})();
