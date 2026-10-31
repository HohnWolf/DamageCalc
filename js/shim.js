// Minimal jQuery shim: the NCP data files only need $.extend(deep, target, ...sources).
(function () {
  function isPlain(o) { return o !== null && typeof o === 'object' && !Array.isArray(o); }
  function extend() {
    var args = Array.prototype.slice.call(arguments);
    var deep = false;
    if (typeof args[0] === 'boolean') deep = args.shift();
    var target = args.shift() || {};
    args.forEach(function (src) {
      if (!src) return;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        if (v === undefined) return;
        if (deep && isPlain(v)) {
          target[k] = extend(true, isPlain(target[k]) ? target[k] : {}, v);
        } else if (deep && Array.isArray(v)) {
          target[k] = v.slice();
        } else {
          target[k] = v;
        }
      });
    });
    return target;
  }
  window.$ = window.jQuery = { extend: extend };
  window.gen = 10;
})();
