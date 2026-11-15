// Einmalig: Ziffern aus match01 t75 lernen und als Modul schreiben.
const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const Hp = require('../js/matchlog_hp');
const Lay = require('../js/matchlog_layout');
const dir = path.join(__dirname, 'matchlog', 'frames');
const file = fs.readdirSync(dir).filter(function (f) { return /m01_t75/.test(f); })[0];
const raw = jpeg.decode(fs.readFileSync(path.join(dir, file)), { useTArray: true, maxMemoryUsageInMB: 128 });
const img = { width: raw.width, height: raw.height, data: raw.data };
const bank = Hp.createBank();
const notes = Hp.learn(img, bank, [
  { box: Lay.L.ownHp[0], text: '167/167' },
  { box: Lay.L.ownHp[1], text: '170/170' }
]);
const data = bank.export();
const out = path.join(__dirname, '..', 'js', 'matchlog_digits.js');
const body = 'window.CCMatchlogDigits = ' + JSON.stringify(data) + ';\n';
const src = '// Matchlog: Ziffernvorlagen aus match01, Befehlsmenü (167/167 und 170/170).\n' +
  '// Fehlende Ziffern (2, 3, 4, 5, 8, 9, %) bleiben leer, bis weitere Frames sie liefern.\n' +
  '(function (root) {\n  var data = ' + JSON.stringify(data) + ';\n' +
  '  if (typeof module === "object" && module.exports) module.exports = data;\n' +
  '  if (root) root.CCMatchlogDigits = data;\n' +
  '})(typeof window !== "undefined" ? window : globalThis);\n';
fs.writeFileSync(out, src);
console.log(notes, 'chars', Object.keys(data).join(''), 'file', out, 'bytes', src.length);
