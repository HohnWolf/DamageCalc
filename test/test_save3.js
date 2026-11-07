// Gen-3-Pokémon: Kodierung gegen die unabhängige Entschlüsselung aus js/gen3.js prüfen
global.window = {}; global.document = {};
const r = __dirname + '/../';
require(r + 'js/nds.js'); require(r + 'js/gen3.js'); require(r + 'data/pk_personal.js'); require(r + 'js/savedit.js');
const assert = require('assert'), F = window.CCSave.PK3, G = window.GEN3;
for (let n = 0; n < 300; n++) {
  const d = new Uint8Array(100), pid = (Math.random() * 2 ** 32) >>> 0;
  F.set(d, 'pid', pid); F.set(d, 'tid', 1234); F.set(d, 'sid', 4321); F.set(d, 'species', 1 + n % 251); F.set(d, 'exp', 1000 + n);
  for (let i = 0; i < 4; i++) { F.set(d, 'move', 1 + i + n % 300, i); F.set(d, 'pp', 10 + i, i); }
  for (let i = 0; i < 6; i++) { F.set(d, 'ev', i * 3, i); F.set(d, 'iv', (i * 5 + n) % 32, i); }
  F.set(d, 'nick', 'PIKACHU'); F.set(d, 'ot', 'JEREMY'); F.set(d, 'level', 30); F.set(d, 'hp', 50); F.setStats(d, [60, 50, 50, 50, 50, 50]);
  d[18] = 2; d[19] = 2;
  const out = new Uint8Array(100); F.encode(d, out, 0, true);
  const m = G.decodeMon(out, 0, true);
  assert.ok(m, 'unabhängig lesbar'); assert.equal(m.species, 1 + n % 251); assert.equal(m.exp, 1000 + n); assert.equal(m.nick, 'PIKACHU'); assert.equal(m.level, 30);
  assert.equal(m.ivs.spe, (3 * 5 + n) % 32); assert.equal(m.evs.def, 6);
  const back = F.decode(out, 0, true); assert.ok(back); assert.equal(F.get(back, 'exp'), 1000 + n);
  const again = new Uint8Array(100); F.encode(back, again, 0, true); assert.deepEqual(Array.from(again), Array.from(out));
}
console.log('OK');
// synthetischer Spielstand: 2 × 14 Sektoren, Smaragd-Aufbau
{
  const u8 = new Uint8Array(0x20000); const w16 = (o, v) => { u8[o] = v & 255; u8[o + 1] = v >> 8; }; const w32 = (o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; u8[o + 2] = (v >> 16) & 255; u8[o + 3] = (v >>> 24) & 255; };
  [0, 0xE000].forEach((base, slot) => { for (let s = 0; s < 14; s++) { const o = base + s * 0x1000; w16(o + 0xFF4, (s + 3) % 14); w32(o + 0xFF8, 0x08012025); w32(o + 0xFFC, 10 + slot); } });
  w32(0xAC + 0 + [...Array(14).keys()].map(s => s).find(s => ((s + 3) % 14) === 0) * 0x1000 * 0, 0);
  // Sektor mit id 0 finden
  let s0 = 0xE000 + [...Array(14).keys()].find(s => ((s + 3) % 14) === 0) * 0x1000; w32(s0 + 0xAC, 0x1234ABCD); u8[s0 + 0x900] = 1; // Smaragd
  const sv = window.CCSave.open(u8); assert.equal(sv.game, 'E');
  sv.setTrainer({ name: 'JEREMY', tid: 11, sid: 22, gender: 1, hours: 5, minutes: 6, seconds: 7, money: 12345 });
  const d = new Uint8Array(100); F.set(d, 'pid', 0x12345678); F.set(d, 'tid', 11); F.set(d, 'sid', 22); F.set(d, 'species', 25); F.set(d, 'exp', 125); F.set(d, 'level', 5); F.setStats(d, [20, 10, 10, 10, 10, 10]); d[18] = 2; d[19] = 2;
  sv.setParty([d]); sv.setBoxMon(8, 29, d.subarray(0, 80));
  const out = sv.finish();
  const sv2 = window.CCSave.open(out); const t = sv2.getTrainer();
  assert.equal(t.name, 'JEREMY'); assert.equal(t.money, 12345); assert.equal(t.tid, 11);
  assert.equal(sv2.getParty().length, 1); assert.equal(F.get(sv2.getParty()[0], 'species'), 25);
  assert.equal(F.get(sv2.getBoxMon(8, 29), 'species'), 25);
  const ind = window.GEN3.parseSav(out); assert.ok(ind && ind.party.length === 1 && ind.party[0].species === 25 && ind.boxes.length === 1, 'unabhängige Auswertung');
  console.log('Spielstand OK');
}
