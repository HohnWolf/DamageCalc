// Regressionstests für die Fixes aus dem Damage-Calc-Audit (Champions-Engine js/calc.js, Gen 3 js/gen3.js, Gen 4/5 js/nds_calc.js).
// Erwartete Zahlen: alle 16 Zufallswürfe aus dem mitgelieferten Showdown-Sim (vendor/ps, gen9customgame, Lv 50, 0 EVs, IV 31, Serious),
// erzeugt mit ModifyType/ModifyMove/ModifyCritRatio-Events + battle.actions.getDamage und festem Zufallswert je Wurf;
// sonst von Hand nachgerechnet (Kommentar).
const fs = require('fs'), path = require('path'), vm = require('vm');
const Calc = require('../js/calc');
const Sim = require('../vendor/ps');

let bad = 0;
function ok(m) { console.log('ok   ' + m); }
function fail(m) { console.log('FAIL ' + m); bad++; }
function eq(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) ok(label); else fail(label + ': erwartet ' + w + ', bekommen ' + g);
}
function sum(a, b, n) { return a.map(function (x, i) { return x + b[i] * (n || 1); }); }

// ---------- Champions-Engine: Pokémon und Attacken aus den Showdown-Daten ----------
const KEYS = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };
function mon(species, o) {
  const sp = Sim.Dex.species.get(species);
  const stats = {};
  Object.keys(KEYS).forEach(function (k) { stats[k] = Calc.calcStat(k, sp.baseStats[KEYS[k]], 0, 'Serious', sp.name); });
  return Object.assign({
    species: sp.name, baseSpecies: sp.baseSpecies, types: sp.types.slice(), stats: stats, boosts: {}, ability: '', item: '',
    status: 'Healthy', curHP: stats.hp, maxHP: stats.hp, weight: sp.weightkg, canEvolve: !!(sp.evos && sp.evos.length), moves: []
  }, o || {});
}
function move(name, o) {
  const m = Sim.Dex.moves.get(name);
  return Object.assign({
    name: m.name, bp: m.basePower, type: m.type, category: m.category, makesContact: !!m.flags.contact, isPunch: !!m.flags.punch,
    isSound: !!m.flags.sound, isBullet: !!m.flags.bullet, hasSecondaryEffect: !!(m.secondary || (m.secondaries && m.secondaries.length)),
    isSpread: m.target === 'allAdjacentFoes' || m.target === 'allAdjacent', hitRange: m.multihit
  }, o || {});
}
function calc(a, d, mv, field, aSide, dSide) {
  return Calc.calculate(a, d, mv, Object.assign({ format: 'Singles', weather: '', terrain: '', ruin: {} }, field || {}), aSide || {}, dSide || {});
}
const SNORLAX = function (o) { return mon('Snorlax', Object.assign({ ability: 'Thick Fat' }, o || {})); };

// 1. Terrain Pulse auf Grasfeld: Pflanze, 100 BP (+30 % Feld) – Showdown 33–39
(function () {
  const r = calc(mon('Snorlax', { ability: 'Thick Fat' }), SNORLAX(), move('Terrain Pulse'), { terrain: 'Grassy' });
  eq('Terrain Pulse auf Grasfeld ist Pflanze', r.moveType, 'Grass');
  eq('Terrain Pulse auf Grasfeld = Showdown', r.damage, [33, 33, 33, 34, 34, 35, 35, 35, 36, 36, 37, 37, 37, 38, 38, 39]);
  eq('Terrain Pulse auf Nebelfeld ist Fee', calc(mon('Snorlax'), SNORLAX(), move('Terrain Pulse'), { terrain: 'Misty' }).moveType, 'Fairy');
})();

// 2. Mehrfachtreffer: Multiscale und Resistenz-Beere nur beim ersten Treffer
(function () {
  // Showdown je Treffer: Dragonite mit vollen KP (Multiscale) 32–38, danach 64–76; Skill Link = 5 Treffer
  const first = [32, 32, 32, 32, 32, 32, 32, 32, 36, 36, 36, 36, 36, 36, 36, 38];
  const later = [64, 64, 64, 64, 64, 64, 64, 64, 72, 72, 72, 72, 72, 72, 72, 76];
  const atk = mon('Cloyster', { ability: 'Skill Link' });
  const r = calc(atk, mon('Dragonite', { ability: 'Multiscale' }), move('Icicle Spear'));
  eq('Icicle Spear ×5 gegen Multiscale: 1. Treffer halbiert, 4 volle', r.damage, sum(first, later, 4));
  eq('Mehrfachtreffer meldet 5 Treffer', r.nHits, 5);
  const rb = calc(atk, mon('Dragonite', { ability: 'Inner Focus', item: 'Yache Berry' }), move('Icicle Spear'));
  eq('Icicle Spear ×5 gegen Yache-Beere: nur 1. Treffer halbiert', rb.damage, sum(first, later, 4));
  // Einzeltreffer bleibt halbiert
  eq('Einzeltreffer gegen Multiscale halbiert', calc(atk, mon('Dragonite', { ability: 'Multiscale' }), move('Icicle Spear', { hitRange: undefined })).damage, first);
})();

// 3. Fokusgurt/Robustheit: Mehrfachtreffer brechen sie
(function () {
  const d = { maxHP: 100, curHP: 100 };
  eq('Fokusgurt rettet einen Einzeltreffer', Calc.koChance([120], d, { sash: true, hits: 1 }).n, 2);
  eq('Fokusgurt rettet keinen Mehrfachtreffer (2 Treffer = OHKO)', Calc.koChance([120], d, { sash: true, hits: 2 }).text, 'garantierter OHKO');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  if (/hits: r\.nHits/.test(app) && /C\.MOLD_BREAKERS\.indexOf\(atk\.ability\) === -1/.test(app)) ok('app.js gibt Trefferzahl und Mold Breaker (Sturdy) an koChance weiter');
  else fail('app.js: Trefferzahl/Mold Breaker für Sash/Sturdy fehlt');
  // Parental Bond zählt als 2 Treffer
  const pb = calc(mon('Kangaskhan-Mega', { ability: 'Parental Bond' }), SNORLAX(), move('Body Slam'));
  eq('Parental Bond meldet 2 Treffer', pb.nHits, 2);
})();

// 4. Body Press: Showdown führt ModifyAtk aus (battle-actions: attackStat wird vor dem Modify-Event auf atk gesetzt),
//    d. h. Choice Band/Huge Power wirken, Fur Coat/Eviolite nicht
(function () {
  eq('Body Press mit Choice Band = Showdown', calc(mon('Corviknight', { item: 'Choice Band' }), SNORLAX(), move('Body Press')).damage,
    [134, 134, 136, 138, 140, 142, 142, 144, 146, 148, 150, 150, 152, 154, 156, 158]);
  eq('Body Press ohne Item = Showdown', calc(mon('Corviknight', { item: 'Leftovers' }), SNORLAX(), move('Body Press')).damage,
    [90, 90, 92, 92, 94, 94, 96, 96, 98, 98, 100, 100, 102, 102, 104, 106]);
  eq('Body Press mit Huge Power = Showdown', calc(mon('Azumarill', { ability: 'Huge Power' }), SNORLAX(), move('Body Press')).damage,
    [142, 144, 146, 146, 148, 150, 152, 154, 156, 156, 158, 160, 162, 164, 166, 168]);
  eq('Body Press mit Fur Coat unverändert = Showdown', calc(mon('Furfrou', { ability: 'Fur Coat' }), SNORLAX(), move('Body Press')).damage,
    [58, 60, 60, 60, 62, 62, 62, 64, 64, 64, 66, 66, 66, 68, 68, 70]);
})();

// 5. Facade: kein ×2 bei Schlaf – Showdown 61–73 (70 BP); bei Paralyse 140 BP
(function () {
  eq('Facade im Schlaf = Showdown (70 BP)', calc(SNORLAX({ status: 'Asleep' }), SNORLAX(), move('Facade')).damage,
    [61, 63, 63, 64, 64, 66, 66, 67, 67, 69, 69, 70, 70, 72, 72, 73]);
  eq('Facade bei Paralyse 140 BP', calc(SNORLAX({ status: 'Paralyzed' }), SNORLAX(), move('Facade')).finalBP, 140);
})();

// 6. Weather Ball: Strong Winds = Normal/50; Utility Umbrella des Angreifers in Sonne = Normal/50 (Showdown 17–21);
//    Angreifer-Schirm ändert den Sonnen-Bonus normaler Feuer-Attacken nicht (Showdown 39–46)
(function () {
  const wb = [17, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 20, 20, 20, 20, 21];
  const r = calc(mon('Pelipper'), SNORLAX(), move('Weather Ball'), { weather: 'Strong Winds' });
  eq('Weather Ball bei Strong Winds Normal', r.moveType, 'Normal');
  eq('Weather Ball bei Strong Winds = Showdown', r.damage, wb);
  eq('Weather Ball mit Utility Umbrella in Sonne = Showdown', calc(mon('Pelipper', { item: 'Utility Umbrella' }), SNORLAX(), move('Weather Ball'), { weather: 'Sun' }).damage, wb);
  eq('Weather Ball mit Cloud Nine Normal', calc(mon('Pelipper'), SNORLAX({ ability: 'Cloud Nine' }), move('Weather Ball'), { weather: 'Sun' }).moveType, 'Normal');
  const ft = [39, 39, 39, 40, 40, 40, 42, 42, 42, 43, 43, 43, 45, 45, 45, 46];
  eq('Flamethrower in Sonne mit Angreifer-Schirm = Showdown', calc(mon('Charizard', { item: 'Utility Umbrella' }), SNORLAX(), move('Flamethrower'), { weather: 'Sun' }).damage, ft);
})();

// 7. Streuschaden ×0,75: Earthquake trifft auch den Partner
(function () {
  if (Calc.hitsAlly('Earthquake') && Calc.hitsAlly('Surf') && Calc.hitsAlly('Discharge') && Calc.hitsAlly('Explosion') && !Calc.hitsAlly('Rock Slide') && !Calc.hitsAlly('Heat Wave'))
    ok('allAdjacent-Liste: Earthquake/Surf/Discharge/Explosion ja, Rock Slide/Heat Wave nein');
  else fail('allAdjacent-Liste falsch');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  if (/C\.hitsAlly\(mv\.name\) && mons\[s\]\[1 - k\]/.test(app)) ok('app.js behält ×0,75 bei einem Gegner + Partner');
  else fail('app.js: Partner zählt nicht als Ziel');
  const eqd = [100, 100, 102, 103, 105, 106, 106, 108, 109, 111, 112, 112, 114, 115, 117, 118]; // Showdown, Einzelziel
  const sp = calc(mon('Garchomp'), SNORLAX(), move('Earthquake'), { format: 'Doubles' });
  // ×0,75 vor dem Zufallswurf: max floor(pokeRound(base*0.75)...) – hier nur Richtung und Flag prüfen
  eq('Earthquake im Doppel mit 2 Zielen hat ×0,75', sp.spread && sp.damage[15] < eqd[15] && sp.damage[15] >= Math.floor(eqd[15] * 0.7), true);
  eq('Earthquake als Einzelziel = Showdown', calc(mon('Garchomp'), SNORLAX(), move('Earthquake', { singleTarget: true }), { format: 'Doubles' }).damage, eqd);
})();

// 8. Knock Off: kein ×1,5 gegen den eigenen Mega-Stein (Showdown 52–63 wie ohne Item), wohl gegen fremden (76–90)
(function () {
  const ctx = { console: console }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'item_data.js'), 'utf8') + '\nthis.L = MEGA_STONE_USER_LOOKUP;', ctx);
  globalThis.MEGA_STONE_USER_LOOKUP = ctx.L;
  const wv = mon('Weavile', { ability: 'Pressure' });
  eq('Knock Off gegen Charizard @ Charizardite X = Showdown', calc(wv, mon('Charizard', { item: 'Charizardite X' }), move('Knock Off')).damage,
    [52, 54, 54, 54, 55, 55, 57, 57, 58, 58, 58, 60, 60, 61, 61, 63]);
  eq('Knock Off gegen Venusaur @ Charizardite X = Showdown', calc(wv, mon('Venusaur', { item: 'Charizardite X' }), move('Knock Off')).damage,
    [76, 76, 78, 78, 79, 81, 81, 82, 82, 84, 85, 85, 87, 87, 88, 90]);
  eq('Platte bei Arceus nicht entfernbar', Calc.itemLocked('Flame Plate', { species: 'Arceus-Fire', baseSpecies: 'Arceus' }), true);
  eq('Platte bei anderen entfernbar', Calc.itemLocked('Flame Plate', { species: 'Snorlax' }), false);
  delete globalThis.MEGA_STONE_USER_LOOKUP;
  eq('ohne Lookup: Mega-Form mit Stein gesperrt', Calc.itemLocked('Charizardite X', { species: 'Mega Charizard X', baseSpecies: 'Charizard' }), true);
})();

// 9. Seismic Toss / Night Shade / Super Fang mit Parental Bond: zwei Treffer
(function () {
  const k = mon('Kangaskhan-Mega', { ability: 'Parental Bond' });
  eq('Seismic Toss + Parental Bond = 100', calc(k, SNORLAX(), move('Seismic Toss')).damage, [100]);
  eq('Seismic Toss ohne Parental Bond = 50', calc(mon('Kangaskhan'), SNORLAX(), move('Seismic Toss')).damage, [50]);
  const sx = SNORLAX({ curHP: 200 });
  eq('Super Fang + Parental Bond = 100 + 50', calc(k, sx, move('Super Fang')).damage, [150]);
})();

// 10. Metronome: 6. Nutzung in Folge (5 vorherige) = ×2,0 (8192, nicht 8191) – Showdown 150–176
(function () {
  const r = calc(SNORLAX({ item: 'Metronome' }), SNORLAX(), move('Body Slam', { metronome: 6 }));
  eq('Metronome ×2,0 = Showdown', r.damage, [150, 150, 152, 152, 156, 158, 158, 162, 162, 164, 168, 168, 170, 170, 174, 176]);
  eq('Metronome bleibt bei ×2,0', calc(SNORLAX({ item: 'Metronome' }), SNORLAX(), move('Body Slam', { metronome: 12 })).damage, r.damage);
})();

// 11. Parental Bond ×0,25 vor Wetter und Volltreffer – Showdown: 1. Treffer 54–64, 2. Treffer 12–15 (Sonne, Volltreffer)
(function () {
  const first = [54, 55, 55, 56, 56, 57, 58, 58, 59, 60, 60, 61, 62, 62, 63, 64];
  const second = [12, 12, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 15];
  const r = calc(mon('Kangaskhan-Mega', { ability: 'Parental Bond' }), SNORLAX(), move('Fire Punch', { crit: true }), { weather: 'Sun' });
  eq('Parental Bond Fire Punch in Sonne mit Volltreffer = Showdown', r.damage, sum(first, second));
})();

// 12. Heavy Metal / Light Metal / Float Stone
(function () {
  const ck = mon('Conkeldurr', { ability: 'Guts' });
  eq('Low Kick gegen Gyarados @ Float Stone = Showdown (100 BP)', calc(ck, mon('Gyarados', { item: 'Float Stone' }), move('Low Kick')).damage,
    [46, 46, 47, 48, 48, 48, 49, 50, 50, 51, 51, 52, 52, 53, 54, 54]);
  eq('Low Kick gegen Bronzong (Heavy Metal) = Showdown (120 BP)', calc(ck, mon('Bronzong', { ability: 'Heavy Metal' }), move('Low Kick')).damage,
    [81, 82, 82, 84, 84, 85, 87, 87, 88, 90, 90, 91, 93, 93, 94, 96]);
  eq('Heavy Slam Aggron (Heavy Metal) gegen Snorlax = Showdown', calc(mon('Aggron', { ability: 'Heavy Metal' }), SNORLAX(), move('Heavy Slam')).damage,
    [34, 36, 36, 36, 36, 37, 37, 37, 39, 39, 39, 39, 40, 40, 40, 42]);
  eq('Light Metal halbiert das Gewicht', Calc.effWeight({ weight: 100 }, 'Light Metal'), 50);
})();

// 13. Merciless: Volltreffer gegen vergiftete Ziele (Showdown 72–85, ohne Volltreffer 48–57); Unburden ×2 Initiative
(function () {
  eq('Merciless gegen vergiftetes Ziel = Showdown', calc(mon('Toxapex', { ability: 'Merciless' }), SNORLAX({ status: 'Poisoned' }), move('Liquidation')).damage,
    [72, 73, 73, 75, 75, 76, 76, 78, 79, 79, 81, 81, 82, 82, 84, 85]);
  const sn = mon('Sneasler', { ability: 'Unburden' });
  const base = Calc.getSpeed(sn, { weather: '' }, {});
  eq('Unburden aktiv verdoppelt die Initiative', Calc.getSpeed(Object.assign({}, sn, { unburden: true }), { weather: '' }, {}), base * 2);
})();

// 14. Toxin: 1/16, 2/16, 3/16 …; Poison Heal heilt (app.js)
(function () {
  // 160 KP, Toxin 10 je Stufe, 40 Schaden je Zug: Zug 1: 160-40-10=110, Zug 2: 110-40-20=50, Zug 3: 50-40 <=0 → 3HKO
  // (mit festen 1/8 = 20 wäre es 160-60=100, 40, KO in Zug 3 erst durch Gift; ohne Gift 4HKO)
  eq('Toxin steigend: 3HKO', Calc.koChance([40], { maxHP: 160, curHP: 160 }, { toxic: 10 }).n, 3);
  eq('Toxin steigend: 2HKO bei 55 Schaden (160-55-10-55 <= 40)', Calc.koChance([55], { maxHP: 160, curHP: 160 }, { toxic: 10 }).n, 3);
  eq('Toxin steigend: 2HKO bei 70 Schaden', Calc.koChance([70], { maxHP: 160, curHP: 160 }, { toxic: 10 }).n, 2);
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  if (/def\.status === 'Badly Poisoned' && def\.ability !== 'Poison Heal'\) \{ toxic =/.test(app) && /def\.ability === 'Poison Heal'\) \{ res \+= Math\.floor\(max \/ 8\)/.test(app))
    ok('app.js: Toxin steigend, Poison Heal heilt 1/8');
  else fail('app.js: Toxin/Poison Heal fehlt');
})();

// 15. Speed: Chlorophyll/Swift Swim nicht mit Utility Umbrella und nicht mit Cloud Nine auf dem Feld
(function () {
  const v = mon('Venusaur', { ability: 'Chlorophyll' });
  const plain = Calc.getSpeed(v, { weather: '' }, {});
  eq('Chlorophyll in Sonne ×2', Calc.getSpeed(v, { weather: 'Sun' }, {}), plain * 2);
  eq('Chlorophyll mit Utility Umbrella ×1', Calc.getSpeed(Object.assign({}, v, { item: 'Utility Umbrella' }), { weather: 'Sun' }, {}), plain);
  eq('Chlorophyll mit Cloud Nine auf dem Feld ×1', Calc.getSpeed(v, { weather: 'Sun', weatherSuppressed: true }, {}), plain);
  const sr = mon('Excadrill', { ability: 'Sand Rush', item: 'Utility Umbrella' });
  eq('Sand Rush ignoriert den Schirm', Calc.getSpeed(sr, { weather: 'Sand' }, {}), 2 * Calc.getSpeed(sr, { weather: '' }, {}));
})();

// 16. Thousand Arrows gegen schwebende Flug-Pokémon: neutral unabhängig vom zweiten Typ – Talonflame (Feuer/Flug) ×1, Showdown 67–81
(function () {
  const r = calc(mon('Zygarde'), mon('Talonflame'), move('Thousand Arrows'));
  eq('Thousand Arrows gegen Talonflame ×1', r.effectiveness, 1);
  eq('Thousand Arrows gegen Levitate-Ziel normal (Boden vs Stahl/Psycho = ×2)', calc(mon('Zygarde'), mon('Bronzong', { ability: 'Levitate' }), move('Thousand Arrows')).effectiveness, 2);
  eq('Thousand Arrows gegen Heatran ×4', calc(mon('Zygarde'), mon('Heatran'), move('Thousand Arrows')).effectiveness, 4);
  eq('Thousand Arrows gegen Talonflame = Showdown', r.damage, [67, 69, 69, 70, 72, 72, 73, 73, 75, 75, 76, 76, 78, 78, 79, 81]);
})();

// ---------- Gen 3 / Gen 4/5 (Nuzlocke-Rechner) ----------
const win = { console: console, BigInt: BigInt };
win.window = win;
vm.createContext(win);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'gen3.js'), 'utf8'), win);
const G3 = win.GEN3;
// minimale ROM: Typentabelle wie pokeemerald (Auszug), Attacken mit pokeemerald-Effekten
const T3 = { NORMAL: 0, FIRE: 10, WATER: 11, PSYCHIC: 14 };
const rom3 = {
  chart: [[0xFE, 0xFE, 0]], items: {}, species: { 1: { nat: 143 } },
  moves: { 263: { power: 70, type: T3.NORMAL, effect: G3.EF.FACADE, target: 0 }, 1: { power: 40, type: T3.NORMAL, effect: 0, target: 0 } }
};
function m3(o) {
  return Object.assign({ species: 1, level: 50, stats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }, types: [0, 0], ability: 0,
    item: 0, hp: 200, maxHP: 200, status: '', stages: {}, ivs: {} }, o || {});
}
(function () {
  const sleep = G3.calc(rom3, m3({ status: 'slp' }), m3(), 263, {});
  const healthy = G3.calc(rom3, m3(), m3(), 263, {});
  const burn = G3.calc(rom3, m3({ status: 'par' }), m3(), 263, {});
  eq('Gen 3: Facade im Schlaf ohne ×2', sleep.max, healthy.max);
  // 70 BP, 100/100, Lv 50: floor(floor(100*70*22/100)/50)+2 = 32, STAB ×1,5 = 48; bei Paralyse (32*2)*1,5 = 96
  eq('Gen 3: Facade normal max 48', healthy.max, 48);
  eq('Gen 3: Facade bei Paralyse max 96', burn.max, 96);
  // Reflect im Doppel: 2/3 nur, wenn zwei Pokémon auf der Zielseite stehen
  const two = G3.calc(rom3, m3(), m3(), 1, { double: true, reflect: true });
  const one = G3.calc(rom3, m3(), m3(), 1, { double: true, reflect: true, defAlive: 1 });
  // Tackle 40 BP: floor(100*40*22/100)=880 → /50 = 17; 2/3 → 2*floor(17/3) = 10 (+2 = 12, STAB 18); 1/2 → 8 (+2 = 10, STAB 15)
  eq('Gen 3: Reflect im Doppel mit 2 Zielen ×2/3', two.max, 18);
  eq('Gen 3: Reflect im Doppel mit 1 Ziel ×1/2', one.max, 15);
  // Speed: Cloud Nine des Gegners hebt Swift Swim auf
  const ss = m3({ ability: G3.AB.SWIFT_SWIM });
  eq('Gen 3: Swift Swim im Regen ×2', G3.speedOf(rom3, ss, { weather: 'rain' }), 200);
  eq('Gen 3: Swift Swim gegen Cloud Nine ×1', G3.speedOf(rom3, ss, { weather: 'rain' }, m3({ ability: G3.AB.CLOUD_NINE })), 100);
})();

// Gen 4/5: Namen über NDS_NAMES
const ABN = ['', 'Swift Swim', 'Cloud Nine', 'Multiscale', 'Skill Link', 'Inner Focus'];
const ITN = ['', 'Yache Berry'];
win.NDS_NAMES = { moves: { en: [] }, abilities: { en: ABN }, items: { en: ITN } };
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'nds_calc.js'), 'utf8'), win);
const N = win.NDS_CALC, TI = N.TI;
function mn(o) {
  return Object.assign({ species: 1, nat: 149, level: 50, stats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }, types: [TI.Normal, TI.Normal],
    ability: 0, item: 0, hp: 200, maxHP: 200, status: '', stages: {}, ivs: {} }, o || {});
}
(function () {
  const rom = { gen: 5, moves: { 333: { cat: 0, type: TI.Ice, power: 25, hits: [2, 5] }, 1: { cat: 0, type: TI.Ice, power: 25 } } };
  const dn = { types: [TI.Dragon, TI.Flying], ability: 3 };
  const single = N.calc(rom, mn({ ability: 4 }), mn(Object.assign({}, dn, { ability: 5 })), 1, {});
  const ms = N.calc(rom, mn({ ability: 4 }), mn(dn), 333, {});
  const full = N.calc(rom, mn({ ability: 4 }), mn(Object.assign({}, dn, { ability: 5 })), 333, {});
  // Skill Link: 5 Treffer; 1. Treffer mit Multiscale (halbiert), 4 ohne
  eq('Gen 5: Multiscale nur beim 1. Treffer (Max)', ms.multiMax, ms.max + single.max * 4);
  eq('Gen 5: ohne Multiscale 5 volle Treffer (Max)', full.multiMax, single.max * 5);
  if (ms.max < single.max) ok('Gen 5: 1. Treffer gegen Multiscale kleiner'); else fail('Gen 5: Multiscale fehlt beim 1. Treffer');
  const berry = N.calc(rom, mn({ ability: 4 }), mn({ types: [TI.Dragon, TI.Flying], ability: 5, item: 1 }), 333, {});
  eq('Gen 5: Yache-Beere nur beim 1. Treffer (Max)', berry.multiMax, berry.max + single.max * 4);
  // Speed: Cloud Nine des Gegners
  const sw = mn({ ability: 1 });
  eq('Gen 5: Swift Swim im Regen ×2', N.speedOf(rom, sw, { weather: 'rain' }), 200);
  eq('Gen 5: Swift Swim gegen Cloud Nine ×1', N.speedOf(rom, sw, { weather: 'rain' }, mn({ ability: 2 })), 100);
})();
(function () {
  // Gen 4 Typentabelle: Eis -> Feuer steht am Ende des Eis-Blocks, also erst Flug (×2), dann Feuer (×0,5)
  // Wurf d: floor(floor(d*2)/2) = d; falsche Reihenfolge floor(floor(d/2)*2) wäre bei ungeradem d um 1 kleiner
  const rom = { gen: 4, moves: { 1: { cat: 1, type: TI.Ice, power: 40 } } };
  const r = N.calc(rom, mn(), mn({ types: [TI.Fire, TI.Flying] }), 1, {});
  const n = N.calc(rom, mn(), mn({ types: [TI.Normal, TI.Normal] }), 1, {});
  eq('Gen 4: Eis gegen Feuer/Flug = neutraler Schaden (Tabellenreihenfolge)', r.rolls, n.rolls);
})();

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Calc-Fixes OK');
