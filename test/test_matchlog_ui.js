// Electron: Capture-Projektor enthält das Matchlog-Panel und der Kern ist geladen.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
let electron;
try { electron = require('electron'); } catch (e) { electron = ''; }
if (!electron || typeof electron !== 'string' || !fs.existsSync(electron)) {
  console.log('SKIP: Electron-Binary fehlt');
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-matchlog-'));
const electronArgs = ['.', '--matchlog-smoke', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];
const spawnOpts = { cwd: ROOT, env: Object.assign({}, process.env, { RL_SHOT_DIR: dir }), stdio: ['ignore', 'pipe', 'pipe'] };
const child = process.platform === 'linux'
  ? cp.spawn('xvfb-run', ['-a', '-s', '-screen 0 1400x900x24', electron].concat(electronArgs), spawnOpts)
  : cp.spawn(electron, electronArgs, spawnOpts);
let out = '';
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });
const timer = setTimeout(() => { child.kill('SIGKILL'); }, 60000);
child.on('exit', (code) => {
  clearTimeout(timer);
  let result = null;
  try { result = JSON.parse(fs.readFileSync(path.join(dir, 'matchlog-smoke.json'), 'utf8')); } catch (e) { result = null; }
  if (!result || !result.ok) {
    console.log((out || '').slice(-2000));
    console.log('FAIL Matchlog-Panel', result, 'exit', code);
    process.exit(1);
  }
  console.log('ok   Matchlog-Panel im Capture-Projektor');
  process.exit(0);
});
