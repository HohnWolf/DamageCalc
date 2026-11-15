// Klickt die echte Kampfansicht in Electron durch: Vorschau, Attacke, Ziel, Wechsel, Ende.
const fs = require('fs'), path = require('path'), cp = require('child_process');
let electron = '';
try { electron = require('electron'); } catch (e) { electron = ''; }
if (!electron || typeof electron !== 'string' || !fs.existsSync(electron)) {
  console.log('SKIP: Electron fehlt');
  process.exit(0);
}
const harness = path.join(__dirname, 'battle_click_main.js');
const r = cp.spawnSync(electron, [harness, '--shots', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], {
  encoding: 'utf8', timeout: 150000, maxBuffer: 32 * 1024 * 1024, env: Object.assign({}, process.env, { DISPLAY: process.env.DISPLAY || ':1' })
});
const out = (r.stdout || '') + (r.stderr || '');
const line = (out.split('\n').filter(function (s) { return s.indexOf('REPORT ') === 0; }).pop() || '').slice(7);
let report = null;
try { report = JSON.parse(line || fs.readFileSync('/tmp/battle-click-report.json', 'utf8')); } catch (e) { report = null; }
let bad = 0;
function fail(m) { bad++; console.log('FAIL ' + m); }
function ok(m) { console.log('ok   ' + m); }
if (r.error) fail(String(r.error.message || r.error));
if (!report) fail('kein Bericht' + (r.status ? ' Status ' + r.status : '') + ' ' + out.slice(-400));
else {
  if (!report.games || report.games.length < 3) fail('weniger als 3 Spiele');
  (report.games || []).forEach(function (g) {
    if (!g.preview) fail(g.label + ': keine Teamvorschau');
    else ok(g.label + ': Teamvorschau');
    if (!g.move) fail(g.label + ': keine Attackenwahl');
    else ok(g.label + ': Attackenwahl');
    if (!g.target) fail(g.label + ': kein Zielklick');
    else ok(g.label + ': Zielklick');
    if (g.fit && g.fit.length) fail(g.label + ': ragt aus dem Fenster ' + JSON.stringify(g.fit[0]));
    else ok(g.label + ': passt ins Fenster');
    if (g.bad) fail(g.label + ': ' + g.bad);
    if (!g.end) fail(g.label + ': kein Ende');
    else ok(g.label + ': Ende, Runde ' + g.turn + (g.switch ? ', Wechsel' : '') + (g.pivot ? ', Pivot' : ''));
  });
  const sel = report.selection || {};
  const lobby = sel.lobby || {};
  const after = lobby.after || {};
  if (!after.pressed || after.pressed.join(' ').indexOf('L0') !== 0) fail('Bot-Stufe L0 ist nicht als gewählt markiert: ' + JSON.stringify(after));
  else ok('Bot-Stufe L0 ist markiert');
  if (!sel.preview || sel.preview.chosen < 2) fail('Vorschau markiert die Auswahl nicht: ' + JSON.stringify(sel.preview));
  else ok('Vorschau markiert ' + sel.preview.chosen + ' Pokémon, Zähler ' + sel.preview.count);
  if (!sel.preview.bringOff) fail('Mitnehmen ist schon vor 4 Pokémon an');
  else ok('Mitnehmen bleibt aus, bis vier gewählt sind');
  if (!sel.preview.foes || sel.preview.foes < 6) fail('Gegnerische Vorschau zeigt ' + (sel.preview && sel.preview.foes));
  else ok('Gegner zeigt 6 Pokémon in der Vorschau');
  if (sel.preview.cut && sel.preview.cut.length) fail('Bälle ragen aus dem Kopf: ' + sel.preview.cut.join(','));
  else ok('Beide Ballreihen bleiben im Kopf');
  if (!sel.preview.full || !sel.preview.full.bringOn || sel.preview.full.count !== '4/4 gewählt') fail('Mitnehmen wird nicht frei: ' + JSON.stringify(sel.preview.full));
  else ok('Mitnehmen ist nach 4/4 an');
  const switched = (report.games || []).some(function (g) { return g.switch; });
  if (!switched) fail('kein erzwungener oder Pivot-Wechsel in den drei Spielen');
  else ok('Wechsel kam in der Ansicht vor');
  (report.errors || []).forEach(function (e) { fail(e); });
}
if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Kampf-Klicks OK');
