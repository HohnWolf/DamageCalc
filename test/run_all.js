// Startet alle test/test_*.js nacheinander (npm test). Ein Test schlägt fehl, wenn sein Exit-Code nicht 0 ist.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const only = process.argv[2]; // optional: Teil des Dateinamens, z. B. "save"
const files = fs.readdirSync(__dirname).filter(f => /^test_.*\.js$/.test(f) && (!only || f.includes(only))).sort();
let failed = [];
for (const f of files) {
  const t = Date.now();
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + f + ' (' + (Date.now() - t) + ' ms)');
  if (!ok) { failed.push(f); console.log(((r.stdout || '') + (r.stderr || '')).split('\n').slice(-15).join('\n')); }
}
console.log('\n' + (files.length - failed.length) + '/' + files.length + ' Tests bestanden');
process.exit(failed.length ? 1 : 0);
