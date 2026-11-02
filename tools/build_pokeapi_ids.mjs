// Baut data/pokeapi_ids.js: PokéAPI-Name (identifier) -> PokéAPI-Nummer, für die Pokémon-HOME-Bilder der Match-Overlays
// (https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/<nummer>.png).
// Eingabe: pokemon.csv und pokemon_species.csv aus PokeAPI/pokeapi (data/v2/csv/).
//   node tools/build_pokeapi_ids.mjs <pokemon.csv> <pokemon_species.csv> data/pokeapi_ids.js
// Die Dateien werden nur als Text gelesen.
import fs from 'node:fs';

const [pkFile, spFile, outFile] = process.argv.slice(2);
if (!pkFile || !spFile || !outFile) {
  console.error('Aufruf: node tools/build_pokeapi_ids.mjs <pokemon.csv> <pokemon_species.csv> <ausgabe.js>');
  process.exit(1);
}

function rows(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  const head = lines.shift().split(',');
  return lines.map((l) => { const c = l.split(','); const r = {}; head.forEach((h, i) => { r[h] = c[i]; }); return r; });
}

const species = {};
rows(spFile).forEach((r) => { species[r.id] = r.identifier; });
const ids = {};
const add = (k, v, force) => { if (k && (force || ids[k] === undefined)) ids[k] = v; };
const pk = rows(pkFile).filter((r) => !/-(gmax|totem)(-|$)/.test(r.identifier));
// 1. jeder Eintrag unter seinem eigenen Namen
pk.forEach((r) => add(r.identifier, +r.id, true));
// 2. Standardform auch unter dem Artnamen (aegislash -> aegislash-shield, meowstic -> meowstic-male)
pk.forEach((r) => { if (r.is_default === '1') add(species[r.species_id], +r.id); });
// 3. Kurzformen wie bei Showdown: -male fällt weg, -female wird -f (meowstic-male-mega -> meowstic-mega, basculegion-female -> basculegion-f)
pk.forEach((r) => {
  const n = r.identifier;
  if (/-male(-|$)/.test(n)) add(n.replace(/-male(?=-|$)/, ''), +r.id);
  if (/-female(-|$)/.test(n)) add(n.replace(/-female(?=-|$)/, '-f'), +r.id);
});

const keys = Object.keys(ids).sort();
const body = keys.map((k) => JSON.stringify(k) + ':' + ids[k]).join(',');
fs.writeFileSync(outFile,
  '// PokéAPI-Name -> PokéAPI-Nummer (für die HOME-Bilder der Match-Overlays). Erzeugt mit tools/build_pokeapi_ids.mjs\n' +
  'window.POKEAPI_IDS = {' + body + '};\n');
console.log(keys.length + ' Namen nach ' + outFile);
