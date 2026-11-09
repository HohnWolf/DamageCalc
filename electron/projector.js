// Eigenes Fenster „Projektor“ für den Shiny-Zähler: Aufnahme vollflächig, OBS-Overlay darüber.
// Das Fenster ist undurchsichtig (kein transparentes Fenster, das unter Windows flackert).
// Das Bild ist dasselbe MediaStream wie im Zähler (ein Prozess, kein JPEG). Der gelbe Rahmen bleibt auf dem Vorschau-Canvas.
const { BrowserWindow, ipcMain, screen, MessageChannelMain } = require('electron');
const path = require('path');
const fs = require('fs');
const shiny = require('./shiny');

const TEST = process.argv.includes('--projector-test') || process.argv.includes('--projector-click-test');
let mainWin = null;
let proj = null;
let opts = emptyOpts();
let overlayUrl = '';
let theme = 'oled';
let lang = 'de';
let saveTimer = null;
let ready = false;

function emptyOpts() {
  return { onTop: false, hideCursor: false, overlay: true, fullscreen: false, displayId: null, bounds: null, sound: true, volume: 80, mode: 'classic', counterX: 2, counterY: 2, counterScale: 100 };
}
function alive(w) { return !!(w && !w.isDestroyed()); }
function safe(fn) { try { return fn(); } catch (e) { console.error('Projektor', e); return null; } }
function clampVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 80;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function clampScale(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 100;
  return Math.max(50, Math.min(300, Math.round(n)));
}
function clampPct(v, def) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function cleanOpts(o) {
  o = o && typeof o === 'object' ? o : {};
  const b = o.bounds && typeof o.bounds === 'object' ? o.bounds : null;
  let displayId = o.displayId == null || o.displayId === '' ? null : o.displayId;
  if (typeof displayId === 'string' && /^-?\d+$/.test(displayId)) displayId = +displayId;
  return {
    onTop: !!o.onTop,
    hideCursor: !!o.hideCursor,
    overlay: o.overlay !== false,
    fullscreen: !!o.fullscreen,
    displayId: displayId,
    sound: o.sound !== false,
    mode: o.mode === 'fast' ? 'fast' : 'classic',
    volume: clampVolume(o.volume == null ? 80 : o.volume),
    counterX: clampPct(o.counterX, 2),
    counterY: clampPct(o.counterY, 2),
    counterScale: clampScale(o.counterScale),
    bounds: b ? {
      x: Math.round(+b.x) || 0,
      y: Math.round(+b.y) || 0,
      width: Math.max(480, Math.min(7680, Math.round(+b.width) || 960)),
      height: Math.max(270, Math.min(4320, Math.round(+b.height) || 540))
    } : null
  };
}
function mergeOpts(patch) {
  const n = cleanOpts(Object.assign({}, opts, patch || {}));
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'displayId')) n.displayId = cleanOpts({ displayId: patch.displayId }).displayId;
  if (patch && patch.bounds) n.bounds = cleanOpts({ bounds: patch.bounds }).bounds;
  else if (!patch || !Object.prototype.hasOwnProperty.call(patch, 'bounds')) n.bounds = opts.bounds;
  opts = n;
  if (patch && patch.overlayUrl != null) overlayUrl = String(patch.overlayUrl);
  if (patch && patch.theme) theme = patch.theme === 'light' ? 'light' : 'oled';
  if (patch && patch.lang) lang = patch.lang === 'en' ? 'en' : 'de';
}

function send(wc, channel, payload) {
  if (!wc || (wc.isDestroyed && wc.isDestroyed())) return;
  try { wc.send(channel, payload); } catch (e) { /* Fenster schon zu */ }
}
function sendMain(channel, payload) { if (alive(mainWin)) send(mainWin.webContents, channel, payload); }
function sendProj(channel, payload) { if (alive(proj)) send(proj.webContents, channel, payload); }

function viewState() {
  return {
    onTop: opts.onTop, hideCursor: opts.hideCursor, overlay: opts.overlay,
    fullscreen: opts.fullscreen, displayId: opts.displayId,
    overlayUrl: overlayUrl, theme: theme, lang: lang, open: alive(proj),
    visible: alive(proj) && proj.isVisible(),
    sound: opts.sound !== false, volume: clampVolume(opts.volume), mode: opts.mode === 'fast' ? 'fast' : 'classic',
    counterX: clampPct(opts.counterX, 2), counterY: clampPct(opts.counterY, 2), counterScale: clampScale(opts.counterScale)
  };
}
function pushOpts() { const s = viewState(); sendProj('projector-opts', s); sendMain('projector-opts', s); }

function displays() {
  let primary = 0;
  try { primary = screen.getPrimaryDisplay().id; } catch (e) { primary = 0; }
  let list = [];
  try { list = screen.getAllDisplays(); } catch (e) { list = []; }
  return list.map((d, i) => ({ id: d.id, n: i + 1, w: d.size.width, h: d.size.height, primary: d.id === primary }));
}

function applyWindow() {
  if (!alive(proj)) return;
  safe(() => proj.setAlwaysOnTop(!!opts.onTop, 'floating'));
  safe(() => {
    if (opts.fullscreen) {
      const list = screen.getAllDisplays();
      const d = list.find((x) => x.id === opts.displayId) || screen.getDisplayMatching(proj.getBounds());
      const cur = screen.getDisplayMatching(proj.getBounds());
      if (!proj.isFullScreen() || !cur || cur.id !== d.id) {
        if (proj.isFullScreen()) proj.setFullScreen(false);
        proj.setBounds(d.bounds);
        proj.setFullScreen(true);
      }
    } else if (proj.isFullScreen()) proj.setFullScreen(false);
  });
  pushOpts();
}

function rememberBounds() {
  if (!alive(proj) || proj.isFullScreen()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!alive(proj) || proj.isFullScreen()) return;
    const b = safe(() => proj.getBounds());
    if (!b) return;
    opts.bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
    sendMain('projector-bounds', opts.bounds);
  }, 200);
}

function linkPorts() {
  if (!alive(proj) || !alive(mainWin)) return;
  // isLoading() bleibt nach did-finish-load manchmal wahr und hat die Verbindung verschluckt.
  try {
    const { port1, port2 } = new MessageChannelMain();
    mainWin.webContents.postMessage('projector-port', { type: 'rl-projector-port' }, [port1]);
    proj.webContents.postMessage('projector-port', { type: 'rl-projector-port' }, [port2]);
  } catch (e) { console.error('Projektor: MessagePort', e); }
}

function whenPort(cb, n) {
  const p = shiny.port();
  if (p) { cb(p); return; }
  if ((n || 0) > 40) { cb(0); return; }
  setTimeout(() => whenPort(cb, (n || 0) + 1), 50);
}

function isProjectorUrl(url) {
  return /(?:^|\/)projector\.html(?:$|\?|#)/.test(String(url || ''));
}
function popupOptions() {
  const b = opts.bounds;
  const o = {
    width: b ? b.width : 960,
    height: b ? b.height : 540,
    minWidth: 480,
    minHeight: 270,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    title: 'Rattata Labs – Projektor',
    // Dieselben Rechte wie das Elternfenster, damit Chromium im selben Prozess bleibt und das MediaStream teilbar ist.
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  };
  if (b && Number.isFinite(b.x) && Number.isFinite(b.y)) { o.x = b.x; o.y = b.y; }
  return o;
}
function attach(child) {
  proj = child;
  ready = false;
  safe(() => child.webContents.setBackgroundThrottling(false));
  const showProj = () => { if (alive(proj) && !proj.isVisible()) safe(() => proj.show()); };
  child.once('ready-to-show', showProj);
  child.on('resize', rememberBounds);
  child.on('move', rememberBounds);
  child.on('closed', () => { if (proj === child) { proj = null; ready = false; sendMain('projector-closed', {}); } });
  child.webContents.on('did-finish-load', () => { ready = true; showProj(); applyWindow(); });
  child.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (isMainFrame === false) return;
    console.error('Projektor: Seite nicht geladen', code, desc, url);
    showProj();
    sendMain('projector-error', { message: 'Die Projektor-Seite konnte nicht geladen werden.' });
  });
  child.webContents.on('before-input-event', (e, input) => {
    if (!alive(child) || input.type !== 'keyDown') return;
    if (input.key === 'Escape' && child.isFullScreen()) {
      opts.fullscreen = false;
      applyWindow();
      e.preventDefault();
    }
  });
  console.info('Projektor: natives Fenster, gleicher Prozess', child.webContents.getOSProcessId());
}
function install(win) {
  win.webContents.setWindowOpenHandler((details) => {
    if (isProjectorUrl(details.url)) return { action: 'allow', overrideBrowserWindowOptions: popupOptions() };
    if (/^https?:/.test(details.url || '')) { try { require('electron').shell.openExternal(details.url); } catch (e) { console.error(e); } }
    return { action: 'deny' };
  });
  win.webContents.on('did-create-window', (child, details) => {
    if (!isProjectorUrl(details.url)) return;
    attach(child);
  });
}

function closeProj() {
  if (!alive(proj)) { proj = null; return; }
  const w = proj;
  try { w.close(); } catch (e) { proj = null; }
}

function serve(req, res, url) {
  if (url.pathname !== '/projector') return false;
  fs.readFile(path.join(__dirname, 'projector.html'), (err, html) => {
    if (err) { console.error('Projektor: projector.html fehlt', err); res.writeHead(500); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  });
  return true;
}

function sampleImage(image) {
  if (!image || image.isEmpty()) return null;
  const size = image.getSize();
  const buf = image.toBitmap();
  const w = size.width, h = size.height;
  function at(x, y) {
    x = Math.max(0, Math.min(w - 1, x | 0));
    y = Math.max(0, Math.min(h - 1, y | 0));
    const i = (y * w + x) * 4;
    return { b: buf[i], g: buf[i + 1], r: buf[i + 2] };
  }
  let yellow = 0, magenta = 0, blue = 0, n = 0;
  for (let y = 0; y < h; y += 6) {
    for (let x = 0; x < w; x += 6) {
      const p = at(x, y); n++;
      if (p.r > 200 && p.g > 150 && p.b < 140) yellow++;
      if (p.r > 170 && p.b > 170 && p.g < 90) magenta++;
      if (p.b > 170 && p.r < 80 && p.g < 80) blue++;
    }
  }
  return { w: w, h: h, center: at(w / 2, h / 2), corner: at(12, 12), spot: at(100, 52), left: at(w * 0.15, h * 0.75), right: at(w * 0.85, h * 0.75), yellow: yellow, magenta: magenta, blue: blue, n: n };
}

function init(win) {
  mainWin = win;
  shiny.addRoute(serve);
  install(win);
  win.on('closed', () => { mainWin = null; closeProj(); });

  ipcMain.handle('projector-open', (e, patch) => {
    try {
      mergeOpts(patch || {});
      if (alive(proj)) { safe(() => proj.focus()); applyWindow(); return { ok: true, already: true }; }
      return { ok: true, already: false };
    } catch (err) {
      console.error('Projektor: Öffnen fehlgeschlagen', err);
      return { ok: false, message: 'Das Projektor-Fenster konnte nicht geöffnet werden.' };
    }
  });
  ipcMain.on('projector-close', () => closeProj());
  ipcMain.on('projector-set', (e, patch) => { mergeOpts(patch || {}); applyWindow(); });
  ipcMain.handle('projector-displays', () => displays());
  ipcMain.handle('projector-state', () => viewState());
  ipcMain.on('projector-leave-fs', () => { opts.fullscreen = false; applyWindow(); });

  if (TEST) {
    ipcMain.handle('projector-test-sample', async () => {
      const out = {};
      if (alive(mainWin)) out.main = sampleImage(await mainWin.webContents.capturePage());
      if (alive(proj)) out.projector = sampleImage(await proj.webContents.capturePage());
      return out;
    });
    ipcMain.handle('projector-test-shot', async (e, spec) => {
      spec = spec || {};
      const dir = process.env.RL_SHOT_DIR || '';
      const which = spec.which === 'main' ? mainWin : proj;
      if (!alive(which)) return { error: 'no-window' };
      const image = await which.webContents.capturePage();
      const png = image.toPNG();
      let file = '';
      if (dir && spec.file) {
        file = path.join(dir, path.basename(String(spec.file)));
        try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, png); } catch (err) { return { error: String(err.message || err) }; }
      }
      return { ok: true, file: file, sample: sampleImage(image) };
    });
    ipcMain.on('projector-test-menu', () => sendProj('projector-show-menu', { x: 28, y: 28 }));
    const race = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), ms))]);
    ipcMain.handle('projector-test-info', async (e, spec) => {
      spec = spec || {};
      const info = { open: alive(proj), visible: alive(proj) && !!safe(() => proj.isVisible()) };
      if (alive(proj)) {
        try { info.page = await race(proj.webContents.executeJavaScript(`(function () {
          var f = document.getElementById('ov');
          var doc = null;
          try { doc = f && f.contentDocument; } catch (e) { doc = null; }
          var fr = window.__projectorFrames || {};
          return {
            title: document.title,
            hint: (document.getElementById('ahint') || {}).textContent || '',
            frames: { n: fr.n || 0, fps: fr.fps || 0, w: fr.w || 0, h: fr.h || 0, dropped: fr.dropped || 0 },
            hear: window.__projectorHear || null,
            overlay: { src: f ? (f.src || '') : '', hidden: !f || f.hidden, real: !!(doc && doc.getElementById && doc.getElementById('count')) }
          };
        })()`, true), 1500); }
        catch (err) { info.pageError = String(err && err.message || err); }
        if (spec.counter) {
          const act = spec.counter;
          let code = '';
          if (act === 'state') code = 'window.__projectorCounter.state()';
          else if (act === 'toggle') code = 'window.__projectorCounter.toggle()';
          else if (act === 'key') code = '(function(){ window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true })); return true; })()';
          else if (act === 'edit') code = 'window.__projectorCounter.edit(true)';
          else if (act === 'reset') code = 'window.__projectorCounter.reset()';
          else if (act && act.drag) code = 'window.__projectorCounter.drag(' + Number(act.dx) + ',' + Number(act.dy) + ')';
          if (code) {
            try { info.counter = await race(proj.webContents.executeJavaScript(code, true), 1500); }
            catch (err) { info.counterError = String(err && err.message || err); }
          }
        }
        if (spec.sample) {
          try { info.sample = sampleImage(await proj.webContents.capturePage()); }
          catch (err) { info.sampleError = String(err && err.message || err); }
        }
        if (spec.menu) {
          try {
            info.menu = await race(proj.webContents.executeJavaScript(`new Promise(function (resolve) {
              document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
              setTimeout(function () {
                var menu = document.getElementById('menu');
                var range = menu && menu.querySelector('input[type=range]');
                resolve({ hidden: !menu || menu.hidden, text: menu ? menu.innerText : '', hasRange: !!range, vol: range ? range.value : '' });
              }, 250);
            })`, true), 2000);
          } catch (err) { info.menuError = String(err && err.message || err); }
        }
      }
      try { info.hotkey = require('electron').globalShortcut.isRegistered('CommandOrControl+Alt+P'); } catch (err) { info.hotkey = false; }
      return info;
    });
    ipcMain.on('projector-test-done', (e, result) => {
      const dir = process.env.RL_SHOT_DIR;
      if (dir) {
        try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result || {})); } catch (err) { /* Test liest den Exit-Code */ }
      }
      setTimeout(() => { try { require('electron').app.exit(result && result.ok === false ? 1 : 0); } catch (err) { process.exit(0); } }, 50);
    });
  }
}

module.exports = { init, cleanOpts, displays };
