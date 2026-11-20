// Erzeugt initialisierte, leere Gen-3- und Gen-4-Spielstände (Sektor-/Blockaufbau wie im Spiel) für tools/diff_save_pkhex.js:
// node tools/make_gen34_saves.js <ordner>   → RS.sav, E.sav, FR.sav, DP.sav, Pt.sav, HGSS.sav (PKHeX füllt sie mit "fillinto")
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '.';
function w16(u, o, v) { u[o] = v & 255; u[o + 1] = (v >> 8) & 255; }
function w32(u, o, v) { u[o] = v & 255; u[o + 1] = (v >> 8) & 255; u[o + 2] = (v >> 16) & 255; u[o + 3] = (v >>> 24) & 255; }
function gen3(kind) {
  const u = new Uint8Array(0x20000);
  [0, 0xE000].forEach(function (base, slot) {
    for (let s = 0; s < 14; s++) {
      const o = base + s * 0x1000; w16(u, o + 0xFF4, s); w32(u, o + 0xFF8, 0x08012025); w32(u, o + 0xFFC, 10 + slot);
    }
    if (kind === 'FR') w32(u, base + 0xAC, 1);
    if (kind === 'E') { w32(u, base + 0xAC, 0x1234ABCD); u[base + 0x900] = 1; }
  });
  return u;
}
function gen4(general, storageStart, storage) {
  const u = new Uint8Array(0x80000);
  [0, 0x40000].forEach(function (base, i) {
    let e = base + general; w32(u, e - 0xC, general); w32(u, e - 0x8, 0x20060623); w32(u, e - 0x4, 0); w32(u, e - 0x10, i + 1);
    e = base + storageStart + storage; w32(u, e - 0xC, storage); w32(u, e - 0x8, 0x20060623); w32(u, e - 0x10, i + 1);
  });
  return u;
}
const out = { 'RS.sav': gen3('RS'), 'E.sav': gen3('E'), 'FR.sav': gen3('FR'),
  'DP.sav': gen4(0xC100, 0xC100, 0x121E0), 'Pt.sav': gen4(0xCF2C, 0xCF2C, 0x121E4), 'HGSS.sav': gen4(0xF628, 0xF700, 0x12310) };
Object.keys(out).forEach(function (k) { fs.writeFileSync(path.join(dir, k), out[k]); console.log(k, out[k].length); });
