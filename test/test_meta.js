// Meta-Test: local simulator only, legality, Wilson intervals, bot levels.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;
const ok = (m) => console.log('ok   ' + m);
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => (a === b ? ok(m) : fail(m + ' (ist ' + a + ', soll ' + b + ')'));

const fmt = require('../js/meta/format');
const stats = require('../js/meta/stats');
const errors = require('../js/meta/de_errors');
const engine = require('../js/meta/engine');
const harness = require('../js/meta/harness');
const preview = require('../js/meta/preview');
const replay = require('../js/meta/replay');
const variants = require('../js/meta/variants');
const pasteUrl = require('../js/meta/paste_url');
const text = require('../js/meta/text');
const bots = require('../js/meta/bots');
const Sim = require('../vendor/ps');
const Calc = require('../js/calc');

eq(fmt.FORMAT_ID, 'gen9championsvgc2026regmc', 'Format ist Reg M-C');
eq(fs.readFileSync(path.join(ROOT, 'vendor/ps/PIN'), 'utf8').trim(), fmt.SHOWDOWN_COMMIT, 'Simulator-Commit steht fest');
eq(fs.existsSync(path.join(ROOT, 'vendor/ps/LICENSE')), true, 'MIT-Lizenz liegt beim Simulator');
const notice = fs.readFileSync(path.join(ROOT, 'vendor/ps/NOTICE'), 'utf8');
if (!/MIT/.test(fs.readFileSync(path.join(ROOT, 'vendor/ps/LICENSE'), 'utf8'))) fail('LICENSE ist nicht die MIT-Lizenz');
else ok('LICENSE ist MIT');
if (!notice.includes(fmt.SHOWDOWN_COMMIT)) fail('NOTICE ohne Commit');
else ok('NOTICE nennt den Commit');

['js/meta', 'electron/meta_pool.js', 'electron/meta_worker.js', 'js/meta_ui.js'].forEach(function (rel) {
  const p = path.join(ROOT, rel);
  const files = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map(function (f) { return path.join(p, f); }) : [p];
  files.forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    const t = fs.readFileSync(f, 'utf8');
    if (/sim\.pokemonshowdown\.com|replay\.pokemonshowdown\.com|wss?:\/\//.test(t)) fail(path.relative(ROOT, f) + ' enthält eine Showdown-Verbindung');
  });
});
ok('kein Showdown-Server in Meta-Test-Code');

eq(pasteUrl.allowedPasteUrl('https://pokepast.es/abc123'), 'https://pokepast.es/abc123/raw', 'PokéPaste wird normalisiert');
eq(pasteUrl.allowedPasteUrl('https://play.pokemonshowdown.com/'), null, 'Showdown-Adresse wird abgelehnt');
eq(pasteUrl.allowedPasteUrl('http://pokepast.es/abc'), null, 'nur https');

const w = stats.wilson(76, 80);
if (!(w.lo < 0.95 && w.hi > 0.95 && w.lo > 0.8)) fail('Wilson-Intervall für 76/80 unplausibel: ' + JSON.stringify(w));
else ok('Wilson-Intervall');
eq(stats.overlap({ lo: 0.4, hi: 0.6 }, { lo: 0.55, hi: 0.7 }), true, 'überlappende Intervalle');
eq(stats.overlap({ lo: 0.1, hi: 0.2 }, { lo: 0.3, hi: 0.4 }), false, 'getrennte Intervalle');
eq(stats.seedFor(1, 0), stats.seedFor(1, 0), 'Seed ist fest');
if (stats.seedFor(1, 0) === stats.seedFor(1, 1)) fail('Seeds unterscheiden sich nicht');
else ok('Seeds je Spiel verschieden');

const kept = variants.successiveHalving(function (n) {
  return { n: n, ciA: { lo: 0.2, hi: 0.4 }, ciB: { lo: 0.7, hi: 0.9 }, winsA: 3, winsB: 8 };
}, [16, 32]);
eq(kept && kept.n, 16, 'getrennte Variante bleibt nach dem ersten Schritt');
eq(variants.successiveHalving(function () {
  return { ciA: { lo: 0.4, hi: 0.6 }, ciB: { lo: 0.45, hi: 0.7 } };
}, [16, 32]), null, 'überlappende Variante wird verworfen');

const deMsg = errors.one('Incineroar has more than 32 Stat Points in HP.');
if (!/32 Stat Points/.test(deMsg) || !/hat mehr/.test(deMsg)) fail('deutsche Stat-Point-Meldung: ' + deMsg);
else ok('deutsche Stat-Point-Meldung');
const empty = engine.validatePaste('');
eq(empty.ok, false, 'leeres Team ist illegal');
if (!empty.errors[0] || !/Pokémon/.test(empty.errors[0])) fail('Leer-Meldung nicht deutsch: ' + empty.errors[0]);
else ok('Leer-Meldung deutsch');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/meta_teams.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/meta_spreads.js'), 'utf8'), ctx);
const pool = ctx.window.RL_META_TEAMS;
eq(pool.format, fmt.FORMAT_ID, 'Pool nutzt dieselbe Regulation');
if (!pool.teams || pool.teams.length < 50) fail('zu wenige Meta-Teams: ' + (pool.teams && pool.teams.length));
else ok(pool.teams.length + ' Meta-Teams im Paket');
let illegal = 0;
pool.teams.forEach(function (t) {
  const v = engine.validatePaste(t.paste);
  if (!v.ok) illegal++;
});
eq(illegal, 0, 'jedes gebündelte Team besteht den Validator');
const assumed = pool.teams.filter(function (t) { return t.assumed; }).length;
if (!assumed) fail('keine markierte Annahme');
else ok(assumed + ' Teams mit markierter Usage-Annahme');
if (!ctx.window.RL_META_SPREADS.pokemon.Incineroar) fail('Usage ohne Incineroar');
else ok('Usage-Spreads geladen');

const fast = { name: 'A', types: ['Normal'], ability: '', item: '', weight: 50, stats: { hp: 150, at: 100, df: 100, sa: 100, sd: 100, sp: 100 }, moves: [] };
const slow = { name: 'B', types: ['Normal'], ability: '', item: '', weight: 80, stats: { hp: 180, at: 90, df: 90, sa: 90, sd: 90, sp: 50 }, moves: [] };
const scarf = preview.speed(Calc, fast, 'scarf');
const base = preview.speed(Calc, fast, 'base');
const tw = preview.speed(Calc, fast, 'tailwind');
if (!(scarf > base && tw > scarf)) fail('Initiative Scarf/Tailwind: ' + base + ' ' + scarf + ' ' + tw);
else ok('Scarf und Tailwind erhöhen die Initiative');
const atk = Object.assign({}, fast, { moves: [{ name: 'Tackle', bp: 40, type: 'Normal', category: 'Physical', accuracy: 100 }] });
const report = preview.analyze(Calc, [atk], [slow]);
if (!report.mineHits[0].vs[0].hit) fail('K.O.-Matrix leer');
else ok('K.O.-Matrix ohne Simulation');

const html = replay.html('|turn|1\n|move|p1a: A|Tackle|p2a: B\n|faint|p2a: B\n|win|P1\n', 'Test');
if (/pokemonshowdown\.com|https?:\/\//.test(html)) fail('Replay lädt etwas aus dem Netz');
else ok('Replay ist offline');
if (!html.includes('Tackle') || !html.includes('Runde 1')) fail('Replay zeigt den Zug nicht');
else ok('Replay zeigt den Zug');

const team = pool.teams[0];
const packed = engine.validatePaste(team.paste).packed;
const g1 = engine.runGame({ packedA: packed, packedB: packed, levelA: 1, levelB: 1, seed: '4,5,6,7' });
const g2 = engine.runGame({ packedA: packed, packedB: packed, levelA: 1, levelB: 1, seed: '4,5,6,7' });
eq(g1.result + ':' + g1.turns + ':' + g1.errors, g2.result + ':' + g2.turns + ':' + g2.errors, 'gleicher Seed, gleiches Spiel');

function match(levelA, levelB, games, seed) {
  const t0 = Date.now();
  const r = harness.runMatchup({ packedA: packed, packedB: packed, levelA: levelA, levelB: levelB, games: games, baseSeed: seed });
  const wr = r.decided ? r.winsA / r.decided : 0;
  console.log('     L' + levelA + ' vs L' + levelB + ' ' + games + ' Spiele: ' + (wr * 100).toFixed(1) + '%  ' + r.winsA + '-' + r.winsB + '  unfertig ' + r.unfinished + '  Fehler ' + r.errors + '  ' + ((Date.now() - t0) / games).toFixed(1) + ' ms');
  return r;
}
const l2l0 = match(2, 0, 80, 42);
eq(l2l0.errors, 0, 'L2 gegen Zufall: keine ungültige Wahl');
eq(l2l0.unfinished, 0, 'L2 gegen Zufall: nichts unfertig');
if (l2l0.winsA / l2l0.decided < 0.95) fail('L2 sollte Zufall mit mindestens 95% schlagen, ist ' + (100 * l2l0.winsA / l2l0.decided).toFixed(1) + '%');
else ok('L2 schlägt Zufall mit ' + (100 * l2l0.winsA / l2l0.decided).toFixed(1) + '%');

const l2l1 = match(2, 1, 40, 42);
eq(l2l1.errors, 0, 'L2 gegen L1: keine ungültige Wahl');
eq(l2l1.unfinished, 0, 'L2 gegen L1: nichts unfertig');
if (l2l1.winsA / l2l1.decided < 0.70) fail('L2 sollte L1 mit mindestens 70% schlagen, ist ' + (100 * l2l1.winsA / l2l1.decided).toFixed(1) + '%');
else ok('L2 schlägt L1 mit ' + (100 * l2l1.winsA / l2l1.decided).toFixed(1) + '%');

const l3 = match(3, 2, 24, 42);
eq(l3.errors, 0, 'L3 gegen L2: keine ungültige Wahl');
eq(l3.unfinished, 0, 'L3 gegen L2: nichts unfertig');
if (l3.winsA / l3.decided < 0.60) fail('L3 sollte L2 mit mindestens 60% schlagen, ist ' + (100 * l3.winsA / l3.decided).toFixed(1) + '%');
else ok('L3 schlägt L2 mit ' + (100 * l3.winsA / l3.decided).toFixed(1) + '%');

const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
if (!app.includes('Lizenzen') || !app.includes('MIT License')) fail('Lizenz-Abschnitt fehlt');
else ok('Lizenz-Abschnitt in den Einstellungen');
const htmlIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!htmlIndex.includes('js/meta_ui.js') || !htmlIndex.includes('data/meta_teams.js')) fail('Meta-Test ist nicht in der Seite');
else ok('Meta-Test ist in der Seite');
if (/spopt|SP-Optimierer|js\/spopt/.test(htmlIndex + fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8'))) fail('SP-Optimierer ist noch verdrahtet');
else ok('SP-Optimierer ist entfernt');
const builderSrc = fs.readFileSync(path.join(ROOT, 'js/builder.js'), 'utf8');
if (!builderSrc.includes('id="tbMeta"') || !builderSrc.includes('tb-meta')) fail('Meta-Test-Knopf fehlt im Teambuilder');
else ok('Meta-Test-Knopf steht im Teambuilder');

eq(text.decodeEntities('angrybook&#x27;s 1st Place'), "angrybook's 1st Place", '&#x27; wird zum Apostroph');
eq(text.decodeEntities('A &amp; B &quot;C&quot; &#39;D&#39;'), 'A & B "C" \'D\'', 'benannte Entities');
eq(text.decodeEntities('&amp;#x27;'), "'", 'doppelt kodiertes Apostroph');
const stored = { name: 'Luke C&#x27;s 1st Place', notes: 'a &amp; b', source: 'paste' };
text.normalizeTeam(stored);
eq(stored.name, "Luke C's 1st Place", 'gespeicherter Name wird normalisiert');
eq(stored.notes, 'a & b', 'gespeicherte Notiz wird normalisiert');
if (pool.teams.some(function (t) { return /&#|&amp;|&quot;/.test(t.name || ''); })) fail('gebündelte Teamnamen enthalten noch HTML-Entities');
else ok('gebündelte Teamnamen sind dekodiert');
const uiSrc = fs.readFileSync(path.join(ROOT, 'js/meta_ui.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'css/meta.css'), 'utf8');
if (!uiSrc.includes('RLMetaText') || !uiSrc.includes('normalizeTeam')) fail('die Oberfläche normalisiert gespeicherte Teams nicht');
else ok('Oberfläche dekodiert gespeicherte Teams');
if (!/height:\s*auto/.test(cssSrc) || !cssSrc.includes('mt-title') || !cssSrc.includes('meta-res')) fail('Teamliste oder Ergebnistabelle ohne festes Layout');
else ok('Teamliste und Ergebnistabelle haben ein festes Layout');

function teamById(id) { return pool.teams.find(function (t) { return t.id === id; }); }
function startBattle(idA, teamA, idB, teamB) {
  const a = engine.validatePaste(teamById(idA).paste);
  const b = engine.validatePaste(teamById(idB).paste);
  if (!a.ok || !b.ok) throw new Error('Team illegal');
  const battle = new Sim.Battle({
    formatid: fmt.FORMAT_ID, seed: '1,2,3,4',
    p1: { name: 'P1', team: a.packed }, p2: { name: 'P2', team: b.packed }
  });
  if (!battle.choose('p1', teamA) || !battle.choose('p2', teamB)) throw new Error('Teampreview ungültig');
  return battle;
}
function fakeOuts(battle, sideId, level) {
  const side = battle[sideId];
  const req = side.activeRequest;
  const out = [];
  side.active.forEach(function (p, i) {
    if (!p || p.fainted) return;
    bots.slotCandidates(battle, side, i, level, req.active).forEach(function (c) {
      if (c && c.id === 'fakeout') out.push(c);
    });
  });
  return out;
}
function choiceHasFakeOut(battle, sideId, choice) {
  const req = battle[sideId].activeRequest;
  return String(choice).split(',').some(function (part, i) {
    const m = /move\s+(\d+)/.exec(part);
    if (!m || !req.active || !req.active[i] || !req.active[i].moves) return false;
    const mv = req.active[i].moves[+m[1] - 1];
    return !!(mv && mv.id === 'fakeout');
  });
}
const terrainBattle = startBattle('RSZqsn', 'team 3241', 'FW7Oza', 'team 1234');
eq(terrainBattle.field.terrain, 'psychicterrain', 'Indeedee setzt Psychic Terrain vor der Zugwahl');
[0, 1, 2, 3].forEach(function (level) {
  const n = fakeOuts(terrainBattle, 'p1', level).length + fakeOuts(terrainBattle, 'p2', level).length;
  if (n) fail('L' + level + ' bietet Fake Out unter Psychic Terrain gegen Boden-Pokémon an');
});
ok('L0–L3 bieten Fake Out unter Psychic Terrain nicht an');
const rng = stats.mulberry32(7);
let picked = 0;
for (let i = 0; i < 40; i++) {
  if (choiceHasFakeOut(terrainBattle, 'p1', bots.decide(terrainBattle, 'p1', 0, rng))) picked++;
  if (choiceHasFakeOut(terrainBattle, 'p2', bots.decide(terrainBattle, 'p2', 0, rng))) picked++;
}
[1, 2, 3].forEach(function (level) {
  ['p1', 'p2'].forEach(function (side) {
    if (choiceHasFakeOut(terrainBattle, side, bots.decide(terrainBattle, side, level, rng))) picked++;
  });
});
eq(picked, 0, 'keine Stufe wählt Fake Out gegen geerdete Ziele unter Psychic Terrain');

terrainBattle.field.clearTerrain();
if (!fakeOuts(terrainBattle, 'p1', 2).length) fail('ohne Terrain fehlt Fake Out als Kandidat');
else ok('ohne Terrain bleibt Fake Out erlaubt');
terrainBattle.field.setTerrain('psychicterrain', terrainBattle.p1.active[1]);
if (fakeOuts(terrainBattle, 'p1', 2).length) fail('gesetztes Psychic Terrain blockt Fake Out nicht');
else ok('auch nachträglich gesetztes Psychic Terrain blockt Fake Out');

function groundedCount(battle) {
  return battle.p2.active.filter(function (p) { return p && !!p.isGrounded(); }).length;
}
terrainBattle.p2.active.forEach(function (p) { if (p) p.setItem('airballoon'); });
eq(groundedCount(terrainBattle), 0, 'Air Balloon hebt vom Boden ab');
if (!fakeOuts(terrainBattle, 'p1', 2).length) fail('Fake Out gegen Air Balloon unter Terrain fehlt');
else ok('Fake Out gegen Air Balloon bleibt erlaubt');
terrainBattle.p2.active.forEach(function (p) { if (p) { p.setItem(''); p.setAbility('levitate'); } });
eq(groundedCount(terrainBattle), 0, 'Levitate hebt vom Boden ab');
if (!fakeOuts(terrainBattle, 'p1', 2).length) fail('Fake Out gegen Levitate unter Terrain fehlt');
else ok('Fake Out gegen Levitate bleibt erlaubt');
terrainBattle.p2.active.forEach(function (p) { if (p) { p.setAbility('intimidate'); p.addVolatile('magnetrise'); } });
eq(groundedCount(terrainBattle), 0, 'Magnet Rise hebt vom Boden ab');
if (!fakeOuts(terrainBattle, 'p1', 2).length) fail('Fake Out gegen Magnet Rise unter Terrain fehlt');
else ok('Fake Out gegen Magnet Rise bleibt erlaubt');

const flyBattle = startBattle('RSZqsn', 'team 3241', 'RSZqsn', 'team 4123');
const flyFoe = flyBattle.p2.active.filter(function (p) { return p && p.hasType('Flying'); })[0];
if (!flyFoe) fail('Talonflame steht nicht im Lead');
else {
  eq(!!flyFoe.isGrounded(), false, 'Flying-Typ ist nicht geerdet');
  const acts = fakeOuts(flyBattle, 'p1', 2);
  const atGround = acts.filter(function (c) {
    const poke = flyBattle.p1.active[0];
    const tgt = poke.getAtLoc(c.loc);
    return tgt && !!tgt.isGrounded();
  });
  const atAir = acts.filter(function (c) {
    const poke = flyBattle.p1.active[0];
    const tgt = poke.getAtLoc(c.loc);
    return tgt && !tgt.isGrounded();
  });
  if (atGround.length) fail('Fake Out zielt unter Terrain auf ein geerdetes Pokémon');
  else ok('Fake Out zielt unter Terrain nicht auf geerdete Pokémon');
  if (!atAir.length) fail('Fake Out gegen Flying unter Terrain fehlt');
  else ok('Fake Out gegen Flying unter Terrain bleibt erlaubt');
}

terrainBattle.field.clearTerrain();
terrainBattle.p2.active.forEach(function (p) { if (p) { delete p.volatiles.magnetrise; p.setAbility('armortail'); } });
if (fakeOuts(terrainBattle, 'p1', 2).length) fail('Armor Tail blockt Fake Out nicht');
else ok('Armor Tail blockt Fake Out');
terrainBattle.p2.active[0].setAbility('queenlymajesty');
terrainBattle.p2.active[1].setAbility('intimidate');
if (fakeOuts(terrainBattle, 'p1', 2).length) fail('Queenly Majesty blockt Fake Out nicht');
else ok('Queenly Majesty blockt Fake Out');
terrainBattle.p2.active[0].setAbility('dazzling');
if (fakeOuts(terrainBattle, 'p1', 2).length) fail('Dazzling blockt Fake Out nicht');
else ok('Dazzling blockt Fake Out');
terrainBattle.p1.active[0].setAbility('moldbreaker');
if (!fakeOuts(terrainBattle, 'p1', 2).length) fail('Mold Breaker ignoriert Dazzling nicht');
else ok('Mold Breaker ignoriert Dazzling');

terrainBattle.p1.active[0].setAbility('intimidate');
terrainBattle.p2.active.forEach(function (p) { if (p) p.setAbility('intimidate'); });
terrainBattle.p1.active[0].activeMoveActions = 1;
if (fakeOuts(terrainBattle, 'p1', 2).length) fail('Fake Out bleibt nach der ersten Aktion wählbar');
else ok('Fake Out nur in der ersten Aktion auf dem Feld');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Meta-Test OK');
