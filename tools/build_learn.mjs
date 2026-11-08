// Erzeugt data/pk_learn.js: pro Art (National-Nr. 1–807) alle Attacken, die sie samt Vorentwicklungen irgendwann in Generation 1–7 lernen kann
// (Level, TM/VM, Tutor, Ei, Event). Quelle: @pkmn/sim (Showdown-Lernlisten). Maske: Bit g-1 = in Generation g möglich.
// Aufruf: node tools/build_learn.mjs
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { Dex } = require('@pkmn/sim');
const L = Dex.data.Learnsets;
const out = {};
function own(id) {
  const m = {};
  const ls = L[id] && L[id].learnset;
  if (!ls) return m;
  for (const mv in ls) {
    const num = Dex.moves.get(mv).num;
    if (!(num > 0 && num <= 728)) continue;
    let mask = 0;
    for (const tag of ls[mv]) { const g = +tag[0]; if (g >= 1 && g <= 7) mask |= 1 << (g - 1); }
    if (mask) m[num] = (m[num] || 0) | mask;
  }
  return m;
}
for (const sp of Dex.species.all()) {
  if (!(sp.num >= 1 && sp.num <= 807) || sp.forme || out[sp.num]) continue;
  const total = {};
  let cur = sp, guard = 0;
  while (cur && guard++ < 5) {
    const m = own(cur.id);
    for (const k in m) total[k] = (total[k] || 0) | m[k];
    cur = cur.prevo ? Dex.species.get(cur.prevo) : null;
  }
  const flat = [];
  Object.keys(total).map(Number).sort((a, b) => a - b).forEach(k => flat.push(k, total[k]));
  out[sp.num] = flat;
}
fs.writeFileSync('data/pk_learn.js', '// Lernbare Attacken pro Art und Generation (Maske: Bit g-1). Erzeugt von tools/build_learn.mjs aus @pkmn/sim\nwindow.PKLEARN = ' + JSON.stringify(out) + ';\n');
console.log('Arten', Object.keys(out).length, 'Bytes', fs.statSync('data/pk_learn.js').size);
