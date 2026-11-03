const { BattleStreams, Teams } = require('@pkmn/sim');
const archetypes = require('../data/meta_archetypes.js');
const t1 = Teams.pack(Teams.import(archetypes[0].paste));
const t2 = Teams.pack(Teams.import(archetypes[1].paste));

async function run() {
  const stream = new BattleStreams.BattleStream();
  const streams = BattleStreams.getPlayerStreams(stream);

  let capturedRequest = null;
  class InspectorBot extends BattleStreams.BattlePlayer {
    receiveRequest(request) {
      if (request.active && !capturedRequest) {
        capturedRequest = request;
        console.log('Active count:', request.active.length);
        console.log('Slot 0 active:', JSON.stringify(request.active[0], null, 2));
        console.log('Side pokemon 0:', JSON.stringify(request.side.pokemon[0], null, 2));
        return;
      }
      if (request.teamPreview) this.choose('team 1234');
      else if (request.forceSwitch) this.choose('pass');
      else if (request.active) this.choose('move 1, move 1');
    }
  }

  const p1 = new InspectorBot(streams.p1);
  const p2 = new InspectorBot(streams.p2);
  p1.start();
  p2.start();

  await streams.omniscient.write('>start {"formatid":"gen9nationaldexdoubles"}\n');
  await streams.omniscient.write(`>player p1 {"name":"P1","team":"${t1}"}\n`);
  await streams.omniscient.write(`>player p2 {"name":"P2","team":"${t2}"}\n`);

  await new Promise(r => setTimeout(r, 200));
  console.log('Active count:', capturedRequest.active.length);
  console.log('Slot 0 active:', JSON.stringify(capturedRequest.active[0], null, 2));
  console.log('Side pokemon 0:', JSON.stringify(capturedRequest.side.pokemon[0], null, 2));
}
run().catch(console.error);
