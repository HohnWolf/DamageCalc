// Matchlog-OCR im Prozess: tesseract.js (WASM) in einem Node-Worker.
// Kein PowerShell, kein Python. Stirbt der Worker, startet der nächste Aufruf ihn neu.
const path = require('path');
const { createWorker } = require('tesseract.js');
const bmp = require('bmp-js');

function create(opts) {
  opts = opts || {};
  const langPath = opts.langPath || path.join(__dirname, '..', 'vendor', 'tessdata');
  const cachePath = opts.cachePath || path.join(__dirname, '..', '.tess-cache');
  const langs = opts.langs || 'eng+deu';
  let worker = null;
  let starting = null;

  function kill() {
    const w = worker;
    worker = null;
    if (w) w.terminate().catch(function () {});
  }
  function boot() {
    if (worker) return Promise.resolve(worker);
    if (starting) return starting;
    starting = createWorker(langs, 1, {
      langPath: langPath,
      cachePath: cachePath,
      gzip: false,
      errorHandler: function (e) { console.error('Matchlog-OCR', e); }
    }).then(function (w) {
      worker = w;
      return w.setParameters({
        tessedit_pageseg_mode: '7',
        user_defined_dpi: '200'
      }).then(function () { return w; });
    }).catch(function (e) {
      kill();
      throw e;
    }).finally(function () { starting = null; });
    return starting;
  }
  function toBmp(image) {
    const data = Buffer.from(image.abgr || image.data);
    const encoded = bmp.encode({ data: data, width: image.width, height: image.height });
    return Buffer.from(encoded.data);
  }
  async function recognize(image) {
    if (!image || !image.width || !image.height) return { text: '', error: 'leeres Bild' };
    if (image.width < 8 || image.height < 8) return { text: '', ms: 0 };
    const t0 = Date.now();
    try {
      const w = await boot();
      const res = await w.recognize(toBmp(image));
      const text = String(res && res.data && res.data.text || '').replace(/\s+/g, ' ').trim();
      return { text: text, ms: Date.now() - t0 };
    } catch (e) {
      kill();
      return { text: '', error: String(e && e.message || e), ms: Date.now() - t0 };
    }
  }
  return { recognize: recognize, stop: kill };
}

module.exports = { create: create };
