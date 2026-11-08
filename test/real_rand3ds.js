// Prüft den 3DS-Randomizer an echten, entschlüsselten Dateien: node test/real_rand3ds.js <datei.cxi>
const fs = require('fs'); global.window = {}; global.document = {};
global.Blob = function (parts) { this.parts = parts; };
['js/rand_gen3.js', 'js/ctr.js', 'js/rand_core.js', 'data/pk_text.js', 'data/natdex.js'].forEach(f => require('../' + f));
const R = require('../js/rand_3ds.js'), CTR = window.CTR;
(async () => {
  const fh = await fs.promises.open(process.argv[2], 'r'), size = (await fh.stat()).size;
  const source = { size, read: async (o, l) => { const b = Buffer.alloc(l); await fh.read(b, 0, l, o); return new Uint8Array(b); }, slice: (a, b) => ({ fake: true, a, b }) };
  const ctx = await R.open(source);
  console.log('Spiel', ctx.g.nameEn, ctx.code);
  const info = await R.scan(ctx); console.log('Scan', JSON.stringify(info));
  const t0 = Date.now();
  const res = await R.run(ctx, { seed: 'test', wild: 'random', trainers: 'random', evo: 'random', stats: 'random', types: 'random', abilities: 'random', moves: 'random', noLegend: false });
  console.log('Lauf', (Date.now() - t0) + ' ms', res.log.split('\n').length + ' Protokollzeilen');
  console.log(res.log.split('\n').slice(0, 12).join('\n'));
  console.log(res.log.split('\n').filter(l => l.startsWith('Hinweis')).join('\n'));
  // virtuelle Datei aus den Teilen
  const parts = res.data.parts; let pos = 0; const idx = [];
  for (const p of parts) { const len = p.fake ? p.b - p.a : p.length; idx.push({ p, s: pos, e: pos + len }); pos += len; }
  console.log('Größe', pos, 'Original', size, pos === size ? 'GLEICH' : 'ABWEICHEND', parts.length + ' Teile');
  const vread = async (off, len) => {
    const out = new Uint8Array(len);
    for (const x of idx) {
      const s = Math.max(off, x.s), e = Math.min(off + len, x.e); if (e <= s) continue;
      const chunk = x.p.fake ? await source.read(x.p.a + (s - x.s), e - s) : x.p.subarray(s - x.s, e - x.s);
      out.set(chunk, s - off);
    }
    return out;
  };
  const vsrc = { size: pos, read: vread, slice: source.slice };
  const info2 = await CTR.openNcch(vsrc), iv = info2.ivfc;
  // Hashbaum prüfen: alle geänderten Blöcke
  let bad = 0, checked = 0;
  for (const x of idx) {
    if (x.p.fake) continue;
    const a = Math.floor((x.s - iv.l3) / 4096), z = Math.floor((x.e - 1 - iv.l3) / 4096);
    if (x.s < iv.l3 || x.e > iv.l3 + iv.levels[2].size) continue;
    for (let b = a; b <= z; b++) {
      const blk = new Uint8Array(4096); const len = Math.min(4096, iv.l3 + iv.levels[2].size - (iv.l3 + b * 4096)); blk.set(await vread(iv.l3 + b * 4096, len));
      const h = await vread(iv.l2 + b * 32, 32), c = await CTR.sha256(blk); checked++;
      if (!Buffer.from(h).equals(Buffer.from(c))) bad++;
    }
  }
  console.log('Hash L3->L2 geprüft', checked, 'falsch', bad);
  // Kopf-Hash
  const head = await vread(iv.rf, info2.romfsHashSize), hh = await vread(0x1E0, 32), hc = await CTR.sha256(head);
  console.log('Superblock-Hash', Buffer.from(hh).equals(Buffer.from(hc)) ? 'OK' : 'FALSCH');
  // neu einlesen und Modell prüfen
  const ctx2 = { info: info2, source: vsrc, g: ctx.g, code: ctx.code };
  const m2 = await R.buildModel(ctx2, true), m1 = await R.buildModel(ctx, true);
  console.log('Pikachu Basiswerte vorher/nachher', m1.species[25].bs.join('/'), m2.species[25].bs.join('/'), '| Wild-Plätze', m1.wild.length, m2.wild.length);
  let diff = 0; for (let i = 0; i < m2.wild.length; i++) if (m1.wild[i] && m1.wild[i].get() !== m2.wild[i].get()) diff++;
  console.log('geänderte Wild-Plätze', diff, 'von', m2.wild.length);
  await fh.close();
})().catch(e => { console.log('FEHLER', e); process.exit(1); });
