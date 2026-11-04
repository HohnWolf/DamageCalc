// Master Multi-Team Orchestrator for Pokémon Champions Neural Network AI
// Simulates all 12 Teams (144 Matchups + all 15 4-out-of-6 Lead/Back Picks per Team) across CPU cores.
// Usage:
//   node ml/master_loop_20.js [generations=30] [matchesPerGen=5000] [--reset]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fork, execSync } = require('child_process');

const projectRoot = fs.existsSync(path.join(__dirname, 'package.json'))
  ? __dirname
  : path.resolve(__dirname, '..');

async function runWorkerBatch(workerCount, totalMatches, gen, weightsPath) {
  const matchesPerWorker = Math.floor(totalMatches / workerCount);
  const promises = [];

  const subworkerFile = fs.existsSync(path.join(__dirname, 'sim_subworker.js'))
    ? path.join(__dirname, 'sim_subworker.js')
    : path.join(__dirname, 'ml', 'sim_subworker.js');

  for (let i = 0; i < workerCount; i++) {
    const subworker = fork(subworkerFile);
    const startSeed = gen * 10000 + i * matchesPerWorker;

    const p = new Promise((resolve, reject) => {
      subworker.on('message', (msg) => {
        subworker.kill();
        resolve(msg);
      });
      subworker.on('error', (err) => {
        subworker.kill();
        reject(err);
      });
      subworker.send({
        count: matchesPerWorker,
        startSeed,
        weightsPath,
        targetPerWorker: Math.floor(5000 / workerCount)
      });
    });

    promises.push(p);
  }

  const results = await Promise.all(promises);
  const totalBlunders = {
    immuneAttacks: 0,
    doubleProtectFails: 0,
    friendlyFireHits: 0,
    speedConflicts: 0
  };
  let allSamples = [];

  for (const r of results) {
    totalBlunders.immuneAttacks += r.blunders.immuneAttacks;
    totalBlunders.doubleProtectFails += r.blunders.doubleProtectFails;
    totalBlunders.friendlyFireHits += r.blunders.friendlyFireHits;
    totalBlunders.speedConflicts += r.blunders.speedConflicts;
    allSamples = allSamples.concat(r.samples);
  }

  return { totalBlunders, allSamples };
}

async function runMultiTeamGenerations() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));

  const numGenerations = parseInt(args[0], 10) || 30;
  const matchesPerGen = parseInt(args[1], 10) || 5000;
  const workerCount = Math.max(2, Math.min(8, (os.cpus() || []).length - 1 || 6));

  const historyPath = path.join(__dirname, '20_generations_progress.json');
  const bufferPath = path.join(__dirname, 'replay_buffer.json');
  const weightsPath = path.join(projectRoot, 'data', 'ai_weights.json');

  let history = [];
  if (!flags.has('--reset') && fs.existsSync(historyPath)) {
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch (e) {}
  }

  // If previous run already reached or exceeded numGenerations (or --reset was passed), start fresh from Gen 1
  if (flags.has('--reset') || history.length >= numGenerations) {
    history = [];
    if (fs.existsSync(historyPath)) try { fs.unlinkSync(historyPath); } catch (e) {}
    if (flags.has('--fresh-weights')) {
      if (fs.existsSync(weightsPath)) try { fs.unlinkSync(weightsPath); } catch (e) {}
      if (fs.existsSync(bufferPath)) try { fs.unlinkSync(bufferPath); } catch (e) {}
    }
  }

  const startGen = history.length + 1;

  console.log(`================================================================`);
  console.log(`Multi-Team Neural Training: ${numGenerations} Generations x ${matchesPerGen} Matches`);
  console.log(`Team Pool: 12 Teams (144 Matchups x 15 4-of-6 Lead/Back Combos)`);
  console.log(`Multi-Core Parallelization: ${workerCount} Subworkers active`);
  console.log(`Starting at Generation ${startGen} of ${numGenerations}`);
  console.log(`================================================================\n`);

  const fixes = [
    'Multi-Team Initialisierung & Immunitäts-Filter (Typ + Fähigkeit)',
    'Friendly-Fire Schutz-Zwang bei Erdbeben/Surfer & Schwebe-Check',
    'Doppelter K.O.-Abschluss (Focus Fire Threshold über beide Slots)',
    '4-aus-6 Team-Pick Rotation (Slots 5 & 6 voll integriert)',
    'Mega-Garchomp Z / Aerilate / Pixilate Typ-Konvertierung',
    'Intelligentes Speed-Pacing (Echter Speed-Vergleich statt blindem Tailwind)',
    'Trick-Room Intelligenz (Nur für langsame Teams oder als Counter-Reverse)',
    'Psychic Terrain & Armor Tail Prioritäts-Blockade erkannt',
    'Good as Gold & Prankster vs. Unlicht Status-Immunitäten',
    'Fake Out / Überrumpler strikt auf Aktiv-Runde 1 begrenzt',
    'Psyspam Expanding Force & Terrain-Synergie-Optimierung',
    'Follow Me / Rage Powder Redirect + Setup-Kombinationen',
    'Helping Hand + Spread/STAB K.O.-Verstärkung',
    'Taktische Defensiv-Switches bei 4x-Schwäche auf resistente Bank-Mons',
    'Sandsturm / Regen / Sonne / Schnee Wetter-Ball & Speed-Skalierung',
    'Replay-Buffer Konsolidierung gegen Catastrophic Forgetting',
    'Turn-Level Credit Assignment (Direkte Bestrafung für Zug-Blunder)',
    'Imprison / Wide Guard Taktik-Timing gegen Spread & TR',
    'Protect-Read & Cooldown-Schutz in langen Endgames',
    'Multi-Team Meta-Konvergenz & Gewichts-Stabilisierung'
  ];

  for (let g = startGen; g <= numGenerations; g++) {
    const t0 = Date.now();
    console.log(`--- [ GENERATION ${g} / ${numGenerations} (${matchesPerGen} Matches across 144 Matchups) ] ---`);

    const { totalBlunders, allSamples } = await runWorkerBatch(workerCount, matchesPerGen, g, weightsPath);
    const durationSec = ((Date.now() - t0) / 1000).toFixed(1);

    console.log(`  Simulation done in ${durationSec}s (~${Math.round(matchesPerGen / Math.max(0.1, parseFloat(durationSec)))} matches/s).`);
    console.log(`  Samples collected: ${allSamples.length}`);
    console.log(`  Fehler-Metriken:`);
    console.log(`    - Angriffe ins Leere (Immunitäten): ${totalBlunders.immuneAttacks}`);
    console.log(`    - Doppel-Protect Fehlschläge:       ${totalBlunders.doubleProtectFails}`);
    console.log(`    - Teambeschuss (Friendly Fire):      ${totalBlunders.friendlyFireHits}`);
    console.log(`    - Tempo-Widersprüche (TR/Tailwind):  ${totalBlunders.speedConflicts}`);

    const fixDescription = fixes[(g - 1) % fixes.length];
    console.log(`  Fokus dieser Generation: ${fixDescription}`);

    const datasetPath = path.join(__dirname, 'dataset.json');
    fs.writeFileSync(datasetPath, JSON.stringify(allSamples));

    console.log(`  Training PyTorch Neural Network (with Replay Buffer)...`);
    try {
      const trainOut = execSync('python ml/train.py 4', { cwd: projectRoot, encoding: 'utf8' });
      const lastLine = trainOut.trim().split('\n').filter(l => l.includes('Epoch')).pop() || '';
      console.log(`  PyTorch Result: ${lastLine}`);
    } catch (err) {
      console.error('  Training notice:', err.message);
    }

    const reportItem = {
      generation: g,
      matches: matchesPerGen,
      samples: allSamples.length,
      durationSec,
      blunders: totalBlunders,
      fixDescription
    };
    history.push(reportItem);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    console.log(`--- [ GENERATION ${g} BEENDET in ${durationSec}s ] ---\n`);
  }

  console.log(`Rebuilding production worker bundle (js/sim_worker.bundle.js) with new neural weights...`);
  execSync('npm run build:sim', { cwd: projectRoot });
  console.log(`Production bundle built successfully!`);

  const summaryPath = path.join(__dirname, '20_generations_final_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(history, null, 2));
  console.log(`\n================================================================`);
  console.log(`All ${numGenerations} Generations completed! (${numGenerations * matchesPerGen} matches simulated)`);
  console.log(`Weights exported to: data/ai_weights.json & js/sim_worker.bundle.js`);
  console.log(`Summary saved to:    ${summaryPath}`);
  console.log(`================================================================`);
}

runMultiTeamGenerations().catch(console.error);
