// Erzeugt data/gen3_offsets.js aus gen3_offsets.ini des Universal Pokémon Randomizer ZX (GPL-3.0):
//   node tools/make_gen3_offsets.js <Pfad zu gen3_offsets.ini> data/gen3_offsets.js
// Je Spielversion (Code + Version): TM/HM-Kompatibilität, TM-Attacken, Move-Tutor, Ingame-Tausche und statische Begegnungen.
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const num = v => { v = v.trim(); return v.startsWith('0x') ? parseInt(v, 16) : parseInt(v, 10); };
const list = v => v.replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(Boolean).map(num);
const entries = [], byName = {};
let cur = null;
fs.readFileSync(src, 'utf8').split(/\r?\n/).forEach(line => {
  line = line.replace(/\/\/.*$/, '').trim();
  if (!line) return;
  const h = line.match(/^\[(.+)\]$/);
  if (h) { cur = { name: h[1], v: {}, statics: [], copyStatics: false }; entries.push(cur); byName[cur.name.toLowerCase()] = cur; return; }
  if (!cur) return;
  const i = line.indexOf('=');
  if (i < 0) return;
  const k = line.slice(0, i), val = line.slice(i + 1).trim();
  if (k === 'CopyStaticPokemon') cur.copyStatics = num(val) > 0;
  else if (k === 'CopyFrom') {
    const o = byName[val.toLowerCase()];
    if (!o) throw new Error('CopyFrom ' + val);
    cur.v = Object.assign({}, o.v, cur.v);
    if (cur.copyStatics) cur.statics = cur.statics.concat(o.statics);
  } else if (k === 'StaticPokemon{}') {
    const sp = val.match(/Species=\[([^\]]*)\]/), lv = val.match(/Level=\[([^\]]*)\]/);
    cur.statics.push([sp ? list(sp[1]) : [], lv ? list(lv[1]) : []]);
  } else if (/^(Game|Version|PokemonTMHMCompat|TmMoves|MoveTutorData|MoveTutorMoves|TradeTableOffset|TradeTableSize|TradesUnused|StaticEggPokemonOffsets|ItemBallPic|PickupTableStartLocator|PickupItemCount|ShopItemOffsets|SkipShops|MainGameShops)$/.test(k)) {
    cur.v[k] = (k === 'Game' || k === 'PickupTableStartLocator') ? val : val.startsWith('[') ? list(val) : num(val);
  }
});
const out = {};
entries.forEach(e => {
  const v = e.v;
  if (!v.Game) return;
  out[v.Game + (v.Version || 0)] = {
    name: e.name, compat: v.PokemonTMHMCompat, tm: v.TmMoves, tut: v.MoveTutorData && v.MoveTutorMoves ? [v.MoveTutorData, v.MoveTutorMoves] : undefined,
    trade: v.TradeTableOffset ? [v.TradeTableOffset, v.TradeTableSize, v.TradesUnused || []] : undefined, eggs: v.StaticEggPokemonOffsets || [], statics: e.statics,
    ball: v.ItemBallPic, pickup: v.PickupTableStartLocator ? [v.PickupTableStartLocator, v.PickupItemCount] : undefined, shops: v.ShopItemOffsets ? [v.ShopItemOffsets, v.SkipShops || [], v.MainGameShops || []] : undefined
  };
});
fs.writeFileSync(dst, '// Offsets der Gen-3-Spiele aus dem Universal Pokémon Randomizer ZX (GPL-3.0, Ajarmar). Erzeugt mit tools/make_gen3_offsets.js.\nwindow.GEN3_OFFS = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length + ' Spielversionen');
