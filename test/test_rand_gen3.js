// Prüft den Gen-3-Randomizer an einer künstlichen ROM (echte ROMs liegen nicht im Projekt)
global.window = {};
require('../js/gen3.js'); require('../js/rand_gen3.js'); require('../js/rand_core.js');
const R = window.CCRand3, assert = require('assert');
const N = 0x400000, u8 = new Uint8Array(N);
const w16 = (o, v) => { u8[o] = v & 255; u8[o + 1] = v >> 8; };
const w32 = (o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; u8[o + 2] = (v >> 16) & 255; u8[o + 3] = (v >>> 24) & 255; };
const P = (o) => 0x08000000 + o;
// Arten
const species = [];
for (let s = 0; s < 412; s++) {
  const nat = s === 0 ? 0 : s <= 251 ? s : s >= 277 ? s - 25 : 0;
  species.push({ bs: [40 + (s % 50), 50, 50, 50, 50, 50], types: [s % 17, s % 17], abilities: [1 + (s % 70), s % 2 ? 2 : 0], nat, name: 'S' + s, growth: 0, friendship: 70, hashBytes: [] });
  const e = 0x1000 + s * 28; species[s].bs.forEach((v, i) => u8[e + i] = v); u8[e + 6] = species[s].types[0]; u8[e + 7] = species[s].types[1]; u8[e + 22] = species[s].abilities[0]; u8[e + 23] = species[s].abilities[1];
}
// Level-Attacken
const learn = []; let lo = 0x20000;
const moves = Array.from({ length: 355 }, (_, m) => ({ power: m % 3 ? 40 : 0, type: m % 17, effect: 0 }));
for (let s = 0; s < 412; s++) { learn.push(lo); [[1, 33], [5, 45], [9, 52]].forEach(([lv, mv], k) => w16(lo + k * 2, (lv << 9) | mv)); w16(lo + 6, 0xFFFF); lo += 8; }
// wilde Pokémon: 40 Karten
let ar = 0x80000, inf = 0x90000;
for (let m = 0; m < 40; m++) {
  const h = 0xA0000 + m * 20; u8[h] = 1; u8[h + 1] = m;
  [[12], [5]].forEach(([n], k) => {
    for (let i = 0; i < n; i++) { u8[ar + i * 4] = 3; u8[ar + i * 4 + 1] = 5; w16(ar + i * 4 + 2, 1 + ((m * 7 + i * 3) % 150)); }
    w32(inf, 20); w32(inf + 4, P(ar)); w32(h + 4 + k * 4, P(inf)); ar += n * 4; inf += 8;
  });
}
u8[0xA0000 + 40 * 20] = 0xFF; u8[0xA0000 + 40 * 20 + 1] = 0xFF;
// Starter, Entwicklung
w16(0xB0000, 277); w16(0xB0002, 280); w16(0xB0004, 283);
const evo = 0xC0000; const E = (s, k, m, p, t) => { const o = evo + s * 40 + k * 8; w16(o, m); w16(o + 2, p); w16(o + 4, t); };
E(1, 0, 4, 16, 2); E(2, 0, 4, 32, 3); E(4, 0, 4, 16, 5); E(5, 0, 4, 36, 6); E(133, 0, 7, 1, 134); E(133, 1, 7, 2, 135);
// Trainer
const trainers = []; let po = 0xD0000;
for (let t = 0; t < 5; t++) { const o = 0xE0000 + t * 40; u8[o] = t % 2 ? 1 : 0; for (let j = 0; j < 3; j++) { const mo = po + j * (t % 2 ? 16 : 8); u8[mo + 2] = 10 + j; w16(mo + 4, 10 + t + j); if (t % 2) [10, 11, 12, 13].forEach((m, k) => w16(mo + 6 + k * 2, m)); }
  trainers.push({ off: o, partyOff: po, partySize: t % 2 ? 16 : 8, cls: 0, name: 'T' + t, party: [0, 1, 2].map(j => ({ species: 10 + t + j, level: 10 + j })) }); po += 48; }
const rom = { species, moves, learnsets: learn.map(lp => [[1, 33], [5, 45], [9, 52]]), trainers, classNames: ['Test'], off: { bs: 0x1000, learn }, code: 'BPEE', frlg: false, game: 'x', gameEn: 'Emerald' };
const opts = { seed: 'abc', wild: 'similar', trainers: 'similar', trainerLevel: 10, starters: 'random', evo: 'random', stats: 'random', types: 'random', abilities: 'random', moves: 'random', noLegend: true };

const sc = R.scan(rom, u8); console.log(sc);
assert.equal(sc.wildMaps, 40); assert.equal(sc.wildArrays, 80); assert.equal(sc.starterOff, 0xB0000); assert.equal(sc.evoOff, evo);
(async () => {
const a = await R.run(u8, rom, opts), b = await R.run(u8, rom, opts), c = await R.run(u8, rom, Object.assign({}, opts, { seed: 'xyz' }));
assert.equal(a.log, b.log); assert.ok(Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0); assert.notEqual(a.log, c.log);
assert.ok(Buffer.compare(Buffer.from(a.data), Buffer.from(u8)) !== 0);
// Originalbytes unverändert, Größe gleich
assert.equal(a.data.length, u8.length);
// Gültigkeit: Starter, wilde Arten, Trainer, Werte
const sp = (o) => a.data[o] | (a.data[o + 1] << 8);
[0, 2, 4].forEach(k => assert.ok(R.validSpecies(rom, sp(0xB0000 + k)))); assert.equal(new Set([0, 2, 4].map(k => sp(0xB0000 + k))).size, 3);
for (let m = 0; m < 80; m++) for (let i = 0; i < 5; i++) { const arr = [0x80000]; }
const wi = R.findWild(rom, a.data); assert.equal(wi.arrays.length, 80);
wi.arrays.forEach(x => { for (let i = 0; i < x.n; i++) assert.ok(R.validSpecies(rom, sp(x.off + i * 4 + 2))); });
// Entwicklungen: keine Zyklen, Ziel jeweils nur einmal
const pre = {}; for (let s = 1; s < 412; s++) for (let k = 0; k < 5; k++) { const o = evo + s * 40 + k * 8; const t = a.data[o + 4] | (a.data[o + 5] << 8); if (a.data[o] && t) { assert.ok(!pre[t], 'doppeltes Ziel'); pre[t] = s; } }
for (let s in pre) { let x = +s, n = 0; while (pre[x] && n++ < 20) x = pre[x]; assert.ok(n < 20, 'Zyklus'); }
// Level +10 %
assert.equal(a.data[trainers[0].partyOff + 2], 11);
// eigene Attacken der Trainer folgen der neuen Art
const t1 = trainers[1]; assert.ok(sp(t1.partyOff + 6) > 0);
// Basiswerte: Summe bleibt beim Zufall
for (let s = 1; s < 412; s++) { if (!R.validSpecies(rom, s)) continue; let sum = 0; for (let i = 0; i < 6; i++) sum += a.data[0x1000 + s * 28 + i]; assert.equal(sum, 290 + (s % 50) - 0 , 's' + s); }
// Starter eigene Wahl
const d = await R.run(u8, rom, { seed: 1, wild: 'keep', trainers: 'keep', starters: 'custom', starterPick: [25, 133, 150] }); assert.deepEqual([0, 2, 4].map(k => d.data[0xB0000 + k] | (d.data[0xB0000 + k + 1] << 8)), [25, 133, 150]);
// TMs/HMs und Attacken-Daten
[264, 337, 352, 347].concat(Array.from({ length: 54 }, (_, i) => 100 + i)).forEach((m, i) => w16(0xF0000 + i * 2, m));
const mv0 = 0x60000; rom.off.mv = mv0; moves.forEach((m, i) => { u8[mv0 + i * 12 + 1] = m.power; u8[mv0 + i * 12 + 2] = m.type; u8[mv0 + i * 12 + 3] = 100; u8[mv0 + i * 12 + 4] = 20; });
const tmr = await R.run(u8, rom, { seed: 'tm', wild: 'keep', trainers: 'keep', starters: 'keep', tmMoves: 'random', movePower: true, movePP: true });
const tms = Array.from({ length: 50 }, (_, i) => tmr.data[0xF0000 + i * 2] | (tmr.data[0xF0000 + i * 2 + 1] << 8));
assert.ok(new Set(tms).size === 50 && tms.every(m => m >= 1 && m < 355), 'TMs gueltig');
assert.equal(tmr.data[0xF0000 + 50 * 2], 146, 'HMs unveraendert');
assert.ok(/=== TMs/.test(tmr.log) && /Attacken-Daten/.test(tmr.log), 'Protokoll TMs');
// Offsets-Tabelle: TM/Lehrer-Kompatibilitaet, Statics, Tausche
const CO = 0x70000, TU = 0x71000, ST = 0x72000, TR = 0x73000;
for (let sp2 = 1; sp2 < 412; sp2++) { u8[CO + sp2 * 8] = 0x0F; u8[CO + sp2 * 8 + 7] = 0x01; }
for (let q = 0; q < 30; q++) w16(TU + q * 2, 100 + q);
w16(ST, 25); u8[ST + 4] = 30; w16(ST + 8, 150); w16(TR + 12, 10); w16(TR + 56, 11);
window.GEN3_OFFS = { BPEE0: { compat: CO, tm: 0xF0000, tut: [TU, 30], trade: [TR, 1, []], eggs: [], statics: [[[ST], [ST + 4]], [[ST + 8], []]] } };
const ex = await R.run(u8, rom, { seed: 'x3', wild: 'keep', trainers: 'keep', starters: 'keep', tmMoves: 'random', tmCompat: 'type', tutorMoves: 'random', tutorCompat: 'random', statics: 'random', staticLevelPct: 10, trades: 'random', tradeRequested: true });
assert.ok(/=== Statische/.test(ex.log) && /=== Ingame-Tausche/.test(ex.log) && /=== Attacken-Lehrer/.test(ex.log), 'Protokoll Extras');
const g = (o) => ex.data[o] | (ex.data[o + 1] << 8);
assert.ok(R.validSpecies(rom, g(ST)) && g(ST) !== 25 && ex.data[ST + 4] === 33, 'Static neu, Level +10 %');
assert.ok(R.validSpecies(rom, g(TR + 12)) && R.validSpecies(rom, g(TR + 56)), 'Tausch gueltig');
const tut = Array.from({ length: 30 }, (_, i) => g(TU + i * 2)); assert.ok(new Set(tut).size === 30 && tut.every(m => m >= 1 && m < 355), 'Lehrer-Attacken gueltig');
let cb = 0; for (let i = 0; i < 8; i++) cb += ex.data[CO + 8 * 40 + i].toString(2).replace(/0/g, '').length; assert.ok(cb > 5 && cb < 58, 'Kompatibilitaet geschrieben ' + cb);
// Items: Feld-Ball, verstecktes Item, Shop
const B0 = 0x100000;
[0x80, 0x18, 0x00, 0x68, 0x89, 0x0B, 0x09, 0x18, 0x08, 0x68, 0x70, 0x47].forEach((b, i) => u8[B0 + i] = b);
w32(B0 + 12, P(B0 + 0x1000)); w32(B0 + 0x1000, P(B0 + 0x2000)); w32(B0 + 0x2000, P(B0 + 0x3000));
w32(B0 + 0x3000 + 4, P(B0 + 0x4000));
u8[B0 + 0x4000] = 1; u8[B0 + 0x4000 + 3] = 1; w32(B0 + 0x4000 + 4, P(B0 + 0x5000)); w32(B0 + 0x4000 + 16, P(B0 + 0x6000));
u8[B0 + 0x5000 + 1] = 59; w32(B0 + 0x5000 + 16, P(B0 + 0x7000));
[0x1A, 0, 0x80, 20, 0, 0x1A, 1, 0x80, 1, 0, 9, 0].forEach((b, i) => u8[B0 + 0x7000 + i] = b);
u8[B0 + 0x6000 + 5] = 5; w16(B0 + 0x6000 + 8, 30);
w16(B0 + 0x8000, 4); w16(B0 + 0x8002, 5); w16(B0 + 0x8004, 6);
window.GEN3_OFFS.BPEE0.ball = 59; window.GEN3_OFFS.BPEE0.shops = [[B0 + 0x8000], [], [0]];
const itemsAll = Array.from({ length: 60 }, (_, i) => i + 1);
window.CC_ITEMS = { 3: { allowed: { items: itemsAll, tms: [40, 41] }, nonBad: { items: itemsAll.filter(i => i % 2) }, nonBad2: { items: itemsAll }, shop: [4, 5], op: [6] } };
const PK = 0x110000; [0x0D, 0x00, 0x0E, 0x00, 0x16, 0x00].forEach((b, i) => u8[PK + i] = b);
window.GEN3_OFFS.BPEE0.pickup = ['0D000E001600', 3];
const it = await R.run(u8, rom, { seed: 'it', wild: 'keep', trainers: 'keep', starters: 'keep', fieldItems: 'random', shops: 'random', pickupItems: 'random', wildLevelPct: 100, shopBanRegular: true, itemsBanBad: false });
assert.ok(it.data[0x80000] === 6 && it.data[0x80001] === 10, 'Wild-Level +100 %');
assert.ok(/=== Pickup-Items \(3\)/.test(it.log), 'Pickup-Items im Protokoll');
assert.ok([0, 2, 4].every(k => { const v = it.data[PK + k] | (it.data[PK + k + 1] << 8); return v >= 1 && v <= 60; }), 'Pickup-Items gueltig');
assert.ok(/=== Items auf dem Feld \(2\)/.test(it.log) && /=== Shops/.test(it.log), 'Protokoll Items');
const gi = (o) => it.data[o] | (it.data[o + 1] << 8);
assert.ok(gi(B0 + 0x7003) >= 1 && gi(B0 + 0x6008) >= 1 && gi(B0 + 0x6008) <= 60, 'Feld-Item gesetzt');
assert.ok([0x8000, 0x8002, 0x8004].every(o => gi(B0 + o) >= 1 && gi(B0 + o) <= 60 && gi(B0 + o) !== 4 && gi(B0 + o) !== 5), 'Shop: Items ohne Standard-Items');
assert.equal(new Set([gi(B0 + 0x8000), gi(B0 + 0x8002), gi(B0 + 0x8004)]).size, 3, 'Shop-Items verschieden');
// Nationaler Pokédex (Smaragd-Skript) und Gehorsam/Entwicklungs-Patch per Byte-Muster
{
  const hx = (h) => h.match(/../g).map(x => parseInt(x, 16));
  const IDENT = 0x300100, PTR_LOC = 0x300200, OBEY = 0x300300, FS = 0x340000;
  u8.fill(0xFF, FS, FS + 0x1000);
  hx('3229610825F00129E40816CD40010003').forEach((b, i) => u8[IDENT + i] = b);
  w32(IDENT - 4, P(0x350000)); // Zeiger auf den Text
  w32(PTR_LOC, P(IDENT - 8)); // Zeiger auf das Skript
  hx('CD21490088420FD0').forEach((b, i) => u8[OBEY + i] = b); w16(OBEY + 0x16, 0x2897);
  window.GEN3_OFFS.BPEE0.free = 0x340000;
  const nd = await R.run(u8, rom, { seed: 'nd', wild: 'keep', trainers: 'keep', starters: 'random', natDexStart: true });
  const ws = (nd.data[PTR_LOC] | (nd.data[PTR_LOC + 1] << 8) | (nd.data[PTR_LOC + 2] << 16)) - 0 ; // Low-Teil des Zeigers
  assert.ok(ws >= FS && ws < FS + 0x1000, 'Pokédex-Skript zeigt in den freien Bereich');
  assert.ok(hx('31720167').every((b, i) => nd.data[ws + i] === b), 'neues Skript beginnt mit Teil 1');
  assert.ok(hx('3229610825F00129E40825F30116CD40010003').every((b, i) => nd.data[ws + 8 + i] === b), 'neues Skript Teil 2');
  assert.ok(/Nationaler Pokédex ab Spielbeginn: gepatcht/.test(nd.log), 'Pokédex-Patch im Protokoll');
  assert.ok(nd.data[OBEY] === 0 && nd.data[OBEY + 1] === 0x21 && nd.data[OBEY + 2] === 0 && nd.data[OBEY + 3] === 0x21, 'Gehorsam-Patch');
  assert.ok(nd.data[OBEY + 0x16] === 0 && nd.data[OBEY + 0x17] === 0x28, 'Mew-Vergleich entfernt');
  const nn = await R.run(u8, rom, { seed: 'nd', wild: 'keep', trainers: 'keep', starters: 'random' });
  assert.ok(nn.data[PTR_LOC] === u8[PTR_LOC] && !/Pokédex/.test(nn.log), 'ohne Option bleibt der Pokédex-Zeiger unverändert');
}
// Rivalen behalten ihren Starter: Trainer 1-4 (Tabellenindex) tragen die Tags RIVAL1-0, RIVAL1-1, RIVAL2-0, RIVAL2-1
{
  window.RIVAL_TAGS = { E: { 1: 'RIVAL1-0', 2: 'RIVAL1-1', 3: 'RIVAL2-0', 4: 'RIVAL2-1' } };
  window.GEN3_OFFS.BPEE0.tr = 0xE0000;
  const rv = await R.run(u8, rom, { seed: 'rv', wild: 'keep', trainers: 'random', starters: 'keep', rivalStarter: true });
  // höchstes Level (Lv 12 + 2 Bonus für den letzten Platz) = Platz 3 des Trainers; Starter des Rivalen = (eigener Starter + 1) % 3 -> Starter 2 bzw. 3 (interne IDs 280 / 283)
  const monSp = (t, j) => rv.data[trainers[t].partyOff + j * trainers[t].partySize + 4] | (rv.data[trainers[t].partyOff + j * trainers[t].partySize + 5] << 8);
  assert.equal(monSp(1, 2), 280, 'RIVAL1-0: Starter 2'); assert.equal(monSp(2, 2), 283, 'RIVAL1-1: Starter 3');
  assert.equal(monSp(3, 2), 280, 'RIVAL2-0: Starter 2'); assert.equal(monSp(4, 2), 283, 'RIVAL2-1: Starter 3');
  assert.ok(/=== Rivalen behalten ihren Starter ===/.test(rv.log), 'Rivalen im Protokoll');
  const rn = await R.run(u8, rom, { seed: 'rv', wild: 'keep', trainers: 'random', starters: 'keep' });
  assert.ok(!/Rivalen behalten/.test(rn.log), 'ohne Option keine Rivalen-Logik');
}
console.log(a.log.split('\n').slice(0, 12).join('\n')); console.log('OK');
})().catch(e => { console.log(e); process.exit(1); });
