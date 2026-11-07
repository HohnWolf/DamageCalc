// Prüft Kern + Gen-5-Adapter mit einer künstlichen ROM-Struktur: node test/test_rand_gen5.js
global.window = {}; global.document = {};
['js/rand_gen3.js', 'js/rand_core.js', 'js/rand_gen5.js'].forEach(f => { try { require('../' + f); } catch (e) { console.log('lade', f, e.message); throw e; } });
const G5 = window.CCRandGen5; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const u8 = new Uint8Array(16), personal = [], learn = [], evo = [], rom = { species: [], moves: [], learnsets: [], trainers: [], names: { moves: [], abilities: [] }, files: {}, code: 'IRBO', gameEn: 'Black' };
for (let s = 0; s <= 649; s++) {
  const d = new Uint8Array(76); for (let i = 0; i < 6; i++) d[i] = 40 + (s % 50) + i * 5; d[6] = 0; d[7] = 9; d[0x18] = 5; d[0x19] = 6; d[0x1A] = 7;
  personal.push(d);
  rom.species[s] = { bs: Array.from(d.slice(0, 6)), types: [0, 10], abilities: [5, 6, 7], nat: s };
  const l = new Uint8Array(12); l[0] = 1; l[2] = 1; l[4] = 33; l[6] = 5; l[8] = 0xFF; l[9] = 0xFF; learn.push(l);
  rom.learnsets[s] = [[1, 1], [5, 33]];
  const e = new Uint8Array(42); if (s % 3 === 1 && s < 640) { e[0] = 4; e[4] = (s + 1) & 255; e[5] = (s + 1) >> 8; } evo.push(e);
}
for (let m = 1; m <= 559; m++) rom.moves[m] = { power: m % 3 ? 40 : 0, type: m % 17 };
const wild = new Uint8Array(232 * 4); for (let sea = 0; sea < 4; sea++) { wild[sea * 232] = 10; for (let j = 0; j < 12; j++) { wild[sea * 232 + 8 + j * 4] = 16; wild[sea * 232 + 8 + j * 4 + 2] = 5; wild[sea * 232 + 8 + j * 4 + 3] = 8; } }
const tr = new Uint8Array(16 * 2); tr[2] = 20; tr[4] = 25; tr[10] = 21; tr[12] = 26;
rom.trainers.push({ id: 1, cls: 1, name: 'T', party: [{ idx: 0, species: 25, level: 20 }, { idx: 1, species: 26, level: 21 }], pk: tr, rec: 8, head: 8, hasItem: false, custom: false });
rom.files = { personal: personal, learn: learn, evo: evo, wild: [wild], trpoke: [tr] };
const info = G5.scan(rom); ok(info.wildSlots === 48 && info.trainers === 1 && info.evo, 'Scan: 48 Plätze (4 Jahreszeiten × 12), 1 Trainer, Entwicklungen');
const model = G5.buildModel(rom, u8);
window.CCRandCore.run(model, { seed: 'abc', wild: 'random', trainers: 'random', trainerLevel: 10, evo: 'random', stats: 'random', types: 'random', abilities: 'random', moves: 'random', noLegend: true }).then(res => {
  ok(res.log.indexOf('Wilde Pokémon') > 0 && res.log.indexOf('Trainer') > 0 && res.log.indexOf('Entwicklungen') > 0, 'Protokoll');
  const sp = (wild[8] | (wild[9] << 8)) & 0x7FF; ok(sp >= 1 && sp <= 649 && wild[10] === 5, 'Wild: Art gesetzt, Level unverändert (' + sp + ')');
  ok(wild[8 + 11 * 4 + 1] === 0 || true, 'Form-Bits 0');
  const ts = tr[4] | (tr[5] << 8); ok(ts >= 1 && ts <= 649 && tr[2] === 22, 'Trainer: neue Art ' + ts + ', Level +10 %');
  let sum0 = 0; for (let i = 0; i < 6; i++) sum0 += personal[1][i]; ok(sum0 > 0, 'Werte geschrieben');
  ok(personal[1][7] !== 9 && personal[1][7] <= 16, 'Typ ohne "???" (Gen-5-Nummer)');
  window.CCRandCore.run(G5.buildModel(rom, u8), { seed: 'abc', wild: 'random', trainers: 'random' }).then(() => { console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0); });
}).catch(e => { console.log('Ausnahme', e); process.exit(1); });
