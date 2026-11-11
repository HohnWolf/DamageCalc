// Minigames: Wer ist schneller?, Basiswerte-Quiz, Schadens-Schätzung.
// Damage totals always come from js/calc.js (Calc.calculate / Calc.calcStat). This file does not reimplement the formula.
(function (root) {
  'use strict';

  var KEY = 'cc_minigames';
  var GEN_MAX = [0, 151, 251, 386, 493, 649, 721, 809, 905, 1025];
  var STATS = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
  var HINTS = { type: 25, gen: 15, sprite: 35 };
  var QUIZ_BASE = 100;
  var QUIZ_MISS = 10;
  var FORM_DE = {
    Shield: 'Schild', Blade: 'Klinge', Wash: 'Wasch', Heat: 'Hitze', Frost: 'Frost', Fan: 'Wirbel', Mow: 'Schneid',
    Midday: 'Tag', Midnight: 'Nacht', Dusk: 'Zwielicht', Hero: 'Held', Hangry: 'Kohldampf', Average: 'Normal', Small: 'Klein', Large: 'Groß', Super: 'Riesig',
    Eternal: 'Ewig', Four: 'Vier', Combat: 'Kampf', Blaze: 'Feuer', Aqua: 'Wasser', Alola: 'Alola', Galar: 'Galar', Hisui: 'Hisui', Paldea: 'Paldea'
  };
  // Moves whose power is not fixed by the Pokémon, move and field we show. Multi-hit moves are excluded via hitRange.
  var SKIP_MOVES = {
    Struggle: 1, Return: 1, Frustration: 1, Flail: 1, Reversal: 1, Eruption: 1, 'Water Spout': 1,
    'Dragon Energy': 1, 'Electro Ball': 1, 'Gyro Ball': 1, 'Low Kick': 1, 'Grass Knot': 1,
    'Heavy Slam': 1, 'Heat Crash': 1, Punishment: 1, 'Stored Power': 1, 'Power Trip': 1,
    'Trump Card': 1, 'Wring Out': 1, 'Crush Grip': 1, 'Hard Press': 1, 'Last Respects': 1,
    'Rage Fist': 1, 'Fickle Beam': 1, Acrobatics: 1, Facade: 1, Hex: 1, Venoshock: 1,
    Payback: 1, Avalanche: 1, Assurance: 1, Pursuit: 1, Present: 1, Magnitude: 1,
    'Spit Up': 1, 'Natural Gift': 1, 'Hidden Power': 1, 'Weather Ball': 1, 'Terrain Pulse': 1,
    Psywave: 1, 'Seismic Toss': 1, 'Night Shade': 1, 'Super Fang': 1, Endeavor: 1,
    'Final Gambit': 1, Counter: 1, 'Mirror Coat': 1, 'Metal Burst': 1, Comeuppance: 1,
    'Sonic Boom': 1, 'Dragon Rage': 1, "Nature's Madness": 1, Ruination: 1, Fling: 1,
    'Beat Up': 1, 'Triple Axel': 1, 'Triple Kick': 1, 'Population Bomb': 1, Explosion: 1,
    'Self-Destruct': 1, 'Misty Explosion': 1, 'Mind Blown': 1, 'Steel Beam': 1, Chloroblast: 1,
    Guillotine: 1, Fissure: 1, 'Horn Drill': 1, 'Sheer Cold': 1, Belch: 1, Rollout: 1,
    'Ice Ball': 1, 'Revelation Dance': 1, Judgment: 1, 'Multi-Attack': 1, 'Techno Blast': 1,
    'Tera Blast': 1, 'Ivy Cudgel': 1, 'Raging Bull': 1, Poltergeist: 1, 'Steel Roller': 1
  };

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/['’]/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }
  function baseSpeciesName(name) {
    var m = /^Mega (.+?)(?: [XYZ])?$/.exec(name || '');
    if (m) return m[1];
    return name || '';
  }
  function genFromNumber(n) {
    for (var g = 1; g <= 9; g++) if (n <= GEN_MAX[g]) return g;
    return 9;
  }
  function indexNatdex(natdex) {
    var byNorm = {};
    if (!natdex) return byNorm;
    for (var i = 1; i < natdex.length; i++) {
      var e = natdex[i];
      if (!e) continue;
      var g = genFromNumber(i);
      byNorm[norm(e[0])] = g;
      byNorm[norm(e[1])] = g;
    }
    return byNorm;
  }
  function shId(name) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name || '');
    if (m) return norm(m[1]) + 'mega' + (m[2] ? m[2].toLowerCase() : '');
    return norm(name);
  }
  function germanName(name, namesDe, formDe) {
    var species = (namesDe && namesDe.species) || {};
    formDe = formDe || FORM_DE;
    var mega = /^Mega (.+?)( [XYZ])?$/.exec(name || '');
    if (mega) return 'Mega-' + (species[norm(mega[1])] || mega[1]) + (mega[2] || '');
    if (species[norm(name)]) return species[norm(name)];
    var i = String(name || '').indexOf('-');
    if (i > 0) {
      var base = name.slice(0, i), parts = name.slice(i + 1).split('-');
      return (species[norm(base)] || base) + '-' + parts.map(function (p) { return formDe[p] || p; }).join('-');
    }
    return name;
  }
  function aliasesOf(name, namesDe, formDe) {
    var set = {};
    function add(s) { var n = norm(s); if (n) set[n] = 1; }
    add(name);
    var de = germanName(name, namesDe, formDe);
    add(de);
    add(String(de).replace(/-/g, ' '));
    add(String(name).replace(/-/g, ' '));
    return Object.keys(set);
  }
  function sameStats(a, b) {
    if (!a || !b) return false;
    for (var i = 0; i < STATS.length; i++) if ((a.bs[STATS[i]] | 0) !== (b.bs[STATS[i]] | 0)) return false;
    return true;
  }
  function emptyState() {
    return {
      opts: { gen: 0, evolved: false },
      speed: { score: 0, streak: 0, high: 0 },
      quiz: { score: 0, high: 0 },
      damage: { score: 0, high: 0 }
    };
  }
  function num(n) { n = +n; return isFinite(n) && n > 0 ? Math.floor(n) : 0; }

  function create(deps) {
    deps = deps || {};
    var storage = deps.storage;
    if (!storage) {
      try { storage = (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { storage = null; }
    }
    if (!storage) {
      var mem = {};
      storage = { getItem: function (k) { return mem[k] == null ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); } };
    }
    var namesDe = deps.namesDe || {};
    var formDe = deps.formDe || FORM_DE;
    var genIndex = indexNatdex(deps.natdex);
    function genOf(name) {
      if (deps.genOf) return deps.genOf(name) || 0;
      var base = baseSpeciesName(name);
      return genIndex[norm(name)] || genIndex[norm(base)] || genIndex[norm(String(base).split('-')[0])] || 0;
    }
    var moveById = {};
    Object.keys(deps.moves || {}).forEach(function (n) { moveById[norm(n)] = n; });

    function learnKey(name) {
      var learn = deps.learn || {}, parent = deps.learnParent || {};
      var base = baseSpeciesName(name);
      var cands = [shId(name), norm(name), shId(base), norm(base), norm(String(base).replace(/-.*$/, ''))];
      for (var i = 0; i < cands.length; i++) {
        var k = cands[i];
        if (learn[k]) return k;
        if (parent[k] && learn[parent[k]]) return parent[k];
      }
      return null;
    }
    function isSensibleMove(name, m) {
      if (!m || SKIP_MOVES[name]) return false;
      if (m.category !== 'Physical' && m.category !== 'Special') return false;
      if (m.hitRange) return false;
      var bp = m.bp || 0;
      return bp >= 40 && bp <= 130;
    }
    function damagingMoves(name) {
      var key = learnKey(name);
      if (!key) return [];
      var seen = {}, out = [];
      String((deps.learn || {})[key] || '').split(' ').forEach(function (id) {
        var n = moveById[id];
        if (!n || seen[n]) return;
        if (!isSensibleMove(n, deps.moves[n])) return;
        seen[n] = 1;
        out.push(n);
      });
      return out;
    }
    function isPlayable(name, entry) {
      if (!name || !entry || !entry.bs) return false;
      if (/totem|gmax|eternamax|primal|crowned/i.test(name)) return false;
      for (var i = 0; i < STATS.length; i++) {
        if (typeof entry.bs[STATS[i]] !== 'number' || entry.bs[STATS[i]] < 1) return false;
      }
      return true;
    }
    function buildPool(opts) {
      opts = opts || {};
      var wantGen = +opts.gen || 0;
      var evolved = !!opts.evolved;
      var pool = [];
      Object.keys(deps.dex || {}).forEach(function (name) {
        var entry = deps.dex[name];
        if (!isPlayable(name, entry)) return;
        if (evolved && entry.canEvolve) return;
        var g = genOf(name);
        if (wantGen && g !== wantGen) return;
        var types = [];
        if (entry.t1) types.push(entry.t1);
        if (entry.t2 && entry.t2 !== entry.t1) types.push(entry.t2);
        var bs = {};
        STATS.forEach(function (s) { bs[s] = entry.bs[s]; });
        pool.push({
          name: name,
          bs: bs,
          types: types,
          gen: g,
          ability: entry.ab || '',
          weight: entry.w || 0,
          canEvolve: !!entry.canEvolve,
          aliases: aliasesOf(name, namesDe, formDe)
        });
      });
      pool.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
      return pool;
    }
    function pickTwo(pool, rng) {
      if (!pool || pool.length < 2) return null;
      var i = Math.floor(rng() * pool.length);
      var j = Math.floor(rng() * (pool.length - 1));
      if (j >= i) j++;
      return [pool[i], pool[j]];
    }
    function makeSpeedRound(pool, rng) {
      var pair = pickTwo(pool, rng || Math.random);
      if (!pair) return null;
      return { left: pair[0], right: pair[1], leftSpeed: pair[0].bs.sp, rightSpeed: pair[1].bs.sp };
    }
    // choice: 'left' | 'right' | 'tie'. Equal base Speed is a tie, not a coin flip.
    function judgeSpeed(round, choice) {
      var truth = round.leftSpeed === round.rightSpeed ? 'tie' : (round.leftSpeed > round.rightSpeed ? 'left' : 'right');
      return { truth: truth, correct: choice === truth };
    }
    function matchQuiz(guess, answerName, pool) {
      var g = norm(guess);
      if (!g) return { kind: 'empty' };
      var hits = [];
      (pool || []).forEach(function (p) { if (p.aliases.indexOf(g) !== -1) hits.push(p); });
      if (!hits.length) return { kind: 'unknown' };
      var answer = null;
      (pool || []).some(function (p) { if (p.name === answerName) { answer = p; return true; } return false; });
      var ok = hits.some(function (p) { return sameStats(p, answer); });
      return { kind: ok ? 'correct' : 'wrong', species: hits[0].name };
    }
    function suggest(query, pool, limit) {
      var q = norm(query);
      if (!q) return [];
      limit = limit || 8;
      var out = [];
      for (var i = 0; i < pool.length && out.length < limit; i++) {
        if (pool[i].aliases.some(function (a) { return a.indexOf(q) !== -1; })) out.push(pool[i]);
      }
      return out;
    }
    function quizPoints(hints, misses) {
      hints = hints || {};
      var p = QUIZ_BASE;
      Object.keys(HINTS).forEach(function (k) { if (hints[k]) p -= HINTS[k]; });
      p -= QUIZ_MISS * (misses || 0);
      return Math.max(0, p);
    }
    function findMon(pool, name) {
      for (var i = 0; i < pool.length; i++) if (pool[i].name === name) return pool[i];
      return null;
    }
    function typeItem(type) {
      var map = (deps.calc && deps.calc.TYPE_ITEMS) || {};
      var names = Object.keys(map);
      for (var i = 0; i < names.length; i++) if (map[names[i]] === type) return names[i];
      return '';
    }
    function toCalcMon(entry, item) {
      var C = deps.calc;
      var nature = 'Hardy';
      var stats = {};
      C.STAT_KEYS.forEach(function (s) { stats[s] = C.calcStat(s, entry.bs[s] || 1, 0, nature, entry.name); });
      return {
        species: entry.name, baseSpecies: baseSpeciesName(entry.name), types: entry.types.slice(),
        stats: stats, boosts: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
        nature: nature, ability: entry.ability || '', item: item || '(none)', status: 'Healthy',
        curHP: stats.hp, maxHP: stats.hp, weight: entry.weight || 50, canEvolve: !!entry.canEvolve, fainted: 0,
        sps: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }
      };
    }
    function blankField(weather) {
      return {
        format: 'Singles', weather: weather && weather !== 'None' ? weather : 'None', terrain: 'None', gravity: false,
        ruin: { tablets: false, vessel: false, sword: false, beads: false },
        fairyAura: false, darkAura: false, auraBreak: false
      };
    }
    function buildDamageScenario(spec) {
      var pool = spec.pool;
      var atk = findMon(pool, spec.attacker), def = findMon(pool, spec.defender);
      if (!atk || !def) return null;
      var moveName = spec.move;
      var src = (deps.moves && deps.moves[moveName]) || {};
      var move = {};
      Object.keys(src).forEach(function (k) { move[k] = src[k]; });
      move.name = moveName;
      move.crit = false;
      var field = blankField(spec.weather);
      return {
        attackerName: atk.name, defenderName: def.name, moveName: moveName,
        item: spec.item || '(none)', weather: field.weather, terrain: 'None', format: 'Singles',
        level: deps.calc.LEVEL, nature: 'Hardy', sp: 0,
        attacker: toCalcMon(atk, spec.item || '(none)'), defender: toCalcMon(def, '(none)'),
        move: move, field: field, aSide: {}, dSide: {}
      };
    }
    // The only damage path. Rolls, KO math and modifiers stay inside Calc.calculate.
    function evaluateDamage(scenario) {
      var calc = deps.calc;
      if (!calc || typeof calc.calculate !== 'function') throw new Error('Calc.calculate missing');
      var res = calc.calculate(scenario.attacker, scenario.defender, scenario.move, scenario.field, scenario.aSide, scenario.dSide);
      var rolls = (res && !res.empty && !res.status && res.damage && res.damage.length) ? res.damage.slice() : [0];
      var min = rolls[0], max = rolls[rolls.length - 1];
      var hp = scenario.defender.maxHP || 1;
      return { rolls: rolls, min: min, max: max, hp: hp, minPct: min / hp * 100, maxPct: max / hp * 100 };
    }
    function makeDamageScenario(pool, rng) {
      rng = rng || Math.random;
      if (!deps.calc || typeof deps.calc.calculate !== 'function') throw new Error('Calc.calculate missing');
      var last = null;
      for (var attempt = 0; attempt < 24; attempt++) {
        var pair = pickTwo(pool, rng);
        if (!pair) return null;
        var moves = damagingMoves(pair[0].name);
        if (!moves.length) continue;
        var moveName = moves[Math.floor(rng() * moves.length)];
        var move = deps.moves[moveName];
        var itemRoll = rng();
        var item = '(none)';
        if (itemRoll < 0.18) item = 'Life Orb';
        else if (itemRoll < 0.36) { var ti = typeItem(move.type); if (ti) item = ti; }
        var wRoll = rng();
        var weather = 'None';
        if (wRoll < 0.22) {
          if (move.type === 'Fire') weather = 'Sun';
          else if (move.type === 'Water') weather = 'Rain';
        }
        var sc = buildDamageScenario({ pool: pool, attacker: pair[0].name, defender: pair[1].name, move: moveName, item: item, weather: weather });
        if (!sc) continue;
        var truth = evaluateDamage(sc);
        last = sc;
        if (truth.max > 0 && truth.hp > 1) return sc;
      }
      return last;
    }
    function scoreDamage(guess, minPct, maxPct) {
      guess = +guess;
      if (!isFinite(guess)) guess = 0;
      var dist = guess < minPct ? (minPct - guess) : guess > maxPct ? (guess - maxPct) : 0;
      return { distance: Math.round(dist * 10) / 10, points: Math.max(0, Math.round(100 - dist * 2)) };
    }
    function load() {
      var e = emptyState();
      try {
        var raw = storage.getItem(KEY);
        var v = raw ? JSON.parse(raw) : null;
        if (!v || typeof v !== 'object') return e;
        if (v.opts) {
          var g = +v.opts.gen;
          e.opts.gen = g >= 1 && g <= 9 ? g : 0;
          e.opts.evolved = !!v.opts.evolved;
        }
        ['speed', 'quiz', 'damage'].forEach(function (k) {
          if (!v[k]) return;
          Object.keys(e[k]).forEach(function (f) { e[k][f] = num(v[k][f]); });
        });
      } catch (err) { /* keep defaults */ }
      return e;
    }
    function save(state) {
      try { storage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
      return state;
    }
    function saveOpts(opts) {
      var s = load();
      s.opts.gen = +opts.gen || 0;
      s.opts.evolved = !!opts.evolved;
      return save(s);
    }
    function recordSpeed(correct) {
      var s = load();
      if (correct) {
        s.speed.score++;
        s.speed.streak++;
        if (s.speed.streak > s.speed.high) s.speed.high = s.speed.streak;
      } else s.speed.streak = 0;
      save(s);
      return s.speed;
    }
    function recordPoints(bucket, points) {
      var s = load();
      points = num(points);
      s[bucket].score += points;
      if (points > s[bucket].high) s[bucket].high = points;
      save(s);
      return s[bucket];
    }

    return {
      KEY: KEY, HINTS: HINTS, STATS: STATS,
      buildPool: buildPool, makeSpeedRound: makeSpeedRound, judgeSpeed: judgeSpeed,
      matchQuiz: matchQuiz, suggest: suggest, quizPoints: quizPoints, germanName: function (name) { return germanName(name, namesDe, formDe); },
      damagingMoves: damagingMoves, buildDamageScenario: buildDamageScenario, makeDamageScenario: makeDamageScenario,
      evaluateDamage: evaluateDamage, scoreDamage: scoreDamage,
      load: load, saveOpts: saveOpts, recordSpeed: recordSpeed,
      recordQuiz: function (points) { return recordPoints('quiz', points); },
      recordDamage: function (points) { return recordPoints('damage', points); }
    };
  }

  var api = { KEY: KEY, HINTS: HINTS, create: create, norm: norm, germanName: germanName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CCMinigames = api;
})(typeof window !== 'undefined' ? window : globalThis);
