// Desktop-Teil der Match-Overlays (Hauptprozess), Steuerung in js/overlay.js:
// - Team-Overlay (mein Team / Gegner als Spalte, je 320 × 1080): /match/team?side=me|opp
// - Teampreview (beide Teams, Bank, Closed Team Sheet, 1920 × 1080): /match/preview
// - Matchup-Banner (1920 × 200): /match/matchup, Startseite „Wer gegen wen“ (1920 × 1080): /match/start
// Die Seiten laufen auf dem lokalen OBS-Server des Shiny-Zählers (nur 127.0.0.1) und lesen /match/state.
// Die App schickt den fertig aufbereiteten Stand (Namen in der Overlay-Sprache, Typen, Bild-Adressen);
// hier kommen nur Bilder (zwischengespeichert, damit OBS auch offline und ohne Flackern lädt) und Teamlogos dazu.
const { app, ipcMain, nativeImage, net, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PAGES = { '/match/team': 'team.html', '/match/preview': 'preview.html', '/match/matchup': 'matchup.html', '/match/start': 'start.html' };
const IMG_HOSTS = { 'raw.githubusercontent.com': 1, 'cdn.jsdelivr.net': 1, 'play.pokemonshowdown.com': 1, 'www.pokewiki.de': 1 };
const LOGO_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const LOGO_MAX = 5 * 1024 * 1024;
const PW_BASE = 'https://www.pokewiki.de/images/';
const SPR_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const JSD_SPR = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/';
const SD_SHEET = 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png';

const BOOT = String(Date.now()); // ändert sich bei jedem Start: offene Overlays in OBS laden sich dann neu
let state = {};
let play = 0; // jeder Knopfdruck „Start-Screen abspielen“ zählt hoch
let logos = { L: '', R: '' };

function dataDir() { return path.join(app.getPath('userData'), 'MatchOverlay'); }
function cacheDir() { return path.join(dataDir(), 'cache'); }
function logoDir() { return path.join(dataDir(), 'logos'); }
function norm(s) { return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

let pwMap = null; // PokéWiki: deutscher Item-Name (normalisiert) -> Bildpfad der Champions-Symbole
function pokewikiMap() {
  if (!pwMap) { try { pwMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'match', 'pokewiki_items.json'), 'utf8')); } catch (e) { pwMap = {}; } }
  return pwMap;
}

// ---------------- Bilder: einmal laden, auf der Platte behalten ----------------
const inflight = new Map();
const missing = new Map(); // Adresse -> Zeitpunkt des 404 (10 min nicht erneut versuchen)
async function download(url) {
  if (Date.now() - (missing.get(url) || 0) < 600000) return null;
  try {
    const r = await net.fetch(url, { headers: { 'User-Agent': 'RattataLab-MatchOverlay' } });
    if (r.status === 404) { missing.set(url, Date.now()); return null; }
    if (!r.ok) return null;
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\//.test(type)) return null;
    return { body: Buffer.from(await r.arrayBuffer()), type };
  } catch (e) { return null; }
}
// key: Dateiname im Cache, sources: Adressen oder Funktionen (eigene Quelle), der erste Treffer zählt
function cached(key, sources) {
  const file = path.join(cacheDir(), key), meta = file + '.type';
  if (fs.existsSync(file)) {
    let type = 'image/png';
    try { type = fs.readFileSync(meta, 'utf8') || type; } catch (e) { /* png */ }
    return Promise.resolve({ body: fs.readFileSync(file), type });
  }
  if (inflight.has(key)) return inflight.get(key); // Overlay und Vorschau fragen oft gleichzeitig
  const p = (async () => {
    for (const s of sources) {
      const got = typeof s === 'function' ? await s() : await download(s);
      if (got && got.body && got.body.length) {
        try {
          fs.mkdirSync(cacheDir(), { recursive: true });
          fs.writeFileSync(file + '.tmp', got.body);
          fs.renameSync(file + '.tmp', file);
          fs.writeFileSync(meta, got.type);
        } catch (e) { /* Cache nicht schreibbar: Bild trotzdem ausliefern */ }
        return got;
      }
    }
    return null;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
function hashKey(s) { return crypto.createHash('sha1').update(s).digest('hex'); }

// Item-Symbole: zuerst die Champions-Symbole vom PokéWiki, dann PokéAPI, zuletzt ein Feld aus dem Showdown-Sheet
let sheet = null;
async function showdownCell(n) {
  if (!(n >= 0)) return null;
  if (!sheet) {
    const got = await cached('itemicons-sheet.png', [SD_SHEET]);
    if (!got) return null;
    sheet = nativeImage.createFromBuffer(got.body);
  }
  const sz = sheet.getSize(), x = (n % 16) * 24, y = Math.floor(n / 16) * 24;
  if (sheet.isEmpty() || x + 24 > sz.width || y + 24 > sz.height) return null;
  const cell = sheet.crop({ x, y, width: 24, height: 24 });
  const bmp = cell.toBitmap();
  let any = false;
  for (let i = 3; i < bmp.length; i += 4) if (bmp[i]) { any = true; break; }
  if (!any) return null; // leeres Feld
  return { body: cell.resize({ width: 48, height: 48, quality: 'best' }).toPNG(), type: 'image/png' };
}
function itemSources(en, de, n) {
  const out = [];
  if (de) {
    let p = pokewikiMap()[norm(de)];
    if (!p) { // Pfad so, wie MediaWiki ihn aus dem Dateinamen berechnet
      const fn = 'Itemsprite_' + de.replace(/ /g, '_') + '_CMP.png';
      const h = crypto.createHash('md5').update(fn, 'utf8').digest('hex');
      p = h[0] + '/' + h.slice(0, 2) + '/' + fn;
    }
    const i = p.lastIndexOf('/'), d = p.slice(0, i), q = encodeURIComponent(p.slice(i + 1));
    out.push(PW_BASE + d + '/' + q);
  }
  const ident = String(en || '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (ident) out.push(SPR_BASE + 'items/' + ident + '.png');
  out.push(() => showdownCell(n));
  if (ident) out.push(JSD_SPR + 'items/' + ident + '.png');
  return out;
}

// ---------------- Teamlogos ----------------
function logoFile(side) {
  try {
    const f = fs.readdirSync(logoDir()).find((x) => x.slice(0, 2) === side + '.' && LOGO_EXT[path.extname(x).toLowerCase()]);
    return f ? path.join(logoDir(), f) : null;
  } catch (e) { return null; }
}
function logoClear(side) {
  try { fs.readdirSync(logoDir()).forEach((x) => { if (x.slice(0, 2) === side + '.') fs.unlinkSync(path.join(logoDir(), x)); }); } catch (e) { /* kein Ordner */ }
}
function saveLogos() { try { fs.mkdirSync(logoDir(), { recursive: true }); fs.writeFileSync(path.join(logoDir(), 'logos.json'), JSON.stringify(logos)); } catch (e) { /* */ } }
function loadLogos() {
  try { logos = Object.assign({ L: '', R: '' }, JSON.parse(fs.readFileSync(path.join(logoDir(), 'logos.json'), 'utf8'))); } catch (e) { /* noch keine */ }
  ['L', 'R'].forEach((k) => { if (!logoFile(k)) logos[k] = ''; });
}
function setLogo(side, name, bytes) {
  if (side !== 'L' && side !== 'R') return { error: 'side' };
  let ext = path.extname(String(name || '')).toLowerCase();
  if (!LOGO_EXT[ext]) return { error: 'type' };
  let data = Buffer.from(bytes || []);
  if (!data.length) return { error: 'empty' };
  if (data.length > LOGO_MAX) return { error: 'size' };
  // große Bilder auf doppelte Anzeigegröße verkleinern (schärfer als die Skalierung in OBS)
  if (ext !== '.svg' && ext !== '.gif') {
    const im = nativeImage.createFromBuffer(data);
    if (!im.isEmpty()) {
      const s = im.getSize();
      if (s.width > 720 || s.height > 400) {
        const k = Math.min(720 / s.width, 400 / s.height);
        data = im.resize({ width: Math.round(s.width * k), height: Math.round(s.height * k), quality: 'best' }).toPNG();
        ext = '.png';
      }
    }
  }
  fs.mkdirSync(logoDir(), { recursive: true });
  logoClear(side);
  fs.writeFileSync(path.join(logoDir(), side + ext), data);
  logos[side] = String(Date.now());
  saveLogos();
  return { ok: true, v: logos[side] };
}
function swapLogos() {
  const a = logoFile('L'), b = logoFile('R');
  const da = a ? [path.extname(a), fs.readFileSync(a)] : null, db = b ? [path.extname(b), fs.readFileSync(b)] : null;
  logoClear('L'); logoClear('R');
  fs.mkdirSync(logoDir(), { recursive: true });
  if (db) fs.writeFileSync(path.join(logoDir(), 'L' + db[0]), db[1]);
  if (da) fs.writeFileSync(path.join(logoDir(), 'R' + da[0]), da[1]);
  logos = { L: logos.R, R: logos.L };
  saveLogos();
  return logos;
}

// ---------------- Server-Routen (im OBS-Server von electron/shiny.js) ----------------
function send(res, code, type, body, cache) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': cache || 'no-store' });
  res.end(body);
}
function sendImg(res, got) {
  if (!got) { send(res, 404, 'text/plain', ''); return; }
  send(res, 200, got.type, got.body, 'public, max-age=604800');
}
function handle(req, res, url) {
  const p = url.pathname;
  if (p.indexOf('/match/') !== 0) return false;
  if (PAGES[p]) {
    fs.readFile(path.join(__dirname, 'match', PAGES[p]), 'utf8', (err, html) => {
      if (err) send(res, 500, 'text/plain', 'missing'); else send(res, 200, 'text/html; charset=utf-8', html);
    });
  } else if (p === '/match/state') {
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify(Object.assign({}, state, { v: BOOT, play, logoL: logos.L, logoR: logos.R })));
  } else if (/^\/match\/types\/[a-z]+\.png$/.test(p)) {
    fs.readFile(path.join(__dirname, 'match', 'types', path.basename(p)), (err, b) => {
      if (err) send(res, 404, 'text/plain', ''); else send(res, 200, 'image/png', b, 'public, max-age=604800');
    });
  } else if (p === '/match/img') {
    const u = url.searchParams.get('u') || '';
    let host = '';
    try { const x = new URL(u); host = x.protocol === 'https:' ? x.host : ''; } catch (e) { host = ''; }
    if (!IMG_HOSTS[host]) { send(res, 404, 'text/plain', ''); return true; }
    cached(hashKey(u), [u]).then((got) => sendImg(res, got), () => sendImg(res, null));
  } else if (p === '/match/item') {
    const en = url.searchParams.get('en') || '', de = url.searchParams.get('de') || '', n = url.searchParams.get('n');
    const key = 'item_' + (norm(en) || norm(de) || 'x') + '.png';
    cached(key, itemSources(en, de, n === null || n === '' ? -1 : +n)).then((got) => sendImg(res, got), () => sendImg(res, null));
  } else if (/^\/match\/logo\/[LR]$/.test(p)) {
    const f = logoFile(p.slice(-1));
    if (!f) { send(res, 404, 'text/plain', ''); return true; }
    fs.readFile(f, (err, b) => { if (err) send(res, 404, 'text/plain', ''); else send(res, 200, LOGO_EXT[path.extname(f).toLowerCase()], b, 'no-cache'); });
  } else send(res, 404, 'text/plain', '');
  return true;
}

// ---------------- Bild-Export (PNG mit durchsichtigem Hintergrund) ----------------
// Die Seite wird in einem unsichtbaren Fenster mit durchsichtigem Hintergrund genau so gezeichnet wie in OBS und als PNG gespeichert.
const EXPORTS = {
  matchup: { path: '/match/matchup', w: 1920, h: 200, label: 'Matchup-Banner' },
  preview: { path: '/match/preview', w: 1920, h: 1080, label: 'Teampreview' }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function renderPng(kind, base) {
  const spec = EXPORTS[kind];
  if (!spec || !base) throw new Error('export');
  const win = new BrowserWindow({
    show: false, width: spec.w, height: spec.h, useContentSize: true, frame: false, transparent: true,
    backgroundColor: '#00000000', skipTaskbar: true, focusable: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  try {
    let frame = null;
    win.webContents.setFrameRate(15);
    win.webContents.on('paint', (e, dirty, image) => { frame = image; });
    await win.loadURL(base + spec.path + '?export=1');
    // warten, bis der Stand geladen ist und alle Bilder da sind (zwei Prüfungen hintereinander, falls Bilder noch zugeschnitten werden)
    let stable = 0;
    const t0 = Date.now();
    while (stable < 2 && Date.now() - t0 < 20000) {
      const ready = await win.webContents.executeJavaScript(
        '(async()=>{try{await document.fonts.ready}catch(e){}return window.__ready===true&&Array.from(document.images).every(i=>i.complete)})()', true);
      stable = ready ? stable + 1 : 0;
      await sleep(ready ? 400 : 250);
    }
    if (stable < 2) throw new Error('timeout');
    await sleep(300);
    frame = null;
    for (let i = 0; i < 40 && !frame; i++) await sleep(50); // frischer Frame nach dem letzten Zeichnen
    let img = frame || (await win.webContents.capturePage());
    const sz = img.getSize();
    if (sz.width !== spec.w || sz.height !== spec.h) img = img.resize({ width: spec.w, height: spec.h, quality: 'best' }); // Bildschirm-Skalierung ausgleichen
    return img.toPNG();
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
function fileSafe(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); }

function init(shiny) {
  loadLogos();
  shiny.addRoute(handle);
  ipcMain.on('match-state', (e, s) => { if (s && typeof s === 'object') state = s; });
  ipcMain.on('match-play', () => { play++; });
  ipcMain.handle('match-export', async (e, kind) => {
    const spec = EXPORTS[kind];
    const port = shiny.port();
    if (!spec || !port) return { error: 'off' };
    try {
      const png = await renderPng(kind, 'http://127.0.0.1:' + port);
      const m = state.match || {}, p = state.preview || {};
      const a = fileSafe(kind === 'matchup' ? (m.nameL || p.p1) : p.p1), b = fileSafe(kind === 'matchup' ? (m.nameR || p.p2) : p.p2);
      const name = spec.label + (a || b ? ' ' + (a || '?') + ' vs ' + (b || '?') : '') + '.png';
      const owner = BrowserWindow.fromWebContents(e.sender);
      const r = await dialog.showSaveDialog(owner, { title: spec.label, defaultPath: path.join(app.getPath('pictures'), name), filters: [{ name: 'PNG', extensions: ['png'] }] });
      if (r.canceled || !r.filePath) return { canceled: true };
      fs.writeFileSync(r.filePath, png);
      return { ok: true, file: r.filePath };
    } catch (err) { return { error: String((err && err.message) || err) }; }
  });
  ipcMain.handle('match-info', () => {
    const port = shiny.port();
    return { port, base: port ? 'http://127.0.0.1:' + port : '', logoL: logos.L, logoR: logos.R };
  });
  ipcMain.handle('match-logo-set', (e, side, name, bytes) => {
    try { return setLogo(side, name, bytes); } catch (err) { return { error: String(err && err.message || err) }; }
  });
  ipcMain.handle('match-logo-del', (e, side) => {
    if (side !== 'L' && side !== 'R') return { error: 'side' };
    logoClear(side); logos[side] = ''; saveLogos();
    return { ok: true };
  });
  ipcMain.handle('match-logo-swap', () => { try { return swapLogos(); } catch (err) { return logos; } });
}

module.exports = { init, renderPng, handle };
