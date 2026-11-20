// Regressionstests für die Fehler aus dem Save-Editor-Audit: node test/test_save_fixes.js
global.window = {}; global.document = { addEventListener: function () {}, getElementById: function () { return null; } };
['data/pk_personal.js', 'data/pk_gb.js', 'data/pk_text.js', 'data/pk_blocks.js', 'data/pk_blocks67.js', 'data/pkhex_data.js', 'data/pk_learn.js', 'js/nds.js', 'js/gen3.js', 'js/savedit.js', 'js/savedit_gb.js', 'js/savedit_3ds.js', 'js/savext.js', 'js/savhof.js', 'js/legality.js'].forEach(f => require('../' + f));
window.CC = { el: () => ({}), esc: x => x, LANG: 'de', saveFile: () => {} };
require('../js/saveui.js');
const S = window.CCSave, GB = window.CCSaveGB, X = window.CCSave3DS, U = window.CCSaveUI._test, P = window.PKPERSONAL;
const fs = require('fs');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

// ---------- Gen 1/2: synthetische Spielstände ----------
function gen1() {
  const u = new Uint8Array(0x8000);
  u[0x2F2C] = 0; u[0x2F2D] = 0xFF; u[0x30C0] = 0; u[0x30C1] = 0xFF;
  let sum = 0; for (let i = 0x2598; i < 0x3523; i++) sum = (sum + u[i]) & 255; u[0x3523] = (~sum) & 255;
  return u;
}
function gen2(fill) {
  const u = new Uint8Array(0x8000), o = { Party: 0x2865, CurrentBox: 0x2D10 };
  u[o.Party] = 0; u[o.Party + 1] = 0xFF; u[o.CurrentBox] = 0; u[o.CurrentBox + 1] = 0xFF;
  if (fill) fill(u);
  let s = 0; for (let i = 0x2009; i <= 0x2B82; i++) s = (s + u[i]) & 0xFFFF; u[0x2D0D] = s & 255; u[0x2D0E] = s >> 8;
  return u;
}

// 1. Gen 2: aktuelle KP bei Offset 34, Item/Attacke 1 bleiben unberührt; Box-Pokémon bekommen keine KP
{
  const F = GB.PK2, d = F.blank(152, 1, 'GOLD', 20);
  F.set(d, 'item', 7); F.set(d, 'move', 33, 0);
  F.set(d, 'hp', 0x1234);
  ok(d[1] === 7 && d[2] === 33 && d[34] === 0x12 && d[35] === 0x34 && F.get(d, 'hp') === 0x1234, 'Bug 1: Gen 2 KP an Offset 34, Item/Attacke unverändert');
  const sv = GB.open2(gen2()); U.setSv(sv);
  const b = F.blank(152, 1, 'GOLD', 20); F.set(b, 'item', 7);
  U.gbRefresh(b, false);
  ok(b[1] === 7 && b[34] === 0 && b[35] === 0 && b[36] === 0, 'Bug 1: gbRefresh schreibt bei Gen-2-Box-Pokémon keine KP/Werte');
  const p = F.blank(152, 1, 'GOLD', 20); F.set(p, 'item', 7); U.gbRefresh(p, true);
  ok(p[1] === 7 && F.get(p, 'hp') === F.stats(p)[0] && F.stats(p)[0] > 0, 'Bug 1: gbRefresh im Team setzt volle KP');
  // Gen 1 bleibt bei Offset 1
  const g1 = GB.PK1.blank(25, 1, 'ASH', 10); GB.PK1.set(g1, 'hp', 33); ok(g1[1] === 0 && g1[2] === 33, 'Bug 1: Gen 1 KP weiter an Offset 1');
}
// 2. Gen 2: aktuelle Box aus o.CurrentBox lesen, beim Speichern in beide schreiben
{
  const F = GB.PK2, mon = F.blank(158, 5, 'KRIS', 9);
  const u = gen2(u => {
    u[0x2700] = 3; // aktuelle Box 4
    // Box-Bank (veraltet): Box 4 leer; aktuelle Box: Karnimani
    const bank = 0x4000 + 3 * 0x450; u[bank] = 0; u[bank + 1] = 0xFF;
    const cb = 0x2D10; u[cb] = 1; u[cb + 1] = 158; u[cb + 2] = 0xFF; u.set(mon.subarray(0, 32), cb + 22);
    for (let i = 0; i < 11; i++) { u[cb + 22 + 20 * 32 + i] = 0x50; u[cb + 22 + 20 * 32 + 20 * 11 + i] = 0x50; }
  });
  const sv = GB.open2(u);
  ok(sv && sv.getBoxMon(3, 0) && F.get(sv.getBoxMon(3, 0), 'species') === 158, 'Bug 2: Gen 2 aktuelle Box kommt aus CurrentBox');
  const out = sv.finish(), sv2 = GB.open2(out);
  ok(out[0x4000 + 3 * 0x450] === 1 && out[0x2D10] === 1 && F.get(sv2.getBoxMon(3, 0), 'species') === 158, 'Bug 2: beim Speichern in Bank und CurrentBox geschrieben');
}
// 4. Gen 2: SpA und SpV getrennt (Kramurx? -> Gengar 94: SpA 130, SpV 75)
{
  const sv = GB.open2(gen2()), base = sv.baseOf(94), st = GB.calc(base, 50, [15, 15, 15, 15], [0, 0, 0, 0, 0]);
  ok(st.length === 6 && st[4] !== st[5] && st[4] === Math.floor(((base[4] + 15) * 2) * 50 / 100) + 5 && st[5] === Math.floor(((base[5] + 15) * 2) * 50 / 100) + 5, 'Bug 4: Gen 2 calc liefert SpA und SpV getrennt');
  const d = GB.PK2.blank(94, 1, 'X', 50); GB.PK2.setStats(d, st);
  ok(GB.PK2.stats(d)[4] === st[4] && GB.PK2.stats(d)[5] === st[5], 'Bug 4: setStats schreibt SpA (44) und SpV (46)');
  const g1 = GB.calc(GB.open1(gen1()).baseOf(94), 50, [15, 15, 15, 15], [0, 0, 0, 0, 0]); ok(g1.length === 5, 'Bug 4: Gen 1 bleibt bei 5 Werten');
}
// 16. Gen 1: Box-Bank-Prüfsummen
{
  const sv = GB.open1(gen1());
  sv.setBoxMon(7, 0, GB.PK1.blank(1, 1, 'ASH', 5));
  const out = sv.finish();
  const not = (a, n) => { let s = 0; for (let i = a; i < a + n; i++) s = (s + out[i]) & 255; return (~s) & 255; };
  ok(out[0x284C] & 0x80, 'Bug 16: Boxen als initialisiert markiert');
  ok(out[0x5A4C] === not(0x4000, 0x1A4C) && out[0x7A4C] === not(0x6000, 0x1A4C), 'Bug 16: Gesamtprüfsummen Bank 2/3');
  let all = true; for (let k = 0; k < 6; k++) { if (out[0x5A4D + k] !== not(0x4000 + k * 0x462, 0x462) || out[0x7A4D + k] !== not(0x6000 + k * 0x462, 0x462)) all = false; }
  ok(all, 'Bug 16: Einzelprüfsummen je Box');
  ok(GB.open1(out).checksumOk, 'Bug 16: Hauptprüfsumme bleibt gültig');
}
// 12. .pk1/.pk2 im PKHeX-Format
{
  ok(GB.PK1.fileSize === 69 && GB.PK2.fileSize === 73, 'Bug 12: Dateigrößen 69 / 73 Byte');
  const d = GB.PK2.blank(152, 4321, 'GOLD', 5); GB.PK2.set(d, 'nick', 'CHIKO'); GB.PK2.set(d, 'egg', 1);
  const f = GB.PK2.toFile(d);
  ok(f[0] === 1 && f[1] === 0xFD && f[2] === 0xFF && f[3] === 152 && f[3 + 48] === GB.encStr('GOLD', 7, 11)[0], 'Bug 12: .pk2 Kopf, Ei-Marke, Daten, OT');
  const back = GB.PK2.fromFile(f);
  ok(back && GB.PK2.get(back, 'nick') === 'CHIKO' && GB.PK2.get(back, 'ot') === 'GOLD' && back[GB.PK2.EGG] === 1 && GB.PK2.get(back, 'tid') === 4321, 'Bug 12: .pk2 Rundlauf');
  ok(GB.PK2.fromFile(new Uint8Array(69)) === null && GB.PK1.fromFile(new Uint8Array(73)) === null, 'Bug 12: falsche Größe abgelehnt');
  const g1 = GB.PK1.blank(25, 1, 'ASH', 12), f1 = GB.PK1.toFile(g1);
  ok(f1.length === 69 && f1[1] === 0x54 && f1[3] === 0x54 && GB.PK1.get(GB.PK1.fromFile(f1), 'species') === 25, 'Bug 12: .pk1 mit interner Art-ID');
  // über die Oberfläche: Export aus einer Gen-2-Box -> Teamwerte berechnet; Import mit falscher Generation abgelehnt
  const sv = GB.open2(gen2()); U.setSv(sv);
  const bx = GB.PK2.blank(152, 1, 'GOLD', 30), file = U.monToFile(bx);
  ok(file.length === 73 && ((file[3 + 36] << 8) | file[3 + 37]) > 0, 'Bug 12: Export aus der Box enthält Team-Werte');
  ok(U.monFromFile(file, 'x.pk1', false) === null && U.monFromFile(file, 'x.pk2', true) !== null, 'Bug 12: Import prüft Generation');
}
// 3. Box -> Team (Gen 2): Werte werden berechnet
{
  const sv = GB.open2(gen2()); U.setSv(sv);
  sv.setParty([GB.PK2.blank(1, 1, 'A', 5)]);
  sv.setBoxMon(0, 0, GB.PK2.blank(152, 1, 'GOLD', 30));
  U.putAt({ kind: 'party', slot: 1 }, sv.getBoxMon(0, 0));
  const p = sv.getParty()[1];
  ok(p && GB.PK2.get(p, 'level') === 30 && GB.PK2.stats(p)[0] > 0 && GB.PK2.get(p, 'hp') === GB.PK2.stats(p)[0], 'Bug 3: Gen 2 Box -> Team mit Werten und vollen KP');
}

// ---------- Gen 3 ----------
function gen3Save() {
  const u8 = new Uint8Array(0x20000); const w16 = (o, v) => { u8[o] = v & 255; u8[o + 1] = v >> 8; }; const w32 = (o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; u8[o + 2] = (v >> 16) & 255; u8[o + 3] = (v >>> 24) & 255; };
  [0, 0xE000].forEach((base, slot) => { for (let s = 0; s < 14; s++) { const o = base + s * 0x1000; w16(o + 0xFF4, s); w32(o + 0xFF8, 0x08012025); w32(o + 0xFFC, 10 + slot); } });
  w32(0xE000 + 0xAC, 0x1234ABCD); u8[0xE000 + 0x900] = 1; // Smaragd
  return u8;
}
// 6. Sektorprüfsummen mit der Länge je Sektor
{
  const u8 = gen3Save(); u8[0xE000 + 0xF50] = 0x77; // Müll hinter SaveBlock2 (E: 0xF2C) – darf nicht mitzählen
  const sv = S.open(u8); const out = sv.finish();
  ok(S.secLen3('E', 0) === 0xF2C && S.secLen3('E', 4) === 0xF08 && S.secLen3('FRLG', 0) === 0xF24 && S.secLen3('RS', 4) === 0xC40 && S.secLen3('E', 13) === 0x7D0 && S.secLen3('E', 7) === 0xF80, 'Bug 6: Längen je Sektor/Spiel');
  ok(u16(out, 0xE000 + 0xFF6) === S.sum32(out, 0xE000, 0xF2C) && S.sum32(out, 0xE000, 0xF2C) !== S.sum32(out, 0xE000, 0xF80), 'Bug 6: Sektor 0 nur über 0xF2C');
  ok(u16(out, 0xE000 + 13 * 0x1000 + 0xFF6) === S.sum32(out, 0xE000 + 13 * 0x1000, 0x7D0), 'Bug 6: Sektor 13 über 0x7D0');
}
// 10. Gen-3-Ei: Flag-Bit, "タマゴ", Sprache Japanisch; Entfernen über die Oberfläche
{
  const F = S.PK3, sv = S.open(gen3Save()); U.setSv(sv);
  const d = U.blank(25, true);
  U.setEgg(d, true);
  ok(F.get(d, 'egg') === 1 && (d[19] & 4) && d[8] === 0x60 && d[9] === 0x6F && d[10] === 0x8B && d[11] === 0xFF && d[18] === 1 && F.get(d, 'nick') === 'タマゴ', 'Bug 10: Ei setzt Bit 30, Flag Bit 2, Name タマゴ, Sprache 1');
  U.setEgg(d, false);
  ok(F.get(d, 'egg') === 0 && !(d[19] & 4) && d[18] === 5 && F.get(d, 'nick') === 'PIKACHU', 'Bug 10: Ei entfernen stellt Flag, Sprache und Namen zurück');
}
// 5 + 18. newPid deterministisch (Gen 3/4): Wesen + Shiny immer, Geschlecht/Fähigkeit erhalten, Icognito-Buchstabe möglichst
{
  const sv = S.open(gen3Save()); U.setSv(sv); const F = S.PK3;
  let bad = 0;
  for (let n = 0; n < 400; n++) {
    const d = U.blank(n % 2 ? 25 : 201, false); F.set(d, 'tid', (n * 7919) & 0xFFFF); F.set(d, 'sid', (n * 104729) & 0xFFFF);
    const old = F.get(d, 'pid'), nat = n % 25, sh = n % 3 !== 0;
    const p = U.newPid(d, nat, sh); F.set(d, 'pid', p);
    if (p % 25 !== nat || U.isShiny(d) !== sh || (p & 0xFF) !== (old & 0xFF)) bad++;
  }
  ok(bad === 0, 'Bug 5: Wesen + Shiny in 400 Fällen immer erreicht, Low-Byte (Geschlecht/Fähigkeit) erhalten');
  let unown = 0, tries = 0;
  for (let n = 0; n < 200; n++) {
    const d = U.blank(201, false), old = F.get(d, 'pid'); F.set(d, 'tid', n * 31); F.set(d, 'sid', n * 17);
    const p = U.newPid(d, (n * 7) % 25, false); tries++; if (U.unownLetter(p) === U.unownLetter(old)) unown++;
  }
  ok(unown === tries, 'Bug 18: Icognito-Buchstabe (Gen 3) bleibt beim Wesenwechsel erhalten');
  // Geschlechtswechsel
  const d = U.blank(25, false), p2 = U.newPid(d, 10, false, 1); ok((p2 & 0xFF) < P.g3[25][7] && p2 % 25 === 10, 'Bug 5: Geschlecht weiblich über Low-Byte, Wesen passt');
}
// 3. Box -> Team (Gen 3): Level/Werte statt 0 bzw. Werte des Vorgängers
{
  const sv = S.open(gen3Save()); U.setSv(sv); const F = S.PK3;
  const a = U.blank(25, true); F.set(a, 'exp', S.expFor(P.g3[25][6], 50)); U.putAt({ kind: 'party', slot: 0 }, a);
  const b = U.blank(150, false); F.set(b, 'exp', S.expFor(P.g3[150][6], 70)); sv.setBoxMon(0, 0, b);
  U.putAt({ kind: 'party', slot: 0 }, sv.getBoxMon(0, 0));
  const p = sv.getParty()[0];
  ok(p && F.get(p, 'species') === 150 && F.get(p, 'level') === 70 && F.stats(p)[0] > 200 && F.get(p, 'hp') === F.stats(p)[0], 'Bug 3: Gen 3 Box -> Team mit Level 70 und neuen Werten');
  U.putAt({ kind: 'box', box: 1, slot: 2 }, p);
  ok(sv.getBoxMon(1, 2) && sv.getBoxMon(1, 2).length === 80, 'Bug 3: Team -> Box auf 80 Byte gekürzt');
}

// ---------- Gen 4/5 (Formate mit einfachem Spielstand-Ersatz) ----------
function mockSv(gen, F, extra) {
  let party = [], boxes = {};
  const sv = Object.assign({ gen: gen, fmt: F, game: gen === 4 ? 'HGSS' : 'B2W2', natOf: n => n, speciesFromNat: n => n, maxSpecies: gen === 4 ? 493 : 649, items: 'items',
    getTrainer: () => ({ name: 'LYRA', tid: 1000, sid: 2000, gender: 1 }), getParty: () => party.map(x => new Uint8Array(x)), setParty: l => { party = l.filter(Boolean); },
    getBoxMon: (b, s) => boxes[b + ':' + s] ? new Uint8Array(boxes[b + ':' + s]) : null, setBoxMon: (b, s, d) => { boxes[b + ':' + s] = d; } }, extra || {});
  return sv;
}
// 13 + 15. Neues Pokémon Gen 4 (HGSS): Ursprungsspiel, Fundort, Datum, Name in Großbuchstaben, Ball an 0x83 und 0x86
{
  const F = S.PK4, sv = mockSv(4, F, { version: 7, defaultMetLoc: 177 }); U.setSv(sv);
  const d = U.blank(25, false), now = new Date();
  ok(d[0x5F] === 7 && F.get(d, 'metLoc') === 177 && F.get(d, 'metYear') === now.getFullYear() - 2000 && F.get(d, 'metMonth') === now.getMonth() + 1, 'Bug 13: Gen 4 Ursprungsspiel, Fundort, Fangdatum');
  ok(F.get(d, 'nick') === 'PIKACHU', 'Bug 13: Gen 4 Artname in Großbuchstaben');
  ok(d[0x83] === 4 && d[0x86] === 4, 'Bug 15: HGSS-Ball zusätzlich an 0x86');
  F.set(d, 'ball', 17); ok(d[0x83] === 4 && d[0x86] === 17 && F.get(d, 'ball') === 17, 'Bug 15: HGSS-Ball (>16) -> DPPt-Ball Pokéball, 0x86 = 17');
  d[0x5F] = 10; F.set(d, 'ball', 5); ok(d[0x83] === 5 && d[0x86] === 0, 'Bug 15: Herkunft DP -> kein HGSS-Ball');
}
// 11. Artwechsel Gen 4: Geschlecht und Form passen sich an
{
  const F = S.PK4, sv = mockSv(4, F, { version: 12 }); U.setSv(sv);
  const d = U.blank(386, false); F.set(d, 'form', 3); // Deoxys Initiative
  U.changeSpecies(d, 25, false);
  const pid = F.get(d, 'pid');
  ok(F.get(d, 'form') === 0, 'Bug 11: Form 0, wenn die neue Art die Form nicht hat');
  ok(F.get(d, 'gender') === ((pid & 0xFF) < P.g4[25][7] ? 1 : 0), 'Bug 11: geschlechtslos -> Geschlecht aus der PID');
  U.changeSpecies(d, 113, false); ok(F.get(d, 'gender') === 1, 'Bug 11: nur weiblich (Chaneira)');
  U.changeSpecies(d, 81, false); ok(F.get(d, 'gender') === 2, 'Bug 11: geschlechtslos (Magnetilo)');
  U.changeSpecies(d, 479, false); F.set(d, 'form', 2); U.changeSpecies(d, 479, false); ok(F.get(d, 'form') === 2, 'Bug 11: vorhandene Form bleibt (Rotom)');
}
// 9. Formen-Basiswerte
{
  const F = S.PK4, sv = mockSv(4, F, {}); U.setSv(sv);
  const d = U.blank(386, true); F.set(d, 'form', 1); // Deoxys Angriff
  ok(U.persD(d)[1] === 180 && U.persD(d)[2] === 20, 'Bug 9: Deoxys-Angriff Basiswerte (Gen 4)');
  F.set(d, 'exp', S.expFor(U.persD(d)[6], 50)); const r = U.recalc(d);
  ok(r.stats[1] > r.stats[2] * 3, 'Bug 9: recalc nutzt die Form-Basiswerte');
  const g = mockSv(4, F, {}); U.setSv(g); const gi = U.blank(487, true); F.set(gi, 'form', 1); ok(U.persD(gi)[1] === 120 && U.persD(gi)[8] === 26, 'Bug 9: Giratina-Urform (Werte, Schwebe)');
  const s7 = mockSv(7, X.PK7, { blank: null }); s7.gen = 7; U.setSv(s7); ok(U.pers(20, 1)[3] === 77 && U.pers(20, 0)[3] === 97, 'Bug 9: Alola-Rattikarl (Gen 7)');
  const s3 = { gen: 3, game: 'RS', natOf: n => n }; U.setSv(s3); const rs = U.pers(386, 0)[1]; s3.game = 'E'; const e = U.pers(386, 0)[3];
  ok(rs === 150 && e === 180, 'Bug 9: Gen 3 Deoxys je Spiel (RS Normal, Smaragd Initiative)');
}
// 8. Gen 5: Fähigkeits-Slot = PID-Bit 16, Artwechsel passt Fähigkeit an, Shiny erhält Bit 16
{
  const F = S.PK5, sv = mockSv(5, F, { version: 23, defaultMetLoc: 124 }); U.setSv(sv);
  const d = U.blank(1, false); F.set(d, 'pid', 0x00010000 | 5); // Slot 2
  U.changeSpecies(d, 25, false);
  ok(F.get(d, 'ability') === P.g5[25][9], 'Bug 8: Gen 5 Artwechsel setzt Fähigkeit nach PID-Bit 16');
  F.set(d, 'hiddenAbility', 1); U.changeSpecies(d, 4, false); ok(F.get(d, 'ability') === P.g5[4][10], 'Bug 8: Gen 5 versteckte Fähigkeit bleibt versteckt');
  let keep = true; for (let n = 0; n < 50; n++) { F.set(d, 'tid', n * 99); const p = U.newPid(d, 0, n % 2 === 0); if (((p >>> 16) & 1) !== 1) keep = false; }
  ok(keep, 'Bug 8: Shiny-Umschalten erhält PID-Bit 16');
  const n5 = U.blank(25, false); ok(n5[0x5F] === 23 && F.get(n5, 'metLoc') === 124 && F.get(n5, 'nick') === 'Pikachu', 'Bug 13: Gen 5 Ursprungsspiel, Fundort, Name normal geschrieben');
}
// 12. .pk-Import Gen 4: Größe/Generation/Prüfsumme
{
  const F = S.PK4, sv = mockSv(4, F, { version: 7 }); U.setSv(sv);
  const d = U.blank(25, false); F.set(d, 'exp', 1234);
  const file = U.monToFile(d);
  ok(F.checksumOk(file), 'Bug 12: Export mit gültiger Prüfsumme');
  ok(U.monFromFile(file, 'p.pk5', false) === null, 'Bug 12: falsche Generation abgelehnt');
  ok(U.monFromFile(new Uint8Array(100), 'p.pk4', false) === null, 'Bug 12: falsche Größe abgelehnt');
  const enc = new Uint8Array(136); F.encode(new Uint8Array(file), enc, 0, false);
  const imp = U.monFromFile(enc, 'p.pk4', false); ok(imp && F.get(imp, 'exp') === 1234, 'Bug 12: verschlüsselte Datei wird erkannt');
  const broken = new Uint8Array(file); broken[6] ^= 0xFF; broken[0] ^= 0x55; const imp2 = U.monFromFile(broken, 'p.pk4', true);
  ok(imp2 && imp2.length === 236 && F.checksumOk(imp2), 'Bug 12: falsche Prüfsumme wird neu berechnet, Team-Länge');
}
// 17. Grenzen
{
  const sv6 = mockSv(6, X.PK6, {}); sv6.gen = 6; U.setSv(sv6);
  const d = new Uint8Array(260); [252, 252, 0, 0, 0, 0].forEach((v, i) => X.PK6.set(d, 'ev', v, i));
  ok(U.clampEv(d, 2, 255) === 6, 'Bug 17: EP-Summe höchstens 510');
  X.PK6.set(d, 'ev', 0, 0); ok(U.clampEv(d, 2, 255) === 252, 'Bug 17: Gen 6 je Wert höchstens 252');
  const sv4 = mockSv(4, S.PK4, {}); U.setSv(sv4); const d4 = new Uint8Array(236); ok(U.clampEv(d4, 0, 300) === 255, 'Bug 17: Gen 4 je Wert höchstens 255');
  ok(U.maxMoney(3) === 999999 && U.maxMoney(4) === 999999 && U.maxMoney(5) === 9999999 && U.maxMoney(7) === 9999999, 'Bug 17: Geld-Maximum je Generation');
  ok(U.ppMax(33, 0) === 35 && U.ppMax(33, 3) === 56 && U.ppMax(85, 3) === 24, 'Bug 17: AP-Maximum (Tackle 35/56, Donnerblitz 24)');
  const g1 = GB.open1(gen1()); U.setSv(g1); ok(U.ppMax(33, 3) === 56 && U.ppMax(16, 3) === 56 && U.ppMax(1, 0) === 35, 'Bug 17: AP-Maximum Gen 1');
}
// 14. Freundschaft beim aktuellen Besitzer (Gen 6/7)
{
  const F = X.PK7, d = new Uint8Array(260);
  F.set(d, 'friendship', 70); ok(d[0xCA] === 70 && d[0xA2] === 0, 'Bug 14: OT-Freundschaft (0xCA) bei Besitzer 0');
  d[0x93] = 1; F.set(d, 'friendship', 200); ok(d[0xA2] === 200 && d[0xCA] === 70 && F.get(d, 'friendship') === 200, 'Bug 14: Nicht-OT-Freundschaft (0xA2) bei Besitzer 1');
}
// 7. MemeCrypto (Gen 7): Hash-/AES-Testvektoren, Signieren und mit dem öffentlichen Schlüssel prüfen
{
  const hex = u => Buffer.from(u).toString('hex');
  ok(hex(X.sha1(Buffer.from('abc'))) === 'a9993e364706816aba3e25717850c26c9cd0d89d', 'Bug 7: SHA-1 Testvektor');
  ok(hex(X.sha256(Buffer.from('abc'))) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'Bug 7: SHA-256 Testvektor');
  const w = X.aesKey(Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex')), b = new Uint8Array(Buffer.from('00112233445566778899aabbccddeeff', 'hex'));
  X.aesEnc(w, b); const encOk = hex(b) === '69c4e0d86a7b0430d8cdb78070b4c55a'; X.aesDec(w, b);
  ok(encOk && hex(b) === '00112233445566778899aabbccddeeff', 'Bug 7: AES-128 Testvektor (FIPS-197)');
  for (const k of ['sm', 'usum']) {
    const size = k === 'sm' ? 0x6BE00 : 0x6CC00, u = new Uint8Array(size); u[size - 0x1F0] = 0x46; u[size - 0x1EF] = 0x45; u[size - 0x1EE] = 0x45; u[size - 0x1ED] = 0x42;
    const sv = S.open(u); sv.setTrainer({ name: 'Ash', tid: 1, sid: 2, gender: 0, money: 5 });
    const out = sv.finish(), off = (k === 'sm' ? 0x6BA00 : 0x6C000) + 0x100, sig = out.subarray(off, off + 0x80);
    ok(sv.signed === true && X.memeVerify(sig), 'Bug 7: ' + k + ' Signatur mit öffentlichem Schlüssel gültig');
    ok(hex(sig.subarray(0, 0x20)) === hex(X.sha256(out.subarray(size - 0x200, size - 0x200 + (k === 'sm' ? 0x140 : 0x150)))), 'Bug 7: ' + k + ' SHA-256 der Blocktabelle');
    const bad = new Uint8Array(sig); bad[0x30] ^= 1; ok(!X.memeVerify(bad), 'Bug 7: ' + k + ' veränderte Signatur wird erkannt');
    // Prüfsumme des MemeCrypto-Blocks gilt für den genullten Bereich
    const BL = window.PKBLOCKS67[k], i36 = 36, z = new Uint8Array(out); z.fill(0, off, off + 0x80);
    ok(u16(out, size - 0x200 + 0x14 + i36 * 8 + 6) === X.crc7(z, BL[i36][0], BL[i36][0] + BL[i36][1]), 'Bug 7: ' + k + ' Block-36-Prüfsumme über genullte Signatur');
  }
}

// ---------- v2.1.0 Audit-Fixes ----------
window.confirm = () => true;
// Fix 1: Party nicht auf 0 Pokémon leerbar (remove())
{
  const sv = S.open(gen3Save()); U.setSv(sv);
  sv.setParty([U.blank(25, true)]);
  U.setState({ sel: { kind: 'party', box: 0, slot: 0 }, mon: sv.getParty()[0] });
  U.remove();
  ok(sv.getParty().length === 1, 'Fix 1: letztes Team-Pokémon wird nicht gelöscht');
  sv.setParty([U.blank(25, true), U.blank(1, true)]);
  U.setState({ sel: { kind: 'party', box: 0, slot: 1 }, mon: sv.getParty()[1] });
  U.remove();
  ok(sv.getParty().length === 1, 'Fix 1: zweites Team-Pokémon lässt sich löschen');
}
// Fix 2 + 3 + 10: Showdown-Import/-Export (Gen-Grenzen, Gen-3-Items, Basis-AP, Gen-5/6/7-Fähigkeitsflags, Default-IVs 31)
{
  const sv3 = S.open(gen3Save()); U.setSv(sv3);
  const p3 = U.blank(25, false); S.PK3.set(p3, 'item', 200); // Gen 3 Überreste
  const txt3 = U.sdExport(p3);
  ok(txt3.indexOf('@ Leftovers') >= 0, 'Fix 3: Gen 3 Showdown-Export nutzt items3 (Leftovers)');
  const imp3 = U.sdImport('Pikachu @ Leftovers\nLevel: 50\nAdamant Nature\n- Fire Blast\n- Moonblast', false);
  ok(imp3 && S.PK3.get(imp3, 'item') === 200, 'Fix 3: Gen 3 Showdown-Import nutzt items3 (ID 200)');
  ok(imp3 && S.PK3.get(imp3, 'move', 0) === 126 && S.PK3.get(imp3, 'pp', 0) === 5, 'Fix 10: Showdown-Import setzt echte Basis-AP (Feuersturm = 5)');
  ok(imp3 && S.PK3.get(imp3, 'move', 1) === 0, 'Fix 2: Showdown-Import verwirft Attacken über maxMove (Moonblast in Gen 3)');
  ok(imp3 && S.PK3.get(imp3, 'iv', 0) === 31 && S.PK3.get(imp3, 'iv', 5) === 31, 'Fix 10: Showdown-Import Default-IVs = 31');
  const sv4 = mockSv(4, S.PK4, { maxMove: 467, maxItem: 536, maxAbility: 123 }); U.setSv(sv4);
  ok(U.sdImport('Mimikyu\n- Shadow Claw', false) === null, 'Fix 2: Showdown-Import lehnt Gen-7-Art in Gen 4 ab');
  const sv5 = mockSv(5, S.PK5, { maxMove: 559, maxItem: 638, maxAbility: 164 }); U.setSv(sv5);
  const imp5 = U.sdImport('Pikachu\nAbility: Lightning Rod\n- Thunderbolt', false);
  ok(imp5 && S.PK5.get(imp5, 'ability') === 31 && S.PK5.get(imp5, 'hiddenAbility') === 1, 'Fix 10: Gen 5 Showdown-Import setzt hiddenAbility');
  const sv6 = mockSv(6, X.PK6, { maxSpecies: 721, maxMove: 617, maxItem: 717, maxAbility: 191 }); sv6.gen = 6; U.setSv(sv6);
  const imp6 = U.sdImport('Pikachu\nAbility: Lightning Rod\n- Thunderbolt', false);
  ok(imp6 && X.PK6.get(imp6, 'ability') === 31 && X.PK6.get(imp6, 'abilityNum') === 4, 'Fix 10: Gen 6 Showdown-Import setzt abilityNum=4');
}
// Fix 4: Gen 1/2 Box leeren löscht alle Pokémon
{
  const sv1 = GB.open1(gen1()); U.setSv(sv1); U.setState({ box: 0 });
  for (let i = 0; i < 10; i++) sv1.setBoxMon(0, i, GB.PK1.blank(1 + i, 1, 'ASH', 5));
  U.clearBox();
  let rem = 0; for (let i = 0; i < 20; i++) if (sv1.getBoxMon(0, i)) rem++;
  ok(rem === 0, 'Fix 4: Gen 1 clearBox löscht alle 10 Pokémon');
}
// Fix 5: Gen 3 Ball maskiert & 15, überschreibt otGender nicht
{
  const d = new Uint8Array(80); S.PK3.set(d, 'otGender', 0); S.PK3.set(d, 'ball', 16);
  ok(S.PK3.get(d, 'otGender') === 0 && S.PK3.get(d, 'ball') === 0, 'Fix 5: PK3.set(ball, 16) korrumpiert otGender nicht');
}
// Fix 7 + 8: Gen 6/7 Statusheilung + Gen 7 PK7.abilityNum 3-Bit-Maske
{
  const pk6 = new Uint8Array(260); pk6[0xE8] = 8;
  ok(X.PK6.get(pk6, 'status') === 8, 'Fix 7: PK6 liest status bei 0xE8');
  X.PK6.set(pk6, 'status', 0);
  ok(pk6[0xE8] === 0 && X.PK6.get(pk6, 'status') === 0, 'Fix 7: PK6.set(status, 0) heilt Status');
  const pk7 = new Uint8Array(260); pk7[0x15] = 0x0C; // 4 (HA) + Bit 3 (8)
  ok(X.PK7.get(pk7, 'abilityNum') === 4 && X.PK7.get(pk7, 'hiddenAbility') === 1, 'Fix 8: PK7 maskiert abilityNum auf & 7');
  X.PK7.set(pk7, 'abilityNum', 2);
  ok(pk7[0x15] === 0x0A && X.PK7.get(pk7, 'abilityNum') === 2, 'Fix 8: PK7.set(abilityNum) erhält obere Bits');
}
// Fix 9: apply() dupliziert nicht bei gepackten Slots (Team & Gen 1/2 Box)
{
  const sv3 = S.open(gen3Save()); U.setSv(sv3);
  sv3.setParty([U.blank(25, true)]);
  U.setState({ sel: { kind: 'party', box: 0, slot: 4 }, mon: U.blank(1, true) });
  U.apply(); U.apply();
  ok(sv3.getParty().length === 2 && U.getState().sel.slot === 1, 'Fix 9: apply() im Team aktualisiert sel.slot und dupliziert nicht');
  const sv1 = GB.open1(gen1()); U.setSv(sv1);
  sv1.setBoxMon(0, 0, GB.PK1.blank(25, 1, 'ASH', 5));
  U.setState({ sel: { kind: 'box', box: 0, slot: 5 }, mon: GB.PK1.blank(1, 1, 'ASH', 5) });
  U.apply(); U.apply();
  let c1 = 0; for (let i = 0; i < 20; i++) if (sv1.getBoxMon(0, i)) c1++;
  ok(c1 === 2 && U.getState().sel.slot === 1, 'Fix 9: apply() in Gen-1-Box aktualisiert sel.slot und dupliziert nicht');
}
// Fix 11: legalize(d, true) aktualisiert Team-Stats
{
  const sv4 = mockSv(4, S.PK4, { maxMove: 467, maxItem: 536 }); U.setSv(sv4);
  const d = U.blank(25, true); S.PK4.set(d, 'exp', S.expFor(P.g4[25][6], 50));
  for (let i = 0; i < 6; i++) S.PK4.set(d, 'ev', 252, i);
  S.PK4.setStats(d, [999, 999, 999, 999, 999, 999]);
  U.legalize(d, true);
  ok(S.PK4.stats(d)[0] < 200, 'Fix 11: legalize(d, true) berechnet Team-Stats neu');
}
// Fix 12: Gen 3 Ruhmeshalle ignoriert uninitialisiertes 0xFF-Flash
{
  const u = new Uint8Array(0x20000).fill(0xFF);
  const sv3f = { gen: 3, data: u, natOf: s => window.GEN3.defaultNat(s), maxSpecies: 386 };
  window.CCSaveHof(sv3f);
  ok(sv3f.hof.entries().length === 0, 'Fix 12: Gen 3 Ruhmeshalle liefert [] auf uninitialisiertem 0xFF-Flash');
}
// Fix 13: Formwechsel aktualisiert Fähigkeit (Giratina Wandel -> Urform)
{
  const sv4 = mockSv(4, S.PK4, {}); U.setSv(sv4);
  const d = U.blank(487, true);
  U.setForm(d, 1, true);
  ok(S.PK4.get(d, 'form') === 1 && S.PK4.get(d, 'ability') === 26, 'Fix 13: Formwechsel Giratina -> Urform setzt Schwebe (26)');
}
// Fix 15: Wurmple-PID-Erhalt auch für Entwicklungen 266-269
{
  const sv4 = mockSv(4, S.PK4, {}); U.setSv(sv4);
  const d = U.blank(267, false); S.PK4.set(d, 'pid', 0x00010000); // Beautifly (<5)
  let okW = true;
  for (let i = 0; i < 40; i++) if (((U.newPid(d, i % 25, false) >>> 16) % 10) >= 5) okW = false;
  ok(okW, 'Fix 15: newPid erhält Wurmple-Regel auch für Papinella (#267)');
}
// Fix 16: Kristall Palette-Byte, Gen 2 VM-Max 1, Arceus-Formnamen Gen 5-7
{
  const sv2 = GB.open2(gen2()); sv2.setTrainer({ name: 'KRIS', tid: 1, money: 0, gender: 1 });
  ok(sv2.data[0x3E3D] === 1 && sv2.data[0x206A] === 1, 'Fix 16: Kristall Geschlecht schreibt auch Palette-Byte 0x206A');
  window.CCSaveExt(sv2, P);
  const tmIdx = sv2.bag.pouches.findIndex(p => p.k === 'TMHMs');
  ok(sv2.bag.maxFor(tmIdx, 243) === 1 && sv2.bag.maxFor(tmIdx, 242) === 99, 'Fix 16: Gen 2 VM-Max ist 1, TM-Max ist 99');
  ok(U.formNames(493, 4)[9] === '???' && U.formNames(493, 5)[9] === 'Feuer' && U.formNames(493, 5).length === 17 && U.formNames(493, 6)[17] === 'Fee', 'Fix 16: Arceus-Formnamen Gen 4 vs. Gen 5 vs. Gen 6/7');
}

// ---------- Leere Slots wie PKHeX: verschlüsseltes Blank-PKM statt Nullen (sonst Bad Egg im Spiel) ----------
{
  const z6 = new Uint8Array(232), e6 = new Uint8Array(232); X.PK7.encode(z6, e6, 0, false);
  ok(e6.slice(8).some(b => b !== 0) && u32(e6, 0) === 0 && X.PK7.decode(e6, 0, false) === null, 'Gen 6/7: leerer Box-Slot = verschlüsseltes Blank (EC 0, nicht nur Nullen), liest sich als leer');
  const z4 = new Uint8Array(136), e4 = new Uint8Array(136); S.PK4.encode(z4, e4, 0, false);
  ok(e4.slice(8).some(b => b !== 0) && S.PK4.decode(e4, 0, false) === null, 'Gen 4/5: leerer Box-Slot = verschlüsseltes Blank (Prüfsumme 0), liest sich als leer');
  const src = fs.readFileSync(require('path').join(__dirname, '..', 'js', 'savedit_3ds.js'), 'utf8') + fs.readFileSync(require('path').join(__dirname, '..', 'js', 'savedit.js'), 'utf8');
  ok(!/else data.fill(0, o, o + (232|260|136|236|220))/.test(src), 'Gen 4–7: setBoxMon/setParty schreiben keine Nullen mehr in leere Slots');
}
// ---------- PKHeX-Differenztest (tools/diff_save_pkhex.js): Zeichen, Gen-4-Fundort, GB-Dateigrößen ----------
{
  const d3 = new Uint8Array(100); S.PK3.set(d3, 'nick', 'MR MIME'); ok(S.PK3.get(d3, 'nick') === 'MR MIME', 'Gen 3: Leerzeichen (0x00) bleibt im Namen erhalten');
  S.PK3.set(d3, 'nick', "FARFETCH'D"); ok(S.PK3.get(d3, 'nick').length === 10, "Gen 3: gerades ' wird als ’ gespeichert statt verschluckt");
  const d4 = new Uint8Array(236); S.PK4.set(d4, 'nick', 'FARFETCH’D'); ok(S.PK4.get(d4, 'nick').length === 10, 'Gen 4: typografisches ’ wird als gerades Apostroph gespeichert statt verschluckt');
  d4[0x5F] = 7; S.PK4.set(d4, 'metLoc', 182);
  ok(u16(d4, 0x80) === 3002 && u16(d4, 0x46) === 182 && S.PK4.get(d4, 'metLoc') === 182, 'Gen 4: Pt/HGSS-Fundort → DP-Feld Ferner Ort, Pt/HGSS-Feld 182 (wie PKHeX)');
  S.PK4.set(d4, 'metLoc', 50); ok(u16(d4, 0x80) === 50 && u16(d4, 0x46) === 50, 'Gen 4: DP-Ort bei HGSS-Herkunft in beide Felder');
  d4[0x5F] = 10; S.PK4.set(d4, 'metLoc', 50); ok(u16(d4, 0x80) === 50 && u16(d4, 0x46) === 0, 'Gen 4: DP-Ort bei DP-Herkunft nur im DP-Feld');
  const d5 = new Uint8Array(220); S.PK5.set(d5, 'metLoc', 182); ok(u16(d5, 0x80) === 182 && u16(d5, 0x46) === 0, 'Gen 5: nur ein Fundort-Feld');
  const g1 = gen1(), big = new Uint8Array(0x802C); big.set(g1); big[0x8020] = 0x5A;
  const sg = S.open(big); ok(sg && sg.gen === 1, 'Gen 1: Spielstand mit Emulator-Anhang (0x802C) wird erkannt');
  if (sg) { const o = sg.finish(); ok(o.length === 0x802C && o[0x8020] === 0x5A, 'Gen 1: Anhang bleibt beim Speichern erhalten'); }
}

console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
