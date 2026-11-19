// Erzeugt data/pk_personal.js (Basiswerte + Wachstumsrate je Generation, nach Pok√©dex-Nr.) aus PKHeX.Core/Resources/byte/personal
// Aufruf: node tools/build_pkpersonal.mjs <Pfad zu PKHeX.Core/Resources/byte/personal>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = process.argv[2];
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// [Datei, Eintragsgr√∂√üe, Wachstum-Offset, Maximum der Pok√©dex-Nr.]
const SRC = { g3: ['personal_e', 28, 19, 386, 16, 22, 2], g4: ['personal_hgss', 44, 19, 493, 16, 22, 2], g5: ['personal_b2w2', 76, 21, 649, 18, 24, 3], g6: ['personal_ao', 80, 21, 721, 18, 24, 3], g7: ['personal_uu', 84, 21, 807, 18, 24, 3] };
const out = {};
for (const [k, [f, size, gOff, max, genOff, abOff, abN]] of Object.entries(SRC)) {
  const b = fs.readFileSync(path.join(dir, f));
  const t = [null];
  for (let i = 1; i <= max && (i + 1) * size <= b.length; i++) { const o = i * size; const row = [b[o], b[o + 1], b[o + 2], b[o + 3], b[o + 4], b[o + 5], b[o + gOff], b[o + genOff]]; for (let a = 0; a < abN; a++) row.push(b[o + abOff + a]); t.push(row); }
  out[k] = t;
}
// Formen (Gen 4-7): fN[Dex-Nr.] = [Zeile Form 1, Form 2, ...] (Aufbau wie gN), ueber FormCount/FormStatsIndex; nur Arten, deren Formen abweichen
const FORMSRC = { f4: ['personal_hgss', 44, 0x29, 0x2A, 19, 16, 22, 2, 493], f5: ['personal_b2w2', 76, 0x20, 0x1C, 21, 18, 24, 3, 649], f6: ['personal_ao', 80, 0x20, 0x1C, 21, 18, 24, 3, 721], f7: ['personal_uu', 84, 0x20, 0x1C, 21, 18, 24, 3, 807] };
for (const [k, [f, size, fcOff, fiOff, gOff, genOff, abOff, abN, max]] of Object.entries(FORMSRC)) {
  const b = fs.readFileSync(path.join(dir, f)), t = {};
  const row = o => { const r = [b[o], b[o + 1], b[o + 2], b[o + 3], b[o + 4], b[o + 5], b[o + gOff], b[o + genOff]]; for (let a = 0; a < abN; a++) r.push(b[o + abOff + a]); return r; };
  for (let i = 1; i <= max; i++) {
    const o = i * size, fc = b[o + fcOff], fi = b[o + fiOff] | (b[o + fiOff + 1] << 8);
    if (fc < 2 || !fi) continue;
    const base = JSON.stringify(row(o)), list = [];
    for (let n = 1; n < fc; n++) list.push(row((fi + n - 1) * size));
    if (list.some(r => JSON.stringify(r) !== base)) t[i] = list;
  }
  out[k] = t;
}
// Gen 3: Deoxys hat je Spiel andere Werte (RS Normal, FR Angriff, BG Verteidigung, Smaragd Initiative)
out.deoxys3 = {};
for (const [g, f] of Object.entries({ RS: 'personal_rs', FR: 'personal_fr', LG: 'personal_lg', E: 'personal_e' })) { const b = fs.readFileSync(path.join(dir, f)), o = 386 * 28; out.deoxys3[g] = [b[o], b[o + 1], b[o + 2], b[o + 3], b[o + 4], b[o + 5], b[o + 19], b[o + 16], b[o + 22], b[o + 23]]; }
// Generation 1/2: Basiswerte (Spezial = SpA = SpV), Wachstum
{
  const rb = fs.readFileSync(path.join(dir, 'personal_rb')), t = [null];
  for (let i = 1; i <= 151; i++) { const o = i * 28; t.push([rb[o + 1], rb[o + 2], rb[o + 3], rb[o + 4], rb[o + 5], rb[o + 5], rb[o + 19]]); }
  out.g1 = t;
  const gs = fs.readFileSync(path.join(dir, 'personal_gs')), u = [null];
  for (let i = 1; i <= 251; i++) { const o = i * 32; u.push([gs[o + 1], gs[o + 2], gs[o + 3], gs[o + 4], gs[o + 5], gs[o + 6], gs[o + 22]]); }
  out.g2 = u;
}
fs.writeFileSync(path.join(root, 'data', 'pk_personal.js'), '// Basiswerte + Wachstumsrate + Geschlechtsverh‰ltnis + F‰higkeiten [KP, Angr, Vert, Init, SpA, SpV, Wachstum, Geschlecht, F‰higkeit 1, 2, (3)] je Generation (Quelle: PKHeX, GPL-3.0). Erzeugt von tools/build_pkpersonal.mjs\nwindow.PKPERSONAL = ' + JSON.stringify(out) + ';\n');
console.log('ok', Object.keys(out).map(k => k + ':' + out[k].length).join(' '));
