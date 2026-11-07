// Prüft den Gen-6/7-Spielstandkern mit künstlichen Spielständen: node test/test_save67.js
global.window = {}; global.document = {};
['data/pk_personal.js', 'data/pk_blocks67.js', 'data/pk_text.js', 'js/nds.js', 'js/gen3.js', 'js/savedit.js', 'js/savedit_3ds.js'].forEach(f => require('../' + f));
const S = window.CCSave, X = window.CCSave3DS; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const SIZES = { xy: 0x65600, ao: 0x76000, sm: 0x6BE00, usum: 0x6CC00 };
for (const k of Object.keys(SIZES)) {
  const u = new Uint8Array(SIZES[k]); u[u.length - 0x1F0] = 0x46; u[u.length - 0x1F0 + 1] = 0x45; u[u.length - 0x1F0 + 2] = 0x45; u[u.length - 0x1F0 + 3] = 0x42;
  const sv = S.open(u); ok(sv && sv.game === k, k + ' erkannt');
  const t = sv.getTrainer(); t.name = 'Ash'; t.tid = 1234; t.sid = 4321; t.money = 12345; t.gender = 1; sv.setTrainer(t);
  const d = sv.blank(25, sv.getTrainer()); const F = sv.fmt;
  F.set(d, 'nick', 'Pika♂'); F.set(d, 'move', 85, 1); F.set(d, 'pp', 15, 1); F.set(d, 'level', 50); F.set(d, 'exp', S.expFor(0, 50));
  sv.setParty([d]); sv.setBoxMon(1, 4, sv.blank(150, sv.getTrainer()));
  const out = sv.finish(), sv2 = S.open(out);
  const p = sv2.getParty()[0];
  ok(p && F.get(p, 'species') === 25 && F.get(p, 'nick') === 'Pika♂' && F.get(p, 'level') === 50 && F.get(p, 'move', 1) === 85, k + ': Team-Pokémon bleibt erhalten');
  ok(sv2.getBoxMon(1, 4) && F.get(sv2.getBoxMon(1, 4), 'species') === 150, k + ': Box-Pokémon');
  const t2 = sv2.getTrainer(); ok(t2.name === 'Ash' && t2.tid === 1234 && t2.sid === 4321 && t2.money === 12345 && t2.gender === 1, k + ': Trainerdaten');
  ok(sv2.getBoxMon(0, 0) === null, k + ': leerer Platz');
  // Prüfsumme des Trainer-Blocks nachrechnen
  const BL = window.PKBLOCKS67[k], g = BL[k === 'sm' || k === 'usum' ? 3 : 17], meta = u.length - 0x200;
  const id = (k === 'sm' || k === 'usum') ? 3 : 17;
  const want = (k === 'sm' || k === 'usum') ? X.crc7(out, g[0], g[0] + g[1]) : window.NDS.crc16(out, g[0], g[0] + g[1]);
  ok((out[meta + 0x14 + id * 8 + 6] | (out[meta + 0x14 + id * 8 + 7] << 8)) === want, k + ': Block-Prüfsumme');
}
// bekannter Wert für CRC16 (Gen 7): "123456789" -> CRC-16/MODBUS 0x4B37, invertiert 0xB4C8
{ const b = new Uint8Array(Buffer.from('123456789')); ok(X.crc7(b, 0, 9) === 0xB4C8, 'CRC16 (Gen 7) Testvektor'); }
console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
