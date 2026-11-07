// Prüft den 3DS-Leser an echten, entschlüsselten Dateien: node test/real_ctr.js <datei.cxi>
const fs = require('fs'); global.window = {};
const CTR = require('../js/ctr.js');
(async () => {
  const fh = await fs.promises.open(process.argv[2], 'r'), size = (await fh.stat()).size;
  const source = { size, read: async (o, l) => { const b = Buffer.alloc(l); await fh.read(b, 0, l, o); return new Uint8Array(b); } };
  const info = await CTR.openNcch(source);
  console.log('Produkt', info.product, 'romfs', info.romfsOff.toString(16), info.romfsSize.toString(16), 'ivfc', JSON.stringify(info.ivfc.levels), 'master', info.ivfc.master);
  console.log('l3', info.ivfc.l3.toString(16), 'l1', info.ivfc.l1.toString(16), 'l2', info.ivfc.l2.toString(16));
  const iv = info.ivfc;
  async function chk(name, dataOff, hashOff, n) {
    let good = 0;
    for (let b = 0; b < n; b++) {
      const blk = await source.read(dataOff + b * 0x1000, 0x1000), h = await source.read(hashOff + b * 32, 32), c = await CTR.sha256(blk);
      if (Buffer.from(h).equals(Buffer.from(c))) good++;
    }
    console.log(name, good + '/' + n);
  }
  await chk('L3->L2', iv.l3, iv.l2, 6);
  await chk('L2->L1', iv.l2, iv.l1, 2);
  await chk('L1->Master', iv.l1, iv.rf + 0x60, 1);
  for (const p of ['a/0/1/7', 'a/1/9/5', 'a/0/1/3', 'a/0/3/6', 'a/1/0/5', 'a/0/8/2', 'a/0/8/3', 'a/2/1/8']) {
    const f = CTR.findFile(info, p); console.log(p, f ? f.size : null);
  }
  await fh.close();
})();
