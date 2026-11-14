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
  // Ruhmeshalle Gen 1: 2 Teams, das neuere mit Pikachu (0x54) und Bisasam (0x99)
  require('../js/savhof.js');
  const u2 = new Uint8Array(out);
  const put = (t, m, id, lv, nick) => { const o = 0x598 + t * 96 + m * 16; u2[o] = id; u2[o + 1] = lv; for (let i = 0; i < 11; i++) u2[o + 2 + i] = 0x50; for (let i = 0; i < nick.length; i++) u2[o + 2 + i] = 0x80 + nick.charCodeAt(i) - 65; u2[o + 16 > 0 ? o + 13 : 0] = 0x50; };
  put(0, 0, 0xB1, 40, 'AB'); put(0, 1, 0xFF, 0, ''); put(1, 0, 0x54, 55, 'PIKA'); put(1, 1, 0x99, 50, 'BISA'); put(1, 2, 0xFF, 0, ''); u2[0x284E] = 2;
  const sv3 = GB.open1(u2); window.CCSaveHof(sv3);
  const hf = sv3.hof && sv3.hof.entries();
  ok(hf && hf.length === 2 && hf[0].team.length === 2 && hf[0].team[0].species === 25 && hf[0].team[0].level === 55 && hf[0].team[0].nick === 'PIKA' && hf[0].team[1].species === 1, 'Gen 1 Ruhmeshalle: neueste zuerst, Arten national, Spitzname');
  sv3.hof.clear(); ok(sv3.hof.entries().length === 0, 'Gen 1 Ruhmeshalle löschen');
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
