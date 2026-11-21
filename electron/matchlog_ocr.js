// Matchlog im Electron-Hauptprozess:
// - Prozessinterne OCR (tesseract.js, 2-Worker-Pool)
// - KI-Auswertung über lokale Antigravity CLI (agy -p) oder Gemini API (kostenlose Stufe)
// - Export von Kontaktbögen + Prompt (für Google AI Pro Web)
// - Speicherplatz-schonendes Matchlog-Archiv (nur Text-Logs + teamId, keine Videos/Frames)
const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ocr = require('../js/matchlog_ocr_node');

let rec = null;

function storePath() {
  return path.join(app.getPath('userData'), 'matchlog_store.json');
}
function loadStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    return {
      v: 1,
      logs: Array.isArray(raw && raw.logs) ? raw.logs : []
    };
  } catch (e) {
    return { v: 1, logs: [] };
  }
}
function saveStore(data) {
  const clean = {
    v: 1,
    logs: Array.isArray(data && data.logs) ? data.logs : []
  };
  fs.writeFileSync(storePath(), JSON.stringify(clean, null, 2), 'utf8');
  return { ok: true, count: clean.logs.length };
}

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
    return rec.recognize({ width: image.width | 0, height: image.height | 0, abgr: data, whitelist: image.whitelist || '' });
  });

  ipcMain.handle('matchlog-store-load', () => loadStore());
  ipcMain.handle('matchlog-store-save', (e, data) => {
    try { return saveStore(data); }
    catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  });

  function findAgyBin() {
    const localAgy = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'agy', 'bin', 'agy.exe') : '';
    return (localAgy && fs.existsSync(localAgy)) ? localAgy : 'agy';
  }

  ipcMain.handle('matchlog-agy-models', async () => {
    const agyBin = findAgyBin();
    return await new Promise((resolve) => {
      let stdout = '';
      let child;
      try {
        child = spawn(agyBin, ['models'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) {
        resolve({ ok: false, models: [] });
        return;
      }
      const timer = setTimeout(() => { try { child.kill(); } catch (e) {} resolve({ ok: false, models: [] }); }, 8000);
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (d) => { stdout += d; });
      child.on('error', () => { clearTimeout(timer); resolve({ ok: false, models: [] }); });
      child.on('close', () => {
        clearTimeout(timer);
        const models = [];
        String(stdout || '').split(/\r?\n/).forEach((line) => {
          const s = line.trim();
          if (!s || /^fetching/i.test(s)) return;
          const parts = s.split(/\t+/);
          if (parts.length >= 2 && /^[a-z0-9._-]+$/i.test(parts[0].trim())) {
            models.push({ id: parts[0].trim(), label: parts.slice(1).join(' ').trim() });
          }
        });
        resolve({ ok: models.length > 0, models });
      });
    });
  });

  ipcMain.handle('matchlog-antigravity', async (e, payload) => {
    const t0 = Date.now();
    const sheets = (payload && payload.sheets) || [];
    const prompt = String(payload && payload.prompt || '');
    const model = String(payload && payload.model || '').trim();
    if (!sheets.length) return { ok: false, error: 'Keine Keyframes gesammelt.' };

    const tmpDir = path.join(app.getPath('temp'), 'rl-matchlog-agy-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    const filePaths = [];
    try {
      sheets.forEach((s) => {
        const fp = path.join(tmpDir, s.name);
        fs.writeFileSync(fp, Buffer.from(s.b64, 'base64'));
        filePaths.push(fp);
      });

      const agyBin = findAgyBin();
      const fullPrompt = [
        'Read ALL of these chronological match screenshot files in parallel using read_file:',
        filePaths.map((fp, i) => `${i + 1}. ${fp}`).join('\n'),
        '',
        prompt
      ].join('\n');

      const args = [
        '-p', fullPrompt,
        '--add-dir', tmpDir,
        '--output-format', 'text',
        '--disable-slash-commands',
        '--print-timeout', '240s'
      ];
      if (model) args.push('--model', model);
      else args.push('--effort', 'medium');

      return await new Promise((resolve) => {
        let stdout = '', stderr = '';
        let child;
        try {
          child = spawn(agyBin, args, { cwd: tmpDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (err) {
          resolve({ ok: false, error: 'Antigravity CLI (agy) nicht gefunden: ' + (err && err.message || err) });
          return;
        }
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (d) => { stdout += d; });
        child.stderr.on('data', (d) => { stderr += d; });
        child.on('error', (err) => {
          resolve({ ok: false, error: 'Antigravity Startfehler: ' + (err && err.message || err) });
        });
        child.on('close', (code) => {
          let text = String(stdout || '').trim();
          text = text.replace(/^```[a-z]*\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim();
          const idx = text.indexOf('|player|');
          if (idx > 0) text = text.slice(idx).trim();
          if (code === 0 && text) resolve({ ok: true, text, ms: Date.now() - t0 });
          else resolve({ ok: false, error: (stderr || stdout || ('agy exit code ' + code)).trim().slice(0, 400), ms: Date.now() - t0 });
        });
      });
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (err) {}
    }
  });

  ipcMain.handle('matchlog-gemini', async (e, payload) => {
    const t0 = Date.now();
    try {
      const apiKey = String(payload && payload.apiKey || '').trim();
      if (!apiKey) return { ok: false, error: 'Bitte zuerst einen Gemini API Key eintragen.' };
      let model = String(payload && payload.model || 'gemini-3.8-flash').trim();
      const prompt = String(payload && payload.prompt || '');
      const sheets = (payload && payload.sheets) || [];
      if (!sheets.length) return { ok: false, error: 'Keine Keyframes gesammelt.' };

      const parts = [{ text: prompt }];
      sheets.forEach((s) => {
        parts.push({ inline_data: { mime_type: s.mimeType || 'image/jpeg', data: s.b64 } });
      });

      async function callModel(m) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: 0.1 }
          })
        });
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, json };
      }

      let resp = await callModel(model);
      if (!resp.ok && (resp.status === 503 || resp.status === 429)) {
        await new Promise((r) => setTimeout(r, 2500));
        resp = await callModel(model);
      }
      if (!resp.ok) {
        const errMsg = String(resp.json && resp.json.error && resp.json.error.message || '');
        const suggested = /models\/([a-z0-9.\-_]+)/i.exec(errMsg.replace('models/' + model, ''));
        if (suggested && suggested[1] && suggested[1] !== model) {
          model = suggested[1];
          resp = await callModel(model);
        }
      }
      if (!resp.ok) {
        const msg = (resp.json && resp.json.error && resp.json.error.message) || ('HTTP ' + resp.status);
        return { ok: false, error: msg, status: resp.status, ms: Date.now() - t0 };
      }
      const cand = resp.json && resp.json.candidates && resp.json.candidates[0];
      const textParts = (cand && cand.content && cand.content.parts) || [];
      let text = textParts.map((p) => p.text || '').join('\n').trim();
      text = text.replace(/^```[a-z]*\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim();
      const idx = text.indexOf('|player|');
      if (idx > 0) text = text.slice(idx).trim();
      return { ok: true, text, model, ms: Date.now() - t0 };
    } catch (err) {
      return { ok: false, error: String(err && err.message || err), ms: Date.now() - t0 };
    }
  });

  ipcMain.handle('matchlog-export-sheets', async (e, payload) => {
    const sheets = (payload && payload.sheets) || [];
    const prompt = String(payload && payload.prompt || '');
    if (!sheets.length) return { ok: false, error: 'Keine Keyframes gesammelt.' };
    const win = BrowserWindow.fromWebContents(e.sender) || BrowserWindow.getFocusedWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Zielordner für Kontaktbögen + Prompt wählen',
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const outDir = path.join(res.filePaths[0], 'matchlog-sheets-' + stamp);
    fs.mkdirSync(outDir, { recursive: true });
    sheets.forEach((s) => {
      fs.writeFileSync(path.join(outDir, s.name), Buffer.from(s.b64, 'base64'));
    });
    fs.writeFileSync(path.join(outDir, 'prompt.txt'), prompt, 'utf8');
    return { ok: true, dir: outDir, count: sheets.length };
  });

  app.on('before-quit', () => { if (rec) rec.stop(); });
}

module.exports = { init };
