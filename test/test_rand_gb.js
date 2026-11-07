// Rauchtest für den Gen-1/2-Randomizer mit künstlichen ROMs (nur Kopf + ein paar Datensätze): node test/test_rand_gb.js
global.window = {}; global.document = {};
['js/rand_gen3.js', 'js/rand_core.js', 'data/pk_gb.js', 'data/gb_roms.js', 'data/pk_text.js', 'js/rand_gb.js'].forEach(f => require('../' + f));
const RG = window.CCRandGB, E = window.GBROMS; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
function mkGen1() {
  const e = E.g1[0], u = new Uint8Array(0x100000); // Red (U)
  Buffer.from(e.Game).forEach((c, i) => u[0x134 + i] = c); u[0x14C] = e.Version; u[0x14A] = e.NonJapanese;
  for (let n = 1; n <= 151; n++) { const o = n === 151 ? e.MewStatsOffset : e.PokemonStatsOffset + (n - 1) * 28; u[o] = n; for (let k = 1; k <= 5; k++) u[o + k] = 40 + k * 5; u[o + 6] = 0; u[o + 7] = 21; u[o + 15] = 33; }
  // Entwicklungs-/Attackendaten für interne ID 1 (Rhydon): Entwicklung → interne 2, Attacken
  const tbl = e.PokemonMovesetsTableOffset, data = 0x3C000; for (let i = 1; i <= e.InternalPokemonCount; i++) { u[tbl + (i - 1) * 2] = (data + i * 16) & 0xFF; u[tbl + (i - 1) * 2 + 1] = ((data + i * 16) >> 8) & 0xFF; }
  // Zeigertabellen sind bank-relativ: bank = tbl/0x4000; erlaubte Adresse = 0x4000 + (off % 0x4000)
  const bank = Math.floor(tbl / 0x4000); for (let i = 1; i <= e.InternalPokemonCount; i++) { const real = bank * 0x4000 + 0x100 + i * 16, ptr = 0x4000 + (real % 0x4000); u[tbl + (i - 1) * 2] = ptr & 255; u[tbl + (i - 1) * 2 + 1] = ptr >> 8; u[real] = 1; u[real + 1] = 16; u[real + 2] = 2; u[real + 3] = 0; u[real + 4] = 5; u[real + 5] = 10; u[real + 6] = 0; }
  // Wildtabelle: 1 Karte
  const wt = e.WildPokemonTableOffset; const wb = Math.floor(wt / 0x4000); const wp = 0x4000 + 0x200; u[wt] = wp & 255; u[wt + 1] = wp >> 8; u[wt + 2] = 0xFF; u[wt + 3] = 0xFF;
  const wr = wb * 0x4000 + 0x200; u[wr] = 10; for (let s = 0; s < 10; s++) { u[wr + 1 + s * 2] = 5; u[wr + 2 + s * 2] = 0x54; } u[wr + 21] = 0;
  // Trainer: Klasse 1, ein Trainer, normaler Typ
  const to = e.TrainerDataTableOffset, tb = Math.floor(to / 0x4000), tp = 0x4000 + 0x300; for (let c = 1; c <= 47; c++) { u[to + (c - 1) * 2] = tp & 255; u[to + (c - 1) * 2 + 1] = tp >> 8; }
  const tr = tb * 0x4000 + 0x300; u[tr] = 20; u[tr + 1] = 0x54; u[tr + 2] = 0x99; u[tr + 3] = 0;
  return u;
}
{
  const u = mkGen1(), rom = RG.parseRom(u);
  ok(rom.gen === 1 && /Red/.test(rom.game), 'Gen 1: Rot (U) erkannt');
  const info = RG.scan(rom, u); ok(info.wildSlots >= 10 && info.evo && info.starters, 'Gen 1: Scan (' + JSON.stringify(info) + ')');
  RG.run(u, rom, { seed: 'x', wild: 'random', trainers: 'random', trainerLevel: 10, evo: 'random', stats: 'random', types: 'random', moves: 'random', starters: 'random' }).then(res => {
    ok(res.log.indexOf('Wilde Pokémon') > 0 && res.data[0x14E] * 256 + res.data[0x14F] > 0, 'Gen 1: Lauf + Prüfsumme');
    const e = E.g1[0]; const wr = Math.floor(e.WildPokemonTableOffset / 0x4000) * 0x4000 + 0x200;
    const d = res.data; ok(d[wr + 2] !== 0x54 || d[wr + 4] !== 0x54, 'Gen 1: wilde Art geändert (' + d[wr + 2] + ')');
    ok(d[wr + 1] === 5, 'Gen 1: Level unverändert');
    const tr = Math.floor(e.TrainerDataTableOffset / 0x4000) * 0x4000 + 0x300; ok(d[tr] === 22, 'Gen 1: Trainer-Level 20 → 22 (' + d[tr] + ')');
    return mk2();
  }).catch(e => { console.log('Ausnahme', e); process.exit(1); });
}
function mk2() {
  const e = E.g2[0], u = new Uint8Array(0x200000); // Gold (U)
  u[0x143] = 0x80; Buffer.from(e.Game).forEach((c, i) => u[0x13F + i] = c); u[0x14C] = e.Version; u[0x14A] = e.NonJapanese;
  for (let n = 1; n <= 251; n++) { const o = e.PokemonStatsOffset + (n - 1) * 32; u[o] = n; for (let k = 1; k <= 6; k++) u[o + k] = 40 + k * 5; u[o + 7] = 0; u[o + 8] = 20; }
  const tbl = e.PokemonMovesetsTableOffset, bank = Math.floor(tbl / 0x4000);
  for (let i = 1; i <= 251; i++) { const real = bank * 0x4000 + 0x100 + i * 16, ptr = 0x4000 + (real % 0x4000); u[tbl + (i - 1) * 2] = ptr & 255; u[tbl + (i - 1) * 2 + 1] = ptr >> 8; u[real] = 1; u[real + 1] = 16; u[real + 2] = 2; u[real + 3] = 0; u[real + 4] = 5; u[real + 5] = 10; u[real + 6] = 0; }
  let wo = e.WildPokemonOffset; for (let p = 0; p < 3; p++) { if (p === 0) { u[wo] = 3; u[wo + 1] = 4; for (let s = 0; s < 21; s++) { u[wo + 5 + s * 2] = 5; u[wo + 5 + s * 2 + 1] = 16; } wo += 47; } u[wo++] = 0xFF; u[wo++] = 0xFF; }
  u[e.FishingWildsOffset + 1] = 129; u[e.HeadbuttWildsOffset] = 0xFF; u[e.BCCWildsOffset] = 0xFF;
  const to = e.TrainerDataTableOffset; for (let c = 0; c < e.TrainerClassAmount; c++) { const tb = Math.floor(to / 0x4000), tp = 0x4000 + 0x300 + c * 0x40; u[to + c * 2] = tp & 255; u[to + c * 2 + 1] = tp >> 8; const tr = tb * 0x4000 + 0x300 + c * 0x40; for (let t = 0; t < e.TrainerDataClassCounts[c]; t++) { /* nur ein Trainer pro Klasse mit Daten */ } u[tr] = 0x82; u[tr + 1] = 0x50; u[tr + 2] = 0; u[tr + 3] = 20; u[tr + 4] = 25; u[tr + 5] = 0xFF; }
  const rom = RG.parseRom(u);
  ok(rom.gen === 2 && /Gold/.test(rom.game), 'Gen 2: Gold (U) erkannt');
  const info = RG.scan(rom, u); ok(info.wildSlots >= 21 && info.evo && info.starters, 'Gen 2: Scan (' + JSON.stringify(info) + ')');
  return RG.run(u, rom, { seed: 'y', wild: 'random', trainers: 'random', evo: 'random', stats: 'random', types: 'random', moves: 'random', starters: 'random' }).then(res => {
    ok(res.log.indexOf('Trainer') > 0, 'Gen 2: Lauf');
    console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
  });
}
