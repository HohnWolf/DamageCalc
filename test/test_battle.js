// Lokale Kämpfe: ein komplettes Skriptspiel je Modus, ohne ungültige Wahl.
const fs = require('fs'), path = require('path'), vm = require('vm');
const engine = require('../js/meta/engine');
const random = require('../js/battle/random');
const session = require('../js/battle/session');
const fmt = require('../js/meta/format');
const Calc = require('../js/calc');
const Sim = require('../vendor/ps');
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

// Teambuilder stores Stat Points. exportSet writes those numbers into the EVs line.
// Under gen9championsvgc2026regmc the sim reads that line as Stat Points, not as classic EVs.
const STAT_SD = { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' };
const CALC_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
const SIM_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
function builderPaste(mon) {
  const lines = [mon.species + (mon.item && mon.item !== '(none)' ? ' @ ' + mon.item : '')];
  if (mon.ability) lines.push('Ability: ' + mon.ability);
  lines.push('Level: 50');
  const ev = CALC_KEYS.filter(function (k) { return mon.sps[k]; }).map(function (k) { return mon.sps[k] + ' ' + STAT_SD[k]; });
  if (ev.length) lines.push('EVs: ' + ev.join(' / '));
  lines.push(mon.nature + ' Nature');
  (mon.moves || []).forEach(function (m) { lines.push('- ' + m); });
  return lines.join('\n');
}
const sampleSps = { hp: 30, at: 32, df: 4, sa: 0, sd: 0, sp: 0 };
const sampleLine = builderPaste({
  species: 'Incineroar', ability: 'Intimidate', item: 'Sitrus Berry', nature: 'Adamant',
  sps: sampleSps, moves: ['Fake Out']
});
if (!/EVs: 30 HP \/ 32 Atk \/ 4 Def/.test(sampleLine) || /236 HP|252 Atk/.test(sampleLine)) fail('Export schreibt Stat Points nicht 1:1 in die EVs-Zeile: ' + sampleLine);
else ok('Teambuilder-Export schreibt die SP-Zahlen in die EVs-Zeile');

const baseSets = Sim.Teams.import(pool[0].paste);
const custom = baseSets.map(function (s, i) {
  const sps = i === 0 ? sampleSps : {
    hp: s.evs.hp || 0, at: s.evs.atk || 0, df: s.evs.def || 0,
    sa: s.evs.spa || 0, sd: s.evs.spd || 0, sp: s.evs.spe || 0
  };
  const nature = i === 0 ? 'Adamant' : (s.nature ? s.nature[0].toUpperCase() + s.nature.slice(1) : 'Serious');
  return builderPaste({
    species: s.species, ability: s.ability, item: s.item || '(none)', nature: nature, sps: sps, moves: s.moves
  });
}).join('\n\n');
const checked = engine.validatePaste(custom);
if (!checked.ok) fail('SP-Team ist nicht legal: ' + (checked.errors || []).join(' '));
else {
  const battle = new Sim.Battle({
    formatid: fmt.FORMAT_ID, seed: '9,9,9,9',
    p1: { name: 'Du', team: checked.packed },
    p2: { name: 'KI', team: checked.packed }
  });
  const poke = battle.p1.pokemon[0];
  const got = poke.storedStats;
  let mismatch = '';
  CALC_KEYS.forEach(function (k, i) {
    const simVal = SIM_KEYS[i] === 'hp' ? poke.maxhp : got[SIM_KEYS[i]];
    const expect = Calc.calcStat(k, poke.species.baseStats[SIM_KEYS[i]], sampleSps[k], 'Adamant', poke.species.name);
    if (simVal !== expect) mismatch += k + ' sim ' + simVal + ' calc ' + expect + '; ';
  });
  if (poke.set.evs.hp !== 30 || poke.set.evs.atk !== 32 || poke.set.evs.def !== 4) fail('Sim liest die EVs-Zeile nicht als Stat Points: ' + JSON.stringify(poke.set.evs));
  else if (mismatch) fail('Kampfwerte weichen vom Teambuilder ab: ' + mismatch);
  else ok('Kampfwerte (' + poke.species.name + ', 30/32/4 Adamant) stimmen mit dem Teambuilder überein: KP ' + poke.maxhp + ' Ang ' + got.atk);
}

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Kämpfe OK');
