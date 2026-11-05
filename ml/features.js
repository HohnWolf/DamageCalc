// Feature Extraction & Shared Neural Evaluation for Pokémon VGC Doubles Champions Format
// Produces a normalized float vector of length 64 for each candidate joint action (A_slot0, A_slot1)
// Team-agnostic representation: encodes type matchups, immunities, speed tiers, field control, and synergies.

let Calc = null;
try {
  Calc = require('../js/calc.js');
} catch (e1) {
  try {
    Calc = require('./calc.js');
  } catch (e2) {
    if (typeof window !== 'undefined' && window.Calc) Calc = window.Calc;
    else if (typeof globalThis !== 'undefined' && globalThis.Calc) Calc = globalThis.Calc;
  }
}

const TYPE_CHART = {
  Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison:   { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground:   { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying:   { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug:      { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
  Rock:     { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark:     { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel:    { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy:    { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

const POWDER_MOVES = new Set([
  'spore', 'sleeppowder', 'stunspore', 'poisonpowder', 'ragepowder', 'cottonspore', 'powder'
]);

// Known species abilities that grant immunity or block priority in Champions VGC
const SPECIES_IMMUNITY_MAP = {
  'Gholdengo': { statusImmune: true },
  'Farigiraf': { priorityBlock: true },
  'Bruxish': { priorityBlock: true },
  'Tsareena': { priorityBlock: true },
  'Armarouge': { fireImmune: true },
  'Heatran': { fireImmune: true },
  'Raichu': { electricImmune: true },
  'Raichu-Mega-Y': { electricImmune: false },
  'Gastrodon': { waterImmune: true },
  'Politoed': { waterImmune: true },
  'Rotom-Wash': { groundImmune: true },
  'Rotom-Heat': { groundImmune: true },
  'Rotom-Mow': { groundImmune: true },
  'Hydreigon': { groundImmune: true },
  'Latios': { groundImmune: true },
  'Latias': { groundImmune: true },
  'Cresselia': { groundImmune: true },
  'Bronzong': { groundImmune: true },
  'Gengar': { groundImmune: false },
  'Kommo-o': { powderImmune: true }
};

function getTypeEff(moveType, targetTypes) {
  if (!moveType || !TYPE_CHART[moveType] || !targetTypes || !targetTypes.length) return 1.0;
  let eff = 1.0;
  for (const t of targetTypes) {
    if (TYPE_CHART[moveType][t] !== undefined) {
      eff *= TYPE_CHART[moveType][t];
    }
  }
  return eff;
}

function getEffectiveMoveType(moveData, attacker, field) {
  if (!moveData) return 'Normal';
  let mType = moveData.type || 'Normal';
  const id = moveData.id || '';
  const ability = (attacker && attacker.ability ? String(attacker.ability) : '').toLowerCase().replace(/[^a-z]/g, '');

  if (id === 'weatherball' && field) {
    if (field.weather === 'sun') return 'Fire';
    if (field.weather === 'rain') return 'Water';
    if (field.weather === 'sand') return 'Rock';
    if (field.weather === 'snow') return 'Ice';
  }
  if (mType === 'Normal') {
    if (ability === 'pixilate') return 'Fairy';
    if (ability === 'aerilate') return 'Flying';
    if (ability === 'refrigerate') return 'Ice';
    if (ability === 'galvanize') return 'Electric';
  }
  return mType;
}

function isGrounded(mon, field) {
  if (!mon) return true;
  if (field && field.gravity) return true;
  const types = mon.types || ['Normal'];
  if (types.includes('Flying')) return false;
  const abil = (mon.ability || '').toLowerCase().replace(/[^a-z]/g, '');
  if (abil === 'levitate') return false;
  const specHint = SPECIES_IMMUNITY_MAP[mon.name || ''];
  if (specHint && specHint.groundImmune) return false;
  return true;
}

function isMoveImmuneOrBlocked(moveData, attacker, targetFoe, foes, field) {
  if (!moveData || !targetFoe || !targetFoe.active) return false;
  const moveId = moveData.id || '';
  const moveType = getEffectiveMoveType(moveData, attacker, field);
  const targetTypes = targetFoe.types || ['Normal'];
  const targetName = targetFoe.name || '';
  const targetAbil = (targetFoe.ability || '').toLowerCase().replace(/[^a-z]/g, '');
  const specHint = SPECIES_IMMUNITY_MAP[targetName] || {};
  const attackerAbil = (attacker && attacker.ability ? String(attacker.ability) : '').toLowerCase().replace(/[^a-z]/g, '');

  // 1. Fake Out / First Impression only work on turn 1 of being active on the field
  if (moveId === 'fakeout' || moveId === 'firstimpression') {
    if (attacker && attacker.activeTurns && attacker.activeTurns > 1) return true;
  }

  // 2. Priority blocking against opponents (Psychic Terrain or Armor Tail / Dazzling / Queenly Majesty)
  let movePriority = moveData.priority || 0;
  if (moveId === 'grassyglide' && field && field.terrain === 'grassy' && isGrounded(attacker, field)) {
    movePriority = 1;
  }
  if (moveData.category === 'Status' && attackerAbil === 'prankster') {
    movePriority += 1;
  }

  if (movePriority > 0) {
    // Psychic Terrain blocks priority moves against grounded foes
    if (field && field.terrain === 'psychic' && isGrounded(targetFoe, field)) {
      return true;
    }
    // Armor Tail / Dazzling / Queenly Majesty on either active foe blocks all priority moves targeting foes
    if (foes) {
      for (const k of ['1', '2']) {
        const f = foes[k];
        if (!f || !f.active) continue;
        const fAbil = (f.ability || '').toLowerCase().replace(/[^a-z]/g, '');
        const fHint = SPECIES_IMMUNITY_MAP[f.name || ''] || {};
        if (fAbil === 'armortail' || fAbil === 'dazzling' || fAbil === 'queenlymajesty' || fHint.priorityBlock) {
          return true;
        }
      }
    }
  }

  // 3. Status move immunities
  if (moveData.category === 'Status') {
    // Good as Gold (Gholdengo)
    if (targetAbil === 'goodasgold' || specHint.statusImmune) return true;
    // Prankster vs Dark-type
    if (attackerAbil === 'prankster' && targetTypes.includes('Dark')) return true;
    // Powder moves vs Grass-type or Overcoat
    if (POWDER_MOVES.has(moveId)) {
      if (targetTypes.includes('Grass') || targetAbil === 'overcoat' || specHint.powderImmune) return true;
    }
    // Thunder Wave vs Electric or Ground
    if (moveId === 'thunderwave') {
      if (targetTypes.includes('Electric') || targetTypes.includes('Ground') || getTypeEff('Electric', targetTypes) === 0) return true;
    }
    // Will-O-Wisp vs Fire
    if (moveId === 'willowisp' && targetTypes.includes('Fire')) return true;
    return false;
  }

  // 4. Damaging move type chart immunity (0x)
  const eff = getTypeEff(moveType, targetTypes);
  if (eff === 0) return true;

  // 5. Ability-based type immunities
  if (moveType === 'Ground' && !isGrounded(targetFoe, field)) return true;
  if (moveType === 'Ground' && targetAbil === 'eartheater') return true;
  if (moveType === 'Fire' && (targetAbil === 'flashfire' || targetAbil === 'wellbakedbody' || specHint.fireImmune)) return true;
  if (moveType === 'Electric' && (targetAbil === 'lightningrod' || targetAbil === 'voltabsorb' || targetAbil === 'motordrive' || specHint.electricImmune)) return true;
  if (moveType === 'Water' && (targetAbil === 'waterabsorb' || targetAbil === 'stormdrain' || targetAbil === 'dryskin' || specHint.waterImmune)) return true;
  if (moveType === 'Grass' && targetAbil === 'sapsipper') return true;

  return false;
}

function estimateDamageRatio(moveData, attacker, targetFoe, foes, field, isSpread) {
  if (!moveData || moveData.category === 'Status' || !targetFoe || !targetFoe.active) return 0;
  if (isMoveImmuneOrBlocked(moveData, attacker, targetFoe, foes, field)) return 0;

  // Exact Champions damage calculation from RattataLab's Damage Calculator (Calc.calculate)
  if (Calc && typeof Calc.calculate === 'function') {
    const atkHp = attacker.maxHp || 175;
    const defHp = targetFoe.maxHp || 175;
    const atkObj = {
      species: attacker.name || 'Pikachu',
      types: attacker.types || ['Normal'],
      stats: {
        hp: atkHp,
        at: attacker.atk || 130,
        df: attacker.def || 110,
        sa: attacker.spa || 130,
        sd: attacker.spd || 110,
        sp: attacker.spe || 100
      },
      boosts: attacker.boosts || { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
      ability: attacker.ability || '',
      item: attacker.item || '',
      status: attacker.status === 'brn' ? 'Burned' : (attacker.status === 'par' ? 'Paralyzed' : 'Healthy'),
      curHP: Math.round((attacker.hpRatio !== undefined ? attacker.hpRatio : 1.0) * atkHp),
      maxHP: atkHp,
      weight: attacker.weight || 50,
      fainted: attacker.faintedAllies || 0
    };

    const defObj = {
      species: targetFoe.name || 'Pikachu',
      types: targetFoe.types || ['Normal'],
      stats: {
        hp: defHp,
        at: targetFoe.atk || 130,
        df: targetFoe.def || 110,
        sa: targetFoe.spa || 130,
        sd: targetFoe.spd || 110,
        sp: targetFoe.speed || targetFoe.spe || 100
      },
      boosts: targetFoe.boosts || { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
      ability: targetFoe.ability || '',
      item: targetFoe.item || '',
      status: targetFoe.status === 'brn' ? 'Burned' : (targetFoe.status === 'par' ? 'Paralyzed' : 'Healthy'),
      curHP: Math.round((targetFoe.hpRatio !== undefined ? targetFoe.hpRatio : 1.0) * defHp),
      maxHP: defHp,
      weight: targetFoe.weight || 50
    };

    const weatherMap = { sun: 'Sun', rain: 'Rain', sand: 'Sand', snow: 'Snow', none: 'None' };
    const terrainMap = { psychic: 'Psychic', electric: 'Electric', grassy: 'Grassy', misty: 'Misty', none: 'None' };
    const fieldObj = {
      format: 'Doubles',
      weather: weatherMap[field?.weather] || 'None',
      terrain: terrainMap[field?.terrain] || 'None',
      gravity: false
    };
    const aSide = {
      helpingHand: false
    };
    const dSide = {
      reflect: !!field?.foeReflect,
      lightScreen: !!field?.foeLightScreen,
      auroraVeil: !!field?.foeAuroraVeil
    };

    const moveObj = {
      name: moveData.name || moveData.id || 'Tackle',
      bp: moveData.basePower || 60,
      type: moveData.type || 'Normal',
      category: moveData.category || 'Physical',
      isSpread: !!isSpread,
      crit: false,
      dealsPhysicalDamage: moveData.defensiveCategory === 'Physical'
    };

    const res = Calc.calculate(atkObj, defObj, moveObj, fieldObj, aSide, dSide);
    if (!res || !res.damage || !res.damage.length || res.effectiveness === 0) return 0;
    const rolls = res.damage;
    const avgDmg = (rolls[0] + rolls[rolls.length - 1]) * 0.5;
    return Math.min(2.0, avgDmg / Math.max(1, defHp));
  }

  const moveId = moveData.id || '';
  let bp = moveData.basePower || 60;
  const attackerHpRatio = (attacker && attacker.hpRatio !== undefined) ? attacker.hpRatio : 1.0;

  if (moveId === 'eruption' || moveId === 'waterspout' || moveId === 'dragonenergy') {
    bp = Math.max(1, Math.floor(150 * attackerHpRatio));
  } else if (moveId === 'expandingforce' && field && field.terrain === 'psychic' && isGrounded(attacker, field)) {
    bp = Math.floor(bp * 1.5);
  } else if (moveId === 'weatherball' && field && field.weather && field.weather !== 'none') {
    bp = 100;
  } else if (moveId === 'lastrespects') {
    const faintedCount = (attacker && attacker.faintedAllies) ? attacker.faintedAllies : 1;
    bp = 50 + 50 * faintedCount;
  } else if (moveId === 'lowkick' || moveId === 'grassknot') {
    bp = 80;
  }

  const moveType = getEffectiveMoveType(moveData, attacker, field);
  const eff = getTypeEff(moveType, targetFoe.types || ['Normal']);
  if (eff === 0) return 0;

  const isSpecial = moveData.category === 'Special';
  let aStatKey = isSpecial ? 'spa' : 'atk';
  let dStatKey = isSpecial ? 'spd' : 'def';

  // Body Press uses physical Defense
  if (moveId === 'bodypress') aStatKey = 'def';
  // Psyshock / Psystrike / Secret Sword hit physical Defense
  if (moveId === 'psyshock' || moveId === 'psystrike' || moveId === 'secretsword') dStatKey = 'def';

  let aStat = attacker ? (attacker[aStatKey] || 130) : 130;
  // Foul Play uses target's physical Attack
  if (moveId === 'foulplay') aStat = targetFoe ? (targetFoe.atk || 130) : 130;

  let dStat = targetFoe ? (targetFoe[dStatKey] || 110) : 110;
  const maxHp = (targetFoe && targetFoe.maxHp) ? targetFoe.maxHp : 175;

  // Stat stage multipliers ([-6..+6])
  const getBoostMod = (stage) => {
    stage = Math.max(-6, Math.min(6, stage || 0));
    return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
  };

  if (attacker && attacker.boosts) {
    aStat *= getBoostMod(attacker.boosts[aStatKey]);
  }
  if (targetFoe && targetFoe.boosts) {
    dStat *= getBoostMod(targetFoe.boosts[dStatKey]);
  }

  let raw = (((22 * bp * (aStat / Math.max(1, dStat))) / 50) + 2);

  // STAB & -ate abilities
  const attackerTypes = (attacker && attacker.types) ? attacker.types : ['Normal'];
  const attackerAbil = (attacker && attacker.ability ? String(attacker.ability) : '').toLowerCase().replace(/[^a-z]/g, '');
  const targetAbil = (targetFoe && targetFoe.ability ? String(targetFoe.ability) : '').toLowerCase().replace(/[^a-z]/g, '');
  const attackerItem = (attacker && attacker.item ? String(attacker.item) : '').toLowerCase().replace(/[^a-z]/g, '');
  const targetItem = (targetFoe && targetFoe.item ? String(targetFoe.item) : '').toLowerCase().replace(/[^a-z]/g, '');

  const convertedNormal = (moveData.type === 'Normal' && moveType !== 'Normal');
  if (convertedNormal) {
    raw *= 1.2; // Pixilate / Aerilate boost
  }
  if (attackerTypes.includes(moveType)) {
    raw *= (attackerAbil === 'adaptability' ? 2.0 : 1.5);
  }

  // Type effectiveness
  raw *= eff;

  // Spread reduction (0.75x in doubles)
  if (isSpread) raw *= 0.75;

  // Weather modifiers
  if (field) {
    if (field.weather === 'sun') {
      if (moveType === 'Fire') raw *= 1.5;
      else if (moveType === 'Water') raw *= 0.5;
    } else if (field.weather === 'rain') {
      if (moveType === 'Water') raw *= 1.5;
      else if (moveType === 'Fire') raw *= 0.5;
    }
    // Terrain modifiers
    if (field.terrain === 'psychic' && moveType === 'Psychic' && isGrounded(attacker, field)) raw *= 1.3;
    else if (field.terrain === 'electric' && moveType === 'Electric' && isGrounded(attacker, field)) raw *= 1.3;
    else if (field.terrain === 'grassy' && moveType === 'Grass' && isGrounded(attacker, field)) raw *= 1.3;
    else if (field.terrain === 'misty' && moveType === 'Dragon' && isGrounded(targetFoe, field)) raw *= 0.5;

    // Screens on foe's side
    if (field.foeAuroraVeil) raw *= 0.67;
    else if (field.foeReflect && !isSpecial) raw *= 0.67;
    else if (field.foeLightScreen && isSpecial) raw *= 0.67;
  }

  // Attacker ability boosts
  if (attackerAbil === 'hugepower' || attackerAbil === 'purepower') {
    if (!isSpecial && moveId !== 'bodypress') raw *= 2.0;
  } else if (attackerAbil === 'toughclaws' && moveData.flags?.contact) {
    raw *= 1.3;
  } else if (attackerAbil === 'sharpness' && moveData.flags?.slicing) {
    raw *= 1.5;
  } else if (attackerAbil === 'strongjaw' && moveData.flags?.bite) {
    raw *= 1.5;
  } else if (attackerAbil === 'sheerforce' && moveData.secondaries) {
    raw *= 1.3;
  }

  // Defender ability damage reduction
  if ((targetAbil === 'multiscale' || targetAbil === 'shadowshield') && targetFoe.hpRatio >= 0.99) {
    raw *= 0.5;
  } else if (targetAbil === 'fluffy') {
    if (moveType === 'Fire') raw *= 2.0;
    else if (moveData.flags?.contact) raw *= 0.5;
  } else if ((targetAbil === 'filter' || targetAbil === 'solidrock') && eff > 1.0) {
    raw *= 0.75;
  } else if (targetAbil === 'thickfat' && (moveType === 'Fire' || moveType === 'Ice')) {
    raw *= 0.5;
  }

  // Item boosts
  if (attackerItem === 'lifeorb') raw *= 1.3;
  else if (attackerItem === 'choiceband' && !isSpecial) raw *= 1.5;
  else if (attackerItem === 'choicespecs' && isSpecial) raw *= 1.5;
  else if (attackerItem === 'expertbelt' && eff > 1.0) raw *= 1.2;

  // Defender item reduction
  if (targetItem === 'assaultvest' && isSpecial) raw *= (2 / 3);

  // Burn drop (halves physical damage unless Guts or Facade)
  if (attacker && attacker.status === 'brn' && !isSpecial && attackerAbil !== 'guts' && moveId !== 'facade') {
    raw *= 0.5;
  }

  return Math.min(1.5, raw / Math.max(100, maxHp));
}

function extractStateFeatures(battleState) {
  // Returns 20 normalized state features
  const f = new Float32Array(20);
  const myMons = battleState.myTeam || [];
  const foes = battleState.foes || {};
  const field = battleState.field || {};

  // Active HPs (0..3)
  f[0] = myMons[0] && myMons[0].hpRatio !== undefined ? myMons[0].hpRatio : 0;
  f[1] = myMons[1] && myMons[1].hpRatio !== undefined ? myMons[1].hpRatio : 0;
  f[2] = foes['1'] && foes['1'].active ? foes['1'].hpRatio : 0;
  f[3] = foes['2'] && foes['2'].active ? foes['2'].hpRatio : 0;

  // Remaining alive count (4..5)
  const myAlive = myMons.filter(m => m && !m.fainted).length;
  const foeAlive = (battleState.foeRemaining !== undefined ? battleState.foeRemaining : 4);
  f[4] = Math.min(myAlive / 4.0, 1.0);
  f[5] = Math.min(foeAlive / 4.0, 1.0);

  // Weather (6..9)
  const w = field.weather || 'none';
  f[6] = (w === 'sun') ? 1.0 : 0.0;
  f[7] = (w === 'rain') ? 1.0 : 0.0;
  f[8] = (w === 'sand') ? 1.0 : 0.0;
  f[9] = (w === 'snow') ? 1.0 : 0.0;

  // Terrain (10..13)
  const t = field.terrain || 'none';
  f[10] = (t === 'psychic') ? 1.0 : 0.0;
  f[11] = (t === 'electric') ? 1.0 : 0.0;
  f[12] = (t === 'grassy') ? 1.0 : 0.0;
  f[13] = (t === 'misty') ? 1.0 : 0.0;

  // Speed Control (14..16)
  f[14] = field.trickRoom ? 1.0 : 0.0;
  f[15] = field.myTailwind ? 1.0 : 0.0;
  f[16] = field.foeTailwind ? 1.0 : 0.0;

  // Turn count (17)
  f[17] = Math.min((battleState.turnCount || 1) / 10.0, 1.0);

  // Real Speed Advantage (18)
  f[18] = battleState.isFaster ? 1.0 : 0.0;

  // Screens / Imprison active (19)
  f[19] = (field.myReflect || field.myLightScreen || field.imprisonActive) ? 1.0 : 0.0;

  return f;
}

function extractActionFeatures(c, slotMon, foes, field) {
  // 18 features per candidate action
  const a = new Float32Array(18);
  if (!c) {
    a[0] = 1.0; // is_pass
    return a;
  }

  a[0] = (c.type === 'pass') ? 1.0 : 0.0;
  a[1] = (c.type === 'protect') ? 1.0 : 0.0;
  a[2] = (c.type === 'switch') ? 1.0 : 0.0;
  a[3] = (c.type === 'attack') ? 1.0 : 0.0;

  if (c.type === 'attack' && c.moveData) {
    const md = c.moveData;
    const moveType = getEffectiveMoveType(md, slotMon, field);
    a[4] = Math.min((md.basePower || 60) / 150.0, 1.0);

    const targetKey = c.targetFoe === '2' ? '2' : '1';
    const targetFoe = foes[targetKey] || { types: ['Normal'], active: true };
    const isImmune = c.isImmune || isMoveImmuneOrBlocked(md, slotMon, targetFoe, foes, field);
    const eff = isImmune ? 0 : getTypeEff(moveType, targetFoe.types || ['Normal']);
    a[5] = Math.min(eff / 4.0, 1.0);

    // STAB
    const monTypes = slotMon && slotMon.types ? slotMon.types : ['Normal'];
    a[6] = monTypes.includes(moveType) ? 1.0 : 0.0;

    // Spread & Target
    a[7] = c.isSpread ? 1.0 : 0.0;
    a[8] = (c.targetFoe === '1') ? 1.0 : 0.0;
    a[9] = (c.targetFoe === '2') ? 1.0 : 0.0;

    // Realistic estimated damage ratio (0 if immune)
    const dmgRatio = isImmune ? 0 : (c.estDamageRatio !== undefined
      ? c.estDamageRatio
      : estimateDamageRatio(md, slotMon, targetFoe, foes, field, c.isSpread));
    a[10] = Math.min(dmgRatio, 1.5);
  } else if (c.type === 'switch' && c.benchMon) {
    a[5] = c.hasImmunity ? 1.0 : (c.resistsFoe ? 0.75 : 0.25);
    a[6] = c.isThreatEscape ? 1.0 : 0.0;
    a[10] = c.benchHpRatio !== undefined ? c.benchHpRatio : 1.0;
  } else if (c.type === 'redirect' || c.type === 'helpinghand' || c.type === 'wideguard') {
    a[4] = (c.type === 'redirect') ? 1.0 : 0.0;
    a[7] = (c.type === 'helpinghand' || c.type === 'wideguard') ? 1.0 : 0.0;
  }

  // Tactical move types
  a[11] = (c.type === 'tailwind') ? 1.0 : 0.0;
  a[12] = (c.type === 'trickroom') ? 1.0 : 0.0;
  a[13] = (c.type === 'imprison' || c.type === 'redirect' || c.type === 'wideguard') ? 1.0 : 0.0;
  const isFirstTurnMon = !(slotMon && slotMon.activeTurns && slotMon.activeTurns > 1);
  a[14] = (c.move && c.move.id === 'fakeout' && isFirstTurnMon && !c.isImmune) ? 1.0 : 0.0;
  a[15] = (c.type === 'setup') ? 1.0 : 0.0;
  a[16] = (c.mega || c.isMega) ? 1.0 : 0.0;
  a[17] = (c.moveData && c.moveData.priority > 0 && !c.isImmune) ? 1.0 : 0.0;

  return a;
}

function extractJointFeatures(stateVec, act0Vec, act1Vec, c0, c1, field, foes) {
  // 8 synergy features + 20 state + 18 act0 + 18 act1 = 64 floats total
  const syn = new Float32Array(8);

  // 1. Focus fire (both targeting same enemy with non-immune attacks)
  const targetsSameFoe = (
    c0.type === 'attack' && c1.type === 'attack' &&
    !c0.isImmune && !c1.isImmune &&
    c0.targetFoe && c0.targetFoe === c1.targetFoe
  );
  syn[0] = targetsSameFoe ? 1.0 : 0.0;

  // 2. Double protect or invalid consecutive protect
  const doubleProtect = (c0.type === 'protect' && c1.type === 'protect');
  syn[1] = doubleProtect ? 1.0 : 0.0;

  // 3. Speed conflict (simultaneous tailwind + trickroom)
  const speedConflict = (c0.type === 'tailwind' && c1.type === 'trickroom') || (c0.type === 'trickroom' && c1.type === 'tailwind');
  syn[2] = speedConflict ? 1.0 : 0.0;

  // 4. Friendly fire (allAdjacent move like Earthquake/Surf while ally is vulnerable)
  let friendlyFire = false;
  if (c0.moveData && c0.moveData.target === 'allAdjacent' && c1.type !== 'protect' && !c0.allyImmune) friendlyFire = true;
  if (c1.moveData && c1.moveData.target === 'allAdjacent' && c0.type !== 'protect' && !c1.allyImmune) friendlyFire = true;
  syn[3] = friendlyFire ? 1.0 : 0.0;

  // 5. Immune / Wasted move indicator (attacking into 0x immunity, blocked priority, or redundant speed)
  const hasImmuneOrWaste = Boolean(
    c0.isImmune || c1.isImmune ||
    (field.myTailwind && (c0.type === 'tailwind' || c1.type === 'tailwind'))
  );
  syn[4] = hasImmuneOrWaste ? 1.0 : 0.0;

  // 6. Terrain / Weather / Support synergy (Expanding Force on Psychic Terrain, Redirect + Setup, Helping Hand + Attack)
  const terrainSynergy = (
    (field.terrain === 'psychic' && ((c0.move && c0.move.id === 'expandingforce' && !c0.isImmune) || (c1.move && c1.move.id === 'expandingforce' && !c1.isImmune))) ||
    (c0.type === 'redirect' && (c1.type === 'setup' || c1.type === 'trickroom' || c1.type === 'attack')) ||
    (c1.type === 'redirect' && (c0.type === 'setup' || c0.type === 'trickroom' || c0.type === 'attack')) ||
    (c0.type === 'helpinghand' && c1.type === 'attack' && !c1.isImmune) ||
    (c1.type === 'helpinghand' && c0.type === 'attack' && !c0.isImmune)
  );
  syn[5] = terrainSynergy ? 1.0 : 0.0;

  // 7. Redundant status (Double Imprison, Double Tailwind, Double Trick Room)
  const redundantStatus = (
    (c0.type === 'imprison' && c1.type === 'imprison') ||
    (field.imprisonActive && (c0.type === 'imprison' || c1.type === 'imprison')) ||
    (c0.type === 'tailwind' && c1.type === 'tailwind') ||
    (c0.type === 'trickroom' && c1.type === 'trickroom')
  );
  syn[6] = redundantStatus ? 1.0 : 0.0;

  // 8. Combined KO potential (estimated damage of c0 + c1 >= target remaining HP)
  let securesKo = false;
  let dmgFoe1 = 0;
  let dmgFoe2 = 0;
  if (c0.type === 'attack' && !c0.isImmune) {
    const d0 = c0.estDamageRatio || 0;
    if (c0.isSpread) { dmgFoe1 += d0; dmgFoe2 += d0; }
    else if (c0.targetFoe === '1') dmgFoe1 += d0;
    else if (c0.targetFoe === '2') dmgFoe2 += d0;
  }
  if (c1.type === 'attack' && !c1.isImmune) {
    const d1 = c1.estDamageRatio || 0;
    if (c1.isSpread) { dmgFoe1 += d1; dmgFoe2 += d1; }
    else if (c1.targetFoe === '1') dmgFoe1 += d1;
    else if (c1.targetFoe === '2') dmgFoe2 += d1;
  }
  if (foes['1'] && foes['1'].active && dmgFoe1 >= foes['1'].hpRatio) securesKo = true;
  if (foes['2'] && foes['2'].active && dmgFoe2 >= foes['2'].hpRatio) securesKo = true;
  syn[7] = securesKo ? 1.0 : 0.0;

  // Concatenate into final 64-dim Float32Array
  const out = new Float32Array(64);
  out.set(stateVec, 0);       // 0..19 (20)
  out.set(act0Vec, 20);      // 20..37 (18)
  out.set(act1Vec, 38);      // 38..55 (18)
  out.set(syn, 56);          // 56..63 (8)

  return out;
}

function evaluateNeuralForward(vec, w) {
  if (!w || !w.W1) return 0;
  const h1 = new Float32Array(128);
  for (let i = 0; i < 128; i++) {
    let sum = w.b1[i];
    const off = i * 64;
    for (let j = 0; j < 64; j++) sum += vec[j] * w.W1[off + j];
    h1[i] = sum > 0 ? sum : 0;
  }
  const h2 = new Float32Array(64);
  for (let i = 0; i < 64; i++) {
    let sum = w.b2[i];
    const off = i * 128;
    for (let j = 0; j < 128; j++) sum += h1[j] * w.W2[off + j];
    h2[i] = sum > 0 ? sum : 0;
  }
  let out = w.b3[0];
  for (let j = 0; j < 64; j++) out += h2[j] * w.W3[j];
  return out;
}

module.exports = {
  TYPE_CHART,
  getTypeEff,
  getEffectiveMoveType,
  isGrounded,
  isMoveImmuneOrBlocked,
  estimateDamageRatio,
  extractStateFeatures,
  extractActionFeatures,
  extractJointFeatures,
  evaluateNeuralForward
};
