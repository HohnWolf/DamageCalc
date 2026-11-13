// Oberflächen-Smoke-Test: öffnet die App in Edge/Chrome (headless) in Desktop- und Handybreite, wechselt durch die Ansichten
// und prüft auf JavaScript-Fehler, leere Ansichten und waagerechten Überlauf. Ohne Browser wird der Test übersprungen.
// Eigenen Browser angeben: CHROME_PATH=... node test/test_ui_smoke.js
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const VIEWS = ['start', 'calc', 'builder', 'soullink', 'nuz', 'dex', 'godex', 'gocounter', 'goinfo', 'speedtier', 'randomizer', 'savedit', 'mgspeed', 'mgquiz', 'mgdmg', 'mgtype', 'btlrandom', 'btlchoice'];
const WIDTHS = [1280, 412];

function findBrowser() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return c.find(p => p && fs.existsSync(p));
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}
function run(exe, url, w) {
  return new Promise(resolve => {
    const prof = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rl-smoke-'));
    cp.execFile(exe, ['--headless=new', '--disable-gpu', '--no-sandbox', '--user-data-dir=' + prof, '--virtual-time-budget=30000', '--window-size=' + w + ',900', '--dump-dom', url],
      { maxBuffer: 64 * 1024 * 1024, timeout: 90000 }, (err, out) => {
        try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* Temp-Ordner bleibt liegen, unkritisch */ }
        const m = /<pre id="out">([\s\S]*?)<\/pre>/.exec(out || '');
        if (!m) return resolve({ fatal: err ? String(err.message).slice(0, 200) : 'keine Ausgabe' });
        try { resolve(JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))); } catch (e) { resolve({ fatal: 'Ergebnis nicht lesbar: ' + m[1].slice(0, 120) }); }
      });
  });
}
(async () => {
  const exe = findBrowser();
  if (!exe) { console.log('SKIP: kein Chrome/Edge gefunden (CHROME_PATH setzen)'); return; }
  const srv = await serve(), port = srv.address().port; let bad = 0;
  for (const w of WIDTHS) {
    const r = await run(exe, 'http://127.0.0.1:' + port + '/test/ui_probe.html?w=' + w + '&views=' + VIEWS.join(','), w);
    if (r.fatal) { console.log('FAIL ' + w + 'px: ' + r.fatal); bad++; continue; }
    if (r.undo !== true) { console.log('FAIL ' + w + 'px: Strg+Z stellt nichts wieder her'); bad++; }
    r.errors.forEach(e => { console.log('FAIL ' + w + 'px Fehler: ' + e); bad++; });
    r.views.forEach(v => {
      if (v.bodyChars < 20) { console.log('FAIL ' + w + 'px ' + v.view + ': Ansicht leer'); bad++; }
      if (v.overflow.length) { console.log('FAIL ' + w + 'px ' + v.view + ': ragt rechts über den Rand: ' + v.overflow.join(', ')); bad++; }
    });
    console.log('ok ' + w + 'px: ' + r.views.length + ' Ansichten geprüft');
  }
  srv.close();
  if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
  console.log('UI-Smoke-Test OK');
})();
