#!/usr/bin/env node
// Bundles the local Pokémon Showdown simulator (vendor/ps) + js/battle/session.js +
// js/meta/harness.js into a self-contained browser Web Worker (mobile/www/js/sim_worker.js)
// without modifying any files under vendor/ps/.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const esbuild = require(require.resolve('esbuild', {
  paths: [__dirname, ROOT, path.join(ROOT, 'mobile')],
}));
const PS_DIR = path.join(ROOT, 'vendor', 'ps');
const DEFAULT_OUT = path.join(ROOT, 'mobile', 'www', 'js', 'sim_worker.js');

function collectPsModules() {
  const entries = [];
  const dataDir = path.join(PS_DIR, 'data');
  const modsDir = path.join(dataDir, 'mods');
  const configDir = path.join(PS_DIR, 'config');

  for (const name of fs.readdirSync(dataDir)) {
    const full = path.join(dataDir, name);
    if (name.endsWith('.js') && fs.statSync(full).isFile()) {
      entries.push({ key: 'data/' + name.slice(0, -3), file: full });
    }
  }

  const mods = [];
  if (fs.existsSync(modsDir)) {
    for (const mod of fs.readdirSync(modsDir).sort()) {
      const mdir = path.join(modsDir, mod);
      if (!fs.statSync(mdir).isDirectory()) continue;
      mods.push(mod);
      for (const name of fs.readdirSync(mdir)) {
        const full = path.join(mdir, name);
        if (name.endsWith('.js') && fs.statSync(full).isFile()) {
          entries.push({ key: 'data/mods/' + mod + '/' + name.slice(0, -3), file: full });
        }
      }
    }
  }

  if (fs.existsSync(configDir)) {
    for (const name of fs.readdirSync(configDir)) {
      const full = path.join(configDir, name);
      if (name.endsWith('.js') && fs.statSync(full).isFile()) {
        entries.push({ key: 'config/' + name.slice(0, -3), file: full });
      }
    }
  }

  return { entries, mods };
}

function buildRegistrySource(entries, mods) {
  const lines = [
    '"use strict";',
    'const MODS = ' + JSON.stringify(mods) + ';',
    'const REGISTRY = {',
  ];
  for (const item of entries) {
    lines.push('  ' + JSON.stringify(item.key) + ': () => require(' + JSON.stringify(item.file) + '),');
  }
  lines.push('};');
  lines.push(`
function normalizePsKey(raw) {
  const parts = String(raw || '').replace(/\\\\/g, '/').split('/');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  let key = out.join('/');
  if (key.startsWith('ps/')) key = key.slice(3);
  if (key.endsWith('.js')) key = key.slice(0, -3);
  return key;
}

function psRequire(raw) {
  const key = normalizePsKey(raw);
  const loader = REGISTRY[key];
  if (!loader) {
    const err = new Error("Cannot find module '" + raw + "'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return loader();
}

function psResolve(raw) {
  const key = normalizePsKey(raw);
  if (!REGISTRY[key]) {
    const err = new Error("Cannot find module '" + raw + "'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return '/ps/' + key + '.js';
}

module.exports = { MODS, psRequire, psResolve };
`);
  return lines.join('\n');
}

const SHIM_PATH = `'use strict';
function normalizeParts(parts) {
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return out;
}
function resolve() {
  let acc = '';
  for (let i = 0; i < arguments.length; i++) {
    const p = String(arguments[i] || '').replace(/\\\\/g, '/');
    if (!p) continue;
    if (p.charAt(0) === '/') acc = p;
    else acc = acc ? (acc + '/' + p) : p;
  }
  return '/' + normalizeParts(acc.split('/')).join('/');
}
function join() {
  const raw = [];
  for (let i = 0; i < arguments.length; i++) {
    const p = String(arguments[i] || '').replace(/\\\\/g, '/');
    if (p) raw.push(p);
  }
  const joined = raw.join('/');
  const leading = joined.charAt(0) === '/' ? '/' : '';
  return leading + normalizeParts(joined.split('/')).join('/');
}
function dirname(p) {
  const s = String(p || '').replace(/\\\\/g, '/');
  const idx = s.lastIndexOf('/');
  return idx <= 0 ? '/' : s.slice(0, idx);
}
function basename(p) {
  const s = String(p || '').replace(/\\\\/g, '/');
  const idx = s.lastIndexOf('/');
  return idx < 0 ? s : s.slice(idx + 1);
}
module.exports = { sep: '/', resolve, join, dirname, basename };
`;

const SHIM_FS = `'use strict';
const { MODS } = require('virtual:ps-registry');
function readdirSync(dir) {
  const s = String(dir || '').replace(/\\\\/g, '/');
  if (s.endsWith('/mods') || s.includes('/data/mods')) return MODS.slice();
  return [];
}
function existsSync() { return false; }
function readFileSync(p) {
  const err = new Error('ENOENT: ' + p);
  err.code = 'ENOENT';
  throw err;
}
module.exports = { readdirSync, existsSync, readFileSync };
`;

const SHIM_UTIL = `'use strict';
function isDeepStrictEqual(a, b, seen) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date) return Object.is(a.getTime(), b.getTime());
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepStrictEqual(a[i], b[i], seen)) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !isDeepStrictEqual(v, b.get(k), seen)) return false;
    }
    return true;
  }
  seen = seen || new WeakMap();
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!isDeepStrictEqual(a[k], b[k], seen)) return false;
  }
  return true;
}
module.exports = {
  isDeepStrictEqual,
  inspect: { custom: Symbol.for('nodejs.util.inspect.custom') }
};
`;

const SHIM_CRYPTO = `'use strict';
module.exports = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : {
  getRandomValues(arr) {
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() * 0x100000000) >>> 0;
    return arr;
  }
};
`;

const SHIM_UNBUNDLED_RANDOM = `'use strict';
module.exports = {
  default: function UnbundledRandomTeams() {
    throw new Error('Random battle team generator is not bundled');
  }
};
`;

const WORKER_ENTRY = `'use strict';
const engine = require('./js/meta/engine');
const harness = require('./js/meta/harness');
const session = require('./js/battle/session');

let game = null;

function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  const id = msg.id;
  try {
    if (msg.type === 'ping') {
      self.postMessage({ id, ok: true, pong: true });
      return;
    }
    if (msg.type === 'battle:start') {
      const a = msg.packedA ? { ok: true, packed: msg.packedA } : engine.validatePaste(msg.pasteA);
      if (!a.ok) { self.postMessage({ id, ok: false, errors: a.errors || ['Ungültiges Team A.'] }); return; }
      const b = msg.packedB ? { ok: true, packed: msg.packedB } : engine.validatePaste(msg.pasteB);
      if (!b.ok) { self.postMessage({ id, ok: false, errors: b.errors || ['Ungültiges Team B.'] }); return; }
      game = session.create({
        packedA: a.packed,
        packedB: b.packed,
        level: msg.level,
        seed: msg.seed,
        nameA: msg.nameA || 'Du',
        nameB: msg.nameB || 'KI'
      });
      self.postMessage({ id, ok: true, view: game.view() });
      return;
    }
    if (msg.type === 'battle:choose') {
      if (!game) { self.postMessage({ id, ok: false, error: 'Kein Kampf.' }); return; }
      const res = game.choose(String(msg.choice || ''));
      self.postMessage(Object.assign({ id }, res));
      return;
    }
    if (msg.type === 'battle:forfeit') {
      if (!game) { self.postMessage({ id, ok: false, error: 'Kein Kampf.' }); return; }
      self.postMessage({ id, ok: true, view: game.forfeit() });
      return;
    }
    if (msg.type === 'meta:validate') {
      const r = engine.validatePaste(msg.paste);
      self.postMessage({ id, ok: !!r.ok, errors: r.errors || [], packed: r.packed || '' });
      return;
    }
    if (msg.type === 'meta:prepare') {
      const mine = engine.validatePaste(msg.paste);
      if (!mine.ok) { self.postMessage({ id, ok: false, errors: mine.errors || ['Ungültiges Team.'] }); return; }
      const opponents = [];
      const skipped = [];
      (msg.opponents || []).forEach(function (op) {
        const v = engine.validatePaste(op && op.paste);
        if (!v.ok) skipped.push({ id: op && op.id, name: op && op.name, errors: v.errors });
        else opponents.push({ id: op.id, name: op.name || op.id, archetype: op.archetype || '', packed: v.packed });
      });
      if (!opponents.length) {
        self.postMessage({ id, ok: false, errors: ['Kein legales Meta-Team ausgewählt.'], skipped });
        return;
      }
      self.postMessage({ id, ok: true, packedA: mine.packed, opponents, skipped });
      return;
    }
    if (msg.type === 'meta:match') {
      const result = harness.runMatchup({
        packedA: msg.packedA,
        packedB: msg.packedB,
        levelA: msg.levelA | 0,
        levelB: msg.levelB | 0,
        games: msg.games | 0,
        baseSeed: msg.baseSeed >>> 0,
        keepReplay: 2,
        maxTurns: msg.maxTurns,
        onGame: function (info) {
          self.postMessage({ type: 'meta:tick', jobId: msg.jobId, opId: msg.opId, index: info.index });
        }
      });
      const games = (result.games || []).map(function (g) {
        return { result: g.result, turns: g.turns, seed: g.seed, leads: g.leads, log: g.log };
      });
      self.postMessage({
        type: 'meta:done',
        jobId: msg.jobId,
        opId: msg.opId,
        result: {
          winsA: result.winsA, winsB: result.winsB, ties: result.ties,
          unfinished: result.unfinished, errors: result.errors,
          decided: result.decided, avgTurns: result.avgTurns, ci: result.ci,
          leads: result.leads, mvp: result.mvp, weakest: result.weakest,
          koMatrix: result.koMatrix, games: games
        }
      });
      return;
    }
    if (id != null) self.postMessage({ id, ok: false, error: 'Unbekannte Anweisung.' });
  } catch (e) {
    if (msg.type === 'meta:match') {
      self.postMessage({ type: 'meta:done', jobId: msg.jobId, opId: msg.opId, error: String(e && e.message || e) });
    } else if (id != null) {
      self.postMessage({ id, ok: false, error: String(e && e.message || e) });
    }
  }
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', function (ev) { handleMessage(ev.data); });
} else if (typeof self !== 'undefined') {
  self.onmessage = function (ev) { handleMessage(ev && ev.data !== undefined ? ev.data : ev); };
}
`;

function createPsWebPlugin() {
  const { entries, mods } = collectPsModules();
  const registrySrc = buildRegistrySource(entries, mods);
  const dexPath = path.join(PS_DIR, 'sim', 'dex.js');
  const dexFormatsPath = path.join(PS_DIR, 'sim', 'dex-formats.js');
  const dexTextPath = path.join(PS_DIR, 'sim', 'dex-text.js');
  const teamsPath = path.join(PS_DIR, 'sim', 'teams.js');

  return {
    name: 'ps-web-shims',
    setup(build) {
      build.onResolve({ filter: /^virtual:ps-registry$/ }, () => ({ path: 'virtual:ps-registry', namespace: 'ps-virtual' }));
      build.onResolve({ filter: /^(node:)?fs$/ }, () => ({ path: 'fs', namespace: 'ps-shim' }));
      build.onResolve({ filter: /^(node:)?path$/ }, () => ({ path: 'path', namespace: 'ps-shim' }));
      build.onResolve({ filter: /^(node:)?util$/ }, () => ({ path: 'util', namespace: 'ps-shim' }));
      build.onResolve({ filter: /^(node:)?crypto$/ }, () => ({ path: 'crypto', namespace: 'ps-shim' }));
      build.onResolve({ filter: /\/(random-teams|random-battles\/)/ }, () => ({ path: 'unbundled-random', namespace: 'ps-shim' }));

      build.onLoad({ filter: /.*/, namespace: 'ps-virtual' }, () => ({
        contents: registrySrc,
        loader: 'js',
        resolveDir: PS_DIR,
      }));

      build.onLoad({ filter: /.*/, namespace: 'ps-shim' }, (args) => {
        if (args.path === 'fs') return { contents: SHIM_FS, loader: 'js', resolveDir: PS_DIR };
        if (args.path === 'path') return { contents: SHIM_PATH, loader: 'js', resolveDir: PS_DIR };
        if (args.path === 'util') return { contents: SHIM_UTIL, loader: 'js', resolveDir: PS_DIR };
        if (args.path === 'crypto') return { contents: SHIM_CRYPTO, loader: 'js', resolveDir: PS_DIR };
        if (args.path === 'unbundled-random') return { contents: SHIM_UNBUNDLED_RANDOM, loader: 'js', resolveDir: PS_DIR };
        return null;
      });

      build.onLoad({ filter: /[\\/]vendor[\\/]ps[\\/]sim[\\/](?:dex(?:-formats|-text)?|teams)\.js$/ }, (args) => {
        const resolved = path.resolve(args.path);
        let src = fs.readFileSync(resolved, 'utf8');
        if (resolved === teamsPath) {
          src = src.replace(
            /require\(`\.\.\/data\/random-battles\/\$\{mod\}\/teams`\)/g,
            '{ default: function () { throw new Error("Random battle team generator is not bundled"); } }'
          );
          return { contents: src, loader: 'js', resolveDir: path.dirname(resolved) };
        }
        const header = 'const __dirname = "/ps/sim";\nconst { psRequire: __psRequire, psResolve: __psResolve } = require("virtual:ps-registry");\n';

        if (resolved === dexPath) {
          src = src
            .replace(/require\(filePath\)/g, '__psRequire(filePath)')
            .replace(/require\(path\.resolve\(DATA_DIR,\s*"aliases"\)\)/g, '__psRequire(path.resolve(DATA_DIR, "aliases"))');
          return { contents: header + src, loader: 'js', resolveDir: path.dirname(resolved) };
        }
        if (resolved === dexFormatsPath) {
          src = src
            .replace(/require\(`\$\{__dirname\}\/\.\.\/config\/custom-formats`\)/g, '__psRequire(`${__dirname}/../config/custom-formats`)')
            .replace(/require\(`\$\{__dirname\}\/\.\.\/config\/formats`\)/g, '__psRequire(`${__dirname}/../config/formats`)');
          return { contents: header + src, loader: 'js', resolveDir: path.dirname(resolved) };
        }
        if (resolved === dexTextPath) {
          src = src
            .replace(/require\.resolve\(filePath\)/g, '__psResolve(filePath)')
            .replace(/require\(filePath\)/g, '__psRequire(filePath)');
          return { contents: header + src, loader: 'js', resolveDir: path.dirname(resolved) };
        }
        return null;
      });
    }
  };
}

async function buildSimWorker(opts) {
  opts = opts || {};
  const outfile = path.resolve(opts.outfile || DEFAULT_OUT);
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  await esbuild.build({
    stdin: {
      contents: WORKER_ENTRY,
      resolveDir: ROOT,
      sourcefile: 'sim_worker_entry.js',
      loader: 'js',
    },
    outfile,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: opts.minify !== false,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'warning',
    plugins: [createPsWebPlugin()],
  });

  const size = fs.statSync(outfile).size;
  return { outfile, size };
}

if (require.main === module) {
  const outArg = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUT;
  buildSimWorker({ outfile: outArg }).then(
    (res) => {
      console.log('sim_worker gebaut -> ' + res.outfile + ' (' + (res.size / 1048576).toFixed(2) + ' MiB)');
    },
    (err) => {
      console.error(err);
      process.exit(1);
    }
  );
}

module.exports = { buildSimWorker };
