// Prüft Attacken-Daten, TMs und TM/HM-Kompatibilität (Gen 5) mit einer künstlichen ROM-Struktur: node test/test_rand_gen5_tm.js
global.window = {}; global.document = {};
['js/rand_gen3.js', 'js/rand_core.js', 'js/rand_gen5.js'].forEach(f => require('../' + f));
const G5 = window.CCRandGen5; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const u8 = new Uint8Array(0x400);
const dv = (o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; u8[o + 2] = (v >> 16) & 255; u8[o + 3] = (v >>> 24) & 255; };
dv(0x20, 0x100); dv(0x2C, 0x200);
const AT = 0x110; u8.set([0x87, 3, 0x88, 3], AT);
const tmBase = AT + 4, tmMoves = [];
for (let i = 0; i < 101; i++) { const m = 10 + i; u8[tmBase + i * 2] = m; u8[tmBase + i * 2 + 1] = 0; }
const personal = [], rom = { species: [], moves: [], learnsets: [], trainers: [], names: { moves: [], abilities: [] }, files: {}, code: 'IRBO', gameEn: 'Black' };
for (let s = 0; s <= 20; s++) {
  const d = new Uint8Array(76); for (let i = 0; i < 6; i++) d[i] = 50; d[6] = 0; d[7] = 10; personal.push(d);
  rom.species[s] = { bs: [50, 50, 50, 50, 50, 50], types: [0, 10], abilities: [1, 2, 3], nat: s };
  rom.learnsets[s] = [[1, 33]];
}
const moveFiles = [new Uint8Array(40)];
for (let m = 1; m <= 559; m++) { const d = new Uint8Array(40); d[0] = m % 17; d[2] = m % 3; d[3] = m % 3 ? 60 : 0; d[4] = 100; d[5] = 20; moveFiles.push(d); rom.moves[m] = { power: d[3], type: d[0] > 8 ? d[0] + 1 : d[0], acc: 100, pp: 20, cat: d[2] === 1 ? 0 : d[2] === 2 ? 1 : 2 }; }
rom.files = { personal, learn: [], evo: [], wild: [], trpoke: [], moves: moveFiles };
const model = G5.buildModel(rom, u8);
ok(model.tm && model.tm.tms.length === 95 && model.tm.hms.length === 6, 'TM-Tabelle gefunden: 95 TMs, 6 HMs');
ok(model.tm.tms[92] === 10 + 98 && model.tm.hms[0] === 10 + 92, 'Reihenfolge TM93 nach den HMs');
personal[3][40] = 1; // TM1
personal[3][40 + 12] = 4; // Bit 98 → TM93 (nach 6 HMs)
const m2 = G5.buildModel(rom, u8), c3 = m2.tm.compat.filter(c => c.key === 3)[0];
ok(c3.flags[1] && c3.flags[93] && !c3.flags[2], 'Kompatibilität gelesen (TM1, TM93)');
const opts = { seed: 's1', wild: 'keep', trainers: 'keep', movePower: true, moveAcc: true, movePP: true, moveType: true, moveCat: true, tmMoves: 'random', tmGoodDamaging: true, tmCompat: 'type', tmFollowEvo: true };
window.CCRandCore.run(m2, opts).then(res => {
  ok(/=== Attacken-Daten/.test(res.log) && /=== TMs/.test(res.log) && /Kompatibilität/.test(res.log), 'Protokoll');
  const tms = []; for (let i = 0; i < 92; i++) tms.push(u8[tmBase + i * 2] | (u8[tmBase + i * 2 + 1] << 8));
  ok(new Set(tms).size === 92 && tms.every(m => m >= 1 && m <= 559 && m !== 165), 'TMs: gültig und verschieden');
  const hm = []; for (let i = 0; i < 6; i++) hm.push(u8[tmBase + (92 + i) * 2]); ok(hm.join() === [102, 103, 104, 105, 106, 107].join(), 'HMs unverändert');
  let changed = 0; for (let m = 1; m <= 559; m++) if (moveFiles[m][3] !== (m % 3 ? 60 : 0) || moveFiles[m][5] !== 20) changed++;
  ok(changed > 300, 'Attacken-Daten geändert (' + changed + ')');
  ok(moveFiles[1][0] <= 16 && moveFiles[1][2] <= 2, 'Typ/Art gültig in der Datei');
  let bits = 0; for (let j = 0; j < 13; j++) bits += personal[5][40 + j].toString(2).replace(/0/g, '').length; ok(bits > 20 && bits < 101, 'Kompatibilität geschrieben (' + bits + ' von 101)');
  // Statics und Tausche (Skriptdateien als Attrappe)
  const sc0 = new Uint8Array(32), sc1 = new Uint8Array(16), tr0 = new Uint8Array(0x70), tr1 = new Uint8Array(0x70);
  sc0[4] = 7; sc0[8] = 3; sc0[6] = 25; sc1[0] = 8; sc1[2] = 9; tr1[4] = 9; tr1[0x5C] = 8;
  window.NDS = { nitroFile: (_, p) => p, narc: p => p === 'S' ? [sc0, sc1] : [tr0, tr1] };
  window.GEN5_OFFS = { IRBO: { scripts: 'S', tradesFile: 'T', unused: [0], eggs: [], statics: [{ s: [[0, 4]], f: [[0, 8]], l: [[0, 6]] }], trades: [[[1, 0, 2]]] } };
  const m3 = G5.buildModel(rom, u8);
  ok(m3.statics.length === 1 && m3.trades.length === 1, 'Statics und Tausche im Modell');
  return window.CCRandCore.run(m3, { seed: 'st', wild: 'keep', trainers: 'keep', statics: 'random', staticLevelPct: 20, trades: 'random', tradeRequested: true }).then(r3 => {
    ok(sc0[4] >= 1 && sc0[4] <= 20 && sc0[4] !== 7 && sc0[8] === 0 && sc0[6] === 30, 'Static: neue Art, Form 0, Level +20 %');
    ok(tr1[4] !== 9 && (sc1[2] | (sc1[3] << 8)) === (tr1[4] | (tr1[5] << 8)), 'Tausch: Datei und Skript stimmen ueberein');
    ok((sc1[0] | (sc1[1] << 8)) === (tr1[0x5C] | (tr1[0x5D] << 8)), 'Tausch: verlangte Art im Skript');
  }).then(() => {
    // Items: Feld-Ball per Skript
    const sc2 = new Uint8Array(32); sc2[0] = 4; sc2[4] = 0x13; sc2[5] = 0xFD; sc2[10] = 0x28; sc2[12] = 0x0C; sc2[13] = 0x80; sc2[14] = 20;
    window.NDS = { nitroFile: (_, p) => p, narc: p => p === 'S' ? [sc0, sc1, sc2] : [tr0, tr1] };
    window.GEN5_OFFS.IRBO.ball = 2; window.GEN5_OFFS.IRBO.ballSkip = [];
    const ids = Array.from({ length: 60 }, (_, i) => i + 1);
    window.CC_ITEMS = { 5: { allowed: { items: ids, tms: [50] }, nonBad: { items: ids }, nonBad2: { items: ids }, shop: [], op: [] } };
    const m6 = G5.buildModel(rom, u8);
    ok(m6.field.length === 1, 'Feld-Item per Skript gefunden');
    return window.CCRandCore.run(m6, { seed: 'fi', wild: 'keep', trainers: 'keep', fieldItems: 'random' }).then(() => {
      const it = sc2[14] | (sc2[15] << 8); ok(it >= 1 && it <= 60 && it !== 20, 'Feld-Item neu: ' + it);
    }).then(() => {
      // Overlay: Attacken-Lehrer (60 x 12 Byte) und Shop (BW1)
      const ov = new Uint8Array(0x400); for (let i = 0; i < 60; i++) { ov[0x10 + i * 12] = 100 + i; }
      const shopAt = 0x300; [5, 0, 6, 0].forEach((b, i) => ov[shopAt + i] = b);
      window.NDS.overlay = (_, n) => ov;
      Object.assign(window.GEN5_OFFS.IRBO, { tutor: [36, 0x10], shopOvl: [21, [shopAt], [2]], shopCount: 1, shopSkip: [] , pickupOvl: 92 });
      [0x19, 0, 0x5C, 0, 0xDD, 0].forEach((b, i) => ov[0x200 + i] = b);
      personal[4][60] = 0x01; personal[4][64] = 0x02; // Gruppe 0 (personal) = Lehrer-Gruppe 1 (Offset 13), Gruppe 1 = Gruppe 3 (Offset 43)
      const m8 = G5.buildModel(rom, u8);
      ok(m8.tutor && m8.tutor.moves.length === 60 && m8.shops && m8.shops.length === 1, 'Lehrer und Overlay-Shop im Modell');
      const c4 = m8.tutor.compat.filter(c => c.key === 4)[0];
      ok(c4.flags[13 + 1] && c4.flags[43 + 2] && !c4.flags[1], 'Lehrer-Kompatibilitaet in Lehrer-Reihenfolge gelesen');
      return window.CCRandCore.run(m8, { seed: 'tu', wild: 'keep', trainers: 'keep', tutorMoves: 'random', tutorCompat: 'full', shops: 'random', pickupItems: 'random' }).then(() => {
        ok(m8.pickup && m8.pickup.length === 29 && ov[0x200] !== 0x19 || (ov[0x201] | ov[0x202]) !== 0x5C, 'Pickup-Tabelle (29) gefunden und geaendert');
        const tm = Array.from({ length: 60 }, (_, i) => ov[0x10 + i * 12] | (ov[0x11 + i * 12] << 8));
        ok(new Set(tm).size === 60 && tm.every(m => m >= 1 && m <= 559), 'Lehrer-Attacken gueltig');
        ok(personal[4][60] === 0xFF && personal[4][61] === 0x7F, 'Alle koennen alle (Gruppe 15 Bits)');
        ok((ov[shopAt] | (ov[shopAt + 1] << 8)) >= 1 && (ov[shopAt] | (ov[shopAt + 1] << 8)) !== 5, 'Overlay-Shop neu');
      });
    });
  }).then(() => {
    console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
  });
}).catch(e => { console.log('Ausnahme', e); process.exit(1); });
