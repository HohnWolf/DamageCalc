// Suggest one change (move, item or spread from usage) and keep it only when the
// Wilson intervals from common random numbers do not overlap. Successive halving:
// 16, then 32, then 64 games. Still local, same simulator as the meta test.
'use strict';
const stats = require('./stats');

function separate(a, b) {
  return !stats.overlap(a, b);
}

// run(n) -> { ciA, ciB, winsA, winsB } using the same seeds for both teams.
// Returns the variant summary only when the intervals separate.
function successiveHalving(run, steps) {
  steps = steps || [16, 32, 64];
  let last = null;
  for (let i = 0; i < steps.length; i++) {
    last = run(steps[i]);
    if (last && separate(last.ciA, last.ciB)) return last;
  }
  return null;
}

module.exports = { separate: separate, successiveHalving: successiveHalving };
