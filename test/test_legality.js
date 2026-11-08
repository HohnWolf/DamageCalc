// Legalitätsprüfung Stufe 1: erkennt offensichtliche Fehler und lässt ein sauberes Pokémon durch (Gen 4, Gen 5, Gen 3)
global.window = {}; global.document = {};
const r = __dirname + '/../';
['data/pk_personal.js', 'data/pk_blocks.js', 'js/nds.js', 'js/gen3.js', 'js/savedit.js', 'data/pkhex_data.js', 'js/savext.js', 'data/pk_learn.js','data/pk_enc.js','js/legality.js'].forEach(f => require(r + f));
const assert = require('assert'), S = window.CCSave, P = window.PKPERSONAL;
const env = { P, S, de: false };
const has = (o, t) => o.some(x => x.msg.indexOf(t) >= 0);
function sv4() { // minimaler Gen-4-Stub (nur die Felder, die die Prüfung braucht)
  return { gen: 4, game: 'HGSS', fmt: S.PK4, gb: false, maxSpecies: 493, maxMove: 467, maxItem: 536, natOf: n => n };
}
const F = S.PK4;
const nx = x => (Math.imul(x, 0x41C64E6D) + 0x6073) >>> 0;
function clean() {
  const d = new Uint8Array(236);
  const r1 = nx(0x12345678), r2 = nx(r1), r3 = nx(r2), r4 = nx(r3);
  const pid = (((r2 >>> 16) << 16) | (r1 >>> 16)) >>> 0, w1 = (r3 >>> 16) & 0x7FFF, w2 = (r4 >>> 16) & 0x7FFF;
  [w1 & 31, (w1 >> 5) & 31, (w1 >> 10) & 31, w2 & 31, (w2 >> 5) & 31, (w2 >> 10) & 31].forEach((v, i) => F.set(d, 'iv', v, i));
  F.set(d, 'pid', pid); F.set(d, 'tid', 1); F.set(d, 'sid', 2); F.set(d, 'species', 25); F.set(d, 'exp', S.expFor(P.g4[25][6], 30)); F.set(d, 'level', 30);
  F.set(d, 'ability', P.g4[25][8]); F.set(d, 'ot', 'ASH'); F.set(d, 'nick', 'PIKA'); F.set(d, 'ball', 4); F.set(d, 'lang', 2);
  d[64] = (d[64] & ~6) | (((pid & 0xFF) < P.g4[25][7] ? 1 : 0) << 1);
  [[85, 15], [98, 30]].forEach(([m, pp], i) => { F.set(d, 'move', m, i); F.set(d, 'pp', pp, i); });
  return d;
}
const sv = sv4();
assert.deepStrictEqual(window.CCLegal.check(sv, clean(), env), [], 'sauberes Pokémon ist legal');
let d = clean(); F.set(d, 'move', 85, 1); assert.ok(has(window.CCLegal.check(sv, d, env), 'Duplicate'), 'doppelte Attacke');
d = clean(); F.set(d, 'ev', 255, 0); F.set(d, 'ev', 255, 1); F.set(d, 'ev', 255, 2); assert.ok(has(window.CCLegal.check(sv, d, env), 'EV total'), 'EP-Summe');
d = clean(); F.set(d, 'ability', 1); assert.ok(has(window.CCLegal.check(sv, d, env), 'Ability'), 'Fähigkeit');
d = clean(); F.set(d, 'pp', 99, 0); assert.ok(has(window.CCLegal.check(sv, d, env), 'PP above'), 'AP');
d = clean(); F.set(d, 'move', 0, 0); F.set(d, 'pp', 0, 0); assert.ok(has(window.CCLegal.check(sv, d, env), 'Empty move slot'), 'Attacken-Lücke');
d = clean(); F.set(d, 'iv', 31, 0); F.set(d, 'metLevel', 90); assert.ok(has(window.CCLegal.check(sv, d, env), 'Met level'), 'Fang-Level');
d = clean(); F.set(d, 'species', 600); assert.ok(has(window.CCLegal.check(sv, d, env), 'Invalid species'), 'Art');
d = clean(); d[64] = (d[64] & ~6) | (2 << 1); assert.ok(has(window.CCLegal.check(sv, d, env), 'genderless') || has(window.CCLegal.check(sv, d, env), 'Gender'), 'Geschlecht');
d = clean(); F.set(d, 'pokerus', 0x05); assert.ok(has(window.CCLegal.check(sv, d, env), 'Pokérus'), 'Pokérus');
d = clean(); F.set(d, 'metYear', 10); F.set(d, 'metMonth', 13); F.set(d, 'metDay', 1); assert.ok(has(window.CCLegal.check(sv, d, env), 'Invalid date'), 'Datum');
d = clean(); F.set(d, 'move', 89, 1); F.set(d, 'pp', 10, 1); assert.ok(has(window.CCLegal.check(sv, d, env), 'cannot be learned'), 'Attacke nicht erlernbar');
d = clean(); F.set(d, 'move', 98, 1); assert.ok(!has(window.CCLegal.check(sv, d, env), 'cannot be learned'), 'erlernbare Attacke');
// Zufallsmethode: der Standard-Fixture stammt aus einem echten Startwert (Methode 1); ein verschobener Wert fällt auf
d = clean(); F.set(d, 'iv', (F.get(d, 'iv', 0) + 1) % 32, 0);
assert.ok(has(window.CCLegal.check(sv, d, env), 'RNG'), 'Wert-Mix erkannt');
d = clean(); F.set(d, 'form', 5); assert.ok(has(window.CCLegal.check(sv, d, env), 'Invalid form'), 'Form bei formloser Art');
d = clean(); F.set(d, 'species', 201); F.set(d, 'form', 3); assert.ok(has(window.CCLegal.check(sv, d, env), 'Unown form'), 'Icognito-Form');
{ // Wurmple-Regel: (PID>>16)%10 < 5 -> Silcoon-Linie
  d = clean(); F.set(d, 'species', 266); const hi = (F.get(d, 'pid') >>> 16) % 10;
  const out = window.CCLegal.check(sv, d, env); assert.equal(has(out, 'Wurmple'), hi >= 5, 'Silcoon-Regel');
  F.set(d, 'species', 268); assert.equal(has(window.CCLegal.check(sv, d, env), 'Wurmple'), hi < 5, 'Cascoon-Regel');
}
d = clean(); F.set(d, 'egg', 1); F.set(d, 'ev', 4, 0); assert.ok(has(window.CCLegal.check(sv, d, env), 'Egg with effort'), 'Ei mit EP');
// Gen 5: Wesen muss PID % 25 entsprechen
{
  const F5 = S.PK5, sv5 = { gen: 5, game: 'BW', fmt: S.PK5, gb: false, maxSpecies: 649, maxMove: 559, maxItem: 632, natOf: n => n };
  const d5 = clean(); F5.set(d5, 'nature', (F5.get(d5, 'pid') % 25 + 1) % 25);
  assert.ok(has(window.CCLegal.check(sv5, d5, env), 'Nature'), 'Gen 5: Wesen passt nicht zur PID');
}
// Begegnungs-Abgleich: ein Wildslot aus HeartGold passt, ein falsches Fang-Level oder ein falscher Fundort nicht
{
  const E = window.PKENC, loc = Object.keys(E.wild[7])[5], w = E.wild[7][loc];
  d = clean(); d[0x5F] = 7; F.set(d, 'species', w[0]); F.set(d, 'metLoc', +loc); F.set(d, 'metLevel', w[1]);
  assert.ok(!has(window.CCLegal.check(sv, d, env), 'matching encounter'), 'Wildslot passt');
  F.set(d, 'metLevel', w[2] + 40); assert.ok(has(window.CCLegal.check(sv, d, env), 'matching encounter'), 'Fang-Level passt nicht');
  F.set(d, 'metLevel', w[1]); F.set(d, 'metLoc', 3000); assert.ok(has(window.CCLegal.check(sv, d, env), 'matching encounter'), 'Fundort passt nicht');
  d[0x40] |= 1; assert.ok(!has(window.CCLegal.check(sv, d, env), 'matching encounter'), 'Event-Pokémon wird nicht geprüft');
  const st = E.stat[7].find(x => x[0] === 152); // Chikorita-Geschenk
  d = clean(); d[0x5F] = 7; F.set(d, 'species', 153); F.set(d, 'metLoc', st[1]); F.set(d, 'metLevel', st[2]);
  assert.ok(!has(window.CCLegal.check(sv, d, env), 'matching encounter'), 'Geschenk mit Entwicklung passt');
}
console.log('Legalität OK');
