// Champions damage engine (Gen 9 formula, level 50, Stat Points instead of EVs).
(function () {
  'use strict';

  var TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
    'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

  // attacking type -> {defending type: multiplier}; missing = 1
  var CHART = {
    Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
    Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
    Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
    Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
    Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
    Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
  };

  var NATURES = {
    Adamant: ['at', 'sa'], Bashful: [], Bold: ['df', 'at'], Brave: ['at', 'sp'], Calm: ['sd', 'at'],
    Careful: ['sd', 'sa'], Docile: [], Gentle: ['sd', 'df'], Hardy: [], Hasty: ['sp', 'df'],
    Impish: ['df', 'sa'], Jolly: ['sp', 'sa'], Lax: ['df', 'sd'], Lonely: ['at', 'df'], Mild: ['sa', 'df'],
    Modest: ['sa', 'at'], Naive: ['sp', 'sd'], Naughty: ['at', 'sd'], Quiet: ['sa', 'sp'], Quirky: [],
    Rash: ['sa', 'sd'], Relaxed: ['df', 'sp'], Sassy: ['sd', 'sp'], Serious: [], Timid: ['sp', 'at']
  };

  var STAT_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
  var STAT_LABEL = { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' };
  var STAT_LONG = { hp: 'HP', at: 'Attack', df: 'Defense', sa: 'Sp. Atk', sd: 'Sp. Def', sp: 'Speed' };
  var SP_MAX = 32, SP_TOTAL = 66, LEVEL = 50;

  var TYPE_ITEMS = {
    'Silk Scarf': 'Normal', 'Charcoal': 'Fire', 'Mystic Water': 'Water', 'Magnet': 'Electric',
    'Miracle Seed': 'Grass', 'Never-Melt Ice': 'Ice', 'Black Belt': 'Fighting', 'Poison Barb': 'Poison',
    'Soft Sand': 'Ground', 'Sharp Beak': 'Flying', 'Twisted Spoon': 'Psychic', 'Silver Powder': 'Bug',
    'Hard Stone': 'Rock', 'Spell Tag': 'Ghost', 'Dragon Fang': 'Dragon', 'Black Glasses': 'Dark',
    'Metal Coat': 'Steel', 'Fairy Feather': 'Fairy'
  };
  var RESIST_BERRIES = {
    'Occa Berry': 'Fire', 'Passho Berry': 'Water', 'Wacan Berry': 'Electric', 'Rindo Berry': 'Grass',
    'Yache Berry': 'Ice', 'Chople Berry': 'Fighting', 'Kebia Berry': 'Poison', 'Shuca Berry': 'Ground',
    'Coba Berry': 'Flying', 'Payapa Berry': 'Psychic', 'Tanga Berry': 'Bug', 'Charti Berry': 'Rock',
    'Kasib Berry': 'Ghost', 'Haban Berry': 'Dragon', 'Colbur Berry': 'Dark', 'Babiri Berry': 'Steel',
    'Roseli Berry': 'Fairy', 'Chilan Berry': 'Normal'
  };
  var ATE = { Pixilate: 'Fairy', Aerilate: 'Flying', Refrigerate: 'Ice', Galvanize: 'Electric', Dragonize: 'Dragon' };
  var MOLD_BREAKERS = ['Mold Breaker', 'Teravolt', 'Turboblaze'];
  var BREAKABLE_ABILITIES = ['Levitate', 'Eelevate', 'Flash Fire', 'Water Absorb', 'Storm Drain', 'Dry Skin', 'Volt Absorb',
    'Lightning Rod', 'Motor Drive', 'Sap Sipper', 'Earth Eater', 'Well-Baked Body', 'Bulletproof', 'Soundproof', 'Wonder Guard',
    'Multiscale', 'Fluffy', 'Aura Guard', 'Fur Coat', 'Marvel Scale', 'Grass Pelt', 'Filter', 'Solid Rock', 'Thick Fat',
    'Heatproof', 'Water Bubble', 'Purifying Salt', 'Ice Scales', 'Punk Rock', 'Friend Guard', 'Unaware', 'Battle Armor',
    'Shell Armor', 'Flower Gift', 'Dauntless Shield', 'Sturdy'];

  function pokeRound(n) { return (n % 1 > 0.5) ? Math.ceil(n) : Math.floor(n); }
  function applyMod(v, mod) { return pokeRound(v * mod / 4096); }
  function chainMods(mods) {
    var M = 4096;
    for (var i = 0; i < mods.length; i++) if (mods[i] !== 4096) M = (M * mods[i] + 2048) >> 12;
    return M;
  }

  // ---------- stats ----------
  function natureMod(nature, stat) {
    var n = NATURES[nature] || [];
    if (n.length && n[0] === stat) return 1.1;
    if (n.length && n[1] === stat) return 0.9;
    return 1;
  }
  // With IV 31 at level 50 every Stat Point adds exactly +1 to the stat (1 SP = 8 EVs, first SP = 4 EVs).
  function calcStat(stat, base, sp, nature, species) {
    sp = Math.max(0, Math.min(SP_MAX, sp | 0));
    if (stat === 'hp') {
      if (species === 'Shedinja') return 1;
      return Math.floor((2 * base + 31) * LEVEL / 100) + LEVEL + 10 + sp;
    }
    return Math.floor((Math.floor((2 * base + 31) * LEVEL / 100) + 5 + sp) * natureMod(nature, stat));
  }
  function spToEv(sp) { return sp <= 0 ? 0 : Math.min(252, 8 * sp - 4); }
  function evToSp(ev) { return ev <= 0 ? 0 : Math.min(SP_MAX, Math.floor((ev + 4) / 8)); }

  function boosted(stat, boost) {
    if (!boost) return stat;
    return boost > 0 ? Math.floor(stat * (2 + boost) / 2) : Math.floor(stat * 2 / (2 - boost));
  }

  function hasType(p, t) { return p.types.indexOf(t) !== -1; }

  function effectiveWeather(field, a, b) {
    var w = field.weather;
    if (!w || w === 'None') return '';
    if (field.weatherSuppressed) return '';
    if ((a && (a.ability === 'Cloud Nine' || a.ability === 'Air Lock')) ||
        (b && (b.ability === 'Cloud Nine' || b.ability === 'Air Lock'))) return '';
    return w;
  }

  // ---------- helpers (mirroring the NCP VGC Damage Calculator, gen 10 / Champions) ----------
  function itemOf(p) { var it = p && p.item; return (!it || it === '(none)') ? '' : it; }
  function statusOf(p) { return (p && p.status) || 'Healthy'; }
  function clampBoost(v) { return Math.max(-6, Math.min(6, v)); }
  function chartOf(atk, def) {
    if (!def || def === 'Typeless' || !CHART[atk]) return 1;
    return CHART[atk][def] !== undefined ? CHART[atk][def] : 1;
  }
  function cloneMon(p) {
    var c = Object.assign({}, p);
    c.boosts = Object.assign({}, p.boosts);
    return c;
  }

  // NCP pIsGrounded
  function isGrounded(p, field) {
    var it = itemOf(p);
    if (field.gravity || it === 'Iron Ball') return true;
    return it !== 'Air Balloon' && p.ability !== 'Levitate' && p.ability !== 'Eelevate' && !hasType(p, 'Flying');
  }

  // NCP getFinalSpeed: one float multiplier, rounded once
  var HALF_SPEED_ITEMS = ['Macho Brace', 'Iron Ball', 'Power Anklet', 'Power Band', 'Power Belt', 'Power Bracer', 'Power Lens', 'Power Weight'];
  function getSpeed(p, field, side) {
    var s = boosted(p.stats.sp, (p.boosts && p.boosts.sp) || 0);
    var w = effectiveWeather(field, p, null);
    var it = itemOf(p), m = 1;
    if (it === 'Choice Scarf') m *= 1.5;
    else if (HALF_SPEED_ITEMS.indexOf(it) !== -1) m *= 0.5;
    else if (p.species === 'Ditto' && it === 'Quick Powder') m *= 2;
    if (p.ability === 'Quick Feet' && statusOf(p) !== 'Healthy') m *= 1.5;
    else if (p.ability === 'Slow Start') m *= 0.5;
    else if ((((p.ability === 'Chlorophyll' && w.indexOf('Sun') !== -1) || (p.ability === 'Swift Swim' && w.indexOf('Rain') !== -1)) && it !== 'Utility Umbrella') ||
        (p.ability === 'Sand Rush' && w === 'Sand') || (p.ability === 'Slush Rush' && (w === 'Snow' || w === 'Hail')) ||
        (p.ability === 'Surge Surfer' && field.terrain === 'Electric') || (p.ability === 'Unburden' && p.unburden)) m *= 2;
    if (side && side.tailwind) m *= 2;
    if (side && side.swamp) m *= 0.25;
    s = pokeRound(s * m);
    if (statusOf(p) === 'Paralyzed' && p.ability !== 'Quick Feet') s = Math.floor(s / 2);
    if (s > 65535) s %= 65536;
    if (s > 10000) s = 10000;
    return Math.max(1, s);
  }

  // simple type chart lookup used by other modules (builder, pokedex, bots)
  function typeEff(moveType, defTypes, opts) {
    opts = opts || {};
    var e = 1;
    for (var i = 0; i < defTypes.length; i++) {
      var dt = defTypes[i];
      if (!dt || dt === 'Typeless') continue;
      var m = chartOf(moveType, dt);
      if (m === 0) {
        if (opts.scrappy && dt === 'Ghost' && (moveType === 'Normal' || moveType === 'Fighting')) m = 1;
        else if (opts.gravity && dt === 'Flying' && moveType === 'Ground') m = 1;
      }
      if (opts.freezeDry && dt === 'Water') m = 2;
      if (opts.flyingPress) m *= chartOf('Flying', dt);
      e *= m;
    }
    return e;
  }

  // NCP getSingleTypeEffectiveness / getMoveEffectiveness / overrideTypeEffectiveness
  function singleEff(name, type, t, o) {
    if (o.scrappy && t === 'Ghost' && (type === 'Normal' || type === 'Fighting')) return 1;
    if ((o.gravity || o.defItem === 'Iron Ball') && t === 'Flying' && type === 'Ground') return 1;
    if (name === 'Freeze-Dry' && t === 'Water') return 2;
    if (name === 'Nihil Light' && t === 'Fairy') return 1;
    var e = chartOf(type, t);
    if (o.strongWinds && t === 'Flying' && e > 1) e = 1;
    else if (o.defItem === 'Ring Target' && e === 0) e = 1;
    if (name === 'Flying Press') e *= chartOf('Flying', t);
    return e;
  }
  function moveEff(name, type, defTypes, o) {
    var t1 = defTypes[0], t2 = defTypes[1];
    var e = singleEff(name, type, t1, o) * (t2 && t2 !== t1 ? singleEff(name, type, t2, o) : 1);
    if (o.teraShell && e > 0.5) { o.usedTeraShell = true; return 0.5; }
    if (defTypes.indexOf('Flying') !== -1 && type === 'Ground' && (name === 'Thousand Arrows' || o.defItem === 'Iron Ball') && !o.gravity) return 1;
    return e;
  }

  function weightBP(w) {
    return w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20;
  }
  function ratioBP(atk, def) {
    var r = atk / def;
    return r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40;
  }
  function effWeight(p, ability) {
    var ab = ability !== undefined ? ability : (p && p.ability);
    var hg = Math.round(((p && p.weight) || 0) * 10);
    if (ab === 'Heavy Metal') hg *= 2;
    else if (ab === 'Light Metal') hg = Math.floor(hg / 2);
    if (itemOf(p) === 'Float Stone') hg = Math.floor(hg / 2);
    return Math.max(1, hg) / 10;
  }
  function weightOf(p, ability) { return effWeight(p, ability); }

  function isMegaStoneFor(item, species) {
    return /ite( [XYZ])?$/.test(item || '') && item !== 'Eviolite' && species.indexOf('Mega ') === 0;
  }
  var LOCKED_ITEMS = [
    [/ Plate$/, 'Arceus'], [/ Memory$/, 'Silvally'], [/ Drive$/, 'Genesect'], [/^Griseous (Orb|Core)$/, 'Giratina'],
    [/^Adamant Crystal$/, 'Dialga'], [/^Lustrous Globe$/, 'Palkia'], [/^Red Orb$/, 'Groudon'], [/^Blue Orb$/, 'Kyogre'],
    [/^Rusted Sword$/, 'Zacian'], [/^Rusted Shield$/, 'Zamazenta'], [/^(Hearthflame|Wellspring|Cornerstone) Mask$/, 'Ogerpon']
  ];
  function baseName(p) { return String((p && (p.baseSpecies || p.species)) || '').replace(/^Mega /, '').replace(/ [XYZ]$/, '').replace(/-.*$/, ''); }
  function itemLocked(item, p) {
    if (!item || item === '(none)') return false;
    if (/ium Z$/.test(item)) return true;
    var b = baseName(p);
    for (var i = 0; i < LOCKED_ITEMS.length; i++) if (LOCKED_ITEMS[i][0].test(item)) return b === LOCKED_ITEMS[i][1];
    var look = typeof MEGA_STONE_USER_LOOKUP !== 'undefined' ? MEGA_STONE_USER_LOOKUP : (typeof globalThis !== 'undefined' && globalThis.MEGA_STONE_USER_LOOKUP);
    if (look && look[item]) {
      return [].concat(look[item]).some(function (u) { return String(u).replace(/-.*$/, '') === b; });
    }
    return isMegaStoneFor(item, (p && p.species) || '');
  }
  function cantRemove(item, p) {
    if (!item) return true;
    var sp = (typeof p === 'string') ? p : ((p && p.species) || '');
    var monObj = (typeof p === 'object' && p) ? p : { species: sp };
    if (typeof cantRemoveItem === 'function') { try { if (cantRemoveItem(item, sp, '')) return true; } catch (e) { /* fall through */ } }
    return itemLocked(item, monObj);
  }
  var ALL_ADJACENT = ['Boomburst', 'Brutal Swing', 'Bulldoze', 'Discharge', 'Earthquake', 'Explosion', 'Lava Plume', 'Magnitude',
    'Mind Blown', 'Misty Explosion', 'Parabolic Charge', 'Petal Blizzard', 'Searing Shot', 'Self-Destruct', 'Sludge Wave',
    'Sparkling Aria', 'Surf', 'Synchronoise'];
  function hitsAlly(name) { return ALL_ADJACENT.indexOf(name) !== -1; }
  var METRONOME_MODS = [4096, 4915, 5734, 6553, 7372, 8192];
  function typeBoostItem(item, species) {
    if (TYPE_ITEMS[item]) return [TYPE_ITEMS[item]];
    var out = [];
    if (typeof getItemBoostType === 'function') { var t = getItemBoostType(item); if (t) out.push(t); }
    if (typeof getItemDualTypeBoost === 'function') { var d = getItemDualTypeBoost(item, species); if (d && d.length) out = out.concat(d); }
    return out;
  }
  function resistBerryType(item) {
    if (RESIST_BERRIES[item]) return RESIST_BERRIES[item];
    if (typeof getBerryResistType === 'function') return getBerryResistType(item) || '';
    return '';
  }

  var TYPE_CHANGE_BOOST_ABILITIES = ['Normalize', 'Aerilate', 'Pixilate', 'Refrigerate', 'Galvanize', 'Dragonize'];
  var NO_ATE_MOVES = ['Hidden Power', 'Weather Ball', 'Natural Gift', 'Judgement', 'Techno Blast', 'Revelation Dance', 'Multi-Attack', 'Terrain Pulse'];
  var UNIGNORABLE = ['Shadow Shield', 'Full Metal Body', 'Prism Armor', 'As One', 'Protosynthesis', 'Quark Drive',
    'Tablets of Ruin', 'Vessel of Ruin', 'Sword of Ruin', 'Beads of Ruin'];
  var IGNORE_MOVES = ['Moongeist Beam', 'Sunsteel Strike', 'Photon Geyser', 'Searing Sunraze Smash', 'Menacing Moonraze Maelstrom',
    'Light That Burns the Sky', 'G-Max Drum Solo', 'G-Max Fireball', 'G-Max Hydrosnipe'];
  var PINCH = { Blaze: 'Fire', Overgrow: 'Grass', Torrent: 'Water', Swarm: 'Bug' };

  // ---------- main calculation (NCP GET_DAMAGE_SV, gen 10) ----------
  // attacker/defender: {species, types, stats, boosts, ability, item, status, curHP, maxHP, weight, canEvolve}
  // move: {name, bp, type, category, crit, hits, flags...}
  // field: {format, weather, terrain, gravity, ruin:{tablets,vessel,sword,beads}, fairyAura, darkAura, auraBreak}
  // aSide/dSide: {helpingHand, reflect, lightScreen, auroraVeil, friendGuard, battery, powerSpot, steelySpirit, flowerGift, tailwind}
  function calculate(attacker, defender, move, field, aSide, dSide) {
    var res = { damage: [0], desc: {}, move: move, attacker: attacker, defender: defender, notes: [] };
    if (!move || !move.name || move.name === '(No Move)') { res.empty = true; return res; }
    if (move.category === 'Status') { res.status = true; return res; }
    aSide = aSide || {}; dSide = dSide || {};

    var d = res.desc;
    var doubles = field.format === 'Doubles';
    var weather = effectiveWeather(field, attacker, defender);
    var terrain = (field.terrain && field.terrain !== 'None') ? field.terrain : '';
    var name = move.name;
    var category = move.category;
    // Photon Geyser / Shell Side Arm pick the stronger side (NCP usesPhysicalAttack, boosted stats)
    var bst = function (p, k) { return boosted(p.stats[k], (p.boosts && p.boosts[k]) || 0); };
    if (((name === 'Photon Geyser' || name === 'Light That Burns the Sky') && bst(attacker, 'at') > bst(attacker, 'sa')) ||
        (name === 'Shell Side Arm' && bst(attacker, 'at') / bst(defender, 'df') > bst(attacker, 'sa') / bst(defender, 'sd'))) category = 'Physical';
    var aItem = itemOf(attacker), dItemReal = itemOf(defender);
    var megaSol = attacker.ability === 'Mega Sol';
    var attackerGrounded = isGrounded(attacker, field);
    var defenderGrounded = isGrounded(defender, field);
    var parentalBond = attacker.ability === 'Parental Bond';

    // ---- move type changes (checkMoveTypeChange) ----
    var type = move.type;
    if (name === 'Weather Ball') {
      type = ((weather.indexOf('Sun') !== -1 && aItem !== 'Utility Umbrella') || megaSol) ? 'Fire'
        : (weather.indexOf('Rain') !== -1 && aItem !== 'Utility Umbrella') ? 'Water'
          : weather === 'Sand' ? 'Rock' : (weather === 'Snow' || weather === 'Hail') ? 'Ice' : 'Normal';
    } else if (name === 'Terrain Pulse') {
      type = (!terrain || !attackerGrounded) ? 'Normal' : terrain === 'Grassy' ? 'Grass' : terrain === 'Misty' ? 'Fairy' : terrain;
    } else if (name === 'Revelation Dance') {
      type = attacker.types[0] !== 'Typeless' ? attacker.types[0] : (attacker.types[1] && attacker.types[1] !== 'Typeless' ? attacker.types[1] : 'Typeless');
    } else if (name === 'Aura Wheel' && attacker.species === 'Morpeko-Hangry') {
      type = 'Dark';
    } else if (name === 'Raging Bull') {
      type = { 'Tauros-Paldea-Combat': 'Fighting', 'Tauros-Paldea-Blaze': 'Fire', 'Tauros-Paldea-Aqua': 'Water' }[attacker.species] || 'Normal';
    } else if (name === 'Ivy Cudgel') {
      type = { 'Ogerpon-Wellspring': 'Water', 'Ogerpon-Hearthflame': 'Fire', 'Ogerpon-Cornerstone': 'Rock' }[attacker.species] || 'Grass';
    } else if (name === 'Struggle') {
      type = 'Typeless';
    }

    // conditional priority / spread / contact
    var isPriority = !!move.isPriority || (name === 'Grassy Glide' && terrain === 'Grassy' && attackerGrounded) ||
      (attacker.ability === 'Triage' && move.isHealing) ||
      (attacker.ability === 'Gale Wings' && type === 'Flying' && attacker.curHP === attacker.maxHP);
    var isSpreadMove = !!move.isSpread || (name === 'Expanding Force' && terrain === 'Psychic' && attackerGrounded);
    var makesContact = !!move.makesContact;
    if (makesContact && (aItem === 'Protective Pads' || (aItem === 'Punching Glove' && move.isPunch) || attacker.ability === 'Long Reach')) makesContact = false;
    else if (name === 'Shell Side Arm' && category === 'Physical') makesContact = true;

    // ---- ability ignoring (Mold Breaker) ----
    var ignoresAbility = (MOLD_BREAKERS.indexOf(attacker.ability) !== -1 || IGNORE_MOVES.indexOf(name) !== -1);
    var ignoresFriendGuard = ignoresAbility;
    function defAbilityOf(p) {
      if (ignoresAbility && UNIGNORABLE.indexOf(p.ability) === -1 && itemOf(p) !== 'Ability Shield') return '';
      return p.ability;
    }
    var defAbility = defAbilityOf(defender);
    var abilityIgnored = ignoresAbility && defAbility === '' && !!defender.ability;
    if (ignoresAbility && MOLD_BREAKERS.indexOf(attacker.ability) !== -1 && abilityIgnored) d.attackerAbility = attacker.ability;

    var merciless = attacker.ability === 'Merciless' && (statusOf(defender) === 'Poisoned' || statusOf(defender) === 'Badly Poisoned');
    var isCrit = (!!move.crit || !!move.alwaysCrit || merciless) && defAbility !== 'Battle Armor' && defAbility !== 'Shell Armor';
    if (merciless && isCrit) d.attackerAbility = 'Merciless';

    // ---- -ate abilities, Normalize, Liquid Voice ----
    var ateBoost = false;
    if ((TYPE_CHANGE_BOOST_ABILITIES.indexOf(attacker.ability) !== -1 || attacker.ability === 'Liquid Voice') && NO_ATE_MOVES.indexOf(name) === -1) {
      if (attacker.ability === 'Liquid Voice') {
        if (move.isSound) { type = 'Water'; d.attackerAbility = attacker.ability; }
      } else if (attacker.ability !== 'Normalize' && type === 'Normal') {
        type = ATE[attacker.ability]; ateBoost = true;
      } else if (attacker.ability === 'Normalize') {
        type = 'Normal'; ateBoost = true;
      }
    }
    res.moveType = type;

    // ---- type effectiveness and immunities ----
    var effOpts = {
      scrappy: attacker.ability === 'Scrappy' || attacker.ability === "Mind's Eye",
      gravity: !!field.gravity, defItem: dItemReal, strongWinds: weather === 'Strong Winds',
      teraShell: defAbility === 'Tera Shell' && defender.curHP === defender.maxHP
    };
    var eff = moveEff(name, type, defender.types, effOpts);
    if (effOpts.usedTeraShell) d.defenderAbility = 'Tera Shell';
    if (weather === 'Strong Winds' && hasType(defender, 'Flying') && chartOf(type, 'Flying') > 1) d.weather = 'Strong Winds';
    res.effectiveness = eff;
    function immune(why) { if (why) res.notes.push(why); res.effectiveness = 0; res.damage = [0]; return res; }
    if (eff === 0) return immune();
    var absorb = {
      Fire: ['Flash Fire', 'Well-Baked Body'], Water: ['Water Absorb', 'Storm Drain', 'Dry Skin'],
      Electric: ['Volt Absorb', 'Lightning Rod', 'Motor Drive'], Grass: ['Sap Sipper'], Ground: ['Earth Eater']
    };
    if ((defAbility === 'Wonder Guard' && eff <= 1 && type !== 'Typeless') ||
        (absorb[type] && absorb[type].indexOf(defAbility) !== -1) ||
        (type === 'Ground' && !field.gravity && dItemReal !== 'Iron Ball' && name !== 'Thousand Arrows' && (defAbility === 'Levitate' || defAbility === 'Eelevate')) ||
        (move.isBullet && defAbility === 'Bulletproof') || (move.isSound && defAbility === 'Soundproof') ||
        (move.isWind && defAbility === 'Wind Rider')) {
      d.defenderAbility = defAbility; return immune();
    }
    if (type === 'Ground' && !field.gravity && dItemReal === 'Air Balloon' && name !== 'Thousand Arrows') { d.defenderItem = 'Air Balloon'; return immune(); }
    if ((weather === 'Harsh Sun' && type === 'Water') || (weather === 'Heavy Rain' && type === 'Fire')) { d.weather = weather; return immune(); }
    if (name === 'Sky Drop' && (hasType(defender, 'Flying') || weightOf(defender, defAbility) >= 200 || field.gravity)) return immune();
    if (name === 'Synchronoise' && !attacker.types.some(function (t) { return hasType(defender, t); })) return immune();
    if ((defAbility === 'Damp' || attacker.ability === 'Damp') && ['Self-Destruct', 'Explosion', 'Mind Blown', 'Misty Explosion'].indexOf(name) !== -1) {
      if (defAbility === 'Damp') d.defenderAbility = defAbility; else d.attackerAbility = attacker.ability;
      return immune();
    }
    if (move.isOHKO && defAbility === 'Sturdy') { d.defenderAbility = defAbility; return immune(); }
    if (name === 'Fling' && (!aItem || (typeof cantFlingItem === 'function' && cantFlingItem(aItem, attacker.species, defAbility)))) { if (aItem) d.attackerItem = aItem; return immune(); }
    if (name === 'Natural Gift' && aItem.indexOf(' Berry') === -1) return immune();
    if (['Queenly Majesty', 'Dazzling', 'Armor Tail'].indexOf(defAbility) !== -1 && isPriority) { d.defenderAbility = defAbility; return immune(); }
    if (terrain === 'Psychic' && isPriority && defenderGrounded) { d.terrain = terrain; return immune(); }
    if (name === 'Dream Eater' && statusOf(defender) !== 'Asleep' && defAbility !== 'Comatose') return immune();
    if (name === 'Poltergeist' && !dItemReal) return immune('Poltergeist schlägt ohne Item fehl');

    // ---- fixed damage (setDamage) ----
    res.nHits = 1;
    var COUNTER_MOVES = { 'Counter': 2, 'Mirror Coat': 2, 'Metal Burst': 1.5, 'Comeuppance': 1.5 };
    if (COUNTER_MOVES[name]) {
      var taken = Math.max(0, move.dmgTaken || 0);
      var cd = Math.floor(taken * COUNTER_MOVES[name]);
      if (parentalBond) { cd *= 2; res.nHits = 2; }
      res.damage = [cd];
      d.fixed = taken + ' erlittener Schaden ×' + COUNTER_MOVES[name];
      if (!taken) res.notes.push('Erlittenen Schaden bei der Attacke eintragen');
      return res;
    }
    if (name === 'Super Fang' || name === 'Ruination' || name === "Nature's Madness") {
      var half = Math.max(1, Math.floor(defender.curHP / 2));
      if (parentalBond && defender.curHP - half > 0) {
        half += Math.max(1, Math.floor((defender.curHP - half) / 2)); res.nHits = 2; d.attackerAbility = 'Parental Bond';
      }
      res.damage = [half]; return res;
    }
    if (name === 'Endeavor') { res.damage = [attacker.curHP < defender.curHP ? defender.curHP - attacker.curHP : 0]; return res; }
    if (name === 'Final Gambit') { res.damage = [attacker.curHP]; return res; }
    if (name === 'Sonic Boom') { if (parentalBond) { res.damage = [40]; res.nHits = 2; d.attackerAbility = 'Parental Bond'; } else res.damage = [20]; return res; }
    if (name === 'Dragon Rage') { if (parentalBond) { res.damage = [80]; res.nHits = 2; d.attackerAbility = 'Parental Bond'; } else res.damage = [40]; return res; }
    if (name === 'Seismic Toss' || name === 'Night Shade') {
      if (parentalBond) { res.damage = [2 * LEVEL]; res.nHits = 2; d.attackerAbility = 'Parental Bond'; } else res.damage = [LEVEL];
      return res;
    }
    if (move.isOHKO) {
      if (name === 'Sheer Cold' && hasType(defender, 'Ice')) return immune();
      res.damage = [defender.curHP]; res.notes.push('OHKO-Attacke'); return res;
    }
    if (name === 'Steel Roller' && !terrain) return immune('Steel Roller schlägt ohne Terrain fehl');
    if (name === 'Spit Up' && !(move.stockpile > 0)) return immune('Spit Up schlägt ohne Stockpile fehl');

    var hitsPhysical = category === 'Physical' || !!move.dealsPhysicalDamage || ['Psyshock', 'Psystrike', 'Secret Sword'].indexOf(name) !== -1;
    var atkKey = name === 'Body Press' ? 'df' : category === 'Physical' ? 'at' : 'sa';
    var defKey = hitsPhysical ? 'df' : 'sd';
    res.atkKey = atkKey; res.defKey = defKey;
    var spread = doubles && isSpreadMove && !move.singleTarget;
    res.spread = spread;
    var ruin = field.ruin || {};

    // one hit; A/D may be modified copies for later hits (Parental Bond, Multiscale, berries, Stamina ...)
    function damageFor(A, D, dAb, ho) {
      var aIt = itemOf(A), dIt = itemOf(D);
      var aSpe = getSpeed(A, field, aSide), dSpe = getSpeed(D, field, dSide);
      var dStatus = statusOf(D) !== 'Healthy';

      // 1. base power (basePowerFunc)
      var bp = move.bp || 0;
      switch (name) {
        case 'Gyro Ball': bp = Math.min(150, Math.floor(25 * dSpe / aSpe) + 1); d.moveBP = bp; break;
        case 'Electro Ball': {
          var r = dSpe === 0 ? 0 : Math.floor(aSpe / dSpe);
          bp = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; d.moveBP = bp; break;
        }
        case 'Low Kick': case 'Grass Knot': bp = weightBP(weightOf(D, dAb)); d.moveBP = bp; break;
        case 'Heavy Slam': case 'Heat Crash': bp = ratioBP(weightOf(A, A.ability), weightOf(D, dAb)); d.moveBP = bp; break;
        case 'Eruption': case 'Water Spout': case 'Dragon Energy':
          bp = Math.max(1, Math.floor(150 * A.curHP / A.maxHP)); d.moveBP = bp; break;
        case 'Flail': case 'Reversal': {
          var p = Math.floor(48 * A.curHP / A.maxHP);
          bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; d.moveBP = bp; break;
        }
        case 'Crush Grip': case 'Wring Out':
          bp = Math.floor(pokeRound(120 * 100 * Math.floor(D.curHP * 4096 / D.maxHP) / 4096) / 100); d.moveBP = bp; break;
        case 'Hard Press':
          bp = Math.floor(pokeRound(100 * 100 * Math.floor(D.curHP * 4096 / D.maxHP) / 4096) / 100); d.moveBP = bp; break;
        case 'Stored Power': case 'Power Trip': {
          var sum = 0; ['at', 'df', 'sa', 'sd', 'sp'].forEach(function (k) { if (A.boosts[k] > 0) sum += A.boosts[k]; });
          bp = 20 + 20 * sum; d.moveBP = bp; break;
        }
        case 'Punishment': {
          var sumD = 0; ['at', 'df', 'sa', 'sd', 'sp'].forEach(function (k) { if (D.boosts[k] > 0) sumD += D.boosts[k]; });
          bp = Math.min(200, 60 + 20 * sumD); d.moveBP = bp; break;
        }
        case 'Acrobatics': bp = (aIt === 'Flying Gem' || !aIt) ? 110 : 55; if (bp !== move.bp) d.moveBP = bp; break;
        case 'Hex': case 'Infernal Parade': bp = move.bp * (dStatus || dAb === 'Comatose' ? 2 : 1); if (bp !== move.bp) d.moveBP = bp; break;
        case 'Smelling Salts': bp = move.bp * (statusOf(D) === 'Paralyzed' ? 2 : 1); if (bp !== move.bp) d.moveBP = bp; break;
        case 'Wake-Up Slap': bp = move.bp * (statusOf(D) === 'Asleep' || dAb === 'Comatose' ? 2 : 1); if (bp !== move.bp) d.moveBP = bp; break;
        case 'Weather Ball': {
          var wBoost = weather !== '' && weather !== 'Strong Winds' && !(aIt === 'Utility Umbrella' && (weather.indexOf('Sun') !== -1 || weather.indexOf('Rain') !== -1));
          bp = move.bp * (wBoost || megaSol ? 2 : 1);
          if (bp !== move.bp) { d.moveBP = bp; if (wBoost) d.weather = weather; else d.attackerAbility = A.ability; }
          break;
        }
        case 'Terrain Pulse': bp = (terrain && attackerGrounded) ? move.bp * 2 : move.bp; if (bp !== move.bp) { d.moveBP = bp; d.terrain = terrain; } break;
        case 'Rising Voltage': bp = (terrain === 'Electric' && defenderGrounded) ? move.bp * 2 : move.bp; if (bp !== move.bp) { d.moveBP = bp; d.terrain = terrain; } break;
        case 'Fling': bp = (typeof getFlingPower === 'function' && aIt) ? getFlingPower(aIt) : 0; d.moveBP = bp; if (aIt) d.attackerItem = aIt; break;
        case 'Triple Kick': case 'Triple Axel': bp = ho.tripleHit ? move.bp * ho.tripleHit : move.bp; break;
        case 'Last Respects': {
          var fz = Math.max(0, Math.min(5, A.fainted || 0));
          bp = move.bp * (fz + 1); if (fz) d.moveBP = bp; break;
        }
        case 'Rage Fist': {
          var th = Math.max(0, Math.min(6, move.timesHit || 0));
          bp = move.bp * (th + 1); if (th) d.moveBP = bp; break;
        }
        case 'Spit Up': bp = 100 * Math.max(0, Math.min(3, move.stockpile || 0)); d.moveBP = bp; break;
        default:
          if ((move.boosted || ho.doubled) && ['Retaliate', 'Fusion Bolt', 'Fusion Flare', 'Lash Out'].indexOf(name) === -1) { bp = 2 * move.bp; d.moveBP = bp; }
      }
      if (bp <= 0) return null;

      // 2. base power modifiers (calcBPMods)
      var bpMods = [];
      var auraType = type === 'Fairy' || type === 'Dark';
      var auraActive = auraType && (field[type === 'Fairy' ? 'fairyAura' : 'darkAura'] ||
        A.ability === type + ' Aura' || D.ability === type + ' Aura');
      var auraBreak = !!field.auraBreak || A.ability === 'Aura Break' || D.ability === 'Aura Break';
      if (auraActive && auraBreak && !abilityIgnored) { bpMods.push(3072); d.aura = type + ' Aura (Aura Break)'; }
      if (ateBoost) { bpMods.push(4915); d.attackerAbility = A.ability; }
      else if ((A.ability === 'Reckless' && (move.hasRecoil || move.recoilHP || move.hasCrash)) || (A.ability === 'Iron Fist' && move.isPunch)) { bpMods.push(4915); d.attackerAbility = A.ability; }
      if (aSide.battery && category === 'Special') { bpMods.push(5325); d.battery = true; }
      if (aSide.powerSpot) { bpMods.push(5325); d.powerSpot = true; }
      if (aSide.steelySpirit && type === 'Steel') { bpMods.push(6144); d.steelySpirit = true; }
      if (A.ability === 'Sheer Force' && move.hasSecondaryEffect) { bpMods.push(5325); d.attackerAbility = A.ability; }
      else if (A.ability === 'Sand Force' && weather === 'Sand' && ['Rock', 'Ground', 'Steel'].indexOf(type) !== -1) { bpMods.push(5325); d.attackerAbility = A.ability; d.weather = weather; }
      else if (A.ability === 'Analytic' && (aSpe <= dSpe || A.movesLast)) { bpMods.push(5325); d.attackerAbility = A.ability; }
      else if (A.ability === 'Tough Claws' && makesContact) { bpMods.push(5325); d.attackerAbility = A.ability; }
      else if (A.ability === 'Punk Rock' && move.isSound) { bpMods.push(5325); d.attackerAbility = A.ability; }
      if (auraActive && !auraBreak) { bpMods.push(5448); d.aura = type + ' Aura'; }
      var tempBP = pokeRound(bp * chainMods(bpMods) / 4096);
      if ((A.ability === 'Technician' && tempBP <= 60) ||
          (A.ability === 'Flare Boost' && statusOf(A) === 'Burned' && category === 'Special') ||
          (A.ability === 'Toxic Boost' && (statusOf(A) === 'Poisoned' || statusOf(A) === 'Badly Poisoned') && category === 'Physical') ||
          (A.ability === 'Mega Launcher' && move.isPulse) || (A.ability === 'Strong Jaw' && move.isBite) ||
          (A.ability === 'Steely Spirit' && type === 'Steel')) { bpMods.push(6144); d.attackerAbility = A.ability; }
      if (dAb === 'Dry Skin' && type === 'Fire') { bpMods.push(5120); d.defenderAbility = dAb; }
      var boostTypes = typeBoostItem(aIt, A.species);
      if ((aIt === 'Muscle Band' && category === 'Physical') || (aIt === 'Wise Glasses' && category === 'Special')) { bpMods.push(4505); d.attackerItem = aIt; }
      else if (boostTypes.indexOf(type) !== -1) { bpMods.push(4915); d.attackerItem = aIt; }
      else if (aIt.indexOf(' Mask') !== -1 && A.species.indexOf('Ogerpon-') === 0 && aIt.substring(0, aIt.indexOf(' Mask')) === A.species.substring(8)) { bpMods.push(4915); d.attackerItem = aIt; }
      else if (aIt === type + ' Gem') { bpMods.push(5325); d.attackerItem = aIt; }
      if ((name === 'Solar Beam' || name === 'Solar Blade') && weather && ['Sun', 'Harsh Sun', 'Strong Winds'].indexOf(weather) === -1 && aIt !== 'Utility Umbrella' && !megaSol) {
        bpMods.push(2048); d.moveBP = move.bp / 2; d.weather = weather;
      }
      if (name === 'Knock Off' && !cantRemove(dIt, D)) { bpMods.push(6144); d.moveBP = move.bp * 1.5; }
      else if (terrain === 'Electric' && name === 'Psyblade') { bpMods.push(6144); d.moveBP = move.bp * 1.5; d.terrain = terrain; }
      else if ((name === 'Misty Explosion' && terrain === 'Misty' && attackerGrounded) || (name === 'Grav Apple' && field.gravity)) { bpMods.push(6144); d.moveBP = move.bp * 1.5; }
      else if (name === 'Expanding Force' && terrain === 'Psychic' && attackerGrounded) { bpMods.push(6144); d.moveBP = move.bp * 1.5; }
      if (aSide.helpingHand) { bpMods.push(6144); d.helpingHand = true; }
      if (A.charged && type === 'Electric') { bpMods.push(8192); d.charged = true; }
      if ((name === 'Facade' && ['Burned', 'Paralyzed', 'Poisoned', 'Badly Poisoned'].indexOf(statusOf(A)) !== -1) ||
          (name === 'Brine' && D.curHP <= D.maxHP / 2) ||
          ((name === 'Venoshock' || name === 'Barb Barrage') && (statusOf(D) === 'Poisoned' || statusOf(D) === 'Badly Poisoned')) ||
          (['Retaliate', 'Fusion Bolt', 'Fusion Flare', 'Lash Out'].indexOf(name) !== -1 && (move.boosted || ho.doubled))) {
        bpMods.push(8192); d.moveBP = move.bp * 2;
      }
      if (attackerGrounded && ((terrain === 'Electric' && type === 'Electric') || (terrain === 'Grassy' && type === 'Grass') || (terrain === 'Psychic' && type === 'Psychic'))) {
        bpMods.push(5325); d.terrain = terrain;
      }
      if (defenderGrounded && ((terrain === 'Misty' && type === 'Dragon') || (terrain === 'Grassy' && (name === 'Earthquake' || name === 'Bulldoze')))) {
        bpMods.push(2048); d.terrain = terrain;
      }
      if (A.ability === 'Supreme Overlord' && A.fainted > 0) { bpMods.push([4506, 4915, 5325, 5734, 6144][Math.min(5, A.fainted) - 1]); d.attackerAbility = A.ability; }
      if (aIt === 'Punching Glove' && move.isPunch) { bpMods.push(4506); d.attackerItem = aIt; }
      bp = Math.max(1, pokeRound(bp * chainMods(bpMods) / 4096));
      res.finalBP = bp;

      // 3. attack (calcAttack)
      var src = name === 'Foul Play' ? D : A;
      var raw = src.stats[atkKey];
      var aBoost = src.boosts[atkKey] || 0;
      var attack;
      var midBoost = null;
      if (name === 'Meteor Beam' || name === 'Electro Shot') midBoost = clampBoost((A.boosts[atkKey] || 0) + (A.ability === 'Contrary' ? -1 : 1));
      if (dAb === 'Unaware' && aBoost !== 0) { attack = raw; d.defenderAbility = dAb; d.atkBoost = 0; }
      else if (midBoost !== null) {
        attack = (midBoost === 0 || (isCrit && midBoost < 0)) ? raw : boosted(raw, midBoost);
        d.atkBoost = midBoost;
      } else if (aBoost === 0 || (isCrit && aBoost < 0)) { attack = raw; d.atkBoost = 0; }
      else { attack = boosted(raw, aBoost); d.atkBoost = aBoost; }
      if (A.ability === 'Hustle' && category === 'Physical') { attack = pokeRound(attack * 3 / 2); d.attackerAbility = A.ability; }

      // 4. attack modifiers (calcAtMods)
      var atMods = [];
      var sunA = weather.indexOf('Sun') !== -1;
      if (ruin.tablets && category === 'Physical' && A.ability !== 'Tablets of Ruin') { atMods.push(3072); d.ruinAtk = 'Tablets of Ruin'; }
      else if (ruin.vessel && category === 'Special' && A.ability !== 'Vessel of Ruin') { atMods.push(3072); d.ruinAtk = 'Vessel of Ruin'; }
      if ((A.ability === 'Slow Start' && category === 'Physical') || (A.ability === 'Defeatist' && A.curHP <= A.maxHP / 2)) { atMods.push(2048); d.attackerAbility = A.ability; }
      if (A.ability === 'Flower Gift' && A.species.indexOf('Cherrim') === 0 && sunA && category === 'Physical' && aIt !== 'Utility Umbrella') { atMods.push(6144); d.attackerAbility = A.ability; d.weather = weather; }
      else if (aSide.flowerGift && sunA && category === 'Physical' && aIt !== 'Utility Umbrella') { atMods.push(6144); d.flowerGift = true; d.weather = weather; }
      if ((A.ability === 'Guts' && statusOf(A) !== 'Healthy' && category === 'Physical') ||
          (PINCH[A.ability] === type && A.curHP <= A.maxHP / 3) ||
          (A.ability === "Dragon's Maw" && type === 'Dragon') ||
          (A.ability === 'Flash Fire' && A.flashFire && type === 'Fire') ||
          (A.ability === 'Steelworker' && type === 'Steel') ||
          (A.ability === 'Gorilla Tactics' && category === 'Physical') ||
          ((A.ability === 'Plus' || A.ability === 'Minus') && move.plusMinus && category === 'Special') ||
          (A.ability === 'Sharpness' && move.isSlice) ||
          (A.ability === 'Rocky Payload' && type === 'Rock') ||
          (A.ability === 'Fire Mane' && type === 'Fire')) { atMods.push(6144); d.attackerAbility = A.ability; }
      else if (A.ability === 'Solar Power' && sunA && category === 'Special' && aIt !== 'Utility Umbrella') { atMods.push(6144); d.attackerAbility = A.ability; d.weather = weather; }
      else if (A.ability === 'Transistor' && type === 'Electric') { atMods.push(5325); d.attackerAbility = A.ability; }
      else if ((A.ability === 'Orichalcum Pulse' && weather === 'Sun' && category === 'Physical' && aIt !== 'Utility Umbrella') ||
               (A.ability === 'Hadron Engine' && terrain === 'Electric' && category === 'Special')) { atMods.push(5461); d.attackerAbility = A.ability; }
      if ((A.ability === 'Water Bubble' && type === 'Water') || ((A.ability === 'Huge Power' || A.ability === 'Pure Power') && category === 'Physical') ||
          (A.ability === 'Stakeout' && A.stakeout)) { atMods.push(8192); d.attackerAbility = A.ability; }
      if ((dAb === 'Thick Fat' && (type === 'Fire' || type === 'Ice')) || (dAb === 'Water Bubble' && type === 'Fire') ||
          (dAb === 'Purifying Salt' && type === 'Ghost') || (dAb === 'Heatproof' && type === 'Fire')) { atMods.push(2048); d.defenderAbility = dAb; }
      if ((aIt === 'Thick Club' && ['Cubone', 'Marowak', 'Marowak-Alola'].indexOf(A.species) !== -1 && category === 'Physical') ||
          (aIt === 'Deep Sea Tooth' && A.species === 'Clamperl' && category === 'Special') ||
          (aIt === 'Light Ball' && (A.species === 'Pikachu' || A.species === 'Pikachu-Gmax'))) { atMods.push(8192); d.attackerItem = aIt; }
      else if ((aIt === 'Choice Band' && category === 'Physical') || (aIt === 'Choice Specs' && category === 'Special')) { atMods.push(6144); d.attackerItem = aIt; }
      attack = Math.max(1, pokeRound(attack * chainMods(atMods) / 4096));

      // 5. defense (calcDefense)
      var dRaw = D.stats[defKey], dBoost = D.boosts[defKey] || 0, defense;
      if (A.ability === 'Unaware' && dBoost !== 0) { defense = dRaw; d.attackerAbility = A.ability; d.defBoost = 0; }
      else if (move.ignoresDefenseBoosts && dBoost !== 0) { defense = dRaw; d.defBoost = 0; }
      else if (dBoost === 0 || (isCrit && dBoost > 0)) { defense = dRaw; d.defBoost = 0; }
      else { defense = boosted(dRaw, dBoost); d.defBoost = dBoost; }
      if (((weather === 'Sand' && hasType(D, 'Rock') && !hitsPhysical) || (weather === 'Snow' && hasType(D, 'Ice') && hitsPhysical)) && !megaSol) {
        defense = pokeRound(defense * 3 / 2); d.weather = weather;
      }

      // 6. defense modifiers (calcDefMods)
      var dfMods = [];
      if (ruin.sword && hitsPhysical && dAb !== 'Sword of Ruin') { dfMods.push(3072); d.ruinDef = 'Sword of Ruin'; }
      else if (ruin.beads && !hitsPhysical && dAb !== 'Beads of Ruin') { dfMods.push(3072); d.ruinDef = 'Beads of Ruin'; }
      if (dAb === 'Flower Gift' && D.species.indexOf('Cherrim') === 0 && sunA && !hitsPhysical && dIt !== 'Utility Umbrella') { dfMods.push(6144); d.defenderAbility = dAb; d.weather = weather; }
      else if (dSide.flowerGift && sunA && !hitsPhysical && dIt !== 'Utility Umbrella') { dfMods.push(6144); d.defFlowerGift = true; d.weather = weather; }
      if ((dAb === 'Marvel Scale' && statusOf(D) !== 'Healthy' && hitsPhysical) || (dAb === 'Grass Pelt' && terrain === 'Grassy' && hitsPhysical)) { dfMods.push(6144); d.defenderAbility = dAb; }
      else if (dAb === 'Fur Coat' && hitsPhysical) { dfMods.push(8192); d.defenderAbility = dAb; }
      if ((dIt === 'Assault Vest' && !hitsPhysical) || (dIt === 'Eviolite' && D.canEvolve)) { dfMods.push(6144); d.defenderItem = dIt; }
      else if ((dIt === 'Deep Sea Scale' && D.species === 'Clamperl' && !hitsPhysical) || (dIt === 'Metal Powder' && D.species === 'Ditto' && hitsPhysical)) { dfMods.push(8192); d.defenderItem = dIt; }
      defense = Math.max(1, pokeRound(defense * chainMods(dfMods) / 4096));

      // 7. base damage
      var base = Math.floor(Math.floor(Math.floor(2 * LEVEL / 5 + 2) * bp * attack / defense) / 50 + 2);

      // 8. general modifiers (calcGeneralMods)
      if (spread) base = pokeRound(base * 3072 / 4096);
      if (ho.isChild) base = pokeRound(base * 1024 / 4096);
      var sunW = weather.indexOf('Sun') !== -1, rainW = weather.indexOf('Rain') !== -1;
      if (((((sunW || megaSol) && type === 'Fire') || (rainW && type === 'Water')) && dIt !== 'Utility Umbrella') ||
          ((sunW || megaSol) && name === 'Hydro Steam' && aIt !== 'Utility Umbrella')) {
        base = pokeRound(base * 6144 / 4096);
        if (megaSol) d.attackerAbility = A.ability; else d.weather = weather;
      } else if (((weather === 'Sun' && type === 'Water') || (weather === 'Rain' && type === 'Fire' && !megaSol)) && dIt !== 'Utility Umbrella') {
        base = pokeRound(base * 2048 / 4096); d.weather = weather;
      }
      if (D.glaiveRush) { base = pokeRound(base * 8192 / 4096); d.glaiveRush = true; }
      if (isCrit) { base = Math.floor(base * 1.5); d.isCrit = true; }

      var stabMod = 4096;
      if (type !== 'Typeless') {
        if (hasType(A, type)) {
          if (A.ability === 'Adaptability') { stabMod = 8192; d.attackerAbility = A.ability; } else stabMod = 6144;
        } else if (A.ability === 'Protean' || A.ability === 'Libero') { stabMod = 6144; d.attackerAbility = A.ability; }
      }
      var applyBurn = statusOf(A) === 'Burned' && category === 'Physical' && A.ability !== 'Guts' && !move.ignoresBurn;
      if (applyBurn) d.burned = true;

      // 9. final modifiers (calcFinalMods)
      var fin = [];
      var screens = !isCrit && A.ability !== 'Infiltrator';
      if (screens) {
        var scr = doubles ? 2732 : 2048;
        if (dSide.auroraVeil && !move.ignoresScreens) { fin.push(scr); d.screen = 'Aurora Veil'; }
        else if (dSide.reflect && category === 'Physical' && !move.ignoresScreens) { fin.push(scr); d.screen = 'Reflect'; }
        else if (dSide.lightScreen && category === 'Special') { fin.push(scr); d.screen = 'Light Screen'; }
      }
      if (A.ability === 'Neuroforce' && eff > 1) { fin.push(5120); d.attackerAbility = A.ability; }
      if ((name === 'Collision Course' || name === 'Electro Drift') && eff > 1) fin.push(5461);
      if (A.ability === 'Sniper' && isCrit) { fin.push(6144); d.attackerAbility = A.ability; }
      if (A.ability === 'Tinted Lens' && eff < 1) { fin.push(8192); d.attackerAbility = A.ability; }
      if ((dAb === 'Multiscale' || dAb === 'Shadow Shield') && D.curHP === D.maxHP) { fin.push(2048); d.defenderAbility = dAb; }
      if ((dAb === 'Fluffy' || dAb === 'Aura Guard') && makesContact) { fin.push(2048); d.defenderAbility = dAb; }
      if (dAb === 'Punk Rock' && move.isSound) { fin.push(2048); d.defenderAbility = dAb; }
      if (dAb === 'Ice Scales' && category === 'Special') { fin.push(2048); d.defenderAbility = dAb; }
      if (dSide.friendGuard && !ignoresFriendGuard) { fin.push(3072); d.friendGuard = true; }
      if ((dAb === 'Solid Rock' || dAb === 'Filter' || dAb === 'Prism Armor') && eff > 1) { fin.push(3072); d.defenderAbility = dAb; }
      if (aIt === 'Metronome' && move.metronome > 1) { fin.push(METRONOME_MODS[Math.min(5, move.metronome - 1)]); d.attackerItem = aIt; }
      if (dAb === 'Fluffy' && type === 'Fire') { fin.push(8192); d.defenderAbility = dAb; }
      if (aIt === 'Expert Belt' && eff > 1) { fin.push(4915); d.attackerItem = aIt; }
      else if (aIt === 'Life Orb') { fin.push(5324); d.attackerItem = aIt; }
      var berryUsed = false;
      if (resistBerryType(dIt) === type && (eff > 1 || type === 'Normal') && A.ability !== 'Unnerve' && A.ability !== 'As One') {
        if (dAb === 'Ripen') { fin.push(1024); d.defenderAbility = dAb; } else fin.push(2048);
        d.defenderItem = dIt; berryUsed = true;
      }
      var finalMod = chainMods(fin);

      // random roll, STAB, type, burn, final mods (gen 10: no min-1 and no overflow check)
      var out = [];
      for (var i = 0; i < 16; i++) {
        var dmg = Math.floor(base * (85 + i) / 100);
        dmg = pokeRound(dmg * stabMod / 4096);
        dmg = Math.floor(dmg * eff);
        if (applyBurn) dmg = Math.floor(dmg / 2);
        dmg = pokeRound(dmg * finalMod / 4096);
        out.push(dmg);
      }
      out.sort(function (a, b) { return a - b; });
      return { rolls: out, berry: berryUsed };
    }

    // ---- number of hits ----
    var nHits = 1;
    if (move.hitRange) {
      if (Array.isArray(move.hitRange)) {
        var lo = move.hitRange[0], mx = move.hitRange[move.hitRange.length - 1];
        if (move.hits) nHits = Math.min(mx, Math.max(lo, move.hits));
        else if (lo === 2 && mx === 5) nHits = attacker.ability === 'Skill Link' ? 5 : aItem === 'Loaded Dice' ? 4 : 3;
        else if (lo === 1 && mx === 2) nHits = 1;
        else nHits = mx;
        if (attacker.ability === 'Skill Link' && lo === 2 && mx === 5 && nHits === 5) d.attackerAbility = 'Skill Link';
      } else nHits = move.hitRange;
    }
    if ((name === 'Triple Axel' || name === 'Triple Kick') && !move.hitRange) nHits = move.hits || 3;
    var pbActive = parentalBond && nHits === 1 && !move.hitRange && (!spread);

    var first = damageFor(attacker, defender, defAbility, {});
    if (!first) { res.damage = [0]; return res; }
    var perHit = [first.rolls];

    // ---- additional hits that differ from the first (NCP additionalDamageCalcs) ----
    if (nHits > 1 || pbActive) {
      var triple = !!move.isTripleHit || name === 'Triple Axel' || name === 'Triple Kick';
      triple = triple && !pbActive;
      var multiscale = (defender.ability === 'Multiscale' || defender.ability === 'Shadow Shield') && defender.curHP === defender.maxHP;
      var weakArmor = defender.ability === 'Weak Armor' && hitsPhysical && (defender.boosts.df || 0) > -6;
      var stamina = defender.ability === 'Stamina' && hitsPhysical && (defender.boosts.df || 0) < 6;
      var nextA = cloneMon(attacker), nextD = cloneMon(defender);
      var unique = 1, ho = {};
      if (pbActive) {
        nextA.ability = '';
        ho.isChild = true;
        var sc = move.statChange;
        if (sc) {
          var statKey = { attack: 'at', defense: 'df', 'special attack': 'sa', 'special defense': 'sd' }[sc[0]];
          var who = sc[2] === 'user' ? nextA : nextD;
          if (statKey) who.boosts[statKey] = clampBoost((who.boosts[statKey] || 0) + sc[1]);
        } else if (name === 'Assurance') ho.doubled = true;
        unique = 2;
        d.attackerAbility = 'Parental Bond';
      } else if (triple) unique = nHits;
      if (multiscale) { nextD.ability = ''; if (unique === 1) unique = 2; }
      else if (weakArmor) {
        unique = Math.max(unique, Math.min((defender.boosts.df || 0) + 6 + 1, nHits), Math.min(Math.ceil((6 - (defender.boosts.sp || 0)) / 2) + 1, nHits));
        d.defenderAbility = defender.ability;
      } else if (stamina) {
        unique = Math.max(unique, Math.min(6 - (defender.boosts.df || 0) + 1, nHits));
        d.defenderAbility = defender.ability;
      }
      if (first.berry) { nextD.item = ''; if (unique === 1) unique = 2; }
      // later hits must not overwrite the description of the first hit
      var firstDesc = d;
      d = {};
      for (var k = 0; k < unique - 1; k++) {
        if (weakArmor) { nextD.boosts.sp = clampBoost((nextD.boosts.sp || 0) + 2); nextD.boosts.df = clampBoost((nextD.boosts.df || 0) - 1); }
        else if (stamina) nextD.boosts.df = clampBoost((nextD.boosts.df || 0) + 1);
        var hoK = Object.assign({}, ho);
        if (triple) hoK.tripleHit = k + 2;
        var nx = damageFor(nextA, nextD, defAbilityOf(nextD), hoK);
        perHit.push(nx ? nx.rolls : new Array(16).fill(0));
      }
      d = firstDesc;
      if (pbActive) { nHits = 2; d.attackerAbility = 'Parental Bond'; }
    }

    // every hit gets its own roll array; later hits repeat the last distinct one
    var all = [];
    for (var h = 0; h < nHits; h++) all.push(perHit[Math.min(h, perHit.length - 1)]);
    var total = new Array(16).fill(0);
    all.forEach(function (arr) { for (var i = 0; i < 16; i++) total[i] += arr[i]; });
    if (nHits > 1) d.hits = nHits;
    res.damage = total;
    res.perHit = all;
    res.nHits = nHits;
    return res;
  }

  // ---------- KO chance ----------
  // opts: {hazards: damage before first hit, residual: per-turn HP change (negative = damage), sitrus, sash, perHit}
  // perHit: one roll array per hit (multi-hit moves); the hits are rolled independently like in NCP.
  function rollDist(arr) {
    var out = {}, w = 1 / arr.length;
    arr.forEach(function (v) { out[v] = (out[v] || 0) + w; });
    return out;
  }
  function convolve(a, b) {
    var out = {};
    Object.keys(a).forEach(function (x) {
      Object.keys(b).forEach(function (y) {
        var s = +x + +y;
        out[s] = (out[s] || 0) + a[x] * b[y];
      });
    });
    return out;
  }
  function koChance(rolls, defender, opts) {
    opts = opts || {};
    var maxHP = defender.maxHP;
    var start = defender.curHP - (opts.hazards || 0);
    if (rolls.length === 1 && rolls[0] === 0) return { text: '', n: 0 };
    if (start <= 0) return { text: 'durch Hazards KO', n: 0 };
    var hasPerHit = opts.perHit && opts.perHit.length > 1;
    var multi = hasPerHit || (opts.hits > 1);
    var dist;
    if (hasPerHit) {
      dist = rollDist(opts.perHit[0]);
      for (var h = 1; h < opts.perHit.length; h++) dist = convolve(dist, rollDist(opts.perHit[h]));
    } else dist = rollDist(rolls);
    var distKeys = Object.keys(dist).map(Number);
    var sitrus = opts.sitrus ? Math.floor(maxHP / 4) : 0;
    var residual = opts.residual || 0;
    var toxic = opts.toxic || 0;
    // state: key "hp|berry" -> probability
    var states = {}; states[start + '|' + (sitrus ? 1 : 0)] = 1;
    var results = [];
    for (var turn = 1; turn <= 4; turn++) {
      var next = {}, ko = 0;
      Object.keys(states).forEach(function (k) {
        var parts = k.split('|'), hp = +parts[0], b = +parts[1], p = states[k];
        distKeys.forEach(function (r) {
          var pw = p * dist[r];
          var nh = hp - r;
          if (nh <= 0 && opts.sash && !multi && turn === 1 && hp === maxHP) nh = 1;
          if (nh <= 0) { ko += pw; return; }
          var nb = b;
          if (nb && nh <= maxHP / 2) { nh = Math.min(maxHP, nh + sitrus); nb = 0; }
          nh = Math.min(maxHP, nh + residual) - toxic * turn;
          if (nh <= 0) { ko += pw; return; }
          if (nb && nh <= maxHP / 2) { nh = Math.min(maxHP, nh + sitrus); nb = 0; }
          var key = nh + '|' + nb;
          next[key] = (next[key] || 0) + pw;
        });
      });
      var prevKO = results.length ? results[results.length - 1] : 0;
      results.push(prevKO + ko);
      states = next;
      if (prevKO + ko >= 0.999999) break;
    }
    for (var i = 0; i < results.length; i++) {
      var c = results[i];
      var label = (i === 0 ? 'OHKO' : (i + 1) + 'HKO');
      if (c >= 0.999999) return { text: 'garantierter ' + label, n: i + 1, chance: 1 };
      if (c > 0) {
        return { text: (Math.round(c * 10000) / 100) + '% Chance auf ' + label, n: i + 1, chance: c };
      }
    }
    var minD = Math.min.apply(null, distKeys);
    var maxD = Math.max.apply(null, distKeys);
    if (maxD <= 0) return { text: '', n: 0 };
    // NCP predictTotal: 5HKO to 9HKO from the lowest / highest roll
    function predict(dmg, times) {
      var total = 0, restore = sitrus;
      for (var j = 0; j < times; j++) {
        total += dmg;
        if (restore && start - total <= maxHP / 2) {
          total -= restore;
          if (start - total > maxHP) total = start - maxHP;
          restore = 0;
        }
        if (j < times - 1) total -= residual - toxic * (j + 1);
      }
      return total;
    }
    for (var t = 5; t <= 9; t++) {
      if (predict(minD, t) >= start) return { text: 'garantierter ' + t + 'HKO', n: t, chance: 1 };
      if (predict(maxD, t) >= start) return { text: 'mögl. ' + t + 'HKO', n: t, chance: 0, possible: true };
    }
    return { text: 'mögl. 10+HKO', n: 10, chance: 0, possible: true };
  }

  var Calc = {
    TYPES: TYPES, CHART: CHART, NATURES: NATURES, STAT_KEYS: STAT_KEYS, STAT_LABEL: STAT_LABEL, STAT_LONG: STAT_LONG,
    SP_MAX: SP_MAX, SP_TOTAL: SP_TOTAL, LEVEL: LEVEL, RESIST_BERRIES: RESIST_BERRIES, TYPE_ITEMS: TYPE_ITEMS,
    calcStat: calcStat, spToEv: spToEv, evToSp: evToSp, natureMod: natureMod, boosted: boosted,
    getSpeed: getSpeed, calculate: calculate, koChance: koChance, typeEff: typeEff, isGrounded: isGrounded,
    hitsAlly: hitsAlly, ALL_ADJACENT: ALL_ADJACENT, itemLocked: itemLocked, effWeight: effWeight, MOLD_BREAKERS: MOLD_BREAKERS,
    effectiveWeather: effectiveWeather, pokeRound: pokeRound
  };

  if (typeof window !== 'undefined') window.Calc = Calc;
  if (typeof globalThis !== 'undefined') globalThis.Calc = Calc;
  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
})();
