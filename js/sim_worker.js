// Web Worker für den Headless Pokémon Champions Matchup-Tester.
// Nutzt die authentische Pokémon Champions Battle-Engine mit Stat Points (SPs),
// Champions-Stat-Formeln, Mega-Evolution und Doppelkampf-Heuristiken.

import { BattleStreams, Teams, Dex } from '@pkmn/sim';
import ChampionsBot from './sim_bot.js';
import ARCHETYPES from '../data/meta_archetypes.js';

// Authentische Pokémon Champions Engine registrieren
Dex.mod('champions', {
  Scripts: {
    init() {
      // In Champions sind alle Attacken-PP auf maximal 20 gedeckelt
      for (const i in this.data.Moves) {
        if (this.data.Moves[i].pp > 20) {
          this.modData('Moves', i).pp = 20;
        }
      }
    },
    statModify(baseStats, set, statName) {
      const tr = this.trunc;
      let stat = baseStats[statName];
      // In Champions speichert set.evs direkt die Stat Points (SPs, 0 bis 32)
      const sp = set.evs ? (set.evs[statName] || 0) : 0;
      if (statName === 'hp') {
        return stat + sp + 75;
      }
      stat = stat + sp + 20;
      const nature = this.dex.natures.get(set.nature);
      if (nature.plus === statName) {
        stat = tr(tr(stat * 110, 16) / 100);
      } else if (nature.minus === statName) {
        stat = tr(tr(stat * 90, 16) / 100);
      }
      return stat;
    },
    actions: {
      canTerastallize(pokemon) {
        // Terakristallisierung ist in Champions deaktiviert
        return null;
      },
      canMegaEvo(pokemon) {
        const species = pokemon.baseSpecies;
        const altForme = species.otherFormes && this.dex.species.get(species.otherFormes[0]);
        const item = pokemon.getItem();
        if ((this.battle.gen <= 7 || this.battle.ruleTable.has('+tag:past') ||
          this.battle.ruleTable.has('+tag:future')) &&
          altForme?.isMega && altForme?.requiredMove &&
          pokemon.baseMoves.includes(this.battle.toID(altForme.requiredMove)) && !item.zMove) {
          return altForme.name;
        }
        return item.megaStone?.[species.name] || null;
      },
      modifyDamage(baseDamage, pokemon, target, move, suppressMessages) {
        const tr = this.battle.trunc;
        if (!move.type) move.type = '???';
        const type = move.type;

        baseDamage += 2;

        if (move.spreadHit) {
          const spreadModifier = 0.75;
          baseDamage = this.battle.modify(baseDamage, spreadModifier);
        } else if (move.multihitType === 'parentalbond' && move.hit > 1) {
          baseDamage = this.battle.modify(baseDamage, 0.25);
        }

        baseDamage = this.battle.priorityEvent('WeatherModifyDamage', pokemon, target, move, baseDamage);

        const isCrit = target.getMoveHitData(move).crit;
        if (isCrit) {
          baseDamage = tr(baseDamage * (move.critModifier || 1.5));
        }

        baseDamage = this.battle.randomizer(baseDamage);

        if (type !== '???') {
          let stab = 1;
          const isSTAB = move.forceSTAB || pokemon.hasType(type) || pokemon.getTypes(false, true).includes(type);
          if (isSTAB) stab = 1.5;
          baseDamage = this.battle.modify(baseDamage, stab);
        }

        return baseDamage;
      }
    }
  }
});

// Format für den BattleStream aktivieren
Dex.formats.extend([
  {
    name: '[Gen 9 Champions] VGC 2026 Reg M-C',
    mod: 'champions',
    gameType: 'doubles',
    ruleset: ['Flat Rules', 'NatDex Mod'],
  }
]);

const CHAMP_DEX = Dex.mod('champions');

// Konvertiert Team-Pastes sauber in das Champions-SP-Format
// Erkennt SPs: direkt oder wandelt alte Showdown-252-EVs in SPs (0-32) um
function normalizeChampionsPaste(paste) {
  if (!paste) return '';
  return paste.replace(/^(SPs?|EVs?):\s*(.+)$/gim, (match, prefix, body) => {
    const parts = body.split('/').map(p => p.trim());
    const spParts = parts.map(part => {
      const m = /^(\d+)\s+([A-Za-z]+)$/.exec(part);
      if (!m) return part;
      let val = parseInt(m[1], 10);
      if (/^EV/i.test(prefix) && val > 32) {
        // Altes Showdown EV-Format (0-252) -> in Champions Stat Points (0-32) umrechnen
        val = val <= 0 ? 0 : Math.min(32, Math.floor((val + 4) / 8));
      } else {
        val = Math.max(0, Math.min(32, val));
      }
      return `${val} ${m[2]}`;
    });
    return 'EVs: ' + spParts.join(' / ');
  });
}

// Mögliche 2er-Leads für 4-Pick erzeugen (Kombinationen aus den ersten 6 Pokémon)
function generateLeadCombinations(teamLength) {
  const combos = [];
  const max = Math.min(6, teamLength);
  for (let i = 0; i < max; i++) {
    for (let j = i + 1; j < max; j++) {
      const back = [];
      for (let k = 0; k < max; k++) {
        if (k !== i && k !== j) back.push(k + 1);
      }
      combos.push([i + 1, j + 1, back[0] || 1, back[1] || 2]);
    }
  }
  return combos.length ? combos : [[1, 2, 3, 4]];
}

let isCancelled = false;

// Ein einzelnes Champions-Match ausführen mit Sicherheits-Timeout gegen Hänger
async function runSingleMatch(p1Packed, p2Packed, p1LeadOrder, p2LeadOrder) {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const p1 = new ChampionsBot(streams.p1, { leadOrder: p1LeadOrder, dex: CHAMP_DEX });
  const p2 = new ChampionsBot(streams.p2, { leadOrder: p2LeadOrder, dex: CHAMP_DEX });

  p1.start();
  p2.start();

  let winner = null;
  let turns = 0;
  const p1Faints = [];
  const p2Faints = [];
  let lastAttackerP2 = '';

  let timeoutId = null;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      try {
        battleStream.destroy();
      } catch (e) {}
      resolve({
        winner: null,
        turns: turns || 1,
        p1Won: false,
        p1Faints,
        p2Faints,
        timedOut: true
      });
    }, 1500);
  });

  const readPromise = (async () => {
    try {
      for await (const chunk of streams.omniscient) {
        for (const line of chunk.split('\n')) {
          if (line.startsWith('|turn|')) {
            turns++;
          } else if (line.startsWith('|move|')) {
            const parts = line.split('|');
            const ident = parts[2] || '';
            if (ident.startsWith('p2')) {
              const monName = ident.split(':')[1]?.trim() || 'Opponent';
              lastAttackerP2 = monName;
            }
          } else if (line.startsWith('|faint|')) {
            const parts = line.split('|');
            const ident = parts[2] || '';
            const monName = ident.split(':')[1]?.trim() || '';
            if (ident.startsWith('p1')) {
              p1Faints.push({ mon: monName, killer: lastAttackerP2 });
            } else {
              p2Faints.push({ mon: monName });
            }
          } else if (line.startsWith('|win|')) {
            winner = line.split('|')[2];
          }
        }
      }
    } catch (err) {
      // Stream abgebrochen
    }
    return {
      winner,
      turns,
      p1Won: winner === 'Player',
      p1Faints,
      p2Faints
    };
  })();

  await streams.omniscient.write('>start {"formatid":"gen9championsvgc2026regmc"}\n');
  await streams.omniscient.write(`>player p1 {"name":"Player","team":"${p1Packed}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"Opponent","team":"${p2Packed}"}\n`);

  const result = await Promise.race([readPromise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

// Gesamtsimulation steuern
async function runSimulation(data) {
  isCancelled = false;
  const startTime = Date.now();

  const userPaste = normalizeChampionsPaste(data.userTeamPaste || '');
  const userParsed = Teams.import(userPaste);
  if (!userParsed || !userParsed.length) {
    self.postMessage({ type: 'ERROR', error: 'Ungültiges eigenes Team (Showdown-Paste leer oder fehlerhaft).' });
    return;
  }
  const userPacked = Teams.pack(userParsed);
  const userMonNames = userParsed.map(m => m.name || m.species);

  const archetypesToTest = data.archetypes && data.archetypes.length ? data.archetypes : ARCHETYPES;
  const matchesPerArchetype = Math.max(1, data.matchesPerArchetype || 25);
  const totalMatches = archetypesToTest.length * matchesPerArchetype;

  const leadCombos = generateLeadCombinations(userParsed.length);
  let totalCompleted = 0;
  let totalWins = 0;

  const archetypeResults = [];
  const globalThreatMap = {};
  const leadPerformanceMap = {};

  for (let aIdx = 0; aIdx < archetypesToTest.length; aIdx++) {
    if (isCancelled) break;

    const arch = archetypesToTest[aIdx];
    const archPaste = normalizeChampionsPaste(arch.paste);
    const archParsed = Teams.import(archPaste);
    const archPacked = Teams.pack(archParsed);
    const archCombos = generateLeadCombinations(archParsed.length);

    let archWins = 0;
    let archTurns = 0;
    const archThreats = {};
    const archLeads = {};

    for (let m = 0; m < matchesPerArchetype; m++) {
      if (isCancelled) break;

      const p1Order = leadCombos[m % leadCombos.length];
      const p2Order = archCombos[m % archCombos.length];

      const leadLabel = `${userMonNames[p1Order[0] - 1]} + ${userMonNames[p1Order[1] - 1]}`;

      const res = await runSingleMatch(userPacked, archPacked, p1Order, p2Order);

      totalCompleted++;
      archTurns += res.turns;

      if (!archLeads[leadLabel]) archLeads[leadLabel] = { wins: 0, total: 0 };
      archLeads[leadLabel].total++;

      if (!leadPerformanceMap[leadLabel]) leadPerformanceMap[leadLabel] = { wins: 0, total: 0 };
      leadPerformanceMap[leadLabel].total++;

      if (res.p1Won) {
        archWins++;
        totalWins++;
        archLeads[leadLabel].wins++;
        leadPerformanceMap[leadLabel].wins++;
      }

      for (const f of res.p1Faints) {
        if (f.killer) {
          archThreats[f.killer] = (archThreats[f.killer] || 0) + 1;
          if (!globalThreatMap[f.killer]) {
            globalThreatMap[f.killer] = { kills: 0, archetype: arch.name };
          }
          globalThreatMap[f.killer].kills++;
        }
      }

      self.postMessage({
        type: 'PROGRESS',
        archetypeId: arch.id,
        archetypeName: arch.name,
        currentMatch: m + 1,
        matchesPerArchetype,
        totalCompleted,
        totalMatches,
        overallWinrate: totalCompleted ? Math.round((totalWins / totalCompleted) * 100) : 0,
        currentArchWinrate: Math.round((archWins / (m + 1)) * 100)
      });
    }

    const archWinrate = Math.round((archWins / matchesPerArchetype) * 100);

    archetypeResults.push({
      id: arch.id,
      name: arch.name,
      category: arch.category,
      badgeColor: arch.badgeColor,
      description: arch.description,
      wins: archWins,
      losses: matchesPerArchetype - archWins,
      total: matchesPerArchetype,
      winrate: archWinrate,
      avgTurns: (archTurns / matchesPerArchetype).toFixed(1),
      leadStats: archLeads,
      threats: Object.entries(archThreats)
        .map(([mon, kills]) => ({ mon, kills }))
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 3)
    });
  }

  if (isCancelled) {
    self.postMessage({ type: 'CANCELLED' });
    return;
  }

  const threatList = Object.entries(globalThreatMap)
    .map(([mon, data]) => ({ mon, kills: data.kills, archetype: data.archetype }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 8);

  const leadPerformance = Object.entries(leadPerformanceMap)
    .map(([lead, data]) => ({
      lead,
      wins: data.wins,
      total: data.total,
      winrate: data.total ? Math.round((data.wins / data.total) * 100) : 0
    }))
    .sort((a, b) => b.winrate - a.winrate || b.total - a.total);

  const durationMs = Date.now() - startTime;

  self.postMessage({
    type: 'COMPLETE',
    results: archetypeResults,
    threatList,
    leadPerformance,
    totalMatches: totalCompleted,
    totalWins,
    overallWinrate: totalCompleted ? Math.round((totalWins / totalCompleted) * 100) : 0,
    durationMs
  });
}

// Worker Message-Handler
self.onmessage = function (e) {
  const msg = e.data || {};
  if (msg.type === 'START') {
    runSimulation(msg);
  } else if (msg.type === 'CANCEL') {
    isCancelled = true;
  }
};
