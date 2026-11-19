// Prüft die Gen-6-Statics (X/Y) mit Attrappen-CTR-Modul und künstlicher DllField.cro: node test/test_rand_3ds_gen6.js
global.window = {}; global.document = {};
const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const garcs = {}, cro = {};
let lastPath = null;
window.CTR = {
  u16, u32,
  findFile: (info, path) => { if (!garcs[path]) return null; lastPath = path; return { off: 0, size: 1, path }; },
  parseGarc: () => garcs[lastPath], openGarc: null, garcFile: (g, i) => g.files[i],
  readFile: async (info, name) => cro[name] || null, readCode: async () => null,
  unpackMini: () => null, lz11: x => x, lz11Compress: x => x,
  build: (info, patches) => Promise.resolve({ patches })
};
['js/rand_gen3.js', 'js/rand_core.js'].forEach(f => require('../' + f));
const R = require('../js/rand_3ds.js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
const g = R.GAMES['CTR-P-EKJ'];
const mk = (n, len, fn) => { const files = [new Uint8Array(len)]; for (let i = 1; i <= n; i++) { const d = new Uint8Array(len); fn(d, i); files.push(d); } return { files, data: new Uint8Array(4), whole: true }; };
garcs[g.stats] = mk(721, 0x54, (d) => { for (let k = 0; k < 6; k++) d[k] = 50; d[7] = 10; d[24] = 5; });
garcs[g.learn] = mk(721, 8, (d) => { d[0] = 33; d[2] = 1; d[4] = 0xFF; d[5] = 0xFF; d[6] = 0xFF; d[7] = 0xFF; });
garcs[g.evo] = mk(721, 48, () => {});
garcs[g.move] = mk(617, 36, (d, i) => { d[0] = i % 17; d[3] = 60; d[4] = 100; d[5] = 20; });
// DllField.cro: 13 Statics (0xC) bei 0xEE46C, 19 Geschenke (0x18) bei 0xF805C; Statics 1 und 3 sowie 2 und 12 sind verknüpft
const fd = new Uint8Array(0xF805C + 19 * 0x18 + 0x100);
for (let i = 0; i < 13; i++) { const o = 0xEE46C + i * 0xC; fd[o] = 100 + i; fd[o + 2] = 1; fd[o + 3] = 20; }
fd[0xEE46C + 3 * 0xC] = 101; fd[0xEE46C + 12 * 0xC] = 102; // Verknüpfung: gleiche Art wie 1 bzw. 2
for (let i = 0; i < 19; i++) { const o = 0xF805C + i * 0x18; fd[o] = 200 + i; fd[o + 4] = 1; fd[o + 5] = 10; }
cro['DllField.cro'] = { data: fd, loc: { off: 0 } };
(async () => {
  const ctx = { info: {}, source: { size: 1, read: async () => new Uint8Array(1) }, g, code: 'CTR-P-EKJ' };
  const model = await R.buildModel(ctx, false);
  // 13 Statics - 2 verknüpfte + 19 Geschenke - 6 Starter = 11 + 13
  ok(model.statics && model.statics.length === 11 + 13, 'Statics im Modell: ' + (model.statics && model.statics.length));
  const res = await window.CCRandCore.run(model, { seed: 'g6', wild: 'keep', trainers: 'keep', statics: 'random', staticLevelPct: 50 });
  ok(u16(fd, 0xEE46C) !== 100 && fd[0xEE46C + 2] === 0 && fd[0xEE46C + 3] === 30, 'Static 0 neu, Form 0, Level +50 %');
  ok(u16(fd, 0xEE46C + 3 * 0xC) === u16(fd, 0xEE46C + 1 * 0xC), 'Verknüpfte Statics 1 und 3 haben dieselbe Art');
  ok(u16(fd, 0xEE46C + 12 * 0xC) === u16(fd, 0xEE46C + 2 * 0xC), 'Verknüpfte Statics 2 und 12 haben dieselbe Art');
  ok(u16(fd, 0xF805C) === 200 && u16(fd, 0xF805C + 5 * 0x18) === 205, 'Starter-Geschenke (Nr. 0-5) unberührt');
  ok(u16(fd, 0xF805C + 6 * 0x18) !== 206 && fd[0xF805C + 6 * 0x18 + 4] === 0, 'Geschenk Nr. 6 neu, Form 0');
  ok(res.data.patches.some(p => p.off === 0xEE46C), 'Änderungen an DllField.cro vorgemerkt');
  const croOffs = res.data.patches.filter(p => p.off >= 0xEE46C).map(p => p.off);
  ok(croOffs.length > 0 && new Set(croOffs).size === croOffs.length, 'Keine doppelten CRO-Patch-Offsets bei Statics + Level (kein ctr:overlap)');
  // Omega Rubin: 60 Lehrer-Attacken im Programmcode (Liste ab Muster, 0x26E = Lücke) plus Lehrer-Shop-Tabelle
  {
    const go = R.GAMES['CTR-P-ECR'];
    garcs[go.stats] = mk(721, 0x54, (d) => { for (let k = 0; k < 6; k++) d[k] = 50; d[7] = 10; d[24] = 5; });
    garcs[go.learn] = mk(721, 8, (d) => { d[0] = 33; d[2] = 1; d[4] = 0xFF; d[5] = 0xFF; d[6] = 0xFF; d[7] = 0xFF; });
    garcs[go.evo] = mk(721, 48, () => {});
    garcs[go.move] = mk(621, 36, (d, i) => { d[0] = i % 17; d[3] = 60; d[4] = 100; d[5] = 20; });
    const code = new Uint8Array(0x2000), LST = 0x100, SHOP = 0x800;
    const hx = (h) => h.match(/../g).map(x => parseInt(x, 16));
    const first = [0x1C2, 0x157, 0xA2, 0x212, 0x144, 0x1BA];
    const list = first.concat(Array.from({ length: 54 }, (_, i) => 20 + i * 5));
    let pos = LST; list.forEach((m, i) => { if (i === 10) { code[pos] = 0x6E; code[pos + 1] = 0x02; pos += 2; } code[pos] = m & 255; code[pos + 1] = m >> 8; pos += 2; });
    code[pos] = 0xFF; code[pos + 1] = 0xFF;
    hx('8A02000030000000').forEach((b, i) => code[SHOP - 8 + i] = b);
    list.forEach((m, i) => { code[SHOP + i * 8] = m & 255; code[SHOP + i * 8 + 1] = m >> 8; });
    let outCode = null;
    window.CTR.readCode = async () => ({ code });
    window.CTR.buildExefs = async (info, ex, c) => { outCode = c; return { exefs: 1 }; };
    cro['DllField.cro'] = null;
    const ctxO = { info: {}, source: { size: 1, read: async () => new Uint8Array(1) }, g: go, code: 'CTR-P-ECR' };
    const mo = await R.buildModel(ctxO, false);
    ok(mo.tutor && mo.tutor.moves.length === 60 && mo.tutor.moves[0] === 0x1C2, 'ORAS: 60 Lehrer-Attacken erkannt');
    await window.CCRandCore.run(mo, { seed: 'tu', wild: 'keep', trainers: 'keep', tutorMoves: 'random' });
    const rd = (o) => outCode[o] | (outCode[o + 1] << 8);
    let q = LST, nSame = 0, shopOk = true, holeOk = false;
    for (let i = 0; i < 60; i++) { if (i === 10) { holeOk = rd(q) === 0x26E; q += 2; } const m = rd(q); if (m === list[i]) nSame++; if (rd(SHOP + i * 8) !== m) shopOk = false; q += 2; }
    ok(outCode && nSame < 20 && shopOk && holeOk, 'ORAS: Lehrer-Attacken gemischt, Lücke bleibt, Shop-Tabelle gleich (' + nSame + ' unverändert)');
  }
  console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('Ausnahme', e); process.exit(1); });
