// Updates über GitHub-Releases (HohnWolf/DamageCalc), geprüft einmal beim Start und auf Wunsch in den Einstellungen.
// Installierte Version (NSIS): electron-updater lädt ein neues Release im Hintergrund und installiert es beim
// Neustart (Knopf in der Kopfzeile) oder spätestens beim nächsten Beenden.
// Portable Version: kann sich nicht selbst ersetzen, deshalb nur ein Hinweis mit Link zur Release-Seite.
// Zum Release gehören neben den .exe-Dateien auch dist/latest.yml und die .blockmap (siehe README).
const { app, ipcMain, shell, net } = require('electron');
const fs = require('fs');
const path = require('path');

const OWNER = 'HohnWolf', REPO = 'DamageCalc';
const RELEASES = 'https://github.com/' + OWNER + '/' + REPO + '/releases';
const START_DELAY = 4000; // erst prüfen, wenn die App in Ruhe geladen ist

const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
// ohne Paket (npm start) nur mit dev-app-update.yml im App-Ordner, damit Entwicklung nichts herunterlädt
const devConfig = !app.isPackaged && fs.existsSync(path.join(app.getAppPath(), 'dev-app-update.yml'));
const enabled = app.isPackaged || devConfig;

// state: idle | checking | none | available | progress | ready | portable | error | off
let status = { state: enabled ? 'idle' : 'off', current: app.getVersion(), portable: portable };
let win = null, manual = false, autoUpdater = null;

function log(level, msg) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'update.log'),
      new Date().toISOString() + ' [' + level + '] ' + msg + '\n');
  } catch (e) { /* ohne Log geht es auch */ }
}
const logger = {
  info: (m) => log('info', m), warn: (m) => log('warn', m), error: (m) => log('error', m), debug: () => {},
};

function send(s) {
  status = Object.assign({ current: app.getVersion(), manual: manual, portable: portable }, s);
  log('state', JSON.stringify(status));
  if (win && !win.isDestroyed()) win.webContents.send('update-status', status);
}

// "1.10.0" > "1.9.2"; Vorabversionen (1.3.0-beta) zählen wie ihre Hauptversion
function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split('-')[0].split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function checkPortable() {
  send({ state: 'checking' });
  try {
    const res = await net.fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RattataLab/' + app.getVersion() },
    });
    if (!res.ok) throw new Error('GitHub ' + res.status);
    const rel = await res.json();
    const version = String(rel.tag_name || '').replace(/^v/, '');
    if (version && newer(version, app.getVersion())) send({ state: 'portable', version: version, url: rel.html_url || RELEASES });
    else send({ state: 'none' });
  } catch (e) {
    send({ state: 'error', message: String(e && e.message || e) });
  }
}

function setupAutoUpdater() {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.logger = logger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  if (devConfig) autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => send({ state: 'none' }));
  autoUpdater.on('update-available', (i) => send({ state: 'available', version: i.version }));
  autoUpdater.on('download-progress', (p) => send({ state: 'progress', version: status.version, percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => send({ state: 'ready', version: i.version }));
  // offline, GitHub nicht erreichbar oder ein Release ohne latest.yml: nur im Log und in den Einstellungen
  autoUpdater.on('error', (e) => send({ state: 'error', message: String(e && e.message || e).split('\n')[0] }));
}

function check(byUser) {
  if (!enabled) return;
  // ein fertig geladenes Update nicht durch eine neue Prüfung verdecken
  if (status.state === 'ready' || status.state === 'progress' || status.state === 'checking') {
    if (win && !win.isDestroyed()) win.webContents.send('update-status', status);
    return;
  }
  manual = !!byUser;
  if (portable) { checkPortable(); return; }
  // Fehler meldet schon das 'error'-Ereignis; hier nur die Promise abfangen
  autoUpdater.checkForUpdates().catch(() => {});
}

function init(w) {
  win = w;
  if (enabled && !portable) setupAutoUpdater();
  ipcMain.handle('update-get', () => status);
  ipcMain.on('update-check', () => check(true));
  ipcMain.on('update-install', () => {
    if (status.state === 'ready' && autoUpdater) {
      log('info', 'install ' + status.version);
      // still installieren (Ordner bleibt wie bei der ersten Installation) und danach die App wieder starten
      setImmediate(() => autoUpdater.quitAndInstall(true, true));
    } else if (status.state === 'portable') {
      shell.openExternal(status.url || RELEASES);
    }
  });
  if (enabled) setTimeout(() => check(false), START_DELAY);
}

module.exports = { init };
