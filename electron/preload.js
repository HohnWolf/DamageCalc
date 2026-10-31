// Brücke zwischen Seite und Fenster: nur die Fensterknöpfe der eigenen Titelleiste, sonst nichts.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  minimize: () => ipcRenderer.send('win', 'min'),
  toggleMaximize: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  onMaximized: (cb) => ipcRenderer.on('maximized', (e, v) => cb(!!v)),
});
