// Electron: Klick auf „Projektor“ im Shiny-Zähler öffnet ein sichtbares Fenster. Ohne Aufnahme gibt es einen deutschen Hinweis.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
let electron;
try { electron = require('electron'); } catch (e) { electron = ''; }
if (!electron || typeof electron !== 'string' || !fs.existsSync(electron)) {
  console.log('SKIP: Electron-Binary fehlt');
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-click-'));
const child = cp.spawn('xvfb-run', ['-a', '-s', '-screen 0 1600x900x24', electron, '.', '--projector-click-test', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], {
  cwd: ROOT,
  env: Object.assign({}, process.env, { RL_SHOT_DIR: dir, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }),
  stdio: ['ignore', 'pipe', 'pipe']
});
let out = '';
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });
const timer = setTimeout(() => { child.kill('SIGKILL'); }, 90000);
child.on('exit', (code) => {
  clearTimeout(timer);
  let result = null;
  try { result = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8')); } catch (e) { result = null; }
  if (!result) {
    console.log(out.slice(-2500));
    console.log('FAIL keine Ergebnisdatei, Exit ' + code);
    process.exit(1);
  }
  function need(cond, msg) { if (!cond) { console.log('FAIL ' + msg); process.exitCode = 1; } else console.log('ok   ' + msg); }
  need(/Aufnahme/.test(result.noVideoToast || ''), 'ohne Aufnahme ein deutscher Hinweis');
  need(result.click && result.click.visible, 'Klick öffnet ein sichtbares Projektor-Fenster');
  var center = result.click && result.click.sample && result.click.sample.center;
  need(center && center.r > 170 && center.b > 170 && center.g < 90, 'Projektor zeigt das Rohbild (nicht schwarz)');
  need(result.bare && result.bare.yellow === 0 && result.bare.blue > 0, 'Gelber Erkennungsrahmen bleibt draußen');
  need(result.click && result.click.audio && result.click.audio.playing && result.click.audio.peak > 8 && result.click.audio.underruns === 0, 'Ton läuft durch, ohne Aussetzer');
  need(result.previewMuted, 'Vorschau im Hauptfenster bleibt stumm');
  need(result.menu && !result.menu.hidden && /Ton/.test(result.menu.text) && result.menu.hasRange, 'Rechtsklick: Ton und Lautstärke');
  need(result.saved && result.saved.sound === false && result.saved.volume === 35, 'Ton und Lautstärke liegen in cc_shiny.projector');
  need(result.hotkey && result.hotkey.accel === 'CommandOrControl+Alt+P' && result.hotkey.visible, 'Strg+Alt+P öffnet das Fenster');
  need(code === 0 && result.ok, 'Electron beendet sich sauber');
  if (process.exitCode) { console.log(JSON.stringify(result, null, 2).slice(0, 4000)); console.log(out.slice(-2000)); }
  else console.log('Projektor-Klick-Test OK');
});
