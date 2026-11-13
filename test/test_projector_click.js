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
// Linux (CI): virtueller Bildschirm per xvfb-run. Windows/macOS haben einen echten Bildschirm, dort startet Electron direkt.
const electronArgs = ['.', '--projector-click-test', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-dark-mode', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
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
  need(/Aufnahme|capture/i.test(result.noVideoToast || ''), 'ohne Aufnahme ein Hinweis');
  need(result.click && result.click.visible, 'Klick öffnet ein sichtbares Projektor-Fenster');
  var left = result.click && result.click.sample && result.click.sample.left;
  var right = result.click && result.click.sample && result.click.sample.right;
  var ov = result.click && result.click.frames && result.click.frames.overlay;
  var fr = result.click && result.click.frames && result.click.frames.frames;
  need(ov && !ov.hidden && /127\.0\.0\.1:\d+\/overlay/.test(ov.src) && /transparent=1/.test(ov.src), 'echtes Overlay liegt über dem Bild');
  need(fr && fr.n > 0 && fr.w > 1, 'Bilder kommen im Projektor an');
  need(left && left.r > 220 && left.g < 40 && left.b < 40 && right && right.g > 220 && right.r < 40 && right.b < 40, 'Rot und Grün scheinen durch das Overlay');
  need(result.bare && result.bare.yellow === 0, 'Gelber Erkennungsrahmen bleibt draußen');
  need(result.click && result.click.audio && result.click.audio.playing && result.click.audio.tracks > 0, 'Projektor spielt die Tonspur der Aufnahme');
  need(result.previewMuted, 'Vorschau im Hauptfenster bleibt stumm');
  need(result.menu && !result.menu.hidden && /Ton|Sound|Audio/i.test(result.menu.text) && /Diagnose|Diagnostics/i.test(result.menu.text) && result.menu.hasRange, 'Rechtsklick: Ton, Lautstärke und Diagnose');
  need(result.saved && result.saved.sound === false && result.saved.volume === 35, 'Ton und Lautstärke liegen in cc_shiny.projector');
  need(result.counterOff && result.counterOff.on === false, 'Zähler lässt sich ausblenden');
  need(result.counterDrag && result.counterDrag.x > result.counterBefore.x && result.counterDrag.pointer === 'auto', 'Zähler lässt sich verschieben');
  need(result.counterReset && result.counterReset.x === 2 && result.counterReset.y === 2 && result.counterReset.scale === 100, 'Zählerposition lässt sich zurücksetzen');
  need(result.hotkey && result.hotkey.accel === 'CommandOrControl+Alt+P' && result.hotkey.visible, 'Strg+Alt+P öffnet das Fenster');
  need(code === 0 && result.ok, 'Electron beendet sich sauber');
  if (process.exitCode) { console.log(JSON.stringify(result, null, 2).slice(0, 4000)); console.log(out.slice(-2000)); }
  else console.log('Projektor-Klick-Test OK');
});
