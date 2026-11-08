// Das Shiny-Logo (1:8192) darf ein Redesign nicht wieder stillschweigend verlieren:
// Dateien da, Auslöser verdrahtet, Pro/Studio zeigen das Startlogo nur beim Treffer, Markenzeichen nutzt die Shiny-Datei.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;
function fail(m) { console.log('FAIL ' + m); bad++; }
function ok(m) { console.log('ok   ' + m); }

function pngSize(buf, what) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') { fail(what + ' ist kein PNG'); return null; }
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const home = fs.readFileSync(path.join(ROOT, 'img/home.png'));
const homeShiny = fs.readFileSync(path.join(ROOT, 'img/home_shiny.png'));
const logo = fs.readFileSync(path.join(ROOT, 'img/logo.png'));
const logoShiny = fs.readFileSync(path.join(ROOT, 'img/logo_shiny.png'));
const hs = pngSize(home, 'home.png'), hss = pngSize(homeShiny, 'home_shiny.png');
const ls = pngSize(logo, 'logo.png'), lss = pngSize(logoShiny, 'logo_shiny.png');
if (hs && hss && (hs.w !== hss.w || hs.h !== hss.h)) fail('home_shiny.png hat nicht dieselbe Größe wie home.png (' + hss.w + 'x' + hss.h + ' ≠ ' + hs.w + 'x' + hs.h + ')');
else if (hs) ok('home_shiny.png ' + hs.w + 'x' + hs.h);
if (ls && lss && (ls.w !== lss.w || ls.h !== lss.h)) fail('logo_shiny.png hat nicht dieselbe Größe wie logo.png');
else if (ls) ok('logo_shiny.png ' + ls.w + 'x' + ls.h);
if (home.equals(homeShiny)) fail('home_shiny.png ist mit home.png identisch');
else ok('home_shiny.png unterscheidet sich vom normalen Gesicht');
if (logo.equals(logoShiny)) fail('logo_shiny.png ist mit logo.png identisch');
else ok('logo_shiny.png unterscheidet sich vom normalen Startlogo');
if (!fs.existsSync(path.join(ROOT, 'icon_shiny.ico'))) fail('icon_shiny.ico fehlt');
else ok('icon_shiny.ico vorhanden');

const ctx = { URLSearchParams, Math, console, globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/logo_egg.js'), 'utf8'), ctx);
const egg = ctx.RLLogoEgg;
if (!egg || egg.ODDS !== 8192) fail('RLLogoEgg.ODDS ist nicht 8192');
else ok('Quote 1:' + egg.ODDS);
if (!egg.isShinyLogo({ search: '', hash: '', random: function () { return 0; } })) fail('Wurf 0 muss treffen');
else ok('Wurf 0 trifft');
if (egg.isShinyLogo({ search: '', hash: '', random: function () { return 1 / 8192; } })) fail('Wurf 1/8192 darf nicht treffen');
else ok('Wurf knapp daneben trifft nicht');
if (!egg.isShinyLogo({ search: '?shiny=1', hash: '', random: function () { return 0.5; } })) fail('?shiny=1 erzwingt das Logo nicht');
else ok('?shiny=1 erzwingt');
if (!egg.isShinyLogo({ search: '', hash: '#shiny', random: function () { return 0.5; } })) fail('#shiny erzwingt das Logo nicht');
else ok('#shiny erzwingt');
if (egg.isShinyLogo({ search: '', hash: '#calc', random: function () { return 0.5; } })) fail('normaler Hash darf nicht erzwingen');
else ok('normaler Hash erzwingt nicht');
if (egg.homeSrc(true) !== 'img/home_shiny.png' || egg.logoSrc(true) !== 'img/logo_shiny.png') fail('Shiny-Pfade falsch');
else ok('Shiny-Pfade');
if (egg.homeSrc(false) !== 'img/home.png' || egg.logoSrc(false) !== 'img/logo.png') fail('normale Pfade falsch');
else ok('normale Pfade');

function fakeDoc() {
  const attrs = {};
  const classes = {};
  const nodes = {
    '.start-logo': { tagName: 'IMG', attrs: { src: 'img/logo.png' }, getAttribute: function (k) { return this.attrs[k] || ''; }, setAttribute: function (k, v) { this.attrs[k] = v; } },
    'link[rel="icon"]': { tagName: 'LINK', rel: 'icon', attrs: { href: 'img/logo.png' }, getAttribute: function (k) { return this.attrs[k] || ''; }, setAttribute: function (k, v) { this.attrs[k] = v; } },
    '#btnHome img': { tagName: 'IMG', attrs: { src: 'img/home.png?v=86' }, getAttribute: function (k) { return this.attrs[k] || ''; }, setAttribute: function (k, v) { this.attrs[k] = v; } },
    'img.sb-logo': { tagName: 'IMG', attrs: { src: 'img/home.png' }, getAttribute: function (k) { return this.attrs[k] || ''; }, setAttribute: function (k, v) { this.attrs[k] = v; } }
  };
  return {
    documentElement: {
      classList: {
        add: function (c) { classes[c] = true; },
        remove: function (c) { delete classes[c]; }
      },
      setAttribute: function (k, v) { attrs[k] = v; },
      removeAttribute: function (k) { delete attrs[k]; },
      attrs: attrs,
      classes: classes
    },
    querySelector: function (sel) { return nodes[sel] || null; },
    querySelectorAll: function (sel) {
      return sel.split(',').map(function (s) { return nodes[s.trim()]; }).filter(Boolean);
    },
    nodes: nodes
  };
}
const doc = fakeDoc();
egg.apply(doc, true);
if (!doc.documentElement.classes['is-shiny-logo'] || doc.documentElement.attrs['data-shiny-logo'] !== '1') fail('Klasse is-shiny-logo wird nicht gesetzt');
else ok('Klasse is-shiny-logo');
if (doc.nodes['.start-logo'].attrs.src !== 'img/logo_shiny.png') fail('Startlogo wird nicht getauscht');
else ok('Startlogo getauscht');
if (doc.nodes['link[rel="icon"]'].attrs.href !== 'img/logo_shiny.png') fail('Favicon wird nicht getauscht');
else ok('Favicon getauscht');
if (doc.nodes['#btnHome img'].attrs.src !== 'img/home_shiny.png' || doc.nodes['img.sb-logo'].attrs.src !== 'img/home_shiny.png') fail('Markenzeichen wird nicht getauscht');
else ok('Markenzeichen (Home-Button und Seitenleiste) getauscht');
if (!ctx.__IS_SHINY_LOGO) fail('__IS_SHINY_LOGO fehlt');
else ok('__IS_SHINY_LOGO');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const pro = fs.readFileSync(path.join(ROOT, 'css/pro.css'), 'utf8');
const studio = fs.readFileSync(path.join(ROOT, 'css/studio.css'), 'utf8');
const main = fs.readFileSync(path.join(ROOT, 'electron/main.js'), 'utf8');
if (!html.includes('js/logo_egg.js')) fail('index.html lädt js/logo_egg.js nicht');
else ok('index.html lädt das Easter Egg');
if (!app.includes('brandLogoSrc') || !app.includes('RLLogoEgg.homeSrc')) fail('Seitenleiste nutzt das Shiny-Markenzeichen nicht');
else ok('app.js verdrahtet das Markenzeichen');
if (!/getElementById\('btnHome'\)\.addEventListener\('click'/.test(app) || !/showView\('start'\)/.test(app)) fail('Klick aufs Logo nach Hause fehlt');
else ok('Klick nach Hause bleibt');
if (!app.includes('function wireTeamDrag')) fail('Drag and Drop auf der Startseite fehlt');
else ok('Drag and Drop bleibt');
if (!/html\.is-shiny-logo\[data-ui-style="pro"\] \.start-logo[\s\S]*display:\s*block\s*!important/.test(pro)) fail('Pro blendet das Shiny-Startlogo nicht wieder ein');
else ok('Pro zeigt das Shiny-Startlogo');
if (!/html\[data-ui-style="pro"\] \.start-logo[^{]*\{[^}]*display:\s*none\s*!important/.test(pro)) fail('Pro versteckt das normale Startlogo nicht mehr');
else ok('normales Pro-Startlogo bleibt versteckt');
if (!/html\.is-shiny-logo\[data-ui-style="studio"\] \.start-logo[\s\S]*display:\s*block\s*!important/.test(studio)) fail('Studio blendet das Shiny-Startlogo nicht wieder ein');
else ok('Studio zeigt das Shiny-Startlogo');
if (!/Math\.floor\(Math\.random\(\) \* 8192\) === 0/.test(main) || !main.includes('icon_shiny.ico') || !main.includes("shiny: '1'")) fail('Desktop-App würfelt nicht mehr (8192 / icon_shiny / ?shiny=1)');
else ok('Desktop-App würfelt weiter');
if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Shiny-Logo-Test OK');
