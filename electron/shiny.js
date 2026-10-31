// Desktop-Teil des Shiny-Zählers (Hauptprozess):
// - globale Hotkeys (zählen, auch wenn das Spiel/der Emulator im Vordergrund ist)
// - lokaler OBS-Server nur auf 127.0.0.1: Browser-Quelle /overlay und Daten /state
// - Textdateien für OBS-Textquellen (Ordner "OBS" in den App-Daten)
// - Auswahl von Bildschirm/Fenster für die automatische Erkennung (getDisplayMedia)
const { app, globalShortcut, ipcMain, desktopCapturer, session, shell } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_PORT = 39151;
let win = null;
let state = { hunts: [], active: null, updated: 0 };
let port = 0;
let chosenSource = null;

// ---------------- hotkeys ----------------
let keys = {};
function setHotkeys(map) {
  globalShortcut.unregisterAll();
  keys = {};
  const result = {};
  Object.keys(map || {}).forEach((action) => {
    const acc = map[action];
    if (!acc) return;
    let ok = false;
    try { ok = globalShortcut.register(acc, () => { if (win && !win.isDestroyed()) win.webContents.send('shiny-hotkey', action); }); } catch (e) { ok = false; }
    result[action] = ok;
    if (ok) keys[action] = acc;
  });
  return result;
}

// ---------------- OBS: text files ----------------
function obsDir() { return path.join(app.getPath('userData'), 'OBS'); }
let writeTimer = null;
function writeFiles() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      const h = state.hunts.find((x) => x.id === state.active) || state.hunts[0];
      if (!h) return;
      fs.mkdirSync(obsDir(), { recursive: true });
      const files = {
        'zaehler.txt': String(h.count), 'gesamt.txt': String(h.total), 'phase.txt': String(h.phase), 'quote.txt': h.oddsText,
        'timer.txt': h.timeText, 'pokemon.txt': h.name, 'chance.txt': h.chanceText, 'methode.txt': h.methodText, 'spiel.txt': h.gameText
      };
      Object.keys(files).forEach((f) => {
        const p = path.join(obsDir(), f);
        let old = null;
        try { old = fs.readFileSync(p, 'utf8'); } catch (e) { /* new file */ }
        if (old !== files[f]) fs.writeFileSync(p, files[f] == null ? '' : files[f]);
      });
    } catch (e) { /* OBS-Dateien sind nicht kritisch */ }
  }, 150);
}

// ---------------- OBS: local server ----------------
function startServer() {
  const html = fs.readFileSync(path.join(__dirname, 'overlay.html'), 'utf8');
  const server = http.createServer((req, res) => {
    // only local requests (no other device, no foreign website via DNS tricks)
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403); res.end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/overlay' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    } else if (url.pathname === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(state));
    } else { res.writeHead(404); res.end(); }
  });
  let tries = 0;
  const listen = () => server.listen(BASE_PORT + tries, '127.0.0.1');
  server.on('listening', () => { port = BASE_PORT + tries; });
  server.on('error', () => { tries++; if (tries < 20) setTimeout(listen, 50); });
  listen();
}

function init(mainWindow) {
  win = mainWindow;
  ipcMain.handle('shiny-hotkeys', (e, map) => setHotkeys(map));
  ipcMain.on('shiny-state', (e, s) => {
    if (!s || !Array.isArray(s.hunts)) return;
    state = { hunts: s.hunts, active: s.active, updated: Date.now() };
    writeFiles();
  });
  ipcMain.handle('shiny-overlay-info', () => ({ port, url: port ? 'http://127.0.0.1:' + port + '/overlay' : '', dir: obsDir() }));
  ipcMain.on('shiny-open-dir', () => { try { fs.mkdirSync(obsDir(), { recursive: true }); } catch (e) { /* */ } shell.openPath(obsDir()); });
  // capture sources for the auto detection
  ipcMain.handle('cap-sources', async () => {
    const list = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
    return list.map((s) => ({ id: s.id, name: s.name, thumb: s.thumbnail.isEmpty() ? '' : s.thumbnail.toDataURL() }));
  });
  ipcMain.on('cap-choose', (e, id) => { chosenSource = id; });
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((list) => {
      const src = list.find((s) => s.id === chosenSource) || list[0];
      callback(src ? { video: src } : {});
    }).catch(() => callback({}));
  });
  startServer();
}

app.on('will-quit', () => globalShortcut.unregisterAll());

module.exports = { init };
