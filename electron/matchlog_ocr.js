// Matchlog-Texterkennung im Electron-Hauptprozess (tesseract.js, WASM, Worker-Thread).
// Die Seite schickt nur kleine, schon vorverarbeitete Zeilen. Ein toter Worker wird beim nächsten Bild neu gestartet.
const { app, ipcMain } = require('electron');
const path = require('path');
const ocr = require('../js/matchlog_ocr_node');

let rec = null;

function init() {
  rec = ocr.create({
    langPath: path.join(__dirname, '..', 'vendor', 'tessdata'),
    cachePath: path.join(app.getPath('userData'), 'matchlog-tess')
  });
  ipcMain.handle('matchlog-ocr', (e, image) => {
    if (!image) return { text: '', error: 'leeres Bild' };
    let data = image.abgr && image.abgr.data ? image.abgr.data : image.abgr;
    if (image.b64) data = Buffer.from(String(image.b64), 'base64');
    if (!data) return { text: '', error: 'leeres Bild' };
    return rec.recognize({ width: image.width | 0, height: image.height | 0, abgr: data });
  });
  app.on('before-quit', () => { if (rec) rec.stop(); });
}

module.exports = { init };
