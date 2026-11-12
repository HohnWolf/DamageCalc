#!/usr/bin/env node
// Pin and bundle the official Pokémon Showdown simulator (MIT) for local play only.
// Commit: data/mods/champions + format gen9championsvgc2026regmc.
// Output is sim/ + data/ (plus lib/utils, which sim imports) transpiled with esbuild.
// No server, no ladder, no network. Dynamic data loads stay as require() next to the files.
'use strict';
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const COMMIT = '965a535ef892d13cd68cf75c076db26f9f32842a';
const SRC = process.env.PS_SRC || '/tmp/ps-src';
const OUT = path.join(__dirname, '..', 'vendor', 'ps');

const DATA_FILES = [
  'abilities.ts', 'aliases.ts', 'conditions.ts', 'formats-data.ts', 'items.ts',
  'learnsets.ts', 'moves.ts', 'natures.ts', 'pokedex.ts', 'pokemongo.ts',
  'rulesets.ts', 'scripts.ts', 'typechart.ts', 'tags.ts'
];

function walkTs(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTs(p, acc);
    else if (name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

function rel(p) { return path.relative(SRC, p).split(path.sep).join('/'); }

async function main() {
  if (!fs.existsSync(path.join(SRC, 'sim', 'battle.ts'))) {
    console.error('Showdown source missing at ' + SRC + '. Download commit ' + COMMIT + ' first.');
    process.exit(1);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const entries = [];
  for (const name of fs.readdirSync(path.join(SRC, 'sim'))) {
    if (!name.endsWith('.ts')) continue;
    if (name === 'index.ts' || name === 'global-types.ts' || name === 'battle-stream.ts') continue;
    entries.push(path.join(SRC, 'sim', name));
  }
  entries.push(path.join(SRC, 'lib', 'utils.ts'));
  for (const name of DATA_FILES) {
    const p = path.join(SRC, 'data', name);
    if (fs.existsSync(p)) entries.push(p);
  }
  for (const mod of ['champions', 'championsregmb']) {
    walkTs(path.join(SRC, 'data', 'mods', mod), entries);
  }

  await esbuild.build({
    entryPoints: entries,
    outdir: OUT,
    outbase: SRC,
    format: 'cjs',
    platform: 'node',
    target: 'node22',
    packages: 'external',
    bundle: false,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'warning'
  });

  const prngPath = path.join(OUT, 'sim', 'prng.js');
  let prng = fs.readFileSync(prngPath, 'utf8');
  if (!/ts-chacha20/.test(prng)) throw new Error('expected ts-chacha20 import in prng.js');
  prng = prng.replace(
    /require\((['"])ts-chacha20\1\)/g,
    '{ Chacha20: function () { throw new Error("sodium RNG is not bundled; pass a numeric gen-5 seed"); } }'
  );
  fs.writeFileSync(prngPath, prng);

  fs.mkdirSync(path.join(OUT, 'config'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'config', 'formats.js'), FORMATS);
  fs.writeFileSync(path.join(OUT, 'index.js'), INDEX);
  fs.writeFileSync(path.join(OUT, 'PIN'), COMMIT + '\n');
  fs.copyFileSync(path.join(SRC, 'LICENSE'), path.join(OUT, 'LICENSE'));
  fs.writeFileSync(path.join(OUT, 'NOTICE'), NOTICE);

  const bytes = dirSize(OUT);
  console.log('bundled ' + entries.length + ' files -> ' + OUT + ' (' + (bytes / 1048576).toFixed(1) + ' MiB)');
  console.log('commit ' + COMMIT);
}

function dirSize(dir) {
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    n += st.isDirectory() ? dirSize(p) : st.size;
  }
  return n;
}

const FORMATS = `'use strict';
// Only the Champions VGC formats. Regulation switch: change FORMAT_ID in js/meta/format.js.
// Names match the official config/formats.ts entries so the ids stay
// gen9championsvgc2026regmc and gen9championsvgc2026regmb.
exports.Formats = [
  {
    name: "[Gen 9 Champions] VGC 2026 Reg M-C",
    mod: "champions",
    gameType: "doubles",
    bestOfDefault: true,
    ruleset: ["Flat Rules", "VGC Timer", "Open Team Sheets"],
  },
  {
    name: "[Gen 9 Champions] VGC 2026 Reg M-B",
    mod: "championsregmb",
    gameType: "doubles",
    searchShow: false,
    bestOfDefault: true,
    ruleset: ["Flat Rules", "VGC Timer", "Open Team Sheets"],
  },
];
`;

const INDEX = `'use strict';
// Local entry. Does not load the Showdown server or lib/index (no network, no SQL).
const { Battle } = require('./sim/battle');
const { Teams } = require('./sim/teams');
const { TeamValidator } = require('./sim/team-validator');
const { Dex, toID } = require('./sim/dex');
const { PRNG } = require('./sim/prng');
module.exports = { Battle, Teams, TeamValidator, Dex, toID, PRNG };
`;

const NOTICE = `Pokémon Showdown simulator
https://github.com/smogon/pokemon-showdown
Pinned commit ${COMMIT} (master; includes data/mods/champions and gen9championsvgc2026regmc).

Copyright (c) 2011-2026 Guangcong Luo and other contributors
Licensed under the MIT License. The full text is in LICENSE next to this file.

Rattata Lab bundles only the simulator (sim/), the data it loads (data/, including
the champions mod), and lib/utils. The Showdown server, ladder, and replay host
are not included and are never contacted. Battles run on this machine.
`;

main().catch((e) => { console.error(e); process.exit(1); });
