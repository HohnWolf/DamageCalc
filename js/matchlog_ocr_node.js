// Matchlog-OCR im Prozess: tesseract.js (WASM) mit 2 parallelen Node-Workern (eng+deu).
// Kein PowerShell, kein Python. Stirbt ein Worker, startet der nächste Aufruf ihn neu.
const path = require('path');
const { createWorker } = require('tesseract.js');
const bmp = require('bmp-js');

function createSlot(opts) {
  const langPath = opts.langPath || path.join(__dirname, '..', 'vendor', 'tessdata');
  const cachePath = opts.cachePath || path.join(__dirname, '..', '.tess-cache');
  const langs = opts.langs || 'eng+deu';
  let worker = null;
  let starting = null;
  let lastWhitelist = '';
  let busy = false;

  function kill() {
    const w = worker;
    worker = null;
    lastWhitelist = '';
    busy = false;
    if (w) w.terminate().catch(function () {});
  }
  function boot() {
    if (worker) return Promise.resolve(worker);
    if (starting) return starting;
    starting = createWorker(langs, 1, {
      langPath: langPath,
      cachePath: cachePath,
      workerPath: path.join(__dirname, 'matchlog_ocr_worker.js'),
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
  async function run(bmpBuf, wl) {
    busy = true;
    const t0 = Date.now();
    try {
      const w = await boot();
      if (wl !== lastWhitelist) {
        await w.setParameters({ tessedit_char_whitelist: wl });
        lastWhitelist = wl;
      }
      const res = await w.recognize(bmpBuf);
      const text = String(res && res.data && res.data.text || '').replace(/\s+/g, ' ').trim();
      return { text: text, ms: Date.now() - t0, engine: 'tess' };
    } catch (e) {
      kill();
      return { text: '', error: String(e && e.message || e), ms: Date.now() - t0, engine: 'tess' };
    } finally {
      busy = false;
    }
  }
  return { boot, run, stop: kill, isBusy: () => busy };
}

function create(opts) {
  opts = opts || {};
  const poolSize = opts.workers || 2;
  const slots = [];
  for (let i = 0; i < poolSize; i++) slots.push(createSlot(opts));
  // Ersten Worker sofort vorwärmen
  slots[0].boot().catch(() => {});

  const queue = [];

  function toBmp(image) {
    const data = Buffer.from(image.abgr || image.data);
    const encoded = bmp.encode({ data: data, width: image.width, height: image.height });
    return Buffer.from(encoded.data);
  }

  function pump() {
    if (!queue.length) return;
    const free = slots.find((s) => !s.isBusy());
    if (!free) return;
    const item = queue.shift();
    free.run(item.bmpBuf, item.wl).then(item.resolve, (err) => {
      item.resolve({ text: '', error: String(err && err.message || err), ms: 0, engine: 'tess' });
    }).finally(pump);
  }

  function recognize(image) {
    if (!image || !image.width || !image.height) return Promise.resolve({ text: '', error: 'leeres Bild' });
    if (image.width < 8 || image.height < 8) return Promise.resolve({ text: '', ms: 0 });
    const bmpBuf = toBmp(image);
    const wl = String(image.whitelist || '');
    return new Promise((resolve) => {
      queue.push({ bmpBuf, wl, resolve });
      pump();
    });
  }

  function stop() {
    queue.length = 0;
    slots.forEach((s) => s.stop());
  }

  return { recognize: recognize, stop: stop };
}

module.exports = { create: create };
