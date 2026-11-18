// Electron-Hauptprozess für test/test_builder_features.js: lädt index.html in einem versteckten Fenster,
// prüft Teambuilder (Versions-Dropdown, Vergleich, Regel-Check), QR-Code hin und zurück, Tastenkürzel und Einstellungen
// und schreibt das Ergebnis als "REPORT {json}".
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os');

app.setPath('userData', path.join(os.tmpdir(), 'rl-builder-features-' + process.pid));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1400, height: 900, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  let report = { errors: [] };
  win.webContents.on('console-message', (e, level, msg) => { if (level >= 3 && !/Failed to load resource|ERR_|net::/.test(msg)) report.errors.push('console: ' + msg); });
  try {
    await win.loadFile(path.join(__dirname, '..', 'index.html'), { hash: 'builder' });
    report = Object.assign(report, await win.webContents.executeJavaScript(`(async function () {
      var out = { checks: [] };
      function check(name, ok, info) { out.checks.push({ name: name, ok: !!ok, info: info == null ? '' : String(info) }); }
      var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      await wait(300);
      var A = window.CC, B = window.CCBuilder, S = window.RLTeamShare, H = window.RLHotkeys;
      check('Module geladen', A && B && S && H && window.jsQR && window.qrcode);
      var text = ['Incineroar @ Sitrus Berry\\nAbility: Intimidate\\nLevel: 50\\nSPs: 32 HP / 2 Atk / 32 SpD\\nCareful Nature\\n- Fake Out\\n- Flare Blitz\\n- Parting Shot\\n- Knock Off',
        'Garchomp @ Sitrus Berry\\nAbility: Rough Skin\\nLevel: 50\\nSPs: 2 HP / 32 Atk / 32 Spe\\nJolly Nature\\n- Earthquake\\n- Dragon Claw\\n- Rock Slide\\n- Hydro Pump',
        'Incineroar @ Leftovers\\nAbility: Intimidate\\nLevel: 50\\nSPs: 32 HP / 34 Def\\nCareful Nature\\n- Fake Out\\n- Fake Out'].join('\\n\\n');

      // QR: kodieren, zeichnen, als Bild lesen, dekodieren
      var enc = await S.encode({ name: 'QR-Test Ä✨', ver: 'v3 · Turnier', text: text });
      var cv = document.createElement('canvas'); S.draw(cv, enc, 400);
      var blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); });
      var read = await S.readImage(blob);
      var dec = read ? await S.decode(read) : null;
      check('QR hin und zurück', dec && dec.name === 'QR-Test Ä✨' && dec.ver === 'v3 · Turnier' && dec.text === text, read ? read.slice(0, 30) : 'nichts gelesen');

      // Import mit Teamname
      var before = JSON.parse(localStorage.getItem('cc_builder')).teams.length;
      var okImp = B.importShared(dec);
      var st = JSON.parse(localStorage.getItem('cc_builder'));
      var tm = st.teams[st.teams.length - 1];
      check('Import legt Team mit Namen an', okImp && st.teams.length === before + 1 && tm.name === 'QR-Test Ä✨' && tm.versions[0].name === 'v3 · Turnier' && tm.versions[0].mons.length === 3, tm && tm.name);

      // Regel-Check
      var iss = B.legalIssues(tm.versions[0].mons).filter(function (x) { return x.sev === 'err'; }).map(function (x) { return x.text; });
      var all = iss.join(' | ');
      check('Species-Klausel', /Species/.test(all), all);
      check('Item-Klausel', /Item-Klausel|Item clause/.test(all), all);
      check('Lernset', /nicht lernen|cannot learn/.test(all), all);
      check('doppelte Attacke', /doppelt|twice/.test(all), all);
      var big = JSON.parse(JSON.stringify(tm.versions[0].mons)); big[1].set.sps = { hp: 40, at: 32, df: 0, sa: 0, sd: 0, sp: 0 };
      var allBig = B.legalIssues(big).map(function (x) { return x.text; }).join(' | ');
      check('SP über 32 / 66', /höchstens 32|32 at most/.test(allBig) && /höchstens 66|66 at most/.test(allBig), allBig);

      // Vergleich
      var a = tm.versions[0].mons, b = JSON.parse(JSON.stringify(a));
      b[1].set.item = 'Choice Scarf'; b[1].set.moves[3] = 'Protect'; b.splice(2, 1);
      var pairs = B.pairMons(a, b);
      var d = B.diffFields(pairs[1].a, pairs[1].b);
      check('Vergleich: Item und Attacke', d.changed && d.rows.some(function (r) { return r.k === 'item' && r.chg; }) && d.moves.some(function (m) { return m.st === 'add' && m.mv === 'Protect'; }) && d.moves.some(function (m) { return m.st === 'del'; }));
      check('Vergleich: entferntes Pokémon', pairs.some(function (p) { return p.a && !p.b; }));

      // Oberfläche: Dropdown, neue Version, Ansichten
      A.showView('builder'); await wait(100);
      var root = document.getElementById('builderView');
      check('Versions-Dropdown', root.querySelector('#tbVerSel') && root.querySelector('#tbVerSel').options.length === 1);
      root.querySelector('#tbVerAdd').click(); await wait(50);
      check('Neue Version im Dropdown', root.querySelector('#tbVerSel').options.length === 2);
      check('Typ-Abdeckung neben Versionsauswahl', root.querySelector('#tbVerBar .tb-view-btn[data-view="cover"]') && !root.querySelector('.tb-tabs [data-tab="cover"]'));
      root.querySelector('.tb-view-btn[data-view="diff"]').click(); await wait(50);
      check('Vergleich-Ansicht offen', root.querySelector('#tbWork').classList.contains('tab-diff') && root.querySelector('.tb-diff-head'));
      root.querySelector('.tb-view-btn[data-view="cover"]').click(); await wait(50);
      var jumps = root.querySelectorAll('.tb-cover-table .tb-jump');
      jumps[2].click(); await wait(50);
      check('Klick in Typ-Abdeckung öffnet Pokémon', root.querySelector('#tbWork').classList.contains('tab-edit') && root.querySelectorAll('.tb-slot')[2].classList.contains('on'));
      root.querySelector('.tb-view-btn[data-view="diff"]').click(); await wait(50);
      root.querySelectorAll('.tb-slot')[0].click(); await wait(50);
      check('Klick auf Karte oben verlässt die Ansicht', root.querySelector('#tbWork').classList.contains('tab-edit'));
      root.querySelector('.tb-view-btn[data-view="diff"]').click(); await wait(50);
      check('Regel-Knopf zeigt Fehler', /⛔/.test(root.querySelector('#tbLegalBtn').textContent), root.querySelector('#tbLegalBtn').textContent);

      // Tastenkürzel: Alt+L öffnet den Regel-Check, eigene Belegung wirkt
      check('Standard Alt+L', H.get('builder.legal') === 'Alt+L');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', code: 'KeyL', altKey: true, bubbles: true, cancelable: true }));
      await wait(30);
      check('Alt+L schaltet Regel-Check', root.querySelector('#tbWork').classList.contains('tab-legal') && root.querySelectorAll('.tb-legal-mon').length >= 3);
      H.set('builder.cover', 'Ctrl+Shift+K');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
      await wait(30);
      check('eigene Belegung wirkt', root.querySelector('#tbWork').classList.contains('tab-cover'));
      var clash = H.set('builder.diff', 'Ctrl+Shift+K');
      check('Konflikt macht die andere Aktion frei', clash && clash.id === 'builder.cover' && H.get('builder.cover') === '');
      H.reset();
      check('Zurücksetzen', H.get('builder.cover') === 'Alt+T' && H.get('builder.diff') === 'Alt+D');
      check('Plus/Minus im Shiny-Zähler', H.get('shiny.inc') === 'Plus' && H.fromEvent(new KeyboardEvent('keydown', { key: '+', shiftKey: true })) === 'Plus');

      // alle Versionen: QR-Code und PokéPaste-Text mit "=== … ===" tragen jede Version
      var parts = text.split('\\n\\n');
      var allV = [{ name: 'v1', text: parts[0] }, { name: 'v2 · Turnier', text: parts.slice(0, 2).join('\\n\\n') }, { name: 'v3', text: parts[1] }];
      var encAll = await S.encode({ name: 'Mehrere', ver: 'v2 · Turnier', text: allV[1].text, versions: allV });
      var cvA = document.createElement('canvas'); S.draw(cvA, encAll, 500);
      var decAll = await S.decode(await S.readImage(await new Promise(function (r) { cvA.toBlob(r, 'image/png'); })));
      check('QR mit allen Versionen', decAll && decAll.versions && decAll.versions.length === 3 && decAll.versions[1].name === 'v2 · Turnier' && decAll.text === allV[1].text);
      B.importShared(decAll);
      var stA = JSON.parse(localStorage.getItem('cc_builder')), tA = stA.teams[stA.teams.length - 1];
      check('Import legt alle Versionen an', tA.name === 'Mehrere' && tA.versions.length === 3 && tA.versions.filter(function (v) { return v.id === tA.curVer; })[0].name === 'v2 · Turnier', tA.versions.map(function (v) { return v.name; }).join(','));
      var joined = S.joinVersions('Paste-Team', allV), sp = S.splitVersions(joined);
      check('PokéPaste-Text mit Versionen', sp && sp.length === 3 && sp[1].name === 'v2 · Turnier' && sp[0].title === 'Paste-Team' && sp[2].text === allV[2].text);
      B.importShared({ name: '', text: joined });
      stA = JSON.parse(localStorage.getItem('cc_builder')); tA = stA.teams[stA.teams.length - 1];
      check('Import aus PokéPaste mit Versionen', tA.name === 'Paste-Team' && tA.versions.length === 3);
      A.showView('builder'); await wait(80);
      document.getElementById('tbShare').click(); await wait(300);
      var vs = document.querySelector('.rl-share-versel');
      check('Teilen: Auswahl Version oder alle', vs && vs.options.length === 4 && vs.options[3].value === 'all' && vs.value === '2');
      vs.value = 'all'; vs.dispatchEvent(new Event('change')); await wait(400);
      check('Teilen: alle Versionen im QR', /alle 3 Versionen|all 3 versions/.test(document.querySelector('.rl-share-qr .hint').textContent), document.querySelector('.rl-share-qr .hint').textContent);
      document.querySelector('.rl-share-wrap .icon-btn').click();

      // Einstellungen: Schriftgröße, Schriftart, Animationen, Sprite-Stil im Calc
      A.openSettings(); await wait(50);
      var nav = document.querySelector('.set-nav-btn[data-sec="look"]'); if (nav) nav.click(); await wait(30);
      var b120 = Array.prototype.filter.call(document.querySelectorAll('.set-seg button'), function (x) { return x.dataset.v === '120'; })[0];
      if (b120) b120.click(); await wait(30);
      check('Schriftgröße 120 %', document.documentElement.style.getPropertyValue('--fs') === '1.2', document.documentElement.style.getPropertyValue('--fs'));
      // getComputedStyle rechnet den Zoom der Oberfläche (body.style.zoom) mit ein: darum Verhältnisse statt fester Werte
      function textHeight() { var s = document.createElement('span'); s.textContent = 'Xg'; s.style.position = 'absolute'; document.body.appendChild(s); var h = s.getBoundingClientRect().height; s.remove(); return h; }
      function hintSize() { var s = document.createElement('span'); s.className = 'hint'; document.body.appendChild(s); var v = parseFloat(getComputedStyle(s).fontSize); s.remove(); return v; }
      document.documentElement.setAttribute('data-motion', 'off'); await wait(400); // Übergänge würden die Messung verzögern
      var h12 = textHeight(), k12 = hintSize();
      document.documentElement.style.removeProperty('--fs'); await wait(50);
      var h10 = textHeight(), k10 = hintSize();
      document.documentElement.style.setProperty('--fs', '1.2');
      check('Schrift wird größer', h12 / h10 > 1.12 && Math.abs(k12 / k10 - 1.2) < 0.02, [h10, h12, k10, k12].join(' / '));
      var offB = Array.prototype.filter.call(document.querySelectorAll('.set-seg button'), function (x) { return x.dataset.v === 'off'; })[0];
      if (offB) offB.click(); await wait(30);
      check('Animationen aus', document.documentElement.getAttribute('data-motion') === 'off');
      var keysNav = document.querySelector('.set-nav-btn[data-sec="keys"]'); if (keysNav) keysNav.click(); await wait(30);
      check('Seite Tastenkürzel', document.querySelectorAll('.set-hk-row').length > 10, document.querySelectorAll('.set-hk-row').length);
      document.querySelector('.set-close-btn').click();
      A.setSetting('fontSize', 100); A.setSetting('motion', 'on');
      A.setSetting('spriteCalc', 'home');
      A.showView('calc'); await wait(100);
      window.CCApp.redrawSprites(); await wait(50);
      check('Calc nutzt HOME-Bilder', !!document.querySelector('#calcView img.spr-home, .slot-sprite img.spr-home, .team-slot img.spr-home'));
      A.setSetting('spriteCalc', 'pixel');
      return out;
    })()`));
  } catch (err) {
    report.errors.push(String(err && err.stack || err));
  }
  process.stdout.write('REPORT ' + JSON.stringify(report) + '\n');
  app.exit(0);
});
