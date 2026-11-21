// Prüft im Damage Calculator (Headless-Browser), dass Terrain- und Wetter-Fähigkeiten beim Auswählen eines
// Pokémon das Feld umschalten und „Keins“ danach wirklich ohne Terrain/Wetter rechnet.
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');

function findBrowser() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return c.find(p => p && fs.existsSync(p));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const PROBE_HTML = `<!doctype html>
<meta charset="utf-8">
<body>
<pre id="out">pending</pre>
<script>
(function () {
  var fr = document.createElement('iframe');
  fr.style.cssText = 'width:1280px;height:800px;border:0;position:absolute;left:0;top:0';
  fr.src = '/index.html?smoke=1';
  document.body.appendChild(fr);
  fr.addEventListener('load', function () {
    var w = fr.contentWindow, d = w.document;
    var checks = [], errors = [];
    w.addEventListener('error', function (e) { errors.push(e.message); });
    function ok(name, cond, info) { checks.push({ name: name, ok: !!cond, info: info || '' }); }
    function fieldVal(key) {
      var b = d.querySelector('#fieldPanel .btn-group[data-key="' + key + '"] button.on');
      return b ? b.dataset.v : null;
    }
    function clickField(key, val) {
      var b = d.querySelector('#fieldPanel .btn-group[data-key="' + key + '"] button[data-v="' + val + '"]');
      if (b) b.click();
    }
    function pickSpecies(sideIdx, query) {
      var p = 'p' + (sideIdx + 1) + '_';
      var inp = d.getElementById(p + 'pick');
      inp.focus();
      inp.value = query;
      inp.dispatchEvent(new w.Event('input', { bubbles: true }));
      var item = d.querySelector('#' + p + 'pickList .picker-item');
      if (item) item.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    }
    function setMove(sideIdx, slotIdx, move) {
      var s = d.getElementById('p' + (sideIdx + 1) + '_mv' + slotIdx);
      if (!Array.prototype.some.call(s.options, function (o) { return o.value === move; })) {
        var o = d.createElement('option'); o.value = move; o.textContent = move; s.appendChild(o);
      }
      s.value = move;
      s.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    function mainDesc() {
      var el = d.getElementById('mainDesc');
      return el ? el.textContent : '';
    }
    function selectMove(sideIdx, moveIdx) {
      var b = d.getElementById('p' + (sideIdx + 1) + '_mres' + moveIdx + '_0');
      if (b) b.click();
    }

    try {
      w.CC.showView('calc');
      // Ausgangszustand: kein Terrain, kein Wetter
      clickField('terrain', 'None');
      clickField('weather', 'None');
      ok('start none', fieldVal('terrain') === 'None' && fieldVal('weather') === 'None', fieldVal('terrain') + '/' + fieldVal('weather'));

      // 1. Pokémon mit Grassy Surge auswählen -> Terrain wechselt auf Grassy
      pickSpecies(0, 'Rillaboom');
      var ab0 = d.getElementById('p1_ability');
      if (ab0.value !== 'Grassy Surge') { ab0.value = 'Grassy Surge'; ab0.dispatchEvent(new w.Event('change', { bubbles: true })); }
      ok('rillaboom sets grassy terrain', fieldVal('terrain') === 'Grassy', 'terrain=' + fieldVal('terrain'));

      setMove(0, 0, 'Wood Hammer');
      selectMove(0, 0);
      var descGrassy = mainDesc();
      ok('grassy terrain in desc', /Gras-Feld|Grassy Terrain/.test(descGrassy), descGrassy);

      // 2. Terrain auf Keins stellen -> bleibt Keins und wird NICHT im Schaden gerechnet
      clickField('terrain', 'None');
      ok('terrain none stays none', fieldVal('terrain') === 'None', 'terrain=' + fieldVal('terrain'));
      selectMove(0, 0);
      var descNoTerrain = mainDesc();
      ok('no terrain in desc when None', !/Gras-Feld|Grassy Terrain/.test(descNoTerrain), descNoTerrain);

      // 3. Tab-Wechsel darf manuell gesetztes "None" nicht wieder überschreiben
      var tabB = d.querySelector('#p1_tabs [data-slot="1"]');
      var tabA = d.querySelector('#p1_tabs [data-slot="0"]');
      if (tabB) tabB.click();
      if (tabA) tabA.click();
      ok('tab switch preserves None terrain', fieldVal('terrain') === 'None', 'terrain=' + fieldVal('terrain'));

      // 4. Pokémon mit Drizzle auswählen -> Wetter wechselt auf Rain
      pickSpecies(1, 'Pelipper');
      var ab1 = d.getElementById('p2_ability');
      if (ab1.value !== 'Drizzle') { ab1.value = 'Drizzle'; ab1.dispatchEvent(new w.Event('change', { bubbles: true })); }
      ok('pelipper sets rain', fieldVal('weather') === 'Rain', 'weather=' + fieldVal('weather'));

      setMove(1, 0, 'Hydro Pump');
      selectMove(1, 0);
      var descRain = mainDesc();
      ok('rain in desc', /Regen|Rain/.test(descRain), descRain);

      // 5. Wetter auf Keins stellen -> bleibt Keins und wird NICHT im Schaden gerechnet
      clickField('weather', 'None');
      ok('weather none stays none', fieldVal('weather') === 'None', 'weather=' + fieldVal('weather'));
      selectMove(1, 0);
      var descNoWeather = mainDesc();
      ok('no rain in desc when None', !/Regen|Rain/.test(descNoWeather), descNoWeather);

      // 6. Mega-Stein (Charizardite Y -> Drought) schaltet Wetter auf Sun
      pickSpecies(0, 'Charizard');
      var it0 = d.getElementById('p1_item');
      it0.value = 'Charizardite Y';
      it0.dispatchEvent(new w.Event('change', { bubbles: true }));
      ok('mega charizard y sets sun', fieldVal('weather') === 'Sun', 'weather=' + fieldVal('weather'));
    } catch (e) {
      errors.push(e.message);
    }
    document.getElementById('out').textContent = JSON.stringify({ checks: checks, errors: errors });
  });
})();
</script>`;

function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/__probe__.html') { rsp.writeHead(200, { 'Content-Type': 'text/html' }); return rsp.end(PROBE_HTML); }
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

(async () => {
  const exe = findBrowser();
  if (!exe) { console.log('SKIP: kein Chrome/Edge gefunden'); return; }
  const srv = await serve(), port = srv.address().port;
  const prof = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rl-autofield-'));
  const r = await new Promise(resolve => {
    cp.execFile(exe, ['--headless=new', '--disable-gpu', '--no-sandbox', '--user-data-dir=' + prof, '--virtual-time-budget=20000', '--window-size=1280,900', '--dump-dom', 'http://127.0.0.1:' + port + '/__probe__.html'],
      { maxBuffer: 64 * 1024 * 1024, timeout: 60000 }, (err, out) => {
        try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* ok */ }
        const m = /<pre id="out">([\s\S]*?)<\/pre>/.exec(out || '');
        if (!m) return resolve({ fatal: err ? String(err.message).slice(0, 200) : 'keine Ausgabe' });
        try { resolve(JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))); } catch (e) { resolve({ fatal: 'unlesbar: ' + m[1].slice(0, 120) }); }
      });
  });
  srv.close();
  if (r.fatal) { console.log('FAIL:', r.fatal); process.exit(1); }
  let bad = 0;
  (r.errors || []).forEach(e => { console.log('FAIL error:', e); bad++; });
  (r.checks || []).forEach(c => {
    console.log((c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.ok ? '' : ' (' + c.info + ')'));
    if (!c.ok) bad++;
  });
  if (bad) process.exit(1);
  console.log('Auto-Field-Test OK (' + r.checks.length + ' Prüfungen)');
})();
