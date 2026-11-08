// Prüft BLZ-Kompression/-Entpackung und den Aufbau eines neuen ExeFS: node test/test_ctr_blz.js
global.window = {}; global.document = {};
const CTR = require('../js/ctr.js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FEHLER:', m); } else console.log('ok:', m); };
// "Code"-ähnliche Daten: wiederkehrende Muster, Tabellen, Nullbereiche, etwas Rauschen
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
const n = 400000, raw = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  const r = Math.floor(i / 4096) % 5;
  raw[i] = r === 0 ? 0 : r === 1 ? (i * 7) & 255 : r === 2 ? Math.floor(rnd() * 256) : r === 3 ? [0xE5, 0x9F, 0x10, 0x00][i & 3] : (i >> 3) & 255;
}
const t0 = Date.now(), enc = CTR.blzEncode(raw), t1 = Date.now();
ok(enc && enc.length < raw.length, 'Komprimiert: ' + raw.length + ' -> ' + (enc && enc.length) + ' Byte in ' + (t1 - t0) + ' ms');
const dec = CTR.blzDecode(enc);
ok(dec.length === raw.length && Buffer.compare(Buffer.from(dec), Buffer.from(raw)) === 0, 'Entpacken ergibt die Originaldaten');
// kleine Änderung, erneut komprimieren: Größe bleibt in der Nähe
const raw2 = raw.slice(); for (let i = 0; i < 200; i++) raw2[50000 + i] = (i * 31) & 255;
const enc2 = CTR.blzEncode(raw2), dec2 = CTR.blzDecode(enc2);
ok(Buffer.compare(Buffer.from(dec2), Buffer.from(raw2)) === 0 && Math.abs(enc2.length - enc.length) < 2000, 'Geänderte Daten: Rundlauf, Größe ' + enc2.length);
// ExeFS aus Attrappen-Quelle bauen
(async () => {
  const exefs = new Uint8Array(0x200 + 0x200 + 0x200); // Kopf, .code (compressed), icon
  const put = (i, name, off, size) => { for (let k = 0; k < name.length; k++) exefs[i * 16 + k] = name.charCodeAt(k); const dv = new DataView(exefs.buffer); dv.setUint32(i * 16 + 8, off, true); dv.setUint32(i * 16 + 12, size, true); };
  const small = new Uint8Array(1000).map((_, i) => i & 15), comp = CTR.blzEncode(small);
  exefs.set(comp, 0x200); put(0, '.code', 0, comp.length); put(1, 'icon', 0x200, 20); exefs.set([1, 2, 3], 0x400);
  const head = new Uint8Array(0x400); head[0x200 + 0x0D] = 1;
  const full = new Uint8Array(0x1000); full.set(head, 0); full.set(exefs, 0x400);
  const source = { size: full.length, read: async (o, l) => full.slice(o, o + l), slice: (a, b) => full.slice(a, b) };
  const info = { source, base: 0, exefsOff: 0x400, exefsSize: 0x600 };
  // Kopf von openNcch ersetzt: hier direkt .code-Flag im Exheader (0x200 + 0xD)
  full[0x200 + 0x0D] = 1;
  const ex = await CTR.readCode(info);
  ok(ex && ex.compressed && Buffer.compare(Buffer.from(ex.code), Buffer.from(small)) === 0, 'readCode: .code gefunden und entpackt');
  const changed = ex.code.slice(); changed[10] = 99;
  const neu = await CTR.buildExefs(info, ex, changed);
  ok(neu && neu.length % 0x200 === 0, 'buildExefs: Länge ausgerichtet (' + (neu && neu.length) + ')');
  const dv = new DataView(neu.buffer, neu.byteOffset), codeSize = dv.getUint32(12, true);
  ok(Buffer.compare(Buffer.from(CTR.blzDecode(neu.slice(0x200, 0x200 + codeSize))), Buffer.from(changed)) === 0, 'buildExefs: neue .code entpackt wieder zur Änderung');
  const hash0 = await CTR.sha256(neu.slice(0x200, 0x200 + codeSize));
  ok(Buffer.compare(Buffer.from(neu.slice(0x200 - 0x20, 0x200)), Buffer.from(hash0)) === 0, 'Hash der ersten Datei steht ganz hinten im Kopf');
  console.log(fails ? fails + ' Fehler' : 'alles ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('Ausnahme', e); process.exit(1); });
