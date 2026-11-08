// Erzeugt data/items_data.js aus den Konstanten des Universal Pokémon Randomizer ZX (GPL-3.0):
//   node tools/make_items.js <Pfad zu .../pkrandom/constants> data/items_data.js
// Liest Items.java / Gen3Items.java und führt die ItemList-Aufrufe (banRange, banSingles, tmRange, copy) aus Gen3/4/5Constants nach.
const fs = require('fs'), path = require('path');
const [dir, dst] = process.argv.slice(2);
function consts(file) {
  const m = {};
  fs.readFileSync(path.join(dir, file), 'utf8').replace(/public static final int (\w+)\s*=\s*([^;]+);/g, (_, n, v) => { v = v.trim(); m[n] = /^\d+$/.test(v) ? +v : /^0x/i.test(v) ? parseInt(v, 16) : (m[v] !== undefined ? m[v] : NaN); });
  return m;
}
const C = { Items: consts('Items.java'), Gen3Items: consts('Gen3Items.java') };
const val = (tok, prefix) => {
  tok = tok.trim();
  if (/^\d+$/.test(tok)) return +tok;
  const mm = tok.match(/^(\w+)\.(\w+)$/);
  if (!mm || C[mm[1]] === undefined || C[mm[1]][mm[2]] === undefined || isNaN(C[mm[1]][mm[2]])) throw new Error('Konstante ' + tok);
  return C[mm[1]][mm[2]];
};
function run(file, from, to) {
  let src = fs.readFileSync(path.join(dir, file), 'utf8');
  const a = src.indexOf(from), b = src.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('Bereich ' + file);
  src = src.slice(a, b + to.length).replace(/\/\/.*$/gm, '');
  const vars = {}, lists = {};
  src.split(';').forEach(st => {
    st = st.replace(/\s+/g, ' ').trim();
    let m;
    if ((m = st.match(/^(\w+) = new ItemList\((.+)\)$/))) { const n = val(m[2]); vars[m[1]] = { max: n, items: new Set(), tms: new Set() }; for (let i = 1; i <= n; i++) vars[m[1]].items.add(i); }
    else if ((m = st.match(/^(\w+) = (\w+)\.copy\(\)$/))) vars[m[1]] = { max: vars[m[2]].max, items: new Set(vars[m[2]].items), tms: new Set(vars[m[2]].tms) };
    else if ((m = st.match(/^(\w+)\.banRange\((.+), (\d+)\)$/)) && vars[m[1]]) { const s0 = val(m[2]); for (let i = 0; i < +m[3]; i++) vars[m[1]].items.delete(s0 + i); }
    else if ((m = st.match(/^(\w+)\.tmRange\((.+), (\d+)\)$/)) && vars[m[1]]) { const s0 = val(m[2]); for (let i = 0; i < +m[3]; i++) vars[m[1]].tms.add(s0 + i); }
    else if ((m = st.match(/^(\w+)\.banSingles\((.+)\)$/)) && vars[m[1]]) m[2].split(',').forEach(t => vars[m[1]].items.delete(val(t)));
    else if ((m = st.match(/^(\w+) = new ArrayList<>\(\)$/))) lists[m[1]] = [];
    else if ((m = st.match(/^(\w+)\.addAll\(IntStream\.rangeClosed\((.+?),\s*(.+?)\)\.boxed/)) && lists[m[1]]) { for (let i = val(m[2]); i <= val(m[3]); i++) lists[m[1]].push(i); }
    else if ((m = st.match(/^(\w+)\.add\((.+)\)$/)) && lists[m[1]]) lists[m[1]].push(val(m[2]));
  });
  const out = { lists };
  Object.keys(vars).forEach(k => { out[k] = { max: vars[k].max, items: [...vars[k].items].sort((x, y) => x - y), tms: [...vars[k].tms].sort((x, y) => x - y) }; });
  return out;
}
const pick = (r, names) => { const o = { shop: r.lists.regularShopItems || [], op: r.lists.opShopItems || [] }; names.forEach(([k, n]) => { o[k] = r[n]; }); return o; };
const g3 = run('Gen3Constants.java', 'allowedItems = new ItemList', 'public static ItemList getNonBadItems');
const g4 = run('Gen4Constants.java', 'allowedItems = new ItemList', 'opShopItems.add(Items.luckyEgg);');
const g5 = run('Gen5Constants.java', 'allowedItems = new ItemList', 'public static ItemList getNonBadItems');
const out = {
  3: pick(g3, [['allowed', 'allowedItems'], ['nonBad', 'nonBadItemsRSE'], ['nonBad2', 'nonBadItemsFRLG']]),
  4: pick(g4, [['allowed', 'allowedItems'], ['nonBad', 'nonBadItems']]),
  5: pick(g5, [['allowed', 'allowedItems'], ['nonBad', 'nonBadItemsBW1'], ['nonBad2', 'nonBadItemsBW2']])
};
fs.writeFileSync(dst, '// Item-Listen (erlaubt, "nicht schlecht", Shop-Items) aus dem Universal Pokémon Randomizer ZX (GPL-3.0, Ajarmar). Erzeugt mit tools/make_items.js.\nwindow.CC_ITEMS = ' + JSON.stringify(out) + ';\n');
Object.keys(out).forEach(g => console.log('Gen ' + g, Object.keys(out[g]).map(k => k + ':' + (out[g][k].items ? out[g][k].items.length : out[g][k].length)).join(' ')));
