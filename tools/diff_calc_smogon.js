// Differenztest: Champions-Engine (js/calc.js) gegen @smogon/calc (Basis des NCP-Calcs).
// Aufruf: node tools/diff_calc_smogon.js [anzahl] [seed]
// Referenz liegt außerhalb des Projekts: C:\Users\jerem\Projekte\_refs\smogon-calc (npm i @smogon/calc).
// Smogon bekommt unsere Basiswerte, Typen, Gewichte und Attackenwerte als Overrides, damit nur Rechenlogik verglichen wird.
const path = require('path'), fs = require('fs'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const S = require(process.env.SMOGON_CALC || 'C:/Users/jerem/Projekte/_refs/smogon-calc/node_modules/@smogon/calc');
globalThis.gen = 10; // wie js/shim.js
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'data/item_data.js'), 'utf8') + ';globalThis.getFlingPower = getFlingPower;', { filename: 'item_data.js' });
const Calc = require(path.join(ROOT, 'js/calc.js'));

const { DEX, MOVES } = require('./ncp_data.js');

// --- Zufall ---
let seed = +(process.argv[3] || 12345);
function rnd() { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function chance(p) { return rnd() < p; }

// Gen 0 = Champions-Mechanik in @smogon/calc (Lv 50, Stat Points statt EVs). DATA=1: ohne Overrides, prüft auch die Daten.
const gen = S.Generations.get(0);
const DATA = !!process.env.DATA;
function toID(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
const SK = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };
const NATURES = Object.keys(Calc.NATURES);
const ABILITIES = ['Adaptability', 'Aerilate', 'Analytic', 'Blaze', 'Overgrow', 'Torrent', 'Swarm', 'Dragonize', 'Galvanize', 'Pixilate',
  'Refrigerate', 'Normalize', 'Guts', 'Huge Power', 'Pure Power', 'Hustle', 'Iron Fist', 'Mega Launcher', 'Sharpness', 'Strong Jaw',
  'Tough Claws', 'Reckless', 'Sheer Force', 'Technician', 'Sniper', 'Tinted Lens', 'Water Bubble', 'Steelworker', 'Transistor',
  "Dragon's Maw", 'Punk Rock', 'Solar Power', 'Sand Force', 'Toxic Boost', 'Flare Boost', 'Neuroforce', 'Gorilla Tactics',
  'Supreme Overlord', 'Orichalcum Pulse', 'Hadron Engine', 'Protosynthesis', 'Quark Drive', 'Mold Breaker', 'Scrappy', 'Mind\'s Eye',
  'Thick Fat', 'Multiscale', 'Fluffy', 'Fur Coat', 'Ice Scales', 'Filter', 'Solid Rock', 'Prism Armor', 'Heatproof', 'Dry Skin',
  'Purifying Salt', 'Marvel Scale', 'Levitate', 'Flash Fire', 'Water Absorb', 'Volt Absorb', 'Storm Drain', 'Sap Sipper', 'Lightning Rod',
  'Wonder Guard', 'Battle Armor', 'Unaware', 'Simple', 'Stakeout', 'Liquid Voice', 'Steely Spirit', 'Sword of Ruin', 'Tablets of Ruin',
  'Vessel of Ruin', 'Beads of Ruin', 'Fairy Aura', 'Dark Aura', 'Tera Shell', 'Grass Pelt', 'Defeatist', 'Slow Start', 'Hustle',
  'Pressure', 'Intimidate', 'Inner Focus', 'Sturdy', 'Parental Bond', 'Skill Link', 'Infiltrator', 'Merciless', 'Punk Rock', 'Bulletproof',
  'Soundproof', 'Well-Baked Body', 'Earth Eater', 'Motor Drive', 'Aura Break', 'Plus', 'Minus', 'Shadow Shield', 'Long Reach'];
const ITEMS = ['(none)', 'Life Orb', 'Choice Band', 'Choice Specs', 'Expert Belt', 'Muscle Band', 'Wise Glasses', 'Assault Vest',
  'Eviolite', 'Charcoal', 'Mystic Water', 'Miracle Seed', 'Magnet', 'Never-Melt Ice', 'Black Belt', 'Poison Barb', 'Soft Sand',
  'Sharp Beak', 'Twisted Spoon', 'Silver Powder', 'Hard Stone', 'Spell Tag', 'Dragon Fang', 'Black Glasses', 'Metal Coat', 'Silk Scarf',
  'Fairy Feather', 'Occa Berry', 'Passho Berry', 'Wacan Berry', 'Rindo Berry', 'Yache Berry', 'Chople Berry', 'Kebia Berry', 'Shuca Berry',
  'Coba Berry', 'Payapa Berry', 'Tanga Berry', 'Charti Berry', 'Kasib Berry', 'Haban Berry', 'Colbur Berry', 'Babiri Berry', 'Roseli Berry',
  'Chilan Berry', 'Punching Glove', 'Metronome', 'Light Ball', 'Thick Club', 'Leftovers', 'Sitrus Berry', 'Focus Sash', 'Air Balloon',
  'Iron Ball', 'Loaded Dice', 'Ability Shield', 'Utility Umbrella'];
// Nur in Champions legale Fähigkeiten/Items (die Champions-Mechanik von @smogon/calc kennt nur diese)
if (!process.env.WIDE) {
  ABILITIES.length = 0; [...gen.abilities].forEach(function (a) { if (a.name !== 'Rivalry') ABILITIES.push(a.name); });
  ITEMS.length = 0; ITEMS.push('(none)'); [...gen.items].forEach(function (i) { if (!/ite( [XYZ])?$/.test(i.name) || i.name === 'Eviolite') ITEMS.push(i.name); });
}
const WEATHERS = ['', '', 'Sun', 'Rain', 'Sand', 'Snow'];
const TERRAINS = ['', '', 'Electric', 'Grassy', 'Psychic', 'Misty'];
const STATUSES = ['Healthy', 'Healthy', 'Healthy', 'Burned', 'Poisoned', 'Badly Poisoned', 'Paralyzed', 'Asleep'];
const SM_STATUS = { Healthy: '', Burned: 'brn', Poisoned: 'psn', 'Badly Poisoned': 'tox', Paralyzed: 'par', Asleep: 'slp' };

const speciesNames = Object.keys(DEX).filter(function (k) { return DEX[k] && DEX[k].bs; });
const CONTEXT = ['Beat Up', 'Counter', 'Metal Burst', 'Mirror Coat', 'Comeuppance', 'Endeavor', 'Super Fang', 'Payback', 'Guillotine', 'Sheer Cold', 'Fissure', 'Horn Drill', 'Last Respects', 'Rage Fist', 'Stomping Tantrum', 'Temper Flare'];
const moveNames = Object.keys(MOVES).filter(function (k) {
  const m = MOVES[k]; if (CONTEXT.indexOf(k) !== -1) return false; return m && m.category && m.category !== 'Status' && (m.bp || 0) > 0;
});

function smogonSpecies(name) {
  const tries = [name, name + '-Shield', name.replace(/^Mega (.+?)( ([XYZ]))?$/, '$1-Mega$3').replace(/-Mega ([XYZ])$/, '-Mega-$1'), name.replace(/^Mega /, ''), name.split('-')[0]];
  for (const t of tries) { const s = gen.species.get(toID(t)); if (s) return s.name; }
  throw new Error('Spezies fehlt in @smogon/calc: ' + name);
}

function randMon(name) {
  const d = DEX[name];
  const sps = {}; let left = Calc.SP_TOTAL;
  Object.keys(SK).forEach(function (k) { const v = Math.min(left, chance(0.4) ? Math.floor(rnd() * (Calc.SP_MAX + 1)) : 0); sps[k] = v; left -= v; });
  const nature = pick(NATURES);
  const boosts = {}; Object.keys(SK).forEach(function (k) { if (k !== 'hp' && chance(0.15)) boosts[k] = Math.floor(rnd() * 13) - 6; });
  const ability = chance(0.5) ? (d.ab || pick(ABILITIES)) : pick(ABILITIES);
  const item = chance(0.5) ? '(none)' : pick(ITEMS);
  const status = pick(STATUSES);
  const stats = {}; Object.keys(SK).forEach(function (k) { stats[k] = Calc.calcStat(k, d.bs[k], sps[k], nature, name); });
  const types = [d.t1, d.t2].filter(Boolean);
  const hpPct = chance(0.7) ? 100 : Math.max(1, Math.floor(rnd() * 100));
  const curHP = Math.max(1, Math.floor(stats.hp * hpPct / 100));
  return { name, d, sps, nature, boosts, ability, item, status, stats, types, curHP };
}

function oursMon(m) {
  return { species: m.name, baseSpecies: m.name.replace(/^Mega /, '').replace(/ [XYZ]$/, ''), types: m.types.slice(), stats: m.stats,
    sps: m.sps, boosts: Object.assign({}, m.boosts), nature: m.nature, ability: m.ability, item: m.item, status: m.status,
    curHP: m.curHP, maxHP: m.stats.hp, weight: m.d.w || 50, canEvolve: !!m.d.canEvolve, moves: [], baseAtk: m.d.bs.at };
}
function smogonMon(m) {
  const evs = {}, boosts = {};
  Object.keys(SK).forEach(function (k) { evs[SK[k]] = m.sps[k]; if (m.boosts[k]) boosts[SK[k]] = m.boosts[k]; });
  const bs = {}; Object.keys(SK).forEach(function (k) { bs[SK[k]] = m.d.bs[k]; });
  return new S.Pokemon(gen, smogonSpecies(m.name), {
    nature: m.nature, evs, boosts, ability: m.ability, item: m.item === '(none)' ? undefined : m.item,
    status: SM_STATUS[m.status] || '', curHP: m.curHP, abilityOn: m.ability === 'Slow Start',
    overrides: DATA ? undefined : { baseStats: bs, types: m.types, weightkg: m.d.w || 50 }
  });
}

function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }
function flatDamage(dmg) {
  if (typeof dmg === 'number') return [dmg];
  if (Array.isArray(dmg[0])) { // pro Treffer: Summe je Wurf-Index (Näherung) — nur min/max vergleichen
    return dmg[0].map(function (_, i) { return sum(dmg.map(function (h) { return h[i]; })); });
  }
  return dmg;
}

module.exports = { DEX, MOVES, Calc, S, gen, smogonSpecies, oursMon, smogonMon, flatDamage };
if (require.main === module) main();
function main() {
const N = +(process.argv[2] || 3000);
const fails = [], groups = {};
let compared = 0, skipped = 0, errors = 0; const skipReasons = {};
for (let i = 0; i < N; i++) {
  const A = randMon(pick(speciesNames)), D = randMon(pick(speciesNames));
  const mvName = pick(moveNames), md = MOVES[mvName];
  const doubles = chance(0.5);
  const fieldO = { format: doubles ? 'Doubles' : 'Singles', weather: pick(WEATHERS), terrain: pick(TERRAINS), ruin: {}, gravity: chance(0.05) };
  [A, D].forEach(function (x) { const r = { 'Tablets of Ruin': 'tablets', 'Vessel of Ruin': 'vessel', 'Sword of Ruin': 'sword', 'Beads of Ruin': 'beads' }[x.ability]; if (r) fieldO.ruin[r] = true; });
  const crit = chance(0.1);
  const aSide = { helpingHand: doubles && chance(0.15) }, dSide = { reflect: chance(0.1), lightScreen: chance(0.1), friendGuard: doubles && chance(0.05) };
  const ourMove = Object.assign({}, md, { name: mvName, crit: crit, category: md.category, bp: md.bp, type: md.type });
  if (doubles && md.isSpread) ourMove.singleTarget = false;
  let ours, theirs;
  try {
    ours = Calc.calculate(oursMon(A), oursMon(D), ourMove, fieldO, aSide, dSide);
  } catch (e) { errors++; fails.push({ i, kind: 'ours-throw', err: String(e && e.stack || e).split('\n').slice(0, 3).join(' | '), mvName, a: A.name, d: D.name }); continue; }
  try {
    const sm = new S.Move(gen, mvName, { isCrit: crit, ability: A.ability, item: A.item === '(none)' ? undefined : A.item, species: smogonSpecies(A.name), overrides: DATA ? undefined : Object.assign({ basePower: md.bp, type: md.type }, (gen.moves.get(toID(mvName)) || {}).category !== md.category ? { category: md.category } : {}) });
    if (!gen.moves.get(toID(mvName))) { skipped++; continue; }
    const field = new S.Field({ gameType: doubles ? 'Doubles' : 'Singles', weather: ({ Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Snow: 'Snow' })[fieldO.weather],
      terrain: fieldO.terrain || undefined, isGravity: fieldO.gravity,
      attackerSide: { isHelpingHand: aSide.helpingHand },
      defenderSide: { isReflect: dSide.reflect, isLightScreen: dSide.lightScreen, isFriendGuard: dSide.friendGuard } });
    theirs = S.calculate(gen, smogonMon(A), smogonMon(D), sm, field);
  } catch (e) { skipped++; skipReasons[String(e.message).slice(0, 80)] = (skipReasons[String(e.message).slice(0, 80)] || 0) + 1; continue; }
  const a = ours.damage || [0], b = flatDamage(theirs.damage);
  compared++;
  const multi = Array.isArray(theirs.damage) && Array.isArray(theirs.damage[0]);
  const same = multi ? (Math.min.apply(null, a) === Math.min.apply(null, b) && Math.max.apply(null, a) === Math.max.apply(null, b))
    : JSON.stringify(a) === JSON.stringify(b);
  if (!same) {
    const f = { i, inp: { A: Object.assign({}, A, { d: undefined }), D: Object.assign({}, D, { d: undefined }), mvName, crit, fieldO, aSide, dSide }, a: A.name + ' [' + A.ability + ' / ' + A.item + ' / ' + A.status + ']', d: D.name + ' [' + D.ability + ' / ' + D.item + ' / ' + D.status + ']',
      move: mvName + (crit ? ' (crit)' : ''), field: [fieldO.format, fieldO.weather, fieldO.terrain, fieldO.gravity ? 'Gravity' : '', dSide.reflect ? 'Reflect' : '', dSide.lightScreen ? 'LS' : '', aSide.helpingHand ? 'HH' : '', dSide.friendGuard ? 'FG' : ''].filter(Boolean).join(','),
      ours: [Math.min.apply(null, a), Math.max.apply(null, a)], smogon: [Math.min.apply(null, b), Math.max.apply(null, b)], desc: theirs.desc ? (function () { try { return theirs.desc(); } catch (e) { return ''; } })() : '' };
    fails.push(f);
    [['aAb', A.ability], ['dAb', D.ability], ['aItem', A.item], ['dItem', D.item], ['move', mvName]].forEach(function (g) {
      const k = g[0] + ':' + g[1]; groups[k] = (groups[k] || 0) + 1;
    });
  }
}
console.log('verglichen ' + compared + ', übersprungen ' + skipped + ', Fehler (Exceptions) ' + errors + ', Abweichungen ' + (fails.length - errors));
Object.keys(skipReasons).slice(0, 15).forEach(function (k) { console.log('  übersprungen ' + skipReasons[k] + '×: ' + k); });
const top = Object.keys(groups).sort(function (x, y) { return groups[y] - groups[x]; }).slice(0, 40);
console.log('\nHäufigste Merkmale in Abweichungen:'); top.forEach(function (k) { console.log('  ' + groups[k] + '\t' + k); });
fs.writeFileSync(path.join(ROOT, 'tools/diff_calc_smogon.out.json'), JSON.stringify(fails, null, 1));
console.log('\nDetails: tools/diff_calc_smogon.out.json');
}
