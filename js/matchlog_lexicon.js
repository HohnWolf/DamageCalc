// Matchlog: Namen (EN/DE) und unscharfer Abgleich. OCR verliert Buchstaben ("Fllow Me"),
// deshalb zählt die Distanz gegen die echten Attacken-/Artenlisten, nicht ein festes Muster.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogLex = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function normKey(s) {
    return String(s || '').toLowerCase().replace(/\u0131/g, 'i').replace(/\u0130/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
  }
  function fold(s) {
    return normKey(s).replace(/0/g, 'o').replace(/1/g, 'l').replace(/5/g, 's').replace(/8/g, 'b');
  }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    if (Math.abs(m - n) > 4) return Math.abs(m - n);
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      var ca = a.charCodeAt(i - 1);
      for (j = 1; j <= n; j++) {
        var cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        var v = prev[j] + 1;
        if (cur[j - 1] + 1 < v) v = cur[j - 1] + 1;
        if (prev[j - 1] + cost < v) v = prev[j - 1] + cost;
        cur[j] = v;
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }
  function windowScore(hay, needle) {
    var n = needle.length, h = hay.length;
    if (n < 3 || h < 3) return 0;
    if (hay.indexOf(needle) >= 0) return 1;
    var best = 0;
    var minL = Math.max(3, n - 2), maxL = Math.min(h, n + 2);
    for (var L = minL; L <= maxL; L++) {
      for (var i = 0; i + L <= h; i++) {
        var part = hay.substr(i, L);
        var d = lev(needle, part);
        var sc = 1 - d / Math.max(n, L);
        if (sc > best) best = sc;
        if (best > 0.96) return best;
      }
    }
    return best;
  }
  function minScore(len) {
    if (len >= 10) return 0.78;
    if (len >= 7) return 0.83;
    if (len >= 6) return 0.82;
    if (len >= 5) return 0.84;
    return 0.9;
  }
  // Bester Eintrag, dessen EN- oder DE-Name im Text steckt. Zweiter Treffer muss klar schlechter sein.
  function best(text, entries) {
    var hay = normKey(text), hayF = fold(text);
    if (hay.length < 3 || !entries) return null;
    var top = null, second = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (/^mega/.test(e.key) && hay.indexOf('mega') < 0 && hayF.indexOf('mega') < 0) continue;
      var sc = windowScore(hay, e.key);
      var scF = windowScore(hayF, e.fold);
      if (scF > sc) sc = scF;
      if (e.deKey) {
        var sd = windowScore(hay, e.deKey);
        if (sd > sc) sc = sd;
      }
      // Kurze Namen ("Sing") stecken in längeren Wörtern ("opposing", "Rising"). Die zählen nur allein.
      if (e.key.length <= 4 && hay.length > e.key.length + 3) sc = Math.min(sc, 0.7);
      if (!top || sc > top.score + 0.001 || (Math.abs(sc - top.score) <= 0.001 && e.key.length > top.entry.key.length)) {
        second = top ? top.score : 0;
        top = { entry: e, score: sc };
      } else if (sc > second) second = sc;
    }
    if (!top || top.score < minScore(top.entry.key.length)) return null;
    if (top.score >= 0.98 && top.entry.key.length >= 5) return top;
    if (second > 0.8 && top.score - second < 0.04) return null;
    return top;
  }
  // Alle Arten im Text, von links nach rechts, ohne große Überlappung.
  function allSpecies(text, lex) {
    var hay = normKey(text);
    var hits = [];
    var list = lex.species;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (/^mega/.test(e.key) && hay.indexOf('mega') < 0) continue;
      var at = hay.indexOf(e.key);
      var sc = at >= 0 ? 1 : windowScore(hay, e.key);
      if (sc < minScore(e.key.length)) {
        var scF = windowScore(fold(text), e.fold);
        if (scF > sc) sc = scF;
      }
      if (e.deKey && sc < 0.95) {
        var sd = windowScore(hay, e.deKey);
        if (sd > sc) sc = sd;
      }
      if (sc >= minScore(e.key.length)) hits.push({ entry: e, score: sc, at: at >= 0 ? at : hay.indexOf(e.key.slice(0, 4)) });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    var kept = [];
    hits.forEach(function (h) {
      if (kept.some(function (k) { return k.entry.key === h.entry.key; })) return;
      // Mega-Form schlägt die Basis, wenn beide treffen ("Mega Raichu" enthält "Raichu").
      if (kept.some(function (k) { return k.entry.key.indexOf(h.entry.key) >= 0 && k.entry.key.length > h.entry.key.length; })) return;
      // Überlappende Treffer an derselben Textstelle nicht doppelt aufnehmen ("Basculegion" vs "Basculegion-F" / "Falinks").
      if (h.at >= 0 && kept.some(function (k) { return k.at >= 0 && Math.abs(k.at - h.at) <= 4; })) return;
      for (var i = kept.length - 1; i >= 0; i--) {
        if (h.entry.key.indexOf(kept[i].entry.key) >= 0 && h.entry.key.length > kept[i].entry.key.length && h.score + 0.02 >= kept[i].score) kept.splice(i, 1);
      }
      kept.push(h);
    });
    kept.sort(function (a, b) { return (a.at < 0 ? 999 : a.at) - (b.at < 0 ? 999 : b.at); });
    return kept;
  }
  function withBases(arr) {
    var out = (arr || []).slice(), seen = {};
    out.forEach(function (n) { seen[n] = 1; });
    out.slice().forEach(function (n) {
      var base = String(n).replace(/-(Eternal|Hisui|Alola|Galar|Midday|Midnight|Dusk|Average|Small|Large|Super|Hangry|Hero|F|M)$/i, '');
      base = base.replace(/-Paldea-(Combat|Aqua|Blaze)$/i, '');
      if (base && base !== n && !seen[base]) { seen[base] = 1; out.push(base); }
    });
    return out;
  }
  function entry(en, de) {
    var key = normKey(en);
    var deKey = de ? normKey(de) : '';
    return { en: en, de: de || '', key: key, deKey: deKey, fold: fold(en) };
  }
  function build(lists) {
    lists = lists || {};
    var de = lists.de || {};
    function map(arr, table) {
      var out = [], seen = {};
      (arr || []).forEach(function (name) {
        if (!name || name === '(No Move)') return;
        var e = entry(name, table ? table[normKey(name)] : '');
        if (!e.key || seen[e.key]) return;
        seen[e.key] = 1;
        out.push(e);
      });
      out.sort(function (a, b) { return b.key.length - a.key.length; });
      return out;
    }
    var lex = {
      species: map(withBases(lists.species), de.species),
      moves: map(lists.moves, de.moves),
      abilities: map(lists.abilities, de.abilities),
      items: map(lists.items, de.items)
    };
    lex.byKey = function (group, key) {
      var k = normKey(key);
      var list = lex[group] || [];
      for (var i = 0; i < list.length; i++) if (list[i].key === k) return list[i];
      return null;
    };
    return lex;
  }
  // Aus den schon geladenen data/*.js-Globals (Browser).
  function fromGlobals(g) {
    g = g || (typeof window !== 'undefined' ? window : globalThis);
    var species = g.POKEDEX_CHAMPIONS ? Object.keys(g.POKEDEX_CHAMPIONS) : [];
    var moves = g.MOVES_CHAMPIONS ? Object.keys(g.MOVES_CHAMPIONS) : [];
    var abilities = g.ABILITIES_CHAMPIONS || [];
    var items = g.ITEMS_CHAMPIONS || [];
    return build({ species: species, moves: moves, abilities: abilities, items: items, de: g.NAMES_DE || null });
  }
  return { normKey: normKey, fold: fold, lev: lev, best: best, allSpecies: allSpecies, build: build, fromGlobals: fromGlobals, entry: entry };
});
