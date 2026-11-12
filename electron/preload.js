// Brücke zwischen Seite und Hauptprozess: Fensterknöpfe der eigenen Titelleiste und der Desktop-Teil des Shiny-Zählers
// (globale Hotkeys, OBS-Overlay/Textdateien, Auswahl der Bildschirmquelle, Texterkennung), die Match-Overlays und Updates. Sonst nichts.
const { contextBridge, ipcRenderer } = require('electron');

// MessagePort vom Hauptprozess ins Fenster (isolierte Welt → Seite)
ipcRenderer.on('projector-port', (event) => {
  try { window.postMessage({ type: 'rl-projector-port' }, '*', event.ports); }
  catch (e) { console.error('Projektor: Port', e); }
});

contextBridge.exposeInMainWorld('desktop', {
  minimize: () => ipcRenderer.send('win', 'min'),
  toggleMaximize: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  onMaximized: (cb) => ipcRenderer.on('maximized', (e, v) => cb(!!v)),
  shiny: {
    setHotkeys: (map) => ipcRenderer.invoke('shiny-hotkeys', map),
    onHotkey: (cb) => ipcRenderer.on('shiny-hotkey', (e, action) => cb(String(action))),
    pushState: (s) => ipcRenderer.send('shiny-state', s),
    overlayInfo: () => ipcRenderer.invoke('shiny-overlay-info'),
    openObsDir: () => ipcRenderer.send('shiny-open-dir'),
    captureSources: () => ipcRenderer.invoke('cap-sources'),
    chooseSource: (id) => ipcRenderer.send('cap-choose', String(id)),
    // Clips (js/shiny_clip.js): speichern im Ordner "Videos\Rattata Lab Clips", abspielen, im Ordner zeigen
    saveClip: (name, bytes) => ipcRenderer.invoke('shiny-clip-save', String(name), bytes),
    openClip: (p) => ipcRenderer.send('shiny-clip-open', String(p)),
    showClip: (p) => ipcRenderer.send('shiny-clip-show', String(p)),
    openClipDir: () => ipcRenderer.send('shiny-clip-dir'),
    // Text im markierten Bereich lesen (PNG als Base64) → { text } oder { error } (electron/ocr.js).
    // Windows.Media.Ocr gibt es nur unter Windows. Auf anderen Systemen bleibt die Brücke weg,
    // damit die Seite denselben Hinweis zeigt wie im Browser, statt PowerShell zu starten.
    ocr: process.platform === 'win32' ? (b64) => ipcRenderer.invoke('shiny-ocr', String(b64)) : undefined,
  },
  // Projektor-Fenster (electron/projector.js): Aufnahme in einem eigenen Fenster, Overlay darüber
  projector: {
    open: (o) => ipcRenderer.invoke('projector-open', o || {}),
    close: () => ipcRenderer.send('projector-close'),
    set: (o) => ipcRenderer.send('projector-set', o || {}),
    displays: () => ipcRenderer.invoke('projector-displays'),
    state: () => ipcRenderer.invoke('projector-state'),
    leaveFullscreen: () => ipcRenderer.send('projector-leave-fs'),
    onOpts: (cb) => ipcRenderer.on('projector-opts', (e, o) => cb(o)),
    onClosed: (cb) => ipcRenderer.on('projector-closed', () => cb()),
    onBounds: (cb) => ipcRenderer.on('projector-bounds', (e, b) => cb(b)),
    onShowMenu: (cb) => ipcRenderer.on('projector-show-menu', (e, pos) => cb(pos || {})),
    onError: (cb) => ipcRenderer.on('projector-error', (e, o) => cb(o || {})),
    testSample: () => ipcRenderer.invoke('projector-test-sample'),
    testShot: (spec) => ipcRenderer.invoke('projector-test-shot', spec || {}),
    testMenu: () => ipcRenderer.send('projector-test-menu'),
    testDone: (result) => ipcRenderer.send('projector-test-done', result || {}),
    testInfo: (spec) => ipcRenderer.invoke('projector-test-info', spec || {}),
  },
  // Match-Overlays für OBS (electron/match.js): Stand schicken, Adresse, Teamlogos, Start-Screen abspielen
  match: {
    push: (s) => ipcRenderer.send('match-state', s),
    info: () => ipcRenderer.invoke('match-info'),
    setLogo: (side, name, bytes) => ipcRenderer.invoke('match-logo-set', String(side), String(name), bytes),
    clearLogo: (side) => ipcRenderer.invoke('match-logo-del', String(side)),
    swapLogos: () => ipcRenderer.invoke('match-logo-swap'),
    play: () => ipcRenderer.send('match-play'),
    exportPng: (kind) => ipcRenderer.invoke('match-export', String(kind)),
  },
  // Lokaler Meta-Test (electron/meta_pool.js). Kein Showdown-Server.
  meta: {
    validate: (paste) => ipcRenderer.invoke('meta-validate', String(paste || '')),
    start: (job) => ipcRenderer.invoke('meta-start', job || {}),
    cancel: () => ipcRenderer.send('meta-cancel'),
    fetchPaste: (url) => ipcRenderer.invoke('meta-fetch-paste', String(url || '')),
    onProgress: (cb) => ipcRenderer.on('meta-progress', (e, p) => cb(p || {})),
    onDone: (cb) => ipcRenderer.on('meta-done', (e, p) => cb(p || {})),
  },
  // Updates über GitHub-Releases (electron/updater.js)
  update: {
    get: () => ipcRenderer.invoke('update-get'),
    onStatus: (cb) => ipcRenderer.on('update-status', (e, s) => cb(s)),
    check: () => ipcRenderer.send('update-check'),
    install: () => ipcRenderer.send('update-install'),
    setChannel: (ch) => ipcRenderer.send('update-channel', String(ch || '')),
    rollback: () => ipcRenderer.send('update-rollback'),
  },
});
