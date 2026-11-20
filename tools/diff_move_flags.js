// Vergleicht die Champions-Attackendaten (data/move_data.js) mit den Showdown-Daten (vendor/ps).
// Aufruf: node tools/diff_move_flags.js   ([Champions] = bewusst im Champions-Block überschrieben)
const fs = require('fs'), path = require('path');
const H = require('./diff_calc_smogon.js'); const Sim = require('../vendor/ps'); const M = H.MOVES;
const src = fs.readFileSync(path.join(__dirname, '../data/move_data.js'), 'utf8');
const over = src.split('var MOVES_CHAMPIONS_NATDEX')[1].split('var MOVES_CHAMPIONS =')[0];
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function overridden(n, k) { return new RegExp("'" + esc(n) + "'\\s*:\\s*\\{[^}]*" + k).test(over); }
const diffs = {};
Object.keys(M).forEach(function (n) {
  const m = M[n]; if (!m || !m.category || m.category === 'Status') return;
  const s = Sim.Dex.moves.get(n); if (!s.exists) return;
  const exp = { makesContact: !!s.flags.contact, isPunch: !!s.flags.punch, isBite: !!s.flags.bite, isSound: !!s.flags.sound, isBullet: !!s.flags.bullet,
    isPulse: !!s.flags.pulse, isSlice: !!s.flags.slicing, isWind: !!s.flags.wind,
    hasSecondaryEffect: !!(s.secondary || (s.secondaries && s.secondaries.length)), isSpread: s.target === 'allAdjacentFoes' || s.target === 'allAdjacent' };
  Object.keys(exp).forEach(function (k) {
    if (!!m[k] !== exp[k]) (diffs[k] = diffs[k] || []).push(n + (exp[k] ? ' (fehlt)' : ' (zu viel)') + (overridden(n, k) ? ' [Champions]' : ''));
  });
  if (m.bp !== s.basePower && !overridden(n, 'bp')) (diffs.bp = diffs.bp || []).push(n + ' ' + m.bp + '/' + s.basePower);
  if (m.type !== s.type && !overridden(n, 'type')) (diffs.type = diffs.type || []).push(n + ' ' + m.type + '/' + s.type);
  if (m.category !== s.category) (diffs.category = diffs.category || []).push(n);
});
for (const k in diffs) console.log(k + ' (' + diffs[k].length + '): ' + diffs[k].join(', ') + '\n');
