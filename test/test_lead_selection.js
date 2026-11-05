const ARCHETYPES = require('../data/meta_archetypes.js');
const { Teams } = require('@pkmn/sim');

function testEvaluate(pokemonList) {
  const totalMons = pokemonList.length;
  if (totalMons <= 4) return [1, 2, 3, 4].slice(0, totalMons);

  const getMeta = (mon) => {
    const name = (mon.name || mon.species || mon.details || '').split(',')[0].trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const moves = (mon.moves || []).map(m => (typeof m === 'string' ? m : m.move || m.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const ability = (mon.ability || mon.baseAbility || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const item = (mon.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isMega = item.endsWith('ite') || item.endsWith('itez') || id.includes('mega');
    return { name, id, moves, ability, item, isMega };
  };

  const metas = pokemonList.map(getMeta);
  const leadPairMap = new Map();

  for (let i = 1; i <= totalMons; i++) {
    for (let j = i + 1; j <= totalMons; j++) {
      const remaining = [];
      for (let k = 1; k <= totalMons; k++) {
        if (k !== i && k !== j) remaining.push(k);
      }

      let bestSquad = null;
      let maxSquadScore = -999;

      for (let b1Idx = 0; b1Idx < remaining.length; b1Idx++) {
        for (let b2Idx = b1Idx + 1; b2Idx < remaining.length; b2Idx++) {
          const k = remaining[b1Idx];
          const l = remaining[b2Idx];

          const L1 = metas[i - 1];
          const L2 = metas[j - 1];
          const B1 = metas[k - 1];
          const B2 = metas[l - 1];
          const squad = [L1, L2, B1, B2];

          let score = 50;

          // 1. Weather Synergies
          const lSandSetter = L1.ability.includes('sandstream') || L2.ability.includes('sandstream');
          const lSandAbuser = L1.ability.includes('sandrush') || L2.ability.includes('sandrush') || L1.ability.includes('sandforce') || L2.ability.includes('sandforce');
          const bSandSetter = B1.ability.includes('sandstream') || B2.ability.includes('sandstream');
          if (lSandSetter && lSandAbuser) score += 38;
          else if (lSandAbuser && bSandSetter) score += 26;
          else if (lSandSetter) score += 15;

          const lRainSetter = L1.ability.includes('drizzle') || L2.ability.includes('drizzle');
          const lRainAbuser = L1.ability.includes('swiftswim') || L2.ability.includes('swiftswim');
          const bRainSetter = B1.ability.includes('drizzle') || B2.ability.includes('drizzle');
          if (lRainSetter && lRainAbuser) score += 38;
          else if (lRainAbuser && bRainSetter) score += 26;
          else if (lRainSetter) score += 15;

          const lSunSetter = L1.ability.includes('drought') || L2.ability.includes('drought');
          const lSunAbuser = L1.ability.includes('chlorophyll') || L2.ability.includes('chlorophyll') || L1.ability.includes('solarpower') || L2.ability.includes('solarpower') || L1.ability.includes('protosynthesis') || L2.ability.includes('protosynthesis');
          const bSunSetter = B1.ability.includes('drought') || B2.ability.includes('drought');
          if (lSunSetter && lSunAbuser) score += 38;
          else if (lSunAbuser && bSunSetter) score += 26;
          else if (lSunSetter) score += 15;

          const lSnowSetter = L1.ability.includes('snowwarning') || L2.ability.includes('snowwarning');
          const lSnowAbuser = L1.ability.includes('slushrush') || L2.ability.includes('slushrush');
          const bSnowSetter = B1.ability.includes('snowwarning') || B2.ability.includes('snowwarning');
          if (lSnowSetter && lSnowAbuser) score += 30;
          else if (lSnowAbuser && bSnowSetter) score += 20;

          if ((lRainSetter && lSunSetter) || (lSandSetter && lRainSetter) || (lSunSetter && lSandSetter)) {
            score -= 80;
          }

          // 2. Terrain Synergies
          const lPsychicSetter = L1.ability.includes('psychicsurge') || L2.ability.includes('psychicsurge');
          const lPsychicAbuser = L1.moves.includes('expandingforce') || L2.moves.includes('expandingforce') ||
                                  (L1.item.includes('psychicseed') && L1.ability.includes('unburden')) ||
                                  (L2.item.includes('psychicseed') && L2.ability.includes('unburden'));
          const bPsychicSetter = B1.ability.includes('psychicsurge') || B2.ability.includes('psychicsurge');
          if (lPsychicSetter && lPsychicAbuser) score += 36;
          else if (lPsychicAbuser && bPsychicSetter) score += 24;
          else if (lPsychicSetter) score += 14;

          // 3. Disruption / Redirection
          const hasFO1 = L1.moves.includes('fakeout');
          const hasFO2 = L2.moves.includes('fakeout');
          if (hasFO1 && hasFO2) score -= 25;
          else if (hasFO1 || hasFO2) score += 22;

          const hasRedir1 = L1.moves.includes('followme') || L1.moves.includes('ragepowder');
          const hasRedir2 = L2.moves.includes('followme') || L2.moves.includes('ragepowder');
          if (hasRedir1 && hasRedir2) score -= 25;
          else if (hasRedir1 || hasRedir2) score += 22;

          // 4. Speed Control (Tailwind / Trick Room)
          const hasTW1 = L1.moves.includes('tailwind');
          const hasTW2 = L2.moves.includes('tailwind');
          if (hasTW1 && hasTW2) score -= 25;
          else if (hasTW1 || hasTW2) score += 24;

          const hasTR1 = L1.moves.includes('trickroom');
          const hasTR2 = L2.moves.includes('trickroom');
          if (hasTR1 && hasTR2) score -= 25;
          else if (hasTR1 || hasTR2) score += 28;

          if ((hasTR1 || hasTR2) && (L1.moves.includes('eruption') || L2.moves.includes('eruption') || L1.id.includes('conkeldurr') || L2.id.includes('conkeldurr') || L1.id.includes('torkoal') || L2.id.includes('torkoal') || L1.id.includes('ursaluna') || L2.id.includes('ursaluna'))) {
            score += 20;
          }

          // 5. Utility & Defense (Intimidate)
          const hasIntimidate = L1.ability.includes('intimidate') || L2.ability.includes('intimidate');
          if (hasIntimidate) score += 16;

          // 6. Mega Evolution Constraint
          const megasInSquad = squad.filter(m => m.isMega).length;
          const totalMegasInTeam = metas.filter(m => m.isMega).length;
          if (megasInSquad === 1) score += 25;
          else if (megasInSquad > 1) score -= 50;
          else if (megasInSquad === 0 && totalMegasInTeam > 0) score -= 20;

          // 7. Bench Cleaners & Coverage
          const hasPriorityBench = B1.moves.some(m => ['extremespeed', 'suckerpunch', 'lastrespects', 'machpunch', 'shadowsneak'].includes(m)) ||
                                   B2.moves.some(m => ['extremespeed', 'suckerpunch', 'lastrespects', 'machpunch', 'shadowsneak'].includes(m));
          if (hasPriorityBench) score += 14;

          const hasScarfBench = B1.item.includes('choicescarf') || B2.item.includes('choicescarf');
          if (hasScarfBench) score += 12;

          if (score > maxSquadScore) {
            maxSquadScore = score;
            bestSquad = [i, j, k, l];
          }
        }
      }

      leadPairMap.set(`${i}-${j}`, { order: bestSquad, score: maxSquadScore });
    }
  }

  const allPairs = Array.from(leadPairMap.values()).filter(p => p.order);
  if (!allPairs.length) return [1, 2, 3, 4];

  allPairs.sort((a, b) => b.score - a.score);
  const topScore = allPairs[0].score;
  const viable = allPairs.filter(p => p.score >= topScore - 24);

  const temp = 13;
  const weights = viable.map(p => Math.exp((p.score - topScore) / temp));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * totalWeight;

  let chosenOrder = viable[0].order;
  for (let idx = 0; idx < viable.length; idx++) {
    rand -= weights[idx];
    if (rand <= 0 || idx === viable.length - 1) {
      chosenOrder = viable[idx].order;
      break;
    }
  }

  if (Math.random() < 0.5) {
    return [chosenOrder[1], chosenOrder[0], chosenOrder[2], chosenOrder[3]];
  }
  return chosenOrder;
}

module.exports = { testEvaluate };

// Test on all 10 archetypes
ARCHETYPES.forEach(arch => {
  const parsed = Teams.import(arch.paste);
  console.log(`\n=== Archetype: ${arch.name} ===`);
  const uniqueLeads = new Set();
  for (let round = 1; round <= 5; round++) {
    const order = testEvaluate(parsed);
    const getMonName = (p) => p ? (p.species || p.name || 'Unknown') : 'Unknown';
    const leads = [getMonName(parsed[order[0] - 1]), getMonName(parsed[order[1] - 1])];
    const bench = [getMonName(parsed[order[2] - 1]), getMonName(parsed[order[3] - 1])];
    const leadKey = [...leads].sort().join(' + ');
    uniqueLeads.add(leadKey);
    console.log(`  Run ${round}: Leads: [${leads.join(' + ')}] | Back: [${bench.join(' + ')}] | Order: ${order.join('')}`);
  }
  console.log(`  -> Unique leads across 5 runs: ${uniqueLeads.size}`);
});
