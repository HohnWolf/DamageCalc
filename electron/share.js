// Teams teilen (js/teamshare.js): PokéPaste hochladen und laden. Läuft im Hauptprozess, weil pokepast.es keine
// CORS-Kopfzeilen schickt. Es wird nur https://pokepast.es angesprochen.
const { ipcMain } = require('electron');

const PASTE_ID = /^[0-9a-f]{8,32}$/i;
const LIMIT = 20000; // Zeichen, wie beim Meta-Test

function clip(s, n) { return String(s == null ? '' : s).slice(0, n); }

async function withTimeout(ms, fn) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); } finally { clearTimeout(timer); }
}

// { title, author, notes, paste } -> { ok, url } | { ok: false, error }
async function upload(o) {
  o = o || {};
  const paste = clip(o.paste, LIMIT + 1);
  if (!paste.trim()) return { ok: false, error: 'leer' };
  if (paste.length > LIMIT) return { ok: false, error: 'zu groß' };
  const body = new URLSearchParams({ title: clip(o.title, 100), author: clip(o.author, 60), notes: clip(o.notes, 200), paste });
  try {
    return await withTimeout(10000, async (signal) => {
      const res = await fetch('https://pokepast.es/create', {
        method: 'POST', body, redirect: 'manual', signal,
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'RattataLabs' }
      });
      let target = '';
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) target = new URL(loc, 'https://pokepast.es/').href;
      else if (res.ok && res.url && res.url !== 'https://pokepast.es/create') target = res.url;
      const m = /^https:\/\/pokepast\.es\/([0-9a-f]{8,32})\/?$/i.exec(target);
      if (!m) return { ok: false, error: 'PokéPaste antwortet mit ' + res.status };
      return { ok: true, url: 'https://pokepast.es/' + m[1] };
    });
  } catch (err) {
    return { ok: false, error: err && err.name === 'AbortError' ? 'Zeitüberschreitung' : String(err && err.message || err) };
  }
}

// id -> { ok, title, author, paste } | { ok: false, error }
async function get(id) {
  id = String(id || '');
  if (!PASTE_ID.test(id)) return { ok: false, error: 'id' };
  try {
    return await withTimeout(8000, async (signal) => {
      const res = await fetch('https://pokepast.es/' + id + '/json', { signal, headers: { accept: 'application/json', 'user-agent': 'RattataLabs' } });
      if (!res.ok) return { ok: false, error: 'PokéPaste antwortet mit ' + res.status };
      const j = await res.json();
      const paste = String(j && j.paste || '').replace(/\r\n/g, '\n');
      if (!paste || paste.length > LIMIT) return { ok: false, error: 'leer oder zu groß' };
      return { ok: true, title: clip(j.title, 100), author: clip(j.author, 60), paste };
    });
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function init() {
  ipcMain.handle('paste-upload', (e, o) => upload(o));
  ipcMain.handle('paste-get', (e, id) => get(id));
}

module.exports = { init, upload, get };
