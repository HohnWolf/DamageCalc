// Eigenes Fenster „Projektor“ für den Shiny-Zähler: Aufnahme vollflächig, OBS-Overlay darüber.
// Das Fenster ist undurchsichtig (kein transparentes Fenster, das unter Windows flackert).
// Bilder kommen als JPEG über einen MessagePort aus dem Hauptfenster, nie aus dem Erkennungs-Canvas.
const { BrowserWindow, ipcMain, screen, MessageChannelMain } = require('electron');
const path = require('path');
const fs = require('fs');
const shiny = require('./shiny');

const TEST = process.argv.includes('--projector-test');
let mainWin = null;
let proj = null;
let opts = emptyOpts();
let overlayUrl = '';
let theme = 'oled';
let lang = 'de';
let saveTimer = null;
let ready = false;

function emptyOpts() {
  return { onTop: false, hideCursor: false, overlay: true, fullscreen: false, displayId: null, bounds: null };
}
function alive(w) { return !!(w && !w.isDestroyed()); }
function safe(fn) { try { return fn(); } catch (e) { return null; } }

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
    overlayUrl: overlayUrl, theme: theme, lang: lang, open: alive(proj)
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
  } catch (e) { /* eines der Fenster schließt gerade */ }
}

function whenPort(cb, n) {
  const p = shiny.port();
  if (p) { cb(p); return; }
  if ((n || 0) > 40) { cb(0); return; }
  setTimeout(() => whenPort(cb, (n || 0) + 1), 50);
}

function ensureWindow() {
  if (alive(proj)) { safe(() => proj.focus()); applyWindow(); return; }
  const b = opts.bounds;
  const winOpts = {
    width: b ? b.width : 960,
    height: b ? b.height : 540,
    minWidth: 480,
    minHeight: 270,
    show: false,
    backgroundColor: '#000000',
    title: 'Rattata Labs – Projektor',
    autoHideMenuBar: true,
  };
  if (b) { winOpts.x = b.x; winOpts.y = b.y; }
  proj = new BrowserWindow(Object.assign(winOpts, {
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  }));
  ready = false;
  proj.once('ready-to-show', () => { if (alive(proj)) safe(() => proj.show()); });
  proj.on('resize', rememberBounds);
  proj.on('move', rememberBounds);
  proj.on('closed', () => { proj = null; ready = false; sendMain('projector-closed', {}); });
  proj.webContents.on('render-process-gone', () => { /* Renderer weg, kein Absturz */ });
  proj.webContents.on('did-finish-load', () => { ready = true; applyWindow(); linkPorts(); });
  proj.webContents.on('before-input-event', (e, input) => {
    if (!alive(proj) || input.type !== 'keyDown') return;
    if (input.key === 'Escape' && proj.isFullScreen()) {
      opts.fullscreen = false;
      applyWindow();
      e.preventDefault();
    }
  });
  whenPort((port) => {
    if (!alive(proj)) return;
    if (!port) { safe(() => proj.close()); return; }
    safe(() => proj.loadURL('http://127.0.0.1:' + port + '/projector'));
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
    if (err) { res.writeHead(500); res.end(); return; }
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
  return { w: w, h: h, center: at(w / 2, h / 2), corner: at(12, 12), spot: at(100, 52), yellow: yellow, magenta: magenta, blue: blue, n: n };
}

function init(win) {
  mainWin = win;
  shiny.addRoute(serve);
  win.on('closed', () => { mainWin = null; closeProj(); });
  // Nach einem Neuladen des Hauptfensters den Kanal neu verbinden
  win.webContents.on('did-finish-load', () => { if (alive(proj)) linkPorts(); });

  ipcMain.handle('projector-open', (e, patch) => {
    mergeOpts(patch || {});
    ensureWindow();
    if (ready) applyWindow();
    return { ok: true };
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
