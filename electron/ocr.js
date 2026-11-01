// Texterkennung für den Shiny-Zähler: startet beim ersten Bild electron/ocr.ps1 (Windows-OCR über PowerShell)
// und lässt es im Hintergrund laufen. Ein Bild nach dem anderen; die Seite schickt erst das nächste, wenn die Antwort da ist.
// Stirbt PowerShell, darf das Schreiben auf stdin nicht zum Absturzdialog werden ("write EOF").
const { app, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { guardChild, safeWrite } = require('./streamguard');

let proc = null, ready = null, starting = null, fatal = '', buf = '', stderr = '', ocrLang = '', retryAt = 0;
const queue = []; // { resolve, timer } in Reihenfolge der Anfragen

function alive() {
  const s = proc && proc.stdin;
  return !!(proc && s && s.writable && !s.destroyed && !s.writableEnded && proc.exitCode == null && !proc.killed);
}

function fail(msg) {
  while (queue.length) { const q = queue.shift(); clearTimeout(q.timer); q.resolve({ error: msg }); }
}

function tail(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > 400 ? s.slice(-400) : s;
}

function start() {
  if (alive()) return ready;
  if (starting) return starting;
  if (proc) { try { proc.kill(); } catch (e) { /* schon weg */ } proc = null; }
  fatal = '';
  stderr = '';
  buf = '';
  const src = path.join(__dirname, 'ocr.ps1');
  const dst = path.join(app.getPath('userData'), 'ocr.ps1');
  // mit BOM, sonst liest Windows PowerShell 5.1 die Datei als ANSI
  const code = '\uFEFF' + fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
  try { if (!fs.existsSync(dst) || fs.readFileSync(dst, 'utf8') !== code) fs.writeFileSync(dst, code, 'utf8'); } catch (e) { /* Schreibfehler zeigt der Start */ }
  const wait = Math.max(0, retryAt - Date.now());
  ready = new Promise((resolve) => {
    const begin = () => {
      proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', dst], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      guardChild(proc);
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
          try { msg = JSON.parse(line.replace(/^\uFEFF/, '')); } catch (e) { continue; }
          if (msg.ready) { ocrLang = msg.lang || ''; finish({ ok: true, lang: ocrLang }); continue; }
          if (msg.fatal) { fatal = msg.fatal; finish({ error: fatal }); continue; }
          const q = queue.shift();
          if (q) { clearTimeout(q.timer); q.resolve(msg); }
        }
      });
      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
      proc.on('error', (e) => {
        fatal = String(e.message || e);
        if (e && e.code === 'ENOENT') fatal += ' — powershell.exe wurde nicht gefunden';
        finish({ error: fatal });
      });
      proc.on('exit', (code) => {
        const why = fatal || tail(stderr);
        const msg = why || ('OCR beendet' + (code != null ? ' (Exit ' + code + ')' : ''));
        proc = null;
        buf = '';
        retryAt = Date.now() + 500;
        finish({ error: msg });
        fail(msg);
      });
      setTimeout(() => {
        finish({ error: 'OCR startet nicht (Zeitüberschreitung)' + (tail(stderr) ? ' — ' + tail(stderr) : '') });
        if (proc) { try { proc.kill(); } catch (e) { /* schon weg */ } }
      }, 20000);
    };
    if (wait) setTimeout(begin, wait);
    else begin();
  });
  starting = ready.finally(() => { starting = null; });
  return starting;
}

async function recognize(b64) {
  const r = await start();
  if (r.error || !alive()) return { error: (r && r.error) || fatal || 'OCR beendet' };
  const child = proc;
  return new Promise((resolve) => {
    const q = { resolve, timer: setTimeout(() => {
      const i = queue.indexOf(q);
      if (i >= 0) queue.splice(i, 1);
      resolve({ error: 'Zeitüberschreitung' });
      if (proc === child) { try { child.kill(); } catch (e) { /* schon weg */ } }
    }, 8000) };
    queue.push(q);
    const line = String(b64).replace(/[^A-Za-z0-9+/=]/g, '') + '\n';
    safeWrite(child.stdin, line).then((ok) => {
      if (!ok) {
        const i = queue.indexOf(q);
        if (i >= 0) queue.splice(i, 1);
        clearTimeout(q.timer);
        resolve({ error: fatal || 'Schreiben an die Texterkennung fehlgeschlagen (Pipe zu)' });
      }
    });
  }).then((msg) => { if (msg && typeof msg === 'object' && ocrLang && !msg.lang) msg.lang = ocrLang; return msg; });
}

function init() {
  ipcMain.handle('shiny-ocr', (e, b64) => recognize(b64));
  app.on('before-quit', () => {
    const child = proc;
    proc = null;
    fail('OCR beendet');
    if (!child) return;
    try { if (child.stdin && child.stdin.writable && !child.stdin.destroyed) child.stdin.end(); } catch (e) { /* Pipe schon zu */ }
    try { child.kill(); } catch (e) { /* schon weg */ }
  });
}

module.exports = { init, recognize };
