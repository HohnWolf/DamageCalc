// Prüft den Save-Editor-Kern an echten Spielständen: node test/real_save.js <datei>
global.window = {}; global.document = {};
const r = __dirname + '/../';
require(r + 'js/nds.js'); require(r + 'js/gen3.js'); require(r + 'data/pk_personal.js'); require(r + 'js/savedit.js');
const fs = require('fs'), assert = require('assert');
const u8 = new Uint8Array(fs.readFileSync(process.argv[2]));
const sv = window.CCSave.open(u8);
if (!sv) { console.log('nicht erkannt'); process.exit(1); }
console.log(sv.gameNameEn, 'Gen', sv.gen, JSON.stringify(sv.getTrainer()));
const party = sv.getParty(); let n = 0, boxes = 0, bad = 0;
console.log('Team:', party.map(d => d && sv.fmt.get(d, 'species') + ' Lv' + sv.fmt.get(d, 'level') + ' ' + sv.fmt.get(d, 'nick')).join(' | '));
for (let b = 0; b < sv.boxCount; b++) for (let s = 0; s < 30; s++) { const d = sv.getBoxMon(b, s); if (d) boxes++; }
console.log('Box-Pokémon:', boxes);
// Rundlauf: unverändert zurückschreiben muss identische Bytes liefern
const before = new Uint8Array(sv.data);
sv.setParty(party);
for (let b = 0; b < sv.boxCount; b++) for (let s = 0; s < 30; s++) { const d = sv.getBoxMon(b, s); if (d) sv.setBoxMon(b, s, d); }
let diff = 0; for (let i = 0; i < before.length; i++) if (before[i] !== sv.data[i]) diff++;
console.log('Rundlauf-Unterschiede:', diff);
const out = sv.finish(); let d2 = 0; for (let i = 0; i < out.length; i++) if (out[i] !== u8[i]) d2++;
console.log('Unterschiede nach Prüfsummen-Update gegenüber Original:', d2);
