const fs = require('fs');
const vm = require('vm');
const archetypes = require('../data/meta_archetypes.js');

const sandbox = {
  self: {
    postMessage: (msg) => {
      if (msg.type === 'PROGRESS') {
        process.stdout.write(`[${msg.archetypeName}] ${msg.currentMatch}/${msg.matchesPerArchetype} (Winrate: ${msg.currentArchWinrate}%)\r`);
      } else if (msg.type === 'COMPLETE') {
        console.log('\n--- SIMULATION COMPLETE ---');
        console.log('Total matches:', msg.totalMatches);
        console.log('Overall winrate:', msg.overallWinrate + '%');
        console.log('Duration:', msg.durationMs, 'ms');
        console.log('Results per archetype:');
        msg.results.forEach(r => console.log(`  ${r.name}: ${r.wins}/${r.total} (${r.winrate}%) - Avg turns: ${r.avgTurns}`));
        console.log('Top Threats:', msg.threatList.slice(0, 3).map(t => `${t.mon} (${t.kills} KOs)`).join(', '));
        console.log('Top Leads:', msg.leadPerformance.slice(0, 3).map(l => `${l.lead} (${l.winrate}%)`).join(', '));
      } else if (msg.type === 'ERROR') {
        console.error('Error from worker:', msg.error);
      }
    }
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  JSON: JSON,
  parseInt: parseInt
};
sandbox.self.self = sandbox.self;

const bundleCode = fs.readFileSync('js/sim_worker.bundle.js', 'utf8');
vm.runInNewContext(bundleCode, sandbox);

console.log('Bundle loaded successfully! Starting simulation with Sun team (5 matches per archetype = 40 matches)...');
sandbox.self.onmessage({
  data: {
    type: 'START',
    userTeamPaste: archetypes[0].paste, // Charizard Sun
    matchesPerArchetype: 10
  }
});
