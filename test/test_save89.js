// Tests für Switch-Saves (SwSh, PLA, SV via SwishCrypto + PK8/PA8/PK9),
// Ruhmeshalle Gen 2/5/7, Wonder Cards Gen 5/6/7, erweiterte Legalität (Memories, Cherish Ball, Transfer)
// sowie neue Randomizer-Optionen (Doppelkampf, Trainer-Namen, QoL-Patches, Gen 7 Totems).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ctx = { window: {}, console, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, DataView, Math, Date, Object, Array, Number, String, Boolean, JSON, Promise, RegExp, Error };
ctx.window = ctx;
vm.createContext(ctx);
function load(rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

load('data/pk_personal.js');
load('data/pk_gb.js');
load('data/pk_blocks.js');
load('data/pk_blocks67.js');
load('data/pkhex_data.js');
load('data/pk_learn.js');
load('data/pk_enc.js');
load('js/gen3.js');
load('js/nds.js');
load('js/savedit.js');
load('js/savedit_gb.js');
load('js/savedit_3ds.js');
load('js/savedit_switch.js');
load('js/savext.js');
load('js/savhof.js');
load('js/legality.js');
load('js/rand_gen3.js');
load('js/rand_core.js');

const { CCSave, CCSaveSwitch, CCSaveHof, CCSaveExt, CCLegal, CCRandCore } = ctx;

// ---------- 1. Switch Saves: SwSh, PLA, SV ----------
function makeSwitchSave(kind) {
  const cfg = {
    SWSH: { kBox: 0x0d66012c, kParty: 0x2985fe5d, kStat: 0xf25c070e, kMisc: 0x1b882b09, tidO: 0xA0, sidO: 0xA2, gameO: 0xA4, genO: 0xA5, otO: 0xB0, gameVal: 44, boxSlot: 0x158, partySlot: 0x158, statSz: 0x100 },
    PLA:  { kBox: 0x47E1CEAB, kParty: 0x2985fe5d, kStat: 0xf25c070e, kMoney: 0x3279D927, tidO: 0x10, sidO: 0x12, gameO: 0x14, genO: 0x15, otO: 0x20, gameVal: 47, boxSlot: 0x168, partySlot: 0x178, statSz: 0x80 },
    SV:   { kBox: 0x0d66012c, kParty: 0x3AA1A9AD, kStat: 0xE3E89BD1, kMoney: 0x4F35D0DD, tidO: 0x00, sidO: 0x02, gameO: 0x04, genO: 0x05, otO: 0x10, gameVal: 50, boxSlot: 0x158, partySlot: 0x158, statSz: 0x80 }
  }[kind];
  const stat = new Uint8Array(cfg.statSz);
  stat[cfg.gameO] = cfg.gameVal;
  stat[cfg.tidO] = 0x39; stat[cfg.tidO + 1] = 0x30; // 12345
  const blocks = [
    { key: cfg.kBox, type: 4, sub: 0, data: new Uint8Array(2 * 30 * cfg.boxSlot) },
    { key: cfg.kParty, type: 4, sub: 0, data: new Uint8Array(6 * cfg.partySlot) },
    { key: cfg.kStat, type: 4, sub: 0, data: stat }
  ];
  if (cfg.kMisc) blocks.push({ key: cfg.kMisc, type: 4, sub: 0, data: new Uint8Array(16) });
  if (cfg.kMoney) blocks.push({ key: cfg.kMoney, type: 10, sub: 0, data: new Uint8Array(4) });
  return CCSaveSwitch.encryptBlocks(blocks);
}

for (const kind of ['SWSH', 'PLA', 'SV']) {
  const raw = makeSwitchSave(kind);
  assert.strictEqual(CCSaveSwitch.swishHashValid(raw), true, kind + ' SHA-256 hash valid');
  const sv = CCSave.open(raw);
  assert.ok(sv && sv.game === kind, kind + ' recognized');
  sv.setTrainer({ name: 'Red', tid: 54321, sid: 1111, gender: 1, money: 777777 });
  const p = sv.blank(25, sv.getTrainer());
  sv.fmt.set(p, 'nick', 'Pika');
  sv.setParty([p]);
  sv.setBoxMon(0, 3, p);
  const out = sv.finish();
  assert.strictEqual(CCSaveSwitch.swishHashValid(out), true, kind + ' re-encrypted hash valid');
  const sv2 = CCSave.open(out);
  assert.ok(sv2, kind + ' re-opened');
  const tr = sv2.getTrainer();
  assert.strictEqual(tr.name, 'Red');
  assert.strictEqual(tr.tid, 54321);
  assert.strictEqual(tr.money, 777777);
  assert.strictEqual(tr.gender, 1);
  const party = sv2.getParty();
  assert.strictEqual(party.length, 1);
  assert.strictEqual(sv2.fmt.get(party[0], 'species'), 25);
  assert.strictEqual(sv2.fmt.get(party[0], 'nick'), 'Pika');
  const bm = sv2.getBoxMon(0, 3);
  assert.ok(bm && sv2.fmt.get(bm, 'species') === 25);
  console.log('ok: Switch ' + kind + ' roundtrip (SwishCrypto + Trainer + Party + Box)');
}

// ---------- 1b. Switch BDSP (SAV8BS mit MD5) + Gen-9 Species Mapping + Gen-8/9 Personal ----------
{
  const raw = new Uint8Array(0xE9828);
  raw.set(CCSaveSwitch.md5(raw), 0xE9818);
  const sv = CCSave.open(raw);
  assert.ok(sv && sv.game === 'BDSP', 'BDSP recognized');
  sv.setTrainer({ name: 'Dawn', tid: 22222, sid: 3333, gender: 1, money: 123456 });
  const p = sv.blank(393, sv.getTrainer()); // Piplup
  sv.setParty([p]); sv.setBoxMon(0, 0, p);
  const out = sv.finish();
  const sv2 = CCSave.open(out);
  assert.ok(sv2, 'BDSP re-opened with valid MD5');
  assert.strictEqual(sv2.getTrainer().name, 'Dawn');
  assert.strictEqual(sv2.getTrainer().money, 123456);
  assert.strictEqual(sv2.fmt.get(sv2.getParty()[0], 'species'), 393);
  assert.strictEqual(CCSaveSwitch.intToNat9(CCSaveSwitch.natToInt9(1008)), 1008, 'PK9 Miraidon roundtrip');
  assert.strictEqual(CCSaveSwitch.intToNat9(CCSaveSwitch.natToInt9(917)), 917, 'PK9 Tarountula roundtrip');
  assert.ok(ctx.PKPERSONAL.g8 && ctx.PKPERSONAL.g8.length === 899, 'Gen 8 personal table');
  assert.ok(ctx.PKPERSONAL.g9 && ctx.PKPERSONAL.g9.length === 1026, 'Gen 9 personal table');
  console.log('ok: Switch BDSP (MD5) + PK9 SpeciesConverter + Gen 8/9 Personal tables');
}

// ---------- 2. Ruhmeshalle Gen 2, 5, 7 ----------
{
  const d2 = new Uint8Array(0x8000);
  d2[0x3200] = 1; // Win #1
  d2[0x3201] = 25; // Pikachu
  d2[0x3206] = 55; // Lv 55
  const sv2 = { gen: 2, data: d2, decStr: () => 'PIKA' };
  CCSaveHof(sv2);
  const e2 = sv2.hof.entries();
  assert.strictEqual(e2.length, 1);
  assert.strictEqual(e2[0].team[0].species, 25);
  assert.strictEqual(e2[0].team[0].level, 55);
  sv2.hof.clear();
  assert.strictEqual(sv2.hof.entries().length, 0);
  console.log('ok: Hall of Fame Gen 2');
}
{
  const d5 = new Uint8Array(0x80000);
  const off = 0x7C800; // BW
  d5[off] = 0xEF; d5[off + 1] = 0x01; // #495 Snivy
  d5[off + 2] = 62;
  const sv5 = { gen: 5, game: 'BW', data: d5 };
  CCSaveHof(sv5);
  const e5 = sv5.hof.entries();
  assert.strictEqual(e5.length, 1);
  assert.strictEqual(e5[0].team[0].species, 495);
  assert.strictEqual(e5[0].team[0].level, 62);
  sv5.hof.clear();
  assert.strictEqual(sv5.hof.entries().length, 0);
  console.log('ok: Hall of Fame Gen 5');
}
{
  const d7 = new Uint8Array(0x2000);
  const base7 = 0x100;
  d7[base7 + 0x9C4] = 0xD2; d7[base7 + 0x9C5] = 0x02; // #722 Rowlet (First)
  d7[base7 + 0x9C4 + 12] = 0x19; d7[base7 + 0x9C5 + 12] = 0x00; // #25 Pikachu (Current)
  const sv7 = { gen: 7, game: 'SM', data: d7, blocks: { 5: [base7, 0x1000] } };
  CCSaveHof(sv7);
  const e7 = sv7.hof.entries();
  assert.strictEqual(e7.length, 2);
  assert.strictEqual(e7[0].team[0].species, 25);
  assert.strictEqual(e7[1].team[0].species, 722);
  sv7.hof.clear();
  assert.strictEqual(sv7.hof.entries().length, 0);
  console.log('ok: Hall of Fame Gen 7');
}

// ---------- 3. Wonder Cards Gen 6 (WC6) ----------
{
  const d6 = new Uint8Array(0x70000);
  const b41 = 0x1BC00;
  const sv6 = { gen: 6, game: 'XY', data: d6, blocks: { 1: [0x400, 0x1000], 6: [0x1400, 0x20], 11: [0x1500, 0x100], 19: [0x2000, 0x1000], 20: [0x3000, 0x1000], 41: [b41, 0x1A90] } };
  CCSaveExt(sv6, ctx.PKPERSONAL);
  const card = new Uint8Array(0x108);
  card[0] = 42; card[1] = 0; // CardID 42
  card[2] = 65; card[4] = 66; // "AB"
  card[0x51] = 0; // Mon
  card[0x82] = 25; // Pikachu
  card[0xD0] = 50; // Lv 50
  assert.strictEqual(sv6.wc.setRaw(0, card), true);
  const list = sv6.wc.list();
  assert.strictEqual(list[0].id, 42);
  assert.strictEqual(list[0].title, 'AB');
  assert.strictEqual(list[0].species, 25);
  assert.strictEqual(list[0].used, false);
  sv6.wc.setUsed(0, true);
  assert.strictEqual(sv6.wc.list()[0].used, true);
  sv6.wc.remove(0);
  assert.strictEqual(sv6.wc.list()[0], null);
  console.log('ok: Wonder Cards Gen 6 (import, toggle used, delete)');
}

// ---------- 4. Erweiterte Legalität (Cherish Ball, Memories, Transfer) ----------
{
  const sv6 = { gen: 6, game: 'xy', maxSpecies: 721, maxMove: 621, maxItem: 775, natOf: x => x, fmt: ctx.CCSave3DS.PK6 };
  const p = new Uint8Array(232);
  sv6.fmt.set(p, 'species', 25); sv6.fmt.set(p, 'ot', 'Ash'); sv6.fmt.set(p, 'nick', 'Pika');
  sv6.fmt.set(p, 'move', 85, 0); sv6.fmt.set(p, 'pp', 15, 0); sv6.fmt.set(p, 'ball', 16); // Cherish Ball ohne Fateful
  p[0xDF] = 30; // Ursprung Gen 7 (Sonne) in Gen 6 Save -> transferFuture!
  p[0xCC] = 9;  // Ungültige Memory-Intensity > 7 -> memBad!
  const res = CCLegal.check(sv6, p, { P: ctx.PKPERSONAL, S: CCSave, de: true });
  const msgs = res.map(x => x.msg).join(' | ');
  assert.ok(msgs.includes('Jubelball'), 'Cherish Ball check');
  assert.ok(msgs.includes('neueren Generation'), 'Future origin check');
  assert.ok(msgs.includes('Herkunfts-Erinnerung'), 'Memory check');
  console.log('ok: Extended legality checks (Cherish Ball, Transfer, Memories)');
}

// ---------- 5. Neue Randomizer-Optionen (DoubleBattle, TrainerNames, QoL, Totems) ----------
{
  let dblCount = 0, txtPatched = false, runPatched = false, totemSp = 1, totemLv = 20, totemAura = 0;
  let n1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), n2 = new Uint8Array([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  const sp = [null, { nat: 1, bs: [50, 50, 50, 50, 50, 50], types: [0, 0], abilities: [1, 0] }, { nat: 2, bs: [60, 60, 60, 60, 60, 60], types: [1, 1], abilities: [2, 0] }];
  const model = {
    game: 'Test', code: 'TEST', species: sp, wild: [],
    trainers: [
      { label: 'T1', mons: [{ level: 10, get: () => 1, set: () => {}, setLevel: () => {} }, { level: 10, get: () => 2, set: () => {}, setLevel: () => {} }], setDouble: () => { dblCount++; }, getNameBytes: () => n1, setNameBytes: b => { n1 = b; } },
      { label: 'T2', mons: [{ level: 10, get: () => 1, set: () => {}, setLevel: () => {} }], setDouble: () => { dblCount++; }, getNameBytes: () => n2, setNameBytes: b => { n2 = b; } }
    ],
    totems: [{ level: 20, get: () => totemSp, set: v => { totemSp = v; }, setLevel: l => { totemLv = l; }, setAura: a => { totemAura = a; } }],
    patchFastestText: () => { txtPatched = true; return true; },
    patchRunIndoors: () => { runPatched = true; return true; },
    commit: () => new Uint8Array(4)
  };
  CCRandCore.run(model, {
    wild: 'keep', trainers: 'keep', doubleBattleMode: true, shuffleTrainerNames: true,
    fastestText: true, runIndoors: true, totems: 'random', totemLevelPct: 50, totemAura: true, seed: 'test89'
  }).then(res => {
    assert.strictEqual(dblCount, 1, 'only trainers with >=2 mons switched to double');
    assert.strictEqual(txtPatched, true);
    assert.strictEqual(runPatched, true);
    assert.strictEqual(totemLv, 30);
    assert.ok(totemAura >= 1 && totemAura <= 14);
    assert.ok(res.log.includes('Doppelkampf-Modus'));
    assert.ok(res.log.includes('Herrscher-Pokémon'));
    console.log('ok: New randomizer options (DoubleBattle, TrainerNames, QoL, Totems)');
    console.log('alles ok');
  }).catch(e => { console.error(e); process.exit(1); });
}
