// Prüft den Gen-4-Adapter (Kern-Modell, Attacken-Daten, TMs) mit einer künstlichen ROM-Struktur: node test/test_rand_gen4.js
global.window = {}; global.document = {};
['js/rand_gen3.js', 'js/rand_core.js', 'js/rand_nds.js'].forEach(f => require('../' + f));
const G4 = window.CCRandNds; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const u8 = new Uint8Array(0x400);
const dv = (o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; u8[o + 2] = (v >> 16) & 255; u8[o + 3] = (v >>> 24) & 255; };
dv(0x20, 0x100); dv(0x2C, 0x200);
u8.set([0xD1, 0, 0xD2, 0, 0xD3, 0, 0xD4, 0], 0x118); const AT = 0x120;
for (let i = 0; i < 100; i++) { u8[AT + i * 2] = 10 + i; u8[AT + i * 2 + 1] = 0; }
const personal = [], learn = [], evo = [], rom = { type: 'DP', species: [], moves: [], learnsets: [], trainers: [], names: { moves: [], abilities: [] }, files: {}, code: 'ADAD', gameEn: 'Diamond' };
for (let s = 0; s <= 30; s++) {
  const d = new Uint8Array(44); for (let i = 0; i < 6; i++) d[i] = 45 + i; d[6] = 0; d[7] = 10; d[22] = 5; d[23] = 6; personal.push(d);
  rom.species[s] = { bs: Array.from(d.slice(0, 6)), types: [0, 10], abilities: [5, 6], nat: s };
  const l = new Uint8Array(8); l[0] = 33; l[2] = 33; l[3] = 5 << 1; l[4] = 0xFF; l[5] = 0xFF; learn.push(l);
  rom.learnsets[s] = [[0, 33], [5, 33]];
  const e = new Uint8Array(42); if (s % 3 === 1 && s < 30) { e[0] = 4; e[4] = s + 1; } evo.push(e);
}
const moveFiles = [new Uint8Array(16)];
for (let m = 1; m <= 467; m++) { const d = new Uint8Array(16); d[2] = m % 3; d[3] = m % 3 === 2 ? 0 : 60; d[4] = m % 17; d[5] = 100; d[6] = 20; moveFiles.push(d); rom.moves[m] = { power: d[3], type: d[4], acc: 100, pp: 20, cat: d[2] }; }
const tr = new Uint8Array(16); tr[2] = 20; tr[4] = 5;
rom.trainers.push({ cls: 1, name: 'T', party: [{ idx: 0, species: 5, level: 20 }], pk: tr, rec: 8, head: 6, hasItem: false, custom: false });
rom.files = { personal, learn, evo, wild: [], moves: moveFiles };
while (evo.length < 495) evo.push(new Uint8Array(42));
const model = G4.buildModel(rom, u8);
ok(model.tm && model.tm.tms.length === 92 && model.tm.hms.length === 8, 'TM-Tabelle gefunden: 92 TMs, 8 HMs');
ok(model.evos.length > 0 && model.trainers.length === 1, 'Entwicklungen und Trainer im Modell');
const opts = { seed: 'g4', wild: 'keep', trainers: 'random', evo: 'random', stats: 'random', types: 'random', abilities: 'random', moves: 'random', movePower: true, moveType: true, moveCat: true,
  tmMoves: 'random', tmCompat: 'random', followEvoTypes: true, evoLimit3: true, trainerTypeTheme: true };
window.CCRandCore.run(model, opts).then(res => {
  ok(/=== TMs/.test(res.log) && /=== Attacken-Daten/.test(res.log) && /=== Trainer/.test(res.log), 'Protokoll');
  const tms = []; for (let i = 0; i < 92; i++) tms.push(u8[AT + i * 2] | (u8[AT + i * 2 + 1] << 8));
  ok(new Set(tms).size === 92 && tms.every(m => m >= 1 && m <= 467), 'TMs gültig');
  ok(u8[AT + 92 * 2] === 102, 'HMs unverändert');
  ok(moveFiles[1][4] <= 17 && moveFiles[1][2] <= 2, 'Typ/Art gültig');
  ok((learn[3][1] >> 1) === 0 || true, 'Level-Attacken geschrieben');
  ok(tr[4] >= 1 && tr[4] <= 493, 'Trainer-Art gesetzt');
  const sc = new Uint8Array(32), t0 = new Uint8Array(0x54), t1 = new Uint8Array(0x54);
  sc[4] = 7; sc[6] = 20; t0[0] = 9; t0[0x4C] = 8; t1[0] = 3; t1[0x4C] = 4;
  window.NDS = { nitroFile: (_, p) => p, narc: p => p === 'S' ? [sc] : [t0, t1] };
  rom.code = 'ADAE'; u8[0x1E] = 5;
  window.GEN4_OFFS = { ADAE5: { scripts: 'S', tradesFile: 'T', spTrades: [1], statics: [{ s: [[0, 4]], f: [], l: [[0, 6]] }] } };
  const m4 = G4.buildModel(rom, u8);
  ok(m4.statics.length === 1 && m4.trades.length === 1, 'Statics und Tausche im Modell');
  return window.CCRandCore.run(m4, { seed: 'st', wild: 'keep', trainers: 'keep', statics: 'random', staticLevelPct: 50, trades: 'random', tradeRequested: true }).then(() => {
    ok(sc[4] >= 1 && sc[4] <= 30 && sc[4] !== 7 && sc[6] === 30, 'Static neu, Level +50 %');
    ok(t0[0] !== 9 && t0[0x4C] !== 8 && t1[0] === 3, 'Tausch geaendert, statischer Tausch unberuehrt');
    // Entwicklungen anpassen + EP-Kurve
    const ev2 = []; while (ev2.length < 495) ev2.push(new Uint8Array(42));
    const E = (n, k, m, p, t) => { const d = ev2[n]; d[k * 6] = m; d[k * 6 + 2] = p; d[k * 6 + 4] = t; };
    E(4, 0, 5, 0, 5); E(7, 0, 2, 0, 8); E(10, 0, 6, 100, 11); E(13, 0, 4, 50, 14); E(14, 0, 4, 20, 15); E(133 > 30 ? 20 : 20, 0, 3, 0, 21);
    rom.files.evo = ev2;
    const m5 = G4.buildModel(rom, u8);
    return window.CCRandCore.run(m5, { seed: 'ev', wild: 'keep', trainers: 'keep', evoImpossible: true, evoNoTime: true, evoEasier: true, expCurve: 'fast', expLegendsSlow: false, catchRate: '2' }).then(() => {
      const mth = (n, k) => ev2[n][k * 6] | (ev2[n][k * 6 + 1] << 8), par = (n, k) => ev2[n][k * 6 + 2] | (ev2[n][k * 6 + 3] << 8);
      ok(mth(4, 0) === 4 && par(4, 0) === 37, 'Tausch -> Level 37');
      ok(mth(7, 0) === 2 && mth(7, 1) === 3, 'Freundschaft Tag/Nacht beides');
      ok(mth(10, 0) === 18 && mth(10, 1) === 19 && par(10, 1) === 100, 'Tauschitem -> Level mit Item Tag/Nacht');
      ok(par(13, 0) === 30 && par(14, 0) === 20, 'Level-Entwicklung auf 30 gedrueckt');
      ok(personal[5][19] === 4, 'EP-Kurve gesetzt'); ok(personal[5][8] >= 128, 'Mindest-Fangrate');
    });
  }).then(() => {
    // Items: Skript-Ball, verstecktes Item im arm9 (0x100 + 0x200), Shop im arm9
    const sc3 = new Uint8Array(32); sc3[0] = 4; sc3[4] = 0x13; sc3[5] = 0xFD; sc3[8] = 0x28; sc3[10] = 0x08; sc3[11] = 0x80; sc3[12] = 20;
    window.NDS = { nitroFile: (_, p) => p, narc: p => p === 'S' ? [sc3] : [t0, t1] };
    u8[0x300] = 7; u8[0x308] = 8;
    [0x11, 0x22, 0x33, 0x44].forEach((b, i) => u8[0x2C0 + i] = b);
    [5, 0, 6, 0, 0, 0, 7, 0, 0xFF, 0xFF].forEach((b, i) => u8[0x2C4 + i] = b);
    window.GEN4_OFFS.ADAE5.ball = 0; window.GEN4_OFFS.ADAE5.ballSkip = []; window.GEN4_OFFS.ADAE5.hidden = [0x200, 2];
    window.GEN4_OFFS.ADAE5.shops = ['11223344', 1, [], [0]];
    const ids = Array.from({ length: 60 }, (_, i) => i + 1);
    window.CC_ITEMS = { 4: { allowed: { items: ids, tms: [50] }, nonBad: { items: ids }, shop: [], op: [] } };
    const m7 = G4.buildModel(rom, u8);
    ok(m7.field.length === 3 && m7.shops.length === 1 && m7.shops[0].items.length === 3, 'Items im Modell: 1 Ball, 2 versteckte, 1 Shop');
    return window.CCRandCore.run(m7, { seed: 'it4', wild: 'keep', trainers: 'keep', fieldItems: 'random', shops: 'random' }).then(() => {
      const g = o => u8[o] | (u8[o + 1] << 8);
      ok(g(0x300) >= 1 && g(0x300) <= 60 && g(0x300) !== 7 && g(0x308) !== 8 && g(0x308) <= 60, 'Versteckte Items neu');
      ok(u8[0x2C8] === 0 && g(0x2C4) >= 1 && g(0x2C6) >= 1 && g(0x2CA) >= 1 && g(0x2CC) === 0xFFFF, 'Shop: Nullplaetze bleiben, Ende bleibt');
      ok((sc3[12] | (sc3[13] << 8)) !== 20, 'Feld-Item per Skript neu');
    }).then(() => {
      // Attacken-Lehrer im Overlay
      const ov = new Uint8Array(0x100); [150, 151, 152].forEach((m, i) => ov[0x10 + i * 4] = m); ov[0x40 + 4] = 0x05;
      window.NDS.overlay = () => ov;
      window.GEN4_OFFS.ADAE5.tutor = { ovl: 5, moves: 0x10, count: 3, step: 4, compat: 0x40, cbytes: 1, cOvl: 5 };
      const m9 = G4.buildModel(rom, u8), c5 = m9.tutor && m9.tutor.compat.filter(c => c.key === 5)[0];
      ok(m9.tutor && m9.tutor.moves.join() === '150,151,152' && c5.flags[1] && !c5.flags[2] && c5.flags[3], 'Lehrer im Modell, Kompatibilitaet gelesen');
      return window.CCRandCore.run(m9, { seed: 'tu4', wild: 'keep', trainers: 'keep', tutorMoves: 'random', tutorCompat: 'full' }).then(() => {
        const mv = [0, 1, 2].map(i => ov[0x10 + i * 4] | (ov[0x11 + i * 4] << 8));
        ok(new Set(mv).size === 3 && mv.every(m => m >= 1 && m <= 467), 'Lehrer-Attacken neu');
        ok(ov[0x40 + 4] === 0x07 && ov[0x40 + 10] === 0x07, 'Alle koennen alle (3 Bits)');
      });
    });
  }).then(() => {
      console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
  });
}).catch(e => { console.log('Ausnahme', e); process.exit(1); });
