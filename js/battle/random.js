// Two different legal teams for a local random battle.
// Showdown's random-battle generator is not in the bundled simulator, and the
// ROM randomizer does not build Champions doubles teams. The bundled meta pool
// is already legal in gen9championsvgc2026regmc. Teambuilder teams can be added.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLBattleRandom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hash(seed) {
    var s = String(seed == null ? '1' : seed);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function rngOf(seed) {
    var a = hash(seed) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickPair(teams, seed) {
    var list = (teams || []).filter(function (t) { return t && t.paste; });
    if (list.length < 2) return null;
    var rng = rngOf(seed);
    var i = Math.floor(rng() * list.length);
    var j = Math.floor(rng() * (list.length - 1));
    if (j >= i) j++;
    return { a: list[i], b: list[j], seed: String(seed == null ? '1' : seed) };
  }
  return { pickPair: pickPair };
});
