const { Dex, BattleStreams, Teams } = require('@pkmn/sim');
const ChampionsBot = require('../js/sim_bot.js');

Dex.mod('champions', {
  Scripts: {
    init() {
      for (const i in this.data.Moves) {
        if (this.data.Moves[i].pp > 20) {
          this.modData('Moves', i).pp = 20;
        }
      }
    },
    statModify(baseStats, set, statName) {
      const tr = this.trunc;
      let stat = baseStats[statName];
      const evs = set.evs[statName] || 0;
      if (statName === 'hp') {
        return stat + evs + 75;
      }
      stat = stat + evs + 20;
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
      }
    }
  }
});

Dex.formats.extend([
  {
    name: '[Gen 9 Champions] VGC 2026 Reg M-C',
    mod: 'champions',
    gameType: 'doubles',
    ruleset: ['Flat Rules', 'NatDex Mod'],
  }
]);

const t1 = Teams.pack(Teams.import(`
Charizard @ Charizardite Y
Ability: Blaze
Level: 50
EVs: 30 SpA / 4 SpD / 32 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Weather Ball
- Protect

Whimsicott @ Focus Sash
Ability: Prankster
Level: 50
EVs: 32 HP / 4 Def / 30 Spe
Timid Nature
- Tailwind
- Moonblast
- Encore
- Protect
`));

const t2 = Teams.pack(Teams.import(`
Feraligatr @ Feraligite
Ability: Sheer Force
Level: 50
EVs: 32 Atk / 2 Def / 32 Spe
Adamant Nature
- Liquidation
- Return
- Crunch
- Protect

Pelipper @ Damp Rock
Ability: Drizzle
Level: 50
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Muddy Water
- Hurricane
- Tailwind
- Protect
`));

async function run() {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const champDex = Dex.mod('champions');
  const p1 = new ChampionsBot(streams.p1, { dex: champDex });
  const p2 = new ChampionsBot(streams.p2, { dex: champDex });

  p1.start();
  p2.start();

  let winner = null;
  const turns = [];
  const log = [];
  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      log.push(chunk);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|turn|')) turns.push(line);
        if (line.startsWith('|win|')) winner = line.split('|')[2];
      }
    }
  })();

  await streams.omniscient.write('>start {"formatid":"gen9championsvgc2026regmc"}\n');
  await streams.omniscient.write(`>player p1 {"name":"Player 1","team":"${t1}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"Player 2","team":"${t2}"}\n`);

  await readPromise;
  console.log('Battle finished! Winner:', winner, 'in', turns.length, 'turns');
  
  // Find switch lines to see initial HP
  const fullLog = log.join('\n');
  const switchLines = fullLog.split('\n').filter(l => l.startsWith('|switch|'));
  console.log('Initial HP of Pokémon in Champions formula:');
  switchLines.forEach(l => console.log(' ', l));
}

run().catch(console.error);
