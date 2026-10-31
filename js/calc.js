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
    if ((a && (a.ability === 'Cloud Nine' || a.ability === 'Air Lock')) ||
        (b && (b.ability === 'Cloud Nine' || b.ability === 'Air Lock'))) return '';
    return w;
  }

  function isGrounded(p, field) {
    if (field.gravity || p.item === 'Iron Ball') return true;
    if (hasType(p, 'Flying')) return false;
    if (p.ability === 'Levitate' || p.ability === 'Eelevate') return false;
    if (p.item === 'Air Balloon') return false;
    return true;
  }

  function getSpeed(p, field, side) {
    var s = boosted(p.stats.sp, p.boosts.sp);
    var mods = [];
    var w = effectiveWeather(field, p, null);
    if (p.item === 'Choice Scarf') mods.push(6144);
    if (p.item === 'Iron Ball') mods.push(2048);
    if (side && side.tailwind) mods.push(8192);
    if ((p.ability === 'Chlorophyll' && (w === 'Sun' || w === 'Harsh Sun')) ||
        (p.ability === 'Swift Swim' && (w === 'Rain' || w === 'Heavy Rain')) ||
        (p.ability === 'Sand Rush' && w === 'Sand') || (p.ability === 'Slush Rush' && w === 'Snow') ||
        (p.ability === 'Surge Surfer' && field.terrain === 'Electric')) mods.push(8192);
    if (p.ability === 'Quick Feet' && p.status !== 'Healthy') mods.push(6144);
    s = applyMod(s, chainMods(mods));
    if (p.status === 'Paralyzed' && p.ability !== 'Quick Feet') s = Math.floor(s / 2);
    return Math.max(1, s);
  }

  function typeEff(moveType, defTypes, opts) {
    var e = 1;
    for (var i = 0; i < defTypes.length; i++) {
      var dt = defTypes[i];
      if (!dt || dt === 'Typeless') continue;
      var m = (CHART[moveType] && CHART[moveType][dt] !== undefined) ? CHART[moveType][dt] : 1;
      if (m === 0) {
        if (opts.scrappy && dt === 'Ghost' && (moveType === 'Normal' || moveType === 'Fighting')) m = 1;
        else if (opts.gravity && dt === 'Flying' && moveType === 'Ground') m = 1;
      }
      if (opts.freezeDry && dt === 'Water') m = 2;
      if (opts.flyingPress) {
        var f = (CHART.Flying[dt] !== undefined) ? CHART.Flying[dt] : 1;
        m *= f;
      }
      e *= m;
    }
    return e;
  }

  function weightBP(w) {
    return w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20;
  }
  function ratioBP(atk, def) {
    var r = atk / def;
    return r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40;
  }

  function isMegaStoneFor(item, species) {
    return /ite( [XYZ])?$/.test(item || '') && item !== 'Eviolite' && species.indexOf('Mega ') === 0;
  }

  // ---------- main calculation ----------
  // attacker/defender: {species, types, stats, boosts, ability, item, status, curHP, maxHP, weight, canEvolve}
  // move: {name, bp, type, category, crit, hits, flags...}
  // field: {format, weather, terrain, gravity, ruin:{tablets,vessel,sword,beads}, fairyAura, darkAura, auraBreak}
  // aSide/dSide: {helpingHand, reflect, lightScreen, auroraVeil, friendGuard, battery, powerSpot, steelySpirit, flowerGift}
  function calculate(attacker, defender, move, field, aSide, dSide) {
    var res = { damage: [0], desc: {}, move: move, attacker: attacker, defender: defender, notes: [] };
    if (!move || !move.name || move.name === '(No Move)') { res.empty = true; return res; }
    if (move.category === 'Status') { res.status = true; return res; }

    var d = res.desc;
    var doubles = field.format === 'Doubles';
    var moldBreaker = MOLD_BREAKERS.indexOf(attacker.ability) !== -1;
    var defAbility = (moldBreaker && BREAKABLE_ABILITIES.indexOf(defender.ability) !== -1) ? '' : defender.ability;
    var weather = effectiveWeather(field, attacker, defender);
    var atkWeather = (attacker.ability === 'Mega Sol') ? 'Sun' : weather;
    if (attacker.item === 'Utility Umbrella' && (atkWeather === 'Sun' || atkWeather === 'Rain')) atkWeather = '';
    var defUmbrella = defender.item === 'Utility Umbrella';
    var attackerGrounded = isGrounded(attacker, field);
    var defenderGrounded = isGrounded(Object.assign({}, defender, { ability: defAbility }), field);

    var name = move.name;
    var bp = move.bp || 0;
    var type = move.type;
    var category = move.category;
    var isCrit = !!move.crit || !!move.alwaysCrit;
    if (defAbility === 'Battle Armor' || defAbility === 'Shell Armor') isCrit = false;
    var makesContact = !!move.makesContact && attacker.ability !== 'Long Reach' && attacker.item !== 'Protective Pads';
    var hasSecondary = !!move.hasSecondaryEffect;

    // ---- type changes ----
    var ateBoost = false;
    if (name === 'Weather Ball' && atkWeather) {
      type = { Sun: 'Fire', 'Harsh Sun': 'Fire', Rain: 'Water', 'Heavy Rain': 'Water', Sand: 'Rock', Snow: 'Ice' }[atkWeather] || type;
      bp = 100; d.weather = atkWeather;
    } else if (name === 'Terrain Pulse' && field.terrain && field.terrain !== 'None' && attackerGrounded) {
      type = field.terrain === 'Misty' ? 'Fairy' : field.terrain; bp = 100; d.terrain = field.terrain;
    } else if (name === 'Revelation Dance') {
      type = attacker.types[0];
    } else if (name === 'Aura Wheel' && attacker.species === 'Morpeko-Hangry') {
      type = 'Dark';
    } else if (name === 'Raging Bull') {
      if (attacker.species === 'Tauros-Paldea-Combat') type = 'Fighting';
      else if (attacker.species === 'Tauros-Paldea-Blaze') type = 'Fire';
      else if (attacker.species === 'Tauros-Paldea-Aqua') type = 'Water';
    }
    if (ATE[attacker.ability] && type === 'Normal' && ['Weather Ball', 'Terrain Pulse', 'Struggle'].indexOf(name) === -1) {
      type = ATE[attacker.ability]; ateBoost = true; d.attackerAbility = attacker.ability;
    } else if (attacker.ability === 'Normalize') {
      type = 'Normal'; ateBoost = true; d.attackerAbility = attacker.ability;
    } else if (attacker.ability === 'Liquid Voice' && move.isSound) {
      type = 'Water'; d.attackerAbility = attacker.ability;
    }
    res.moveType = type;

    // ---- immunities ----
    var eff = typeEff(type, defender.types, {
      scrappy: attacker.ability === 'Scrappy' || attacker.ability === "Mind's Eye",
      gravity: field.gravity || defender.item === 'Iron Ball',
      freezeDry: name === 'Freeze-Dry',
      flyingPress: name === 'Flying Press'
    });
    if (type === 'Ground' && !defenderGrounded && name !== 'Thousand Arrows') {
      eff = 0;
      if (defAbility === 'Levitate' || defAbility === 'Eelevate') d.defenderAbility = defAbility;
      if (defender.item === 'Air Balloon') d.defenderItem = 'Air Balloon';
    }
    var absorb = {
      Fire: ['Flash Fire', 'Well-Baked Body'], Water: ['Water Absorb', 'Storm Drain', 'Dry Skin'],
      Electric: ['Volt Absorb', 'Lightning Rod', 'Motor Drive'], Grass: ['Sap Sipper'], Ground: ['Earth Eater']
    };
    if (absorb[type] && absorb[type].indexOf(defAbility) !== -1) { eff = 0; d.defenderAbility = defAbility; }
    if ((defAbility === 'Bulletproof' && move.isBullet) || (defAbility === 'Soundproof' && move.isSound)) { eff = 0; d.defenderAbility = defAbility; }
    if (defAbility === 'Wonder Guard' && eff <= 1) { eff = 0; d.defenderAbility = defAbility; }
    if (name === 'Poltergeist' && (!defender.item || defender.item === '(none)')) { eff = 0; res.notes.push('Poltergeist schlägt ohne Item fehl'); }
    if (weather === 'Harsh Sun' && type === 'Water' && !defUmbrella) eff = 0;
    if (weather === 'Heavy Rain' && type === 'Fire' && !defUmbrella) eff = 0;
    // Delta Stream (Strong Winds): moves super effective against Flying hit Flying Pokémon only neutrally on that type
    if (weather === 'Strong Winds' && eff > 0 && hasType(defender, 'Flying') && typeEff(type, ['Flying'], {}) > 1) {
      eff /= 2; d.weather = 'Strong Winds';
    }
    res.effectiveness = eff;
    if (eff === 0) { res.damage = [0]; return res; }

    // ---- fixed damage moves ----
    if (name === 'Seismic Toss' || name === 'Night Shade') { res.damage = [LEVEL]; return res; }
    if (name === 'Super Fang' || name === 'Ruination' || name === "Nature's Madness") {
      res.damage = [Math.max(1, Math.floor(defender.curHP / 2))]; return res;
    }
    if (name === 'Final Gambit') { res.damage = [attacker.curHP]; return res; }
    if (name === 'Endeavor') { res.damage = [Math.max(0, defender.curHP - attacker.curHP)]; return res; }
    if (move.isOHKO) { res.damage = [defender.curHP]; res.notes.push('OHKO-Attacke'); return res; }
    // Counter-style moves: damage depends on damage taken this turn
    var COUNTER_MOVES = { 'Counter': 2, 'Mirror Coat': 2, 'Metal Burst': 1.5, 'Comeuppance': 1.5 };
    if (COUNTER_MOVES[name]) {
      var taken = Math.max(0, move.dmgTaken || 0);
      res.damage = [Math.max(taken ? 1 : 0, Math.floor(taken * COUNTER_MOVES[name]))];
      d.fixed = taken + ' erlittener Schaden ×' + COUNTER_MOVES[name];
      if (!taken) res.notes.push('Erlittenen Schaden bei der Attacke eintragen');
      return res;
    }

    // ---- base power ----
    var aSpeed = getSpeed(attacker, field, aSide), dSpeed = getSpeed(defender, field, dSide);
    var hasStatus = attacker.status && attacker.status !== 'Healthy';
    var defHasItem = defender.item && defender.item !== '(none)';
    switch (name) {
      case 'Low Kick': case 'Grass Knot': bp = weightBP(defender.weight); break;
      case 'Heavy Slam': case 'Heat Crash': bp = ratioBP(attacker.weight, defender.weight); break;
      case 'Eruption': case 'Water Spout': case 'Dragon Energy':
        bp = Math.max(1, Math.floor(150 * attacker.curHP / attacker.maxHP)); break;
      case 'Flail': case 'Reversal': {
        var p = Math.floor(48 * attacker.curHP / attacker.maxHP);
        bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; break;
      }
      case 'Electro Ball': {
        var r = Math.floor(aSpeed / dSpeed);
        bp = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; break;
      }
      case 'Gyro Ball': bp = Math.min(150, Math.floor(25 * dSpeed / aSpeed) + 1); break;
      case 'Stored Power': case 'Power Trip': {
        var sum = 0; ['at', 'df', 'sa', 'sd', 'sp'].forEach(function (k) { if (attacker.boosts[k] > 0) sum += attacker.boosts[k]; });
        bp = 20 + 20 * sum; break;
      }
      case 'Facade': if (hasStatus) { bp *= 2; d.moveBP = bp; } break;
      case 'Hex': case 'Infernal Parade': case 'Bitter Malice':
        if (defender.status && defender.status !== 'Healthy') { bp *= 2; d.moveBP = bp; } break;
      case 'Venoshock': case 'Barb Barrage':
        if (defender.status === 'Poisoned' || defender.status === 'Badly Poisoned') { bp *= 2; d.moveBP = bp; } break;
      case 'Brine': if (defender.curHP <= defender.maxHP / 2) { bp *= 2; d.moveBP = bp; } break;
      case 'Acrobatics': if (!attacker.item || attacker.item === '(none)') { bp *= 2; d.moveBP = bp; } break;
      case 'Rising Voltage': if (field.terrain === 'Electric' && defenderGrounded) { bp *= 2; d.terrain = 'Electric'; } break;
      case 'Solar Beam': case 'Solar Blade':
        if (atkWeather && ['Sun', 'Harsh Sun', 'Strong Winds'].indexOf(atkWeather) === -1) { bp = Math.floor(bp / 2); d.weather = atkWeather; } break;
      case 'Fling': bp = (typeof getFlingPower === 'function' && attacker.item && attacker.item !== '(none)') ? getFlingPower(attacker.item) : 0; break;
      case 'Triple Axel': case 'Triple Kick': break;
      case 'Last Respects': {
        var fz = Math.max(0, Math.min(5, attacker.fainted || 0));
        bp = 50 + 50 * fz; if (fz) d.moveBP = bp; break;
      }
      case 'Rage Fist': {
        var th = Math.max(0, Math.min(6, move.timesHit || 0));
        bp = Math.min(350, 50 + 50 * th); if (th) d.moveBP = bp; break;
      }
      case 'Spit Up': {
        var st = Math.max(0, Math.min(3, move.stockpile || 0));
        bp = 100 * st; d.moveBP = bp;
        if (!st) res.notes.push('Spit Up schlägt ohne Stockpile fehl'); break;
      }
      case 'Hard Press': bp = Math.max(1, Math.floor(100 * defender.curHP / defender.maxHP)); if (defender.curHP < defender.maxHP) d.moveBP = bp; break;
      case 'Beat Up': bp = Math.floor((attacker.baseAtk || 50) / 10) + 5; break;
      default: break;
    }
    // situational x2 moves (toggle in the UI)
    var DOUBLE_IF = ['Payback', 'Avalanche', 'Assurance', 'Stomping Tantrum', 'Temper Flare', 'Round', 'Lash Out', 'Fickle Beam'];
    if (move.boosted && DOUBLE_IF.indexOf(name) !== -1) { bp *= 2; d.moveBP = bp; }
    if (name === 'Steel Roller' && !field.terrain) { res.notes.push('Steel Roller schlägt ohne Terrain fehl'); res.damage = [0]; return res; }
    if (bp <= 0) { res.damage = [0]; return res; }

    var bpMods = [];
    if (attacker.ability === 'Technician' && bp <= 60) { bpMods.push(6144); d.attackerAbility = 'Technician'; }
    if (attacker.ability === 'Sheer Force' && hasSecondary) { bpMods.push(5325); d.attackerAbility = 'Sheer Force'; }
    if (attacker.ability === 'Sand Force' && weather === 'Sand' && ['Rock', 'Ground', 'Steel'].indexOf(type) !== -1) { bpMods.push(5325); d.attackerAbility = 'Sand Force'; }
    if (attacker.ability === 'Reckless' && (move.recoilHP || move.hasCrash)) { bpMods.push(4915); d.attackerAbility = 'Reckless'; }
    if (attacker.ability === 'Iron Fist' && move.isPunch) { bpMods.push(4915); d.attackerAbility = 'Iron Fist'; }
    if (attacker.ability === 'Tough Claws' && makesContact) { bpMods.push(5325); d.attackerAbility = 'Tough Claws'; }
    if (attacker.ability === 'Strong Jaw' && move.isBite) { bpMods.push(6144); d.attackerAbility = 'Strong Jaw'; }
    if (attacker.ability === 'Mega Launcher' && move.isPulse) { bpMods.push(6144); d.attackerAbility = 'Mega Launcher'; }
    if (attacker.ability === 'Sharpness' && move.isSlice) { bpMods.push(6144); d.attackerAbility = 'Sharpness'; }
    if (attacker.ability === 'Punk Rock' && move.isSound) { bpMods.push(5325); d.attackerAbility = 'Punk Rock'; }
    if (attacker.ability === 'Analytic' && attacker.movesLast) { bpMods.push(5325); d.attackerAbility = 'Analytic'; }
    if (attacker.ability === 'Supreme Overlord' && attacker.fainted) { bpMods.push([4096, 4506, 4915, 5325, 5734, 6144][Math.min(5, attacker.fainted)]); d.attackerAbility = 'Supreme Overlord'; }
    if (attacker.charged && type === 'Electric') { bpMods.push(8192); d.charged = true; }
    if (name === 'Misty Explosion' && field.terrain === 'Misty' && attackerGrounded) { bpMods.push(6144); d.terrain = 'Misty'; }
    if (ateBoost) bpMods.push(4915);
    if (type === 'Steel' && (attacker.ability === 'Steely Spirit' || (aSide && aSide.steelySpirit))) { bpMods.push(6144); d.steelySpirit = true; }
    var auraBreak = field.auraBreak || attacker.ability === 'Aura Break' || defender.ability === 'Aura Break';
    if ((type === 'Fairy' && (field.fairyAura || attacker.ability === 'Fairy Aura' || defender.ability === 'Fairy Aura')) ||
        (type === 'Dark' && (field.darkAura || attacker.ability === 'Dark Aura' || defender.ability === 'Dark Aura'))) {
      bpMods.push(auraBreak ? 3072 : 5448); d.aura = type + ' Aura' + (auraBreak ? ' (Aura Break)' : '');
    }
    if (aSide && aSide.helpingHand) { bpMods.push(6144); d.helpingHand = true; }
    if (aSide && aSide.battery && category === 'Special') { bpMods.push(5325); d.battery = true; }
    if (aSide && aSide.powerSpot) { bpMods.push(5325); d.powerSpot = true; }
    if (name === 'Knock Off' && defHasItem && !isMegaStoneFor(defender.item, defender.species)) { bpMods.push(6144); d.moveBP = Math.floor(bp * 1.5); }
    if (name === 'Expanding Force' && field.terrain === 'Psychic' && attackerGrounded) { bpMods.push(6144); d.terrain = 'Psychic'; }
    if (name === 'Psyblade' && field.terrain === 'Electric') { bpMods.push(6144); d.terrain = 'Electric'; }
    if (name === 'Grav Apple' && field.gravity) bpMods.push(6144);
    if ((name === 'Collision Course' || name === 'Electro Drift') && eff > 1) bpMods.push(5461);
    // terrain
    if (field.terrain && attackerGrounded &&
        ((field.terrain === 'Electric' && type === 'Electric') || (field.terrain === 'Grassy' && type === 'Grass') ||
         (field.terrain === 'Psychic' && type === 'Psychic'))) { bpMods.push(5325); d.terrain = field.terrain; }
    if (field.terrain === 'Misty' && type === 'Dragon' && defenderGrounded) { bpMods.push(2048); d.terrain = 'Misty'; }
    if (field.terrain === 'Grassy' && defenderGrounded && (name === 'Earthquake' || name === 'Bulldoze' || name === 'Magnitude')) { bpMods.push(2048); d.terrain = 'Grassy'; }
    // items
    var it = attacker.item;
    if (it === 'Muscle Band' && category === 'Physical') { bpMods.push(4505); d.attackerItem = it; }
    if (it === 'Wise Glasses' && category === 'Special') { bpMods.push(4505); d.attackerItem = it; }
    if (TYPE_ITEMS[it] === type) { bpMods.push(4915); d.attackerItem = it; }
    if (it === 'Normal Gem' && type === 'Normal') { bpMods.push(5325); d.attackerItem = it; }
    if (it === 'Punching Glove' && move.isPunch) { bpMods.push(4506); d.attackerItem = it; }
    // defender abilities lowering BP
    if (defAbility === 'Dry Skin' && type === 'Fire') { bpMods.push(5120); d.defenderAbility = defAbility; }
    bp = Math.max(1, applyMod(bp, chainMods(bpMods)));
    res.finalBP = bp;

    // ---- attack ----
    var atkSource = attacker, atkKey = category === 'Physical' ? 'at' : 'sa';
    if (name === 'Foul Play') atkSource = defender;
    if (name === 'Body Press') atkKey = 'df';
    var defKey = category === 'Physical' ? 'df' : 'sd';
    if (move.dealsPhysicalDamage || ['Psyshock', 'Psystrike', 'Secret Sword'].indexOf(name) !== -1) defKey = 'df';
    res.atkKey = atkKey; res.defKey = defKey;

    var atkBoost = atkSource.boosts[atkKey] || 0;
    if (defAbility === 'Unaware') { if (atkBoost) d.defenderAbility = 'Unaware'; atkBoost = 0; }
    if (isCrit && atkBoost < 0) atkBoost = 0;
    var attack = boosted(atkSource.stats[atkKey], atkBoost);
    d.atkBoost = atkBoost;
    if (attacker.ability === 'Hustle' && category === 'Physical') { attack = applyMod(attack, 6144); d.attackerAbility = 'Hustle'; }

    var atkMods = [];
    var lowHP = attacker.curHP <= Math.floor(attacker.maxHP / 3);
    var pinch = { Blaze: 'Fire', Overgrow: 'Grass', Torrent: 'Water', Swarm: 'Bug' };
    if (pinch[attacker.ability] === type && lowHP) { atkMods.push(6144); d.attackerAbility = attacker.ability; }
    if ((attacker.ability === 'Huge Power' || attacker.ability === 'Pure Power') && atkKey === 'at' && name !== 'Body Press') { atkMods.push(8192); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Guts' && hasStatus && category === 'Physical') { atkMods.push(6144); d.attackerAbility = 'Guts'; }
    if (attacker.ability === 'Solar Power' && category === 'Special' && (atkWeather === 'Sun' || atkWeather === 'Harsh Sun')) { atkMods.push(6144); d.attackerAbility = 'Solar Power'; }
    if (category === 'Physical' && (atkWeather === 'Sun' || atkWeather === 'Harsh Sun') && (attacker.ability === 'Flower Gift' || (aSide && aSide.flowerGift))) { atkMods.push(6144); d.flowerGift = true; }
    if (attacker.ability === 'Defeatist' && attacker.curHP <= attacker.maxHP / 2) { atkMods.push(2048); d.attackerAbility = 'Defeatist'; }
    if (attacker.ability === 'Fire Mane' && type === 'Fire') { atkMods.push(6144); d.attackerAbility = 'Fire Mane'; }
    if (attacker.ability === "Dragon's Maw" && type === 'Dragon') { atkMods.push(6144); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Transistor' && type === 'Electric') { atkMods.push(5325); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Steelworker' && type === 'Steel') { atkMods.push(6144); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Rocky Payload' && type === 'Rock') { atkMods.push(6144); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Water Bubble' && type === 'Water') { atkMods.push(8192); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Gorilla Tactics' && category === 'Physical') { atkMods.push(6144); d.attackerAbility = attacker.ability; }
    if (attacker.ability === 'Flash Fire' && attacker.flashFire && type === 'Fire') { atkMods.push(6144); d.attackerAbility = 'Flash Fire'; }
    if (attacker.ability === 'Stakeout' && attacker.stakeout) { atkMods.push(8192); d.attackerAbility = 'Stakeout'; }
    if ((attacker.ability === 'Plus' || attacker.ability === 'Minus') && category === 'Special' && move.plusMinus) { atkMods.push(6144); d.attackerAbility = attacker.ability; }
    if (it === 'Choice Band' && category === 'Physical') { atkMods.push(6144); d.attackerItem = it; }
    if (it === 'Choice Specs' && category === 'Special') { atkMods.push(6144); d.attackerItem = it; }
    if (it === 'Light Ball' && attacker.species.indexOf('Pikachu') === 0) { atkMods.push(8192); d.attackerItem = it; }
    if (it === 'Thick Club' && /Cubone|Marowak/.test(attacker.species) && category === 'Physical') { atkMods.push(8192); d.attackerItem = it; }
    if (defAbility === 'Thick Fat' && (type === 'Fire' || type === 'Ice')) { atkMods.push(2048); d.defenderAbility = defAbility; }
    if (defAbility === 'Heatproof' && type === 'Fire') { atkMods.push(2048); d.defenderAbility = defAbility; }
    if (defAbility === 'Water Bubble' && type === 'Fire') { atkMods.push(2048); d.defenderAbility = defAbility; }
    if (defAbility === 'Purifying Salt' && type === 'Ghost') { atkMods.push(2048); d.defenderAbility = defAbility; }
    var ruin = field.ruin || {};
    if (ruin.tablets && atkKey === 'at' && attacker.ability !== 'Tablets of Ruin') { atkMods.push(3072); d.ruinAtk = 'Tablets of Ruin'; }
    if (ruin.vessel && atkKey === 'sa' && attacker.ability !== 'Vessel of Ruin') { atkMods.push(3072); d.ruinAtk = 'Vessel of Ruin'; }
    attack = Math.max(1, applyMod(attack, chainMods(atkMods)));

    // ---- defense ----
    var defBoost = defender.boosts[defKey] || 0;
    if (attacker.ability === 'Unaware' && defBoost) { d.attackerAbility = 'Unaware'; defBoost = 0; }
    if (move.ignoresDefenseBoosts) defBoost = 0;
    if (isCrit && defBoost > 0) defBoost = 0;
    var defense = boosted(defender.stats[defKey], defBoost);
    d.defBoost = defBoost;
    var defMods = [];
    var defStatus = defender.status && defender.status !== 'Healthy';
    if (defKey === 'sd' && weather === 'Sand' && hasType(defender, 'Rock')) { defMods.push(6144); d.weather = 'Sand'; }
    if (defKey === 'df' && weather === 'Snow' && hasType(defender, 'Ice')) { defMods.push(6144); d.weather = 'Snow'; }
    if (defAbility === 'Marvel Scale' && defStatus && defKey === 'df') { defMods.push(6144); d.defenderAbility = defAbility; }
    if (defAbility === 'Fur Coat' && defKey === 'df') { defMods.push(8192); d.defenderAbility = defAbility; }
    if (defAbility === 'Grass Pelt' && field.terrain === 'Grassy' && defKey === 'df') { defMods.push(6144); d.defenderAbility = defAbility; }
    if (defKey === 'sd' && (weather === 'Sun' || weather === 'Harsh Sun') && (defAbility === 'Flower Gift' || (dSide && dSide.flowerGift))) { defMods.push(6144); d.defFlowerGift = true; }
    if (defender.item === 'Eviolite' && defender.canEvolve) { defMods.push(6144); d.defenderItem = 'Eviolite'; }
    if (defender.item === 'Assault Vest' && defKey === 'sd') { defMods.push(6144); d.defenderItem = 'Assault Vest'; }
    if (ruin.sword && defKey === 'df' && defender.ability !== 'Sword of Ruin') { defMods.push(3072); d.ruinDef = 'Sword of Ruin'; }
    if (ruin.beads && defKey === 'sd' && defender.ability !== 'Beads of Ruin') { defMods.push(3072); d.ruinDef = 'Beads of Ruin'; }
    defense = Math.max(1, applyMod(defense, chainMods(defMods)));

    // ---- base damage ----
    var base = Math.floor(Math.floor(Math.floor(2 * LEVEL / 5 + 2) * bp * attack / defense) / 50) + 2;
    var spread = doubles && move.isSpread && !move.singleTarget;
    if (spread) base = applyMod(base, 3072);
    res.spread = spread;
    if (!defUmbrella) {
      if (atkWeather === 'Sun' || atkWeather === 'Harsh Sun') {
        if (type === 'Fire') { base = applyMod(base, 6144); d.weather = atkWeather; }
        else if (type === 'Water' && name !== 'Hydro Steam') { base = applyMod(base, 2048); d.weather = atkWeather; }
      } else if (atkWeather === 'Rain' || atkWeather === 'Heavy Rain') {
        if (type === 'Water') { base = applyMod(base, 6144); d.weather = atkWeather; }
        else if (type === 'Fire') { base = applyMod(base, 2048); d.weather = atkWeather; }
      }
    }
    if (attacker.ability === 'Mega Sol' && d.weather) d.attackerAbility = 'Mega Sol';
    if (isCrit) { base = Math.floor(base * 1.5); d.isCrit = true; }

    // STAB
    var stabMod = 4096;
    var isStab = hasType(attacker, type) || attacker.ability === 'Protean' || attacker.ability === 'Libero';
    if (isStab) stabMod = attacker.ability === 'Adaptability' ? 8192 : 6144;
    if (attacker.ability === 'Adaptability' && isStab) d.attackerAbility = 'Adaptability';
    if ((attacker.ability === 'Protean' || attacker.ability === 'Libero') && !hasType(attacker, type)) d.attackerAbility = attacker.ability;

    var applyBurn = attacker.status === 'Burned' && category === 'Physical' && attacker.ability !== 'Guts' && name !== 'Facade';
    if (applyBurn) d.burned = true;

    // ---- final modifiers ----
    var fin = [];
    var screenBreakers = ['Brick Break', 'Psychic Fangs', 'Raging Bull'];
    var screens = !isCrit && attacker.ability !== 'Infiltrator' && !move.ignoresScreens && screenBreakers.indexOf(name) === -1;
    if (screens && dSide) {
      var scr = doubles ? 2732 : 2048;
      if (dSide.auroraVeil) { fin.push(scr); d.screen = 'Aurora Veil'; }
      else if (dSide.reflect && category === 'Physical') { fin.push(scr); d.screen = 'Reflect'; }
      else if (dSide.lightScreen && category === 'Special') { fin.push(scr); d.screen = 'Light Screen'; }
    }
    if (attacker.ability === 'Neuroforce' && eff > 1) { fin.push(5120); d.attackerAbility = 'Neuroforce'; }
    if (attacker.ability === 'Sniper' && isCrit) { fin.push(6144); d.attackerAbility = 'Sniper'; }
    if (attacker.ability === 'Tinted Lens' && eff < 1) { fin.push(8192); d.attackerAbility = 'Tinted Lens'; }
    if ((defAbility === 'Multiscale' || defender.ability === 'Shadow Shield') && defender.curHP === defender.maxHP) { fin.push(2048); d.defenderAbility = defender.ability; }
    if ((defAbility === 'Fluffy' || defAbility === 'Aura Guard') && makesContact) { fin.push(2048); d.defenderAbility = defAbility; }
    if (defAbility === 'Punk Rock' && move.isSound) { fin.push(2048); d.defenderAbility = defAbility; }
    if (defAbility === 'Ice Scales' && category === 'Special') { fin.push(2048); d.defenderAbility = defAbility; }
    if (dSide && dSide.friendGuard) { fin.push(3072); d.friendGuard = true; }
    if ((defAbility === 'Filter' || defAbility === 'Solid Rock' || defender.ability === 'Prism Armor') && eff > 1) { fin.push(3072); d.defenderAbility = defender.ability; }
    if (defAbility === 'Fluffy' && type === 'Fire') { fin.push(8192); d.defenderAbility = defAbility; }
    if (defender.glaiveRush) { fin.push(8192); d.glaiveRush = true; }
    if (it === 'Expert Belt' && eff > 1) { fin.push(4915); d.attackerItem = it; }
    if (it === 'Life Orb') { fin.push(5324); d.attackerItem = it; }
    if (it === 'Metronome' && move.metronome > 1) { fin.push(Math.min(8192, 4096 + 819 * (move.metronome - 1))); d.attackerItem = it; }
    var berry = RESIST_BERRIES[defender.item];
    if (berry && berry === type && (eff > 1 || berry === 'Normal') && attacker.ability !== 'Unnerve') { fin.push(2048); d.defenderItem = defender.item; }
    var finalMod = chainMods(fin);

    // ---- hits ----
    var hitsList = [1];
    if (name === 'Triple Axel') hitsList = [20, 40, 60].slice(0, move.hits || 3);
    else if (name === 'Triple Kick') hitsList = [10, 20, 30].slice(0, move.hits || 3);
    if (hitsList.length === 1 && hitsList[0] !== 1) { bp = Math.max(1, applyMod(hitsList[0], chainMods(bpMods))); hitsList = [1]; }
    var nHits = 1;
    if (move.hitRange) {
      if (Array.isArray(move.hitRange)) {
        var mx = move.hitRange[move.hitRange.length - 1];
        nHits = move.hits ? Math.min(mx, Math.max(move.hitRange[0], move.hits)) : (attacker.ability === 'Skill Link' ? mx : (mx === 5 ? (attacker.item === 'Loaded Dice' ? 4 : 3) : mx));
        if (attacker.ability === 'Skill Link' && mx === 5) d.attackerAbility = 'Skill Link';
      } else nHits = move.hitRange;
    }
    if (name === 'Population Bomb') nHits = move.hits || (attacker.ability === 'Skill Link' ? 10 : 10);
    if (name === 'Dragon Darts' && doubles) nHits = move.hits || 2;

    function rollsFor(b) {
      var out = [];
      for (var i = 0; i < 16; i++) {
        var dmg = Math.floor(b * (85 + i) / 100);
        dmg = applyMod(dmg, stabMod);
        dmg = Math.floor(dmg * eff);
        if (applyBurn) dmg = Math.floor(dmg / 2);
        dmg = applyMod(dmg, finalMod);
        out.push(Math.max(1, dmg % 65536));
      }
      return out;
    }

    var rolls;
    if (hitsList.length > 1) {
      // Triple Axel / Triple Kick: recompute base per hit power
      rolls = new Array(16).fill(0);
      var savedRes = calculateWithBP;
      hitsList.forEach(function (hbp) {
        var r = savedRes(hbp);
        for (var i = 0; i < 16; i++) rolls[i] += r[i];
      });
      d.hits = 3;
    } else {
      rolls = rollsFor(base);
      if (nHits > 1) { rolls = rolls.map(function (x) { return x * nHits; }); d.hits = nHits; }
      if (attacker.ability === 'Parental Bond' && !spread && nHits === 1) {
        var second = rollsFor(applyMod(base, 1024));
        rolls = rolls.map(function (x, i) { return x + second[i]; });
        d.attackerAbility = 'Parental Bond';
      }
    }

    function calculateWithBP(hbp) {
      var m = move; // reuse same pipeline with different bp
      var b2 = Math.max(1, applyMod(hbp, chainMods(bpMods)));
      var bb = Math.floor(Math.floor(Math.floor(2 * LEVEL / 5 + 2) * b2 * attack / defense) / 50) + 2;
      if (spread) bb = applyMod(bb, 3072);
      if (isCrit) bb = Math.floor(bb * 1.5);
      return rollsFor(bb);
    }

    rolls.sort(function (a, b) { return a - b; });
    res.damage = rolls;
    res.nHits = nHits;
    return res;
  }

  // ---------- KO chance ----------
  // opts: {hazards: damage before first hit, residual: per-turn HP change (negative = damage), sitrus, berryHeal}
  function koChance(rolls, defender, opts) {
    opts = opts || {};
    var maxHP = defender.maxHP;
    var start = defender.curHP - (opts.hazards || 0);
    if (rolls.length === 1 && rolls[0] === 0) return { text: '', n: 0 };
    if (start <= 0) return { text: 'durch Hazards KO', n: 0 };
    var sitrus = opts.sitrus ? Math.floor(maxHP / 4) : 0;
    var residual = opts.residual || 0;
    // state: key "hp|berry" -> probability
    var states = {}; states[start + '|' + (sitrus ? 1 : 0)] = 1;
    var results = [];
    var w = 1 / rolls.length;
    for (var turn = 1; turn <= 4; turn++) {
      var next = {}, ko = 0;
      Object.keys(states).forEach(function (k) {
        var parts = k.split('|'), hp = +parts[0], b = +parts[1], p = states[k];
        rolls.forEach(function (r) {
          var nh = hp - r;
          if (nh <= 0 && opts.sash && turn === 1 && hp === maxHP) nh = 1;
          if (nh <= 0) { ko += p * w; return; }
          var nb = b;
          if (nb && nh <= maxHP / 2) { nh = Math.min(maxHP, nh + sitrus); nb = 0; }
          nh = Math.min(maxHP, nh + residual);
          if (nh <= 0) { ko += p * w; return; }
          if (nb && nh <= maxHP / 2) { nh = Math.min(maxHP, nh + sitrus); nb = 0; }
          var key = nh + '|' + nb;
          next[key] = (next[key] || 0) + p * w;
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
        return { text: (Math.round(c * 1000) / 10).toFixed(1) + '% Chance auf ' + label, n: i + 1, chance: c };
      }
    }
    var maxD = rolls[rolls.length - 1];
    if (maxD > 0) return { text: 'mögl. ' + Math.ceil(start / Math.max(1, rolls[0])) + 'HKO oder mehr', n: 5 };
    return { text: '', n: 0 };
  }

  window.Calc = {
    TYPES: TYPES, CHART: CHART, NATURES: NATURES, STAT_KEYS: STAT_KEYS, STAT_LABEL: STAT_LABEL, STAT_LONG: STAT_LONG,
    SP_MAX: SP_MAX, SP_TOTAL: SP_TOTAL, LEVEL: LEVEL, RESIST_BERRIES: RESIST_BERRIES, TYPE_ITEMS: TYPE_ITEMS,
    calcStat: calcStat, spToEv: spToEv, evToSp: evToSp, natureMod: natureMod, boosted: boosted,
    getSpeed: getSpeed, calculate: calculate, koChance: koChance, typeEff: typeEff, isGrounded: isGrounded,
    effectiveWeather: effectiveWeather, pokeRound: pokeRound
  };
})();
