// Speed-Tiers: Initiative-Werte aller Champions-Pokémon auf Level 50 (Basis, Max Speed, neutral 0/32 SP, -Init, Choice Scarf).
// Stat-Formel kommt aus js/calc.js (Calc.calcStat), hier wird nichts nachgebaut. Optional: Stufen, Rückenwind, Paralyse und ein Vergleichswert.
(function () {
  'use strict';
  var A = window.CC, C = window.Calc;
  if (!A || !C) return;
  var el = A.el;
  var de = A.LANG === 'de';
  var KEY = 'cc_speedtier';

  var TXT = de ? {
    search: 'Pokémon suchen …', pokemon: 'Pokémon', base: 'Basis-Init', max: 'Max Speed', n32: 'Neutral +32 SP', n0: 'Neutral 0 SP', neg: '−Init 0 SP', maxScarf: 'Max + Scarf', n32Scarf: 'Neutral +32 + Scarf',
    all: 'Alle', mega: 'Megas', nomega: 'Ohne Megas', stage: 'Stufe', tailwind: 'Rückenwind (×2)', para: 'Paralyse (×0,5)', cmp: 'Vergleichswert', cmpHint: 'z. B. 150: langsamere Werte grün, gleich gelb, schnellere rot', count: function (n) { return n + ' Pokémon'; }, none: 'Nichts gefunden.', baseLbl: 'Basis', reset: 'Zurücksetzen'
  } : {
    search: 'Search Pokémon …', pokemon: 'Pokémon', base: 'Base Spe', max: 'Max Speed', n32: 'Neutral +32 SP', n0: 'Neutral 0 SP', neg: '−Spe 0 SP', maxScarf: 'Max + Scarf', n32Scarf: 'Neutral +32 + Scarf',
    all: 'All', mega: 'Megas', nomega: 'No Megas', stage: 'Stage', tailwind: 'Tailwind (×2)', para: 'Paralysis (×0.5)', cmp: 'Compare value', cmpHint: 'e.g. 150: slower values green, equal yellow, faster red', count: function (n) { return n + ' Pokémon'; }, none: 'Nothing found.', baseLbl: 'Base', reset: 'Reset'
  };

  // [key, label, SP, nature, scarf]
  var COLS = [
    ['base', TXT.base], ['max', TXT.max, 32, 'Jolly'], ['n32', TXT.n32, 32, 'Hardy'], ['n0', TXT.n0, 0, 'Hardy'],
    ['neg', TXT.neg, 0, 'Brave'], ['maxScarf', TXT.maxScarf, 32, 'Jolly', true], ['n32Scarf', TXT.n32Scarf, 32, 'Hardy', true]
  ];

  function defaults() { return { q: '', form: 'all', stage: 0, tw: false, para: false, cmp: '', sort: 'base', dir: -1 }; }
  var S = defaults();
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && typeof raw === 'object') S = Object.assign(defaults(), raw); } catch (e) { /* ignore */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  var rows = null;
  function list() {
    if (rows) return rows;
    rows = Object.keys(A.DEX).filter(function (k) { return A.DEX[k].bs && A.DEX[k].bs.sp; }).map(function (k) {
      return { name: k, label: A.nSpecies(k), isMega: k.indexOf('Mega ') === 0, base: A.DEX[k].bs.sp };
    });
    return rows;
  }

  function value(r, c) {
    if (c[0] === 'base') return r.base;
    var v = C.calcStat('sp', r.base, c[2], c[3], r.name);
    if (S.stage) v = C.boosted(v, S.stage);
    if (c[4]) v = Math.floor(v * 1.5);
    if (S.tw) v *= 2;
    if (S.para) v = Math.floor(v / 2);
    return v;
  }

  function sortedRows() {
    var q = S.q.trim().toLowerCase(), words = q ? q.split(/\s+/) : [];
    var col = COLS.filter(function (c) { return c[0] === S.sort; })[0] || COLS[0];
    var out = list().filter(function (r) {
      if (S.form === 'mega' && !r.isMega) return false;
      if (S.form === 'nomega' && r.isMega) return false;
      if (!words.length) return true;
      var hay = (r.name + ' ' + r.label).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).map(function (r) {
      var vals = {};
      COLS.forEach(function (c) { vals[c[0]] = value(r, c); });
      return { r: r, vals: vals };
    });
    out.sort(function (a, b) {
      var d = (a.vals[col[0]] - b.vals[col[0]]) * S.dir;
      if (d) return d;
      d = (a.vals.base - b.vals.base) * -1;
      return d || a.r.label.localeCompare(b.r.label);
    });
    return out;
  }

  function cmpClass(v) {
    var c = parseInt(S.cmp, 10);
    if (!isFinite(c) || c <= 0) return '';
    return v > c ? ' st-fast' : (v === c ? ' st-tie' : ' st-slow');
  }

  function render() {
    var root = document.getElementById('speedtierView');
    if (!root) return;
    root.innerHTML = '';
    var shell = el('div', { class: 'st-shell' });
    var bar = el('div', { class: 'st-bar' });

    var search = el('input', { type: 'text', class: 'st-search', placeholder: TXT.search, value: S.q });
    search.addEventListener('input', function () { S.q = search.value; save(); fill(); });
    bar.appendChild(search);

    var seg = el('div', { class: 'st-seg' });
    [['all', TXT.all], ['nomega', TXT.nomega], ['mega', TXT.mega]].forEach(function (f) {
      var b = el('button', { type: 'button', class: S.form === f[0] ? 'on' : '', text: f[1] });
      b.addEventListener('click', function () { S.form = f[0]; save(); render(); });
      seg.appendChild(b);
    });
    bar.appendChild(seg);

    var stage = el('select', { class: 'st-stage', title: TXT.stage });
    for (var s = -6; s <= 6; s++) stage.appendChild(el('option', { value: s, text: TXT.stage + ' ' + (s > 0 ? '+' + s : s) }));
    stage.value = String(S.stage);
    stage.addEventListener('change', function () { S.stage = +stage.value; save(); fill(); });
    bar.appendChild(stage);

    [['tw', TXT.tailwind], ['para', TXT.para]].forEach(function (o) {
      var id = 'st_' + o[0];
      var cb = el('input', { type: 'checkbox', id: id });
      cb.checked = !!S[o[0]];
      cb.addEventListener('change', function () { S[o[0]] = cb.checked; save(); fill(); });
      var lab = el('label', { class: 'st-chk', for: id });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + o[1]));
      bar.appendChild(lab);
    });

    var cmp = el('input', { type: 'number', min: 1, max: 999, class: 'st-cmp', placeholder: TXT.cmp, title: TXT.cmpHint, value: S.cmp });
    cmp.addEventListener('input', function () { S.cmp = cmp.value; save(); fill(); });
    bar.appendChild(cmp);

    var reset = el('button', { type: 'button', class: 'st-reset', text: TXT.reset });
    reset.addEventListener('click', function () { S = defaults(); save(); render(); });
    bar.appendChild(reset);
    var count = el('span', { class: 'st-count' });
    bar.appendChild(count);
    shell.appendChild(bar);

    var card = el('div', { class: 'st-card' });
    var table = el('table', { class: 'st-table' });
    var head = el('tr');
    head.appendChild(el('th', { class: 'st-name', text: TXT.pokemon }));
    COLS.forEach(function (c) {
      var th = el('th', { class: 'st-num' + (S.sort === c[0] ? ' on' : ''), text: c[1] });
      if (S.sort === c[0]) th.appendChild(el('span', { class: 'st-arrow', text: S.dir < 0 ? ' ▼' : ' ▲' }));
      th.addEventListener('click', function () {
        if (S.sort === c[0]) S.dir = -S.dir; else { S.sort = c[0]; S.dir = -1; }
        save(); render();
      });
      head.appendChild(th);
    });
    var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
    var tbody = el('tbody'); table.appendChild(tbody);
    card.appendChild(table);
    shell.appendChild(card);
    root.appendChild(shell);

    function fill() {
      var data = sortedRows();
      count.textContent = TXT.count(data.length);
      tbody.innerHTML = '';
      if (!data.length) {
        var tr0 = el('tr'); tr0.appendChild(el('td', { colspan: COLS.length + 1, class: 'st-none', text: TXT.none })); tbody.appendChild(tr0);
        return;
      }
      var frag = document.createDocumentFragment();
      data.forEach(function (d) {
        var tr = el('tr');
        var td = el('td', { class: 'st-name' });
        var spr = el('span', { class: 'st-spr' }); spr.appendChild(A.spriteImg(d.r.name));
        var tx = el('span', { class: 'st-txt' });
        tx.appendChild(el('span', { class: 'st-pk', text: d.r.label }));
        tx.appendChild(el('span', { class: 'st-sub', text: TXT.baseLbl + ' ' + d.r.base }));
        td.appendChild(spr); td.appendChild(tx); tr.appendChild(td);
        COLS.forEach(function (c) {
          var strong = c[0] === 'base' || c[0] === 'max' || c[0] === 'n0';
          tr.appendChild(el('td', { class: 'st-num' + (strong ? ' st-strong' : '') + (c[0] === 'base' ? '' : cmpClass(d.vals[c[0]])), text: String(d.vals[c[0]]) }));
        });
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
    }
    fill();
  }

  window.CCSpeedTier = { render: render };
})();
