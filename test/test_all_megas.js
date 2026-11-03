const { BattleStreams, Teams, Dex } = require('@pkmn/sim');
const ChampionsBot = require('../js/sim_bot.js');
const archetypes = require('../data/meta_archetypes.js');

// Register format
Dex.formats.extend([
  {
    name: '[Gen 9 Champions] VGC 2026 Reg M-C',
    mod: 'base',
    gameType: 'doubles',
    ruleset: ['Flat Rules', 'NatDex Mod'],
  }
]);

async function runMatch(t1Str, t2Str) {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const t1 = Teams.pack(Teams.import(t1Str));
  const t2 = Teams.pack(Teams.import(t2Str));

  const p1 = new ChampionsBot(streams.p1);
  const p2 = new ChampionsBot(streams.p2);

  p1.start();
  p2.start();

  let winner = null;
  let turns = 0;
  let p1Fainted = 0;
  let p2Fainted = 0;
  const faintedMons = [];

  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|turn|')) turns++;
        if (line.startsWith('|faint|')) {
          const ident = line.split('|')[2]; // e.g. "p1a: Charizard"
          if (ident.startsWith('p1')) p1Fainted++;
          else p2Fainted++;
          faintedMons.push(ident);
        }
        if (line.startsWith('|win|')) {
          winner = line.split('|')[2];
        }
      }
    }
  })();

  await streams.omniscient.write('>start {"formatid":"gen9championsvgc2026regmc"}\n');
  await streams.omniscient.write(`>player p1 {"name":"P1","team":"${t1}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"P2","team":"${t2}"}\n`);

  await readPromise;
  return { winner, turns, p1Fainted, p2Fainted, faintedMons };
}

async function runBenchmark() {
  console.log('Running round robin among all 8 meta archetypes (1 match each = 28 matches):');
  const t0 = Date.now();
  let matches = 0;
  for (let i = 0; i < archetypes.length; i++) {
    for (let j = i + 1; j < archetypes.length; j++) {
      const res = await runMatch(archetypes[i].paste, archetypes[j].paste);
      matches++;
      process.stdout.write(`.`);
    }
  }
  const elapsed = Date.now() - t0;
  console.log(`\nCompleted ${matches} matches in ${elapsed} ms (${(elapsed / matches).toFixed(1)} ms/match)`);
}

runBenchmark().catch(console.error);
