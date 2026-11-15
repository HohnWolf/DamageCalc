// Liest Arten, Attacken, Fähigkeiten und Items aus data/*.js, ohne jQuery auszuführen.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function quotedBlock(src, startMark, endMark) {
  const i = src.indexOf(startMark);
  if (i < 0) return [];
  const j = src.indexOf(endMark, i);
  const slice = src.slice(i, j < 0 ? src.length : j);
  const out = [];
  const re = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let m;
  while ((m = re.exec(slice))) out.push((m[1] || m[2] || '').replace(/\\'/g, "'"));
  return out;
}

function load(root) {
  root = root || path.join(__dirname, '..');
  const movesSrc = fs.readFileSync(path.join(root, 'data', 'move_data.js'), 'utf8');
  const dexSrc = fs.readFileSync(path.join(root, 'data', 'pokedex.js'), 'utf8');
  const abSrc = fs.readFileSync(path.join(root, 'data', 'ability_data.js'), 'utf8');
  const itemSrc = fs.readFileSync(path.join(root, 'data', 'item_data.js'), 'utf8');
  const moves = quotedBlock(movesSrc, 'var MOVES_CHAMPIONS = {}', '].forEach(e => MOVES_CHAMPIONS');
  const species = quotedBlock(dexSrc, 'var POKEDEX_CHAMPIONS = {}', '].forEach(e => POKEDEX_CHAMPIONS');
  const abilities = quotedBlock(abSrc, 'var ABILITIES_CHAMPIONS = [', '];');
  const items = quotedBlock(itemSrc, 'var ITEMS_CHAMPIONS = [', '];');
  const ctx = { window: {}, console: console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'data', 'names_de.js'), 'utf8'), ctx);
  return {
    species: species.filter(Boolean),
    moves: moves.filter(function (m) { return m && m !== '(No Move)'; }),
    abilities: abilities.filter(Boolean),
    items: items.filter(Boolean),
    de: ctx.window.NAMES_DE || null
  };
}

module.exports = { load: load };
