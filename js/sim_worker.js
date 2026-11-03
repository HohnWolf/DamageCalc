// Web Worker für den Headless Pokémon Champions Matchup-Tester.
// Führt Simulationen mit @pkmn/sim und ChampionsBot im Hintergrund-Thread aus.

import { BattleStreams, Teams, Dex } from '@pkmn/sim';
import ChampionsBot from './sim_bot.js';
import ARCHETYPES from '../data/meta_archetypes.js';

// Champions VGC Format registrieren
Dex.formats.extend([
  {
    name: '[Gen 9 Champions] VGC 2026 Reg M-C',
    mod: 'base',
    gameType: 'doubles',
    ruleset: ['Flat Rules', 'NatDex Mod'],
  }
]);

// SPs zu Showdown-EVs konvertieren
function cleanShowdownPaste(paste) {
  if (!paste) return '';
  return paste.replace(/^SPs?:\s*(.+)$/gim, (match, body) => {
    const parts = body.split('/').map(p => p.trim());
    const evParts = parts.map(part => {
      const m = /^(\d+)\s+([A-Za-z]+)$/.exec(part);
      if (!m) return part;
      const sp = parseInt(m[1], 10);
      const stat = m[2];
      const ev = sp <= 0 ? 0 : Math.min(252, 8 * sp - 4);
      return `${ev} ${stat}`;
    });
    return 'EVs: ' + evParts.join(' / ');
  });
}

// Mögliche 2er-Leads für 4-Pick erzeugen (Kombinationen aus den ersten 6 Pokémon)
function generateLeadCombinations(teamLength) {
  const combos = [];
  const max = Math.min(6, teamLength);
  for (let i = 0; i < max; i++) {
    for (let j = i + 1; j < max; j++) {
      // 2 Leads: i + 1, j + 1. Die restlichen Slots als Backups
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

// Ein einzelnes Match ausführen
async function runSingleMatch(p1Packed, p2Packed, p1LeadOrder, p2LeadOrder) {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const p1 = new ChampionsBot(streams.p1, { leadOrder: p1LeadOrder, dex: Dex });
  const p2 = new ChampionsBot(streams.p2, { leadOrder: p2LeadOrder, dex: Dex });

  p1.start();
  p2.start();

  let winner = null;
  let turns = 0;
  const p1Faints = [];
  const p2Faints = [];
  let lastAttackerP2 = '';

  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|turn|')) {
          turns++;
        } else if (line.startsWith('|move|')) {
          const parts = line.split('|');
          const ident = parts[2] || '';
          if (ident.startsWith('p2')) {
            // Gegnerische Attacke tracken
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
  })();

  await streams.omniscient.write('>start {"formatid":"gen9championsvgc2026regmc"}\n');
  await streams.omniscient.write(`>player p1 {"name":"Player","team":"${p1Packed}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"Opponent","team":"${p2Packed}"}\n`);

  await readPromise;
  return {
    winner,
    turns,
    p1Won: winner === 'Player',
    p1Faints,
    p2Faints
  };
}

// Gesamtsimulation steuern
async function runSimulation(data) {
  isCancelled = false;
  const startTime = Date.now();

  const userPaste = cleanShowdownPaste(data.userTeamPaste || '');
  const userParsed = Teams.import(userPaste);
  if (!userParsed || !userParsed.length) {
    self.postMessage({ type: 'ERROR', error: 'Ungültiges eigenes Team (Showdown-Paste leer oder fehlerhaft).' });
    return;
  }
  const userPacked = Teams.pack(userParsed);
  const userMonNames = userParsed.map(m => m.name || m.species);

  const archetypesToTest = data.archetypes && data.archetypes.length ? data.archetypes : ARCHETYPES;
  const matchesPerArchetype = Math.max(1, data.matchesPerArchetype || 30);
  const totalMatches = archetypesToTest.length * matchesPerArchetype;

  const leadCombos = generateLeadCombinations(userParsed.length);
  let totalCompleted = 0;
  let totalWins = 0;

  const archetypeResults = [];
  const globalThreatMap = {}; // Mon Name -> { kills: N, appearances: N }
  const leadPerformanceMap = {}; // "Mon1 + Mon2" -> { wins: N, total: N }

  for (let aIdx = 0; aIdx < archetypesToTest.length; aIdx++) {
    if (isCancelled) break;

    const arch = archetypesToTest[aIdx];
    const archPaste = cleanShowdownPaste(arch.paste);
    const archParsed = Teams.import(archPaste);
    const archPacked = Teams.pack(archParsed);
    const archCombos = generateLeadCombinations(archParsed.length);

    let archWins = 0;
    let archTurns = 0;
    const archThreats = {};
    const archLeads = {};

    for (let m = 0; m < matchesPerArchetype; m++) {
      if (isCancelled) break;

      // Leads rotieren
      const p1Order = leadCombos[m % leadCombos.length];
      const p2Order = archCombos[m % archCombos.length];

      const leadLabel = `${userMonNames[p1Order[0] - 1]} + ${userMonNames[p1Order[1] - 1]}`;

      const res = await runSingleMatch(userPacked, archPacked, p1Order, p2Order);

      totalCompleted++;
      archTurns += res.turns;

      // Lead Stats
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

      // Threat Stats (wer hat K.O.s erzielt?)
      for (const f of res.p1Faints) {
        if (f.killer) {
          archThreats[f.killer] = (archThreats[f.killer] || 0) + 1;
          if (!globalThreatMap[f.killer]) {
            globalThreatMap[f.killer] = { kills: 0, archetype: arch.name };
          }
          globalThreatMap[f.killer].kills++;
        }
      }

      // Regelmäßiges Fortschritts-Update (z. B. alle 5 Matches oder am Ende eines Archetyps)
      if (m % 5 === 0 || m === matchesPerArchetype - 1) {
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

  // Top Threats formatieren
  const threatList = Object.entries(globalThreatMap)
    .map(([mon, data]) => ({ mon, kills: data.kills, archetype: data.archetype }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 8);

  // Top Leads formatieren
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
