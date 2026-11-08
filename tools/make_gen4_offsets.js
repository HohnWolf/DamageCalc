// Erzeugt data/gen4_offsets.js aus gen4_offsets.ini des Universal Pokémon Randomizer ZX (GPL-3.0):
//   node tools/make_gen4_offsets.js <Pfad zu gen4_offsets.ini> data/gen4_offsets.js
// Je Spielversion (Code + Version): Skript-Archiv, Tausch-Archiv, statische Begegnungen (Datei:Offset in den Skripten).
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const num = v => { v = v.trim(); return v.startsWith('0x') ? parseInt(v, 16) : parseInt(v, 10); };
const refs = v => v.split(',').map(x => x.trim()).filter(Boolean).map(x => x.split(':').map(num));
const entries = [], byCode = {}, byName = {};
let cur = null;
fs.readFileSync(src, 'utf8').split(/\r?\n/).forEach(line => {
  line = line.replace(/\/\/.*$/, '').trim();
  if (!line) return;
  if (/^\[.+\]$/.test(line)) { cur = { name: line.slice(1, -1), v: {}, statics: [], trades: [], copyStatics: false, copyTrades: false }; entries.push(cur); byName[cur.name] = cur; return; }
  if (!cur) return;
  const i = line.indexOf('=');
  if (i < 0) return;
  const k = line.slice(0, i), val = line.slice(i + 1).trim();
  if (k === 'Game') { cur.v.Game = val; }
  else if (k === 'CopyStaticPokemon') cur.copyStatics = num(val) > 0;
    else if (k === 'CopyFrom') {
    const o = byName[val];
    if (!o) throw new Error('CopyFrom ' + val);
    cur.v = Object.assign({}, o.v, cur.v);
    if (cur.copyStatics) cur.statics = cur.statics.concat(o.statics);
    if (cur.copyTrades) cur.trades = cur.trades.concat(o.trades);
  } else if (k === 'StaticPokemon{}') {
    const g = n => { const m = val.match(new RegExp(n + '=\\[([^\\]]*)\\]')); return m ? refs(m[1]) : []; };
    cur.statics.push({ s: g('Species'), f: g('Forme'), l: g('Level') });
  } else if (k === 'TradeScript[]') {
    // [Datei:Verlangt:Gegeben, ...]
    cur.trades.push(val.replace(/^\[|\]$/g, '').split(',').map(x => x.trim().split(':').map(num)));
  } else if (/^(Type|Version|StaticPokemonTrades|ItemBallsScriptOffset|ItemBallsSkip|HiddenItemTableOffset|HiddenItemCount|ShopCount|SkipShops|MainGameShops|ShopDataPrefix|MoveTutorMovesOffset|MoveTutorCount|MoveTutorBytesCount|MoveTutorCompatOffset|MoveTutorCompatBytesCount|FieldOvlNumber|MoveTutorCompatOvlNumber|BattleOvlNumber)$/.test(k)) {
    cur.v[k] = (k === 'Type' || k === 'ShopDataPrefix') ? val : val.startsWith('[') ? val.replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(Boolean).map(num) : num(val);
  } else if (k === 'File<InGameTrades>') cur.v.tradesFile = val.match(/<([^,]+),/)[1];
  else if (k === 'File<Scripts>') cur.v.scriptsFile = val.match(/<([^,]+),/)[1];
  else if (k === 'File<MoveTutorCompat>') cur.v.tutorFile = val.match(/<([^,]+),/)[1];
});
const out = {};
entries.forEach(e => {
  const v = e.v;
  if (!v.Game) return;
  out[v.Game + (v.Version || 0)] = { type: v.Type, scripts: v.scriptsFile, tradesFile: v.tradesFile, spTrades: v.StaticPokemonTrades || [], statics: e.statics,
    ball: v.ItemBallsScriptOffset, ballSkip: v.ItemBallsSkip || [], hidden: v.HiddenItemTableOffset ? [v.HiddenItemTableOffset, v.HiddenItemCount] : undefined,
    tutor: v.MoveTutorMovesOffset ? { ovl: v.FieldOvlNumber, moves: v.MoveTutorMovesOffset, count: v.MoveTutorCount, step: v.MoveTutorBytesCount, compat: v.MoveTutorCompatOffset, cbytes: v.MoveTutorCompatBytesCount, cOvl: v.MoveTutorCompatOvlNumber, cFile: v.tutorFile } : undefined,
    battleOvl: v.BattleOvlNumber,
    shops: v.ShopDataPrefix ? [v.ShopDataPrefix, v.ShopCount, v.SkipShops || [], v.MainGameShops || []] : undefined };
});
fs.writeFileSync(dst, '// Offsets der Gen-4-Spiele aus dem Universal Pokémon Randomizer ZX (GPL-3.0, Ajarmar). Erzeugt mit tools/make_gen4_offsets.js.\nwindow.GEN4_OFFS = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length + ' Spiele');
