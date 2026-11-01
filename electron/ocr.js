// Texterkennung für den Shiny-Zähler und das Kampfprotokoll: startet beim ersten Bild electron/ocr.ps1 (Windows-OCR über PowerShell)
// und lässt es im Hintergrund laufen. Ein Bild nach dem anderen; die Seite schickt erst das nächste, wenn die Antwort da ist.
const { app, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let proc = null, ready = null, fatal = '', buf = '', ocrLang = '';
const queue = []; // { resolve, timer } in Reihenfolge der Anfragen

function fail(msg) {
  while (queue.length) { const q = queue.shift(); clearTimeout(q.timer); q.resolve({ error: msg }); }
}

function start() {
  if (proc) return ready;
  fatal = '';
  // die .ps1 liegt im app.asar, das PowerShell nicht lesen kann: nach userData kopieren
  const src = path.join(__dirname, 'ocr.ps1');
  const dst = path.join(app.getPath('userData'), 'ocr.ps1');
  // mit BOM, sonst liest Windows PowerShell 5.1 die Datei als ANSI
  const code = '﻿' + fs.readFileSync(src, 'utf8').replace(/^﻿/, '');
  try { if (!fs.existsSync(dst) || fs.readFileSync(dst, 'utf8') !== code) fs.writeFileSync(dst, code, 'utf8'); } catch (e) { /* Schreibfehler zeigt der Start */ }
  proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', dst], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  ready = new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line.replace(/^﻿/, '')); } catch (e) { continue; }
        if (msg.ready) { ocrLang = msg.lang || ''; finish({ ok: true, lang: ocrLang }); continue; }
        if (msg.fatal) { fatal = msg.fatal; finish({ error: fatal }); continue; }
        const q = queue.shift();
        if (q) { clearTimeout(q.timer); q.resolve(msg); }
      }
    });
    proc.on('error', (e) => { fatal = String(e.message || e); finish({ error: fatal }); });
    proc.on('exit', () => { proc = null; buf = ''; finish({ error: fatal || 'OCR beendet' }); fail(fatal || 'OCR beendet'); });
    setTimeout(() => finish({ error: 'OCR startet nicht (Zeitüberschreitung)' }), 20000);
  });
  return ready;
}

async function recognize(b64) {
  const r = await start();
  if (r.error) { if (proc) proc.kill(); return { error: r.error }; }
  if (!proc) return { error: fatal || 'OCR beendet' };
  return new Promise((resolve) => {
    const q = { resolve, timer: setTimeout(() => { const i = queue.indexOf(q); if (i >= 0) queue.splice(i, 1); resolve({ error: 'Zeitüberschreitung' }); if (proc) proc.kill(); }, 8000) };
    queue.push(q);
    proc.stdin.write(String(b64).replace(/[^A-Za-z0-9+/=]/g, '') + '\n');
  }).then((msg) => { if (msg && typeof msg === 'object' && ocrLang && !msg.lang) msg.lang = ocrLang; return msg; });
}

function init() {
  ipcMain.handle('shiny-ocr', (e, b64) => recognize(b64));
  app.on('before-quit', () => { if (proc) { try { proc.stdin.end(); proc.kill(); } catch (e) { /* schon beendet */ } } });
}

module.exports = { init, recognize };
