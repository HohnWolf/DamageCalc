// Decode HTML entities in meta-team names. Shared by the UI, the pool builder and the tests.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLMetaText = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  function safeChar(n) {
    if (!isFinite(n) || n <= 0 || n > 0x10FFFF) return '';
    if (n < 32 && n !== 9 && n !== 10 && n !== 13) return '';
    try { return String.fromCodePoint(n); } catch (e) { return ''; }
  }
  function once(str) {
    return str.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);?/g, function (all, body) {
      if (body.charAt(0) === '#') {
        var hex = body.charAt(1) === 'x' || body.charAt(1) === 'X';
        return safeChar(parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10));
      }
      var key = body.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED, key) ? NAMED[key] : all;
    });
  }
  function decodeEntities(s) {
    if (s == null) return '';
    var str = String(s);
    if (str.indexOf('&') < 0) return str;
    var prev = '';
    for (var i = 0; i < 3 && prev !== str; i++) {
      prev = str;
      str = once(str);
    }
    return str;
  }
  function normalizeTeam(team) {
    if (!team || typeof team !== 'object') return team;
    ['name', 'notes', 'archetype'].forEach(function (k) {
      if (typeof team[k] === 'string') team[k] = decodeEntities(team[k]);
    });
    return team;
  }
  return { decodeEntities: decodeEntities, normalizeTeam: normalizeTeam };
});
