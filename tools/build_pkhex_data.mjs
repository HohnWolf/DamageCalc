// Erzeugt data/pkhex_data.js (Item-Taschen, Fundorte, Bänder, Event-Flag-Namen) aus dem Quellcode und den Textdateien von PKHeX.
// Aufruf: node tools/build_pkhex_data.mjs <Pfad zum PKHeX-Repo>   (PKHeX ist GPLv3: kwsch/PKHeX, getestet mit Tag 26.10.18)
import fs from 'fs';
import path from 'path';

const root = process.argv[2];
if (!root) { console.error('Pfad zum PKHeX-Repo fehlt'); process.exit(1); }
const core = path.join(root, 'PKHeX.Core');
const read = f => fs.readFileSync(path.join(core, f), 'utf8').replace(/^﻿/, '');
const lines = f => read(f).split(/\r?\n/);

// ---------- Item-Listen ----------
const files = {}; // Klassenname -> { file, base, lists }
function numsOf(expr, scope) {
  // Zahlen, "..Name" und "Name[..N]" in einem Listen-Ausdruck
  const out = [];
  let depth = 0, cur = '';
  const parts = [];
  for (const ch of expr) { if (ch === '[') depth++; if (ch === ']') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  for (let p of parts) {
    p = p.trim(); if (!p) continue;
    if (/^\d+$/.test(p)) { out.push(+p); continue; }
    let m = /^\.\.\s*(\w+)(?:\[\.\.(\^?)(\d+)\])?$/.exec(p);
    if (!m) throw new Error('Ausdruck nicht lesbar: ' + p);
    let l = scope(m[1]);
    if (m[3]) l = m[2] ? l.slice(0, l.length - +m[3]) : l.slice(0, +m[3]);
    out.push(...l);
  }
  return out;
}
for (const f of fs.readdirSync(path.join(core, 'Items')).filter(x => /^ItemStorage\d/.test(x))) {
  const src = read('Items/' + f).replace(/\/\/.*$/gm, '');
  const cm = /class\s+(\w+)\s*(?::\s*(\w+))?/.exec(src);
  const bodies = {};
  for (const m of src.matchAll(/(?:ReadOnlySpan<ushort>|ushort\[\])\s+(\w+)\s*(?:=>|=)\s*\[([\s\S]*?)\];/g)) bodies[m[1]] = m[2];
  files[cm[1]] = { file: f, base: cm[2], bodies, cache: {}, statics: [...src.matchAll(/using static PKHeX\.Core\.(\w+);/g)].map(m => m[1]) };
}
function listOf(cls, name) {
  const c = files[cls];
  if (!c) throw new Error('Klasse fehlt: ' + cls);
  if (c.cache[name]) return c.cache[name];
  if (c.bodies[name] !== undefined) return c.cache[name] = numsOf(c.bodies[name], n => listOf(cls, n));
  if (c.base && files[c.base]) { try { return listOf(c.base, name); } catch (e) { /* weiter */ } }
  for (const st of c.statics) { if (files[st] && st !== cls) { try { return listOf(st, name); } catch (e) { /* weiter */ } } }
  throw new Error('Liste fehlt: ' + cls + '.' + name);
}
function getItemsMap(cls) {
  // InventoryType.X => Name (switch in GetItems), mit Vererbung
  const out = {};
  let c = cls;
  while (c && files[c]) {
    const src = read('Items/' + files[c].file).replace(/\/\/.*$/gm, '');
    for (const m of src.matchAll(/InventoryType\.(\w+)\s*=>\s*(\w+)\s*,/g)) if (!(m[1] in out)) out[m[1]] = [c, m[2]];
    c = files[c].base;
  }
  return out;
}
function bag(bagFile, forceStorage) {
  const src = read('Items/Bags/' + bagFile);
  const storage = forceStorage || /Info\s*=>\s*(\w+)\.Instance/.exec(src)?.[1];
  const base = (/BaseOffset\s*=\s*(0x[0-9A-Fa-f]+)/.exec(src) || [])[1];
  const map = getItemsMap(storage);
  const out = [];
  for (const m of src.matchAll(/new\((0x[0-9A-Fa-f]+),\s*(?:(\d+),\s*)?(\d+),\s*info,\s*(\w+)\)/g)) {
    const type = m[4], ref = map[type];
    if (!ref) throw new Error('Typ ohne Liste: ' + type + ' in ' + bagFile);
    const ids = listOf(ref[0], ref[1]);
    out.push({ k: type, off: parseInt(m[1], 16), size: m[2] ? +m[2] : ids.length, max: +m[3], ids });
  }
  return { base: base ? parseInt(base, 16) : 0, pouches: out };
}
const bags = {
  DP: bag('PlayerBag4DP.cs'), Pt: bag('PlayerBag4Pt.cs'), HGSS: bag('PlayerBag4HGSS.cs'),
  BW: bag('PlayerBag5BW.cs'), B2W2: bag('PlayerBag5B2W2.cs'),
  XY: bag('PlayerBag6XY.cs'), AO: bag('PlayerBag6AO.cs'),
  SM: bag('PlayerBag7SM.cs'), USUM: bag('PlayerBag7USUM.cs'),
  RS: bag('PlayerBag3RS.cs'), E: bag('PlayerBag3E.cs'), FRLG: bag('PlayerBag3FRLG.cs', 'ItemStorage3FRLG')
};
// Gen 3: die PC-Liste ist ein privates Feld
function g3(cls) { return listOf(cls, 'General'); }
for (const k of ['RS', 'E', 'FRLG']) {
  const p = bags[k].pouches.find(x => x.k === 'PCItems');
  if (p && !p.ids.length) throw new Error('PC leer ' + k);
}
// ---------- Fundorte ----------
function txt(f) { return lines(f).map(s => s.trim()); }
function locs(dir, ident, banks, lang) {
  const out = {};
  for (const b of banks) {
    const t = txt('Resources/text/locations/' + dir + '/text_' + ident + '_' + String(b).padStart(5, '0') + '_' + lang + '.txt');
    t.forEach((n, i) => { if (n) out[b + i] = n; });
  }
  return out;
}
const L = (dir, ident, banks) => ({ de: locs(dir, ident, banks, 'de'), en: locs(dir, ident, banks, 'en') });
const locations = {
  gen2: L('gen2', 'gsc', [0]),
  gen3: L('gen3', 'rsefrlg', [0]),
  gen4: L('gen4', 'hgss', [0, 2000, 3000]),
  gen5: L('gen5', 'bw2', [0, 30000, 40000, 60000]),
  gen6: L('gen6', 'xy', [0, 30000, 40000, 60000]),
  gen7: L('gen7', 'sm', [0, 30000, 40000, 60000])
};

// ---------- Bänder ----------
function ribbonNames(lang) {
  const o = {};
  txt('Resources/text/other/' + lang + '/text_Ribbons_' + lang + '.txt').forEach(l => { const [k, v] = l.split('\t'); if (k && v) o[k] = v; });
  return o;
}
function ribbonsOf(file) {
  const src = read('PKM/' + file);
  const bytes = {};
  for (const m of src.matchAll(/private (?:byte|ushort|uint) (RIB\w+)\s*\{\s*get => (?:Read\w+\()?Data\[(0x[0-9A-Fa-f]+)(?:\.\.)?\]/g)) bytes[m[1]] = parseInt(m[2], 16);
  const out = [];
  for (const m of src.matchAll(/bool (Ribbon\w+)\s*\{\s*get => \((RIB\w+) & \(1 << (\d+)\)\)/g)) {
    if (bytes[m[2]] === undefined) continue;
    const bit = +m[3];
    out.push([m[1], bytes[m[2]] + (bit >> 3), bit & 7]);
  }
  return out;
}
const ribbons = { names: { de: ribbonNames('de'), en: ribbonNames('en') }, gen3: ribbonsOf('PK3.cs'), gen4: ribbonsOf('PK4.cs'), gen5: ribbonsOf('PK5.cs'), gen6: ribbonsOf('PK6.cs'), gen7: ribbonsOf('PK7.cs') };

// ---------- Event-Flag-Namen ----------
function flagFile(f) {
  const out = [];
  txt(f).forEach(l => { const p = l.split('\t'); if (p.length >= 3 && /^\d+$/.test(p[0])) out.push([+p[0], p[1], p[2], p[3] || '']); });
  return out;
}
const flags = {};
for (const [k, d, id] of [['GS', 'gen2', 'gs'], ['C', 'gen2', 'c'], ['RS', 'gen3', 'rs'], ['E', 'gen3', 'e'], ['FRLG', 'gen3', 'frlg'], ['DP', 'gen4', 'dp'], ['Pt', 'gen4', 'pt'], ['HGSS', 'gen4', 'hgss'],
  ['BW', 'gen5', 'bw'], ['B2W2', 'gen5', 'b2w2'], ['XY', 'gen6', 'xy'], ['AO', 'gen6', 'oras'], ['SM', 'gen7', 'sm'], ['USUM', 'gen7', 'usum']]) {
  flags[k] = { flags: flagFile('Resources/text/script/' + d + '/flags_' + id + '_en.txt'), work: flagFile('Resources/text/script/' + d + '/const_' + id + '_en.txt') };
}

// ---------- Gen 1/2 (Taschen mit Byte-Zählern) ----------
const gb = {
  gen1: { pouches: [{ k: 'Items', off: 0x25C9, size: 20, max: 99, ids: listOf('ItemStorage1', 'General') }, { k: 'PCItems', off: 0x27E6, size: 50, max: 99, ids: listOf('ItemStorage1', 'General') }] }
};
{
  const gl = n => listOf('ItemStorage2', n);
  const pcC = [...gl('General'), ...gl('Balls'), ...gl('Machine'), ...gl('KeyCrystal')];
  const mkLists = crystal => ({ Items: gl('General'), KeyItems: crystal ? gl('KeyCrystal') : gl('KeyGS'), TMHMs: gl('Machine'), Balls: gl('Balls'), PCItems: crystal ? pcC : pcC.slice(0, pcC.length - 4) });
  const listsGS = mkLists(false), listsC = mkLists(true);
  const sizes = { TMHMs: 57, Items: 20, KeyItems: 26, Balls: 12, PCItems: 50 };
  const mk = (offs, lst) => ['TMHMs', 'Items', 'KeyItems', 'Balls', 'PCItems'].map((t, i) => ({ k: t, off: offs[i], size: sizes[t], max: 99, ids: lst[t] }));
  gb.gen2 = { GS: { pouches: mk([0x23E6, 0x241F, 0x2449, 0x2464, 0x247E], listsGS) }, C: { pouches: mk([0x23E7, 0x2420, 0x244A, 0x2465, 0x247F], listsC) } };
}

// ---------- Attacken-AP (Basiswerte pro Generation) ----------
const pp = {};
for (let g = 1; g <= 7; g++) {
  const src = read('Moves/MoveInfo' + g + '.cs').replace(/\/\/.*$/gm, '');
  const m = /ReadOnlySpan<byte>\s+PP\s*=>\s*\[([\s\S]*?)\];/.exec(src);
  pp['gen' + g] = m[1].split(',').map(x => x.trim()).filter(Boolean).map(Number);
}

const data = { bags, gb, locations, ribbons, flags, pp };
fs.writeFileSync(path.join(process.cwd(), 'data', 'pkhex_data.js'),
  '// Daten aus PKHeX (kwsch/PKHeX, GPLv3): Item-Taschen, Fundorte, Bänder, Event-Flag-Namen. Erzeugt von tools/build_pkhex_data.mjs\nwindow.PKHEX = ' + JSON.stringify(data) + ';\n');
console.log('ok', Object.keys(bags).map(k => k + ':' + bags[k].pouches.map(p => p.size + '/' + p.ids.length).join(' ')).join('\n'));
console.log('gb', gb.gen2.GS.pouches.map(p => p.ids.length).join('/'), 'ribbons', ['gen3', 'gen4', 'gen5', 'gen6', 'gen7'].map(g => g + ':' + ribbons[g].length).join(' '));
