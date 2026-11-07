// Top Counter (DialgaDex): Raid-Angreifer-Rangliste & Raid-Boss-Konter für Pokémon GO
// Exakte Implementierung der DialgaDex-Berechnungsformeln (https://github.com/mgrann03/dialgadex):
// Comprehensive DPS, TDO, eDPS (inkl. Relobby & Team-Größe), Party Power, Raid-Boss-Affinität, 0,5s-Raid-Takt,
// Super-Mega-Level, XL-Budget sowie Jenks-Natural-Breaks-Tierliste (MRay, SSS, SS, S, A, B, C, D, F).
(function () {
  'use strict';
  var A = window.CC, G = window.GODEX;
  if (!A || !G) return;
  var el = A.el, esc = A.esc;
  var de = A.LANG === 'de';

  // ======================= Typen & Effektivität (Pokémon GO: 1.6 / 0.625 / 0.390625) =======================
  var POKEMON_TYPES = [
    'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  var POKEMON_TYPES_EFFECT = {
    Normal:   [['Ghost'], ['Rock', 'Steel'], []],
    Fire:     [[], ['Dragon', 'Fire', 'Rock', 'Water'], ['Bug', 'Grass', 'Ice', 'Steel']],
    Water:    [[], ['Dragon', 'Grass', 'Water'], ['Fire', 'Ground', 'Rock']],
    Grass:    [[], ['Bug', 'Dragon', 'Fire', 'Flying', 'Grass', 'Poison', 'Steel'], ['Ground', 'Rock', 'Water']],
    Electric: [['Ground'], ['Dragon', 'Electric', 'Grass'], ['Flying', 'Water']],
    Ice:      [[], ['Fire', 'Ice', 'Steel', 'Water'], ['Dragon', 'Flying', 'Grass', 'Ground']],
    Fighting: [['Ghost'], ['Bug', 'Fairy', 'Flying', 'Poison', 'Psychic'], ['Dark', 'Ice', 'Normal', 'Rock', 'Steel']],
    Poison:   [['Steel'], ['Ghost', 'Ground', 'Poison', 'Rock'], ['Fairy', 'Grass']],
    Ground:   [['Flying'], ['Bug', 'Grass'], ['Electric', 'Fire', 'Poison', 'Rock', 'Steel']],
    Flying:   [[], ['Electric', 'Rock', 'Steel'], ['Bug', 'Fighting', 'Grass']],
    Psychic:  [['Dark'], ['Psychic', 'Steel'], ['Fighting', 'Poison']],
    Bug:      [[], ['Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Poison', 'Steel'], ['Dark', 'Grass', 'Psychic']],
    Rock:     [[], ['Fighting', 'Ground', 'Steel'], ['Bug', 'Fire', 'Flying', 'Ice']],
    Ghost:    [['Normal'], ['Dark'], ['Ghost', 'Psychic']],
    Dragon:   [['Fairy'], ['Steel'], ['Dragon']],
    Dark:     [[], ['Dark', 'Fairy', 'Fighting'], ['Ghost', 'Psychic']],
    Steel:    [[], ['Electric', 'Fire', 'Steel', 'Water'], ['Fairy', 'Ice', 'Rock']],
    Fairy:    [[], ['Fire', 'Poison', 'Steel'], ['Dark', 'Dragon', 'Fighting']]
  };

  function getEffectivenessMultAgainst(attackType, enemyTypes) {
    var eff = POKEMON_TYPES_EFFECT[attackType];
    if (!eff) return 1;
    var mult = 1;
    for (var i = 0; i < enemyTypes.length; i++) {
      var t = enemyTypes[i];
      if (eff[0].indexOf(t) !== -1) mult *= 0.390625;
      else if (eff[1].indexOf(t) !== -1) mult *= 0.625;
      else if (eff[2].indexOf(t) !== -1) mult *= Math.fround(1.60);
    }
    return mult;
  }

  function getTypesEffectivenessAgainstTypes(types) {
    var map = {};
    for (var i = 0; i < POKEMON_TYPES.length; i++) {
      var t = POKEMON_TYPES[i];
      map[t] = getEffectivenessMultAgainst(t, types);
    }
    return map;
  }

  function getTypesEffectivenessSingleBoost(type) {
    var map = {};
    for (var i = 0; i < POKEMON_TYPES.length; i++) {
      var t = POKEMON_TYPES[i];
      map[t] = (t === type) ? Math.fround(1.60) : 1;
    }
    return map;
  }

  // ======================= CPM-Tabelle (Game Master Level 1–55) =======================
  var CPM = [
    0,
    0.094, 0.16639787, 0.21573247, 0.25572005, 0.29024988,
    0.3210876, 0.34921268, 0.3752356, 0.39956728, 0.4225,
    0.44310755, 0.4627984, 0.48168495, 0.49985844, 0.51739395,
    0.5343543, 0.5507927, 0.5667545, 0.5822789, 0.5974,
    0.6121573, 0.6265671, 0.64065295, 0.65443563, 0.667934,
    0.6811649, 0.69414365, 0.7068842, 0.7193991, 0.7317,
    0.7377695, 0.74378943, 0.74976104, 0.7556855, 0.76156384,
    0.76739717, 0.7731865, 0.77893275, 0.784637, 0.7903,
    0.7953, 0.8003, 0.8053, 0.8103, 0.8153,
    0.8203, 0.8253, 0.8303, 0.8353, 0.8403,
    0.8453, 0.8503, 0.8553, 0.8603, 0.8653
  ];
  var cpmCache = {};
  function getCPMForLevel(level) {
    if (cpmCache[level] != null) return cpmCache[level];
    if (level < 1 || level >= CPM.length) return 0;
    if (Math.floor(level) === level) {
      cpmCache[level] = Math.fround(CPM[level]);
      return cpmCache[level];
    }
    var prev = getCPMForLevel(Math.floor(level));
    var next = getCPMForLevel(Math.ceil(level));
    cpmCache[level] = Math.sqrt((prev * prev + next * next) / 2);
    return cpmCache[level];
  }

  // ======================= Attacken & Pokémon-Daten aus window.GODEX =======================
  var fmByName = {}, cmByName = {}, fmByIdx = [], cmByIdx = [];
  G.fast.forEach(function (m, idx) {
    var o = {
      idx: idx,
      name: m[0],
      type: m[0] === 'Hidden Power' ? 'None' : m[1],
      power: m[2] || 0,
      energy_delta: m[3] || 0,
      duration: m[4] || 500,
      damage_window_start: m[5] || 0,
      id: m[6] || idx
    };
    fmByIdx[idx] = o;
    fmByName[o.name] = o;
  });
  G.charged.forEach(function (m, idx) {
    var o = {
      idx: idx,
      name: m[0],
      type: m[1],
      power: m[2] || 0,
      energy_delta: -(m[3] || 0),
      duration: m[4] || 1000,
      damage_window_start: m[5] || 0,
      mega_temp: !!m[6],
      id: m[7] || idx
    };
    cmByIdx[idx] = o;
    cmByName[o.name] = o;
  });

  var allMons = [], baseShadowByNum = {}, speciesByNum = {};
  G.mons.forEach(function (m) {
    var num = m[0], flabel = m[2] || '';
    var flags = m[11] != null ? m[11] : 2;
    var shadow = !!(flags & 1);
    var released = !!(flags & 2);
    var isLegend = !!(flags & 4);
    var inDialga = (flags & 8) ? true : true;
    var isMega = flabel === 'Mega' || flabel === 'Mega-X' || flabel === 'Mega-Y' || flabel === 'Mega-Z' || flabel === 'Primal';
    var pogoForm = m[14] || (isMega ? (flabel === 'Mega-Y' ? 'MegaY' : flabel === 'Mega-Z' ? 'MegaZ' : 'Mega') : (flabel || 'Normal'));
    var nd = (window.NATDEX && window.NATDEX[num]) || [];
    if (!speciesByNum[num]) {
      speciesByNum[num] = {
        num: num,
        nameEn: nd[1] || m[1],
        nameDe: nd[2] || nd[1] || m[1],
        sid: nd[0] || A.idOf(m[1]),
        forms: []
      };
    }
    if (!flabel && shadow) baseShadowByNum[num] = true;
    var entry = {
      id: num,
      num: num,
      name: m[1],
      nameEn: speciesByNum[num].nameEn,
      nameDe: speciesByNum[num].nameDe,
      sid: speciesByNum[num].sid,
      label: flabel,
      form: pogoForm,
      isMega: isMega,
      types: m[3] || ['Normal'],
      stats: { baseAttack: m[4], baseDefense: m[5], baseStamina: m[6] },
      atk: m[4],
      def: m[5],
      sta: m[6],
      fmIdx: m[7] || [],
      cmIdx: m[8] || [],
      efmIdx: m[9] || [],
      ecmIdx: m[10] || [],
      tempCmIdx: m[13] || [],
      shadow: shadow,
      released: released,
      class: isLegend ? 'LEGENDARY' : undefined,
      inDialga: inDialga,
      raid_tier: m[12] || 0
    };
    speciesByNum[num].forms.push(entry);
    allMons.push(entry);
  });

  function getHiddenPowerTypes(filter, pkmObj) {
    if (filter === 'None') return [];
    if (filter === 'Raid Boss') return ['Fighting'];
    if (filter === 'Type-Match' && pkmObj && pkmObj.types) {
      return pkmObj.types.filter(function (t) { return t !== 'Fairy' && t !== 'Normal'; });
    }
    return POKEMON_TYPES.filter(function (t) { return t !== 'Fairy' && t !== 'Normal'; });
  }

  function getPokemonMoves(pkmObj, hpFilter) {
    if (!hpFilter) hpFilter = 'Type-Match';
    var fm = pkmObj.fmIdx.map(function (i) { return fmByIdx[i] && fmByIdx[i].name; }).filter(Boolean);
    var cm = pkmObj.cmIdx.map(function (i) { return cmByIdx[i] && cmByIdx[i].name; }).filter(Boolean);
    var eliteFm = pkmObj.efmIdx.map(function (i) { return fmByIdx[i] && fmByIdx[i].name; }).filter(Boolean);
    var eliteCm = pkmObj.ecmIdx.map(function (i) { return cmByIdx[i] && cmByIdx[i].name; }).filter(Boolean);
    if (!fm.length && !cm.length && !eliteFm.length && !eliteCm.length) return [];

    if (fm.indexOf('Hidden Power') !== -1 || eliteFm.indexOf('Hidden Power') !== -1) {
      var hpTypes = getHiddenPowerTypes(hpFilter, pkmObj);
      for (var i = 0; i < hpTypes.length; i++) {
        var hpName = 'Hidden Power ' + hpTypes[i];
        if (fm.indexOf('Hidden Power') !== -1) fm.push(hpName);
        if (eliteFm.indexOf('Hidden Power') !== -1) eliteFm.push(hpName);
      }
    }

    var shadowOnlyCm = [];
    var pureOnlyCm = [];
    if (pkmObj.shadow) {
      pureOnlyCm.push('Return');
    } else if (pkmObj.isMega && baseShadowByNum[pkmObj.num]) {
      pureOnlyCm.push('Return');
    }

    if (pkmObj.form === 'S' || pkmObj.label === 'S') {
      if (pkmObj.num === 249) {
        shadowOnlyCm.push('Aeroblast Plus');
        pureOnlyCm.push('Aeroblast Plus Plus');
      } else if (pkmObj.num === 250) {
        shadowOnlyCm.push('Sacred Fire Plus');
        pureOnlyCm.push('Sacred Fire Plus Plus');
      }
    }

    if (pkmObj.tempCmIdx && pkmObj.tempCmIdx.length) {
      for (var j = 0; j < pkmObj.tempCmIdx.length; j++) {
        var tm = cmByIdx[pkmObj.tempCmIdx[j]];
        if (tm && eliteCm.indexOf(tm.name) === -1) eliteCm.push(tm.name);
      }
    }

    return [fm, cm, eliteFm, eliteCm, pureOnlyCm, shadowOnlyCm];
  }

  // ======================= Zustand / Einstellungen =======================
  var st = A.load('cc_gocounter', null) || {};
  var DEFAULTS = {
    mode: 'type',         // 'type' (Typ-Rangliste) | 'boss' (Raid-Boss-Konter)
    type: 'Any',          // 'Any' | 'Each' | einer der 18 Typen
    versus: false,        // false = Angreifer dieses Typs, true = Konter gegen diesen Typ
    bossNum: 150,         // Raid-Boss Dex-Nr.
    bossForm: '',         // Raid-Boss Form-Label
    bossTier: 0,          // 0 = Auto (aus Daten), 1, 3, 4, 5, 6, 8
    bossFm: '',           // '' = Durchschnitt aller Boss-Schnellattacken
    bossCm: '',           // '' = Durchschnitt aller Boss-Ladeattacken
    metric: 'eDPS',       // 'eDPS' | 'DPS' | 'TDO' | 'ER' | 'EER'
    levelMode: '40',      // '30' | '40' | '50' | 'xl'
    partySize: 1,         // 1, 2, 3, 4
    teamMode: '6',        // '6' (6 Normal / 6 Mega), 'm1' (6 Normal / 1 Mega), '1' (1 / 1)
    relobbyTime: 10,      // Sekunden
    superMegaLevel: 1,    // 1..4
    compare: 'budget',    // 'budget' | 'top' | 'ESpace'
    tierMethod: 'jenks',  // 'jenks' | 'broad' | 'ESpace' | 'absolute'
    mega: true,
    shadow: true,
    legendary: true,
    elite: true,
    mixed: true,
    offtype: false,
    unreleased: false,
    suboptimal: false,
    grouped: false,
    typeAffinity: true,
    pveTurns: true,
    newdps: true,
    limit: 100,
    search: ''
  };
  Object.keys(DEFAULTS).forEach(function (k) {
    if (st[k] === undefined) st[k] = DEFAULTS[k];
  });
  function saveState() { A.save('cc_gocounter', st); }

  // ======================= DialgaDex Berechnungs-Engine =======================
  var ESTIMATED_Y_NUM = 1340;
  var ESTIMATED_CM_POWER = 11670;

  function processDuration(duration) {
    if (st.pveTurns) return Math.round((duration / 1000) * 2) / 2;
    return duration / 1000;
  }

  function processPower(moveObj) {
    var superMegaMult = 1;
    if (moveObj.mega_temp) {
      if (st.superMegaLevel === 2) superMegaMult = Math.fround(1.1);
      else if (st.superMegaLevel === 3) superMegaMult = Math.fround(1.2);
      else if (st.superMegaLevel === 4) superMegaMult = Math.fround(1.3);
    }
    if (st.pveTurns) {
      var newDuration = processDuration(moveObj.duration);
      var modifier = (newDuration - moveObj.duration / 1000) / newDuration;
      if (Math.abs(modifier) >= 0.199) {
        return moveObj.power * (1 + modifier) * superMegaMult;
      }
    }
    return moveObj.power * superMegaMult;
  }

  function calcDamage(atk, def, power, modifiers, rounded) {
    if (rounded) return Math.floor(Math.fround(0.5 * power * (atk / def) * modifiers)) + 1;
    return 0.5 * power * (atk / def) * modifiers + 0.5;
  }

  function getPartyBoost(fToCRatio) {
    if (st.partySize <= 1) return 0;
    var fMovesPerBoost = st.partySize === 2 ? 18 : st.partySize === 3 ? 9 : 6;
    return Math.max(0, Math.min(fToCRatio / fMovesPerBoost, 1));
  }

  function getDPS(types, atk, def, hp, fmObj, cmObj, fmMult, cmMult, enemyDef, enemyY, realDamage) {
    if (!fmObj || !cmObj) return 0;
    if (!enemyY) enemyY = { y_num: null, cm_num: null };
    if (!enemyDef) enemyDef = 180;
    var yNumDefault = st.newdps ? ESTIMATED_Y_NUM : 900;
    var y = (enemyY.y_num ? enemyY.y_num : yNumDefault) / def;
    var inCmDmg = (enemyY.cm_num ? enemyY.cm_num : ESTIMATED_CM_POWER) / def;

    var tof = hp / y;
    var x = 0.5 * -cmObj.energy_delta + 0.5 * fmObj.energy_delta;
    if (st.newdps) {
      x = x + 0.5 * inCmDmg;
    }

    var fmStab = (types.indexOf(fmObj.type) !== -1 && fmObj.name !== 'Hidden Power') ? Math.fround(1.2) : 1;
    var fmDmgMult = fmMult * fmStab;
    var fmDmg = calcDamage(atk, enemyDef, processPower(fmObj), fmDmgMult, realDamage);
    var fmDur = processDuration(fmObj.duration);
    var fmDps = fmDmg / fmDur;
    var fmEps = fmObj.energy_delta / fmDur;

    var cmDur = processDuration(cmObj.duration);
    var fToCRatio = (tof * -cmObj.energy_delta + cmDur * (x - 0.5 * hp)) /
      (tof * fmObj.energy_delta - fmDur * (x - 0.5 * hp));
    var ppBoost = getPartyBoost(fToCRatio);

    var cmStab = (types.indexOf(cmObj.type) !== -1) ? Math.fround(1.2) : 1;
    var cmDmgMult = cmMult * cmStab;
    var cmDmg = calcDamage(atk, enemyDef, processPower(cmObj), cmDmgMult, realDamage);
    var cmDps = cmDmg / cmDur;
    var cmDpsAdj = cmDps * (1 + ppBoost);
    var cmEps = -cmObj.energy_delta / cmDur;

    if (cmObj.energy_delta === -100) {
      var dws = st.pveTurns ? 0 : (cmObj.damage_window_start / 1000);
      cmEps = (-cmObj.energy_delta + 0.5 * fmObj.energy_delta + 0.5 * y * dws) / cmDur;
    }

    if (fmDps > cmDps) return fmDps;

    var dps0 = (fmDps * cmEps + cmDpsAdj * fmEps) / (cmEps + fmEps);
    var dps = dps0 + ((cmDpsAdj - fmDps) / (cmEps + fmEps)) * (0.5 - x / hp) * y;

    return fmDps > dps ? fmDps : (dps > 0 ? dps : 0);
  }

  function getTDO(dps, hp, def, enemyY) {
    var yNumDefault = st.newdps ? ESTIMATED_Y_NUM : 900;
    var y = (enemyY && enemyY.y_num ? enemyY.y_num : yNumDefault) / def;
    var tof = hp / y;
    return dps * tof;
  }

  function getEDPS(dps, tdo, pkmObj, enemyParams, realDamage) {
    if (!(dps > 0) || !(tdo > 0)) return 0;
    var RESPAWN_TIME = 1;
    var REJOIN_TIME = st.relobbyTime;
    var teamNormal = st.teamMode === '1' ? 1 : 6;
    var teamMega = (st.teamMode === '1' || st.teamMode === 'm1') ? 1 : 6;
    var RAID_PARTY_SIZE = (pkmObj && pkmObj.isMega) ? teamMega : teamNormal;
    var hp = (enemyParams && enemyParams.stats && enemyParams.stats.hp) ? enemyParams.stats.hp : 1000000000;

    var tof = tdo / dps;
    var lives = hp / tdo;
    var deaths = realDamage ? Math.ceil(lives) - 1 : lives - 0.5;
    var relobbies = realDamage ? Math.floor(deaths / RAID_PARTY_SIZE) : deaths / RAID_PARTY_SIZE - 0.5;
    var ttw = lives * tof + (deaths - relobbies) * RESPAWN_TIME + REJOIN_TIME * relobbies;
    return hp / ttw;
  }

  function getMetric(dps, tdo, pkmObj, enemyParams, realDamage) {
    if (st.metric === 'eDPS') return getEDPS(dps, tdo, pkmObj, enemyParams, realDamage);
    if (st.metric === 'DPS') return dps;
    if (st.metric === 'TDO') return tdo;
    var exp = st.metric === 'ER' ? 0.25 : st.metric === 'TER' ? 0.15 : 0.225;
    return Math.pow(dps, 1 - exp) * Math.pow(tdo, exp);
  }

  function getPokemonStats(pkmObj, level) {
    var cpm = getCPMForLevel(level);
    return {
      baseAttack: pkmObj.stats.baseAttack,
      baseDefense: pkmObj.stats.baseDefense,
      baseStamina: pkmObj.stats.baseStamina,
      atk: (pkmObj.stats.baseAttack + 15) * cpm,
      def: (pkmObj.stats.baseDefense + 15) * cpm,
      hp: (pkmObj.stats.baseStamina + 15) * cpm
    };
  }

  function defaultRaidTier(pkmObj) {
    if (pkmObj.raid_tier) return pkmObj.raid_tier;
    var tier = 3;
    if (pkmObj.class) tier = 5;
    if (pkmObj.isMega) tier = 4;
    if (pkmObj.class && pkmObj.isMega) tier = 6;
    return tier;
  }

  function getRaidStats(pkmObj, tierOverride) {
    var tier = tierOverride || defaultRaidTier(pkmObj);
    var cpmTable = [0, 0.6, 0.67, 0.73, 0.79, 0.79, 0.79, 1.0, 0.79, 0.79];
    var hpTable = [0, 600, 1800, 3600, 9000, 15000, 22500, 20000, 25000, 25000];
    var cpm = Math.fround(cpmTable[tier] || 0.79);
    var hp = hpTable[tier] || 15000;
    return {
      tier: tier,
      atk: (pkmObj.stats.baseAttack + 15) * cpm,
      def: (pkmObj.stats.baseDefense + 15) * cpm,
      hp: hp
    };
  }

  function getSpecificY(types, atk, fmObj, cmObj, totalIncomingDps) {
    if (totalIncomingDps == null) totalIncomingDps = 50;
    if (!fmObj || !cmObj) return 0;

    var CHARGED_MOVE_CHANCE = 0.3;
    var ENERGY_PER_HP = 0.5;
    var FM_DELAY = 1.75;
    var CM_DELAY = 0.5;

    var fmStab = (types.indexOf(fmObj.type) !== -1 && fmObj.name !== 'Hidden Power') ? Math.fround(1.2) : 1;
    var fmNum = 0.5 * processPower(fmObj) * fmStab * atk;
    var fmDur = processDuration(fmObj.duration);

    var cmStab = (types.indexOf(cmObj.type) !== -1) ? Math.fround(1.2) : 1;
    var cmNum = 0.5 * processPower(cmObj) * cmStab * atk;
    var cmDur = processDuration(cmObj.duration);

    var fmsPerCm = 1;
    if (st.newdps) {
      var epsForDamage = ENERGY_PER_HP * totalIncomingDps;
      fmDur += FM_DELAY;
      cmDur += CM_DELAY;
      fmsPerCm = (-cmObj.energy_delta - epsForDamage * cmDur) / (fmObj.energy_delta + epsForDamage * fmDur);
      if (fmsPerCm < 0) fmsPerCm = 0;
      fmsPerCm = fmsPerCm + (1 / CHARGED_MOVE_CHANCE) - 1;
    } else {
      if (cmObj.energy_delta === -100) fmsPerCm = 3;
      else if (cmObj.energy_delta === -50) fmsPerCm = 1.5;
      else if (cmObj.energy_delta === -33) fmsPerCm = 1;
      fmsPerCm *= 0.5;
      fmDur += 2;
      cmDur += 2;
    }

    var cycleDur = fmsPerCm * fmDur + cmDur;
    var typeYs = {
      Any: {
        y_num: (fmsPerCm * fmNum + cmNum) / cycleDur,
        cm_num: cmNum
      }
    };
    if (fmObj.type === cmObj.type) {
      typeYs[fmObj.type] = typeYs.Any;
    } else {
      typeYs[fmObj.type] = { y_num: (fmsPerCm * fmNum) / cycleDur, cm_num: 0 };
      typeYs[cmObj.type] = { y_num: cmNum / cycleDur, cm_num: cmNum };
    }
    return typeYs;
  }

  function getMovesetYs(types, atk, fms, cms, totalIncomingDps) {
    var allYs = [];
    for (var i = 0; i < fms.length; i++) {
      var fmObj = fmByName[fms[i]];
      if (!fmObj) continue;
      for (var j = 0; j < cms.length; j++) {
        var cmObj = cmByName[cms[j]];
        if (!cmObj) continue;
        allYs.push(getSpecificY(types, atk, fmObj, cmObj, totalIncomingDps));
      }
    }
    return allYs;
  }

  function getAvgY(allYs) {
    if (!allYs.length) return { Any: { y_num: ESTIMATED_Y_NUM, cm_num: ESTIMATED_CM_POWER } };
    var acc = {};
    for (var i = 0; i < allYs.length; i++) {
      var ty = allYs[i];
      var keys = Object.keys(ty);
      for (var k = 0; k < keys.length; k++) {
        var t = keys[k];
        if (!acc[t]) acc[t] = { y_num: 0, cm_num: 0 };
        acc[t].y_num += ty[t].y_num;
        acc[t].cm_num += ty[t].cm_num;
      }
    }
    Object.keys(acc).forEach(function (t) {
      acc[t].y_num /= allYs.length;
      acc[t].cm_num /= allYs.length;
    });
    return acc;
  }

  function avgYAgainst(enemyY, effectiveness) {
    var y = { y_num: 0, cm_num: 0 };
    var keys = Object.keys(enemyY);
    for (var i = 0; i < keys.length; i++) {
      var t = keys[i];
      if (t === 'Any') continue;
      var mult = effectiveness[t];
      if (mult == null || isNaN(mult)) mult = 1;
      y.y_num += enemyY[t].y_num * mult;
      y.cm_num += enemyY[t].cm_num * mult;
    }
    return y;
  }

  function getRaidBosses(hasType, weakToType) {
    var bosses = [];
    for (var i = 0; i < allMons.length; i++) {
      var p = allMons[i];
      if (!p.raid_tier || p.raid_tier < 4) continue;
      if (hasType && p.types.indexOf(hasType) === -1) continue;
      if (weakToType && getEffectivenessMultAgainst(weakToType, p.types) <= 1.01) continue;
      bosses.push(p);
    }
    return bosses;
  }

  var affinityCache = {};
  function getTypeAffinity(type, versus) {
    var cacheKey = [type, !!versus, st.pveTurns ? 1 : 0, st.newdps ? 1 : 0, st.superMegaLevel].join('|');
    if (affinityCache[cacheKey]) return affinityCache[cacheKey];

    var raidBosses;
    if (type === 'Any') raidBosses = getRaidBosses(null, null);
    else if (versus) raidBosses = getRaidBosses(null, type);
    else raidBosses = getRaidBosses(type, null);
    if (!raidBosses.length) raidBosses = getRaidBosses(null, null);

    var avgEff = {};
    var avgYs = { Any: { y_num: 0, cm_num: 0 }, None: { y_num: 0, cm_num: 0 } };
    var avgStats = { atk: 0, def: 0, hp: 0 };
    POKEMON_TYPES.forEach(function (t) {
      avgEff[t] = 0;
      avgYs[t] = { y_num: 0, cm_num: 0 };
    });

    for (var i = 0; i < raidBosses.length; i++) {
      var boss = raidBosses[i];
      var eff = getTypesEffectivenessAgainstTypes(boss.types);
      for (var tIdx = 0; tIdx < POKEMON_TYPES.length; tIdx++) {
        var t = POKEMON_TYPES[tIdx];
        avgEff[t] += eff[t];
      }
      var stats = getRaidStats(boss);
      avgStats.atk += stats.atk;
      avgStats.def += stats.def;
      avgStats.hp += stats.hp;

      var moves = getPokemonMoves(boss, 'Raid Boss');
      if (moves.length === 6) {
        var winDps = stats.hp / (boss.raid_tier >= 4 ? 300 : 180);
        var bossYs = getMovesetYs(boss.types, stats.atk, moves[0], moves[1], winDps);
        if (bossYs.length) {
          var bossAvgY = getAvgY(bossYs);
          Object.keys(bossAvgY).forEach(function (k) {
            if (!avgYs[k]) avgYs[k] = { y_num: 0, cm_num: 0 };
            avgYs[k].y_num += bossAvgY[k].y_num;
            avgYs[k].cm_num += bossAvgY[k].cm_num;
          });
        }
      }
    }

    var n = raidBosses.length || 1;
    POKEMON_TYPES.forEach(function (t) { avgEff[t] /= n; });
    Object.keys(avgYs).forEach(function (k) {
      avgYs[k].y_num /= n;
      avgYs[k].cm_num /= n;
    });
    avgStats.atk /= n;
    avgStats.def /= n;
    avgStats.hp /= n;

    var res = {
      weakness: avgEff,
      enemy_ys: [avgYs],
      stats: avgStats,
      bossCount: raidBosses.length
    };
    affinityCache[cacheKey] = res;
    return res;
  }

  function getStrongestAgainstSpecificEnemy(pkmObj, shadow, level, enemyParams, searchParams) {
    var numMovesets = searchParams.suboptimal ? 50 : 1;
    var movesets = [];

    var types = pkmObj.types;
    var effectiveness = getTypesEffectivenessAgainstTypes(types);
    var stats = getPokemonStats(pkmObj, level);
    var hp = Math.floor(stats.hp);
    var atk = shadow ? stats.atk * Math.fround(1.2) : stats.atk;
    var def = shadow ? stats.def * Math.fround(0.8333333) : stats.def;

    var moves = getPokemonMoves(pkmObj, 'All');
    if (moves.length !== 6) return movesets;
    var fms = moves[0], cms = moves[1], eliteFms = moves[2], eliteCms = moves[3].slice();
    var pureOnlyCms = moves[4], shadowOnlyCms = moves[5];
    if (shadow) eliteCms = eliteCms.concat(shadowOnlyCms);
    else eliteCms = eliteCms.concat(pureOnlyCms);
    var allFms = fms.concat(eliteFms);
    var allCms = cms.concat(eliteCms);

    var enemyMovesetYs = enemyParams.enemy_ys;
    var enemyEffectiveness = enemyParams.weakness;
    var enemyStats = enemyParams.stats;
    var enemyDef = enemyStats ? enemyStats.def : 180;

    if ((!enemyMovesetYs || !enemyMovesetYs.length) && enemyParams.moves && enemyParams.moves.length === 6 && enemyStats) {
      var eFms = enemyParams.bossFm ? [enemyParams.bossFm] : enemyParams.moves[0];
      var eCms = enemyParams.bossCm ? [enemyParams.bossCm] : enemyParams.moves[1];
      if (!eFms.length) eFms = enemyParams.moves[0].concat(enemyParams.moves[2]);
      if (!eCms.length) eCms = enemyParams.moves[1].concat(enemyParams.moves[3]);
      var incomingDps = enemyParams.win_dps || (enemyStats.hp / (enemyStats.tier >= 4 ? 300 : 180)) || 50;
      enemyMovesetYs = getMovesetYs(enemyParams.types, enemyStats.atk, eFms, eCms, incomingDps);
      enemyParams.enemy_ys = enemyMovesetYs;
    }
    if (!enemyMovesetYs || !enemyMovesetYs.length) {
      enemyMovesetYs = [{ Any: { y_num: null, cm_num: null } }];
    }

    for (var i = 0; i < allFms.length; i++) {
      var fm = allFms[i];
      var fmIsElite = eliteFms.indexOf(fm) !== -1;
      if (!searchParams.elite && fmIsElite) continue;
      var fmObj = fmByName[fm];
      if (!fmObj) continue;

      if (searchParams.type && searchParams.type !== 'Any' && !searchParams.versus &&
          fmObj.type !== searchParams.type && !searchParams.mixed) {
        continue;
      }

      var fmMult = enemyEffectiveness[fmObj.type] != null ? enemyEffectiveness[fmObj.type] : 1;

      for (var j = 0; j < allCms.length; j++) {
        var cm = allCms[j];
        var cmIsElite = eliteCms.indexOf(cm) !== -1;
        if (!searchParams.elite && cmIsElite) continue;
        var cmObj = cmByName[cm];
        if (!cmObj) continue;

        if (searchParams.type && searchParams.type !== 'Any' && !searchParams.versus &&
            cmObj.type !== searchParams.type && !searchParams.mixed) {
          continue;
        }
        if (searchParams.type && searchParams.type !== 'Any' && !searchParams.versus && !searchParams.offtype &&
            searchParams.mixed && fmObj.type !== searchParams.type && cmObj.type !== searchParams.type) {
          continue;
        }
        if (fmObj.type !== cmObj.type && !searchParams.mixed) {
          continue;
        }

        var cmMult = enemyEffectiveness[cmObj.type] != null ? enemyEffectiveness[cmObj.type] : 1;
        var sumRat = 0, sumDps = 0, sumTdo = 0;
        var yLen = enemyMovesetYs.length;
        for (var k = 0; k < yLen; k++) {
          var ey = enemyMovesetYs[k];
          var y = (ey.Any && ey.Any.y_num === null && Object.keys(ey).length === 1) ? ey.Any : avgYAgainst(ey, effectiveness);
          var dps = getDPS(types, atk, def, hp, fmObj, cmObj, fmMult, cmMult, enemyDef, y, searchParams.real_damage);
          var tdo = getTDO(dps, hp, def, y);
          var rat = getMetric(dps, tdo, pkmObj, enemyParams, searchParams.real_damage);
          sumRat += rat;
          sumDps += dps;
          sumTdo += tdo;
        }

        var avgRat = sumRat / yLen;
        var avgDps = sumDps / yLen;
        var avgTdo = sumTdo / yLen;

        var ms = {
          rat: avgRat,
          dps: avgDps,
          tdo: avgTdo,
          fm: fm,
          fm_is_elite: fmIsElite,
          fm_type: fmObj.type,
          fm_id: fmObj.id,
          cm: cm,
          cm_is_elite: cmIsElite,
          cm_type: cmObj.type,
          cm_id: cmObj.id,
          cm_temp: !!cmObj.mega_temp
        };

        if (movesets.length < numMovesets) {
          movesets.push(ms);
        } else if (avgRat > movesets[0].rat) {
          movesets[0] = ms;
          movesets.sort(function (a, b) { return a.rat - b.rat; });
        }
      }
    }
    movesets.sort(function (a, b) { return a.rat - b.rat; });
    return movesets;
  }

  function searchAll(searchParams, enemyParams) {
    var counters = [];
    var baseLevel = st.levelMode === '30' ? 30 : st.levelMode === '50' ? 50 : 40;
    var xlBudget = st.levelMode === 'xl';

    for (var i = 0; i < allMons.length; i++) {
      var p = allMons[i];
      if (!searchParams.unreleased && !p.released) continue;
      if (!searchParams.legendary && p.class) continue;
      if (!searchParams.mega && p.isMega) continue;

      var level = baseLevel;
      if (!p.class && xlBudget) level = 50;
      if ((p.raid_tier === 8 || p.raid_tier === 9) && st.superMegaLevel === 4) {
        level = level + 2;
      }

      var variants = [false];
      if (searchParams.shadow && p.shadow) variants.push(true);

      for (var v = 0; v < variants.length; v++) {
        var isShadow = variants[v];
        var movesets = getStrongestAgainstSpecificEnemy(p, isShadow, level, enemyParams, searchParams);
        for (var m = 0; m < movesets.length; m++) {
          var ms = movesets[m];
          if (!(ms.rat > 0) || !isFinite(ms.rat)) continue;
          counters.push({
            rat: ms.rat,
            dps: ms.dps,
            tdo: ms.tdo,
            edps: getEDPS(ms.dps, ms.tdo, p, enemyParams, searchParams.real_damage),
            id: p.id,
            num: p.num,
            name: p.name,
            nameEn: p.nameEn,
            nameDe: p.nameDe,
            sid: p.sid,
            label: p.label,
            form: p.form,
            isMega: p.isMega,
            shadow: isShadow,
            class: p.class,
            level: level,
            types: p.types,
            entry: p,
            fm: ms.fm,
            fm_is_elite: ms.fm_is_elite,
            fm_type: ms.fm_type,
            cm: ms.cm,
            cm_is_elite: ms.cm_is_elite,
            cm_type: ms.cm_type,
            cm_temp: ms.cm_temp
          });
        }
      }
    }

    counters.sort(function (a, b) { return b.rat - a.rat; });
    return counters;
  }

  // ======================= Jenks Natural Breaks & Tiers =======================
  function jenksMatrices(data, nClasses) {
    var lowerClassLimits = [], varianceCombinations = [];
    var i, j, variance = 0;
    for (i = 0; i < data.length + 1; i++) {
      var tmp1 = [], tmp2 = [];
      for (j = 0; j < nClasses + 1; j++) { tmp1.push(0); tmp2.push(0); }
      lowerClassLimits.push(tmp1);
      varianceCombinations.push(tmp2);
    }
    for (i = 1; i < nClasses + 1; i++) {
      lowerClassLimits[1][i] = 1;
      varianceCombinations[1][i] = 0;
      for (j = 2; j < data.length + 1; j++) varianceCombinations[j][i] = Infinity;
    }
    for (var l = 2; l < data.length + 1; l++) {
      var sum = 0, sumSquares = 0, w = 0, i4 = 0;
      for (var m = 1; m < l + 1; m++) {
        var lowerClassLimit = l - m + 1;
        var val = data[lowerClassLimit - 1];
        w++;
        sum += val;
        sumSquares += val * val;
        variance = sumSquares - (sum * sum) / w;
        i4 = lowerClassLimit - 1;
        if (i4 !== 0) {
          for (j = 2; j < nClasses + 1; j++) {
            if (varianceCombinations[l][j] >= (variance + varianceCombinations[i4][j - 1])) {
              lowerClassLimits[l][j] = lowerClassLimit;
              varianceCombinations[l][j] = variance + varianceCombinations[i4][j - 1];
            }
          }
        }
      }
      lowerClassLimits[l][1] = 1;
      varianceCombinations[l][1] = variance;
    }
    return { lowerClassLimits: lowerClassLimits, varianceCombinations: varianceCombinations };
  }

  function jenks(data, nClasses) {
    if (!data.length) return [];
    data = data.slice().sort(function (a, b) { return a - b; });
    var matrices = jenksMatrices(data, nClasses);
    var lowerClassLimits = matrices.lowerClassLimits;
    var k = data.length - 1, kclass = [], countNum = nClasses;
    kclass[nClasses] = data[data.length - 1];
    kclass[0] = data[0];
    while (countNum > 1) {
      var idx = lowerClassLimits[k][countNum] - 2;
      kclass[countNum - 1] = data[Math.max(0, idx)];
      k = Math.max(0, lowerClassLimits[k][countNum] - 1);
      countNum--;
    }
    return kclass;
  }

  function jenksWrapper(data, nClasses) {
    if (data.length < nClasses) return data.slice();
    var cpy = data.slice();
    cpy.unshift(data[0]);
    cpy.push(data[data.length - 1]);
    return jenks(cpy, nClasses + 1).reverse().slice(1, nClasses + 1);
  }

  function uniqKey(c) {
    return c.id + '|' + c.form + '|' + (c.shadow ? 1 : 0) + '|' + c.level;
  }

  function getComparisonMon(list, type) {
    if (!list || !list.length) return 1;
    var bestMon = list[0].rat;
    if (st.compare === 'top') return bestMon;
    if (st.compare === 'budget') {
      var found = list.find(function (e) {
        return !e.class && !e.shadow && !e.isMega &&
          (e.fm_type === type || e.cm_type === type || type === 'Any' || type === 'Each' || !type);
      });
      return found ? found.rat : list[list.length - 1].rat;
    }
    if (st.compare === 'ESpace') {
      var mythicBlock = { Mew: 1, Celebi: 1, Jirachi: 1, Victini: 1, Keldeo: 1, Meloetta: 1, Shaymin: 1, Diancie: 1, Zarude: 1, Marshadow: 1 };
      var foundE = list.find(function (e) {
        return !(e.class && e.shadow) && !e.isMega &&
          !(e.name === 'Rayquaza' && e.cm === 'Dragon Ascent') &&
          !(e.id === 800 && e.form !== 'Normal') &&
          !(e.id === 646 && e.form !== 'Normal') &&
          !(e.id === 888 && e.form === 'Crowned_sword') &&
          !(e.id === 889 && e.form === 'Crowned_shield') &&
          !mythicBlock[e.nameEn] &&
          ((e.fm_type === type && e.cm_type === type) ||
           (type === 'Normal' && (e.fm_type === 'Normal' || (e.cm_type === 'Normal' && e.cm !== 'Return'))) ||
           type === 'Any' || type === 'Each' || !type);
      });
      return foundE ? foundE.rat : list[list.length - 1].rat;
    }
    return bestMon;
  }

  function buildTiers(list, topCompare, type) {
    if (!list.length) return;
    var bestMon = list[0].rat;
    var isMRay = function (e) { return e.id === 384 && e.isMega; };

    if (st.tierMethod === 'broad' || st.tierMethod === 'ESpace') {
      var sBreak = st.tierMethod === 'ESpace' ? 105.0 : 100.0;
      var sSize = st.tierMethod === 'ESpace' ? 10.0 : 20.0;
      var letSize = 10.0;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (p.pct >= sBreak + 0.00001) {
          var numS = Math.floor((p.pct - sBreak + 0.00001) / sSize) + 1;
          if (numS > 3 && isMRay(p)) p.tier = 'MRay';
          else if (numS >= 3) p.tier = 'SSS';
          else p.tier = 'S'.repeat(numS);
        } else {
          var tCnt = Math.floor((sBreak + 0.00001 - p.pct) / letSize);
          if (tCnt >= 4) tCnt = 5;
          p.tier = String.fromCharCode(65 + Math.max(0, tCnt));
        }
      }
    } else if (st.tierMethod === 'absolute') {
      for (var j = 0; j < list.length; j++) {
        var p2 = list[j];
        var cr = p2.rat;
        if (type !== 'Any') cr /= 1.6;
        if (st.metric === 'DPS') {
          p2.tier = cr >= 21 ? 'SSS' : cr >= 19 ? 'SS' : cr >= 18 ? 'S' : cr >= 17.5 ? 'A' : cr >= 16.5 ? 'B' : cr >= 15.5 ? 'C' : cr >= 15 ? 'D' : 'F';
        } else if (st.metric === 'TDO') {
          p2.tier = cr >= 500 ? 'SSS' : cr >= 450 ? 'SS' : cr >= 400 ? 'S' : cr >= 375 ? 'A' : cr >= 360 ? 'B' : cr >= 340 ? 'C' : cr >= 315 ? 'D' : 'F';
        } else {
          p2.tier = cr >= 19 ? 'SSS' : cr >= 17 ? 'SS' : cr >= 16.5 ? 'S' : cr >= 15.5 ? 'A' : cr >= 14.75 ? 'B' : cr >= 14 ? 'C' : cr >= 13.5 ? 'D' : 'F';
        }
        if (p2.rat === bestMon && isMRay(p2)) p2.tier = 'MRay';
      }
    } else {
      // Jenks Natural Breaks (DialgaDex Standard)
      var n = -1;
      for (var k = 0; k < list.length; k++) {
        if (list[k].rat <= topCompare * 0.5) { n = k - 1; break; }
      }
      if (n < 0) n = list.length;
      if (n > 250) n = 250;
      if (n < 6) n = Math.min(list.length, 6);

      var tierBreaks = jenksWrapper(list.slice(0, n).map(function (e) { return e.rat; }), 5);
      var compareTier = -1;
      for (var b = 0; b < tierBreaks.length; b++) {
        if (tierBreaks[b] < topCompare) { compareTier = b; break; }
      }
      var extraTiers = Math.max(compareTier, Math.floor((bestMon - topCompare) / topCompare / 0.1));
      if (isMRay(list[0])) extraTiers++;
      if (extraTiers >= 2) {
        if (compareTier !== -1) {
          var tbTarget = tierBreaks[Math.min(compareTier + 2, 4)];
          n = list.findIndex(function (e) { return e.rat <= tbTarget; });
        }
        if (n >= 0 && list[n] && list[n].rat > topCompare * 0.75) {
          n = list.findIndex(function (e) { return e.rat <= topCompare * 0.75; });
        }
        if (n < 0) n = list.length;
        if (n > 250) n = 250;
        tierBreaks = jenksWrapper(list.slice(0, n).map(function (e) { return e.rat; }), 5 + extraTiers);
        compareTier = tierBreaks.findIndex(function (e) { return e < topCompare; });
      }

      var thisTierIdx = 0;
      var thisTier = compareTier >= 2 ? 1 - compareTier : 0;
      for (var idx = 0; idx < list.length; idx++) {
        var item = list[idx];
        if (thisTierIdx < tierBreaks.length && item.rat <= tierBreaks[thisTierIdx]) {
          thisTierIdx++;
          thisTier++;
        }
        if (thisTier <= 0) {
          if (thisTierIdx === 0 && isMRay(list[0]) && isMRay(item)) {
            item.tier = 'MRay';
          } else {
            var numS2 = 1 - thisTier;
            var tbCur = tierBreaks[Math.min(thisTierIdx, tierBreaks.length - 1)] || topCompare;
            if (tbCur > 0 && item.rat > 1.15 * tbCur) {
              numS2 += Math.floor((item.rat - tbCur) / tbCur / 0.15);
            }
            if (numS2 > 5) numS2 = 5;
            item.tier = 'S'.repeat(Math.max(1, numS2));
          }
        } else {
          var offset = thisTier + (thisTier >= 5 ? 5 - thisTier : -1);
          item.tier = String.fromCharCode(65 + Math.max(0, offset));
        }
      }
    }
  }

  function processAndGroup(list, compareType) {
    if (!list.length) return list;
    var topCompare = getComparisonMon(list, compareType);
    var bestMon = list[0].rat;

    if (st.suboptimal && st.grouped) {
      var optMap = {};
      var order = 0;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var uk = uniqKey(p);
        if (!optMap[uk]) {
          optMap[uk] = { order: order, rat: p.rat, tier: null };
          p.isPrimary = true;
          p.rank = order + 1;
          p.pct = 100 * p.rat / topCompare;
          p.pctBar = 100 * p.rat / bestMon;
          order++;
        } else {
          p.isPrimary = false;
          p.rank = optMap[uk].order + 1;
          p.pct = 100 * p.rat / optMap[uk].rat;
          p.pctBar = 100 * p.rat / bestMon;
        }
        p.groupOrder = optMap[uk].order;
      }
      var primaries = list.filter(function (x) { return x.isPrimary; });
      buildTiers(primaries, topCompare, compareType);
      primaries.forEach(function (x) { optMap[uniqKey(x)].tier = x.tier; });
      list.forEach(function (x) { x.tier = optMap[uniqKey(x)].tier; });
      list.sort(function (a, b) { return a.groupOrder - b.groupOrder || b.rat - a.rat; });
    } else {
      var seen = {};
      for (var j = 0; j < list.length; j++) {
        var item = list[j];
        var uk2 = uniqKey(item);
        item.isSuboptimal = !!seen[uk2];
        seen[uk2] = true;
        item.rank = j + 1;
        item.pct = 100 * item.rat / topCompare;
        item.pctBar = 100 * item.rat / bestMon;
      }
      buildTiers(list, topCompare, compareType);
    }
    return list;
  }

  // ======================= Haupt-Berechnung für aktuellen Modus =======================
  function computeRankings() {
    var searchParams = {
      type: st.mode === 'boss' ? 'Any' : st.type,
      versus: st.mode === 'boss' ? true : (st.type !== 'Any' && st.type !== 'Each' && st.versus),
      mega: st.mega,
      shadow: st.shadow,
      legendary: st.legendary,
      elite: st.elite,
      mixed: st.mixed,
      offtype: st.offtype,
      unreleased: st.unreleased,
      suboptimal: st.mode !== 'type' || st.type !== 'Each' ? st.suboptimal : false,
      real_damage: st.mode === 'boss'
    };

    if (st.mode === 'boss') {
      var bossSp = speciesByNum[st.bossNum] || speciesByNum[150];
      var bossEntry = bossSp.forms.find(function (f) { return f.label === st.bossForm; }) || bossSp.forms[0];
      var rStats = getRaidStats(bossEntry, st.bossTier || 0);
      var bMoves = getPokemonMoves(bossEntry, 'Raid Boss');
      var enemyParams = {
        moves: bMoves,
        bossFm: st.bossFm,
        bossCm: st.bossCm,
        types: bossEntry.types,
        weakness: getTypesEffectivenessAgainstTypes(bossEntry.types),
        stats: rStats,
        win_dps: rStats.hp / (rStats.tier >= 4 ? 300 : 180)
      };
      var list = searchAll(searchParams, enemyParams);
      processAndGroup(list, null);
      return { list: list, boss: bossEntry, bossStats: rStats, bossMoves: bMoves, enemyParams: enemyParams };
    }

    if (st.type === 'Each') {
      var eachList = [];
      for (var i = 0; i < POKEMON_TYPES.length; i++) {
        var t = POKEMON_TYPES[i];
        var spT = Object.assign({}, searchParams, { type: t, versus: false, suboptimal: false });
        var epT = st.typeAffinity
          ? getTypeAffinity(t, true)
          : {
              weakness: getTypesEffectivenessSingleBoost(t),
              enemy_ys: [{ Any: { y_num: null, cm_num: null } }],
              stats: { atk: null, def: 180, hp: 1000000000 }
            };
        var topT = searchAll(spT, epT)[0];
        if (topT) {
          topT.tier = t;
          topT.forType = t;
          topT.rank = i + 1;
          topT.pct = 100;
          topT.pctBar = 100;
          eachList.push(topT);
        }
      }
      return { list: eachList, isEach: true };
    }

    var enemyParamsType;
    if (st.typeAffinity) {
      enemyParamsType = getTypeAffinity(st.type, !searchParams.versus);
    } else {
      enemyParamsType = {
        weakness: searchParams.versus
          ? getTypesEffectivenessAgainstTypes([st.type])
          : (st.type === 'Any' ? getTypesEffectivenessAgainstTypes([]) : getTypesEffectivenessSingleBoost(st.type)),
        enemy_ys: [{ Any: { y_num: null, cm_num: null } }],
        stats: { atk: null, def: 180, hp: 1000000000 }
      };
    }
    var listType = searchAll(searchParams, enemyParamsType);
    processAndGroup(listType, searchParams.versus ? null : st.type);
    return { list: listType, enemyParams: enemyParamsType };
  }

  // ======================= Pokémon-GO-Suchstring-Generator =======================
  function buildSearchString(rows) {
    if (!rows || !rows.length) return '';
    var shadowTok = de ? 'crypto' : 'shadow';
    var megaTok = 'mega1-';
    var ids = [];
    var nonShadowIds = [];
    var nonMegaIds = [];
    var pureIds = [];
    var hasShadow = false, hasMega = false;

    rows.forEach(function (r) {
      if (ids.indexOf(r.id) === -1) ids.push(r.id);
      if (r.shadow) hasShadow = true;
      else if (nonShadowIds.indexOf(r.id) === -1) nonShadowIds.push(r.id);
      if (r.isMega) hasMega = true;
      else if (nonMegaIds.indexOf(r.id) === -1) nonMegaIds.push(r.id);
      if (!r.shadow && !r.isMega && pureIds.indexOf(r.id) === -1) pureIds.push(r.id);
    });

    var str = ids.join(',');
    if (hasShadow) {
      str += '&' + (nonShadowIds.length ? nonShadowIds.join(',') + ',' : '') + shadowTok;
    } else {
      str += '&!' + shadowTok;
    }
    if (hasMega) {
      str += '&' + (nonMegaIds.length ? nonMegaIds.join(',') + ',' : '') + megaTok;
    }
    if (hasShadow && hasMega && pureIds.length) {
      str += '&' + pureIds.join(',') + ',' + shadowTok + ',' + megaTok;
    }
    return str;
  }

  // ======================= Darstellung & Hilfsfunktionen =======================
  function fmtDec(v, d) {
    if (v == null || isNaN(v)) return '–';
    return v.toFixed(d).replace('.', de ? ',' : '.');
  }
  function fmtNum(n) { return n >= 1000 ? String(n) : ('00' + n).slice(-3); }
  function monBaseName(c) { return de ? c.nameDe : c.nameEn; }
  function monFormText(c) {
    if (!c.label || c.label === 'Normal') return '';
    return window.CCGoDex && window.CCGoDex.formLabel ? window.CCGoDex.formLabel(c.label, c.num) : c.label;
  }
  function monName(c) {
    var base = monBaseName(c);
    var fl = monFormText(c);
    return base + (fl ? ' (' + fl + ')' : '');
  }
  function monSpriteImg(c, cls) {
    if (window.CCGoDex && window.CCGoDex.spriteImg) {
      var img = window.CCGoDex.spriteImg(
        { num: c.num, sid: c.sid, nameDe: c.nameDe, nameEn: c.nameEn },
        { label: c.label || '' },
        cls || 'gc-mon-img'
      );
      img.loading = 'lazy';
      return img;
    }
    var fb = A.spriteById(c.sid, cls || 'gc-mon-img', false, monBaseName(c));
    fb.loading = 'lazy';
    return fb;
  }
  function moveName(name) {
    if (!name) return '';
    if (name.indexOf('Hidden Power ') === 0) {
      var t = name.slice('Hidden Power '.length);
      return A.nMove('Hidden Power') + ' (' + A.nType(t) + ')';
    }
    var wb = /^(Weather Ball|Techno Blast) (\w+)$/.exec(name);
    if (wb) return A.nMove(wb[1]) + ' (' + A.nType({ Shock: 'Electric', Burn: 'Fire', Chill: 'Ice' }[wb[2]] || wb[2]) + ')';
    if (name === 'Aeroblast Plus') return A.nMove('Aeroblast') + '+';
    if (name === 'Aeroblast Plus Plus') return A.nMove('Aeroblast') + '++';
    if (name === 'Sacred Fire Plus') return A.nMove('Sacred Fire') + '+';
    if (name === 'Sacred Fire Plus Plus') return A.nMove('Sacred Fire') + '++';
    if (name.slice(-1) === '+') return A.nMove(name.slice(0, -1)) + '+';
    return A.nMove(name);
  }

  var TIER_COLORS = {
    MRay: '#10b981',
    SSSSS: '#a855f7',
    SSSS: '#a855f7',
    SSS: '#c084fc',
    SS: '#f43f5e',
    S: '#fb7185',
    A: '#f97316',
    B: '#eab308',
    C: '#22c55e',
    D: '#38bdf8',
    E: '#64748b',
    F: '#475569'
  };

  function tierColor(tier) {
    if (!tier) return '#64748b';
    return TIER_COLORS[tier] || (tier[0] === 'S' ? '#c084fc' : '#64748b');
  }

  var root = null;
  var lastResult = null;

  function render() {
    root = document.getElementById('gocounterView');
    if (!root) return;

    var curMode = (A.setting && A.setting('model')) || '3d';
    root.innerHTML = '';

    var wrap = el('div', { class: 'gc-layout' });

    // ---- Linkes Konfigurations-Panel (Modus, Typ / Raid-Boss, Einstellungen & Filter) ----
    var side = el('aside', { class: 'panel gc-sidebar' });

    var modeHead = el('div', { class: 'gc-mode-tabs' });
    [
      ['type', de ? 'Typ-Rangliste' : 'Type Rankings'],
      ['boss', de ? 'Gegen Raid-Boss' : 'Raid Boss Counters']
    ].forEach(function (m) {
      var b = el('button', { type: 'button', class: 'gc-mode-tab' + (st.mode === m[0] ? ' on' : ''), text: m[1] });
      b.addEventListener('click', function () {
        st.mode = m[0];
        saveState();
        render();
      });
      modeHead.appendChild(b);
    });
    side.appendChild(modeHead);

    var sideBody = el('div', { class: 'gc-side-body' });

    if (st.mode === 'type') {
      // Typ-Auswahl (Any, Each, 18 Typen)
      var secType = el('div', { class: 'gc-sec' });
      secType.appendChild(el('div', { class: 'gc-sec-title', text: de ? 'Typ / Szenario' : 'Type / Scenario' }));
      var specialRow = el('div', { class: 'gc-seg gc-special-seg' });
      [
        ['Any', de ? 'Alle Typen (Allgemein)' : 'All Types (Overall)'],
        ['Each', de ? 'Bester je Typ (18)' : 'Best per Type (18)']
      ].forEach(function (sp) {
        var btn = el('button', { type: 'button', class: st.type === sp[0] ? 'on' : '', text: sp[1] });
        btn.addEventListener('click', function () {
          st.type = sp[0];
          saveState();
          render();
        });
        specialRow.appendChild(btn);
      });
      secType.appendChild(specialRow);

      var hasSpecificType = st.type !== 'Any' && st.type !== 'Each';
      var typeGrid = el('div', { class: 'gc-type-grid' + (hasSpecificType ? ' has-sel' : '') });
      POKEMON_TYPES.forEach(function (t) {
        var isOn = st.type === t;
        var tb = el('button', {
          type: 'button',
          class: 'gc-type-pill' + (isOn ? ' on' : ''),
          'data-type': t,
          text: A.nType(t)
        });
        var bg = (A.TYPE_COLORS && A.TYPE_COLORS[t]) || '#666';
        var dark = A.DARK_TEXT_TYPES && A.DARK_TEXT_TYPES[t];
        tb.style.setProperty('--tc', bg);
        tb.style.background = bg;
        tb.style.color = dark ? '#16181a' : '#fff';
        tb.addEventListener('click', function () {
          st.type = (st.type === t) ? 'Any' : t;
          saveState();
          render();
        });
        typeGrid.appendChild(tb);
      });
      secType.appendChild(typeGrid);

      if (hasSpecificType) {
        var vsRow = el('div', { class: 'gc-seg gc-vs-seg' });
        [
          [false, de ? '⚔ ' + A.nType(st.type) + '-Angreifer' : '⚔ ' + A.nType(st.type) + ' Attackers'],
          [true, de ? '🛡 Konter vs ' + A.nType(st.type) : '🛡 Counters vs ' + A.nType(st.type)]
        ].forEach(function (o) {
          var b = el('button', { type: 'button', class: st.versus === o[0] ? 'on' : '', text: o[1] });
          b.addEventListener('click', function () {
            st.versus = o[0];
            saveState();
            updateView();
            vsRow.querySelectorAll('button').forEach(function (x, idx) { x.classList.toggle('on', idx === (o[0] ? 1 : 0)); });
          });
          vsRow.appendChild(b);
        });
        secType.appendChild(vsRow);
      }
      sideBody.appendChild(secType);
    } else {
      // Raid-Boss-Auswahl
      var secBoss = el('div', { class: 'gc-sec' });
      secBoss.appendChild(el('div', { class: 'gc-sec-title', text: de ? 'Raid-Boss wählen' : 'Select Raid Boss' }));

      var bossSearch = el('input', {
        type: 'text',
        class: 'dex-search gc-boss-search',
        placeholder: de ? 'Boss suchen (z. B. Mewtu, Rayquaza, #384)…' : 'Search boss (e.g. Mewtwo, Rayquaza, #384)…',
        autocomplete: 'off'
      });
      var bossListWrap = el('div', { class: 'gc-boss-Quicklist' });

      function renderBossPicker(q) {
        bossListWrap.innerHTML = '';
        var clean = (q || '').trim().toLowerCase().replace(/^#/, '');
        var matches = [];
        for (var i = 0; i < allMons.length; i++) {
          var p = allMons[i];
          if (!clean) {
            if (p.raid_tier >= 5 || (p.isMega && p.raid_tier >= 4)) matches.push(p);
          } else {
            var nDe = p.nameDe.toLowerCase(), nEn = p.nameEn.toLowerCase();
            var fl = (p.label && window.CCGoDex ? window.CCGoDex.formLabel(p.label, p.num) : p.label || '').toLowerCase();
            if (String(p.num).indexOf(clean) === 0 || fmtNum(p.num).indexOf(clean) === 0 ||
                nDe.indexOf(clean) !== -1 || nEn.indexOf(clean) !== -1 || fl.indexOf(clean) !== -1) {
              matches.push(p);
            }
          }
          if (matches.length >= 45) break;
        }
        matches.forEach(function (p) {
          var isSel = p.num === st.bossNum && p.label === st.bossForm;
          var item = el('button', { type: 'button', class: 'gc-boss-item' + (isSel ? ' on' : '') });
          var spBox = el('span', { class: 'gc-boss-item-sp' });
          spBox.appendChild(monSpriteImg(p, 'gc-boss-item-img'));
          item.appendChild(spBox);
          item.appendChild(el('span', { class: 'gc-boss-item-num', text: '#' + fmtNum(p.num) }));
          item.appendChild(el('span', { class: 'gc-boss-item-name', text: monName(p) }));
          item.addEventListener('click', function () {
            st.bossNum = p.num;
            st.bossForm = p.label;
            st.bossFm = '';
            st.bossCm = '';
            saveState();
            render();
          });
          bossListWrap.appendChild(item);
        });
      }
      bossSearch.addEventListener('input', function () { renderBossPicker(bossSearch.value); });
      renderBossPicker('');
      secBoss.appendChild(bossSearch);
      secBoss.appendChild(bossListWrap);

      // Boss-Tier & Boss-Moveset
      var bossSp = speciesByNum[st.bossNum] || speciesByNum[150];
      var bossEntry = bossSp.forms.find(function (f) { return f.label === st.bossForm; }) || bossSp.forms[0];
      var bMoves = getPokemonMoves(bossEntry, 'Raid Boss');

      var tierRow = el('div', { class: 'gc-opt-row' });
      tierRow.appendChild(el('label', { text: de ? 'Raid-Stufe' : 'Raid Tier' }));
      var tierSel = el('select', { class: 'dex-type-sel' });
      var autoT = defaultRaidTier(bossEntry);
      [
        [0, 'Auto (Tier ' + autoT + ')'],
        [1, de ? 'Tier 1 (600 KP)' : 'Tier 1 (600 HP)'],
        [3, de ? 'Tier 3 (3.600 KP)' : 'Tier 3 (3,600 HP)'],
        [4, de ? 'Tier 4 / Mega (9.000 KP)' : 'Tier 4 / Mega (9,000 HP)'],
        [5, de ? 'Tier 5 Legendär (15.000 KP)' : 'Tier 5 Legendary (15,000 HP)'],
        [6, de ? 'Tier 6 Mega-Leg. (22.500 KP)' : 'Tier 6 Mega Leg. (22,500 HP)'],
        [8, de ? 'Super-Mega / Proto (25.000 KP)' : 'Super Mega / Primal (25,000 HP)']
      ].forEach(function (o) {
        var opt = el('option', { value: String(o[0]), text: o[1] });
        if (Number(st.bossTier) === o[0]) opt.selected = true;
        tierSel.appendChild(opt);
      });
      tierSel.addEventListener('change', function () {
        st.bossTier = Number(tierSel.value);
        saveState();
        updateView();
      });
      tierRow.appendChild(tierSel);
      secBoss.appendChild(tierRow);

      if (bMoves.length === 6) {
        var fmRow = el('div', { class: 'gc-opt-row' });
        fmRow.appendChild(el('label', { text: de ? 'Sofort-Attacke' : 'Fast Move' }));
        var fmSel = el('select', { class: 'dex-type-sel' });
        fmSel.appendChild(el('option', { value: '', text: de ? 'Ø Alle Sofort-Attacken' : 'Ø All Fast Moves' }));
        bMoves[0].concat(bMoves[2]).forEach(function (m) {
          var opt = el('option', { value: m, text: moveName(m) });
          if (st.bossFm === m) opt.selected = true;
          fmSel.appendChild(opt);
        });
        fmSel.addEventListener('change', function () {
          st.bossFm = fmSel.value;
          saveState();
          updateView();
        });
        fmRow.appendChild(fmSel);
        secBoss.appendChild(fmRow);

        var cmRow = el('div', { class: 'gc-opt-row' });
        cmRow.appendChild(el('label', { text: de ? 'Lade-Attacke' : 'Charged Move' }));
        var cmSel = el('select', { class: 'dex-type-sel' });
        cmSel.appendChild(el('option', { value: '', text: de ? 'Ø Alle Lade-Attacken' : 'Ø All Charged Moves' }));
        bMoves[1].concat(bMoves[3]).forEach(function (m) {
          var opt = el('option', { value: m, text: moveName(m) });
          if (st.bossCm === m) opt.selected = true;
          cmSel.appendChild(opt);
        });
        cmSel.addEventListener('change', function () {
          st.bossCm = cmSel.value;
          saveState();
          updateView();
        });
        cmRow.appendChild(cmSel);
        secBoss.appendChild(cmRow);
      }

      sideBody.appendChild(secBoss);
    }

    // ---- DialgaDex Berechnungs-Parameter ----
    var secCalc = el('div', { class: 'gc-sec' });
    secCalc.appendChild(el('div', { class: 'gc-sec-title', text: de ? 'Berechnung (DialgaDex)' : 'Calculation (DialgaDex)' }));

    function segGroup(label, key, options) {
      var r = el('div', { class: 'gc-opt-block' });
      r.appendChild(el('div', { class: 'gc-opt-lbl', text: label }));
      var grp = el('div', { class: 'gc-seg' });
      options.forEach(function (o) {
        var b = el('button', { type: 'button', class: String(st[key]) === String(o[0]) ? 'on' : '', text: o[1], title: o[2] || '' });
        b.addEventListener('click', function () {
          st[key] = o[0];
          saveState();
          render();
        });
        grp.appendChild(b);
      });
      r.appendChild(grp);
      secCalc.appendChild(r);
    }

    segGroup(de ? 'Metrik' : 'Metric', 'metric', [
      ['eDPS', 'eDPS', de ? 'Effektiver DPS inkl. Relobby-Pause (DialgaDex-Standard)' : 'Effective DPS incl. relobby penalty (DialgaDex default)'],
      ['DPS', 'DPS', de ? 'Reiner Schaden pro Sekunde' : 'Damage per second'],
      ['TDO', 'TDO', de ? 'Gesamtschaden bis zum K.O.' : 'Total damage output'],
      ['EER', 'EER', 'DPS^0.775 × TDO^0.225'],
      ['ER', 'ER', 'DPS^0.75 × TDO^0.25']
    ]);

    segGroup(de ? 'Pokémon-Level' : 'Pokémon Level', 'levelMode', [
      ['30', 'Lv 30', 'Level 30'],
      ['40', 'Lv 40', 'Level 40 (DialgaDex-Standard)'],
      ['50', 'Lv 50', 'Level 50 (Max)'],
      ['xl', 'XL-Budget', de ? 'Normale Pokémon Lv 50, Legendäre/Mysteriöse Lv 40' : 'Regular Pokémon Lv 50, Legendaries/Mythicals Lv 40']
    ]);

    segGroup(de ? 'Team-Power (Party Power)' : 'Party Power', 'partySize', [
      [1, 'Solo (1)', de ? 'Ohne Team-Power' : 'No Party Power'],
      [2, 'Duo (2)', de ? '2 Spieler im Team (18 Sofort-Attacken pro Aufladung)' : 'Party of 2 (18 fast moves per charge)'],
      [3, 'Trio (3)', de ? '3 Spieler im Team (9 Sofort-Attacken pro Aufladung)' : 'Party of 3 (9 fast moves per charge)'],
      [4, de ? '4+ Spieler' : '4+ Players', de ? '4 Spieler im Team (6 Sofort-Attacken pro Aufladung)' : 'Party of 4 (6 fast moves per charge)']
    ]);

    if (st.metric === 'eDPS') {
      segGroup(de ? 'Raid-Team & Relobby' : 'Raid Team & Relobby', 'teamMode', [
        ['6', de ? '6er Team' : 'Team of 6', de ? '6 Pokémon pro Team vor Relobby' : '6 Pokémon per team before relobby'],
        ['m1', '1 Mega / 6', de ? 'Mega wird nach 1 Tod wiederbelebt, normale nach 6' : 'Mega relobbies after 1 death, regular after 6'],
        ['1', 'Solo-Mon (1)', de ? 'Sofortiger Relobby nach 1 Tod' : 'Relobby after every single death']
      ]);
    }

    segGroup(de ? 'Mega-Level' : 'Mega Level', 'superMegaLevel', [
      [1, de ? 'Basis' : 'Base', de ? 'Mega-Level Basis: Mega-Attacken (+) ohne Bonus' : 'Base Mega Level: Mega (+) moves without bonus'],
      [2, de ? 'Hoch' : 'High', de ? 'Hohes Mega-Level: Mega-Attacken (+) +10 % Schaden' : 'High Mega Level: Mega (+) moves +10% damage'],
      [3, 'Max', de ? 'Max-Mega-Level: Mega-Attacken (+) +20 % Schaden' : 'Max Mega Level: Mega (+) moves +20% damage'],
      [4, 'Super Max', de ? 'Super-Max-Mega-Level: Mega-Attacken (+) +30 % Schaden' : 'Super Max Mega Level: Mega (+) moves +30% damage']
    ]);

    var benchGrid = el('div', { class: 'gc-bench-grid' });
    (function () {
      var b1 = el('div', { class: 'gc-opt-block' });
      b1.appendChild(el('div', { class: 'gc-opt-lbl', text: de ? 'Basis (100 %)' : 'Baseline (100%)' }));
      var g1 = el('div', { class: 'gc-seg' });
      [
        ['budget', 'Budget', de ? 'Bestes Nicht-Legendäres, Nicht-Crypto, Nicht-Mega = 100 %' : 'Best non-legendary, non-shadow, non-mega = 100%'],
        ['top', 'Top #1', de ? 'Platz 1 = 100 %' : 'Rank #1 = 100%'],
        ['ESpace', 'ESpace', 'Elastic_Space Benchmark']
      ].forEach(function (o) {
        var b = el('button', { type: 'button', class: st.compare === o[0] ? 'on' : '', text: o[1], title: o[2] });
        b.addEventListener('click', function () { st.compare = o[0]; saveState(); render(); });
        g1.appendChild(b);
      });
      b1.appendChild(g1);
      benchGrid.appendChild(b1);

      var b2 = el('div', { class: 'gc-opt-block' });
      b2.appendChild(el('div', { class: 'gc-opt-lbl', text: de ? 'Tier-Stufen' : 'Tier Method' }));
      var g2 = el('div', { class: 'gc-seg' });
      [
        ['jenks', 'Jenks', 'Jenks Natural Breaks'],
        ['broad', de ? 'Rel.' : 'Broad', de ? 'Feste Prozent-Stufen' : 'Fixed % steps'],
        ['ESpace', 'ES', 'Elastic_Space Tiers'],
        ['absolute', 'Abs.', de ? 'Feste Schwellenwerte' : 'Fixed thresholds']
      ].forEach(function (o) {
        var b = el('button', { type: 'button', class: st.tierMethod === o[0] ? 'on' : '', text: o[1], title: o[2] });
        b.addEventListener('click', function () { st.tierMethod = o[0]; saveState(); render(); });
        g2.appendChild(b);
      });
      b2.appendChild(g2);
      benchGrid.appendChild(b2);
    })();
    secCalc.appendChild(benchGrid);

    sideBody.appendChild(secCalc);

    // ---- Filter-Schalter ----
    var secFilt = el('div', { class: 'gc-sec' });
    secFilt.appendChild(el('div', { class: 'gc-sec-title', text: de ? 'Filter & Optionen' : 'Filters & Options' }));
    var fGrid = el('div', { class: 'gc-filter-grid' });
    [
      ['mega', de ? 'Mega / Proto' : 'Mega / Primal'],
      ['shadow', de ? 'Crypto (Shadow)' : 'Shadow'],
      ['legendary', de ? 'Legendär / Myst.' : 'Legendary / Myth.'],
      ['elite', de ? 'Elite-TM-Attacken' : 'Elite TM Moves'],
      ['mixed', de ? 'Gemischte Typen' : 'Mixed Movesets'],
      ['offtype', de ? 'Off-Type-Attacken' : 'Off-Type Moves'],
      ['unreleased', de ? 'Unveröffentlicht' : 'Unreleased'],
      ['suboptimal', de ? 'Alle Movesets' : 'All Movesets'],
      ['grouped', de ? 'Gruppieren' : 'Group by Pokémon'],
      ['typeAffinity', de ? 'Boss-Affinität' : 'Boss Affinity'],
      ['pveTurns', de ? '0,5s Raid-Takt' : '0.5s Raid Turns']
    ].forEach(function (flt) {
      var k = flt[0];
      var disabled = (k === 'grouped' && !st.suboptimal) || (k === 'offtype' && !st.mixed);
      var btn = el('button', {
        type: 'button',
        class: 'gc-flt-chip' + (st[k] ? ' on' : ''),
        'aria-pressed': st[k] ? 'true' : 'false'
      });
      if (disabled) btn.disabled = true;
      btn.appendChild(el('span', { class: 'gc-flt-check', text: st[k] ? '✓' : '' }));
      btn.appendChild(el('span', { class: 'gc-flt-txt', text: flt[1] }));
      btn.addEventListener('click', function () {
        if (disabled) return;
        st[k] = !st[k];
        saveState();
        render();
      });
      fGrid.appendChild(btn);
    });
    secFilt.appendChild(fGrid);
    sideBody.appendChild(secFilt);

    side.appendChild(sideBody);
    wrap.appendChild(side);

    // ---- Hauptbereich: Header, evtl. Boss-Karte, Suchleiste & Ranglisten-Tabelle ----
    var main = el('section', { class: 'gc-main', id: 'gcMain' });

    var head = el('div', { class: 'panel dex-head-panel gc-head-panel' });
    var headTop = el('div', { class: 'dex-head-top gc-head-top' });
    var titleBlock = el('div', { class: 'gc-title-stack' });
    var titleLine = el('div', { class: 'gc-title-line' });
    titleLine.appendChild(el('h1', { class: 'dex-mon-title', id: 'gcTitle', text: 'Top Counter' }));
    titleLine.appendChild(el('div', { class: 'gc-meta-pills', id: 'gcMetaPills' }));
    titleBlock.appendChild(titleLine);
    titleBlock.appendChild(el('span', { class: 'gc-subtitle', id: 'gcSubtitle', text: '' }));
    headTop.appendChild(titleBlock);

    var headActions = el('div', { class: 'gc-head-actions' });
    var searchInp = el('input', {
      type: 'text',
      id: 'gcTableSearch',
      class: 'dex-search gc-table-search',
      value: st.search || '',
      placeholder: de ? 'Tabelle filtern (Pokémon / Attacke / Tier)…' : 'Filter table (Pokémon / move / tier)…',
      autocomplete: 'off'
    });
    searchInp.addEventListener('input', function () {
      st.search = searchInp.value;
      renderTableOnly();
    });
    headActions.appendChild(searchInp);

    var btnSearchStr = el('button', {
      type: 'button',
      class: 'tbtn gc-action-btn',
      title: de ? 'Pokémon-GO-Suchstring für die angezeigten Top-25-Counter kopieren' : 'Copy Pokémon GO search string for displayed top 25 counters',
      text: de ? '🔍 GO-Suchstring' : '🔍 GO Search String'
    });
    btnSearchStr.addEventListener('click', function () {
      if (!lastResult || !lastResult.filteredRows || !lastResult.filteredRows.length) return;
      var s = buildSearchString(lastResult.filteredRows.slice(0, 25));
      A.copy(s);
      A.toast(de ? 'GO-Suchstring (Top 25) kopiert!' : 'GO search string (Top 25) copied!');
    });
    headActions.appendChild(btnSearchStr);

    var artGrp = el('div', { class: 'gc-seg gc-art-seg' });
    [['3d', '3D'], ['home', 'HOME'], ['sprite', 'Pixel']].forEach(function (o) {
      var ab = el('button', { type: 'button', class: curMode === o[0] ? 'on' : '', 'data-art': o[0], text: o[1] });
      ab.addEventListener('click', function () {
        if (A.setSetting) A.setSetting('model', o[0]);
        render();
      });
      artGrp.appendChild(ab);
    });
    headActions.appendChild(artGrp);

    headTop.appendChild(headActions);
    head.appendChild(headTop);
    main.appendChild(head);

    main.appendChild(el('div', { id: 'gcBossBanner' }));
    main.appendChild(el('div', { class: 'panel gc-table-panel', id: 'gcTablePanel' }));

    wrap.appendChild(main);
    root.appendChild(wrap);

    updateView();
  }

  function updateView() {
    var res = computeRankings();
    lastResult = res;

    var titleEl = document.getElementById('gcTitle');
    var subEl = document.getElementById('gcSubtitle');
    var metaEl = document.getElementById('gcMetaPills');
    var bannerEl = document.getElementById('gcBossBanner');

    if (metaEl) {
      metaEl.innerHTML = '';
      var lvText = st.levelMode === 'xl' ? 'XL-Budget' : ('Lv ' + st.levelMode);
      var ppText = st.partySize === 1 ? 'Solo' : st.partySize === 2 ? 'Party ×2' : st.partySize === 3 ? 'Party ×3' : 'Party ×4';
      metaEl.appendChild(el('span', { class: 'gc-meta-chip accent', text: st.metric }));
      metaEl.appendChild(el('span', { class: 'gc-meta-chip', text: lvText }));
      metaEl.appendChild(el('span', { class: 'gc-meta-chip', text: ppText }));
    }

    if (titleEl && subEl) {
      if (st.mode === 'boss' && res.boss) {
        titleEl.textContent = (de ? 'Top Konter gegen ' : 'Top Counters vs ') + monName(res.boss);
        subEl.textContent = 'Tier ' + res.bossStats.tier + ' · ' + res.bossStats.hp.toLocaleString(de ? 'de-DE' : 'en-US') + (de ? ' KP · ' : ' HP · ') +
          (st.bossFm ? moveName(st.bossFm) : (de ? 'Ø Sofort' : 'Ø Fast')) + ' / ' +
          (st.bossCm ? moveName(st.bossCm) : (de ? 'Ø Lade' : 'Ø Charged'));
      } else if (st.type === 'Any') {
        titleEl.textContent = de ? 'Top Angreifer (Alle Typen)' : 'Top Attackers (Overall)';
        subEl.textContent = st.typeAffinity
          ? (de ? 'Berechnet gegen den Durchschnitt aller Raid-Bosse (Tier 4+)' : 'Calculated against average of all Tier 4+ raid bosses')
          : (de ? 'Neutrale Effektivität (Def 180)' : 'Neutral effectiveness (Def 180)');
      } else if (st.type === 'Each') {
        titleEl.textContent = de ? 'Bester Angreifer pro Typ (alle 18 Typen)' : 'Top Attacker of Each Type (all 18 types)';
        subEl.textContent = de ? 'Jeweils #1 Angreifer für jeden einzelnen Pokémon-Typ' : '#1 attacker for each individual Pokémon type';
      } else if (st.versus) {
        titleEl.textContent = (de ? 'Top Konter gegen Typ ' : 'Top Counters vs ') + A.nType(st.type);
        subEl.textContent = st.typeAffinity
          ? (de ? 'Berechnet gegen den Durchschnitt aller ' + A.nType(st.type) + '-Raid-Bosse' : 'Calculated against average of all ' + A.nType(st.type) + ' raid bosses')
          : (de ? 'Sehr effektiver Schaden gegen Monotyp ' + A.nType(st.type) : 'Super-effective damage vs solo-' + A.nType(st.type));
      } else {
        titleEl.textContent = 'Top ' + A.nType(st.type) + (de ? '-Angreifer' : ' Attackers');
        subEl.textContent = st.typeAffinity
          ? (de ? 'Berechnet gegen Raid-Bosse mit Schwäche gegen ' + A.nType(st.type) : 'Calculated against raid bosses weak to ' + A.nType(st.type))
          : (de ? '1,6× Schaden für ' + A.nType(st.type) + '-Attacken, 1,0× für andere' : '1.6× damage for ' + A.nType(st.type) + ' moves, 1.0× for others');
      }
    }

    if (bannerEl) {
      bannerEl.innerHTML = '';
      if (st.mode === 'boss' && res.boss) {
        var bCard = el('div', { class: 'panel gc-boss-card' });
        var bStage = el('div', { class: 'gc-boss-stage' });
        bStage.appendChild(monSpriteImg(res.boss, 'gd-img gc-boss-img'));
        bCard.appendChild(bStage);

        var bInfo = el('div', { class: 'gc-boss-info' });
        var bTop = el('div', { class: 'gc-boss-top' });
        bTop.appendChild(el('span', { class: 'dex-num-pill', text: '#' + fmtNum(res.boss.num) }));
        bTop.appendChild(el('strong', { class: 'gc-boss-name', text: monName(res.boss) }));
        res.boss.types.forEach(function (t) { bTop.appendChild(A.typeBadge(t)); });
        var btnToDex = el('button', { type: 'button', class: 'tbtn gc-open-dex-btn', text: de ? 'Im GO-Pokédex öffnen →' : 'Open in GO Pokédex →' });
        btnToDex.addEventListener('click', function () {
          if (window.CCGoDex && window.CCGoDex.openMon) window.CCGoDex.openMon(res.boss.num, res.boss.label);
        });
        bTop.appendChild(btnToDex);
        bInfo.appendChild(bTop);

        // Schwächen des Raid-Bosses
        var weakRow = el('div', { class: 'gc-boss-weak' });
        var w256 = [], w160 = [];
        POKEMON_TYPES.forEach(function (t) {
          var m = res.enemyParams.weakness[t];
          if (Math.abs(m - 2.56) < 0.01) w256.push(t);
          else if (Math.abs(m - 1.60) < 0.01) w160.push(t);
        });
        if (w256.length) {
          var s256 = el('span', { class: 'gc-weak-grp' });
          s256.appendChild(el('b', { text: '2,56× ' }));
          w256.forEach(function (t) { s256.appendChild(A.typeBadge(t)); });
          weakRow.appendChild(s256);
        }
        if (w160.length) {
          var s160 = el('span', { class: 'gc-weak-grp' });
          s160.appendChild(el('b', { text: '1,6× ' }));
          w160.forEach(function (t) { s160.appendChild(A.typeBadge(t)); });
          weakRow.appendChild(s160);
        }
        bInfo.appendChild(weakRow);

        var statPills = el('div', { class: 'gc-boss-stats' });
        var raidCp = Math.floor((res.boss.stats.baseAttack + 15) * Math.sqrt(res.boss.stats.baseDefense + 15) * Math.sqrt(res.bossStats.hp) / 10);
        statPills.appendChild(el('span', { class: 'gc-stat-chip', text: (de ? 'Raid-WP: ' : 'Raid CP: ') + raidCp.toLocaleString(de ? 'de-DE' : 'en-US') }));
        statPills.appendChild(el('span', { class: 'gc-stat-chip', text: (de ? 'Boss-Angr: ' : 'Boss Atk: ') + Math.round(res.bossStats.atk) }));
        statPills.appendChild(el('span', { class: 'gc-stat-chip', text: (de ? 'Boss-Vert: ' : 'Boss Def: ') + Math.round(res.bossStats.def) }));
        statPills.appendChild(el('span', { class: 'gc-stat-chip', text: (de ? 'Boss-KP: ' : 'Boss HP: ') + res.bossStats.hp.toLocaleString(de ? 'de-DE' : 'en-US') }));
        bInfo.appendChild(statPills);

        bCard.appendChild(bInfo);
        bannerEl.appendChild(bCard);
      }
    }

    renderTableOnly();
  }

  function renderTableOnly() {
    var box = document.getElementById('gcTablePanel');
    if (!box || !lastResult) return;
    box.innerHTML = '';

    var q = (st.search || '').trim().toLowerCase();
    var rows = lastResult.list.filter(function (r) {
      if (!q) return true;
      var n = (r.nameDe + ' ' + r.nameEn + ' ' + (r.label || '') + ' ' + monFormText(r)).toLowerCase();
      var fm = (moveName(r.fm) + ' ' + r.fm).toLowerCase();
      var cm = (moveName(r.cm) + ' ' + r.cm).toLowerCase();
      return n.indexOf(q) !== -1 || fm.indexOf(q) !== -1 || cm.indexOf(q) !== -1 || (r.tier && r.tier.toLowerCase() === q);
    });
    lastResult.filteredRows = rows;

    var maxShow = st.limit || 100;
    var visible = rows.slice(0, maxShow);

    if (!visible.length) {
      box.appendChild(el('div', { class: 'dex-empty', text: de ? 'Keine passenden Angreifer für diese Filter gefunden.' : 'No matching attackers found for these filters.' }));
      return;
    }

    var tblWrap = el('div', { class: 'gc-tbl-wrap' });
    var tbl = el('table', { class: 'gc-table' });
    var thead = el('thead');
    var trH = el('tr');
    var cols = [
      { label: lastResult.isEach ? (de ? 'Typ' : 'Type') : 'Tier', cls: 'gc-th-tier' },
      { label: '#', cls: 'num gc-th-rank' },
      { label: 'Pokémon', cls: 'gc-th-mon' },
      { label: de ? 'Sofort-Attacke' : 'Fast Move', cls: 'gc-th-move' },
      { label: de ? 'Lade-Attacke' : 'Charged Move', cls: 'gc-th-move' },
      { label: 'eDPS', cls: 'num gc-th-num' + (st.metric === 'eDPS' ? ' gc-col-active' : '') },
      { label: 'DPS', cls: 'num gc-th-num' + (st.metric === 'DPS' ? ' gc-col-active' : '') },
      { label: 'TDO', cls: 'num gc-th-num' + (st.metric === 'TDO' ? ' gc-col-active' : '') },
      { label: st.metric + ' %', cls: 'num gc-th-pct' }
    ];
    cols.forEach(function (c) {
      trH.appendChild(el('th', { class: c.cls, text: c.label }));
    });
    thead.appendChild(trH);
    tbl.appendChild(thead);

    var tbody = el('tbody');
    visible.forEach(function (r) {
      var tr = el('tr', { class: (r.isSuboptimal ? 'gc-row-sub ' : '') + (r.shadow ? 'gc-row-shadow ' : '') });

      // Spalte 1: Tier oder Typ
      var tdTier = el('td', { class: 'gc-td-tier' });
      if (lastResult.isEach && r.forType) {
        tdTier.appendChild(A.typeBadge(r.forType));
      } else {
        var tBadge = el('span', { class: 'gc-tier-pill', text: r.tier || '–' });
        tBadge.style.background = tierColor(r.tier);
        tdTier.appendChild(tBadge);
      }
      tr.appendChild(tdTier);

      // Spalte 2: Rang
      tr.appendChild(el('td', { class: 'gc-td-rank num' + (r.rank <= 3 ? ' is-top3' : ''), text: String(r.rank) }));

      // Spalte 3: Pokémon (Form-Sprite + Name + Form/Crypto/XL-Badges + Typen)
      var tdMon = el('td', { class: 'gc-td-mon' });
      var monCell = el('div', { class: 'gc-mon-cell' });
      var spBox = el('div', { class: 'gc-mon-sp' + (r.shadow ? ' is-shadow' : '') + (r.isMega ? ' is-mega' : '') });
      spBox.appendChild(monSpriteImg(r, 'gc-mon-img'));
      monCell.appendChild(spBox);

      var nameWrap = el('div', { class: 'gc-mon-names' });
      var nameLine = el('div', { class: 'gc-mon-line' });
      if (r.shadow) {
        nameLine.appendChild(el('span', { class: 'gc-shadow-badge', title: de ? 'Crypto-Pokémon (+20% Angriff, −16,7% Vert.)' : 'Shadow Pokémon (+20% Atk, −16.7% Def)', text: de ? 'Crypto' : 'Shadow' }));
      }
      nameLine.appendChild(el('span', { class: 'gc-mon-name', text: monBaseName(r) }));
      var flText = monFormText(r);
      if (flText) {
        nameLine.appendChild(el('span', { class: 'gc-form-badge' + (r.isMega ? ' is-mega' : ''), text: flText }));
      }
      if (r.level >= 50 && st.levelMode === 'xl') {
        nameLine.appendChild(el('span', { class: 'gc-lv-badge', text: 'XL' }));
      } else if (r.level > 40 && r.level % 10 === 2) {
        nameLine.appendChild(el('span', { class: 'gc-lv-badge', text: '+' + (r.level - (st.levelMode === '50' ? 50 : 40)) }));
      }
      nameWrap.appendChild(nameLine);

      var subLine = el('div', { class: 'gc-mon-sub' });
      subLine.appendChild(el('span', { class: 'gc-mon-num', text: '#' + fmtNum(r.num) }));
      (r.types || []).forEach(function (t) { subLine.appendChild(A.typeBadge(t)); });
      nameWrap.appendChild(subLine);

      monCell.appendChild(nameWrap);
      tdMon.appendChild(monCell);
      tdMon.addEventListener('click', function () {
        if (window.CCGoDex && window.CCGoDex.openMon) window.CCGoDex.openMon(r.num, r.label);
      });
      tr.appendChild(tdMon);

      // Spalte 4: Fast Move
      var tdFm = el('td', { class: 'gc-td-move' });
      var fmBox = el('div', { class: 'gc-mv-cell' });
      if (r.fm_type && r.fm_type !== 'None') fmBox.appendChild(A.typeBadge(r.fm_type));
      fmBox.appendChild(el('span', { class: 'gc-mv-txt' + (r.fm_is_elite ? ' is-elite' : ''), text: moveName(r.fm) }));
      if (r.fm_is_elite) {
        fmBox.appendChild(el('span', { class: 'gd-tag gd-elite', title: de ? 'Elite-TM / Spezial-Attacke' : 'Elite TM / special move', text: 'Elite' }));
      }
      tdFm.appendChild(fmBox);
      tr.appendChild(tdFm);

      // Spalte 5: Charged Move
      var tdCm = el('td', { class: 'gc-td-move' });
      var cmBox = el('div', { class: 'gc-mv-cell' });
      if (r.cm_type) cmBox.appendChild(A.typeBadge(r.cm_type));
      cmBox.appendChild(el('span', { class: 'gc-mv-txt' + (r.cm_is_elite ? ' is-elite' : ''), text: moveName(r.cm) }));
      if (r.cm_is_elite) {
        cmBox.appendChild(el('span', { class: 'gd-tag gd-elite', title: de ? 'Elite-TM / Spezial-Attacke' : 'Elite TM / special move', text: 'Elite' }));
      }
      tdCm.appendChild(cmBox);
      tr.appendChild(tdCm);

      // Spalte 6..8: eDPS, DPS, TDO
      tr.appendChild(el('td', { class: 'num gc-td-num' + (st.metric === 'eDPS' ? ' gc-col-active' : ''), text: fmtDec(r.edps, 2) }));
      tr.appendChild(el('td', { class: 'num gc-td-num' + (st.metric === 'DPS' ? ' gc-col-active' : ''), text: fmtDec(r.dps, 2) }));
      tr.appendChild(el('td', { class: 'num gc-td-num' + (st.metric === 'TDO' ? ' gc-col-active' : ''), text: fmtDec(r.tdo, 0) }));

      // Spalte 9: Prozentbalken
      var tdPct = el('td', { class: 'gc-td-pct' });
      var pctWrap = el('div', { class: 'gc-pct-wrap' });
      var bar = el('div', { class: 'gc-pct-bar' });
      var fill = el('span');
      fill.style.width = Math.max(4, Math.min(100, r.pctBar || 100)) + '%';
      fill.style.background = tierColor(r.tier);
      bar.appendChild(fill);
      pctWrap.appendChild(bar);
      pctWrap.appendChild(el('span', { class: 'gc-pct-val num', text: fmtDec(r.pct, 1) + ' %' }));
      tdPct.appendChild(pctWrap);
      tr.appendChild(tdPct);

      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    tblWrap.appendChild(tbl);
    box.appendChild(tblWrap);

    // Fußzeile (Mehr laden + Legende)
    var foot = el('div', { class: 'gc-table-foot' });
    foot.appendChild(el('span', {
      text: (de ? 'Zeige ' : 'Showing ') + visible.length + (de ? ' von ' : ' of ') + rows.length +
            (de ? ' Einträgen · Klick auf ein Pokémon öffnet den GO-Pokédex' : ' entries · Click any Pokémon to open GO Pokédex')
    }));
    if (rows.length > visible.length) {
      var moreBtn = el('button', { type: 'button', class: 'tbtn', text: de ? '+ 100 weitere anzeigen' : 'Show +100 more' });
      moreBtn.addEventListener('click', function () {
        st.limit = (st.limit || 100) + 100;
        renderTableOnly();
      });
      foot.appendChild(moreBtn);
    }
    box.appendChild(foot);
  }

  function openBoss(num, flabel) {
    st.mode = 'boss';
    st.bossNum = num;
    st.bossForm = flabel || '';
    st.bossFm = '';
    st.bossCm = '';
    saveState();
    A.showView('gocounter');
  }

  window.CCGoCounter = {
    render: render,
    openBoss: openBoss,
    computeRankings: computeRankings
  };
})();
