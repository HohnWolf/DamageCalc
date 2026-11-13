// Electron unter xvfb: Hauptfenster mit gelbem Rahmen, Projektor nur mit dem rohen Bild (plus Kontextmenü).
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
let electron;
try { electron = require('electron'); } catch (e) { electron = ''; }
if (!electron || typeof electron !== 'string' || !fs.existsSync(electron)) {
  console.log('SKIP: Electron-Binary fehlt');
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-proj-'));
// Linux (CI): virtueller Bildschirm per xvfb-run. Windows/macOS haben einen echten Bildschirm, dort startet Electron direkt.
const electronArgs = ['.', '--projector-test', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];
const spawnOpts = {
  cwd: ROOT,
  env: Object.assign({}, process.env, { RL_SHOT_DIR: dir, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }),
  stdio: ['ignore', 'pipe', 'pipe']
};
const child = process.platform === 'linux'
  ? cp.spawn('xvfb-run', ['-a', '-s', '-screen 0 1600x900x24', electron].concat(electronArgs), spawnOpts)
  : cp.spawn(electron, electronArgs, spawnOpts);
let out = '';
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });
const timer = setTimeout(() => { child.kill('SIGKILL'); }, 45000);
child.on('exit', (code) => {
  clearTimeout(timer);
  const resultPath = path.join(dir, 'result.json');
  let result = null;
  try { result = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch (e) { result = null; }
  const art = process.platform === 'linux' ? '/opt/cursor/artifacts' : path.join(dir, 'artifacts');
  try { fs.mkdirSync(art, { recursive: true }); } catch (e) { /* */ }
  ['projector-main-with-box.png', 'projector-without-box.png', 'projector-context-menu.png'].forEach((f) => {
    const src = path.join(dir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(art, f));
  });
  if (!result) {
    console.log(out.slice(-2000));
    console.log('FAIL keine Ergebnisdatei, Exit ' + code);
    process.exit(1);
  }
  function need(cond, msg) { if (!cond) { console.log('FAIL ' + msg); process.exitCode = 1; } else console.log('ok   ' + msg); }
  need(result.mainYellow, 'Hauptfenster zeigt den gelben Rahmen');
  need(result.projMagenta, 'Projektor zeigt das rohe Bild');
  need(result.projNoYellow, 'Projektor ohne gelben Rahmen');
  need(result.projBlue, 'Projektor enthält die Markierung des Rohbilds');
  need(result.menuDark, 'Kontextmenü ist sichtbar');
  need(code === 0 && result.ok, 'Electron beendet sich sauber');
  if (process.exitCode) { console.log(JSON.stringify(result, null, 2)); console.log(out.slice(-2500)); }
  else console.log('Projektor-Fenster-Test OK');
});
