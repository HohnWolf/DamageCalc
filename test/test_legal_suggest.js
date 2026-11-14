// Prüft den Fundort-Vorschlag für "Legal machen" (CCLegal.suggest) mit Attrappen-Begegnungstabellen: node test/test_legal_suggest.js
global.window = {};
require('../js/legality.js');
const assert = require('assert');
window.PKENC = { anc: { 26: [25] }, wild: { 1: { 10: [25, 5, 10, 25, 20, 30], 12: [26, 40, 45] } }, stat: { 1: [] } };
const mk = (species, level, metLoc, metLevel, ver, extra) => {
  const d = new Uint8Array(100); d[70] = (ver << 7) & 255; d[71] = (ver << 7) >> 8; // Gen 3: Version in Bits 7-10 des Herkunftsworts
  const v = { species, exp: level, metLoc, metLevel, egg: 0 };
  return { d, F: { get: (dd, k) => v[k] }, v };
};
const P = { g3: { 25: [0, 0, 0, 0, 0, 0, 0], 26: [0, 0, 0, 0, 0, 0, 0] } }, S = { levelFor: (g, exp) => exp };
const run = (m) => { const sv = { fmt: m.F, gen: 3, gb: false, natOf: n => n }; return window.CCLegal.suggest(sv, m.d, { P, S, de: true }); };
// Unpassender Fundort -> Vorschlag
let m = mk(25, 25, 99, 7, 1); let r = run(m);
assert.ok(r && r.loc === 10 && r.level === 10, 'Vorschlag für Pikachu Lv 25: Gebiet 10, Fundlevel 10 (' + JSON.stringify(r) + ')');
// Bereits passend -> kein Vorschlag
m = mk(25, 25, 10, 8, 1); assert.strictEqual(run(m), null, 'passende Begegnung bleibt unverändert');
// Entwicklung: Raichu (26) mit Vorentwicklung Pikachu; Gebiet 12 verlangt Lv >= 40
m = mk(26, 30, 99, 7, 1); r = run(m); assert.ok(r && r.loc === 10, 'Raichu Lv 30 -> Pikachu-Gebiet (' + JSON.stringify(r) + ')');
m = mk(26, 44, 99, 7, 1); r = run(m); assert.ok(r && (r.loc === 12 || r.loc === 10), 'Raichu Lv 44 -> gültiges Gebiet');
// Ei, übertragene Version -> keine Änderung
m = mk(25, 25, 99, 7, 1); m.v.egg = 1; assert.strictEqual(run(m), null, 'Ei bleibt');
m = mk(25, 25, 99, 7, 20); assert.strictEqual(run(m), null, 'Pokémon aus anderer Generation (Version 20) bleibt');
console.log('alles ok');
