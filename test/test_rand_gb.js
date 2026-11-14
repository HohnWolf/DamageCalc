// Rauchtest für den Gen-1/2-Randomizer mit künstlichen ROMs (nur Kopf + ein paar Datensätze): node test/test_rand_gb.js
global.window = {}; global.document = {};
['js/rand_gen3.js', 'js/rand_core.js', 'data/items_data.js', 'data/pk_gb.js', 'data/gb_roms.js', 'data/pk_text.js', 'js/rand_gb.js'].forEach(f => require('../' + f));
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
  for (let q = 0; q < 55; q++) u[e.TMMovesOffset + q] = 10 + q; // 50 TMs + 5 HMs
  u[0x49320] = 0x85; u[0x4931F] = 5; u[0x71B7B] = 0x70; u[0x71B7B + 1] = 0x71; // Magikarp (statisch) und ein Tausch
  for (let n = 1; n <= 151; n++) { const o = n === 151 ? e.MewStatsOffset : e.PokemonStatsOffset + (n - 1) * 28; u[o + 20] = 0x0F; }
  { // Karte 0: Bank 1, Kopf bei 0x4100 (keine Verbindungen), Objekte bei 0x80200
    const ORIG = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 30];
    u[e.MapBanks] = 0x20; u[e.MapAddresses] = 0x00; u[e.MapAddresses + 1] = 0x41;
    u[0x80100 + 9] = 0; u[0x80100 + 10] = 0x00; u[0x80100 + 11] = 0x42;
    u[0x80200 + 1] = 0; u[0x80200 + 2] = 0; u[0x80200 + 3] = 14; // keine Warps, keine Schilder, 14 Objekte
    let p = 0x80200 + 4;
    for (let i = 0; i < 12; i++) { u[p + 5] = 0x80; u[p + 6] = ORIG[i]; p += 7; } // Itembälle (ohne die gesperrten Orden 21-28)
    u[p + 5] = 0x40; p += 8; // Trainer
    u[p + 5] = 0x00; p += 6; // normale Person
    u[e.SpecialMapList] = 0xFF;
  }
  return u;
}
{
  const u = mkGen1(), rom = RG.parseRom(u);
  ok(rom.gen === 1 && /Red/.test(rom.game), 'Gen 1: Rot (U) erkannt');
  const info = RG.scan(rom, u); ok(info.wildSlots >= 10 && info.evo && info.starters, 'Gen 1: Scan (' + JSON.stringify(info) + ')');
  RG.run(u, rom, { seed: 'x', fieldItems: 'random', wild: 'random', trainers: 'random', trainerLevel: 10, evo: 'random', stats: 'random', types: 'random', moves: 'random', starters: 'random', tmMoves: 'random', tmCompat: 'random', movePower: true, moveType: true, expCurve: 'fast', evoImpossible: true, statics: 'random', staticLevelPct: 100, trades: 'random', tradeRequested: true }).then(res => {
    { const e1 = E.g1[0], d1 = res.data, t1 = Array.from({ length: 50 }, (_, i) => d1[e1.TMMovesOffset + i]); ok(new Set(t1).size === 50 && t1.every(m => m >= 1 && m <= 165), 'Gen 1: TMs gueltig'); ok(d1[e1.TMMovesOffset + 50] === 60, 'Gen 1: HMs unveraendert'); ok(d1[e1.PokemonStatsOffset + 19] === 4, 'Gen 1: EP-Kurve schnell'); ok(/=== Attacken-Daten/.test(res.log), 'Gen 1: Attacken-Daten'); const toNat = window.PKGB.toNat; ok(toNat[d1[0x49320]] && toNat[d1[0x49320]] !== 129 && d1[0x4931F] === 10, 'Gen 1: Static neu, Level +100 %'); ok(toNat[d1[0x71B7B]] && toNat[d1[0x71B7B + 1]] && /=== Ingame-Tausche/.test(res.log), 'Gen 1: Tausch gueltig'); }
    ok(res.log.indexOf('Wilde Pokémon') > 0 && res.data[0x14E] * 256 + res.data[0x14F] > 0, 'Gen 1: Lauf + Prüfsumme');
    { const items = Array.from({ length: 12 }, (_, i) => res.data[0x80200 + 4 + i * 7 + 6]); ok(/=== Items auf dem Feld \(12\)/.test(res.log) && items.some((v, i) => v !== [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 30][i]) && items.every(v => v >= 1), 'Gen 1: Feld-Items gefunden und gewürfelt (' + items.join(',') + ')'); ok(res.data[0x80200 + 4 + 12 * 7 + 5] === 0x40, 'Gen 1: Trainer-Objekt unberührt (' + res.data[0x80200 + 4 + 12 * 7 + 5] + ')'); }
    const e = E.g1[0]; const wr = Math.floor(e.WildPokemonTableOffset / 0x4000) * 0x4000 + 0x200;
    const d = res.data; ok(d[wr + 2] !== 0x54 || d[wr + 4] !== 0x54, 'Gen 1: wilde Art geändert (' + d[wr + 2] + ')');
    ok(d[wr + 1] === 5, 'Gen 1: Level unverändert');
    const tr = Math.floor(e.TrainerDataTableOffset / 0x4000) * 0x4000 + 0x300; ok(d[tr] === 22, 'Gen 1: Trainer-Level 20 → 22 (' + d[tr] + ')');
    return mk2();
  }).catch(e => { console.log('Ausnahme', e); process.exit(1); });
}
function mk2(idx) {
  idx = idx || 0;
  const e = E.g2[idx], u = new Uint8Array(0x200000); // Gold (U) bzw. Kristall (U)
  u[0x143] = 0x80; Buffer.from(e.Game).forEach((c, i) => u[0x13F + i] = c); u[0x14C] = e.Version; u[0x14A] = e.NonJapanese;
  for (let n = 1; n <= 251; n++) { const o = e.PokemonStatsOffset + (n - 1) * 32; u[o] = n; for (let k = 1; k <= 6; k++) u[o + k] = 40 + k * 5; u[o + 7] = 0; u[o + 8] = 20; }
  const tbl = e.PokemonMovesetsTableOffset, bank = Math.floor(tbl / 0x4000);
  for (let i = 1; i <= 251; i++) { const real = bank * 0x4000 + 0x100 + i * 16, ptr = 0x4000 + (real % 0x4000); u[tbl + (i - 1) * 2] = ptr & 255; u[tbl + (i - 1) * 2 + 1] = ptr >> 8; u[real] = 1; u[real + 1] = 16; u[real + 2] = 2; u[real + 3] = 0; u[real + 4] = 5; u[real + 5] = 10; u[real + 6] = 0; }
  let wo = e.WildPokemonOffset; for (let p = 0; p < 3; p++) { if (p === 0) { u[wo] = 3; u[wo + 1] = 4; for (let s = 0; s < 21; s++) { u[wo + 5 + s * 2] = 5; u[wo + 5 + s * 2 + 1] = 16; } wo += 47; } u[wo++] = 0xFF; u[wo++] = 0xFF; }
  u[e.FishingWildsOffset + 1] = 129; u[e.HeadbuttWildsOffset] = 0xFF; u[e.BCCWildsOffset] = 0xFF;
  const to = e.TrainerDataTableOffset; for (let c = 0; c < e.TrainerClassAmount; c++) { const tb = Math.floor(to / 0x4000), tp = 0x4000 + 0x300 + c * 0x40; u[to + c * 2] = tp & 255; u[to + c * 2 + 1] = tp >> 8; const tr = tb * 0x4000 + 0x300 + c * 0x40; for (let t = 0; t < e.TrainerDataClassCounts[c]; t++) { /* nur ein Trainer pro Klasse mit Daten */ } u[tr] = 0x82; u[tr + 1] = 0x50; u[tr + 2] = 0; u[tr + 3] = 20; u[tr + 4] = 25; u[tr + 5] = 0xFF; }
  { // Karten-Events: Gruppe 1 mit einer Karte (2 versteckte Items über Schilder, 10 Itembälle als Personen)
    const mh = e.MapHeaders, mhb = Math.floor(mh / 0x4000), A = mhb * 0x4000 + 0x300, S = 0xC0100, E = 0xC0200, wp = (o, v) => { u[o] = v & 255; u[o + 1] = v >> 8; };
    wp(mh, 0x4000 + (A % 0x4000)); for (let g = 1; g < 26; g++) wp(mh + g * 2, 0x4000 + ((A + 9) % 0x4000));
    u[A] = 0x30; wp(A + 3, 0x4100); // zweiter Kartenkopf in Bank 0x30
    u[S + 6] = 0x30; wp(S + 9, 0x4200); // Event-Kopf in Bank 0x30
    u[E + 2] = 0; u[E + 3] = 0; u[E + 4] = 2;
    for (let k = 0; k < 2; k++) { u[E + 5 + k * 5 + 2] = 7; wp(E + 5 + k * 5 + 3, 0x4300 + k * 0x10); u[0xC0300 + k * 0x10 + 2] = 18 + k; }
    u[E + 15] = 10;
    for (let k = 0; k < 10; k++) { u[E + 16 + k * 13 + 7] = 1; wp(E + 16 + k * 13 + 9, 0x4400 + k * 4); u[0xC0400 + k * 4] = 20 + k; }
  }
  const rom = RG.parseRom(u);
  if (e.MoveTutorMoves) { // Kristall: Attacken-Namen (Byte-Folgen, Ende 0x50), drei Lehrer-Attacken, Kompatibilitäts-Bits 1-3
    const nm = (m) => [0x80 + (m % 26), 0x80 + ((m * 7) % 26), 0x80 + ((m * 13) % 26)];
    let np = e.MoveNamesOffset; for (let m = 1; m <= 251; m++) { nm(m).forEach(b => u[np++] = b); u[np++] = 0x50; }
    [118, 120, 122].forEach((m, k) => u[e.MoveTutorMoves[k]] = m);
    for (let n = 1; n <= 251; n++) u[e.PokemonStatsOffset + (n - 1) * 32 + 31] = n % 2 ? 0x0F : 0x01;
  }
  ok(rom.gen === 2 && (idx === 0 ? /Gold/ : /Crystal/).test(rom.game), 'Gen 2: ' + rom.game + ' erkannt');
  const info = RG.scan(rom, u); ok(info.wildSlots >= 21 && info.evo && info.starters, 'Gen 2: Scan (' + JSON.stringify(info) + ')');
  return RG.run(u, rom, { seed: 'y', fieldItems: 'random', tutorMoves: 'random', tutorCompat: 'random', wild: idx ? 'keep' : 'random', trainers: idx ? 'keep' : 'random', evo: 'random', stats: 'random', types: 'random', moves: idx ? 'keep' : 'random', starters: 'random' }).then(res => {
    ok(idx || res.log.indexOf('Trainer') > 0, 'Gen 2: Lauf');
    { const hid = [0xC0302, 0xC0312].map(o => res.data[o]), balls = Array.from({ length: 10 }, (_, k) => res.data[0xC0400 + k * 4]);
      ok(/=== Items auf dem Feld \(12\)/.test(res.log) && (hid[0] !== 18 || hid[1] !== 19 || balls.some((v, k) => v !== 20 + k)), 'Gen 2: Feld-Items (versteckt + Itembälle) gefunden und gewürfelt (' + hid.join(',') + ' | ' + balls.join(',') + ')'); }
    if (e.MoveTutorMoves) {
      const mv = e.MoveTutorMoves.map(o => res.data[o]), ptr = res.data[e.MoveTutorMenuOffset] | (res.data[e.MoveTutorMenuOffset + 1] << 8), ns = e.MoveTutorMenuNewSpace;
      ok(mv.every(m => m >= 1 && m <= 251) && mv.join() !== '118,120,122', 'Kristall: Lehrer-Attacken gemischt (' + mv.join(',') + ')');
      ok(ptr === 0x4000 + (ns % 0x4000) && res.data[ns] === 0x80 && res.data[ns + 1] === 4, 'Kristall: Menü-Zeiger auf neuen Bereich');
      const nm = (m) => [0x80 + (m % 26), 0x80 + ((m * 7) % 26), 0x80 + ((m * 13) % 26)];
      const exp = [0x80, 4].concat(...mv.map(m => nm(m).concat([0x50])), [0x82, 0x80, 0x8D, 0x82, 0x84, 0x8B, 0x50]);
      ok(exp.every((b, i) => res.data[ns + i] === b), 'Kristall: Menü enthält die neuen Attackennamen und CANCEL' + (exp.every((b, i) => res.data[ns + i] === b) ? '' : ' exp=' + exp.join() + ' got=' + Array.from(res.data.slice(ns, ns + exp.length)).join()));
    }
    if (idx === 0) return mk2(E.g2.findIndex(r => r.MoveTutorMoves && r.MoveTutorMenuNewSpace));
    console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
  });
}
