const { BattleStreams, Teams, Dex } = require('@pkmn/sim');
const ChampionsBot = require('../js/sim_bot.js');
const archetypes = require('../data/meta_archetypes.js');

// Register Champions mod
Dex.mod('champions', {
  Pokedex: {
    feraligatr: {
      inherit: true,
      otherFormes: ['Feraligatr-Mega'],
      formeOrder: ['Feraligatr', 'Feraligatr-Mega'],
    },
    feraligatrmega: {
      name: 'Feraligatr-Mega',
      baseSpecies: 'Feraligatr',
      forme: 'Mega',
      types: ['Water', 'Dragon'],
      baseStats: { hp: 85, atk: 160, def: 125, spa: 89, spd: 93, spe: 78 },
      abilities: { 0: 'Dragonize' },
      weightkg: 108.8,
      requiredItem: 'Feraligite',
    }
  },
  Items: {
    feraligite: {
      name: 'Feraligite',
      spritenum: 549,
      megaStone: 'Feraligatr-Mega',
      megaEvolves: 'Feraligatr',
      itemUser: ['Feraligatr'],
    }
  },
  Formats: [
    {
      name: '[Gen 9 Champions] VGC 2026 Reg M-C',
      mod: 'champions',
      gameType: 'doubles',
      ruleset: ['Flat Rules', 'NatDex Mod'],
    }
  ]
});

async function runMatch(team1Text, team2Text) {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const t1 = Teams.pack(Teams.import(team1Text));
  const t2 = Teams.pack(Teams.import(team2Text));

  const p1 = new ChampionsBot(streams.p1);
  const p2 = new ChampionsBot(streams.p2);

  p1.start();
  p2.start();

  let winner = null;
  const turns = [];
  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|turn|')) turns.push(line);
        if (line.startsWith('|win|')) {
          winner = line.split('|')[2];
        }
      }
    }
  })();

  await streams.omniscient.write('>start {"formatid":"gen9championsvgc2026regmc"}\n');
  await streams.omniscient.write(`>player p1 {"name":"Team Sun","team":"${t1}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"Team Rain","team":"${t2}"}\n`);

  await readPromise;
  return { winner, turnCount: turns.length };
}

async function main() {
  console.log('Testing ChampionsBot with Sun vs Rain:');
  const t0 = Date.now();
  const res = await runMatch(archetypes[0].paste, archetypes[1].paste);
  console.log('Match finished in', Date.now() - t0, 'ms');
  console.log('Winner:', res.winner, 'in', res.turnCount, 'turns');
}

main().catch(console.error);
