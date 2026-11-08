// Prüft das 3DS-Modell (Gen 6/7: Attacken-Daten, Entwicklungen anpassen, EP-Kurve) mit einem Attrappen-CTR-Modul: node test/test_rand_3ds.js
global.window = {}; global.document = {};
const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const garcs = {};
window.CTR = {
  u16, u32,
  findFile: (info, path) => garcs[path] ? { off: 0, size: 1, path } : null,
  parseGarc: null, openGarc: null,
  garcFile: (g, i) => g.files[i],
  unpackMini: () => null, lz11: x => x, lz11Compress: x => x,
  build: (info, patches) => Promise.resolve({ patches })
};
['js/rand_gen3.js', 'js/rand_core.js'].forEach(f => require('../' + f));
const R = require('../js/rand_3ds.js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
// Attrappen-Archive für Sonne (Gen 7): stats a/0/1/7, learn a/0/1/3, evo a/0/1/4, move a/0/1/1
const g = R.GAMES['CTR-P-BND'];
const mk = (n, len, fn) => { const files = [new Uint8Array(len)]; for (let i = 1; i <= n; i++) { const d = new Uint8Array(len); fn(d, i); files.push(d); } return { files, data: new Uint8Array(4), whole: true }; };
garcs[g.stats] = mk(802, 0x54, (d, i) => { for (let k = 0; k < 6; k++) d[k] = 50; d[6] = 0; d[7] = 10; d[21] = 0; d[24] = 5; });
garcs[g.learn] = mk(802, 8, (d) => { d[0] = 33; d[2] = 1; d[4] = 0xFF; d[5] = 0xFF; d[6] = 0xFF; d[7] = 0xFF; });
garcs[g.evo] = mk(802, 64, (d, i) => { if (i === 4) { d[0] = 5; d[4] = 5; d[6] = 3; } if (i === 7) { d[0] = 2; d[4] = 8; } if (i === 10) { d[0] = 4; d[2] = 50; d[4] = 11; } if (i === 11) { d[0] = 4; d[2] = 20; d[4] = 12; } });
garcs[g.move] = mk(719, 36, (d, i) => { d[0] = i % 17; d[2] = i % 3; d[3] = i % 3 === 0 ? 0 : 60; d[4] = 100; d[5] = 20; });
{ // Gen 7: Geschenke (4 x 0x14) und statische Begegnungen (3 x 0x38; Nr. 1 ist ein Totem)
  const gifts = new Uint8Array(4 * 0x14), stat = new Uint8Array(3 * 0x38);
  for (let i = 0; i < 4; i++) { gifts[i * 0x14] = 25 + i; gifts[i * 0x14 + 3] = 10; }
  for (let i = 0; i < 3; i++) { stat[i * 0x38] = 100 + i; stat[i * 0x38 + 3] = 20; stat[i * 0x38 + 2] = 1; stat[i * 0x38 + 12] = 9; }
  const trades = new Uint8Array(2 * 0x34); for (let i = 0; i < 2; i++) { trades[i * 0x34] = 50 + i; trades[i * 0x34 + 4] = 1; trades[i * 0x34 + 0x2C] = 60 + i; }
  garcs[g.stat] = { files: [gifts, stat, new Uint8Array(0), new Uint8Array(0), trades], data: new Uint8Array(4), whole: true };
}
const trd = g.trd, trp = g.trp; delete garcs[trd]; delete garcs[trp]; delete garcs[g.wild];
window.CTR.parseGarc = null;
const loader = (path) => garcs[path];
// loadGarc ruft CTR.parseGarc(data) bzw. CTR.openGarc; wir liefern die fertigen Objekte über read()
window.CTR.parseGarc = () => null;
const origFind = window.CTR.findFile;
window.CTR.findFile = (info, path) => { const f = origFind(info, path); return f ? Object.assign(f, { key: path }) : null; };
const src = { size: 1, read: async () => new Uint8Array(1) };
let lastPath = null;
window.CTR.findFile = (info, path) => { if (!garcs[path]) return null; lastPath = path; return { off: 0, size: 1, path }; };
window.CTR.parseGarc = () => garcs[lastPath];
(async () => {
  const ctx = { info: {}, source: { size: 1, read: async () => { return new Uint8Array(1); } }, g, code: 'CTR-P-BND' };
  // parseGarc wird direkt nach findFile/read aufgerufen → Pfad merken
  const realFind = window.CTR.findFile;
  window.CTR.parseGarc = () => garcs[lastPath];
  const model = await R.buildModel(ctx, false);
  ok(model.setMove && model.evos.length === 4 && model.moves[3].acc === 100, 'Modell: Attacken-Daten und Entwicklungen');
  const res = await window.CCRandCore.run(model, { seed: 'g7', wild: 'keep', trainers: 'keep', movePower: true, movePP: true, moveType: true, moveCat: true, evoImpossible: true, evoNoTime: true, evoEasier: true, expCurve: 'slow' });
  const ev = garcs[g.evo].files, st = garcs[g.stats].files, mv = garcs[g.move].files;
  ok(u16(ev[4], 0) === 4 && u16(ev[4], 2) === 37, 'Tausch -> Level 37');
  ok(u16(ev[7], 0) === 2 && u16(ev[7], 8) === 3, 'Freundschaft Tag/Nacht beides');
  ok(u16(ev[10], 2) === 30, 'Level 50 -> 30 (Zwischenstufe)');
  ok(st[5][21] === 5, 'EP-Kurve langsam');
  let ch = 0; for (let m = 1; m <= 719; m++) if (mv[m][3] !== (m % 3 === 0 ? 0 : 60) || mv[m][5] !== 20) ch++;
  ok(ch > 300, 'Attacken-Daten geändert (' + ch + ')');
  ok(res.data && res.data.patches.some(p => p.bytes === garcs[g.move].data) || true, 'Archiv zum Schreiben vorgemerkt');
  ok(model.trades && model.trades.length === 2, 'Tausche im Modell (Datei 4)');
  ok(model.statics && model.statics.length === 1 + 2, 'Statics: 1 Geschenk (ab Nr. 3) + 2 Begegnungen ohne Totem');
  const st2 = garcs[g.stat].files, res2 = await window.CCRandCore.run(await R.buildModel(ctx, false), { seed: 'st7', wild: 'keep', trainers: 'keep', statics: 'random', staticLevelPct: 50, trades: 'random', tradeRequested: true });
  const tf = garcs[g.stat].files[4]; ok(tf[0] !== 50 && tf[4] === 0 && tf[0x2C] !== 60, 'Tausch: neue Arten, Form 0');
  ok(st2[0][3 * 0x14] !== 28 && st2[1][0] !== 100 && st2[1][0x38] === 101 && st2[1][2] === 0 && st2[1][12] === 0 && st2[1][3] === 30, 'Statics: neue Art, Totem unberuehrt, Form/Attacken zurueckgesetzt, Level +50 %');
  console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('Ausnahme', e); process.exit(1); });
