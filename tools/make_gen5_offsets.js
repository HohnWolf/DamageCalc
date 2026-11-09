// Erzeugt data/gen5_offsets.js aus gen5_offsets.ini des Universal Pokémon Randomizer ZX (GPL-3.0):
//   node tools/make_gen5_offsets.js <Pfad zu gen5_offsets.ini> data/gen5_offsets.js
// Je Spiel (Code): Skript-Archiv, Tausch-Archiv, statische Begegnungen (Datei:Offset in den Skripten) und Tausch-Skripte.
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const num = v => { v = v.trim(); return v.startsWith('0x') ? parseInt(v, 16) : parseInt(v, 10); };
const refs = v => v.split(',').map(x => x.trim()).filter(Boolean).map(x => x.split(':').map(num));
const entries = [], byCode = {};
let cur = null;
fs.readFileSync(src, 'utf8').split(/\r?\n/).forEach(line => {
  line = line.replace(/\/\/.*$/, '').trim();
  if (!line) return;
  if (/^\[.+\]$/.test(line)) { cur = { v: {}, statics: [], trades: [], copyStatics: false, copyTrades: false }; entries.push(cur); return; }
  if (!cur) return;
  const i = line.indexOf('=');
  if (i < 0) return;
  const k = line.slice(0, i), val = line.slice(i + 1).trim();
  if (k === 'Game') { cur.v.Game = val; byCode[val] = cur; }
  else if (k === 'CopyStaticPokemon') cur.copyStatics = num(val) > 0;
  else if (k === 'CopyTradeScripts') cur.copyTrades = num(val) > 0;
  else if (k === 'CopyFrom') {
    const o = byCode[val];
    if (!o) throw new Error('CopyFrom ' + val);
    cur.v = Object.assign({}, o.v, cur.v);
    if (cur.copyStatics) cur.statics = cur.statics.concat(o.statics);
    if (cur.copyTrades) cur.trades = cur.trades.concat(o.trades);
  } else if (k === 'StaticPokemon{}') {
    const g = n => { const m = val.match(new RegExp(n + '=\\[([^\\]]*)\\]')); return m ? refs(m[1]) : []; };
    cur.statics.push({ s: g('Species'), f: g('Forme'), l: g('Level') });
  } else if (/^StarterOffsets[123]$/.test(k)) {
    (cur.v.starters = cur.v.starters || [])[+k.slice(-1) - 1] = refs(val.replace(/^\[|\]$/g, ''));
  } else if (k === 'TradeScript[]') {
    // [Datei:Verlangt:Gegeben, ...]
    cur.trades.push(val.replace(/^\[|\]$/g, '').split(',').map(x => x.trim().split(':').map(num)));
  } else if (/^(Type|Version|TradesUnused|StaticEggPokemonOffsets|ItemBallsScriptOffset|HiddenItemsScriptOffset|ItemBallsSkip|HiddenItemsSkip|ShopCount|TMShops|RegularShops|MoveTutorOvlNumber|MoveTutorDataOffset|ShopItemOvlNumber|ShopItemOffsets|ShopItemSizes|PickupOvlNumber)$/.test(k)) {
    cur.v[k] = k === 'Type' ? val : val.startsWith('[') ? val.replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(Boolean).map(num) : num(val);
  } else if (k === 'File<ShopItems>') cur.v.shopsFile = val.match(/<([^,]+),/)[1];
  else if (k === 'File<InGameTrades>') cur.v.tradesFile = val.match(/<([^,]+),/)[1];
  else if (k === 'File<Scripts>') cur.v.scriptsFile = val.match(/<([^,]+),/)[1];
});
const out = {};
entries.forEach(e => {
  const v = e.v;
  if (!v.Game) return;
  out[v.Game] = { type: v.Type, scripts: v.scriptsFile, tradesFile: v.tradesFile, unused: v.TradesUnused || [], eggs: v.StaticEggPokemonOffsets || [], starters: v.starters, statics: e.statics, trades: e.trades,
    ball: v.ItemBallsScriptOffset, ballSkip: v.ItemBallsSkip || [], hiddenFile: v.HiddenItemsScriptOffset, hiddenSkip: v.HiddenItemsSkip || [], shopsFile: v.shopsFile, shopCount: v.ShopCount, shopSkip: (v.TMShops || []).concat(v.RegularShops || []),
    pickupOvl: v.PickupOvlNumber,
    tutor: v.MoveTutorOvlNumber !== undefined ? [v.MoveTutorOvlNumber, v.MoveTutorDataOffset] : undefined, shopOvl: v.ShopItemOvlNumber !== undefined && v.ShopItemOffsets ? [v.ShopItemOvlNumber, v.ShopItemOffsets, v.ShopItemSizes] : undefined };
});
fs.writeFileSync(dst, '// Offsets der Gen-5-Spiele aus dem Universal Pokémon Randomizer ZX (GPL-3.0, Ajarmar). Erzeugt mit tools/make_gen5_offsets.js.\nwindow.GEN5_OFFS = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length + ' Spiele');
