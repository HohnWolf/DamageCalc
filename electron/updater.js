// Updates ueber GitHub-Releases (HohnWolf/DamageCalc).
// Der Kanal (js/update_channel.js) entscheidet vor dem Download: electron-updater wird nur gerufen,
// wenn die gefundene Version nach der Kanal-Regel auch installiert werden darf.
// Installierte Version (NSIS): Download im Hintergrund, Installation beim Neustart oder spaetestens beim Beenden.
// Portable Version: nur ein Hinweis mit Link, sie kann sich nicht selbst ersetzen.
// Zum Release gehoeren die .exe-Dateien, latest.yml (Vollversion) bzw. beta.yml (Vorabversion) und die .blockmap.
const { app, ipcMain, shell, net } = require('electron');
const fs = require('fs');
const path = require('path');
const Channel = require('../js/update_channel.js');

const OWNER = 'HohnWolf', REPO = 'DamageCalc';
const RELEASES = 'https://github.com/' + OWNER + '/' + REPO + '/releases';
const API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/releases?per_page=100';

const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const devConfig = !app.isPackaged && fs.existsSync(path.join(app.getAppPath(), 'dev-app-update.yml'));
const enabled = app.isPackaged || devConfig;

let channel = Channel.DEFAULT_CHANNEL;
let status = { state: enabled ? 'idle' : 'off', current: app.getVersion(), portable: portable, channel: channel };
let win = null, manual = false, autoUpdater = null;
let decision = null, rollbackInstall = false;
let busy = false, pending = null, gen = 0, downloadGen = 0, suppress = false;
let sawChannel = false;

function channelFile() { return path.join(app.getPath('userData'), 'update-channel.json'); }

function log(level, msg) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'update.log'),
      new Date().toISOString() + ' [' + level + '] ' + msg + '\n');
  } catch (e) { /* ohne Log geht es auch */ }
}
const logger = {
  info: (m) => log('info', m), warn: (m) => log('warn', m), error: (m) => log('error', m), debug: () => {},
};

function loadChannel() {
  try {
    const j = JSON.parse(fs.readFileSync(channelFile(), 'utf8'));
    channel = Channel.normalizeChannel(j && j.channel);
  } catch (e) { channel = Channel.DEFAULT_CHANNEL; }
}
function saveChannel() {
  try { fs.writeFileSync(channelFile(), JSON.stringify({ channel: channel })); } catch (e) { /* nicht schlimm */ }
}

function meta() {
  return Object.assign({
    prerelease: Channel.isPrerelease(app.getVersion())
  }, decision ? Channel.statusOf(decision) : { channel: channel });
}

function send(s) {
  status = Object.assign({
    current: app.getVersion(),
    manual: manual,
    portable: portable,
    channel: channel,
    prerelease: Channel.isPrerelease(app.getVersion())
  }, meta(), s);
  status.current = app.getVersion();
  status.channel = channel;
  log('state', JSON.stringify(status));
  if (win && !win.isDestroyed()) win.webContents.send('update-status', status);
}

async function fetchReleases() {
  const res = await net.fetch(API, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RattataLab/' + app.getVersion() },
  });
  if (!res.ok) throw new Error('GitHub ' + res.status);
  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('GitHub');
  return arr;
}

function setupAutoUpdater() {
  if (autoUpdater) return;
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.logger = logger;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  if (devConfig) autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.on('download-progress', (p) => {
    if (suppress || downloadGen !== gen) return;
    send({ state: 'progress', version: status.version, percent: Math.round(p.percent || 0) });
  });
  autoUpdater.on('update-downloaded', (i) => {
    if (suppress || downloadGen !== gen) return;
    const ver = i && i.version;
    if (!rollbackInstall && !Channel.allows(channel, app.getVersion(), ver)) {
      autoUpdater.autoInstallOnAppQuit = false;
      send({ state: 'none' });
      return;
    }
    send({ state: 'ready', version: ver });
  });
  autoUpdater.on('error', (e) => {
    if (suppress || downloadGen !== gen) return;
    send({ state: 'error', message: String(e && e.message || e).split('\n')[0] });
  });
}

function versionOf(result) {
  return result && result.updateInfo && result.updateInfo.version;
}

// Erst die aufgeloeste Version pruefen, dann herunterladen.
async function downloadFromUpdater(my, o) {
  setupAutoUpdater();
  // genau die gewaehlte Fassung laden (nicht die neueste latest.yml)
  if (o.tag) autoUpdater.setFeedURL({ provider: 'generic', url: RELEASES + '/download/v' + o.tag });
  autoUpdater.allowDowngrade = !!o.downgrade;
  autoUpdater.allowPrerelease = !!o.prerelease;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  suppress = true;
  let result;
  try {
    result = await autoUpdater.checkForUpdates();
  } finally {
    suppress = false;
    autoUpdater.allowDowngrade = false;
  }
  if (my !== gen) return;
  const found = versionOf(result);
  if (!found || (o.accept && !o.accept(found))) {
    autoUpdater.autoInstallOnAppQuit = false;
    send(Object.assign({ state: 'none' }, o.meta || {}));
    return;
  }
  rollbackInstall = !!o.downgrade;
  downloadGen = my;
  autoUpdater.autoInstallOnAppQuit = true;
  send(Object.assign({ state: 'available', version: found }, o.meta || {}));
  await autoUpdater.downloadUpdate();
}

async function run(my, opts) {
  send({ state: 'checking' });
  if (devConfig && !portable) {
    // lokale dev-app-update.yml: die Fassung daraus, aber dieselbe Kanal-Regel
    await downloadFromUpdater(my, {
      prerelease: channel === 'interim',
      accept: (found) => Channel.allows(channel, app.getVersion(), found)
    });
    return;
  }
  const releases = await fetchReleases();
  if (my !== gen) return;
  decision = Channel.decide(channel, app.getVersion(), releases);
  const extra = Channel.statusOf(decision);
  if (opts.rollback) {
    const target = decision.rollback;
    if (!target) { send(Object.assign({ state: 'none' }, extra)); return; }
    if (portable) {
      send(Object.assign({ state: 'portable', version: target.version, url: target.url || RELEASES }, extra));
      return;
    }
    await downloadFromUpdater(my, {
      downgrade: true,
      tag: target.version,
      prerelease: false,
      meta: extra,
      accept: (found) => Channel.compare(found, target.version) === 0
    });
    return;
  }
  if (!decision.update) { send(Object.assign({ state: 'none' }, extra)); return; }
  if (portable) {
    send(Object.assign({ state: 'portable', version: decision.update.version, url: decision.update.url || RELEASES }, extra));
    return;
  }
  await downloadFromUpdater(my, {
    prerelease: !!decision.update.prerelease,
    tag: decision.update.version,
    meta: extra,
    accept: (found) => Channel.allows(channel, app.getVersion(), found)
  });
}

function check(byUser, opts) {
  opts = opts || {};
  if (!enabled) return;
  if (busy) { pending = { byUser: !!byUser, opts: Object.assign({ force: true }, opts) }; return; }
  if (!opts.force && (status.state === 'ready' || status.state === 'progress' || status.state === 'checking')) {
    if (win && !win.isDestroyed()) win.webContents.send('update-status', status);
    return;
  }
  manual = !!byUser;
  busy = true;
  const my = ++gen;
  if (opts.force) {
    rollbackInstall = false;
    if (autoUpdater) autoUpdater.autoInstallOnAppQuit = false;
  }
  run(my, opts).catch((e) => {
    if (my !== gen) return;
    send({ state: 'error', message: String(e && e.message || e).split('\n')[0] });
  }).finally(() => {
    busy = false;
    if (!pending) return;
    const next = pending;
    pending = null;
    check(next.byUser, next.opts);
  });
}

// Heruntergeladene Update-Dateien (Installer, Blockmap, pending/) liegen im Cache-Ordner von electron-updater.
// Ist die Version darin nicht neuer als die laufende, wurde sie installiert und alles dort kann weg.
// Ein noch nicht installiertes, neueres Update bleibt liegen.
function cacheDir() {
  try {
    if (!process.env.LOCALAPPDATA) return null;
    const yml = fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8');
    const m = /^updaterCacheDirName:\s*(\S+)/m.exec(yml);
    return m ? path.join(process.env.LOCALAPPDATA, m[1]) : null;
  } catch (e) { return null; }
}
function cleanStale(dir, current) {
  if (!dir || !fs.existsSync(dir)) return false;
  let pendingVer = null;
  try {
    const info = JSON.parse(fs.readFileSync(path.join(dir, 'pending', 'update-info.json'), 'utf8'));
    const m = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\.exe$/i.exec(String(info && info.fileName || ''));
    pendingVer = m ? m[1] : null;
  } catch (e) { /* kein pending-Eintrag */ }
  if (pendingVer && Channel.compare(pendingVer, current) > 0) return false;
  for (const name of ['pending', 'installer.exe', 'current.blockmap']) {
    try { fs.rmSync(path.join(dir, name), { recursive: true, force: true }); } catch (e) { log('warn', 'cleanup ' + name + ': ' + e.message); }
  }
  log('info', 'Update-Dateien entfernt (installiert ' + current + ')');
  return true;
}

function init(w) {
  win = w;
  loadChannel();
  status.channel = channel;
  if (enabled && !portable) setupAutoUpdater();
  ipcMain.handle('update-get', () => status);
  ipcMain.on('update-check', () => check(true));
  ipcMain.on('update-channel', (e, ch) => {
    const next = Channel.normalizeChannel(ch);
    const changed = next !== channel;
    channel = next;
    saveChannel();
    const first = !sawChannel;
    sawChannel = true;
    if (!enabled) { send({ state: 'off' }); return; }
    if (first || changed) check(false, { force: true });
  });
  ipcMain.on('update-rollback', () => check(true, { force: true, rollback: true }));
  ipcMain.on('update-install', () => {
    if (status.state === 'ready' && autoUpdater) {
      if (!rollbackInstall && status.version && !Channel.allows(channel, app.getVersion(), status.version)) return;
      log('info', 'install ' + status.version + ' channel ' + channel);
      setImmediate(() => autoUpdater.quitAndInstall(true, true));
    } else if (status.state === 'portable') {
      shell.openExternal(status.url || RELEASES);
    }
  });
  if (enabled && !portable && app.isPackaged) {
    setTimeout(() => {
      if (!busy && status.state !== 'checking' && status.state !== 'available' && status.state !== 'progress' && status.state !== 'ready') {
        cleanStale(cacheDir(), app.getVersion());
      }
    }, 1500);
  }
  // Die Seite schickt den Kanal aus localStorage. Kommt er nicht, gilt die gespeicherte Wahl (Standard: Vollversionen).
  setTimeout(() => { if (!sawChannel && enabled) check(false); }, 8000);
}

module.exports = { init, cleanStale };
