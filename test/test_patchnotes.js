// Patchnotes-Test: Einträge je Version, Popup nur nach einem Update, nicht bei Neuinstallation oder Rückstufung.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;
const ok = (m) => console.log('ok   ' + m), fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b) ? ok(m) : fail(m + ' (ist ' + JSON.stringify(a) + ', soll ' + JSON.stringify(b) + ')'));

const store = {}, shown = [];
const dom = { createElement: () => ({}), getElementById: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} } };
const win = { CC: { el: () => ({ appendChild() {}, addEventListener() {}, focus() {}, remove() {} }), LANG: 'de' }, document: dom, desktop: null };
win.window = win;
const ctx = vm.createContext(Object.assign(win, { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, document: dom, setTimeout: () => 0, console }));
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/update_channel.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/patchnotes.js'), 'utf8'), ctx);
const P = win.RLPatchnotes, pkg = require('../package.json');

eq(P._notes[0].v, pkg.version, 'neuester Eintrag = package.json (' + pkg.version + ')');
eq(P._notes.every((n) => n.de.length && n.en.length && n.de.length === n.en.length || (n.de.length && n.en.length)), true, 'jede Version hat deutsche und englische Texte');
eq(P._entries('1.21.0', '1.21.1').map((n) => n.v), ['1.21.1'], 'Update 1.21.0 -> 1.21.1: ein Eintrag');
eq(P._entries('1.20.0', '1.21.1').map((n) => n.v), ['1.21.1', '1.21.0', '1.20.1'], 'Sprung über mehrere Versionen: alle dazwischen');
eq(P._entries('1.21.1', '1.21.1').length, 0, 'gleiche Version: nichts');

// _check: Speicher und Popup (show wird über document erkannt)
let modals = 0;
dom.getElementById = () => null;
dom.body.appendChild = () => { modals++; };
P._check('1.21.1');
eq([store.cc_lastver, modals], ['1.21.1', 0], 'erster Start: Version merken, kein Popup');
store.cc_lastver = '1.21.0'; P._check('1.21.1');
eq([store.cc_lastver, modals], ['1.21.1', 1], 'nach Update: Popup und Version gemerkt');
P._check('1.21.1');
eq(modals, 1, 'zweiter Start derselben Version: kein Popup');
P._check('1.20.0');
eq(modals, 1, 'Rückstufung: kein Popup');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Patchnotes OK');
