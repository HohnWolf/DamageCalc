// Lokale Kämpfe: ein komplettes Skriptspiel je Modus, ohne ungültige Wahl.
const fs = require('fs'), path = require('path'), vm = require('vm');
const engine = require('../js/meta/engine');
const random = require('../js/battle/random');
const session = require('../js/battle/session');
const fmt = require('../js/meta/format');
let bad = 0;
const ok = (m) => console.log('ok   ' + m);
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => (a === b ? ok(m) : fail(m + ' (ist ' + a + ', soll ' + b + ')'));

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data/meta_teams.js'), 'utf8'), ctx);
const pool = ctx.window.RL_META_TEAMS.teams.filter(function (t) { return t && t.paste; });

['js/battle/session.js', 'js/battle/random.js', 'js/battle_ui.js', 'electron/battle_host.js', 'electron/battle_worker.js'].forEach(function (rel) {
  const t = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  if (/sim\.pokemonshowdown\.com|play\.pokemonshowdown\.com|replay\.pokemonshowdown\.com|wss?:\/\//.test(t)) fail(rel + ' enthält eine Showdown-Verbindung');
});
ok('kein Showdown-Server im Kampf');

const pair = random.pickPair(pool, '42');
if (!pair || pair.a.id === pair.b.id) fail('Zufallspaar ist nicht zwei verschiedene Teams');
else ok('Zufallskampf nimmt zwei verschiedene legale Teams');
eq(engine.validatePaste(pair.a.paste).ok, true, 'Zufallsteam A ist legal');
eq(engine.validatePaste(pair.b.paste).ok, true, 'Zufallsteam B ist legal');
eq(random.pickPair(pool, '42').a.id + ':' + random.pickPair(pool, '42').b.id, pair.a.id + ':' + pair.b.id, 'gleicher Seed, gleiches Paar');

function play(label, pasteA, pasteB) {
  const a = engine.validatePaste(pasteA);
  const b = engine.validatePaste(pasteB);
  if (!a.ok || !b.ok) { fail(label + ': Team illegal'); return; }
  const game = session.create({
    packedA: a.packed, packedB: b.packed, level: 2, seed: '8,8,8,8',
    nameA: 'Du', nameB: 'KI'
  });
  let guard = 0, preview = false, moves = false;
  while (!game.view().ended && guard++ < 250) {
    const before = game.view();
    if (before.request.kind === 'preview') preview = true;
    if (before.request.kind === 'move') moves = true;
    const step = game.stepScripted();
    if (!step.ok) { fail(label + ': ungültige Wahl: ' + step.error); return; }
  }
  const end = game.view();
  if (!end.ended) { fail(label + ': Kampf endet nicht'); return; }
  if (end.invalid) { fail(label + ': ' + end.invalid + ' ungültige Wahl(en)'); return; }
  if (end.winner !== 'Du' && end.winner !== 'KI') { fail(label + ': kein Sieger ' + end.winner); return; }
  if (!preview || !moves) fail(label + ': Teamvorschau oder Attacken fehlen');
  else ok(label + ': ' + end.winner + ' nach Runde ' + end.turn);
}
play('Zufallskampf', pair.a.paste, pair.b.paste);
play('Eigener Kampf', pool[0].paste, pool[1].paste);

const packed = engine.validatePaste(pool[0].paste).packed;
const left = session.create({ packedA: packed, packedB: packed, level: 0, seed: '3,3,3,3', nameA: 'Du', nameB: 'KI' }).forfeit();
eq(!!left.ended && left.winner, 'KI', 'Aufgabe gibt der KI den Sieg');

const ui = fs.readFileSync(path.join(__dirname, '..', 'js/battle_ui.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
if (!/foeSrc: 'builder'/.test(ui) || !/builderTeams\(\)/.test(ui)) fail('Eigener Kampf nimmt die Teams nicht aus dem Teambuilder');
else ok('Eigener Kampf: beide Seiten starten beim Teambuilder');
if (!/metaTeams\(\)/.test(ui)) fail('Meta-Teams fehlen als zusätzliche KI-Quelle');
else ok('Meta-Teams bleiben eine zusätzliche Quelle für die KI');
if (!app.includes("catVs: 'Kämpfe'") || !app.includes("'vs'")) fail('Kategorie Kämpfe fehlt');
else ok('Kategorie Kämpfe ist verdrahtet');
eq(fmt.FORMAT_ID, 'gen9championsvgc2026regmc', 'Kampf nutzt Reg M-C');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Kämpfe OK');
