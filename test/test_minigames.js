// Minigame logic: speed ties, German/English names, hint scoring, and damage via Calc.calculate.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/calc.js'), 'utf8'), ctx);
const Calc = ctx.Calc;
const MG = require(path.join(root, 'js/minigames.js'));
assert.ok(Calc && typeof Calc.calculate === 'function', 'Calc.calculate');

const dex = {
  Pikachu: { t1: 'Electric', bs: { hp: 35, at: 55, df: 40, sa: 50, sd: 50, sp: 90 }, ab: 'Static', w: 6, canEvolve: true },
  Raichu: { t1: 'Electric', bs: { hp: 60, at: 90, df: 55, sa: 90, sd: 80, sp: 110 }, ab: 'Static', w: 30 },
  Jolteon: { t1: 'Electric', bs: { hp: 65, at: 65, df: 60, sa: 110, sd: 95, sp: 130 }, ab: 'Volt Absorb', w: 24.5 },
  Slowpoke: { t1: 'Water', t2: 'Psychic', bs: { hp: 90, at: 65, df: 65, sa: 40, sd: 40, sp: 15 }, ab: 'Oblivious', w: 36, canEvolve: true },
  Slowbro: { t1: 'Water', t2: 'Psychic', bs: { hp: 95, at: 75, df: 110, sa: 100, sd: 80, sp: 30 }, ab: 'Oblivious', w: 78.5 },
  Snorlax: { t1: 'Normal', bs: { hp: 160, at: 110, df: 65, sa: 65, sd: 110, sp: 30 }, ab: 'Immunity', w: 460 },
  Chikorita: { t1: 'Grass', bs: { hp: 45, at: 49, df: 65, sa: 49, sd: 65, sp: 45 }, ab: 'Overgrow', w: 6.4, canEvolve: true },
  Meganium: { t1: 'Grass', bs: { hp: 80, at: 82, df: 100, sa: 83, sd: 100, sp: 80 }, ab: 'Overgrow', w: 100.5 },
  'Totem Dummy': { t1: 'Normal', bs: { hp: 50, at: 50, df: 50, sa: 50, sd: 50, sp: 50 }, ab: 'Sturdy', w: 10 }
};
const moves = {
  Thunderbolt: { bp: 90, type: 'Electric', category: 'Special' },
  'Quick Attack': { bp: 40, type: 'Normal', category: 'Physical' },
  'Thunder Wave': { bp: 0, type: 'Electric', category: 'Status' },
  'Ice Beam': { bp: 90, type: 'Ice', category: 'Special' },
  'Body Slam': { bp: 85, type: 'Normal', category: 'Physical' },
  'Fury Swipes': { bp: 18, type: 'Normal', category: 'Physical', hitRange: [2, 5] }
};
const learn = {
  pikachu: 'thunderbolt quickattack thunderwave furyswipes',
  slowbro: 'icebeam',
  snorlax: 'bodyslam',
  jolteon: 'thunderbolt',
  chikorita: 'bodyslam',
  meganium: 'bodyslam'
};
const namesDe = { species: { pikachu: 'Pikachu', raichu: 'Raichu', jolteon: 'Blitza', slowpoke: 'Flegmon', slowbro: 'Lahmus', snorlax: 'Relaxo', chikorita: 'Endivie', meganium: 'Meganie' } };
const genOf = function (name) {
  return { Pikachu: 1, Raichu: 1, Jolteon: 1, Slowpoke: 1, Slowbro: 1, Snorlax: 1, Chikorita: 2, Meganium: 2 }[name] || 0;
};
const mem = {};
const storage = { getItem: function (k) { return mem[k] == null ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); } };
const api = MG.create({ dex: dex, moves: moves, learn: learn, namesDe: namesDe, calc: Calc, genOf: genOf, storage: storage });

const tie = api.judgeSpeed({ leftSpeed: 30, rightSpeed: 30 }, 'tie');
assert.strictEqual(tie.truth, 'tie');
assert.strictEqual(tie.correct, true);
assert.strictEqual(api.judgeSpeed({ leftSpeed: 30, rightSpeed: 30 }, 'left').correct, false);
assert.strictEqual(api.judgeSpeed({ leftSpeed: 30, rightSpeed: 30 }, 'right').correct, false);
assert.deepStrictEqual(api.judgeSpeed({ leftSpeed: 110, rightSpeed: 30 }, 'left'), { truth: 'left', correct: true });
assert.deepStrictEqual(api.judgeSpeed({ leftSpeed: 30, rightSpeed: 110 }, 'right'), { truth: 'right', correct: true });
assert.strictEqual(api.judgeSpeed({ leftSpeed: 110, rightSpeed: 30 }, 'tie').correct, false);

const evolved = api.buildPool({ evolved: true });
assert.ok(evolved.every(function (p) { return !p.canEvolve; }), 'fully evolved');
assert.ok(!evolved.some(function (p) { return p.name === 'Pikachu' || p.name === 'Slowpoke' || p.name === 'Chikorita'; }));
assert.ok(evolved.some(function (p) { return p.name === 'Slowbro'; }));
assert.ok(!api.buildPool({}).some(function (p) { return p.name === 'Totem Dummy'; }), 'unreleased/invalid form skipped');
const gen2 = api.buildPool({ gen: 2 });
assert.deepStrictEqual(gen2.map(function (p) { return p.name; }), ['Chikorita', 'Meganium']);

const tiePool = api.buildPool({ evolved: true }).filter(function (p) { return p.name === 'Slowbro' || p.name === 'Snorlax'; });
const tieRound = api.makeSpeedRound(tiePool, function () { return 0; });
assert.strictEqual(tieRound.leftSpeed, tieRound.rightSpeed);
assert.strictEqual(api.judgeSpeed(tieRound, 'tie').correct, true);

const all = api.buildPool({});
assert.strictEqual(api.matchQuiz('Lahmus', 'Slowbro', all).kind, 'correct');
assert.strictEqual(api.matchQuiz('slowbro', 'Slowbro', all).kind, 'correct');
assert.strictEqual(api.matchQuiz('Relaxo', 'Snorlax', all).kind, 'correct');
assert.strictEqual(api.matchQuiz('Snorlax', 'Snorlax', all).kind, 'correct');
assert.strictEqual(api.matchQuiz('Relaxo', 'Slowbro', all).kind, 'wrong');
assert.strictEqual(api.matchQuiz('keinpokemon', 'Slowbro', all).kind, 'unknown');
assert.ok(api.suggest('lah', all, 8).some(function (p) { return p.name === 'Slowbro'; }));

assert.strictEqual(api.quizPoints({}, 0), 100);
assert.strictEqual(api.quizPoints({ type: true }, 0), 100 - api.HINTS.type);
assert.ok(api.quizPoints({ type: true, gen: true, sprite: true }, 0) < api.quizPoints({ type: true }, 0));
assert.strictEqual(api.quizPoints({}, 2), 80);

const dmgMoves = api.damagingMoves('Pikachu');
assert.ok(dmgMoves.indexOf('Thunderbolt') !== -1);
assert.ok(dmgMoves.indexOf('Quick Attack') !== -1);
assert.strictEqual(dmgMoves.indexOf('Thunder Wave'), -1, 'status move');
assert.strictEqual(dmgMoves.indexOf('Fury Swipes'), -1, 'multi-hit');

const sc = api.buildDamageScenario({ pool: all, attacker: 'Pikachu', defender: 'Slowbro', move: 'Thunderbolt', item: '(none)', weather: 'None' });
assert.strictEqual(sc.format, 'Singles');
assert.strictEqual(sc.level, Calc.LEVEL);
assert.strictEqual(sc.attacker.nature, 'Hardy');
assert.strictEqual(sc.attacker.stats.hp, Calc.calcStat('hp', 35, 0, 'Hardy', 'Pikachu'));
let calls = 0;
const orig = Calc.calculate;
Calc.calculate = function () { calls++; return orig.apply(Calc, arguments); };
const truth = api.evaluateDamage(sc);
assert.strictEqual(calls, 1, 'evaluateDamage must call Calc.calculate');
const direct = orig(sc.attacker, sc.defender, sc.move, sc.field, sc.aSide, sc.dSide);
assert.deepStrictEqual(truth.rolls, direct.damage);
assert.ok(truth.rolls.length >= 2 && truth.max >= truth.min && truth.max > 0);
const inside = api.scoreDamage((truth.minPct + truth.maxPct) / 2, truth.minPct, truth.maxPct);
assert.strictEqual(inside.distance, 0);
assert.strictEqual(inside.points, 100);
const off = api.scoreDamage(truth.maxPct + 40, truth.minPct, truth.maxPct);
assert.ok(Math.abs(off.distance - 40) < 0.11);
assert.ok(off.points < 100);

calls = 0;
const rolled = api.makeDamageScenario(all, function () { return 0; });
assert.ok(calls >= 1, 'scenario generation uses Calc.calculate');
assert.strictEqual(rolled.attackerName, 'Chikorita');
assert.notStrictEqual(rolled.defenderName, rolled.attackerName);
assert.strictEqual(rolled.move.category === 'Physical' || rolled.move.category === 'Special', true);
assert.ok(rolled.move.bp >= 40);
assert.ok(rolled.item === '(none)' || rolled.item === 'Life Orb' || rolled.item);
assert.ok(rolled.weather === 'None' || rolled.weather === 'Sun' || rolled.weather === 'Rain');

api.recordSpeed(true);
api.recordSpeed(true);
let st = api.load();
assert.strictEqual(st.speed.score, 2);
assert.strictEqual(st.speed.streak, 2);
assert.strictEqual(st.speed.high, 2);
api.recordSpeed(false);
st = api.load();
assert.strictEqual(st.speed.streak, 0);
assert.strictEqual(st.speed.high, 2, 'highscore keeps the best streak');
api.recordQuiz(70);
api.recordQuiz(40);
st = api.load();
assert.strictEqual(st.quiz.score, 110);
assert.strictEqual(st.quiz.high, 70);
assert.strictEqual(JSON.parse(mem[MG.KEY]).quiz.high, 70);
api.saveOpts({ gen: 2, evolved: true });
assert.strictEqual(api.load().opts.gen, 2);
assert.strictEqual(api.load().opts.evolved, true);
assert.strictEqual(api.load().speed.high, 2, 'options do not wipe scores');

console.log('Minigames-Test OK');
