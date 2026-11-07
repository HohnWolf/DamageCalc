// Erzeugt data/pk_gb.js (Gen 1: Dex-Nr. <-> interne ID, Typen, Fangrate) aus PKHeX (kwsch/PKHeX, GPL-3.0).
// Aufruf: node tools/build_pkgb.mjs <PKHeX.Core-Ordner>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const core = process.argv[2];
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(core, 'PKM/Util/Conversion/SpeciesConverter.cs'), 'utf8');
const tab = (n) => { const a = src.indexOf(n + ' => ['); const b = src.indexOf(']', a); return src.slice(src.indexOf('[', a) + 1, b).split(',').map(x => parseInt(x.trim(), 16)); };
const toInt = tab('Table1NationalToInternal'), toNat = tab('Table1InternalToNational');
const rb = fs.readFileSync(path.join(core, 'Resources/byte/personal/personal_rb'));
const types = [null], catchRate = [0];
for (let i = 1; i <= 151; i++) { const o = i * 28; types.push([rb[o + 6], rb[o + 7]]); catchRate.push(rb[o + 8]); }
const out = { toInt: toInt.slice(0, 152), toNat: toNat.slice(0, 256), types, catchRate };
fs.writeFileSync(path.join(root, 'data', 'pk_gb.js'), '// Gen 1/2 Spielstand-Daten (Quelle: PKHeX, GPL-3.0). Erzeugt von tools/build_pkgb.mjs\nwindow.PKGB = ' + JSON.stringify(out) + ';\n');
console.log('ok', toInt.length, toNat.length);
