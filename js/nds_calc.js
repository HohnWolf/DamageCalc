// Schaden, Werte und Initiative für die NDS-Spiele (4. Generation: Diamant/Perl/Platin/HeartGold/SoulSilver,
// 5. Generation: Schwarz/Weiß/Schwarz 2/Weiß 2). Die Formeln folgen dem Smogon-Rechner (calc/src/mechanics/gen4.ts und gen56.ts).
// Attacken, Fähigkeiten und Items werden über ihre Nummer im Spiel erkannt (gleich wie bei Showdown/PokeAPI).
// Typen nutzen dieselbe Nummerierung wie die 3. Generation (9 = ???), damit die Anzeige gleich bleibt; 18 = Fee (nur ROM-Hacks).
(function () {
  'use strict';
  var G3 = window.GEN3;
  var NN = window.NDS_NAMES || { moves: { en: [] }, abilities: { en: [] }, items: { en: [] } };

  var TYPES = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '???', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
  var TI = {}; TYPES.forEach(function (n, i) { TI[n] = i; });
  var NATURES = G3.NATURES, NAT_STATS = G3.NAT_STATS;
  var NFE = {}; (NN.nfe || []).forEach(function (n) { NFE[n] = 1; }); // can still evolve (Eviolite)

  // type chart of generations 2–5 (attacking -> defending -> multiplier); Fairy only for hacks that add it (Gen 6 values)
  var CHART = {
    Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fighting: { Normal: 2, Flying: 0.5, Poison: 0.5, Rock: 2, Bug: 0.5, Ghost: 0, Steel: 2, Psychic: 0.5, Ice: 2, Dark: 2, Fairy: 0.5 },
    Flying: { Fighting: 2, Rock: 0.5, Bug: 2, Steel: 0.5, Grass: 2, Electric: 0.5 },
    Poison: { Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Grass: 2, Fairy: 2 },
    Ground: { Flying: 0, Poison: 2, Rock: 2, Bug: 0.5, Steel: 2, Fire: 2, Grass: 0.5, Electric: 2 },
    Rock: { Fighting: 0.5, Flying: 2, Ground: 0.5, Bug: 2, Steel: 0.5, Fire: 2, Ice: 2 },
    Bug: { Fighting: 0.5, Flying: 0.5, Poison: 0.5, Ghost: 0.5, Steel: 0.5, Fire: 0.5, Grass: 2, Psychic: 2, Dark: 2, Fairy: 0.5 },
    Ghost: { Normal: 0, Ghost: 2, Steel: 0.5, Psychic: 2, Dark: 0.5 },
    Steel: { Rock: 2, Steel: 0.5, Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Fairy: 2 },
    Fire: { Rock: 0.5, Bug: 2, Steel: 2, Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Dragon: 0.5 },
    Water: { Ground: 2, Rock: 2, Fire: 2, Water: 0.5, Grass: 0.5, Dragon: 0.5 },
    Grass: { Flying: 0.5, Poison: 0.5, Ground: 2, Rock: 2, Bug: 0.5, Steel: 0.5, Fire: 0.5, Water: 2, Grass: 0.5, Dragon: 0.5 },
    Electric: { Flying: 2, Ground: 0, Water: 2, Grass: 0.5, Electric: 0.5, Dragon: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Steel: 0.5, Psychic: 0.5, Dark: 0 },
    Ice: { Flying: 2, Ground: 2, Steel: 0.5, Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Dragon: 2 },
    Dragon: { Steel: 0.5, Dragon: 2, Fairy: 0 },
    Dark: { Fighting: 0.5, Ghost: 2, Steel: 0.5, Psychic: 2, Dark: 0.5, Fairy: 0.5 },
    Fairy: { Fighting: 2, Poison: 0.5, Steel: 0.5, Fire: 0.5, Dragon: 2, Dark: 2 },
    '???': {}
  };
  function eff1(type, defType, ghostRevealed) {
    var a = TYPES[type], d = TYPES[defType];
    if (!a || !d) return 1;
    var m = CHART[a] && CHART[a][d];
    if (m === undefined) m = 1;
    if (m === 0 && ghostRevealed && d === 'Ghost' && (a === 'Normal' || a === 'Fighting')) m = 1;
    return m;
  }

  // ---------------- names of moves, abilities, items (English, for the rules below) ----------------
  function abName(id) { return NN.abilities.en[id] || ''; }
  function itName(id) { return NN.items.en[id] || ''; }
  // the Pokémon's ability / item as English name, empty if none
  function hasAb(m) { var n = abName(m.ability); for (var i = 1; i < arguments.length; i++) if (n === arguments[i]) return true; return false; }
  function hasIt(m) { var n = itName(m.item); for (var i = 1; i < arguments.length; i++) if (n === arguments[i]) return true; return false; }

  // move numbers (same in all games from Gen 4 on)
  var MV = {
    SEISMIC_TOSS: 69, NIGHT_SHADE: 101, DRAGON_RAGE: 82, SONIC_BOOM: 49, SUPER_FANG: 162, PSYWAVE: 149, ENDEAVOR: 283, FINAL_GAMBIT: 515,
    GUILLOTINE: 12, HORN_DRILL: 32, FISSURE: 90, SHEER_COLD: 329, HIDDEN_POWER: 237, RETURN: 216, FRUSTRATION: 218, LOW_KICK: 67, GRASS_KNOT: 447,
    ERUPTION: 284, WATER_SPOUT: 323, FLAIL: 175, REVERSAL: 179, FACADE: 263, BRINE: 362, GYRO_BALL: 360, PUNISHMENT: 386, WRING_OUT: 378,
    CRUSH_GRIP: 462, PAYBACK: 371, WAKE_UP_SLAP: 358, SMELLING_SALTS: 265, WEATHER_BALL: 311, EXPLOSION: 153, SELF_DESTRUCT: 120, TRIPLE_KICK: 167,
    MAGNITUDE: 222, PRESENT: 217, COUNTER: 68, MIRROR_COAT: 243, METAL_BURST: 368, BIDE: 117, SPIT_UP: 255, SOLAR_BEAM: 76, JUDGMENT: 449,
    ELECTRO_BALL: 486, HEAVY_SLAM: 484, HEAT_CRASH: 535, ACROBATICS: 512, HEX: 506, VENOSHOCK: 474, STORED_POWER: 500, FOUL_PLAY: 492,
    PSYSHOCK: 473, PSYSTRIKE: 540, SECRET_SWORD: 548, FLING: 374, NATURAL_GIFT: 363, TRUMP_CARD: 376, AVALANCHE: 419, REVENGE: 279, ASSURANCE: 372,
    PAIN_SPLIT: 220, STRUGGLE: 165, FIRE_FANG: 424, NATURE_POWER: 267, DREAM_EATER: 138
  };
  var MULTI = [3, 4, 31, 42, 131, 140, 154, 198, 292, 331, 333, 350, 541];
  var DOUBLE = [24, 41, 155, 458, 530, 544];
  var SOUND = [173, 253, 304, 405, 448, 496, 497, 547];
  var PUNCH = [4, 5, 7, 8, 9, 146, 183, 223, 264, 309, 325, 327, 359, 409, 418];
  var RECOIL = [36, 38, 66, 344, 394, 413, 452, 457, 528, 543, 26, 136];
  var HIGH_CRIT = [2, 13, 75, 143, 152, 163, 177, 238, 299, 314, 342, 348, 400, 421, 427, 440, 444, 454, 460, 529];
  var VARIABLE = [MV.SEISMIC_TOSS, MV.NIGHT_SHADE, MV.DRAGON_RAGE, MV.SONIC_BOOM, MV.SUPER_FANG, MV.PSYWAVE, MV.ENDEAVOR, MV.FINAL_GAMBIT,
    MV.GUILLOTINE, MV.HORN_DRILL, MV.FISSURE, MV.SHEER_COLD, MV.HIDDEN_POWER, MV.RETURN, MV.FRUSTRATION, MV.LOW_KICK, MV.GRASS_KNOT,
    MV.ERUPTION, MV.WATER_SPOUT, MV.FLAIL, MV.REVERSAL, MV.GYRO_BALL, MV.PUNISHMENT, MV.WRING_OUT, MV.CRUSH_GRIP, MV.MAGNITUDE, MV.PRESENT,
    MV.SPIT_UP, MV.ELECTRO_BALL, MV.HEAVY_SLAM, MV.HEAT_CRASH, MV.STORED_POWER, MV.TRUMP_CARD];
  var OHKO = [MV.GUILLOTINE, MV.HORN_DRILL, MV.FISSURE, MV.SHEER_COLD];
  function inL(l, id) { return l.indexOf(id) !== -1; }

  // items that boost one type (incl. plates and incenses)
  var TYPE_ITEMS = {
    'Silk Scarf': 'Normal', 'Black Belt': 'Fighting', 'Sharp Beak': 'Flying', 'Poison Barb': 'Poison', 'Soft Sand': 'Ground', 'Hard Stone': 'Rock',
    'Silver Powder': 'Bug', 'Spell Tag': 'Ghost', 'Metal Coat': 'Steel', 'Charcoal': 'Fire', 'Mystic Water': 'Water', 'Miracle Seed': 'Grass',
    'Magnet': 'Electric', 'Twisted Spoon': 'Psychic', 'Never-Melt Ice': 'Ice', 'Dragon Fang': 'Dragon', 'Black Glasses': 'Dark',
    'Sea Incense': 'Water', 'Wave Incense': 'Water', 'Odd Incense': 'Psychic', 'Rock Incense': 'Rock', 'Rose Incense': 'Grass',
    'Fist Plate': 'Fighting', 'Sky Plate': 'Flying', 'Toxic Plate': 'Poison', 'Earth Plate': 'Ground', 'Stone Plate': 'Rock', 'Insect Plate': 'Bug',
    'Spooky Plate': 'Ghost', 'Iron Plate': 'Steel', 'Flame Plate': 'Fire', 'Splash Plate': 'Water', 'Meadow Plate': 'Grass', 'Zap Plate': 'Electric',
    'Mind Plate': 'Psychic', 'Icicle Plate': 'Ice', 'Draco Plate': 'Dragon', 'Dread Plate': 'Dark', 'Pixie Plate': 'Fairy'
  };
  var RESIST_BERRIES = {
    'Chilan Berry': 'Normal', 'Occa Berry': 'Fire', 'Passho Berry': 'Water', 'Wacan Berry': 'Electric', 'Rindo Berry': 'Grass', 'Yache Berry': 'Ice',
    'Chople Berry': 'Fighting', 'Kebia Berry': 'Poison', 'Shuca Berry': 'Ground', 'Coba Berry': 'Flying', 'Payapa Berry': 'Psychic', 'Tanga Berry': 'Bug',
    'Charti Berry': 'Rock', 'Kasib Berry': 'Ghost', 'Haban Berry': 'Dragon', 'Colbur Berry': 'Dark', 'Babiri Berry': 'Steel', 'Roseli Berry': 'Fairy'
  };
  function plateType(item) { var n = itName(item); return /Plate$/.test(n) && TYPE_ITEMS[n] ? TI[TYPE_ITEMS[n]] : null; }

  // ---------------- stats ----------------
  function natureMod(nature, stat, v) {
    var up = NAT_STATS[Math.floor(nature / 5)], down = NAT_STATS[nature % 5];
    if (up === down) return v;
    if (stat === up) return Math.floor(v * 110 / 100);
    if (stat === down) return Math.floor(v * 90 / 100);
    return v;
  }
  var STAT_IDX = { hp: 0, atk: 1, def: 2, spe: 3, spa: 4, spd: 5 };
  function calcStats(sp, level, ivs, evs, nature) {
    var r = {};
    Object.keys(STAT_IDX).forEach(function (k) {
      var b = sp.bs[STAT_IDX[k]], x = Math.floor((2 * b + (ivs[k] || 0) + Math.floor((evs[k] || 0) / 4)) * level / 100);
      r[k] = k === 'hp' ? (sp.nat === 292 ? 1 : x + level + 10) : natureMod(nature, k, x + 5);
    });
    return r;
  }
  function stageMod(v, st) { st = st || 0; return st >= 0 ? Math.floor(v * (2 + st) / 2) : Math.floor(v * 2 / (2 - st)); }

  // the species entry for a species and form (forms have their own base stats and types)
  function specOf(rom, species, form) {
    var sp = rom.species[species] || rom.species[0];
    if (form && sp.forms && sp.forms[form - 1] != null && rom.species[sp.forms[form - 1]]) return rom.species[sp.forms[form - 1]];
    return sp;
  }
  function abilityFor(sp, slot) { var a = sp.abilities || []; return slot === 2 && a[2] ? a[2] : slot === 1 && a[1] ? a[1] : a[0]; }

  // a battle-ready Pokémon from a save entry (abilities and natures are stored in the Pokémon from Gen 4 on)
  function fromSave(rom, m) {
    var sp = specOf(rom, m.species, m.form);
    var level = m.level || G3.levelFromExp(sp.growth, m.exp);
    var stats = m.stats && m.level ? { hp: m.stats.hp, atk: m.stats.atk, def: m.stats.def, spa: m.stats.spa, spd: m.stats.spd, spe: m.stats.spe }
      : calcStats(sp, level, m.ivs, m.evs, m.nature);
    return { species: m.species, form: m.form || 0, nat: sp.nat, level: level, stats: stats, types: sp.types.slice(), ability: m.ability || sp.abilities[0],
      item: m.item, moves: m.moves.slice(), nature: m.nature, ivs: m.ivs, evs: m.evs, friendship: m.friendship, maxHP: stats.hp,
      hp: m.hp != null && m.stats ? Math.min(m.hp, stats.hp) : stats.hp, nick: m.nick, pid: m.pid, weight: sp.weight };
  }
  function defaultMoves(rom, species, level) {
    var res = [];
    (rom.learnsets[species] || []).forEach(function (e) {
      if (e[0] > level || res.indexOf(e[1]) !== -1) return;
      if (res.length === 4) res.shift();
      res.push(e[1]);
    });
    return res;
  }

  // Gen 4 trainer Pokémon (pokeplatinum/pokeheartgold src/trainer_data.c): PID from a LCRNG seeded with difficulty + level + species
  // + trainer index, advanced once per trainer class number, shifted left by 8 plus a gender selector (0x78 female class, else 0x88).
  // HGSS: a per-Pokémon override replaces the selector by the species' gender ratio ±2 and sets bit 0 for the ability; the changed
  // selector stays for the following Pokémon of the trainer. nature = PID % 25, ability slot = PID & 1
  function lcrng(seed) { return (Math.imul(seed, 0x41C64E6D) + 0x6073) >>> 0; }
  function gen4Pid(pm, tr, sel) {
    var seed = (pm.iv + pm.level + pm.species + tr.id) >>> 0, rnd = seed;
    for (var j = 0; j < tr.cls; j++) { seed = lcrng(seed); rnd = seed >>> 16; }
    return ((rnd << 8) + sel) >>> 0;
  }
  var MUL5 = BigInt('0x5D588B656C078965'), ADD5 = BigInt(0x269EC3), MASK5 = (BigInt(1) << BigInt(64)) - BigInt(1), SH48 = BigInt(48);
  function gen5Pid(pm, tr, sel) {
    var seed = pm.iv + pm.level + pm.species + tr.id, x = BigInt(seed), rnd = seed;
    for (var j = 0; j < tr.cls; j++) { x = (MUL5 * x + ADD5) & MASK5; rnd = Number(x >> SH48); }
    return (rnd * 256 + sel) >>> 0;
  }
  function trainerParty(rom, tr) {
    var sel = rom.classGender && rom.classGender[tr.cls] === 1 ? 0x78 : 0x88;
    return tr.party.map(function (pm) {
      var sp = specOf(rom, pm.species, pm.form);
      var iv = Math.floor(pm.iv * 31 / 255), ivs = { hp: iv, atk: iv, def: iv, spe: iv, spa: iv, spd: iv }, evs = {};
      var nature, slot, natureKnown = true;
      if (rom.gen === 4) {
        var ga = pm.genderAbility || 0;
        if (ga) {
          if (ga & 0x0F) sel = ((sp.gender || 0) + ((ga & 0x0F) === 1 ? 2 : -2)) >>> 0;
          if (ga >> 4 === 1) sel = (sel & ~1) >>> 0; else if (ga >> 4 === 2) sel = (sel | 1) >>> 0;
        }
        var pid = gen4Pid(pm, tr, sel);
        nature = pid % 25; slot = pid & 1;
        if (!rom.classGender) natureKnown = false;
      } else {
        // Gen 5 (pokebw2 src/system/tr_tool.c): same seed, 64-bit RNG, the selector changes the same way and stays;
        // nature = (PID >> 8) % 25, ability: override 1/2/3 (3 = hidden), else PID bit 16 if the species has two abilities
        var ga5 = pm.genderAbility || 0, ab5 = ga5 >> 4, ab = sp.abilities || [];
        if (ga5) {
          if (ga5 & 0x0F) sel = ((sp.gender || 0) + ((ga5 & 0x0F) === 1 ? 2 : -2)) >>> 0;
          if (ab5 === 1) sel = (sel & ~1) >>> 0; else if (ab5 === 2) sel = (sel | 1) >>> 0;
        }
        var pid5 = gen5Pid(pm, tr, sel);
        nature = Math.floor(pid5 / 256) % 25;
        var two = !!(ab[1] && ab[1] !== ab[0]);
        slot = ab5 === 3 ? 2 : ab5 === 2 ? (two ? 1 : 0) : ab5 === 1 ? 0 : (pid5 & 0x10000) && two ? 1 : 0;
      }
      var stats = calcStats(sp, pm.level, ivs, evs, nature);
      return { species: pm.species, form: pm.form || 0, nat: sp.nat, level: pm.level, stats: stats, types: sp.types.slice(), ability: abilityFor(sp, slot),
        item: pm.item, moves: pm.moves ? pm.moves.filter(function (x) { return x > 0; }) : defaultMoves(rom, pm.species, pm.level), nature: nature,
        natureKnown: natureKnown, ivs: ivs, evs: evs, friendship: sp.friendship, maxHP: stats.hp, hp: stats.hp, defaultMoves: !pm.moves, weight: sp.weight };
    });
  }

  // ---------------- speed ----------------
  function speedOf(rom, m, f) {
    var s = stageMod(m.stats.spe, (m.stages && m.stages.spe) || 0), w = weatherOf(f, m, m);
    if ((hasAb(m, 'Chlorophyll') && w === 'sun') || (hasAb(m, 'Swift Swim') && w === 'rain') || (rom.gen >= 5 && hasAb(m, 'Sand Rush') && w === 'sand')) s *= 2;
    else if (hasAb(m, 'Quick Feet') && m.status) s = Math.floor(s * 1.5);
    if (hasIt(m, 'Choice Scarf')) s = Math.floor(s * 1.5);
    else if (hasIt(m, 'Iron Ball', 'Macho Brace', 'Power Weight', 'Power Bracer', 'Power Belt', 'Power Lens', 'Power Band', 'Power Anklet')) s = Math.floor(s / 2);
    else if (hasIt(m, 'Quick Powder') && m.nat === 132) s *= 2;
    if (m.status === 'par' && !hasAb(m, 'Quick Feet')) s = Math.floor(s / 4);
    return s;
  }
  function weatherOf(f, a, d) {
    var w = f && f.weather && f.weather !== 'none' ? f.weather : 'none';
    if (w !== 'none' && (hasAb(a, 'Cloud Nine', 'Air Lock') || hasAb(d, 'Cloud Nine', 'Air Lock'))) return 'none';
    return w;
  }

  // ---------------- damage ----------------
  function pokeRound(n) { return n % 1 > 0.5 ? Math.ceil(n) : Math.floor(n); }
  function chainMods(mods, lo, hi) {
    var M = 4096;
    mods.forEach(function (m) { if (m !== 4096) M = (M * m + 2048) >> 12; });
    return Math.max(Math.min(M, hi), lo);
  }
  var MOLD_IGNORED = ['Battle Armor', 'Clear Body', 'Damp', 'Dry Skin', 'Filter', 'Flash Fire', 'Flower Gift', 'Heatproof', 'Hyper Cutter', 'Immunity',
    'Inner Focus', 'Insomnia', 'Keen Eye', 'Leaf Guard', 'Levitate', 'Lightning Rod', 'Limber', 'Magma Armor', 'Marvel Scale', 'Motor Drive',
    'Oblivious', 'Own Tempo', 'Sand Veil', 'Shell Armor', 'Shield Dust', 'Simple', 'Snow Cloak', 'Solid Rock', 'Soundproof', 'Sticky Hold',
    'Storm Drain', 'Sturdy', 'Suction Cups', 'Tangled Feet', 'Thick Fat', 'Unaware', 'Vital Spirit', 'Volt Absorb', 'Water Absorb', 'Water Veil',
    'White Smoke', 'Wonder Guard', 'Big Pecks', 'Contrary', 'Friend Guard', 'Heavy Metal', 'Light Metal', 'Magic Bounce', 'Multiscale',
    'Sap Sipper', 'Telepathy', 'Wonder Skin'];
  var WEIGHT_STEPS = [[200, 120], [100, 100], [50, 80], [25, 60], [10, 40], [0, 20]];
  function weightOf(m) {
    if (m.weight) return m.weight;
    var d = window.NATDEX && window.NATDEX[m.nat];
    return d ? d[4] : 50;
  }

  // A, D: Pokémon from fromSave/trainerParty plus hp, status, stages, flashFire, player; f = { weather, double, reflect, lightScreen }
  function calc(rom, A, D, moveId, f) {
    f = f || {};
    var gen = rom.gen;
    var mv = rom.moves[moveId];
    var res = { move: moveId, rolls: [], crit: [], eff: 1, immune: false, notes: [], fixed: false, hits: 1, status: false };
    if (!mv || mv.cat === 2 || moveId === MV.PAIN_SPLIT) { res.status = true; return res; }
    if (inL([MV.COUNTER, MV.MIRROR_COAT, MV.METAL_BURST, MV.BIDE], moveId)) { res.status = true; res.notes.push('counter'); return res; }
    // copies, so ability changes (Mold Breaker) stay inside this calculation
    A = Object.assign({}, A); D = Object.assign({}, D);
    var aSt = A.stages || {}, dSt = D.stages || {};
    var weather = weatherOf(f, A, D);
    // Forecast: Castform takes the type of the weather
    [A, D].forEach(function (m) {
      if (!hasAb(m, 'Forecast') || m.nat !== 351) return;
      var wt = weather === 'sun' ? TI.Fire : weather === 'rain' ? TI.Water : weather === 'hail' ? TI.Ice : null;
      if (wt != null) m.types = [wt, wt];
    });
    if (hasAb(A, 'Mold Breaker', 'Teravolt', 'Turboblaze') && MOLD_IGNORED.indexOf(abName(D.ability)) !== -1) D.ability = 0;
    var cat = mv.cat, type = mv.type, power = mv.power;
    var physical = cat === 0;

    // dynamic type and power
    if (moveId === MV.HIDDEN_POWER) { var hp = G3.hiddenPower(A.ivs || {}); type = hp.type; power = hp.power; }
    if (moveId === MV.WEATHER_BALL) type = weather === 'sun' ? TI.Fire : weather === 'rain' ? TI.Water : weather === 'sand' ? TI.Rock : weather === 'hail' ? TI.Ice : TI.Normal;
    if (moveId === MV.JUDGMENT && plateType(A.item) != null) type = plateType(A.item);
    if (hasAb(A, 'Normalize') && moveId !== MV.STRUGGLE) type = TI.Normal;
    res.type = type;

    // type effectiveness (Gen 4 applies the two types in a fixed order, which matters for rounding)
    var ghostRev = hasAb(A, 'Scrappy') || f.foresight;
    var dt = [D.types[0], D.types[1] != null && D.types[1] !== D.types[0] ? D.types[1] : null];
    if (gen === 4 && dt[1] != null) {
      var order = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel'];
      if (order.indexOf(TYPES[dt[0]]) > order.indexOf(TYPES[dt[1]])) dt = [dt[1], dt[0]];
    }
    var e1 = eff1(type, dt[0], ghostRev), e2 = dt[1] != null ? eff1(type, dt[1], ghostRev) : 1;
    if (e1 * e2 === 0 && type === TI.Ground && hasIt(D, 'Iron Ball')) { if (e1 === 0) e1 = 1; else e2 = 1; }
    var effv = e1 * e2;
    res.eff = effv;
    function immune(why) { res.immune = true; res.eff = 0; res.notes.push(why); return res; }
    if (effv === 0) return immune('type');
    var tn = TYPES[type];
    if (hasAb(D, 'Wonder Guard') && effv <= 1 && !(gen === 4 && (tn === '???' || moveId === MV.FIRE_FANG))) return immune('wonderguard');
    if (tn === 'Fire' && hasAb(D, 'Flash Fire')) return immune('flashfire');
    if (tn === 'Water' && hasAb(D, 'Water Absorb', 'Dry Skin')) return immune('waterabsorb');
    if (tn === 'Water' && gen >= 5 && hasAb(D, 'Storm Drain')) return immune('waterabsorb');
    if (tn === 'Electric' && hasAb(D, 'Volt Absorb', 'Motor Drive')) return immune('voltabsorb');
    if (tn === 'Electric' && gen >= 5 && hasAb(D, 'Lightning Rod')) return immune('voltabsorb');
    if (tn === 'Grass' && gen >= 5 && hasAb(D, 'Sap Sipper')) return immune('sapsipper');
    if (tn === 'Ground' && !hasIt(D, 'Iron Ball') && hasAb(D, 'Levitate')) return immune('levitate');
    if (tn === 'Ground' && gen >= 5 && hasIt(D, 'Air Balloon')) return immune('airballoon');
    if (inL(SOUND, moveId) && hasAb(D, 'Soundproof')) return immune('soundproof');

    // fixed damage
    var fixed = null;
    if (moveId === MV.SEISMIC_TOSS || moveId === MV.NIGHT_SHADE) fixed = [A.level];
    else if (moveId === MV.DRAGON_RAGE) fixed = [40];
    else if (moveId === MV.SONIC_BOOM) fixed = [20];
    else if (moveId === MV.SUPER_FANG) fixed = [Math.max(1, Math.floor(D.hp / 2))];
    else if (moveId === MV.ENDEAVOR) fixed = [Math.max(0, D.hp - A.hp)];
    else if (moveId === MV.FINAL_GAMBIT) fixed = [A.hp];
    else if (moveId === MV.PSYWAVE) { fixed = []; for (var r = 0; r <= 10; r++) fixed.push(Math.max(1, Math.floor(A.level * (r * 10 + 50) / 100))); }
    else if (inL(OHKO, moveId)) {
      if (A.level < D.level || hasAb(D, 'Sturdy')) return immune(hasAb(D, 'Sturdy') ? 'sturdy' : 'ohkolevel');
      fixed = [D.hp]; res.notes.push('ohko');
    }
    if (fixed) {
      res.fixed = true;
      for (var q = 0; q < 16; q++) res.rolls.push(fixed[Math.min(fixed.length - 1, Math.floor(q * fixed.length / 16))]);
      res.crit = res.rolls.slice();
      return finish(res, A, D, moveId, mv, gen);
    }

    // speeds (Payback, Gyro Ball, Electro Ball)
    var sA = speedOf(rom, A, f), sD = speedOf(rom, D, f);
    // base power by move
    function basePower(hit) {
      var bp = power;
      switch (moveId) {
        case MV.RETURN: bp = Math.max(1, Math.floor((A.friendship == null ? 255 : A.friendship) * 10 / 25)); break;
        case MV.FRUSTRATION: bp = Math.max(1, Math.floor((255 - (A.friendship == null ? 0 : A.friendship)) * 10 / 25)); break;
        case MV.ERUPTION: case MV.WATER_SPOUT: bp = Math.max(1, Math.floor(150 * A.hp / A.maxHP)); break;
        case MV.FLAIL: case MV.REVERSAL:
          if (gen === 4) { var p4 = Math.floor(64 * A.hp / A.maxHP); bp = p4 <= 1 ? 200 : p4 <= 5 ? 150 : p4 <= 12 ? 100 : p4 <= 21 ? 80 : p4 <= 42 ? 40 : 20; }
          else { var p5 = Math.floor(48 * A.hp / A.maxHP); bp = p5 <= 1 ? 200 : p5 <= 4 ? 150 : p5 <= 9 ? 100 : p5 <= 16 ? 80 : p5 <= 32 ? 40 : 20; }
          break;
        case MV.LOW_KICK: case MV.GRASS_KNOT:
          var w = weightOf(D); bp = 20; WEIGHT_STEPS.some(function (s) { if (w >= s[0]) { bp = s[1]; return true; } return false; }); break;
        case MV.HEAVY_SLAM: case MV.HEAT_CRASH:
          var wr = weightOf(A) / weightOf(D); bp = wr >= 5 ? 120 : wr >= 4 ? 100 : wr >= 3 ? 80 : wr >= 2 ? 60 : 40; break;
        case MV.GYRO_BALL: bp = Math.min(150, Math.floor(25 * sD / Math.max(1, sA)) + (gen >= 5 ? 1 : 0)); break;
        case MV.ELECTRO_BALL: var er = Math.floor(sA / Math.max(1, sD)); bp = er >= 4 ? 150 : er >= 3 ? 120 : er >= 2 ? 80 : er >= 1 ? 60 : 40; break;
        case MV.PUNISHMENT: bp = Math.min(200, 60 + 20 * posBoosts(dSt)); break;
        case MV.STORED_POWER: bp = 20 + 20 * posBoosts(aSt); break;
        case MV.WRING_OUT: case MV.CRUSH_GRIP:
          if (gen === 4) bp = Math.floor(D.hp * 120 / D.maxHP) + 1;
          else { var x = 100 * Math.floor(D.hp * 4096 / D.maxHP); bp = Math.floor(Math.floor((120 * x + 2047) / 4096) / 100) || 1; }
          break;
        case MV.PAYBACK: if (sA <= sD) bp *= 2; break;
        case MV.WAKE_UP_SLAP: if (D.status === 'slp') bp *= 2; break;
        case MV.SMELLING_SALTS: if (D.status === 'par') bp *= 2; break;
        case MV.HEX: if (gen >= 5 && D.status) bp *= 2; break;
        case MV.ACROBATICS: if (gen >= 5 && (!A.item || hasIt(A, 'Flying Gem'))) bp *= 2; break;
        case MV.WEATHER_BALL: if (weather !== 'none') bp *= 2; break;
        case MV.TRIPLE_KICK: bp = hit * 10; break;
        case MV.MAGNITUDE: bp = 70; break;
        case MV.PRESENT: bp = 80; break;
        case MV.SPIT_UP: bp = 100; break;
        case MV.TRUMP_CARD: bp = 40; break;
        case MV.NATURE_POWER: bp = gen === 4 ? 80 : 100; break;
        default:
          if (gen === 4) {
            if (moveId === MV.BRINE && D.hp <= D.maxHP / 2) bp *= 2;
            if (moveId === MV.FACADE && A.status && A.status !== 'slp' && A.status !== 'frz') bp *= 2;
          }
      }
      return bp;
    }
    if (moveId === MV.MAGNITUDE) res.notes.push('magnitude');
    if (moveId === MV.PRESENT) res.notes.push('present');
    if (moveId === MV.SPIT_UP) res.notes.push('spitup');
    if (moveId === MV.TRUMP_CARD) res.notes.push('trumpcard');
    if (moveId === MV.FLING || moveId === MV.NATURAL_GIFT) { res.status = true; res.notes.push('itemdependent'); return res; }
    if (!power && !inL(VARIABLE, moveId) && moveId !== MV.WEATHER_BALL && moveId !== MV.NATURE_POWER) { res.status = true; return res; }

    var crit0 = mv.crit || (inL(HIGH_CRIT, moveId) ? 1 : 0);
    var stab = A.types[0] === type || A.types[1] === type;
    var spread = f.double && f.spread !== false && (mv.target === 'foes' || mv.target === 'all');
    var isPhysDef = physical || (gen >= 5 && inL([MV.PSYSHOCK, MV.PSYSTRIKE, MV.SECRET_SWORD], moveId));

    // ---------- Gen 4 ----------
    function dmg4(critical, hit) {
      var bp = basePower(hit);
      if (f.helpingHand) bp = Math.floor(bp * 1.5);
      if (f.charge && tn === 'Electric') bp *= 2;
      if (hasAb(A, 'Technician') && bp <= 60) bp = Math.floor(bp * 1.5);
      var boostT = TYPE_ITEMS[itName(A.item)];
      if ((hasIt(A, 'Muscle Band') && physical) || (hasIt(A, 'Wise Glasses') && !physical)) bp = Math.floor(bp * 1.1);
      else if ((boostT && TI[boostT] === type) || (hasIt(A, 'Adamant Orb') && A.nat === 483 && (tn === 'Steel' || tn === 'Dragon')) ||
        (hasIt(A, 'Lustrous Orb') && A.nat === 484 && (tn === 'Water' || tn === 'Dragon')) ||
        (hasIt(A, 'Griseous Orb') && A.nat === 487 && (tn === 'Ghost' || tn === 'Dragon'))) bp = Math.floor(bp * 1.2);
      if ((hasAb(A, 'Reckless') && inL(RECOIL, moveId)) || (hasAb(A, 'Iron Fist') && inL(PUNCH, moveId))) bp = Math.floor(bp * 1.2);
      else if (A.hp <= A.maxHP / 3 && ((hasAb(A, 'Overgrow') && tn === 'Grass') || (hasAb(A, 'Blaze') && tn === 'Fire') ||
        (hasAb(A, 'Torrent') && tn === 'Water') || (hasAb(A, 'Swarm') && tn === 'Bug'))) bp = Math.floor(bp * 1.5);
      if ((hasAb(D, 'Heatproof') && tn === 'Fire') || (hasAb(D, 'Thick Fat') && (tn === 'Fire' || tn === 'Ice'))) bp = Math.floor(bp * 0.5);
      else if (hasAb(D, 'Dry Skin') && tn === 'Fire') bp = Math.floor(bp * 1.25);
      // attack
      var ak = physical ? 'atk' : 'spa', at = A.stats[ak], ab = aSt[ak] || 0;
      if (hasAb(D, 'Unaware')) { /* stages ignored */ } else if (hasAb(A, 'Simple')) at = simple(at, ab);
      else if (ab > 0 || (!critical && ab < 0)) at = stageMod(at, ab);
      if (physical && hasAb(A, 'Huge Power', 'Pure Power')) at *= 2;
      else if (weather === 'sun' && hasAb(A, physical ? 'Flower Gift' : 'Solar Power')) at = Math.floor(at * 1.5);
      else if (physical && (hasAb(A, 'Hustle') || (hasAb(A, 'Guts') && A.status))) at = Math.floor(at * 1.5);
      else if (physical && hasAb(A, 'Slow Start')) at = Math.floor(at / 2);
      if ((physical ? hasIt(A, 'Choice Band') : hasIt(A, 'Choice Specs')) || (!physical && hasIt(A, 'Soul Dew') && (A.nat === 380 || A.nat === 381))) at = Math.floor(at * 1.5);
      else if ((hasIt(A, 'Light Ball') && A.nat === 25) || (hasIt(A, 'Thick Club') && (A.nat === 104 || A.nat === 105) && physical) ||
        (hasIt(A, 'Deep Sea Tooth') && A.nat === 366 && !physical)) at *= 2;
      // defense
      var dk = physical ? 'def' : 'spd', df = D.stats[dk], db = dSt[dk] || 0;
      if (hasAb(A, 'Unaware')) { /* stages ignored */ } else if (hasAb(D, 'Simple')) df = simple(df, db);
      else if (db < 0 || (!critical && db > 0)) df = stageMod(df, db);
      if (hasAb(D, 'Marvel Scale') && D.status && physical) df = Math.floor(df * 1.5);
      else if (hasAb(D, 'Flower Gift') && weather === 'sun' && !physical) df = Math.floor(df * 1.5);
      if (hasIt(D, 'Soul Dew') && (D.nat === 380 || D.nat === 381) && !physical) df = Math.floor(df * 1.5);
      else if ((hasIt(D, 'Deep Sea Scale') && D.nat === 366 && !physical) || (hasIt(D, 'Metal Powder') && D.nat === 132 && physical)) df *= 2;
      if (weather === 'sand' && (D.types[0] === TI.Rock || D.types[1] === TI.Rock) && !physical) df = Math.floor(df * 1.5);
      if (moveId === MV.EXPLOSION || moveId === MV.SELF_DESTRUCT) df = Math.floor(df * 0.5);
      if (df < 1) df = 1;
      var base = Math.floor(Math.floor(Math.floor(2 * A.level / 5 + 2) * bp * at / 50) / df);
      if (A.status === 'brn' && physical && !hasAb(A, 'Guts')) base = Math.floor(base * 0.5);
      if (!critical) {
        var scr = f.double ? 2 / 3 : 1 / 2;
        if ((physical && f.reflect) || (!physical && f.lightScreen)) base = Math.floor(base * scr);
      }
      if (spread) base = Math.floor(base * 3 / 4);
      if ((weather === 'sun' && tn === 'Fire') || (weather === 'rain' && tn === 'Water')) base = Math.floor(base * 1.5);
      else if ((weather === 'sun' && tn === 'Water') || (weather === 'rain' && tn === 'Fire') ||
        (moveId === MV.SOLAR_BEAM && (weather === 'rain' || weather === 'sand' || weather === 'hail'))) base = Math.floor(base * 0.5);
      if (A.flashFire && tn === 'Fire') base = Math.floor(base * 1.5);
      base += 2;
      if (critical) base *= hasAb(A, 'Sniper') ? 3 : 2;
      if (hasIt(A, 'Life Orb')) base = Math.floor(base * 1.3);
      var stabM = stab ? (hasAb(A, 'Adaptability') ? 2 : 1.5) : 1;
      var filt = hasAb(D, 'Filter', 'Solid Rock') && effv > 1 ? 0.75 : 1;
      var belt = hasIt(A, 'Expert Belt') && effv > 1 ? 1.2 : 1;
      var tint = hasAb(A, 'Tinted Lens') && effv < 1 ? 2 : 1;
      var berry = RESIST_BERRIES[itName(D.item)] === tn && (effv > 1 || tn === 'Normal') ? 0.5 : 1;
      var out = [];
      for (var i = 0; i < 16; i++) {
        var d = Math.floor(base * (85 + i) / 100);
        d = Math.floor(d * stabM); d = Math.floor(d * e1); d = Math.floor(d * e2);
        d = Math.floor(d * filt); d = Math.floor(d * belt); d = Math.floor(d * tint); d = Math.floor(d * berry);
        out.push(Math.max(1, d));
      }
      return out;
    }

    // ---------- Gen 5 ----------
    function dmg5(critical, hit) {
      var bp = basePower(hit);
      var m = [];
      if ((hasAb(A, 'Technician') && bp <= 60) || (hasAb(A, 'Flare Boost') && A.status === 'brn' && !physical) ||
        (hasAb(A, 'Toxic Boost') && A.status === 'psn' && physical)) m.push(6144);
      else if (hasAb(A, 'Analytic') && sA < sD) m.push(5325);
      else if (hasAb(A, 'Sand Force') && weather === 'sand' && (tn === 'Rock' || tn === 'Ground' || tn === 'Steel')) m.push(5325);
      else if ((hasAb(A, 'Reckless') && inL(RECOIL, moveId)) || (hasAb(A, 'Iron Fist') && inL(PUNCH, moveId))) m.push(4915);
      if (f.charge && tn === 'Electric') m.push(8192);
      if (hasAb(D, 'Heatproof') && tn === 'Fire') m.push(2048);
      else if (hasAb(D, 'Dry Skin') && tn === 'Fire') m.push(5120);
      if (hasAb(A, 'Sheer Force') && mv.chance) m.push(5325);
      var boostT = TYPE_ITEMS[itName(A.item)];
      if (boostT && TI[boostT] === type) m.push(4915);
      else if ((hasIt(A, 'Muscle Band') && physical) || (hasIt(A, 'Wise Glasses') && !physical)) m.push(4505);
      else if ((hasIt(A, 'Adamant Orb') && A.nat === 483 && (tn === 'Steel' || tn === 'Dragon')) ||
        (hasIt(A, 'Lustrous Orb') && A.nat === 484 && (tn === 'Water' || tn === 'Dragon')) ||
        (hasIt(A, 'Griseous Orb') && A.nat === 487 && (tn === 'Ghost' || tn === 'Dragon'))) m.push(4915);
      else if (itName(A.item) === tn + ' Gem') m.push(6144);
      if ((moveId === MV.FACADE && A.status && A.status !== 'slp' && A.status !== 'frz') || (moveId === MV.BRINE && D.hp <= D.maxHP / 2) ||
        (moveId === MV.VENOSHOCK && D.status === 'psn')) m.push(8192);
      else if (moveId === MV.SOLAR_BEAM && (weather === 'rain' || weather === 'sand' || weather === 'hail')) m.push(2048);
      if (f.helpingHand) m.push(6144);
      bp = Math.max(1, pokeRound(bp * chainMods(m, 41, 2097152) / 4096));
      // attack (Foul Play uses the target's Attack)
      var src = moveId === MV.FOUL_PLAY ? D : A, srcSt = src.stages || {};
      var ak = physical ? 'atk' : 'spa', ab = srcSt[ak] || 0, at;
      if (ab === 0 || (critical && ab < 0) || hasAb(D, 'Unaware')) at = src.stats[ak];
      else at = stageMod(src.stats[ak], hasAb(src, 'Simple') ? Math.max(-6, Math.min(6, ab * 2)) : ab);
      if (hasAb(A, 'Hustle') && physical) at = pokeRound(at * 3 / 2);
      var am = [];
      if (hasAb(D, 'Thick Fat') && (tn === 'Fire' || tn === 'Ice')) am.push(2048);
      if ((hasAb(A, 'Guts') && A.status && physical) || (A.hp <= A.maxHP / 3 && ((hasAb(A, 'Overgrow') && tn === 'Grass') ||
        (hasAb(A, 'Blaze') && tn === 'Fire') || (hasAb(A, 'Torrent') && tn === 'Water') || (hasAb(A, 'Swarm') && tn === 'Bug')))) am.push(6144);
      else if (A.flashFire && hasAb(A, 'Flash Fire') && tn === 'Fire') am.push(6144);
      else if ((hasAb(A, 'Solar Power') && weather === 'sun' && !physical) || (hasAb(A, 'Flower Gift') && weather === 'sun' && physical)) am.push(6144);
      else if ((hasAb(A, 'Defeatist') && A.hp <= A.maxHP / 2) || (hasAb(A, 'Slow Start') && physical)) am.push(2048);
      else if (hasAb(A, 'Huge Power', 'Pure Power') && physical) am.push(8192);
      if ((hasIt(A, 'Thick Club') && (A.nat === 104 || A.nat === 105) && physical) || (hasIt(A, 'Deep Sea Tooth') && A.nat === 366 && !physical) ||
        (hasIt(A, 'Light Ball') && A.nat === 25)) am.push(8192);
      else if ((hasIt(A, 'Soul Dew') && (A.nat === 380 || A.nat === 381) && !physical) || (hasIt(A, 'Choice Band') && physical) ||
        (hasIt(A, 'Choice Specs') && !physical)) am.push(6144);
      at = Math.max(1, pokeRound(at * chainMods(am, 410, 131072) / 4096));
      // defense
      var dk = isPhysDef ? 'def' : 'spd', db = dSt[dk] || 0, df;
      if (db === 0 || (critical && db > 0) || hasAb(A, 'Unaware')) df = D.stats[dk];
      else df = stageMod(D.stats[dk], hasAb(D, 'Simple') ? Math.max(-6, Math.min(6, db * 2)) : db);
      if (weather === 'sand' && (D.types[0] === TI.Rock || D.types[1] === TI.Rock) && !isPhysDef) df = pokeRound(df * 3 / 2);
      var dm = [];
      if (hasAb(D, 'Marvel Scale') && D.status && isPhysDef) dm.push(6144);
      else if (hasAb(D, 'Flower Gift') && weather === 'sun' && !isPhysDef) dm.push(6144);
      if ((!isPhysDef && hasIt(D, 'Soul Dew') && (D.nat === 380 || D.nat === 381)) || (hasIt(D, 'Eviolite') && NFE[D.nat])) dm.push(6144);
      if ((hasIt(D, 'Metal Powder') && D.nat === 132 && isPhysDef) || (hasIt(D, 'Deep Sea Scale') && D.nat === 366 && !isPhysDef)) dm.push(8192);
      df = Math.max(1, pokeRound(df * chainMods(dm, 410, 131072) / 4096));
      // base damage
      var base = Math.floor(Math.floor(Math.floor(2 * A.level / 5 + 2) * bp * at / df) / 50 + 2);
      if (spread) base = pokeRound(base * 3072 / 4096);
      if ((weather === 'sun' && tn === 'Fire') || (weather === 'rain' && tn === 'Water')) base = pokeRound(base * 6144 / 4096);
      else if ((weather === 'sun' && tn === 'Water') || (weather === 'rain' && tn === 'Fire')) base = pokeRound(base * 2048 / 4096);
      if (critical) base = Math.floor(base * 2);
      var stabM = stab ? (hasAb(A, 'Adaptability') ? 8192 : 6144) : 4096;
      var fm = [];
      if (!critical && ((physical && f.reflect) || (!physical && f.lightScreen))) fm.push(f.double ? 2703 : 2048);
      if (hasAb(D, 'Multiscale') && D.hp === D.maxHP) fm.push(2048);
      if (hasAb(A, 'Tinted Lens') && effv < 1) fm.push(8192);
      if (hasAb(A, 'Sniper') && critical) fm.push(6144);
      if (hasAb(D, 'Solid Rock', 'Filter') && effv > 1) fm.push(3072);
      if (hasIt(A, 'Expert Belt') && effv > 1) fm.push(4915);
      else if (hasIt(A, 'Life Orb')) fm.push(5324);
      if (RESIST_BERRIES[itName(D.item)] === tn && (effv > 1 || tn === 'Normal') && !hasAb(A, 'Unnerve')) fm.push(2048);
      var finalMod = chainMods(fm, 41, 131072);
      var burn = A.status === 'brn' && physical && !hasAb(A, 'Guts');
      var out = [];
      for (var i = 0; i < 16; i++) {
        var d = Math.floor(base * (85 + i) / 100);
        if (stabM !== 4096) d = d * stabM / 4096;
        d = Math.floor(pokeRound(d) * effv);
        if (burn) d = Math.floor(d / 2);
        out.push(pokeRound(Math.max(1, d * finalMod / 4096)));
      }
      return out;
    }

    var dmgFn = gen === 4 ? dmg4 : dmg5;
    if (moveId === MV.TRIPLE_KICK) {
      var parts = [1, 2, 3].map(function (h) { return [dmgFn(false, h), dmgFn(true, h)]; });
      for (var z = 0; z < 16; z++) {
        res.rolls.push(parts[0][0][z] + parts[1][0][z] + parts[2][0][z]);
        res.crit.push(parts[0][1][z] + parts[1][1][z] + parts[2][1][z]);
      }
      res.dist = G3.convolve(G3.convolve(G3.dist(parts[0][0]), G3.dist(parts[1][0])), G3.dist(parts[2][0]));
      res.notes.push('triplekick');
    } else {
      res.rolls = dmgFn(false, 1);
      res.crit = dmgFn(true, 1);
    }
    res.power = basePower(1);
    // number of hits: Gen 5 move data has them, Gen 4 by move number
    var hits = mv.hits || null;
    if (!hits && inL(MULTI, moveId)) hits = [2, 5];
    if (!hits && inL(DOUBLE, moveId)) hits = [2, 2];
    if (hits && moveId !== MV.TRIPLE_KICK) {
      if (hits[0] === hits[1] && hits[0] > 1) res.hits = hits[0];
      else if (hits[1] > 1) { res.hits = hasAb(A, 'Skill Link') ? 5 : [hits[0], hits[1]]; if (Array.isArray(res.hits)) res.notes.push('multihit'); }
    }
    if ((moveId === MV.EXPLOSION || moveId === MV.SELF_DESTRUCT) && gen === 4) res.notes.push('explosion');
    if (moveId === MV.SOLAR_BEAM) res.notes.push('solarbeam');
    if (moveId === MV.AVALANCHE || moveId === MV.REVENGE) res.notes.push('revenge');
    if (moveId === MV.DREAM_EATER) res.notes.push('dreameater');
    if (hasAb(A, 'Rivalry')) res.notes.push('rivalry');
    // crit stage 6 = always a critical hit (Gen 5: Storm Throw, Frost Breath): show the critical damage as the normal damage
    if ((crit0 || 0) >= 6 && !hasAb(D, 'Battle Armor', 'Shell Armor')) { res.rolls = res.crit.slice(); if (res.dist) res.dist = G3.dist(res.rolls); res.notes.push('alwayscrit'); }
    return finish(res, A, D, moveId, mv, gen, crit0);
  }
  function posBoosts(st) { var s = 0; ['atk', 'def', 'spa', 'spd', 'spe'].forEach(function (k) { if ((st[k] || 0) > 0) s += st[k]; }); return s; }
  function simple(v, st) { var s = Math.max(-6, Math.min(6, (st || 0) * 2)); return s > 0 ? Math.floor(v * (2 + s) / 2) : s < 0 ? Math.floor(v * 2 / (2 - s)) : v; }

  var CRIT = [16, 8, 4, 3, 2];
  function finish(res, A, D, moveId, mv, gen, crit0) {
    var stage = (crit0 || 0) + (hasAb(A, 'Super Luck') ? 1 : 0) + (hasIt(A, 'Scope Lens', 'Razor Claw') ? 1 : 0) +
      (hasIt(A, 'Stick') && A.nat === 83 ? 2 : 0) + (hasIt(A, 'Lucky Punch') && A.nat === 113 ? 2 : 0) + (A.critStage || 0);
    // crit stage 6 in the move data = always a critical hit (Gen 5: Storm Throw, Frost Breath)
    res.critChance = hasAb(D, 'Battle Armor', 'Shell Armor') ? 0 : (crit0 || 0) >= 6 ? 1 : 1 / CRIT[Math.min(4, stage)];
    res.min = res.rolls[0]; res.max = res.rolls[15];
    res.critMin = res.crit[0]; res.critMax = res.crit[15];
    var one = res.dist || G3.dist(res.rolls);
    if (typeof res.hits === 'number' && res.hits > 1) {
      var acc = one; for (var h = 1; h < res.hits; h++) acc = G3.convolve(acc, one);
      one = acc; res.multiMin = res.min * res.hits; res.multiMax = res.max * res.hits;
    } else if (Array.isArray(res.hits)) {
      // 2–5 hits: Gen 4 has 2 and 3 hits at 3/8 each and 4 and 5 at 1/8, Gen 5 has 1/3, 1/3, 1/6, 1/6
      var d2 = G3.convolve(one, one), d3 = G3.convolve(d2, one), d4 = G3.convolve(d3, one), d5 = G3.convolve(d4, one);
      var pr = gen === 4 ? [3 / 8, 3 / 8, 1 / 8, 1 / 8] : [1 / 3, 1 / 3, 1 / 6, 1 / 6];
      one = G3.mix([[d2, pr[0]], [d3, pr[1]], [d4, pr[2]], [d5, pr[3]]]);
      res.multiMin = res.min * 2; res.multiMax = res.max * 5;
    }
    res.useDist = one;
    return res;
  }

  window.NDS_CALC = {
    TYPES: TYPES, TI: TI, NATURES: NATURES, calc: calc, speedOf: speedOf, fromSave: fromSave, trainerParty: trainerParty, calcStats: calcStats,
    defaultMoves: defaultMoves, levelFromExp: G3.levelFromExp, koChance: G3.koChance, gen4Pid: gen4Pid, gen5Pid: gen5Pid, specOf: specOf, abName: abName, itName: itName
  };
})();
