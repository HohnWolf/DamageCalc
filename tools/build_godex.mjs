// Erzeugt data/godex.js (Pokémon-GO-Pokédex) aus den Daten von https://pogoapi.net (PokéMiners / Spieldaten).
// Aufruf: node tools/build_godex.mjs [Ordner mit den heruntergeladenen JSON-Dateien]
// Ohne Ordner werden die Dateien direkt von pogoapi.net geladen.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
const API = 'https://pogoapi.net/api/v1/';
async function get(name) {
  if (dir && fs.existsSync(path.join(dir, name + '.json'))) return JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));
  const r = await fetch(API + name + '.json');
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.json();
}

const [stats, types, moves, fast, charged, released, mega] = await Promise.all(
  ['pokemon_stats', 'pokemon_types', 'current_pokemon_moves', 'fast_moves', 'charged_moves', 'released_pokemon', 'mega_pokemon'].map(get));

// Attacken-Tabellen
const fastList = [], chargedList = [], fastIx = {}, chargedIx = {};
function mv(list, ix, o, isFast) {
  if (ix[o.name] != null) return ix[o.name];
  list.push(isFast ? [o.name, o.type, o.power, Math.abs(o.energy_delta), o.duration] : [o.name, o.type, o.power, Math.abs(o.energy_delta), o.duration]);
  return (ix[o.name] = list.length - 1);
}
const fastBy = {}; fast.forEach((m) => { fastBy[m.name] = m; });
const chargedBy = {}; charged.forEach((m) => { chargedBy[m.name] = m; });
const fi = (n) => (fastBy[n] ? mv(fastList, fastIx, fastBy[n], true) : -1);
const ci = (n) => (chargedBy[n] ? mv(chargedList, chargedIx, chargedBy[n], false) : -1);
const ids = (arr, f) => [...new Set((arr || []).map(f).filter((i) => i >= 0))];

const key = (x) => x.pokemon_id + '|' + x.form;
const typeBy = {}; types.forEach((x) => { typeBy[key(x)] = x.type; });
const moveBy = {}; moves.forEach((x) => { moveBy[key(x)] = x; });
const statBy = {}; stats.forEach((x) => { statBy[key(x)] = x; });

const out = [];
const releasedIds = new Set(Object.keys(released).map(Number));
const REGIONAL = /^(Alola|Galarian|Hisuian|Paldea)$/;
const byId = {};
stats.forEach((s) => { (byId[s.pokemon_id] = byId[s.pokemon_id] || []).push(s); });
for (const id of Object.keys(byId)) {
  const list = byId[id].sort((x, y) => (x.form === 'Normal' ? -1 : y.form === 'Normal' ? 1 : 0));
  const sigs = new Set();
  const kept = [];
  for (const s of list) {
    const t = typeBy[key(s)] || [];
    const sig = [s.base_attack, s.base_defense, s.base_stamina, t.join('/')].join('|');
    if (sigs.has(sig) && !REGIONAL.test(s.form)) continue; // reine Zier-/Kostümformen mit gleichen Werten weglassen
    sigs.add(sig);
    kept.push([s, t]);
  }
  const single = kept.length === 1;
  for (const [s, t] of kept) {
    const mo = moveBy[key(s)] || moveBy[s.pokemon_id + '|Normal'] || {};
    out.push([s.pokemon_id, s.pokemon_name, s.form === 'Normal' || single ? '' : s.form, t, s.base_attack, s.base_defense, s.base_stamina,
      ids(mo.fast_moves, fi), ids(mo.charged_moves, ci), ids(mo.elite_fast_moves, fi), ids(mo.elite_charged_moves, ci)]);
  }
}
// Mega-Entwicklungen
for (const m of mega) {

  const base = moveBy[m.pokemon_id + '|Normal'] || {};
  const nm = m.mega_name.replace(/^Mega /, '').replace(new RegExp('^' + m.pokemon_name + ' ?'), '').trim(); // "X", "Y" oder ""
  out.push([m.pokemon_id, m.pokemon_name, 'Mega' + (nm ? ' ' + nm : ''), m.type, m.stats.base_attack, m.stats.base_defense, m.stats.base_stamina,
    ids(base.fast_moves, fi), ids(base.charged_moves, ci), ids(base.elite_fast_moves, fi), ids(base.elite_charged_moves, ci)]);
}
out.sort((a, b) => a[0] - b[0] || (a[2] === '' ? -1 : b[2] === '' ? 1 : a[2].localeCompare(b[2])));

const js = '// Pokémon-GO-Pokédex-Daten (Basiswerte, Typen, Attacken). Erzeugt von tools/build_godex.mjs aus pogoapi.net\n' +
  'window.GODEX = ' + JSON.stringify({
    cpm: { 15: 0.51739395, 20: 0.5974, 25: 0.667934, 50: 0.84029999 },
    fast: fastList, charged: chargedList, mons: out
  }) + ';\n';
fs.writeFileSync(path.join(root, 'data', 'godex.js'), js);
console.log('mons', out.length, 'fast', fastList.length, 'charged', chargedList.length, 'bytes', js.length);
