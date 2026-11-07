// Prüft den Gen-1/2-Spielstandkern mit künstlichen Spielständen: node test/test_save_gb.js
global.window = {}; global.document = {};
['data/pk_personal.js', 'data/pk_gb.js', 'data/pk_text.js', 'data/pk_blocks.js', 'js/nds.js', 'js/gen3.js', 'js/savedit.js', 'js/savedit_gb.js'].forEach(f => { try { require('../' + f); } catch (e) { if (!/pk_blocks|nds|gen3/.test(f)) throw e; } });
const S = window.CCSave, GB = window.CCSaveGB; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
// Gen 1
{
  const u = new Uint8Array(0x8000);
  u[0x2F2C] = 0; u[0x2F2D] = 0xFF; u[0x30C0] = 0; u[0x30C1] = 0xFF;
  let sum = 0; for (let i = 0x2598; i < 0x3523; i++) sum = (sum + u[i]) & 255; u[0x3523] = (~sum) & 255;
  const sv = GB.open1(u); ok(sv && sv.gen === 1, 'Gen 1 erkannt');
  const t = sv.getTrainer(); t.name = 'ASH'; t.tid = 12345; t.money = 4321; sv.setTrainer(t);
  const d = GB.PK1.blank(25, 12345, 'ASH', 12);
  GB.PK1.set(d, 'nick', 'PIKA'); GB.PK1.set(d, 'move', 85, 1); GB.PK1.set(d, 'pp', 15, 1);
  const st = GB.calc(sv.baseOf(25), 12, [8, 8, 8, 8], [0, 0, 0, 0, 0]); GB.PK1.setStats(d, st); GB.PK1.set(d, 'hp', st[0]);
  sv.setParty([d]); sv.setBoxMon(0, 0, GB.PK1.blank(1, 1, 'X', 5));
  const out = sv.finish(); const sv2 = GB.open1(out);
  ok(sv2 && sv2.checksumOk, 'Gen 1 Prüfsumme nach Speichern gültig');
  const p = sv2.getParty()[0];
  ok(p && GB.PK1.get(p, 'species') === 25 && GB.PK1.get(p, 'nick') === 'PIKA' && GB.PK1.get(p, 'level') === 12, 'Gen 1 Pokémon (Pikachu, Spitzname, Level) bleibt erhalten');
  ok(sv2.getTrainer().name === 'ASH' && sv2.getTrainer().money === 4321 && sv2.getTrainer().tid === 12345, 'Gen 1 Trainer bleibt erhalten');
  ok(GB.PK1.stats(p)[0] === st[0] && GB.PK1.get(p, 'move', 1) === 85, 'Gen 1 Werte/Attacke');
  ok(sv2.getBoxMon(0, 0) && GB.PK1.get(sv2.getBoxMon(0, 0), 'species') === 1, 'Gen 1 Box');
  ok(out[0x2F2C + 1] === 0x54, 'Gen 1: interne ID von Pikachu = 0x54');
}
// Gen 2 (Kristall)
{
  const u = new Uint8Array(0x8000), o = { Party: 0x2865, CurrentBox: 0x2D10 };
  u[o.Party] = 0; u[o.Party + 1] = 0xFF; u[o.CurrentBox] = 0; u[o.CurrentBox + 1] = 0xFF;
  let s = 0; for (let i = 0x2009; i <= 0x2B82; i++) s = (s + u[i]) & 0xFFFF; u[0x2D0D] = s & 255; u[0x2D0E] = s >> 8;
  const sv = GB.open2(u); ok(sv && sv.gen === 2 && sv.game === 'C', 'Gen 2 Kristall erkannt');
  const d = GB.PK2.blank(152, 777, 'GOLD', 5); GB.PK2.set(d, 'item', 1); GB.PK2.setShiny(d, true);
  ok(GB.PK2.shiny(d), 'Gen 2 Shiny über DVs');
  sv.setParty([d]); sv.setBoxMon(2, 0, GB.PK2.blank(249, 1, 'Q', 50));
  const t = sv.getTrainer(); t.money = 99999; t.name = 'KRIS'; t.gender = 1; sv.setTrainer(t);
  const out = sv.finish(), sv2 = GB.open2(out);
  ok(sv2 && sv2.getParty().length === 1 && GB.PK2.get(sv2.getParty()[0], 'species') === 152 && GB.PK2.get(sv2.getParty()[0], 'item') === 1, 'Gen 2 Team-Pokémon bleibt erhalten');
  ok(GB.PK2.get(sv2.getBoxMon(2, 0), 'species') === 249, 'Gen 2 Box 3');
  ok(sv2.getTrainer().money === 99999 && sv2.getTrainer().name === 'KRIS' && sv2.getTrainer().gender === 1, 'Gen 2 Trainer');
  ok(S.open(out) && S.open(out).gen === 2, 'CCSave.open erkennt Gen 2');
}
console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
