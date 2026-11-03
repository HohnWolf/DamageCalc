// Feature Extraction for Pokémon VGC Doubles Champions Format
// Produces a normalized float vector of length 64 for each candidate joint action (A_slot0, A_slot1)

const TYPE_CHART = {
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
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

function getTypeEff(moveType, targetTypes) {
  let eff = 1.0;
  if (!TYPE_CHART[moveType]) return 1.0;
  for (const t of targetTypes) {
    if (TYPE_CHART[moveType][t] !== undefined) {
      eff *= TYPE_CHART[moveType][t];
    }
  }
  return eff;
}

function extractStateFeatures(battleState) {
  // Returns 20 normalized state features
  const f = new Float32Array(20);
  const myMons = battleState.myTeam || [];
  const foes = battleState.foes || {};
  const field = battleState.field || {};

  // Active HPs
  f[0] = myMons[0] && myMons[0].hpRatio !== undefined ? myMons[0].hpRatio : 0;
  f[1] = myMons[1] && myMons[1].hpRatio !== undefined ? myMons[1].hpRatio : 0;
  f[2] = foes['1'] && foes['1'].active ? foes['1'].hpRatio : 0;
  f[3] = foes['2'] && foes['2'].active ? foes['2'].hpRatio : 0;

  // Remaining alive count
  const myAlive = myMons.filter(m => m && !m.fainted).length;
  const foeAlive = (battleState.foeRemaining !== undefined ? battleState.foeRemaining : 4);
  f[4] = myAlive / 4.0;
  f[5] = foeAlive / 4.0;

  // Weather (none, sun, rain, sand, snow)
  const w = field.weather || 'none';
  f[6] = (w === 'sun') ? 1.0 : 0.0;
  f[7] = (w === 'rain') ? 1.0 : 0.0;
  f[8] = (w === 'sand') ? 1.0 : 0.0;
  f[9] = (w === 'snow') ? 1.0 : 0.0;

  // Terrain (psychic, electric, grassy, misty)
  const t = field.terrain || 'none';
  f[10] = (t === 'psychic') ? 1.0 : 0.0;
  f[11] = (t === 'electric') ? 1.0 : 0.0;
  f[12] = (t === 'grassy') ? 1.0 : 0.0;
  f[13] = (t === 'misty') ? 1.0 : 0.0;

  // Speed Control
  f[14] = field.trickRoom ? 1.0 : 0.0;
  f[15] = field.myTailwind ? 1.0 : 0.0;
  f[16] = field.foeTailwind ? 1.0 : 0.0;

  // Turn count
  f[17] = Math.min((battleState.turnCount || 1) / 10.0, 1.0);

  // Speed advantage
  f[18] = battleState.isFaster ? 1.0 : 0.0;

  // Screens
  f[19] = field.myReflect || field.myLightScreen ? 1.0 : 0.0;

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
    a[4] = Math.min((md.basePower || 60) / 150.0, 1.0);
    const targetKey = c.targetFoe === '2' ? '2' : '1';
    const targetFoe = foes[targetKey] || { types: ['Normal'] };
    const eff = getTypeEff(md.type || 'Normal', targetFoe.types || ['Normal']);
    a[5] = Math.min(eff / 4.0, 1.0);
    
    // STAB
    const monTypes = slotMon && slotMon.types ? slotMon.types : ['Normal'];
    a[6] = monTypes.includes(md.type) ? 1.0 : 0.0;

    // Spread
    a[7] = c.isSpread ? 1.0 : 0.0;
    a[8] = (c.targetFoe === '1') ? 1.0 : 0.0;
    a[9] = (c.targetFoe === '2') ? 1.0 : 0.0;

    // Estimated damage ratio
    a[10] = Math.min((c.estDamageRatio || 0.4), 1.5);
  } else if (c.type === 'switch' && c.benchMon) {
    const bMon = c.benchMon;
    const bTypes = bMon.types || ['Normal'];
    const f1Types = (foes['1'] && foes['1'].types) || ['Normal'];
    const eff = getTypeEff(f1Types[0] || 'Normal', bTypes);
    a[5] = (eff === 0) ? 1.0 : (eff <= 0.5 ? 0.75 : (eff > 1.0 ? 0.2 : 0.5));
    a[6] = c.isThreatEscape ? 1.0 : 0.0;
    a[10] = c.benchHpRatio !== undefined ? c.benchHpRatio : 1.0;
  }

  // Tactical move types
  a[11] = (c.type === 'tailwind') ? 1.0 : 0.0;
  a[12] = (c.type === 'trickroom') ? 1.0 : 0.0;
  a[13] = (c.type === 'imprison') ? 1.0 : 0.0;
  a[14] = (c.move && c.move.id === 'fakeout') ? 1.0 : 0.0;
  a[15] = (c.type === 'setup') ? 1.0 : 0.0;
  a[16] = (c.mega) ? 1.0 : 0.0;
  a[17] = (c.priority && c.priority > 0) ? 1.0 : 0.0;

  return a;
}

function extractJointFeatures(stateVec, act0Vec, act1Vec, c0, c1, field, foes) {
  // 8 synergy features + 20 state + 18 act0 + 18 act1 = 64 floats total
  const syn = new Float32Array(8);

  // 1. Focus fire (both targeting same enemy)
  const targetsSameFoe = (c0.type === 'attack' && c1.type === 'attack' && c0.targetFoe && c0.targetFoe === c1.targetFoe);
  syn[0] = targetsSameFoe ? 1.0 : 0.0;

  // 2. Double protect
  const doubleProtect = (c0.type === 'protect' && c1.type === 'protect');
  syn[1] = doubleProtect ? 1.0 : 0.0;

  // 3. Speed conflict (tailwind + trickroom)
  const speedConflict = (c0.type === 'tailwind' && c1.type === 'trickroom') || (c0.type === 'trickroom' && c1.type === 'tailwind');
  syn[2] = speedConflict ? 1.0 : 0.0;

  // 4. Friendly fire (e.g. Earthquake while ally not protecting/flying)
  let friendlyFire = false;
  if (c0.moveData && c0.moveData.target === 'allAdjacent' && c1.type !== 'protect') friendlyFire = true;
  if (c1.moveData && c1.moveData.target === 'allAdjacent' && c0.type !== 'protect') friendlyFire = true;
  syn[3] = friendlyFire ? 1.0 : 0.0;

  // 5. Redundant speed move (Tailwind when already active, or TR when already active and slow)
  const redundantSpeed = (field.myTailwind && (c0.type === 'tailwind' || c1.type === 'tailwind'));
  syn[4] = redundantSpeed ? 1.0 : 0.0;

  // 6. Expanding force under psychic terrain
  const terrainExpandingForce = (field.terrain === 'psychic' && ((c0.move && c0.move.id === 'expandingforce') || (c1.move && c1.move.id === 'expandingforce')));
  syn[5] = terrainExpandingForce ? 1.0 : 0.0;

  // 7. Redundant Imprison
  const redundantImprison = (c0.type === 'imprison' && c1.type === 'imprison') || (field.imprisonActive && (c0.type === 'imprison' || c1.type === 'imprison'));
  syn[6] = redundantImprison ? 1.0 : 0.0;

  // 8. KO potential (estimated damage ratio >= target remaining HP)
  let securesKo = false;
  if (c0.type === 'attack' && c0.targetFoe && foes[c0.targetFoe]) {
    if ((c0.estDamageRatio || 0) >= foes[c0.targetFoe].hpRatio) securesKo = true;
  }
  if (c1.type === 'attack' && c1.targetFoe && foes[c1.targetFoe]) {
    if ((c1.estDamageRatio || 0) >= foes[c1.targetFoe].hpRatio) securesKo = true;
  }
  syn[7] = securesKo ? 1.0 : 0.0;

  // Concatenate into final 64-dim Float32Array
  const out = new Float32Array(64);
  out.set(stateVec, 0);       // 0..19 (20)
  out.set(act0Vec, 20);      // 20..37 (18)
  out.set(act1Vec, 38);      // 38..55 (18)
  out.set(syn, 56);          // 56..63 (8)

  return out;
}

module.exports = {
  extractStateFeatures,
  extractActionFeatures,
  extractJointFeatures,
  getTypeEff
};
