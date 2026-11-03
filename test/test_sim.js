const { BattleStreams, RandomPlayerAI, Teams } = require('@pkmn/sim');

const team1 = `
Pikachu @ Light Ball
Ability: Lightning Rod
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Volt Switch
- Grass Knot
- Protect

Charizard @ Choice Specs
Ability: Solar Power
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Flamethrower
- Air Slash
- Heat Wave
- Focus Blast
`;

const team2 = `
Blastoise @ Sitrus Berry
Ability: Torrent
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Water Spout
- Hydro Pump
- Ice Beam
- Protect

Venusaur @ Life Orb
Ability: Overgrow
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Energy Ball
- Sludge Bomb
- Earth Power
- Protect
`;

const t1 = Teams.pack(Teams.import(team1));
const t2 = Teams.pack(Teams.import(team2));

async function run() {
  const battleStream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(battleStream);

  const p1 = new RandomPlayerAI(streams.p1);
  const p2 = new RandomPlayerAI(streams.p2);

  p1.start();
  p2.start();

  let winner = null;
  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|win|')) {
          winner = line.split('|')[2];
        }
      }
    }
  })();

  await streams.omniscient.write(`>start {"formatid":"gen9doublesou"}\n`);
  await streams.omniscient.write(`>player p1 {"name":"Player 1","team":"${t1}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"Player 2","team":"${t2}"}\n`);

  await readPromise;
  console.log('Battle finished! Winner:', winner);
}

run().catch(console.error);
