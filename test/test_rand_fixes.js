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

  console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('Ausnahme', e); process.exit(1); });
