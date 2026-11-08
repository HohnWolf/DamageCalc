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
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (pkg.version !== '1.17.9') fail('Version ist ' + pkg.version);
else ok('Version 1.17.9');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Projektor-Spiegel-Test OK');
