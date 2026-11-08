// Der Projektor darf den gelben Erkennungsrahmen nicht mitnehmen: gespiegelt wird nur ein <video>, nie ein Canvas.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;
function fail(m) { console.log('FAIL ' + m); bad++; }
function ok(m) { console.log('ok   ' + m); }

const ctx = { console, globalThis: null, document: { createElement: function () { return {}; } } };
ctx.globalThis = ctx;
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/shiny_projector.js'), 'utf8'), ctx);
const M = ctx.CCProjectorMirror;
if (!M || M.FPS !== 20 || M.MAX_W !== 1920) fail('Spiegel-Konstanten');
else ok('20 Bilder/s, höchstens 1920 px');
const f = M.fitSize(2560, 1440);
if (!f || f.w !== 1920 || f.h !== 1080) fail('2560×1440 wird nicht auf 1920×1080 begrenzt: ' + JSON.stringify(f));
else ok('Full-HD-Deckel');
const g = M.fitSize(1280, 720);
if (!g || g.w !== 1280 || g.h !== 720) fail('720p bleibt nicht erhalten');
else ok('720p unverändert');
if (M.fitSize(1, 1) !== null) fail('zu kleines Bild sollte entfallen');
else ok('Mini-Bild entfällt');

let drawn = null;
const ctx2d = { drawImage: function (el, x, y, w, h) { drawn = { el: el, w: w, h: h }; } };
const video = { tagName: 'VIDEO' };
if (!M.isRawVideo(video) || M.isRawVideo({ tagName: 'CANVAS' }) || M.isRawVideo(null)) fail('isRawVideo');
else ok('nur VIDEO ist eine Quelle');
if (!M.drawRaw(ctx2d, video, 320, 180) || !drawn || drawn.el !== video) fail('drawRaw zeichnet das Video nicht');
else ok('drawRaw zeichnet das Video');
drawn = null;
if (M.drawRaw(ctx2d, { tagName: 'CANVAS' }, 320, 180) || drawn) fail('Canvas (Erkennungsrahmen) wurde gezeichnet');
else ok('Canvas wird abgelehnt');

function expectFps(raw, want, label) {
  var got = M.clampFps(raw);
  if (got !== want) fail(label + ': ' + JSON.stringify(raw) + ' → ' + got + ' statt ' + want);
  else ok(label);
}
expectFps(10, 10, 'Untergrenze 10');
expectFps(60, 60, 'Obergrenze 60');
expectFps(20, 20, 'Standardwert 20');
expectFps(35, 35, 'jede ganze Zahl dazwischen');
for (var i = 10; i <= 60; i++) if (M.clampFps(i) !== i) { fail('Lücke bei ' + i); break; }
else if (i === 60) ok('10 bis 60 lückenlos');
expectFps(9, 10, 'unter 10 wird 10');
expectFps(61, 60, 'über 60 wird 60');
expectFps(10.4, 10, '10,4 wird 10');
expectFps(59.6, 60, '59,6 wird 60');
expectFps('60', 60, 'Text 60');
expectFps(' 15 ', 15, 'Text mit Leerzeichen');
expectFps('', 20, 'leer bleibt 20');
expectFps(null, 20, 'null bleibt 20');
expectFps(undefined, 20, 'fehlend bleibt 20');
expectFps('abc', 20, 'Müll bleibt 20');
expectFps(false, 20, 'false bleibt 20');
expectFps(Infinity, 20, 'Infinity bleibt 20');
var stored = JSON.parse(JSON.stringify({ fps: M.clampFps(99) }));
if (M.clampFps(stored.fps) !== 60) fail('gespeicherte 99 bleibt nicht 60');
else ok('gespeicherter Wert wird erneut begrenzt');
var gate = { encoding: false, last: 1000, frameId: 'q1' };
if (M.shouldSend(1050, gate, 10, 'q2')) fail('10 Bilder/s lässt 50 ms zu früh durch');
else ok('10 Bilder/s hält den Abstand');
if (!M.shouldSend(1100, gate, 10, 'q2')) fail('10 Bilder/s blockt nach 100 ms');
else ok('10 Bilder/s nach 100 ms');
if (!M.shouldSend(1017, gate, 60, 'q2')) fail('60 Bilder/s blockt nach 17 ms');
else ok('60 Bilder/s nach 17 ms');
if (M.shouldSend(1016, gate, 60, 'q2')) fail('60 Bilder/s lässt 16 ms durch');
else ok('60 Bilder/s hält 16 ms zurück');
if (M.shouldSend(2000, gate, 60, 'q1')) fail('gleicher Quellframe wird nochmal kodiert');
else ok('kein zweites Bild vom selben Frame');
gate.encoding = true;
if (M.shouldSend(5000, gate, 60, 'q9')) fail('während der Kodierung entsteht eine Warteschlange');
else ok('eine Kodierung blockt die nächste');
var live = { encoding: false, last: 1000, frameId: 'q1' };
if (M.shouldSend(1050, live, 10, 'q2')) fail('10 Bilder/s lässt 50 ms durch');
else if (!M.shouldSend(1050, live, 60, 'q2')) fail('60 Bilder/s blockt dieselben 50 ms');
else ok('neue Bildrate gilt ohne Neustart');
if (M.startMirror.length < 3) fail('startMirror liest die Bildrate nicht bei jedem Bild');
else ok('startMirror bekommt die aktuelle Bildrate');

const src = fs.readFileSync(path.join(ROOT, 'js/shiny_projector.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'electron/projector.html'), 'utf8');
const main = fs.readFileSync(path.join(ROOT, 'electron/projector.js'), 'utf8');
const det = fs.readFileSync(path.join(ROOT, 'js/shiny_detect.js'), 'utf8');
if (/strokeRect|det-preview|getUserMedia|getDisplayMedia|chooseSource/.test(src)) fail('Spiegel-Skript fasst Rahmen oder ein zweites Gerät an');
else ok('Spiegel-Skript ohne Rahmen und ohne zweite Quelle');
if (/strokeRect|det-preview/.test(page)) fail('Projektor-Seite zeichnet einen Rahmen');
else ok('Projektor-Seite ohne Rahmen');
if (!/pointer-events:\s*none/.test(page)) fail('Overlay ist nicht klickdurchlässig');
else ok('Overlay klickdurchlässig');
if (!/background:\s*#000/.test(page) || /transparent:\s*true/.test(main)) fail('Fenster oder Seite nicht undurchsichtig');
else ok('undurchsichtige Videoseite');
if (/getUserMedia|getDisplayMedia|chooseSource/.test(main)) fail('Hauptprozess öffnet die Quelle noch einmal');
else ok('Hauptprozess öffnet kein zweites Gerät');
if (!/strokeRect/.test(det) || !/s\.video/.test(det)) fail('Erkennung zeichnet den Rahmen nicht mehr auf das eigene Canvas');
else ok('Rahmen bleibt auf dem Vorschau-Canvas');
const app = fs.readFileSync(path.join(ROOT, 'js/shiny.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!html.includes('js/shiny_projector.js')) fail('index.html lädt den Projektor nicht');
else ok('index.html verdrahtet');
if (!app.includes("CCProjector.toggle") || !app.includes('act_projector')) fail('Knopf oder Hotkey fehlt');
else ok('Knopf und Hotkey');
if (!app.includes('clampFps(p.fps)') || !app.includes('setFps')) fail('Bildrate wird nicht gespeichert');
else ok('Bildrate liegt in den Projektor-Einstellungen');
if (!det.includes('detFpsRange') || !det.includes('type: \'range\'') || !det.includes('type: \'number\'')) fail('Regler oder Zahleneingabe fehlt');
else ok('Regler und Zahl 10–60');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (pkg.version !== '1.17.9') fail('Version ist ' + pkg.version);
else ok('Version 1.17.9');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Projektor-Spiegel-Test OK');
