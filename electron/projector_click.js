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
    function paint() { ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 0, 40, 40); }
    paint();
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
    btn.click();
    var info = null;
    for (var t = 0; t < 50; t++) {
      info = await D.testInfo();
      if (info && info.visible && info.page && info.page.audio && info.page.audio.packets > 2 && info.page.audio.maxAbs > 0.01) break;
      await sleep(100);
    }
    out.click = info;
    step('klick sichtbar=' + !!(info && info.visible) + ' pakete=' + (info && info.page && info.page.audio && info.page.audio.packets));
    if (!info || !info.visible) return fail('Klick öffnet kein sichtbares Fenster');
    if (!info.page || !info.page.audio || info.page.audio.packets < 1 || info.page.audio.maxAbs < 0.01) return fail('kein Ton im Projektor');
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
