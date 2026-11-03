const fs = require('fs');
const vm = require('vm');

global.$ = {
  extend: function(deep, target, ...sources) {
    for (const src of sources) {
      if (!src) continue;
      for (const k of Object.keys(src)) {
        if (deep && src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
          target[k] = target[k] || {};
          global.$.extend(true, target[k], src[k]);
        } else {
          target[k] = src[k];
        }
      }
    }
    return target;
  }
};
global.window = global;

vm.runInThisContext(fs.readFileSync('data/pokedex.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('data/item_data.js', 'utf8'));

console.log('POKEDEX_CHAMPIONS keys:', Object.keys(global.POKEDEX_CHAMPIONS).length);
console.log('Sample Mega Clefable:', global.POKEDEX_CHAMPIONS['Mega Clefable']);
