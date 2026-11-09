// Erzeugt data/move_updates.js aus AbstractRomHandler.updateMoves() und Moves.java des Universal Pokémon Randomizer ZX (GPL-3.0):
//   node tools/make_move_updates.js <AbstractRomHandler.java> <Moves.java> data/move_updates.js
// Eintrag: [Ziel-Generation, Bedingung an die Generation der ROM ('' | '>=K' | '==K'), Feld, Attacke, Wert]
const fs = require('fs');
const [abs, mov, dst] = process.argv.slice(2);
const ids = {};
fs.readFileSync(mov, 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/public static final int (\w+) = (\d+);/); if (m) ids[m[1]] = +m[2]; });
const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
let a = lines.findIndex(l => /public void updateMoves\(Settings settings\)/.test(l)), z = lines.findIndex((l, i) => i > a && /private Map<Integer, boolean\[\]> moveUpdates/.test(l));
const out = [], KIND = { updateMovePower: 'power', updateMovePP: 'pp', updateMoveAccuracy: 'acc', updateMoveType: 'type', updateMoveCategory: 'cat' };
let top = 0, cond = '', depth = 0, topDepth = -1, condDepth = -1;
for (let i = a; i < z; i++) {
  const l = lines[i].trim();
  let m;
  if ((m = l.match(/^if \(generation >= (\d+) && generationOfPokemon\(\) < \d+\) \{/))) { top = +m[1]; cond = ''; depth = 1; topDepth = 1; continue; }
  if ((m = l.match(/^if \(generationOfPokemon\(\) (>=|==) (\d+)\) \{/))) { cond = m[1] + m[2]; depth = 2; continue; }
  if (l === '}') { if (depth === 2) { cond = ''; depth = 1; } else if (depth === 1) { top = 0; depth = 0; } continue; }
  if ((m = l.match(/^(update\w+)\(moves, Moves\.(\w+), (.+)\);/)) && KIND[m[1]]) {
    let v = m[3].trim();
    if (!(m[2] in ids)) throw new Error('Attacke ' + m[2]);
    if (v === 'perfectAccuracy') v = 100;
    else if (/^Type\./.test(v)) v = v.slice(5);
    else if (/^MoveCategory\./.test(v)) v = v.slice(13);
    else v = +v;
    out.push([top, cond, KIND[m[1]], ids[m[2]], v]);
  }
}
fs.writeFileSync(dst, '// Attacken-Änderungen der Spielgenerationen aus dem Universal Pokémon Randomizer ZX (GPL-3.0, Ajarmar). Erzeugt mit tools/make_move_updates.js.\nwindow.MOVE_UPDATES = ' + JSON.stringify(out) + ';\n');
console.log(out.length + ' Änderungen');
