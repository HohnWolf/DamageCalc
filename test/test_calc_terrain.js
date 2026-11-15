// Terrain in the Champions damage calc: 1.3x type boost, Misty/Grassy reductions,
// terrain moves, grounded checks, Hadron Engine, and the description token the UI prints.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/calc.js'), 'utf8'), ctx);
const C = ctx.Calc;

let bad = 0;
function fail(m) { console.log('FAIL ' + m); bad++; }
function ok(m) { console.log('ok   ' + m); }
function eq(actual, expected, m) {
  if (actual !== expected) fail(m + ' (ist ' + JSON.stringify(actual) + ', soll ' + JSON.stringify(expected) + ')');
  else ok(m);
}

function mon(over) {
  return Object.assign({
    species: 'Testmon', types: ['Normal'],
    stats: { hp: 200, at: 100, df: 100, sa: 200, sd: 100, sp: 100 },
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    ability: '', item: '(none)', status: 'Healthy',
    curHP: 200, maxHP: 200, weight: 50, canEvolve: false
  }, over || {});
}
function move(over) { return Object.assign({ name: 'Tackle', bp: 40, type: 'Normal', category: 'Physical' }, over || {}); }
function field(terrain, over) { return Object.assign({ format: 'Singles', weather: '', terrain: terrain || '', gravity: false }, over || {}); }
function max(res) { return res.damage[res.damage.length - 1]; }
function hit(atk, def, mv, terrain, fmt) {
  return C.calculate(atk, def, move(mv), field(terrain, fmt), {}, {});
}

const atk = mon();
const def = mon({ species: 'Target', stats: { hp: 180, at: 80, df: 100, sa: 80, sd: 100, sp: 80 }, curHP: 180, maxHP: 180 });
const flying = mon({ species: 'Flyer', types: ['Flying'] });
const tb = { name: 'Thunderbolt', bp: 90, type: 'Electric', category: 'Special' };

// ---- Electric / Grassy / Psychic 1.3x on a grounded attacker ----
const tb0 = hit(atk, def, tb, '');
const tbE = hit(atk, def, tb, 'Electric');
eq(tb0.finalBP, 90, 'Donnerblitz ohne Terrain bleibt 90 BP');
eq(tbE.finalBP, 117, 'Donnerblitz auf Elektrofeld ist 90 × 1,3 = 117 BP');
eq(tbE.desc.terrain, 'Electric', 'Beschreibung nennt Electric Terrain');
eq(tb0.desc.terrain, undefined, 'ohne Terrain steht keins in der Beschreibung');
if (!(max(tbE) > max(tb0))) fail('Elektrofeld erhöht den Schaden von Donnerblitz nicht');
else ok('Elektrofeld erhöht den Schaden von Donnerblitz');

eq(hit(atk, def, tb, 'electricterrain').finalBP, 117, 'Showdown-Id electricterrain zählt als Elektrofeld');
eq(hit(atk, def, tb, 'Electric Terrain').finalBP, 117, '"Electric Terrain" zählt als Elektrofeld');
eq(hit(atk, def, tb, 'Elektro').desc.terrain, 'Electric', 'deutsches Elektro wird zum Terrain-Token');

const flyAtk = hit(flying, def, tb, 'Electric');
eq(flyAtk.finalBP, 90, 'fliegender Angreifer bekommt keinen Elektro-Boost');
eq(flyAtk.desc.terrain, undefined, 'ohne Boost nennt die Beschreibung kein Terrain');
eq(hit(mon({ ability: 'Levitate' }), def, tb, 'Electric').finalBP, 90, 'Levitate bekommt keinen Elektro-Boost');
eq(hit(mon({ ability: 'Eelevate' }), def, tb, 'Electric').finalBP, 90, 'Eelevate bekommt keinen Elektro-Boost');
eq(hit(mon({ item: 'Air Balloon' }), def, tb, 'Electric').finalBP, 90, 'Luftballon bekommt keinen Elektro-Boost');
eq(hit(mon({ types: ['Flying'], item: 'Iron Ball' }), def, tb, 'Electric').finalBP, 117, 'Eisenkugel erdet einen Flieger');
eq(hit(flying, def, tb, 'Electric', { gravity: true }).finalBP, 117, 'Erdanziehung erdet einen Flieger');
eq(hit(mon({ magnetRise: true }), def, tb, 'Electric').finalBP, 90, 'Magnetflug bekommt keinen Elektro-Boost');
eq(hit(mon({ telekinesis: true }), def, tb, 'Electric').finalBP, 90, 'Telekinese bekommt keinen Elektro-Boost');
eq(hit(mon({ types: ['Flying'], ingrain: true }), def, tb, 'Electric').finalBP, 117, 'Verwurzler erdet einen Flieger');
eq(hit(mon({ types: ['Flying'], smackDown: true }), def, tb, 'Electric').finalBP, 117, 'Smack Down erdet einen Flieger');
eq(hit(mon({ types: ['Flying'], roost: true }), def, tb, 'Electric').finalBP, 117, 'Ruheort entfernt den Flug-Typ fürs Terrain');
eq(hit(atk, def, tb, 'Electric', { format: 'Doubles' }).finalBP, 117, 'Doppelkampf nutzt denselben Elektro-Boost');

const psy = { name: 'Psychic', bp: 90, type: 'Psychic', category: 'Special' };
const psyR = hit(atk, def, psy, 'Psychic');
eq(psyR.finalBP, 117, 'Psychokinese auf Psychofeld ist ×1,3');
eq(psyR.desc.terrain, 'Psychic', 'Beschreibung nennt Psychic Terrain');
eq(hit(flying, def, psy, 'Psychic').finalBP, 90, 'fliegender Angreifer bekommt keinen Psycho-Boost');

const grass = { name: 'Energy Ball', bp: 90, type: 'Grass', category: 'Special' };
eq(hit(atk, def, grass, 'Grassy').finalBP, 117, 'Grasfeld boostet Grass-Attacken ×1,3');
eq(hit(atk, def, grass, 'Grass').finalBP, 117, 'Alias Grass (Kampf/Meta) ist Grasfeld');
eq(hit(atk, def, grass, 'grassyterrain').desc.terrain, 'Grassy', 'grassyterrain landet als Grassy in der Beschreibung');
eq(hit(flying, def, grass, 'Grassy').finalBP, 90, 'fliegender Angreifer bekommt keinen Gras-Boost');

// ---- Misty halves Dragon vs grounded targets; Grassy halves EQ/Bulldoze/Magnitude ----
const dragon = { name: 'Dragon Pulse', bp: 85, type: 'Dragon', category: 'Special' };
const mist = hit(atk, def, dragon, 'Misty');
eq(mist.finalBP, 42, 'Nebel halbiert Drachenpuls (85 → 42)');
eq(mist.desc.terrain, 'Misty', 'Beschreibung nennt Misty Terrain');
const mistFly = hit(atk, flying, dragon, 'Misty');
eq(mistFly.finalBP, 85, 'Nebel halbiert Drachenpuls nicht gegen Flieger');
eq(mistFly.desc.terrain, undefined, 'gegen Flieger steht Nebel nicht in der Beschreibung');
eq(hit(atk, mon({ ability: 'Levitate' }), dragon, 'Misty').finalBP, 85, 'Nebel halbiert nicht gegen Levitate');
eq(hit(atk, mon({ item: 'Air Balloon' }), dragon, 'Misty').finalBP, 85, 'Nebel halbiert nicht gegen Luftballon');

['Earthquake', 'Bulldoze', 'Magnitude'].forEach(function (name) {
  const bp = name === 'Earthquake' ? 100 : 60;
  const g = hit(atk, def, { name: name, bp: bp, type: 'Ground', category: 'Physical' }, 'Grassy');
  const bare = hit(atk, def, { name: name, bp: bp, type: 'Ground', category: 'Physical' }, '');
  eq(g.finalBP, Math.floor(bp / 2), name + ' wird auf Grasfeld halbiert');
  eq(g.desc.terrain, 'Grassy', name + ' nennt Grasfeld in der Beschreibung');
  if (!(max(g) < max(bare))) fail(name + ' macht auf Grasfeld nicht weniger Schaden');
  else ok(name + ' macht auf Grasfeld weniger Schaden');
});
eq(hit(atk, flying, { name: 'Earthquake', bp: 100, type: 'Ground', category: 'Physical' }, 'Grassy').damage[0], 0, 'Erdbeben trifft Flieger nicht');

// ---- Rising Voltage, Expanding Force, Terrain Pulse, Misty Explosion, Grassy Glide ----
const rv = { name: 'Rising Voltage', bp: 70, type: 'Electric', category: 'Special' };
const rvG = hit(atk, def, rv, 'Electric');
const rvF = hit(atk, flying, rv, 'Electric');
const rv0 = hit(atk, def, rv, '');
eq(rv0.finalBP, 70, 'Hochspannung ohne Terrain bleibt 70');
eq(rvG.finalBP, 182, 'Hochspannung verdoppelt gegen Boden und bekommt ×1,3 (182 BP)');
eq(rvG.desc.terrain, 'Electric', 'Hochspannung nennt Elektrofeld');
eq(rvF.finalBP, 91, 'Hochspannung verdoppelt nicht gegen Flieger, der Typ-Boost bleibt (91 BP)');
eq(rvF.desc.terrain, 'Electric', 'Typ-Boost steht auch gegen Flieger in der Beschreibung');
eq(hit(atk, mon({ ability: 'Levitate' }), rv, 'Electric').finalBP, 91, 'Hochspannung verdoppelt nicht gegen Levitate');
eq(hit(atk, mon({ item: 'Air Balloon' }), rv, 'Electric').finalBP, 91, 'Hochspannung verdoppelt nicht gegen Luftballon');
const mold = hit(mon({ ability: 'Mold Breaker' }), mon({ ability: 'Levitate' }), rv, 'Electric');
eq(mold.finalBP, 182, 'Überbrückung erdet Levitate für Hochspannung');

const ex = { name: 'Expanding Force', bp: 80, type: 'Psychic', category: 'Special' };
const exS = hit(atk, def, ex, 'Psychic');
const exD = hit(atk, def, ex, 'Psychic', { format: 'Doubles' });
const exF = hit(flying, def, ex, 'Psychic', { format: 'Doubles' });
eq(exS.finalBP, 156, 'Expansionskraft ist 80 × 1,5 × 1,3 = 156 BP');
eq(exS.spread, false, 'im Einzelkampf trifft Expansionskraft ein Ziel');
eq(exS.desc.terrain, 'Psychic', 'Expansionskraft nennt Psychofeld');
eq(exD.finalBP, 156, 'im Doppelkampf bleibt die Stärke, der Streu-Abzug kommt danach');
eq(exD.spread, true, 'Expansionskraft trifft im Doppelkampf beide Gegner');
eq(exF.finalBP, 80, 'fliegender Anwender bekommt weder ×1,5 noch ×1,3');
eq(exF.spread, false, 'fliegender Anwender trifft mit Expansionskraft nicht breit');
if (!(max(exD) < max(exS))) fail('Streu-Abzug der Expansionskraft senkt den Schaden im Doppelkampf nicht');
else ok('Streu-Abzug der Expansionskraft senkt den Schaden im Doppelkampf');

const pulse = { name: 'Terrain Pulse', bp: 50, type: 'Normal', category: 'Special' };
const pulseG = hit(atk, mon({ types: ['Water'] }), pulse, 'Grassy');
eq(pulseG.moveType, 'Grass', 'Geländeimpuls wird auf Grasfeld zur Grass-Attacke');
eq(pulseG.finalBP, 130, 'Geländeimpuls verdoppelt und bekommt den Gras-Boost (130 BP)');
eq(pulseG.desc.terrain, 'Grassy', 'Geländeimpuls nennt Grasfeld');
eq(pulseG.effectiveness, 2, 'Grass trifft Water effektiv');
const pulseE = hit(atk, def, pulse, 'Electric');
eq(pulseE.moveType, 'Electric', 'Geländeimpuls wird auf Elektrofeld zu Elektro');
eq(pulseE.finalBP, 130, 'Geländeimpuls auf Elektrofeld ist 130 BP');
eq(hit(flying, def, pulse, 'Grassy').moveType, 'Normal', 'fliegender Anwender ändert Geländeimpuls nicht');
eq(hit(flying, def, pulse, 'Grassy').finalBP, 50, 'fliegender Anwender verdoppelt Geländeimpuls nicht');
eq(hit(atk, def, pulse, 'Misty').moveType, 'Fairy', 'Geländeimpuls wird auf Nebelfeld zu Fee');
eq(hit(atk, def, pulse, 'Psychic').moveType, 'Psychic', 'Geländeimpuls wird auf Psychofeld zu Psycho');

const boom = { name: 'Misty Explosion', bp: 100, type: 'Fairy', category: 'Special', isSpread: true };
eq(hit(atk, def, boom, 'Misty').finalBP, 150, 'Nebelexplosion ist ×1,5 auf Nebelfeld');
eq(hit(atk, def, boom, 'Misty').desc.terrain, 'Misty', 'Nebelexplosion nennt Nebelfeld');
eq(hit(flying, def, boom, 'Misty').finalBP, 100, 'fliegender Anwender boostet Nebelexplosion nicht');

const glide = { name: 'Grassy Glide', bp: 70, type: 'Grass', category: 'Physical' };
const glideG = hit(atk, def, glide, 'Grassy');
const glide0 = hit(atk, def, glide, '');
eq(glideG.finalBP, 91, 'Grasrutsche bekommt den Gras-Boost');
eq(glideG.desc.terrain, 'Grassy', 'Grasrutsche nennt Grasfeld');
eq(glideG.priority, 1, 'Grasrutsche hat auf Grasfeld Priorität +1');
eq(glide0.priority, 0, 'Grasrutsche hat ohne Terrain keine Priorität');
eq(hit(flying, def, glide, 'Grassy').priority, 0, 'fliegende Grasrutsche bekommt keine Priorität');

// ---- Psychic Terrain blocks priority against grounded targets ----
const es = { name: 'Extreme Speed', bp: 80, type: 'Normal', category: 'Physical' };
const blocked = hit(atk, def, es, 'Psychic');
eq(blocked.damage[0], 0, 'Turbotempo scheitert auf Psychofeld gegen ein Ziel am Boden');
eq(blocked.damage.length, 1, 'blockiertes Turbotempo hat keinen Schadenswurf');
eq(blocked.desc.terrain, 'Psychic', 'blockiertes Turbotempo nennt Psychofeld');
eq(blocked.priority, 2, 'Turbotempo hat Priorität +2');
if (blocked.notes[0].indexOf('Priorität') === -1) fail('Hinweis zur Prioritätsblockade fehlt');
else ok('Hinweis zur Prioritätsblockade ist da');
const esFly = hit(atk, flying, es, 'Psychic');
if (!(max(esFly) > 0)) fail('Turbotempo gegen Flieger wird auf Psychofeld zu Unrecht geblockt');
else ok('Turbotempo trifft Flieger auf Psychofeld');
eq(esFly.desc.terrain, undefined, 'Treffer gegen Flieger ist kein Terrain-Modifikator');
if (!(max(hit(atk, mon({ ability: 'Levitate' }), es, 'Psychic')) > 0)) fail('Turbotempo gegen Levitate wird geblockt');
else ok('Turbotempo trifft Levitate auf Psychofeld');
if (!(max(hit(atk, mon({ item: 'Air Balloon' }), es, 'Psychic')) > 0)) fail('Turbotempo gegen Luftballon wird geblockt');
else ok('Turbotempo trifft Luftballon auf Psychofeld');
const psyMove = hit(atk, def, psy, 'Psychic');
if (!(max(psyMove) > 0)) fail('Psychokinese selbst wird auf Psychofeld geblockt');
else ok('Psychokinese (Priorität 0) trifft auf Psychofeld');

// ---- Hadron Engine: Electric Terrain Sp. Atk ×5461/4096, and no boost without terrain ----
const had = mon({ ability: 'Hadron Engine', species: 'Miraidon', types: ['Electric', 'Dragon'] });
const plain = mon({ ability: 'Hadron Engine' });
const noAb = hit(atk, def, tb, 'Electric');
const withH = hit(plain, def, tb, 'Electric');
const hadOff = hit(plain, def, tb, '');
const off = hit(atk, def, tb, '');
eq(withH.desc.attackerAbility, 'Hadron Engine', 'Hadron Engine steht in der Beschreibung');
eq(withH.desc.terrain, 'Electric', 'Hadron Engine nennt das Elektrofeld');
eq(hadOff.desc.attackerAbility, undefined, 'Hadron Engine boostet ohne Elektrofeld nicht');
eq(max(hadOff), max(off), 'ohne Terrain ist der Schaden mit und ohne Hadron Engine gleich');
if (!(max(withH) > max(noAb))) fail('Hadron Engine erhöht den Spezialangriff auf Elektrofeld nicht');
else ok('Hadron Engine erhöht den Spezialangriff auf Elektrofeld');
// Independent roll check: SpA 200 → 267, BP 117, Def 100, no STAB (Normal attacker).
function pokeRound(n) { return (n % 1 > 0.5) ? Math.ceil(n) : Math.floor(n); }
var spa = pokeRound(200 * 5461 / 4096);
var base = Math.floor(Math.floor(Math.floor(22 * 117 * spa / 100) / 50) + 2);
var expect = Math.floor(base * 100 / 100);
eq(max(withH), expect, 'Hadron Engine trifft 5461/4096 auf den Sp.-Ang. (Max-Wurf ' + expect + ')');
eq(hit(had, def, tb, 'Electric').desc.terrain, 'Electric', 'Miraidon mit Hadron Engine nennt das Elektrofeld');

// The result line in the UI is built from desc.terrain. Both languages have a slot for it.
var appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
if (appSrc.indexOf("if (ds.terrain) out.push(T('inTerrain', nTerrain(ds.terrain)))") === -1) fail('die Ergebniszeile hängt das Terrain nicht an');
else ok('die Ergebniszeile hängt das Terrain an');
if (appSrc.indexOf("inTerrain: 'auf {0}-Feld'") === -1) fail('deutsche Terrain-Formulierung fehlt');
else ok('deutsch: auf {Terrain}-Feld');
if (appSrc.indexOf("inTerrain: 'in {0} Terrain'") === -1) fail('englische Terrain-Formulierung fehlt');
else ok('englisch: in {Terrain} Terrain');
if (appSrc.indexOf("'Hadron Engine': 'Electric'") === -1) fail('Hadron Engine setzt im Rechner kein Elektrofeld');
else ok('Hadron Engine setzt im Rechner Elektrofeld');

if (!C.isGrounded(mon(), {})) fail('normales Pokémon ist nicht am Boden');
else ok('normales Pokémon ist am Boden');
if (C.isGrounded(flying, {})) fail('Flieger gilt als am Boden');
else ok('Flieger ist nicht am Boden');

console.log(bad ? ('\n' + bad + ' Fehler') : '\nTerrain-Tests OK');
process.exit(bad ? 1 : 0);
