// Neue Teambuilder- und Einstellungs-Funktionen: Versions-Dropdown, Versionen vergleichen, Regel-Check, QR-Code
// (erzeugen und aus einem Bild lesen, mit Teamname), Tastenkürzel, Schrift/Animationen, Sprite-Stil.
// Dazu ohne Electron: Discord-Webhook-Prüfung und Aufteilung der Dateien (electron/shiny.js).
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const Module = require('module');
let bad = 0;
function fail(m) { bad++; console.log('FAIL ' + m); }
function ok(m) { console.log('ok   ' + m); }

// ---------- Discord (Hauptprozess) mit nachgebautem electron und fetch ----------
(async function () {
  const clips = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-clips-'));
  const handlers = {};
  const fakeElectron = {
    app: { getPath: (k) => (k === 'videos' ? path.dirname(clips) : os.tmpdir()), on() {} },
    globalShortcut: { unregisterAll() {}, register() { return true; } },
    ipcMain: { handle: (n, f) => { handlers[n] = f; }, on() {} },
    desktopCapturer: {}, session: { defaultSession: { setDisplayMediaRequestHandler() {} } }, shell: {}
  };
  const orig = Module._load;
  Module._load = function (r, ...a) { return r === 'electron' ? fakeElectron : orig.call(this, r, ...a); };
  const shinyMain = require(path.join(__dirname, '..', 'electron', 'shiny.js'));
  Module._load = orig;
  // der Clip-Ordner heißt "Rattata Lab Clips" im Videos-Ordner
  const dir = path.join(path.dirname(clips), 'Rattata Lab Clips');
  fs.mkdirSync(dir, { recursive: true });
  const shot = path.join(dir, 'rl-test shot.jpg'), clip = path.join(dir, 'rl-test clip.mp4');
  fs.writeFileSync(shot, Buffer.alloc(1000, 1));
  fs.writeFileSync(clip, Buffer.alloc(3 * 1024 * 1024, 2));
  const calls = [];
  global.fetch = async (url, o) => { calls.push({ url, files: [...o.body.keys()].filter((k) => k.indexOf('files[') === 0).length, payload: JSON.parse(o.body.get('payload_json')) }); return { ok: true, status: 200, json: async () => ({}) }; };
  try {
    shinyMain.init({ webContents: { send() {} }, isDestroyed: () => false });
  } catch (e) { /* Server startet im Test evtl. nicht: egal, nur der Handler zählt */ }
  const notify = handlers['shiny-notify'];
  if (!notify) { fail('shiny-notify nicht registriert'); }
  else {
    let r = await notify(null, { webhook: 'https://evil.example/api/webhooks/1/abc', content: 'x' });
    if (r.ok || r.error !== 'webhook') fail('fremde Adresse wird abgelehnt'); else ok('fremde Adresse wird abgelehnt');
    r = await notify(null, { webhook: 'https://discord.com/api/webhooks/123/abc-DEF_9', content: 'Shiny!', files: [shot, clip, 'C:/Windows/win.ini'], limitMb: 10 });
    if (!r.ok || calls.length !== 1 || calls[0].files !== 2 || !/wait=true/.test(calls[0].url)) fail('ein Post mit Screenshot und Clip ' + JSON.stringify(r) + ' ' + JSON.stringify(calls));
    else ok('ein Post mit Screenshot und Clip, Datei außerhalb des Clip-Ordners ignoriert');
    calls.length = 0;
    r = await notify(null, { webhook: 'https://discord.com/api/webhooks/123/abc', content: 'Shiny!', files: [shot, clip], limitMb: 1, tooBig: '{0} {1} zu groß' });
    if (!r.ok || r.skipped.length !== 1 || calls[0].files !== 1 || !/rl-test clip\.mp4 3 zu groß/.test(calls[0].payload.content)) fail('zu großer Clip ' + JSON.stringify(r) + ' ' + JSON.stringify(calls));
    else ok('zu großer Clip wird ausgelassen und erwähnt');
  }
  try { fs.rmSync(shot); fs.rmSync(clip); } catch (e) { /* */ }

  // ---------- Oberfläche in Electron ----------
  let electron = '';
  try { electron = require('electron'); } catch (e) { electron = ''; }
  if (!electron || typeof electron !== 'string' || !fs.existsSync(electron)) { console.log('SKIP Oberfläche: Electron fehlt'); finish(); return; }
  const r = cp.spawnSync(electron, [path.join(__dirname, 'builder_features_main.js'), '--no-sandbox', '--disable-gpu'], { encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const line = (out.split('\n').filter((s) => s.indexOf('REPORT ') === 0).pop() || '').slice(7);
  let rep = null;
  try { rep = JSON.parse(line); } catch (e) { rep = null; }
  if (!rep) fail('kein Bericht ' + out.slice(-600));
  else {
    (rep.checks || []).forEach((c) => (c.ok ? ok(c.name) : fail(c.name + (c.info ? ' (' + c.info + ')' : ''))));
    (rep.errors || []).forEach((e) => fail(e));
    if (!rep.checks || rep.checks.length < 20) fail('zu wenige Prüfungen: ' + (rep.checks || []).length);
  }
  finish();
})();
function finish() {
  if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
  console.log('Neue Funktionen OK');
  process.exit(0);
}
