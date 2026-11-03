const { BattleStreams, RandomPlayerAI, Teams } = require('@pkmn/sim');

const t1 = Teams.pack(Teams.import(`
Charizard @ Charizardite Y
Ability: Blaze
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Weather Ball
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
Blastoise @ Blastoisinite
Ability: Torrent
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Water Pulse
- Aura Sphere
- Ice Beam
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

  let megaEvents = [];
  let winner = null;
  const readPromise = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.includes('|-mega|')) {
          megaEvents.push(line);
        }
        if (line.startsWith('|win|')) {
          winner = line.split('|')[2];
        }
      }
    }
  })();

  await streams.omniscient.write('>start {"formatid":"gen9nationaldexdoubles"}\n');
  await streams.omniscient.write(`>player p1 {"name":"P1","team":"${t1}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"P2","team":"${t2}"}\n`);

  await readPromise;
  console.log('Battle finished! Winner:', winner);
  console.log('Mega events:', megaEvents);
}
run().catch(console.error);
