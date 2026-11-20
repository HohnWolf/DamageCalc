// Tests für Shiny-Zähler: Auswahl 3D-Modell / HOME / Sprite (Zähler, Einstellungen, OBS-Overlay) sowie Hotkey „Gefunden“.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;
const ok = (m) => console.log('ok   ' + m);
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b) ? ok(m) : fail(m + ' (ist ' + JSON.stringify(a) + ', soll ' + JSON.stringify(b) + ')'));

const settings = { spriteShiny: '3d' };
const registeredWinHotkeys = {};
let pushedState = null;
let modalsOpened = 0;

function makeEl(tag, attrs) {
  const e = {
    tagName: String(tag || 'div').toUpperCase(),
    attrs: Object.assign({}, attrs || {}),
    children: [],
    style: {},
    classList: {
      _s: new Set((attrs && attrs.class ? String(attrs.class).split(/\s+/).filter(Boolean) : [])),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    appendChild(c) { if (c && typeof c === 'object') c.parentNode = this; this.children.push(c); return c; },
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    remove() {}
  };
  return e;
}

const doc = {
  readyState: 'complete',
  body: {
    dataset: { view: 'shiny' },
    appendChild(c) { if (c && c.classList && c.classList.contains('sh-modal')) modalsOpened++; return c; }
  },
  documentElement: { getAttribute: () => 'oled' },
  getElementById: () => null,
  createElement: (tag) => makeEl(tag),
  createTextNode: (txt) => ({ textContent: txt }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {}
};

const win = {
  CC: {
    LANG: 'de',
    el: (tag, attrs) => makeEl(tag, attrs),
    load: (_k, def) => def,
    save: () => {},
    esc: (s) => String(s || ''),
    toast: () => {},
    setting: (k) => settings[k],
    setSetting: (k, v) => { settings[k] = v; }
  },
  SHINY_ODDS: {
    GAMES: [{ id: 'sv', de: 'Karmesin / Purpur', en: 'Scarlet / Violet', charm: true }],
    PARAMS: {},
    game: () => ({ id: 'sv', de: 'Karmesin / Purpur', en: 'Scarlet / Violet', charm: true }),
    method: () => ({ id: 'full', de: 'Standard', en: 'Full odds', params: [] }),
    methodsFor: () => [{ id: 'full', de: 'Standard', en: 'Full odds', params: [] }],
    probability: () => 1 / 4096,
    isApprox: () => false,
    cumulative: () => 0,
    encountersFor: () => 2839
  },
  NATDEX: [null, ['bulbasaur', 'Bulbasaur', 'Bisasam']],
  RLHotkeys: {
    register(id, cfg) { registeredWinHotkeys[id] = cfg; }
  },
  desktop: {
    shiny: {
      onHotkey() {},
      setHotkeys: () => Promise.resolve({}),
      pushState: (s) => { pushedState = s; },
      overlayInfo: () => Promise.resolve({ url: 'http://127.0.0.1:39151/overlay', dir: 'C:\\OBS' })
    }
  },
  document: doc,
  addEventListener() {},
  removeEventListener() {}
};
win.window = win;

const timers = [];
const ctx = vm.createContext(Object.assign(win, {
  document: doc,
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: (fn) => { timers.push(fn); return timers.length; },
  clearTimeout: () => {},
  setInterval: () => 0,
  console
}));

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/shiny.js'), 'utf8'), ctx);
const SH = win.CCShiny;

// 1. Sprite-Ketten für 3D-Modell, HOME und Sprite
eq(SH._spriteMode(), '3d', 'Standard-Darstellung ist 3d');
eq(SH._shinyChain('pikachu', '3d')[0], 'https://play.pokemonshowdown.com/sprites/ani-shiny/pikachu.gif', '3D startet mit ani-shiny GIF');
eq(SH._shinyChain('pikachu', 'home')[0], 'https://play.pokemonshowdown.com/sprites/home-centered-shiny/pikachu.png', 'HOME startet mit home-centered-shiny PNG');
eq(SH._shinyChain('pikachu', 'sprite')[0], 'https://play.pokemonshowdown.com/sprites/gen5-shiny/pikachu.png', 'Sprite startet mit gen5-shiny PNG');

// 2. OBS-Overlay-URL und Push-State
settings.spriteShiny = '3d';
eq(SH._overlayHref('http://127.0.0.1:39151/overlay', false), 'http://127.0.0.1:39151/overlay', '3D hängt keinen style-Parameter an');
settings.spriteShiny = 'home';
eq(SH._overlayHref('http://127.0.0.1:39151/overlay', false), 'http://127.0.0.1:39151/overlay?style=home', 'HOME hängt style=home an');
settings.spriteShiny = 'sprite';
eq(SH._overlayHref('http://127.0.0.1:39151/overlay', false), 'http://127.0.0.1:39151/overlay?style=sprite', 'Sprite hängt style=sprite an');
SH.syncOverlay();
while (timers.length) timers.shift()();
eq(pushedState && pushedState.overlay && pushedState.overlay.style, 'sprite', 'pushState sendet aktuellen Stil an OBS-Overlay');

// 3. Hotkey „Gefunden“ (global & Fenster)
const st = SH._store();
eq('found' in st.hotkeys, true, 'globaler Hotkey found existiert in store.hotkeys');
eq(Boolean(registeredWinHotkeys['shiny.found']), true, 'Fenster-Hotkey shiny.found ist registriert');
st.hunts.push({ id: 'h1', species: 1, title: '', game: 'sv', method: 'full', params: {}, step: 1, count: 42, total: 42, phases: [], timeMs: 0, runStart: 0, status: 'active', hotkey: true, created: 1, days: {} });
st.sel = 'h1';
modalsOpened = 0;
SH._hotkey('found');
eq(modalsOpened, 1, 'Hotkey found öffnet Fang-Dialog für aktiven Hunt');

// 4. Statische Checks in app.js, overlay.html, overlay2.html
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const ov1 = fs.readFileSync(path.join(ROOT, 'electron/overlay.html'), 'utf8');
const ov2 = fs.readFileSync(path.join(ROOT, 'electron/overlay2.html'), 'utf8');
eq(appJs.includes("spriteShiny: '3d'"), true, 'app.js hat Setting-Default spriteShiny');
eq(ov1.includes('home-centered-shiny/') && ov1.includes("q.get('style')"), true, 'overlay.html unterstützt style=3d|home|sprite');
eq(ov2.includes('home-centered-shiny/') && ov2.includes("q.get('style')"), true, 'overlay2.html unterstützt style=3d|home|sprite');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Shiny-Sprite-Stil & Found-Hotkey OK');
