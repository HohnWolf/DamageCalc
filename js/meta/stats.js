// Wilson score interval. Shared by the harness, the UI and the tests.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLMetaStats = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function wilson(wins, n, z) {
    z = z || 1.96;
    if (!n) return { p: 0, lo: 0, hi: 1, n: 0, wins: 0 };
    var p = wins / n;
    var z2 = z * z;
    var den = 1 + z2 / n;
    var centre = p + z2 / (2 * n);
    var margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
    return {
      p: p,
      lo: Math.max(0, (centre - margin) / den),
      hi: Math.min(1, (centre + margin) / den),
      n: n,
      wins: wins
    };
  }
  function overlap(a, b) {
    if (!a || !b) return true;
    return a.lo <= b.hi && b.lo <= a.hi;
  }
  function seedFor(base, i) {
    var x = (base >>> 0) ^ Math.imul(i + 1, 0x9E3779B1);
    var s = [];
    for (var k = 0; k < 4; k++) {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      s.push(x & 0xFFFF);
    }
    if (s[0] === 0 && s[1] === 0 && s[2] === 0 && s[3] === 0) s[3] = 1;
    return s.join(',');
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(seedStr) {
    var h = 2166136261;
    var s = String(seedStr);
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  return { wilson: wilson, overlap: overlap, seedFor: seedFor, mulberry32: mulberry32, hashSeed: hashSeed };
});
