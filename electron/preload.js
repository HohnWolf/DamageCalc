// Brücke zwischen Seite und Hauptprozess: Fensterknöpfe der eigenen Titelleiste und der Desktop-Teil des Shiny-Zählers
// (globale Hotkeys, OBS-Overlay/Textdateien, Auswahl der Bildschirmquelle) und Updates. Sonst nichts.
const { contextBridge, ipcRenderer } = require('electron');

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
  },
  // Updates über GitHub-Releases (electron/updater.js)
  update: {
    get: () => ipcRenderer.invoke('update-get'),
    onStatus: (cb) => ipcRenderer.on('update-status', (e, s) => cb(s)),
    check: () => ipcRenderer.send('update-check'),
    install: () => ipcRenderer.send('update-install'),
  },
});
