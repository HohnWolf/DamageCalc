// In Electron-Main meldet is-electron auch im worker_threads-Kontext "electron",
// wodurch tesseract.js langPath per node-fetch als HTTP-URL laden will.
// Hier läuft der Node-Worker, der lokale tessdata-Dateien direkt lesen soll.
const isElectronPath = require.resolve('is-electron');
require.cache[isElectronPath] = {
  id: isElectronPath,
  filename: isElectronPath,
  loaded: true,
  exports: function () { return false; }
};
require('tesseract.js/src/worker-script/node/index.js');
