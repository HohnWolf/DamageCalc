// Erzeugt data/pk_enc.js: Begegnungstabellen für die Legalitätsprüfung (Gen 3–7) nach PKHeX (GPLv3, Tag 26.10.18).
//   wild:  Spiel-ID -> { Fundort: [Art, Min, Max, ...] }   (Wildgebiete aus den .pkl-Dateien)
//   stat:  Spiel-ID -> [[Art, Fundort, MinLv, MaxLv, EiOrt, Flags], ...]  (Geschenke, Legendäre, Tausche, aus dem C#-Quelltext)
//   anc:   Art -> [Vorentwicklungen]  (aus @pkmn/sim)
// Aufruf: node tools/build_enc.mjs <Pfad zum PKHeX-Repo>
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const root = process.argv[2];
if (!root) { console.error('Pfad zum PKHeX-Repo fehlt'); process.exit(1); }
const core = path.join(root, 'PKHeX.Core');

// ---------- Wildgebiete ----------
const VID = { s: 1, r: 2, e: 3, fr: 4, lg: 5, hg: 7, ss: 8, d: 10, p: 11, pt: 12, w: 20, b: 21, w2: 22, b2: 23, x: 24, y: 25, as: 26, or: 27, sn: 30, mn: 31, us: 32, um: 33 };
const WILD = {
  3: { dir: 'Gen3', files: ['s', 'r', 'e', 'fr', 'lg'], hdr: 4, size: 10, loc16: false },
  4: { dir: 'Gen4', files: ['d', 'p', 'pt', 'hg', 'ss'], hdr: 6, size: 10, loc16: false },
  5: { dir: 'Gen5', files: ['b', 'w', 'b2', 'w2'], hdr: 4, size: 4, loc16: true },
  6: { dir: 'Gen6', files: ['x', 'y', 'as', 'or'], hdr: 4, size: 4, loc16: true },
  7: { dir: 'Gen7', files: ['sn', 'mn', 'us', 'um'], hdr: 4, size: 4, loc16: true },
};
const wild = {};
for (const g in WILD) {
  const c = WILD[g];
  for (const f of c.files) {
    const buf = fs.readFileSync(path.join(core, 'Resources/legality/wild', c.dir, `encounter_${f}.pkl`));
    const n = buf.readUInt16LE(2), areas = {};
    for (let i = 0; i < n; i++) {
      const st = buf.readUInt32LE(4 + i * 4), en = buf.readUInt32LE(8 + i * 4), a = buf.subarray(st, en);
      const loc = c.loc16 ? a.readUInt16LE(0) : a[0];
      const seen = (areas[loc] = areas[loc] || new Set());
      for (let o = c.hdr; o + c.size <= a.length; o += c.size) {
        let sp = a.readUInt16LE(o), min, max;
        if (g >= 5) { sp &= 0x3FF; min = a[o + 2]; max = a[o + 3]; } else { min = a[o + 4]; max = a[o + 5]; }
        if (sp) seen.add(sp + ',' + min + ',' + max);
      }
    }
    const out = {};
    for (const loc in areas) out[loc] = [...areas[loc]].flatMap(s => s.split(',').map(Number));
    wild[VID[f]] = out;
  }
}

// ---------- Feste Begegnungen (Quelltext) ----------
const GV = { S: [1], R: [2], E: [3], FR: [4], LG: [5], RS: [1, 2], RSE: [1, 2, 3], FRLG: [4, 5], EFL: [3, 4, 5],
  D: [10], P: [11], Pt: [12], HG: [7], SS: [8], DP: [10, 11], DPPt: [10, 11, 12], HGSS: [7, 8],
  W: [20], B: [21], W2: [22], B2: [23], BW: [20, 21], B2W2: [22, 23],
  X: [24], Y: [25], AS: [26], OR: [27], XY: [24, 25], ORAS: [26, 27],
  SN: [30], MN: [31], US: [32], UM: [33], SM: [30, 31], USUM: [32, 33] };
const stat = {};
function add(vers, sp, loc, lmin, lmax, egg, fl) {
  for (const v of vers) (stat[v] = stat[v] || []).push([sp, loc, lmin, lmax, egg, fl]);
}
const num = (s, k) => { const m = new RegExp('\\b' + k + '\\s*=\\s*(\\d+)').exec(s); return m ? +m[1] : undefined; };
for (const g of [3, 4, 5, 6, 7]) {
  const dir = path.join(core, 'Legality/Encounters/Data/Gen' + g);
  for (const f of fs.readdirSync(dir)) {
    if (/Shadow|Teams|Colo|XD|WC3|DR/.test(f)) continue; // Colosseum/XD, Traumwelt und Wondercards: eigene Tabellen
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '');
    for (const raw of src.split(/\r?\n/)) {
      const line = raw.replace(/\/\/.*$/, '');
      const m = /^\s*new\(([^)]*)\)\s*(?:\{([^}]*)\})?\s*,?\s*$/.exec(line);
      if (!m) continue;
      const args = m[1].split(',').map(s => s.trim()), body = m[2] || '';
      let vers = null, sp, lv, loc, lmin, lmax, egg = num(body, 'EggLocation') || 0, fl = 0;
      for (const a of args) if (GV[a]) vers = GV[a];
      sp = num(body, 'Species'); lv = num(body, 'Level'); loc = num(body, 'Location');
      lmin = num(body, 'LevelMin') || lv; lmax = num(body, 'LevelMax') || lv;
      if (/IsRoaming\s*=\s*true/.test(body)) fl |= 1;
      if (/FatefulEncounter\s*=\s*true/.test(body)) fl |= 2;
      if (/Shiny\s*=\s*Shiny\.Always/.test(body)) fl |= 4;
      if (args[0] === 'TradeNames' || /^TradeOT/.test(args[0])) { // Tausch: Gen 3/4 Species/Level stehen als Argumente 5/6
        const pos = args.slice(1).map(a => a.replace(/^0x/, '')).filter(a => /^\d+$/.test(a));
        if (sp === undefined && /^(3|4)$/.test(String(g)) && args.length >= 6) { sp = +args[4]; lmin = lmax = +args[5]; }
        if (loc === undefined) loc = g === 3 ? 254 : g === 4 ? 2001 : g === 5 ? 30002 : 30001;
        if (!vers) continue;
      } else if (/^\d+$/.test(args[0]) && args.length >= 3 && GV[args[2]]) { // Gen 3 statisch: (Art, Level, Version)
        sp = +args[0]; lmin = lmax = +args[1]; vers = GV[args[2]];
        if (sp === undefined) continue;
      } else if (/^\d+$/.test(args[0]) && args.length >= 4 && g === 4) { // Gen 4 Ranch: (PID, Art, LvMin, LvMax)
        sp = +args[1]; lmin = +args[2]; lmax = +args[3]; vers = vers || [10, 11, 12];
      } else if (/^\d+$/.test(args[0])) continue; // Traumwelt-Geschenk u. ä.: ohne Fundort
      if (!vers || sp === undefined || lmin === undefined) continue;
      if (loc === undefined && !egg) continue;
      add(vers, sp, loc === undefined ? 0 : loc, lmin, lmax || lmin, egg, fl);
    }
  }
}

// ---------- Vorentwicklungen ----------
const { Dex } = require('@pkmn/sim');
const anc = {};
for (const sp of Dex.species.all()) {
  if (!(sp.num >= 1 && sp.num <= 807) || sp.forme || anc[sp.num]) continue;
  const l = []; let cur = sp, guard = 0;
  while (cur.prevo && guard++ < 4) { cur = Dex.species.get(cur.prevo); l.push(cur.num); }
  if (l.length) anc[sp.num] = l;
}

const js = '// Begegnungstabellen (Wildgebiete, feste Begegnungen, Vorentwicklungen) für js/legality.js. Erzeugt mit tools/build_enc.mjs aus PKHeX (GPLv3) und @pkmn/sim.\n' +
  'window.PKENC=' + JSON.stringify({ wild, stat, anc }) + ';\n';
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../data/pk_enc.js'), js);
console.log('pk_enc.js', (js.length / 1024).toFixed(0), 'KB;', Object.keys(wild).length, 'Spiele;', Object.values(stat).reduce((a, b) => a + b.length, 0), 'feste Begegnungen');
