// Single regulation switch. Change FORMAT_ID to move the whole Meta-Test.
// gen9championsvgc2026regmc  →  Reg M-C (current)
// gen9championsvgc2026regmb  →  Reg M-B (bundled, not the default)
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLMetaFormat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var FORMAT_ID = 'gen9championsvgc2026regmc';
  return {
    FORMAT_ID: FORMAT_ID,
    SHOWDOWN_COMMIT: '965a535ef892d13cd68cf75c076db26f9f32842a',
    MAX_TURNS: 120
  };
});
