// Desktop-Hülle für Rattata Lab (Damage Calculator + Teambuilder): öffnet index.html in einem eigenen Fenster.
// Die Web-App selbst bleibt unverändert und läuft auch weiterhin direkt im Browser.
// Das Fenster hat keinen Windows-Rahmen; die Kopfzeile der App ist die Titelleiste (Ziehen, Doppelklick
// maximiert) und zeigt eigene Knöpfe für Minimieren, Maximieren und Schließen (electron/preload.js).
const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

// Version 1.0/1.1 hieß "Champions Damage Calc": Teams, Sets und Einstellungen beim ersten Start übernehmen
try {
  const oldData = path.join(app.getPath('appData'), 'Champions Damage Calc');
  const newData = app.getPath('userData');
  if (!fs.existsSync(newData) && fs.existsSync(oldData)) fs.cpSync(oldData, newData, { recursive: true });
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

function createWindow() {
  const b = loadBounds() || { width: 1400, height: 900 };
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    minWidth: 1000, minHeight: 640,
    frame: false,
    title: 'Rattata Lab',
    icon: path.join(ROOT, 'icon.ico'),
    backgroundColor: '#1b1d21',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  if (b.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());

  const sendMax = () => { if (!win.isDestroyed()) win.webContents.send('maximized', win.isMaximized()); };
  win.on('maximize', sendMax);
  win.on('unmaximize', sendMax);
  win.webContents.on('did-finish-load', sendMax);

  // Links (z. B. Credits) im normalen Browser öffnen, nicht in der App
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // F5 / Strg+R neu laden, F12 Entwicklertools, F11 Vollbild
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) { win.webContents.reload(); e.preventDefault(); }
    if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });

  win.on('close', () => saveBounds(win));
  win.loadFile(path.join(ROOT, 'index.html'));
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
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
