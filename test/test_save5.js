// synthetischer Gen-5-Spielstand: Block-Prüfsummen und Trainerdaten
global.window = {}; global.document = {};
const r = __dirname + '/../';
require(r + 'js/nds.js'); require(r + 'js/gen3.js'); require(r + 'data/pk_personal.js'); require(r + 'data/pk_blocks.js'); require(r + 'js/savedit.js');
const assert = require('assert'), NDS = window.NDS;
for (const k of ['bw', 'b2w2']) {
  const u8 = new Uint8Array(0x80000);
  window.PKBLOCKS[k].forEach(b => { const c = NDS.crc16(u8, b[0], b[0] + b[1]); u8[b[2]] = c & 255; u8[b[2] + 1] = c >> 8; u8[b[3]] = c & 255; u8[b[3] + 1] = c >> 8; });
  const sv = window.CCSave.open(u8); assert.ok(sv && sv.gen === 5 && sv.game === (k === 'bw' ? 'BW' : 'B2W2'), k);
  sv.setTrainer({ name: 'ASH', tid: 5, sid: 6, gender: 1, money: 1234 });
  const F = window.CCSave.PK5, d = new Uint8Array(220); F.set(d, 'pid', 0x01020304); F.set(d, 'species', 25); F.set(d, 'exp', 100); F.set(d, 'nick', 'PIKA'); F.set(d, 'nature', 3); F.set(d, 'level', 5); F.setStats(d, [20, 10, 10, 10, 10, 10]);
  sv.setParty([d]);
  const out = sv.finish(), sv2 = window.CCSave.open(out), t = sv2.getTrainer();
  assert.equal(t.name, 'ASH'); assert.equal(t.money, 1234); assert.equal(t.tid, 5);
  const m = sv2.getParty()[0]; assert.ok(m); assert.equal(F.get(m, 'nick'), 'PIKA'); assert.equal(F.nature(m), 3); assert.equal(F.get(m, 'species'), 25);
  const alt = NDS.parseSav(out); assert.ok(alt && alt.gen === 5 && alt.party.length === 1, 'unabhängige Auswertung');
}
console.log('Gen 5 OK');
