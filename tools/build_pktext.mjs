// Erzeugt data/pk_text.js (Namenslisten für den Save File Editor) aus den Textdateien von PKHeX (kwsch/PKHeX, PKHeX.Core/Resources/text).
// Aufruf: node tools/build_pktext.mjs <Pfad zu PKHeX.Core/Resources/text>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = process.argv[2];
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => { const b = fs.readFileSync(path.join(dir, p)); return (b[0] === 0xFF && b[1] === 0xFE ? b.toString('utf16le') : b.toString('utf8')).replace(/^\uFEFF/, '').replace(/\u0000/g, '').split(/\r?\n/); };
const out = {};
for (const l of ['de', 'en']) {
  const o = out[l] = {};
  o.species = rd(`other/${l}/text_Species_${l}.txt`);
  o.moves = rd(`other/${l}/text_Moves_${l}.txt`);
  o.abilities = rd(`other/${l}/text_Abilities_${l}.txt`);
  o.natures = rd(`other/${l}/text_Natures_${l}.txt`).filter(Boolean);
  o.types = rd(`other/${l}/text_Types_${l}.txt`).filter(Boolean);
  o.items = rd(`items/text_Items_${l}.txt`).slice(0, 1000);
  o.items1 = rd(`items/gen1/text_ItemsG1_${l}.txt`);
  o.items2 = rd(`items/gen2/text_ItemsG2_${l}.txt`);
  o.items3 = rd(`items/gen3/text_ItemsG3_${l}.txt`);
}
fs.writeFileSync(path.join(root, 'data', 'pk_text.js'), '// Namenslisten (Quelle: PKHeX, GPL-3.0). Erzeugt von tools/build_pktext.mjs\nwindow.PKTEXT = ' + JSON.stringify(out) + ';\n');
console.log('ok', fs.statSync(path.join(root, 'data', 'pk_text.js')).size);
