// Minigames: Wer ist schneller?, Basiswerte-Quiz, Schadens-Schätzung. Alle drei enden beim ersten Fehler; gezählt wird die Serie.
// Damage totals always come from js/calc.js (Calc.calculate / Calc.calcStat). This file does not reimplement the formula.
(function (root) {
  'use strict';

  var KEY = 'cc_minigames';
  var GEN_MAX = [0, 151, 251, 386, 493, 649, 721, 809, 905, 1025];
  var STATS = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
  var QUIZ_CHOICES = 6;       // Basiswerte-Quiz: so viele Pokémon stehen zur Auswahl
  var DMG_TOLERANCE = 10;     // Schadens-Schätzung: erlaubte Abweichung in Prozentpunkten
  var STATE_V = 2;            // Version der Spielstände von Quiz und Schaden (Serien statt Punkte)
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
      v: STATE_V,
      speed: { score: 0, streak: 0, high: 0 },
      quiz: { score: 0, streak: 0, high: 0 },
      damage: { score: 0, streak: 0, high: 0 }
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
    // Moves aus den beliebten Sets (NCP, Usage, Online) des Pokemon; nur sinnvolle Schadensmoves.
    function setMoves(name) {
      var out = [], seen = {};
      var list = deps.setsFor ? (deps.setsFor(name) || []) : [];
      list.forEach(function (set) {
        ((set && set.moves) || []).forEach(function (n) {
          if (!n || seen[n] || !deps.moves[n] || !isSensibleMove(n, deps.moves[n])) return;
          seen[n] = 1; out.push(n);
        });
      });
      return out;
    }
    // Ohne Sets: hauptsaechlich STAB-Moves (ca. 85 %), sonst alle sinnvollen Moves.
    function pickMove(entry, rng) {
      var fromSets = setMoves(entry.name);
      if (fromSets.length) return fromSets[Math.floor(rng() * fromSets.length)];
      var all = damagingMoves(entry.name);
      if (!all.length) return null;
      var stab = all.filter(function (n) { return entry.types.indexOf(deps.moves[n].type) !== -1; });
      var list = stab.length && rng() < 0.85 ? stab : all;
      return list[Math.floor(rng() * list.length)];
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
    // Gleiche Basis-Initiative gibt es nur, wenn der Pool nichts anderes hergibt (zum Anklicken braucht es einen Sieger).
    function makeSpeedRound(pool, rng) {
      var pair = pickTwo(pool, rng || Math.random);
      if (!pair) return null;
      for (var i = 0; i < 40 && pair[0].bs.sp === pair[1].bs.sp; i++) pair = pickTwo(pool, rng || Math.random);
      return { left: pair[0], right: pair[1], leftSpeed: pair[0].bs.sp, rightSpeed: pair[1].bs.sp };
    }
    // choice: 'left' | 'right' | 'tie'. Equal base Speed is a tie, not a coin flip.
    function judgeSpeed(round, choice) {
      var truth = round.leftSpeed === round.rightSpeed ? 'tie' : (round.leftSpeed > round.rightSpeed ? 'left' : 'right');
      return { truth: truth, correct: choice === truth };
    }
    function shuffle(list, rng) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1)), t = list[i];
        list[i] = list[j]; list[j] = t;
      }
      return list;
    }
    // Die richtige Antwort plus bis zu 5 andere Pokémon mit anderen Basiswerten, gemischt.
    function makeQuizChoices(answer, pool, rng, n) {
      rng = rng || Math.random;
      n = n || QUIZ_CHOICES;
      var out = [answer];
      var rest = shuffle((pool || []).filter(function (p) { return p.name !== answer.name && !sameStats(p, answer); }), rng);
      for (var i = 0; i < rest.length && out.length < n; i++) {
        if (!out.some(function (o) { return sameStats(o, rest[i]); })) out.push(rest[i]);
      }
      return shuffle(out, rng);
    }
    // Formen mit gleichen Basiswerten zählen als richtig.
    function judgeQuiz(choiceName, answerName, pool) {
      if (choiceName === answerName) return { correct: true };
      var c = null, a = null;
      (pool || []).forEach(function (p) { if (p.name === choiceName) c = p; if (p.name === answerName) a = p; });
      return { correct: sameStats(c, a) };
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
    function toCalcMon(entry, item, boosts) {
      boosts = boosts || {};
      var C = deps.calc;
      var nature = 'Hardy';
      var stats = {};
      C.STAT_KEYS.forEach(function (s) { stats[s] = C.calcStat(s, entry.bs[s] || 1, 0, nature, entry.name); });
      return {
        species: entry.name, baseSpecies: baseSpeciesName(entry.name), types: entry.types.slice(),
        stats: stats, boosts: { hp: 0, at: boosts.at || 0, df: boosts.df || 0, sa: boosts.sa || 0, sd: boosts.sd || 0, sp: 0 },
        nature: nature, ability: entry.ability || '', item: item || '(none)', status: 'Healthy',
        curHP: stats.hp, maxHP: stats.hp, weight: entry.weight || 50, canEvolve: !!entry.canEvolve, fainted: 0,
        sps: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }
      };
    }
    function blankField(weather, terrain) {
      return {
        format: 'Singles', weather: weather && weather !== 'None' ? weather : 'None', terrain: terrain && terrain !== 'None' ? terrain : 'None', gravity: false,
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
      var field = blankField(spec.weather, spec.terrain);
      var ab = spec.atkBoost || {}, db = spec.defBoost || {};
      return {
        attackerName: atk.name, defenderName: def.name, moveName: moveName,
        item: spec.item || '(none)', weather: field.weather, terrain: field.terrain, format: 'Singles',
        level: deps.calc.LEVEL, nature: 'Hardy', sp: 0,
        attacker: toCalcMon(atk, spec.item || '(none)', ab), defender: toCalcMon(def, '(none)', db),
        atkBoost: ab, defBoost: db,
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
    // streak: Serie des Spielers. Ab 10 kommen teils Wetter/Terrain dazu, ab 20 teils Statuswerte-Aenderungen.
    function makeDamageScenario(pool, rng, streak) {
      streak = streak | 0;
      rng = rng || Math.random;
      if (!deps.calc || typeof deps.calc.calculate !== 'function') throw new Error('Calc.calculate missing');
      var last = null;
      for (var attempt = 0; attempt < 24; attempt++) {
        var pair = pickTwo(pool, rng);
        if (!pair) return null;
        var moveName = pickMove(pair[0], rng);
        if (!moveName) continue;
        var move = deps.moves[moveName];
        var itemRoll = rng();
        var item = '(none)';
        if (itemRoll < 0.18) item = 'Life Orb';
        else if (itemRoll < 0.36) { var ti = typeItem(move.type); if (ti) item = ti; }
        var weather = 'None', terrain = 'None', atkBoost = {}, defBoost = {};
        if (streak >= 10) {
          if (rng() < 0.4) {
            var wl = ['Sun', 'Rain', 'Sand', 'Snow'];
            weather = move.type === 'Fire' && rng() < 0.6 ? 'Sun' : move.type === 'Water' && rng() < 0.6 ? 'Rain' : wl[Math.floor(rng() * wl.length)];
          }
          if (rng() < 0.35) {
            var tm = { Electric: 'Electric', Grass: 'Grassy', Psychic: 'Psychic', Dragon: 'Misty' };
            var tl = ['Electric', 'Grassy', 'Psychic', 'Misty'];
            terrain = tm[move.type] && rng() < 0.6 ? tm[move.type] : tl[Math.floor(rng() * tl.length)];
          }
        }
        if (streak >= 20) {
          var phys = move.category === 'Physical';
          var vals = [-2, -1, 1, 2];
          if (rng() < 0.4) atkBoost[phys ? 'at' : 'sa'] = vals[Math.floor(rng() * 4)];
          if (rng() < 0.4) defBoost[phys ? 'df' : 'sd'] = vals[Math.floor(rng() * 4)];
        }
        var sc = buildDamageScenario({ pool: pool, attacker: pair[0].name, defender: pair[1].name, move: moveName, item: item, weather: weather, terrain: terrain, atkBoost: atkBoost, defBoost: defBoost });
        if (!sc) continue;
        var truth = evaluateDamage(sc);
        last = sc;
        if (truth.max > 0 && truth.hp > 1 && truth.minPct <= 100) return sc; // mit höchstens 100 % lässt sich die Spanne noch treffen
      }
      return last;
    }
    function scoreDamage(guess, minPct, maxPct) {
      guess = +guess;
      if (!isFinite(guess)) guess = 0;
      var dist = guess < minPct ? (minPct - guess) : guess > maxPct ? (guess - maxPct) : 0;
      return { distance: Math.round(dist * 10) / 10, points: Math.max(0, Math.round(100 - dist * 2)) };
    }
    // Verloren ist, wer mehr als DMG_TOLERANCE Prozentpunkte neben der Spanne liegt.
    function judgeDamage(guess, minPct, maxPct) {
      var r = scoreDamage(guess, minPct, maxPct);
      return { distance: r.distance, correct: r.distance <= DMG_TOLERANCE, tolerance: DMG_TOLERANCE };
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
          if (!v[k] || (k !== 'speed' && v.v !== STATE_V)) return; // alte Quiz-/Schadenspunkte passen nicht zu den Serien
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
    // Eine Runde gewertet: richtig verlängert die Serie, falsch beendet sie.
    function recordRun(bucket, correct) {
      var s = load();
      var r = s[bucket];
      if (correct) {
        r.score++;
        r.streak++;
        if (r.streak > r.high) r.high = r.streak;
      } else r.streak = 0;
      save(s);
      return r;
    }

    return {
      KEY: KEY, STATS: STATS, QUIZ_CHOICES: QUIZ_CHOICES, DMG_TOLERANCE: DMG_TOLERANCE,
      buildPool: buildPool, makeSpeedRound: makeSpeedRound, judgeSpeed: judgeSpeed,
      makeQuizChoices: makeQuizChoices, judgeQuiz: judgeQuiz, judgeDamage: judgeDamage, germanName: function (name) { return germanName(name, namesDe, formDe); },
      damagingMoves: damagingMoves, buildDamageScenario: buildDamageScenario, makeDamageScenario: makeDamageScenario,
      evaluateDamage: evaluateDamage, scoreDamage: scoreDamage,
      load: load, saveOpts: saveOpts,
      recordSpeed: function (correct) { return recordRun('speed', correct); },
      recordQuiz: function (correct) { return recordRun('quiz', correct); },
      recordDamage: function (correct) { return recordRun('damage', correct); }
    };
  }

  var api = { KEY: KEY, create: create, norm: norm, germanName: germanName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CCMinigames = api;
})(typeof window !== 'undefined' ? window : globalThis);
