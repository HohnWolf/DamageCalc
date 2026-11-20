// Lädt die NCP-Datendateien (data/pokedex.js, data/move_data.js) in Node – sie brauchen nur $.extend.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function extend() {
  const args = [].slice.call(arguments), deep = args[0] === true; if (deep) args.shift();
  const t = args.shift();
  args.forEach(function (src) {
    if (!src) return;
    Object.keys(src).forEach(function (k) {
      const v = src[k];
      if (deep && isObj(v)) t[k] = extend(true, isObj(t[k]) ? t[k] : {}, v);
      else if (deep && Array.isArray(v)) t[k] = v.slice();
      else if (v !== undefined) t[k] = v;
    });
  });
  return t;
}
const ctx = { $: { extend: extend }, console: console };
ctx.window = ctx; vm.createContext(ctx);
['data/pokedex.js', 'data/move_data.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
});
module.exports = { DEX: vm.runInContext('POKEDEX_CHAMPIONS', ctx), MOVES: vm.runInContext('MOVES_CHAMPIONS', ctx) };
