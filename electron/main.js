// Desktop-Hülle für Rattata Labs (Damage Calculator, Teambuilder, Soul Link, Nuzlocke, Shiny-Zähler, Team-Analyse, Match-Overlay): öffnet index.html in einem eigenen Fenster.
// Die Web-App selbst bleibt unverändert und läuft auch weiterhin direkt im Browser.
// Das Fenster hat keinen Windows-Rahmen; die Kopfzeile der App ist die Titelleiste (Ziehen, Doppelklick
// maximiert) und zeigt eigene Knöpfe für Minimieren, Maximieren und Schließen (electron/preload.js).
const { app, BrowserWindow, shell, Menu, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const shiny = require('./shiny');
const match = require('./match');
const updater = require('./updater');
const metaPool = require('./meta_pool');
const battleHost = require('./battle_host');
const ocr = require('./ocr');
const matchlogOcr = require('./matchlog_ocr');
const { isStreamPipeError } = require('./streamguard');

function noteCrash(err) {
  const text = (err && err.stack) ? String(err.stack) : String(err);
  console.error(text);
  try {
    if (app.isReady()) fs.appendFileSync(path.join(app.getPath('userData'), 'main.log'), new Date().toISOString() + ' ' + text.replace(/\s+/g, ' ') + '\n');
  } catch (e) { /* Log nicht schreibbar */ }
  return text;
}

// Electron zeigt den Absturzdialog nur, solange es der einzige uncaughtException-Hörer ist.
// Dieser Hörer schluckt "write EOF" von der Shiny-Texterkennung. Jeder andere Fehler bekommt denselben Dialog.
process.on('uncaughtException', (err) => {
  const text = noteCrash(err);
  if (isStreamPipeError(err)) return;
  try { dialog.showErrorBox('A JavaScript error occurred in the main process', 'Uncaught Exception:\n' + text); } catch (e) { /* Dialog nicht verfügbar */ }
});
process.on('unhandledRejection', (err) => {
  if (isStreamPipeError(err)) { noteCrash(err); return; }
  throw err;
});

// Der Projektor ist ein Kindfenster (window.open). Das darf auch ohne Browser-Geste aufgehen.
app.commandLine.appendSwitch('disable-popup-blocking');
// Capture-Karten liefern unter Windows mit der GPU-Aufnahme (Media Foundation + D3D11) kurze grüne Bilder, besonders bei zwei Fenstern auf demselben Stream (Projektor).
// Die Aufnahme läuft deshalb über den CPU-Weg. Mit RL_D3D11_CAPTURE=1 lässt sich der alte Weg zum Vergleichen wieder einschalten.
if (process.platform === 'win32' && process.env.RL_D3D11_CAPTURE !== '1') app.commandLine.appendSwitch('disable-features', 'MediaFoundationD3D11VideoCapture');
const ROOT = path.join(__dirname, '..');
const projector = require('./projector');
// Test des Projektors / Matchlogs: eigene Nutzerdaten, damit die laufende App nicht blockiert wird
if (process.argv.includes('--projector-test') || process.argv.includes('--projector-click-test') || process.argv.includes('--matchlog-smoke')) {
  app.setPath('userData', path.join(require('os').tmpdir(), 'rl-projector-test-' + process.pid));
}

// Frühere Namen ("Champions Damage Calc" bis 1.1, "Rattata Lab" bis 1.11.1): Teams, Sets und Einstellungen beim ersten Start übernehmen
try {
  const newData = app.getPath('userData');
  const oldData = ['Rattata Lab', 'Champions Damage Calc'].map((n) => path.join(app.getPath('appData'), n)).find((p) => p !== newData && fs.existsSync(p));
  if (oldData && !fs.existsSync(path.join(newData, 'Local Storage'))) fs.cpSync(oldData, newData, { recursive: true });
} catch (e) { /* ohne alte Daten geht es auch */ }
const boundsFile = () => path.join(app.getPath('userData'), 'window.json');

function loadBounds() {
  try { return JSON.parse(fs.readFileSync(boundsFile(), 'utf8')); } catch (e) { return null; }
}
function saveBounds(win) {
  try {
    fs.writeFileSync(boundsFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() }));
  } catch (e) { /* nicht schlimm */ }
}

let win = null;

function createTestWindow() {
  win = new BrowserWindow({
    x: 20, y: 20, width: 1000, height: 640,
    show: true,
    backgroundColor: '#111111',
    title: 'Projektor-Test',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false,
    },
  });
  win.loadFile(path.join(__dirname, 'projector_harness.html'));
}

function createWindow() {
  if (process.argv.includes('--projector-test')) { createTestWindow(); return; }
  const isShiny = (Math.floor(Math.random() * 8192) === 0) || process.argv.includes('--shiny');
  const iconPath = (isShiny && fs.existsSync(path.join(ROOT, 'icon_shiny.ico')))
    ? path.join(ROOT, 'icon_shiny.ico')
    : path.join(ROOT, 'icon.ico');

  const b = loadBounds() || { width: 1400, height: 900 };
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    minWidth: 1000, minHeight: 640,
    frame: false,
    title: 'Rattata Labs',
    icon: iconPath,
    backgroundColor: '#1b1d21',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
      // the shiny counter keeps counting (hotkeys, auto detection) while the window is in the background
      backgroundThrottling: false,
    },
  });
  if (b.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());

  const sendMax = () => { if (!win.isDestroyed()) win.webContents.send('maximized', win.isMaximized()); };
  win.on('maximize', sendMax);
  win.on('unmaximize', sendMax);
  win.webContents.on('did-finish-load', sendMax);

  // HTTPS-Links und das Projektor-Fenster: electron/projector.js (install)
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // F5 / Strg+R neu laden, F12 Entwicklertools, F11 Vollbild
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
    if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });

  win.on('close', () => saveBounds(win));
  if (process.argv.includes('--matchlog-smoke')) {
    win.webContents.once('did-finish-load', () => {
      const shot = process.env.RL_SHOT_DIR || require('os').tmpdir();
      const frameFile = path.join(ROOT, 'test', 'matchlog', 'frames', 'm01_t120_127e.jpg');
      const frameUrl = fs.existsSync(frameFile) ? 'data:image/jpeg;base64,' + fs.readFileSync(frameFile).toString('base64') : '';
      win.webContents.executeJavaScript(`(async function () {
        try { window.CC.showView('projector'); } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
        var host = document.getElementById('matchlogMount');
        var text = host ? host.innerText : '';
        if (!host || !/Matchlog/.test(text) || !window.CCMatchlog || !window.CCMatchlogUI) {
          return { ok: false, error: 'panel missing', text: text.slice(0, 500) };
        }
        var frameUrl = ${JSON.stringify(frameUrl)};
        if (!frameUrl) return { ok: true, text: text.slice(0, 500) };
        var img = await new Promise(function (res, rej) {
          var el = new Image();
          el.onload = function () { res(el); };
          el.onerror = function () { rej(new Error('frame load failed')); };
          el.src = frameUrl;
        });
        var cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var pump = setInterval(function () { ctx.drawImage(img, 0, 0); }, 80);
        var stream = cv.captureStream(15);
        window.CCCapture.openStream = function () { return Promise.resolve(stream); };
        var sel = document.querySelector('#projectorView select.det-cam');
        if (!sel) { clearInterval(pump); return { ok: false, error: 'camSel missing' }; }
        var opt = document.createElement('option');
        opt.value = 'test-stream'; opt.textContent = 'Test-Stream';
        sel.appendChild(opt);
        sel.value = 'test-stream';
        sel.dispatchEvent(new Event('change'));
        for (var k = 0; k < 40 && !(window.CCProjectorView && window.CCProjectorView.stream()); k++) {
          await new Promise(function (r) { setTimeout(r, 50); });
        }
        var mlOn = document.getElementById('mlOn');
        if (!mlOn) { clearInterval(pump); return { ok: false, error: 'mlOn missing' }; }
        if (!mlOn.checked) mlOn.click();
        var logText = '', sceneText = '', timeText = '';
        for (var i = 0; i < 120; i++) {
          await new Promise(function (r) { setTimeout(r, 100); });
          var logEl = host.querySelector('.ml-log');
          var dbg = host.querySelectorAll('.ml-debug');
          sceneText = dbg[0] ? dbg[0].textContent : '';
          timeText = dbg[2] ? dbg[2].textContent : '';
          logText = logEl ? logEl.textContent : '';
          if (/Fake Out/i.test(logText) && /battle/.test(sceneText)) break;
        }
        var liveOk = /Fake Out/i.test(logText) && /battle/.test(sceneText);

        // Aufnahme-Modus testen: Record -> Stop -> 12fps Videoanalyse -> Video speichern aktiv
        var recBtn = document.getElementById('mlRecBtn');
        var saveVidBtn = document.getElementById('mlSaveVidBtn');
        var recOk = false, recLog = '', recTime = '';
        if (recBtn && saveVidBtn) {
          host.querySelector('.ml-log').textContent = '';
          recBtn.click();
          await new Promise(function (r) { setTimeout(r, 700); });
          recBtn.click();
          for (var j = 0; j < 120; j++) {
            await new Promise(function (r) { setTimeout(r, 100); });
            recLog = host.querySelector('.ml-log').textContent || '';
            recTime = host.querySelectorAll('.ml-debug')[2].textContent || '';
            if (!saveVidBtn.disabled && /Fake Out/i.test(recLog) && /12 fps/.test(recTime)) { recOk = true; break; }
          }
        }
        clearInterval(pump);
        try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
        return { ok: liveOk && recOk, liveOk: liveOk, recOk: recOk, scene: sceneText, time: recTime || timeText, log: (recLog || logText).slice(0, 500) };
      })()`, true).then((result) => {
        try { fs.mkdirSync(shot, { recursive: true }); fs.writeFileSync(path.join(shot, 'matchlog-smoke.json'), JSON.stringify(result)); } catch (e) { /* */ }
        setTimeout(() => { try { app.exit(result && result.ok ? 0 : 1); } catch (e) { process.exit(result && result.ok ? 0 : 1); } }, 50);
      }).catch((err) => {
        try { fs.writeFileSync(path.join(shot, 'matchlog-smoke.json'), JSON.stringify({ ok: false, error: String(err && err.message || err) })); } catch (e) { /* */ }
        setTimeout(() => { try { app.exit(1); } catch (e) { process.exit(1); } }, 50);
      });
    });
  }
  win.loadFile(path.join(ROOT, 'index.html'), isShiny ? { query: { shiny: '1' } } : undefined);
  if (process.argv.includes('--projector-click-test')) {
    const driver = fs.readFileSync(path.join(__dirname, 'projector_click.js'), 'utf8');
    win.webContents.once('did-finish-load', () => {
      win.webContents.executeJavaScript(driver, true).catch((err) => {
        console.error('Projektor-Klick-Test', err);
        try { fs.mkdirSync(process.env.RL_SHOT_DIR || require('os').tmpdir(), { recursive: true }); } catch (e) { /* */ }
        try {
          fs.writeFileSync(path.join(process.env.RL_SHOT_DIR || require('os').tmpdir(), 'result.json'), JSON.stringify({ ok: false, error: String(err && err.message || err) }));
        } catch (e) { /* */ }
        setTimeout(() => { try { app.exit(1); } catch (e) { process.exit(1); } }, 50);
      });
    });
  }
}

ipcMain.on('win', (e, what) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (what === 'min') w.minimize();
  else if (what === 'max') { if (w.isMaximized()) w.unmaximize(); else w.maximize(); }
  else if (what === 'close') w.close();
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    // Sprites und Item-Symbole kommen von Drittanbietern: 30 Tage im Festplatten-Cache halten, damit sie bei Ausfall oder ohne Netz weiter erscheinen
    session.defaultSession.webRequest.onHeadersReceived({ urls: [
      'https://play.pokemonshowdown.com/sprites/*', 'https://raw.githubusercontent.com/PokeAPI/sprites/*',
      'https://cdn.jsdelivr.net/gh/PokeAPI/sprites*', 'https://www.pokewiki.de/*'
    ], types: ['image'] }, (details, callback) => {
      const h = details.responseHeaders || {};
      if (details.statusCode === 200) {
        Object.keys(h).forEach((k) => { if (/^(cache-control|expires|pragma)$/i.test(k)) delete h[k]; });
        h['Cache-Control'] = ['public, max-age=2592000'];
      }
      callback({ responseHeaders: h });
    });
    createWindow();
    shiny.init(win);
    projector.init(win);
    match.init(shiny);
    ocr.init();
    matchlogOcr.init();
    updater.init(win);
    metaPool.init();
    battleHost.init();
    // Chromium schreibt localStorage nur verzögert auf die Platte: alle 5 s sichern, damit bei einem Absturz
    // oder "Task beenden" höchstens die letzten Sekunden Zählungen fehlen (kostet nichts, wenn sich nichts geändert hat)
    setInterval(() => { try { session.defaultSession.flushStorageData(); } catch (e) { /* beim Beenden */ } }, 5000);
  });
  app.on('window-all-closed', () => app.quit());
  // Teams, Hunts und Referenzbilder (localStorage) vor dem Beenden sicher auf die Platte schreiben, auch beim Neustart für ein Update
  app.on('before-quit', () => { try { session.defaultSession.flushStorageData(); } catch (e) { /* nichts zu schreiben */ } });
}
