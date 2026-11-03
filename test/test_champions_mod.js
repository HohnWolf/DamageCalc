const { Dex, BattleStreams, RandomPlayerAI, Teams } = require('@pkmn/sim');

// Define champions mod data
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
  Abilities: {
    dragonize: {
      name: 'Dragonize',
      rating: 4,
      num: 1001,
      onModifyType(move, pokemon) {
        if (move.type === 'Normal' && !['judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'weatherball'].includes(move.id) && !(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
          move.type = 'Dragon';
          move.typeChangerBoosted = this.effect;
        }
      },
      onBasePowerPriority: 23,
      onBasePower(basePower, pokemon, target, move) {
        if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
      },
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

const t1 = Teams.pack(Teams.import(`
Feraligatr @ Feraligite
Ability: Sheer Force
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Liquidation
- Return
- Crunch
- Protect

Pikachu @ Light Ball
Ability: Lightning Rod
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Volt Switch
- Grass Knot
- Protect
`));

const t2 = Teams.pack(Teams.import(`
Charizard @ Charizardite Y
Ability: Blaze
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Weather Ball
- Protect

Venusaur @ Venusaurite
Ability: Overgrow
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Energy Ball
- Sludge Bomb
- Earth Power
- Protect
`));

async function run() {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const p1 = new RandomPlayerAI(streams.p1);
  const p2 = new RandomPlayerAI(streams.p2);
  p1.mega = 1;
  p2.mega = 1;

  p1.start();
  p2.start();

  let events = [];
  let winner = null;
  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.includes('|-mega|') || line.includes('|-ability|')) {
          events.push(line);
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
  console.log('Battle finished! Winner:', winner);
  console.log('Events:', events);
}
run().catch(console.error);
