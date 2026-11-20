// Regressionstests zu den Randomizer-Fehlern aus dem Audit (Kern, Gen 1/2, Gen 3, NDS-arm9/Overlays, 3DS) mit künstlichen Daten: node test/test_rand_fixes.js
global.window = {}; global.document = {};
['js/gen3.js', 'js/rand_gen3.js', 'js/rand_core.js', 'data/pk_gb.js', 'data/gb_roms.js', 'js/rand_gb.js', 'js/ctr.js', 'js/nds.js', 'js/rand_nds.js', 'js/rand_gen5.js'].forEach(f => require('../' + f));
const C = window.CCRandCore, RG = window.CCRandGB, NDS = window.NDS, CTR = window.CTR, GB = window.GBROMS;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const w16 = (b, o, v) => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; };
const w32 = (b, o, v) => { b[o] = v & 255; b[o + 1] = (v >>> 8) & 255; b[o + 2] = (v >>> 16) & 255; b[o + 3] = (v >>> 24) & 255; };
const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

// ---------- Kern: Modell nach Art von Gen 3 (interne Nummern ≠ Nationaldex) ----------
// interne Nummer 300 = Nat 267 (Papinella), 267 = Nat 252 (Geckarbor), 400 = Nat 380 (Latias, Gen 3); maxNat 411 wie bei Gen 3
function g3Model(extra) {
  const nat = id => id <= 251 ? id : id === 300 ? 267 : id === 267 ? 252 : id === 400 ? 380 : 0;
  const species = [];
  [1, 2, 3, 25, 267, 300, 400].forEach(id => { species[id] = { bs: [50, 50, 50, 50, 50, 50], types: [0, 0], abilities: [1, 0] }; });
  const moves = []; for (let m = 1; m <= 200; m++) moves[m] = { power: 50, type: m % 17, acc: 100, pp: 20 };
  const changed = [];
  const m = Object.assign({ title: 'Test-G3', gen: 3, natOf: nat, maxNat: 411, species, typeNames: ['Normal'], typePool: [0], legends: [], noStatsFor: [], learnsets: {}, moves, maxMove: 200, bannedMoves: [165],
    wild: [], trainers: [], evos: [], starters: [], setMove: (id, ch) => changed.push([id, ch]), commit: () => new Uint8Array(1) }, extra || {});
  m._changed = changed; return m;
}
(async () => {
  {
    window.MOVE_UPDATES = [[4, '', 'power', 19, 90]]; // Gen-4-Änderung (Fliegen 90)
    const m = g3Model(), res = await C.run(m, { seed: 'g', wild: 'keep', trainers: 'keep', updateMoves: 4, updateStats: 6 });
    ok(m._changed.some(c => c[0] === 19 && c[1].power === 90), '1: Gen 3 mit maxNat 411 wird als Gen 3 erkannt (Attacken-Update auf Gen 4 greift)');
    ok(m.species[300].bs[4] === 100 && m.species[267].bs[4] === 50, '2: Basiswert-Änderung trifft Nat 267 (intern 300), nicht intern 267 (' + m.species[300].bs[4] + '/' + m.species[267].bs[4] + ')');
    ok(/Basiswerte auf Generation 6/.test(res.log), '2: Protokoll Basiswerte');
  }
  {
    const set = []; const m = g3Model();
    for (let i = 0; i < 30; i++) m.wild.push({ key: 'k' + i, get: () => 1, set: n => set.push(n) });
    await C.run(m, { seed: 'lg', wild: 'random', trainers: 'keep', limitGens: [3] });
    ok(set.length === 30 && set.every(n => [267, 300, 400].indexOf(n) !== -1) && set.indexOf(400) !== -1, '3: Generationen-Filter rechnet über Nat-Nummer (intern 400 = Nat 380 zählt zu Gen 3) (' + [...new Set(set)].join() + ')');
  }
  {
    const items = [], setSp = [];
    const m = g3Model({ itemData: { allowed: [10, 11, 12], tms: [], nonBad: [10, 11, 12], shop: [], op: [] } });
    m.evos = [{ from: 1, get: () => 2, set: () => {} }, { from: 2, get: () => 3, set: () => {} }];
    m.trainers = [{ label: 'T', mons: [{ level: 40, get: () => 1, set: n => setSp.push(n), setLevel: () => {}, hasItem: true, setItem: it => items.push(it) }] }];
    const res = await C.run(m, { seed: 'tr', wild: 'keep', trainers: 'keep', trainerLevel: 0, trainerItems: 'random', trainerFullyEvolved: true, trainerFullyEvolvedLevel: 30 });
    ok(items.length === 1 && [10, 11, 12].indexOf(items[0]) !== -1, '4: Trainer-Items wirken ohne Trainer-Mischen/Level');
    ok(setSp.length === 1 && setSp[0] === 3 && /T: .*Lv40/.test(res.log), '5: voll entwickelt ab Level schreibt die Art auch bei "Unverändert" (' + setSp.join() + ')');
  }
  // 15: Gen 1 – Typ-Update auf Unlicht wird verworfen (nicht im Modell, nicht im Protokoll)
  {
    window.MOVE_UPDATES = [[2, '', 'type', 44, 'DARK']];
    const ch = [], moves = []; for (let i = 1; i <= 165; i++) moves[i] = { power: 40, type: 0, acc: 100, pp: 20 };
    const sp = []; sp[1] = { bs: [1, 1, 1, 1, 1, 1], types: [0, 0] };
    const res = await C.run({ title: 'G1', gen: 1, maxNat: 151, species: sp, typeNames: ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', '???', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht'],
      typePool: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16], legends: [], moves, maxMove: 165, setMove: (i, c) => ch.push(c), wild: [], trainers: [], evos: [], starters: [], commit: () => 1 }, { seed: 'x', wild: 'keep', trainers: 'keep', updateMoves: 2 });
    ok(!ch.length && moves[44].type === 0 && !/Unlicht/.test(res.log), '15: Gen 1 übernimmt kein Typ-Update auf Unlicht');
  }
  // 16: VM-Kompatibilität bleibt bei zufälliger Kompatibilität; 10: verbotene Attacken (Z-Attacken) nicht im TM-Pool
  {
    const moves = []; for (let i = 1; i <= 700; i++) moves[i] = { power: 80, type: i % 17, acc: 100, pp: 10 };
    const sp = [], compat = [];
    for (let s = 1; s <= 40; s++) { sp[s] = { bs: [50, 50, 50, 50, 50, 50], types: [0, 0] }; compat.push({ key: s, nat: s, types: [0, 0], flags: [false].concat(Array(10).fill(false), [s % 2 === 0, false]) }); }
    const banned = [165]; for (let z = 11; z <= 700; z++) banned.push(z); // fast alles verboten → TMs müssen aus 1–10 kommen
    const hmBefore = compat.map(c => c.flags.slice(11));
    let newTms = null;
    await C.run({ title: 'HM', gen: 4, maxNat: 40, species: sp, typePool: [0], legends: [], moves, maxMove: 700, bannedMoves: banned, wild: [], trainers: [], evos: [], starters: [],
      tm: { tms: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], hms: [695, 696], compat, setTMs: l => { newTms = l; } }, commit: () => 1 }, { seed: 'hm', wild: 'keep', trainers: 'keep', tmMoves: 'random', tmKeepField: false, tmCompat: 'random', tmSanity: false });
    ok(compat.every((c, i) => c.flags.slice(11).join() === hmBefore[i].join()), '16: VM-Kompatibilität unverändert');
    ok(compat.some(c => c.flags.slice(1, 11).some(Boolean)), '16: TM-Kompatibilität trotzdem gewürfelt');
    ok(newTms && newTms.every(m => m >= 1 && m <= 10), '10: verbotene Attacken (z. B. Z-Attacken) kommen nicht in den TM-Pool (' + newTms + ')');
  }
  // 13: makeEvoTable überspringt die Shedinja-Methode
  {
    const b = new Uint8Array(42 * 300), sp = []; for (let s = 1; s < 300; s++) sp[s] = { bs: [1], types: [0, 0] };
    const put = (s, k, m, t) => { w16(b, s * 42 + k * 6, m); w16(b, s * 42 + k * 6 + 4, t); };
    put(290, 0, 4, 291); put(290, 1, 14, 292);
    const m = { species: sp }; C.makeEvoTable(m, () => b, (s, k) => s * 42 + k * 6, 7, 299, [14]);
    ok(m.evos.length === 1 && m.evos[0].get() === 291, '13: Nincada → Shedinja (Methode 14) bleibt außen vor');
  }

  // ---------- Gen 1/2: Kopf-Erkennung ----------
  const mkHead = (size, title, ver, nonjap, cgb, crc) => { const u = new Uint8Array(size); Buffer.from(title).forEach((c, i) => u[0x134 + i] = c); u[0x14C] = ver; u[0x14A] = nonjap; if (cgb) u[0x143] = cgb; if (crc !== undefined) { u[0x14E] = crc >> 8; u[0x14F] = crc & 255; } return u; };
  {
    const r = RG.parseRom(mkHead(0x100000, 'POKEMON YELLOW', 0, 1, 0x80));
    ok(r.gen === 1 && r.yellow, '20: Gelb mit CGB-Flag 0x80 wird als Gen 1 (Gelb) erkannt');
  }
  {
    const r = RG.parseRom(mkHead(0x80000, 'POKEMON RED', 0, 0));
    ok(r.gen === 1 && /Red \(J\)/.test(r.game), '22: 512-KB-ROM (Rot J) wird akzeptiert');
  }
  {
    const de = GB.g1.filter(e => e.name === 'Red (G)')[0], u = mkHead(0x100000, 'POKEMON RED', 0, 1, 0, 0x1234);
    const tm = de.TMMovesOffset; u[tm] = 5; u[tm + 1] = 13; u[tm + 50] = 15; u[tm + 51] = 19; u[de.OldRodOffset + 1] = 0x85;
    [[1, 0xB0], [2, 0xB1], [3, 0x99]].forEach(([k, v]) => de['StarterOffsets' + k].forEach(o => u[o] = v));
    const r = RG.parseRom(u);
    ok(r.entry === de, '23: gepatchte deutsche Rot-ROM (Prüfsumme anders) bekommt die deutschen Offsets (' + r.game + ')');
    let err = null; try { RG.parseRom(mkHead(0x100000, 'POKEMON RED', 0, 1, 0, 0x1234)); } catch (e) { err = e; }
    ok(err && /unklar/.test(err.message), '23: ohne passende Daten Fehler statt US-Offsets');
  }

  // ---------- Gen 3: Fähigkeiten-Pool, Gen-Kennung, FRLG-Starter ----------
  {
    const species = []; for (let s = 0; s < 412; s++) species.push({ bs: [50, 50, 50, 50, 50, 50], types: [0, 0], abilities: [1, 0], nat: s <= 251 ? s : s >= 277 ? s - 25 : 0, name: 'S' + s });
    const u8 = new Uint8Array(0x180000), base = 0x169BB5;
    [[0, 1], [5, 4], [515, 4], [520, 7], [461, 7], [466, 1]].forEach(([o, v]) => w16(u8, base + o, v));
    u8[0xBC] = 0; window.GEN3_OFFS = { BPRE0: { starter: base, eggs: [], statics: [] } };
    const rom = { species, moves: [null].concat(Array.from({ length: 354 }, () => ({ power: 40, type: 0 }))), learnsets: [], trainers: [], off: { bs: 0x1000, learn: [], mv: 0x2000 }, code: 'BPRE', frlg: true, gameEn: 'FireRed' };
    const m = window.CCRand3.buildModel(rom, u8);
    ok(m.abilityPool.indexOf(77) !== -1 && m.abilityPool.indexOf(76) === -1 && m.abilityPool.length === 74, '7: Gen-3-Fähigkeiten 1–77 ohne 76 (und ohne Wunderwache/Bummler)');
    ok(m.gen === 3 && m.natOf(300) === 275, '1/2: Gen-3-Modell meldet gen 3 und Nat-Nummern');
    ok(m.starters.length === 3 && m.starters.map(s => s.get()).join() === '1,4,7', '21: FRLG-Starter aus StarterPokemon (Labor-Skript)');
    m.starters[0].set(25); m.starters[1].set(133); m.starters[2].set(150);
    ok([[0, 25], [5, 133], [515, 133], [520, 150], [461, 150], [466, 25]].every(([o, v]) => u16(u8, base + o) === v), '21: alle 6 Skriptstellen geschrieben (wie UPR)');
    const bad = new Uint8Array(0x180000); const m2 = window.CCRand3.buildModel(rom, bad);
    ok(m2.starters.length === 0, '21: ohne passende Original-Werte keine Starter-Änderung');
  }

  // ---------- NDS: komprimiertes arm9 und Overlays ----------
  // Künstliche ROM: Kopf, arm9 bei 0x4000 (0x4000 Byte ungepackter Kopf mit Modul-Parametern, Rest BLZ-gepackt), Overlay-Tabelle, FAT
  function mkNds(body, ovlRaw) {
    const ram = 0x02000000, head = new Uint8Array(0x4000); for (let i = 0; i < head.length; i++) head[i] = (i * 13) & 255;
    const mp = 0xB00; for (let i = 0; i < 0x24; i++) head[mp + i] = 0; w32(head, mp + 0x1C, 0xDEC00621); w32(head, mp + 0x20, 0x2106C0DE);
    const enc = CTR.blzEncode(body), a9 = new Uint8Array(0x4000 + enc.length); a9.set(head); a9.set(enc, 0x4000);
    w32(a9, mp + 0x14, ram + a9.length);
    const oenc = CTR.blzEncode(ovlRaw), size = 0x4000 + a9.length + 12 + 0x400 + oenc.length + 0x100;
    const u = new Uint8Array(size + 0x1000); u.set(a9, 0x4000);
    const ft = 0x4000 + a9.length; w32(u, ft, 0xDEC00621); w32(u, ft + 4, mp); w32(u, ft + 8, 0);
    w32(u, 0x20, 0x4000); w32(u, 0x28, ram); w32(u, 0x2C, a9.length);
    const tbl = ft + 0x20, fat = tbl + 0x40, ovOff = fat + 0x40;
    w32(u, 0x50, tbl); w32(u, 0x54, 32); w32(u, 0x48, fat);
    w32(u, tbl, 7); w32(u, tbl + 24, 0); w32(u, tbl + 28, (1 << 24) | oenc.length);
    w32(u, fat, ovOff); w32(u, fat + 4, ovOff + oenc.length); u.set(oenc, ovOff);
    return { u, mp, ram };
  }
  {
    // wenig komprimierbarer Inhalt wie echter Code, damit der gepackte Teil (wie beim echten arm9) fast die ganze Datei ausmacht
    let sd = 7; const body = new Uint8Array(0x80000); for (let i = 0; i < body.length; i++) { sd = (sd * 1103515245 + 12345) & 0x7FFFFFFF; body[i] = (i & 64) ? body[i - 64] : (sd >> 16) & 255; }
    const tmAt = 0x1000; body.set([0x1E, 0, 0x32, 0], tmAt); for (let i = 0; i < 100; i++) w16(body, tmAt + 4 + i * 2, 20 + i);
    const ov = new Uint8Array(0x3000); for (let i = 0; i < ov.length; i++) ov[i] = (i >> 3) & 255;
    const { u, mp, ram } = mkNds(body, ov), oldLen = u32(u, 0x2C);
    const A = NDS.arm9RW(u);
    ok(A && A.compressed && A.data.length === 0x4000 + body.length && A.data[0x4000 + tmAt] === 0x1E, '18: arm9 entpackt (' + (A && A.data.length) + ' Byte)');
    // Gen-4-Modell (HGSS) auf dieser ROM: TMs im entpackten arm9 finden und ändern
    const personal = []; for (let s = 0; s <= 10; s++) personal.push(new Uint8Array(44));
    const rom = { type: 'HGSS', species: [], moves: [], learnsets: [], trainers: [], names: { moves: [], abilities: [] }, code: 'IPKE', gameEn: 'HeartGold', files: { personal, learn: [], evo: [], wild: [], moves: [] } };
    for (let s = 0; s <= 10; s++) rom.species[s] = { bs: [50, 50, 50, 50, 50, 50], types: [0, 0], abilities: [1, 0], nat: s };
    for (let mv = 1; mv <= 467; mv++) rom.moves[mv] = { power: 60, type: 0, acc: 100, pp: 20 };
    const model = window.CCRandNds.buildModel(rom, u);
    ok(model.tm && model.tm.tms[0] === 20, '18: HGSS-TMs im entpackten arm9 gefunden');
    await C.run(model, { seed: 'a9', wild: 'keep', trainers: 'keep', tmMoves: 'random', tmKeepField: false });
    const newLen = u32(u, 0x2C), raw2 = CTR.blzDecode(u.slice(0x4000, 0x4000 + newLen));
    const tms = []; for (let i = 0; i < 92; i++) tms.push(u16(raw2, 0x4000 + tmAt + 4 + i * 2));
    ok(newLen <= oldLen && raw2.length === 0x4000 + body.length && tms.some((t, i) => t !== 20 + i), '19: arm9 neu gepackt, passt in den alten Platz, TMs geändert');
    ok(u32(u, 0x4000 + mp + 0x14) === ram + newLen, '19: compStaticEnd in den Modul-Parametern angepasst');
    ok(raw2.subarray(0, 0x4000).every((b, i) => i >= mp + 0x14 && i < mp + 0x18 || b === ((i * 13) & 255) || (i >= mp && i < mp + 0x24)), '19: die ersten 0x4000 Byte bleiben ungepackt');
    ok(u32(u, 0x4000 + newLen) === 0xDEC00621, '19: Nitro-Fußzeile hinter das neue arm9 verschoben');
    let crc = 0xFFFF; for (let i = 0; i < 0x15E; i++) { crc ^= u[i]; for (let k = 0; k < 8; k++) crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1; }
    ok(u16(u, 0x15E) === crc, '19: Kopf-Prüfsumme neu berechnet');
    // Overlay 7: entpacken, ändern, packen
    const O = NDS.overlayRW(u, 7);
    ok(O && O.compressed && O.data.length === ov.length, '28: komprimiertes Overlay entpackt');
    O.data[100] = 0xEE; ok(O.commit(), '28: Overlay neu gepackt');
    const fat = u32(u, 0x48), s0 = u32(u, fat), e0 = u32(u, fat + 4), tblO = u32(u, 0x50);
    ok(CTR.blzDecode(u.slice(s0, e0))[100] === 0xEE && (u32(u, tblO + 28) & 0xFFFFFF) === e0 - s0, '28: Overlay-Inhalt und gepackte Größe in der Tabelle stimmen');
    // Scan meldet Starter nur, wenn sie gefunden werden (#26)
    ok(window.CCRandNds.scan(rom, u).starters === false, '26: Scan meldet keine Starter, wenn sie nicht änderbar sind');
  }

  // ---------- Regressionstests Audit v2.1.0 ----------
  // R1: data/rival_tags.js sauber nach Spielen getrennt
  {
    const RT = require('../data/rival_tags.js');
    ok(Object.keys(RT.FRLG).every(k => !(k in RT.RS) && !(k in RT.E)), 'R1: RS/E enthalten keine FRLG-Rivalen-IDs');
    ok(Object.keys(RT.HGSS).every(k => !(k in RT.DP) && !(k in RT.Pt)), 'R1: DP/Pt enthalten keine HGSS-Rivalen-IDs');
    ok(!('850' in RT.DP) && '850' in RT.Pt, 'R1: DP enthält keine Platin-exklusiven Rivalen-IDs');
    ok(Object.keys(RT.B2W2).every(k => !(k in RT.BW)), 'R1: BW enthält keine B2W2-Rivalen-IDs');
  }
  // R2: Gen 3 Smaragd (Nicht-US: BPED) erkennt Attacken-Lehrer
  {
    const species = []; for (let s = 0; s < 412; s++) species.push({ bs: [50, 50, 50, 50, 50, 50], types: [0, 0], abilities: [1, 0], nat: s <= 251 ? s : s >= 277 ? s - 25 : 0, name: 'S' + s });
    const u8 = new Uint8Array(0x20000), tutOff = 0x1000;
    for (let i = 0; i < 30; i++) w16(u8, tutOff + i * 2, 10 + i);
    u8[0xBC] = 0; window.GEN3_OFFS = { BPED0: { tut: [tutOff, 30], eggs: [], statics: [] } };
    const rom = { species, moves: [null].concat(Array.from({ length: 354 }, () => ({ power: 40, type: 0 }))), learnsets: [], trainers: [], off: { bs: 0x4000, learn: [], mv: 0x8000 }, code: 'BPED', frlg: false, gameEn: 'Emerald' };
    const m = window.CCRand3.buildModel(rom, u8);
    ok(m.tutor && m.tutor.moves.length === 30, 'R2: Gen 3 Smaragd DE (BPED) erkennt 30 Attacken-Lehrer');
  }
  // R3: types: 'random' + tmCompat: 'type' nutzt die neuen Typen
  {
    const moves = [null]; for (let i = 1; i <= 50; i++) moves[i] = { power: 60, type: i <= 25 ? 1 : 2, acc: 100, pp: 20 };
    const sp = [null], compat = [];
    for (let s = 1; s <= 10; s++) { sp[s] = { bs: [50, 50, 50, 50, 50, 50], types: [1, 1] }; compat.push({ key: s, nat: s, types: sp[s].types, flags: [false].concat(Array(50).fill(false)) }); }
    const tms = Array.from({ length: 50 }, (_, i) => i + 1);
    await C.run({ title: 'TY', gen: 4, maxNat: 10, species: sp, typeNames: ['Normal', 'Kampf', 'Flug'], typePool: [2], legends: [], moves, maxMove: 50, wild: [], trainers: [], evos: [], starters: [],
      tm: { tms, hms: [], compat, setTMs: () => {}, commit: () => {} }, commit: () => 1 }, { seed: 'ty', wild: 'keep', trainers: 'keep', types: 'random', tmCompat: 'type', tmSanity: false });
    const oldHits = compat.reduce((a, c) => a + c.flags.slice(1, 26).filter(Boolean).length, 0);
    const newHits = compat.reduce((a, c) => a + c.flags.slice(26, 51).filter(Boolean).length, 0);
    ok(sp[1].types[0] === 2 && newHits > oldHits * 2, 'R3: tmCompat=type nutzt neue Typen (' + newHits + ' neu vs. ' + oldHits + ' alt)');
  }
  // R4: evoImpossible (withMove) nutzt Original-Learnset trotz moves: 'random'
  {
    const sp = [null, { bs: [50, 50, 50, 50, 50, 50], types: [0, 0] }, { bs: [70, 70, 70, 70, 70, 70], types: [0, 0] }];
    const moves = [null]; for (let i = 1; i <= 210; i++) moves[i] = { power: 60, type: 0, acc: 100, pp: 20 };
    let method = 20, param = 205;
    const m = { title: 'EV', gen: 4, maxNat: 2, species: sp, typePool: [0], legends: [], moves, maxMove: 210,
      learnsets: { 1: [[1, 33], [33, 205]], 2: [[1, 33]] }, setLearnset: () => {},
      evos: [{ from: 1, get: () => 2, set: () => {}, method: () => method, setMethod: v => { method = v; }, param: () => param, setParam: v => { param = v; } }],
      evoInfo: { level: 4, stone: 7, trade: 5, tradeItem: 6, withMove: 20, levelMethods: [4], items: { water: 84 } },
      wild: [], trainers: [], starters: [], commit: () => 1 };
    await C.run(m, { seed: 'ev', wild: 'keep', trainers: 'keep', moves: 'random', evoImpossible: true });
    ok(method === 4 && param === 33, 'R4: evoImpossible (withMove) nimmt Original-Level 33 statt Fallback 45 (Lv ' + param + ')');
  }
  // R5: Gen 2 Insektenturnier (BCC) + wildLevelPct skaliert auch maxLv (minLv <= maxLv)
  {
    const g2e = GB.g2.filter(e => e.name === 'Gold (U)')[0], u = new Uint8Array(0x200000);
    Buffer.from('POKEMON_GLDAAUE').forEach((c, i) => u[0x134 + i] = c);
    u[0x143] = 0x80; u[0x14A] = 1; u[0x14C] = 0;
    u[g2e.WildPokemonOffset] = 0xFF; u[g2e.WildPokemonOffset + 1] = 0xFF; u[g2e.WildPokemonOffset + 2] = 0xFF; u[g2e.WildPokemonOffset + 3] = 0xFF; u[g2e.WildPokemonOffset + 4] = 0xFF; u[g2e.WildPokemonOffset + 5] = 0xFF;
    for (let h = 0; h < g2e.HeadbuttTableSize; h++) u[g2e.HeadbuttWildsOffset + h] = 0xFF;
    const bo = g2e.BCCWildsOffset; u[bo] = 10; u[bo + 1] = 123; u[bo + 2] = 13; u[bo + 3] = 14; u[bo + 4] = 0xFF;
    const res = await RG.run(u, null, { seed: 'bcc', wild: 'keep', trainers: 'keep', wildLevelPct: 50 });
    ok(res.data[bo + 2] === 20 && res.data[bo + 3] === 21 && res.data[bo + 2] <= res.data[bo + 3], 'R5: Gen 2 BCC wildLevelPct skaliert min & max (' + res.data[bo + 2] + '–' + res.data[bo + 3] + ')');
  }
  // R6: Gen 4 rivalStarter liest neue Starter & HGSS löscht Fähigkeits-Nibble (&= 0x0F)
  {
    const personal = [new Uint8Array(44)]; for (let s = 1; s <= 493; s++) personal.push(new Uint8Array(44));
    const species = [null]; for (let s = 1; s <= 493; s++) species[s] = { bs: [50, 50, 50, 50, 50, 50], types: [0, 0], abilities: [1, 0], nat: s };
    const pk = new Uint8Array(12); w16(pk, 2, 10); w16(pk, 4, 390);
    const ovl = new Uint8Array(64); w16(ovl, 8, 387); w16(ovl, 12, 390); w16(ovl, 16, 393);
    const oldN = window.NDS, oldG4 = window.GEN4_OFFS, oldRT = window.RIVAL_TAGS;
    window.RIVAL_TAGS = { Pt: { 851: 'RIVAL1-0' } };
    window.GEN4_OFFS = { CPUE0: { type: 'Pt', scripts: 's', statics: [], spTrades: [], starter: { ovl: 1, off: 8 } } };
    window.NDS = Object.assign({}, oldN, { nitroFile: () => new Uint8Array(4), narc: () => [new Uint8Array(4)], overlayRW: () => ({ data: ovl, commit: () => true }), overlay: () => ovl, arm9RW: () => null });
    const rom = { type: 'Pt', species, moves: [null, { power: 40, type: 0, acc: 100, pp: 20 }], learnsets: [], names: { moves: [], abilities: [] }, code: 'CPUE', gameEn: 'Platinum',
      trainers: [{ id: 851, cls: 0, name: 'Barry', pk, rec: 12, head: 6, custom: false, hasItem: false, party: [{ idx: 0, level: 10, species: 390 }] }],
      files: { personal, learn: [], evo: [], wild: [], moves: [] } };
    const u = new Uint8Array(0x100); u[0x1E] = 0;
    const m = window.CCRandNds.buildModel(rom, u);
    await C.run(m, { seed: 'g4rv', wild: 'keep', trainers: 'random', starters: 'random', rivalStarter: true });
    const stNow = m.starters.map(s => s.get());
    ok(stNow.length === 3 && stNow[1] !== 390 && u16(pk, 4) === stNow[1], 'R6: Gen 4 rivalStarter nutzt neuen Starter (' + stNow[1] + ' statt 390)');
    // HGSS Fähigkeits-Nibble
    const pkHg = new Uint8Array(12); w16(pkHg, 2, 10); w16(pkHg, 4, 155); pkHg[1] = 0x21;
    const romHg = Object.assign({}, rom, { type: 'HGSS', code: 'IPKE', trainers: [{ id: 1, cls: 0, name: 'S', pk: pkHg, rec: 12, head: 6, custom: false, hasItem: false, party: [{ idx: 0, level: 10, species: 155 }] }] });
    const mHg = window.CCRandNds.buildModel(romHg, u);
    mHg.trainers[0].mons[0].set(25);
    ok(pkHg[1] === 0x01, 'R6: HGSS Trainer-Set löscht Fähigkeits-Nibble (0x21 -> 0x' + pkHg[1].toString(16) + ')');
    window.NDS = oldN; window.GEN4_OFFS = oldG4; window.RIVAL_TAGS = oldRT;
  }
  // R7: 3DS CTR.build hält RomFS auf 0x1000 ausgerichtet & klemmt exefsHashRegionSize > 1 auf 1
  {
    const baseBuf = new Uint8Array(0x6000);
    w32(baseBuf, 0x104, 0x6000 / 0x200);
    w32(baseBuf, 0x1A0, 0x1000 / 0x200); w32(baseBuf, 0x1A4, 0x600 / 0x200); w32(baseBuf, 0x1A8, 2); // HashRegionSize = 2
    w32(baseBuf, 0x1B0, 0x2000 / 0x200); w32(baseBuf, 0x1B4, 0x4000 / 0x200); w32(baseBuf, 0x1B8, 1);
    const info = { base: 0, type: 'cxi', header: baseBuf.slice(0, 0x200), exefsOff: 0x1000, exefsSize: 0x600, romfsOff: 0x2000, romfsHashSize: 0x200,
      ivfc: { rf: 0x2000, l3: 0x3000, l1: 0x4000, l2: 0x5000, levels: [{ size: 0x1000, block: 0x1000 }, { size: 0x1000, block: 0x1000 }, { size: 0x1000, block: 0x1000 }] } };
    const src = { size: baseBuf.length, read: async (o, l) => baseBuf.slice(o, o + l), slice: (a, b) => baseBuf.slice(a, b) };
    const exNew = new Uint8Array(0x1200); // größer als alter Abstand (0x1000), nicht 0x1000-ausgerichtet
    const parts = await CTR.build(info, [], src, function (p) { return p; }, exNew);
    const out = Buffer.concat(parts.map(p => Buffer.from(p)));
    const newRomfs = u32(out, 0x1B0) * 0x200;
    ok(newRomfs % 0x1000 === 0 && newRomfs === 0x3000 && u32(out, 0x1A4) === 0x1200 / 0x200 && u32(out, 0x1A8) === 1, 'R7: CTR.build richtet RomFS auf 0x1000 aus (0x' + newRomfs.toString(16) + ') und setzt exefsHashRegionSize=1');
  }
  // R8: LZ-komprimiertes NARC wird markiert und im Modell gemeldet
  {
    const rawNarc = new Uint8Array(64); Buffer.from('NARC').forEach((c, i) => rawNarc[i] = c);
    rawNarc[12] = 0x10; Buffer.from('BTAF').forEach((c, i) => rawNarc[0x10 + i] = c); w32(rawNarc, 0x14, 12); w32(rawNarc, 0x18, 0);
    Buffer.from('GMIF').forEach((c, i) => rawNarc[0x1C + i] = c); w32(rawNarc, 0x20, 8);
    // gültiger LZ10-Strom (alles Literale)
    const lz = [0x10, 64, 0, 0];
    for (let i = 0; i < 64; i += 8) { lz.push(0); for (let k = 0; k < 8; k++) lz.push(rawNarc[i + k]); }
    const arc = NDS.narc(new Uint8Array(lz));
    ok(arc && arc._lzCompressed === true, 'R8: NDS.narc markiert LZ-komprimierte Archive (_lzCompressed)');
  }

  // ---------- 3DS: GARC-Einträge dürfen in den Ausrichtungs-Füllplatz wachsen (wie UPR), Länge steht in der FATB ----------
  {
    // GARC v6 mit 2 Einträgen: Länge 5 und 3, ausgerichtet auf 0x10
    const head = 0x24, fato = 0x0C + 2 * 4, fatb = 0x0C + 2 * (4 + 12), dataOff = head + fato + fatb + 0x0C;
    const g = new Uint8Array(dataOff + 0x20);
    g.set([0x43, 0x52, 0x41, 0x47], 0); w32(g, 4, head); w16(g, 0x0A, 0x600); w32(g, 0x10, dataOff);
    g.set([0x4F, 0x54, 0x41, 0x46], head); w32(g, head + 4, fato);
    const fb = head + fato; g.set([0x42, 0x54, 0x41, 0x46], fb); w32(g, fb + 8, 2);
    w32(g, fb + 12, 1); w32(g, fb + 16, 0); w32(g, fb + 20, 0x10); w32(g, fb + 24, 5);
    w32(g, fb + 28, 1); w32(g, fb + 32, 0x10); w32(g, fb + 36, 0x20); w32(g, fb + 40, 3);
    const pg = CTR.parseGarc(g);
    ok(pg && pg.files[0][0].end - pg.files[0][0].start === 5 && pg.files[0][0].pend - pg.files[0][0].start === 0x10, 'GARC: Länge 5, Platz bis zum nächsten Eintrag 0x10');
    ok(pg && pg.files[0][0].lenOff === fb + 24 && pg.files[1][0].lenOff === fb + 40, 'GARC: Position des Längenfelds in der FATB');
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'rand_3ds.js'), 'utf8');
    ok(/we.loc.room/.test(src) && /we.loc.lenOff/.test(src), 'rand_3ds: wilde Pokémon nutzen den Füllplatz und schreiben die neue Länge');
  }

  console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('Ausnahme', e); process.exit(1); });
