// Item-Taschen, Pokédex und Event-Flags (nach PKHeX) überstehen Speichern und erneutes Öffnen: Gen 1 bis 7 mit künstlichen Spielständen
global.window = {}; global.document = {};
const r = __dirname + '/../';
['data/pk_personal.js', 'data/pk_gb.js', 'data/pk_text.js', 'data/pk_blocks.js', 'data/pk_blocks67.js', 'js/nds.js', 'js/gen3.js', 'js/savedit.js', 'js/savedit_gb.js', 'js/savedit_3ds.js', 'data/pkhex_data.js', 'js/savext.js', 'js/savhof.js'].forEach(f => { try { require(r + f); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; } });
const assert = require('assert'), NDS = window.NDS, S = window.CCSave, GB = window.CCSaveGB;
let n = 0;
function roundtrip(label, open, sv, opts) {
  window.CCSaveExt(sv, window.PKPERSONAL);
  assert.ok(sv.bag && sv.dex && sv.events, label + ': Erweiterungen fehlen');
  // Item-Tasche: zwei Einträge in einer passenden Tasche
  const pi = sv.bag.pouches.findIndex(p => opts.pouch ? p.k === opts.pouch : p.k === 'Items'), p = sv.bag.pouches[pi];
  const a = p.ids[1], b = p.ids[2];
  sv.bag.write(pi, [{ id: a, count: 5 }, { id: b, count: p.k === 'KeyItems' ? 1 : 7 }]);
  const dexN = Math.min(25, sv.dex.max);
  sv.dex.set(dexN, true, true); sv.dex.set(1, true, false);
  sv.events.setFlag(107, true); sv.events.setWork(3, 12);
  sv.playTime.set({ h: 12, m: 34, s: 56 }); sv.counters.forEach(c => c.set(321));
  if (sv.badges) { sv.badges.set(0, 1); sv.badges.set(sv.badges.n - 1, 1); }
  if (sv.setBoxName) sv.setBoxName(2, 'BOX7');
  window.CCSaveHof(sv);
  if (sv.hof) { assert.ok(Array.isArray(sv.hof.entries()), label + ': Ruhmeshalle lesbar'); sv.hof.clear(); assert.deepStrictEqual(sv.hof.entries(), [], label + ': Ruhmeshalle leer'); n++; }
  const sv2 = open(sv.finish());
  assert.ok(sv2, label + ': erneutes Öffnen');
  window.CCSaveExt(sv2, window.PKPERSONAL);
  const it = sv2.bag.read(pi).filter(x => x.id).map(x => [x.id, x.count]);
  const want = p.k === 'KeyItems' ? [[a, 1], [b, 1]] : [[a, 5], [b, 7]];
  assert.deepStrictEqual(it, want, label + ': Items');
  assert.deepStrictEqual(sv2.dex.get(dexN), { seen: true, caught: true }, label + ': Dex gefangen');
  assert.deepStrictEqual(sv2.dex.get(1), { seen: true, caught: false }, label + ': Dex gesehen');
  assert.deepStrictEqual(sv2.dex.get(2), { seen: false, caught: false }, label + ': Dex leer');
  if (sv.setBoxName) assert.equal(sv2.getBoxName(2), 'BOX7', label + ': Box-Name');
  assert.ok(sv2.events.getFlag(107) && !sv2.events.getFlag(108), label + ': Flag');
  assert.equal(sv2.events.getWork(3), 12, label + ': Wert');
  assert.deepStrictEqual(sv2.playTime.get(), { h: 12, m: 34, s: 56 }, label + ': Spielzeit'); sv2.counters.forEach(c => assert.equal(c.get(), 321, label + ': ' + c.k));
  if (sv.badges) { assert.equal(sv2.badges.get(0), 1, label + ': Orden'); assert.equal(sv2.badges.get(sv2.badges.n - 1), 1, label + ': Orden hinten'); assert.equal(sv2.badges.get(1), 0, label + ': Orden leer'); }
  sv2.dex.set(dexN, false, false); assert.deepStrictEqual(sv2.dex.get(dexN), { seen: false, caught: false }, label + ': Dex löschen');
  n++;
}
// Gen 1
{
  const u = new Uint8Array(0x8000); u[0x2F2C] = 0; u[0x2F2D] = 0xFF; u[0x30C0] = 0; u[0x30C1] = 0xFF;
  let sum = 0; for (let i = 0x2598; i < 0x3523; i++) sum = (sum + u[i]) & 255; u[0x3523] = (~sum) & 255;
  roundtrip('Gen 1', b => GB.open1(b), GB.open1(u), {});
}
// Gen 2 (Kristall)
{
  const u = new Uint8Array(0x8000); u[0x2865] = 0; u[0x2866] = 0xFF; u[0x2D10] = 0; u[0x2D11] = 0xFF;
  let sum = 0; for (let i = 0x2009; i <= 0x2B82; i++) sum = (sum + u[i]) & 0xFFFF; u[0x2D0D] = sum & 255; u[0x2D0E] = sum >> 8;
  roundtrip('Gen 2', b => GB.open2(b), GB.open2(u), {});
}
// Gen 3 (Smaragd, FeuerRot)
for (const game of ['E', 'FRLG']) {
  const u8 = new Uint8Array(0x20000), w16 = (o, v) => { u8[o] = v & 255; u8[o + 1] = v >> 8; }, w32 = (o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; u8[o + 2] = (v >> 16) & 255; u8[o + 3] = (v >>> 24) & 255; };
  [0, 0xE000].forEach((base, slot) => { for (let s = 0; s < 14; s++) { const o = base + s * 0x1000; w16(o + 0xFF4, (s + 3) % 14); w32(o + 0xFF8, 0x08012025); w32(o + 0xFFC, 10 + slot); } });
  const s0 = 0xE000 + [...Array(14).keys()].find(s => ((s + 3) % 14) === 0) * 0x1000;
  if (game === 'E') { w32(s0 + 0xAC, 0x1234ABCD); u8[s0 + 0x900] = 1; } else { w32(s0 + 0xAC, 1); w32(s0 + 0xF20, 0x1234ABCD); }
  const open = b => S.open(b); const sv = open(u8); assert.equal(sv.game, game);
  roundtrip('Gen 3 ' + game, open, sv, {});
}
// Gen 4 / 5: leere Spielstände wie in den Einzeltests
{
  const x = 0x40000 + 0xF628; // HGSS: Fußzeile des Hauptblocks
  const u = new Uint8Array(0x80000), w32 = (o, v) => { u[o] = v & 255; u[o + 1] = (v >> 8) & 255; u[o + 2] = (v >> 16) & 255; u[o + 3] = (v >>> 24) & 255; };
  for (const base of [0, 0x40000]) { const end = base + 0xF628; w32(end - 12, 0xF628); w32(end - 8, 0x20060623); }
  for (const base of [0, 0x40000]) { const end = base + 0xF700 + 0x12310; w32(end - 12, 0x12310); w32(end - 8, 0x20060623); }
  const sv = S.open(u); assert.ok(sv && sv.gen === 4, 'Gen 4 erkannt');
  roundtrip('Gen 4', b => S.open(b), sv, { pouch: 'Medicine' });
}
for (const k of ['bw', 'b2w2']) {
  const u8 = new Uint8Array(0x80000);
  window.PKBLOCKS[k].forEach(b => { const c = NDS.crc16(u8, b[0], b[0] + b[1]); u8[b[2]] = c & 255; u8[b[2] + 1] = c >> 8; u8[b[3]] = c & 255; u8[b[3] + 1] = c >> 8; });
  roundtrip('Gen 5 ' + k, b => S.open(b), S.open(u8), { pouch: 'Medicine' });
}
// Gen 6 / 7
const SIZES = { xy: 0x65600, ao: 0x76000, sm: 0x6BE00, usum: 0x6CC00 };
for (const k of Object.keys(SIZES)) {
  const u = new Uint8Array(SIZES[k]); u[u.length - 0x1F0] = 0x46; u[u.length - 0x1F0 + 1] = 0x45; u[u.length - 0x1F0 + 2] = 0x45; u[u.length - 0x1F0 + 3] = 0x42;
  roundtrip('Gen ' + (k === 'xy' || k === 'ao' ? 6 : 7) + ' ' + k, b => S.open(b), S.open(u), {});
}
// Pokémon-Zusatzfelder: Trainer-Geschlecht und Datum
{
  const fm = [[S.PK3, 100], [S.PK4, 236], [S.PK5, 236], [window.CCSave3DS.PK6, 260], [window.CCSave3DS.PK7, 260]];
  for (const [F, len] of fm) {
    const d = new Uint8Array(len);
    F.set(d, 'otGender', 1); assert.equal(F.get(d, 'otGender'), 1); F.set(d, 'otGender', 0); assert.equal(F.get(d, 'otGender'), 0); F.set(d, 'otGender', 1);
    F.set(d, 'pokerus', 0x23); F.set(d, 'metLoc', 77); F.set(d, 'contest', 200, 4);
    assert.equal(F.get(d, 'pokerus'), 0x23); assert.equal(F.get(d, 'metLoc'), 77); assert.equal(F.get(d, 'contest', 4), 200); assert.equal(F.get(d, 'otGender'), 1);
    if (F.gen >= 4) { F.set(d, 'metYear', 24); F.set(d, 'metMonth', 11); F.set(d, 'metDay', 8); assert.deepStrictEqual([F.get(d, 'metYear'), F.get(d, 'metMonth'), F.get(d, 'metDay')], [24, 11, 8]); }
  }
}
console.log('Erweiterungen OK (' + n + ' Spielstände)');
