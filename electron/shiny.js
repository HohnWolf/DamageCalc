// Desktop-Teil des Shiny-Zählers (Hauptprozess):
// - globale Hotkeys (zählen, auch wenn das Spiel/der Emulator im Vordergrund ist)
// - lokaler OBS-Server nur auf 127.0.0.1: Browser-Quelle /overlay und Daten /state (dazu /match/… aus electron/match.js)
// - Textdateien für OBS-Textquellen (Ordner "OBS" in den App-Daten)
// - Auswahl von Bildschirm/Fenster für die automatische Erkennung und die Clips (getDisplayMedia, Clips mit Systemton)
// - Clips speichern und öffnen (Ordner "Videos\Rattata Lab Clips", js/shiny_clip.js)
const { app, globalShortcut, ipcMain, desktopCapturer, session, shell } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_PORT = 39151;
let win = null;
let state = { hunts: [], active: null, overlay: null, updated: 0 };
let port = 0;
let chosenSource = null;
// weitere Seiten auf demselben Server (Match-Overlays, electron/match.js): handler(req, res, url) -> true, wenn erledigt
const routes = [];

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
function clipDir() { return path.join(app.getPath('videos'), 'Rattata Lab Clips'); }
// nur Dateien in diesem Ordner dürfen geöffnet werden
function inClipDir(p) { const r = path.relative(clipDir(), path.resolve(String(p || ''))); return !!r && !r.startsWith('..') && !path.isAbsolute(r); }
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
// Zustand einmal beim Eintreffen serialisieren (nicht bei jeder Abfrage) und per Server-Sent Events an die schnelle Overlay-Seite schieben
let stateJson = JSON.stringify(state);
let sseKey = '';
const sseClients = new Set();
// die Anzeige-Zeit der Timer läuft in der Seite selbst: ändert sich nur timeText, muss niemand benachrichtigt werden
function sseFingerprint(s) { return JSON.stringify([s.active, s.overlay, s.hunts.map((h) => Object.assign({}, h, { timeText: 0 }))]); }
function broadcast() {
  const key = sseFingerprint(state);
  if (key === sseKey) return;
  sseKey = key;
  const msg = 'data: ' + stateJson + '\n\n';
  sseClients.forEach((r) => { try { r.write(msg); } catch (e) { sseClients.delete(r); } });
}

function startServer() {
  const html = fs.readFileSync(path.join(__dirname, 'overlay.html'), 'utf8');
  const html2 = fs.readFileSync(path.join(__dirname, 'overlay2.html'), 'utf8');
  const server = http.createServer((req, res) => {
    // only local requests (no other device, no foreign website via DNS tricks)
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403); res.end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/overlay' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    } else if (url.pathname === '/overlay2') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html2);
    } else if (url.pathname === '/events') {
      if (req.socket) { req.socket.setNoDelay(true); req.socket.setTimeout(0); }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 500\n\ndata: ' + stateJson + '\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
    } else if (url.pathname === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(stateJson);
    } else if (!routes.some((h) => h(req, res, url))) { res.writeHead(404); res.end(); }
  });
  // Lebenszeichen, damit keine Zwischenstation die offene Verbindung kappt
  setInterval(() => { sseClients.forEach((r) => { try { r.write(':\n\n'); } catch (e) { sseClients.delete(r); } }); }, 20000).unref();
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
    // overlay: Anordnung des freien Layouts (Bühne, Position und Größe der Teile), live für OBS
    state = { hunts: s.hunts, active: s.active, overlay: s.overlay || null, updated: Date.now() };
    stateJson = JSON.stringify(state);
    broadcast();
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
      // Systemton (Loopback) nur unter Windows und nur, wenn die Seite Audio mitverlangt (Erkennung und Clips).
      callback(src ? (request.audioRequested && process.platform === 'win32' ? { video: src, audio: 'loopback' } : { video: src }) : {});
    }).catch(() => callback({}));
  });
  // clips (js/shiny_clip.js): only plain file names, written into the clip folder
  ipcMain.handle('shiny-clip-save', (e, name, bytes) => {
    try {
      const base = path.basename(String(name || '')).replace(/[\\/:*?"<>|]+/g, '');
      if (!/\.(mp4|webm)$/i.test(base)) return { error: 'name' };
      fs.mkdirSync(clipDir(), { recursive: true });
      let file = path.join(clipDir(), base), n = 1;
      while (fs.existsSync(file)) file = path.join(clipDir(), base.replace(/(\.\w+)$/, ' (' + (++n) + ')$1'));
      fs.writeFileSync(file, Buffer.from(bytes || []));
      return { ok: true, path: file };
    } catch (err) { return { error: String(err && err.message || err) }; }
  });
  ipcMain.on('shiny-clip-open', (e, p) => { if (inClipDir(p) && fs.existsSync(p)) shell.openPath(p); });
  ipcMain.on('shiny-clip-show', (e, p) => { if (inClipDir(p) && fs.existsSync(p)) shell.showItemInFolder(p); });
  ipcMain.on('shiny-clip-dir', () => { try { fs.mkdirSync(clipDir(), { recursive: true }); } catch (err) { /* */ } shell.openPath(clipDir()); });
  startServer();
}

app.on('will-quit', () => globalShortcut.unregisterAll());

module.exports = { init, addRoute: (h) => routes.push(h), port: () => port };
