// Pokémon-GO-Pokédex: alle Pokémon aus GO mit Basiswerten, Typen, Attacken und den Werten / der WP eines 100%-IV-Pokémon auf Level 15, 20, 25 und 50.
// Daten: data/godex.js (erzeugt von tools/build_godex.mjs). WP-Formel: floor((Angr+15)·√(Vert+15)·√(KP+15)·CPM² / 10)
(function () {
  'use strict';
  var A = window.CC, G = window.GODEX;
  if (!A || !G) return;
  var el = A.el, esc = A.esc;
  var de = A.LANG === 'de';
  var LEVELS = [15, 20, 25, 50];
  var LEVEL_NOTE = {
    15: de ? 'Feldforschung, Belohnungen' : 'Field research, rewards',
    20: de ? 'Raid, Ei, Wetter-Fang' : 'Raid, egg, weather catch',
    25: de ? 'Raid mit Wetterbonus' : 'Weather-boosted raid',
    50: de ? 'Maximal-Level' : 'Max level'
  };
  var IV = 15;

  // ---- Daten aufbereiten: pro Pokémon (Dex-Nr.) eine Liste von Formen ----
  var species = [], byNum = {};
  G.mons.forEach(function (m) {
    var o = byNum[m[0]];
    if (!o) {
      var nd = (window.NATDEX && window.NATDEX[m[0]]) || [];
      o = byNum[m[0]] = { num: m[0], nameEn: nd[1] || m[1], nameDe: nd[2] || nd[1] || m[1], sid: nd[0] || A.idOf(m[1]), forms: [] };
      species.push(o);
    }
    var f = { label: m[2], types: m[3], atk: m[4], def: m[5], sta: m[6], fast: m[7], charged: m[8], efast: m[9], echarged: m[10] };
    f.cp = {};
    LEVELS.forEach(function (l) { f.cp[l] = cpAt(f, l); });
    o.forms.push(f);
  });
  species.sort(function (a, b) { return a.num - b.num; });

  function lvStat(base, l) { return (base + IV) * G.cpm[l]; }
  function cpAt(f, l) {
    var c = G.cpm[l];
    return Math.max(10, Math.floor((f.atk + IV) * Math.sqrt(f.def + IV) * Math.sqrt(f.sta + IV) * c * c / 10));
  }
  function hpAt(f, l) { return Math.max(10, Math.floor((f.sta + IV) * G.cpm[l])); }

  function genOf(n) {
    return n <= 151 ? 1 : n <= 251 ? 2 : n <= 386 ? 3 : n <= 493 ? 4 : n <= 649 ? 5 : n <= 721 ? 6 : n <= 809 ? 7 : n <= 905 ? 8 : 9;
  }
  function fmtNum(n) { return n >= 1000 ? String(n) : ('00' + n).slice(-3); }

  var FORM_DE = { Alola: 'Alola-Form', Galar: 'Galar-Form', Galarian: 'Galar-Form', Hisui: 'Hisui-Form', Hisuian: 'Hisui-Form', Paldea: 'Paldea-Form',
    'Paldea-Aqua': 'Paldea ( Flut)', 'Paldea-Blaze': 'Paldea (Glut)', 'Paldea-Combat': 'Paldea (Gefecht)',
    Attack: 'Angriffsform', Defense: 'Verteidigungsform', Speed: 'Initiativeform', Plant: 'Pflanzenumhang', Sandy: 'Sandumhang', Trash: 'Lumpenumhang',
    Sunny: 'Sonnenform', Rainy: 'Regenform', Snowy: 'Schneeform', Sunshine: 'Sonnenform',
    Fan: 'Wirbel-Rotom', Frost: 'Frost-Rotom', Heat: 'Hitze-Rotom', Mow: 'Schneid-Rotom', Wash: 'Wasch-Rotom',
    Origin: 'Urform', Altered: 'Wandelform', Land: 'Landform', Sky: 'Zenitform', Incarnate: 'Inkarnationsform', Therian: 'Tiergeistform',
    Black: 'Schwarzes Kyurem', White: 'Weißes Kyurem', Aria: 'Gesangsform', Pirouette: 'Tanzform', Blade: 'Klingenform', Shield: 'Schildform',
    Average: 'Mittel', Large: 'Groß', Small: 'Klein', Super: 'Riesig',
    Complete: 'Optimumform', '10%': '10%-Form', Confined: 'Gebannt', Unbound: 'Entfesselt', Ordinary: 'Standardform', Resolute: 'Resolutform',
    Standard: 'Standard', Zen: 'Trance-Modus', 'Galar-Zen': 'Galar (Trance)',
    Baile: 'Flamenco-Stil', "Pa'u": 'Hula-Stil', 'Pom-Pom': 'Cheerleading-Stil', Sensu: 'Buyo-Stil',
    Dusk: 'Zwielichtform', Midday: 'Tagform', Midnight: 'Nachtform', 'Dawn-Wings': 'Morgenschwingen', 'Dusk-Mane': 'Abendmähne',
    Ultra: 'Ultra-Form', F: 'Weiblich ♀', Female: 'Weiblich ♀', Male: 'Männlich ♂', Hero: 'Heldenform', Crowned: 'König des Schwertes/Schildes',
    Eternamax: 'Unendynamax', 'Rapid-Strike': 'Fließender Stil', 'Single-Strike': 'Fokussierter Stil',
    Four: 'Viererfamilie', Curly: 'Gekrümmt', Droopy: 'Hängend', Stretchy: 'Gestreckt', 'Three-Segment': 'Dreisegmentform',
    Ice: 'Schimmelreiter', Shadow: 'Rappenreiter', Bloodmoon: 'Blutmond-Form',
    Wellspring: 'Brunnenmaske', Hearthflame: 'Ofenmaske', Cornerstone: 'Fundamentmaske', Terastal: 'Terakristall-Form', Stellar: 'Stellar-Form',
    Mega: 'Mega', 'Mega-X': 'Mega X', 'Mega-Y': 'Mega Y', 'Mega-Z': 'Mega Z', Primal: 'Protomorphose' };
  var FORM_EN = { Alola: 'Alolan', Galar: 'Galarian', Galarian: 'Galarian', Hisui: 'Hisuian', Hisuian: 'Hisuian', Paldea: 'Paldean',
    Mega: 'Mega', 'Mega-X': 'Mega X', 'Mega-Y': 'Mega Y', 'Mega-Z': 'Mega Z', Primal: 'Primal' };

  function dexFormOf(num, l) {
    var d = window.DEX_ALL && window.DEX_ALL[num];
    if (!d || !d.forms) return null;
    for (var i = 0; i < d.forms.length; i++) {
      if (d.forms[i].forme === l) return d.forms[i];
    }
    return null;
  }

  function formLabel(l, num) {
    if (!l) return 'Normal';
    if (l === 'A' && num === 150) return de ? 'Rüstung' : 'Armored';
    if (l === 'S' && (num === 249 || num === 250)) return 'Apex';
    if (l === 'Crowned' && num === 888) return de ? 'König des Schwertes' : 'Crowned Sword';
    if (l === 'Crowned' && num === 889) return de ? 'König des Schildes' : 'Crowned Shield';
    var df = dexFormOf(num, l);
    if (df) return de ? (df.labelDe || df.labelEn || l) : (df.labelEn || df.labelDe || l);
    var t = (de ? FORM_DE[l] : FORM_EN[l]) || String(l).replace(/[_-]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return t;
  }

  // Sprite-ID bei Showdown für die Form
  function spriteIdFor(s, f) {
    var l = f.label;
    if (!l || (l === 'A' && s.num === 150) || (l === 'S' && (s.num === 249 || s.num === 250))) return s.sid;
    var df = dexFormOf(s.num, l);
    if (df && df.spriteId) return df.spriteId;
    var x = { Alola: 'alola', Galar: 'galar', Galarian: 'galar', Hisui: 'hisui', Hisuian: 'hisui', Mega: 'mega', 'Mega-X': 'megax', 'Mega-Y': 'megay', 'Mega-Z': 'megaz', 'Mega X': 'megax', 'Mega Y': 'megay', 'Mega Z': 'megaz', Primal: 'primal', 'Mega Primal Kyogre': 'primal', 'Mega Primal Groudon': 'primal' }[l];
    if (!x) x = A.idOf(l.replace(/^Paldea[_-]/, 'paldea').replace(/^Galar(ian)?[_-]/, 'galar'));
    return s.sid + '-' + x;
  }
  function spriteImg(s, f, cls) {
    var base = 'https://play.pokemonshowdown.com/sprites/', id = spriteIdFor(s, f);
    var mode = (A.setting && A.setting('model')) || '3d';
    function urlsFor(spId) {
      var ani = base + 'ani/' + spId + '.gif';
      var home = base + 'home-centered/' + spId + '.png';
      var dex = base + 'dex/' + spId + '.png';
      var px = base + 'gen5/' + spId + '.png';
      if (mode === 'home') return [home, dex, ani, px];
      if (mode === 'sprite') return [px, dex, home, ani];
      return [ani, home, dex, px];
    }
    var own = urlsFor(id).length, chain = urlsFor(id).concat(id !== s.sid ? urlsFor(s.sid) : []);
    var i = 0;
    var img = el('img', { class: cls || '', alt: de ? s.nameDe : s.nameEn });
    function syncCls(u) {
      img.classList.toggle('is-pixel', u.indexOf('/gen5/') !== -1);
      img.classList.toggle('is-home', u.indexOf('/home-centered/') !== -1 || u.indexOf('/dex/') !== -1);
    }
    img.onerror = function () {
      i++;
      if (i < chain.length) {
        // kein eigenes Bild der Form: Basis-Pokémon zeigen, aber gedimmt und mit Hinweis kennzeichnen
        if (i === own) { img.classList.add('is-fallback'); img.title = de ? 'Für diese Form gibt es noch kein Bild: Basis-Pokémon dargestellt' : 'No image for this form yet: showing the base Pokémon'; }
        syncCls(chain[i]);
        img.src = chain[i];
      } else {
        img.onerror = null;
      }
    };
    syncCls(chain[0]);
    img.src = chain[0];
    return img;
  }
  function nm(s) { return de ? s.nameDe : s.nameEn; }

  // ---- Zustand ----
  var st = A.load('cc_godex', null) || {};
  if (!st.num || !byNum[st.num]) st.num = 150;
  if (st.formIdx == null) st.formIdx = 0;
  if (!st.sort) st.sort = 'num';
  if (!st.typeFilter) st.typeFilter = '';
  if (!st.genFilter) st.genFilter = '';
  if (st.onlyForms == null) st.onlyForms = false;
  if (!st.search) st.search = '';
  if (st.formIdx >= byNum[st.num].forms.length) st.formIdx = 0;
  function saveState() { A.save('cc_godex', { num: st.num, formIdx: st.formIdx, sort: st.sort, typeFilter: st.typeFilter, genFilter: st.genFilter, onlyForms: st.onlyForms }); }

  var root = null;
  var SORTS = [['num', de ? 'Dex-Nr.' : 'Dex #'], ['name', 'A–Z'], ['cp', de ? 'WP (Lv 50)' : 'CP (Lv 50)'], ['atk', de ? 'Angriff' : 'Attack'], ['def', de ? 'Verteidigung' : 'Defense'], ['sta', de ? 'Ausdauer' : 'Stamina']];
  function bestForm(s, key) {
    var b = s.forms[0];
    s.forms.forEach(function (f) { if (val(f, key) > val(b, key)) b = f; });
    return b;
  }
  function val(f, key) { return key === 'cp' ? f.cp[50] : f[key]; }

  function filtered() {
    var q = st.search.trim().toLowerCase().replace(/^#/, '');
    var list = species.filter(function (s) {
      if (st.genFilter && genOf(s.num) !== Number(st.genFilter)) return false;
      if (st.onlyForms && s.forms.length <= 1) return false;
      if (st.typeFilter && !s.forms.some(function (f) { return f.types.indexOf(st.typeFilter) !== -1; })) return false;
      if (q) {
        if (/^\d+$/.test(q)) return String(s.num).indexOf(q) === 0 || fmtNum(s.num).indexOf(q) === 0;
        if (s.nameDe.toLowerCase().indexOf(q) !== -1 || s.nameEn.toLowerCase().indexOf(q) !== -1) return true;
        return s.forms.some(function (f) {
          return f.label && (f.label.toLowerCase().indexOf(q) !== -1 || formLabel(f.label, s.num).toLowerCase().indexOf(q) !== -1);
        });
      }
      return true;
    });
    if (st.sort === 'name') list.sort(function (a, b) { return nm(a).localeCompare(nm(b), de ? 'de' : 'en'); });
    else if (st.sort !== 'num') list.sort(function (a, b) { return val(bestForm(b, st.sort), st.sort) - val(bestForm(a, st.sort), st.sort) || a.num - b.num; });
    return list;
  }

  function render() {
    root = document.getElementById('godexView');
    if (!root) return;
    var typeOpts = '<option value="">' + (de ? 'Alle Typen' : 'All types') + '</option>' + A.C.TYPES.map(function (t) {
      return '<option value="' + t + '"' + (st.typeFilter === t ? ' selected' : '') + '>' + esc(A.nType(t)) + '</option>';
    }).join('');
    var sortOpts = SORTS.map(function (o) { return '<option value="' + o[0] + '"' + (st.sort === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
    var genPills = '<button type="button" class="dex-gen-pill' + (!st.genFilter ? ' on' : '') + '" data-gen="">' + (de ? 'Alle' : 'All') + '</button>';
    for (var g = 1; g <= 9; g++) genPills += '<button type="button" class="dex-gen-pill' + (String(st.genFilter) === String(g) ? ' on' : '') + '" data-gen="' + g + '">G' + g + '</button>';
    root.innerHTML =
      '<div class="dex-layout">' +
        '<aside class="panel dex-sidebar">' +
          '<h2 class="field-head"><span>' + 'Pokémon GO' + '</span><span class="dex-count-badge" id="gdCount"></span></h2>' +
          '<div class="dex-filters">' +
            '<input type="text" id="gdSearch" class="dex-search" value="' + esc(st.search) + '" placeholder="' + (de ? 'Suchen: Name, Form (z. B. Mega) oder #Nr. …' : 'Search: name, form (e.g. Mega) or # …') + '" autocomplete="off">' +
            '<div class="dex-gen-bar" id="gdGenBar">' + genPills + '</div>' +
            '<div class="dex-filter-row"><select id="gdType" class="dex-type-sel">' + typeOpts + '</select><select id="gdSort" class="dex-type-sel" title="' + (de ? 'Sortierung' : 'Sort') + '">' + sortOpts + '</select>' +
            '<button type="button" id="gdOnlyForms" class="tbtn dex-form-filter' + (st.onlyForms ? ' on' : '') + '" title="' + (de ? 'Nur Pokémon mit Mega-/Regional-/Spezialformen' : 'Only Pokémon with Mega/regional/special forms') + '">' + (de ? '★ Formen' : '★ Forms') + '</button></div>' +
          '</div>' +
          '<div class="dex-list" id="gdList"></div>' +
        '</aside>' +
        '<section class="dex-main gd-main" id="gdMain"></section>' +
      '</div>';
    var inp = document.getElementById('gdSearch');
    inp.addEventListener('input', function () { st.search = inp.value; renderList(); });
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); step(ev.key === 'ArrowDown' ? 1 : -1); }
    });
    document.getElementById('gdType').addEventListener('change', function (e) { st.typeFilter = e.target.value; saveState(); renderList(); });
    document.getElementById('gdSort').addEventListener('change', function (e) { st.sort = e.target.value; saveState(); renderList(); });
    var ofBtn = document.getElementById('gdOnlyForms');
    ofBtn.addEventListener('click', function () {
      st.onlyForms = !st.onlyForms;
      ofBtn.classList.toggle('on', st.onlyForms);
      saveState();
      renderList();
    });
    var bar = document.getElementById('gdGenBar');
    bar.querySelectorAll('.dex-gen-pill').forEach(function (b) {
      b.addEventListener('click', function () {
        st.genFilter = b.getAttribute('data-gen') || '';
        bar.querySelectorAll('.dex-gen-pill').forEach(function (x) { x.classList.toggle('on', x === b); });
        saveState(); renderList();
      });
    });
    renderList();
    renderDetail();
  }

  function select(num, formIdx) {
    st.num = num; st.formIdx = formIdx || 0; saveState();
    markList(true); renderDetail();
  }
  function step(dir) {
    var list = filtered(), i = -1;
    list.some(function (s, k) { if (s.num === st.num) { i = k; return true; } return false; });
    var n = list[Math.max(0, Math.min(list.length - 1, i + dir))];
    if (n) select(n.num, 0);
  }

  function renderList() {
    var box = document.getElementById('gdList');
    if (!box) return;
    var list = filtered();
    var q = st.search.trim().toLowerCase().replace(/^#/, '');
    document.getElementById('gdCount').textContent = list.length + ' / ' + species.length;
    if (!list.length) { box.innerHTML = '<div class="dex-empty">' + (de ? 'Kein Pokémon gefunden' : 'No Pokémon found') + '</div>'; return; }
    var frag = document.createDocumentFragment();
    list.forEach(function (s) {
      var f0 = s.forms[0];
      var row = el('div', { class: 'dex-row' + (s.num === st.num ? ' on' : ''), 'data-num': s.num });
      row.appendChild(el('span', { class: 'dex-row-num', text: '#' + fmtNum(s.num) }));
      var sp = el('span', { class: 'dex-row-sp' });
      var im = A.spriteById(s.sid, '', false, nm(s)); im.loading = 'lazy';
      sp.appendChild(im);
      row.appendChild(sp);
      var info = el('div', { class: 'dex-row-info' });
      var top = el('div', { class: 'dex-row-top' });
      top.appendChild(el('span', { class: 'dex-row-name', text: nm(s) }));
      if (s.forms.length > 1) {
        top.appendChild(el('span', { class: 'dex-row-forms', text: s.forms.length + (de ? ' Formen' : ' forms') }));
      }
      info.appendChild(top);
      var tys = el('div', { class: 'dex-row-types' });
      f0.types.forEach(function (t) { tys.appendChild(A.typeBadge(t)); });
      info.appendChild(tys);
      row.appendChild(info);
      var key = st.sort === 'num' || st.sort === 'name' || st.sort === 'cp' ? 'cp' : st.sort;
      var bf = bestForm(s, key);
      row.appendChild(el('span', { class: 'gd-row-val', title: de ? 'WP bei 100% IV, Level 50' : 'CP at 100% IV, level 50', text: key === 'cp' ? String(bf.cp[50]) : String(bf[key]) }));
      row.addEventListener('click', function () {
        var targetForm = 0;
        if (q && s.nameDe.toLowerCase().indexOf(q) === -1 && s.nameEn.toLowerCase().indexOf(q) === -1) {
          s.forms.some(function (f, idx) {
            if (f.label && (f.label.toLowerCase().indexOf(q) !== -1 || formLabel(f.label, s.num).toLowerCase().indexOf(q) !== -1)) {
              targetForm = idx;
              return true;
            }
            return false;
          });
        }
        select(s.num, targetForm);
        if (window.RL_ANDROID) { var d = document.getElementById('gdMain'); if (d) d.scrollIntoView({ block: 'start' }); }
      });
      frag.appendChild(row);
    });
    box.innerHTML = '';
    box.appendChild(frag);
    markList(true);
  }
  function markList(scroll) {
    var box = document.getElementById('gdList');
    if (!box) return;
    box.querySelectorAll('.dex-row').forEach(function (r) {
      var on = Number(r.getAttribute('data-num')) === st.num;
      r.classList.toggle('on', on);
      if (on && scroll) r.scrollIntoView({ block: 'nearest' });
    });
  }

  function moveTable(kind, f) {
    var isFast = kind === 'fast';
    var all = isFast ? G.fast : G.charged;
    var normal = isFast ? f.fast : f.charged, elite = isFast ? f.efast : f.echarged;
    var rows = [];
    normal.forEach(function (i) { rows.push([i, false]); });
    elite.forEach(function (i) { if (normal.indexOf(i) === -1) rows.push([i, true]); });
    var box = el('div', { class: 'panel gd-moves' });
    box.appendChild(el('h2', { class: 'field-head', text: isFast ? (de ? 'Schnelle Attacken' : 'Fast moves') : (de ? 'Lade-Attacken' : 'Charged moves') }));
    var body = el('div', { class: 'gd-moves-body' });
    var head = el('div', { class: 'gd-mv gd-mv-head' });
    ['', de ? 'Attacke' : 'Move', de ? 'Stärke' : 'Power', (de ? 'Energie' : 'Energy'), de ? 'Dauer' : 'Time', 'DPS'].forEach(function (h, k) { head.appendChild(el('span', { class: k === 1 ? 'gd-mv-name' : '', text: h })); });
    body.appendChild(head);
    if (!rows.length) body.appendChild(el('div', { class: 'gd-none', text: de ? 'Keine Attacken hinterlegt' : 'No moves on record' }));
    rows.sort(function (a, b) { return a[1] - b[1]; });
    rows.forEach(function (r) {
      var m = all[r[0]], stab = f.types.indexOf(m[1]) !== -1;
      var row = el('div', { class: 'gd-mv' + (r[1] ? ' elite' : '') });
      row.appendChild(A.typeBadge(m[1]));
      var n = el('span', { class: 'gd-mv-name' });
      n.appendChild(el('span', { text: A.nMove(m[0]) }));
      if (stab) n.appendChild(el('span', { class: 'gd-tag gd-stab', title: de ? 'Same-Type-Attack-Bonus: +20% Schaden' : 'Same-type attack bonus: +20% damage', text: 'STAB' }));
      if (r[1]) n.appendChild(el('span', { class: 'gd-tag gd-elite', title: de ? 'Nur mit Elite-TM (Aktions-Attacke)' : 'Elite TM only', text: 'Elite' }));
      row.appendChild(n);
      row.appendChild(el('span', { class: 'gd-num', text: String(m[2]) }));
      row.appendChild(el('span', { class: 'gd-num', text: (isFast ? '+' : '') + m[3] }));
      row.appendChild(el('span', { class: 'gd-num', text: (m[4] / 1000).toFixed(1).replace('.', de ? ',' : '.') + 's' }));
      var dps = m[2] / (m[4] / 1000) * (stab ? 1.2 : 1);
      row.appendChild(el('span', { class: 'gd-num gd-dps', title: de ? 'Schaden pro Sekunde (inkl. STAB)' : 'Damage per second (incl. STAB)', text: dps.toFixed(1).replace('.', de ? ',' : '.') }));
      body.appendChild(row);
    });
    box.appendChild(body);
    return box;
  }

  var STAT_MAX = { atk: 426, def: 396, sta: 496 };
  function statRow(label, key, f) {
    var v = f[key];
    var row = el('div', { class: 'gd-stat' });
    row.appendChild(el('span', { class: 'gd-stat-k', text: label }));
    row.appendChild(el('span', { class: 'gd-stat-v', text: String(v) }));
    var bar = el('span', { class: 'gd-bar' });
    var fill = el('span');
    fill.style.width = Math.min(100, Math.round(v / STAT_MAX[key] * 100)) + '%';
    fill.style.background = v / STAT_MAX[key] < 0.4 ? '#e5484d' : v / STAT_MAX[key] < 0.6 ? '#e0a03a' : v / STAT_MAX[key] < 0.8 ? '#3cb96a' : '#3a7bd5';
    bar.appendChild(fill);
    row.appendChild(bar);
    return row;
  }

  function renderDetail() {
    var main = document.getElementById('gdMain');
    if (!main) return;
    var s = byNum[st.num];
    if (!s) return;
    if (st.formIdx >= s.forms.length) st.formIdx = 0;
    var f = s.forms[st.formIdx];
    main.innerHTML = '';

    // Kopf
    var head = el('div', { class: 'panel dex-head-panel' });
    var top = el('div', { class: 'dex-head-top' });
    var arrows = el('div', { class: 'dex-nav-arrows' });
    var prev = el('button', { type: 'button', class: 'tbtn', title: de ? 'Vorheriges' : 'Previous', text: '‹' });
    var next = el('button', { type: 'button', class: 'tbtn', title: de ? 'Nächstes' : 'Next', text: '›' });
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    arrows.appendChild(prev); arrows.appendChild(next);
    top.appendChild(arrows);
    var tb = el('div', { class: 'dex-title-block' });
    tb.appendChild(el('span', { class: 'dex-num-pill', text: '#' + fmtNum(s.num) }));
    tb.appendChild(el('h1', { class: 'dex-mon-title', text: nm(s) + (f.label ? ' · ' + formLabel(f.label, s.num) : '') }));
    top.appendChild(tb);
    var curMode = (A.setting && A.setting('model')) || '3d';
    var artCtrl = el('div', { class: 'dex-art-controls' });
    var bossBtn = el('button', { type: 'button', class: 'tbtn gd-boss-btn', title: de ? 'Beste Konter gegen dieses Pokémon als Raid-Boss berechnen' : 'Calculate best counters against this Pokémon as a raid boss', text: de ? '⚔ Top Counter' : '⚔ Top Counters' });
    bossBtn.addEventListener('click', function () {
      if (window.CCGoCounter && window.CCGoCounter.openBoss) window.CCGoCounter.openBoss(s.num, f.label);
    });
    artCtrl.appendChild(bossBtn);
    var artGrp = el('div', { class: 'btn-group' });
    [['3d', '3D'], ['home', 'HOME'], ['sprite', 'Pixel']].forEach(function (o) {
      var ab = el('button', { type: 'button', class: curMode === o[0] ? 'on' : '', 'data-art': o[0], text: o[1] });
      ab.addEventListener('click', function () {
        if (A.setSetting) A.setSetting('model', o[0]);
        renderDetail();
      });
      artGrp.appendChild(ab);
    });
    artCtrl.appendChild(artGrp);
    top.appendChild(artCtrl);
    head.appendChild(top);
    if (s.forms.length > 1) {
      var fb = el('div', { class: 'dex-form-bar' });
      fb.appendChild(el('span', { class: 'dex-form-lbl', text: de ? 'Formen' : 'Forms' }));
      var fbs = el('div', { class: 'dex-form-btns' });
      s.forms.forEach(function (x, i) {
        var b = el('button', { type: 'button', class: 'dex-form-btn' + (i === st.formIdx ? ' on' : ''), text: formLabel(x.label, s.num) });
        b.addEventListener('click', function () { st.formIdx = i; saveState(); renderDetail(); });
        fbs.appendChild(b);
      });
      fb.appendChild(fbs);
      head.appendChild(fb);
    }
    main.appendChild(head);

    var grid = el('div', { class: 'gd-grid' });
    // Spalte 1: Bild, Typen, Basiswerte
    var c1 = el('div', { class: 'panel gd-card gd-hero' });
    var stage = el('div', { class: 'gd-stage' });
    stage.appendChild(spriteImg(s, f, 'gd-img'));
    c1.appendChild(stage);
    var tys = el('div', { class: 'gd-types' });
    f.types.forEach(function (t) { tys.appendChild(A.typeBadge(t)); });
    c1.appendChild(tys);
    c1.appendChild(el('h2', { class: 'field-head gd-sub', text: de ? 'Basiswerte' : 'Base stats' }));
    var stats = el('div', { class: 'gd-stats' });
    stats.appendChild(statRow(de ? 'Angriff' : 'Attack', 'atk', f));
    stats.appendChild(statRow(de ? 'Verteidigung' : 'Defense', 'def', f));
    stats.appendChild(statRow(de ? 'Ausdauer' : 'Stamina', 'sta', f));
    c1.appendChild(stats);
    grid.appendChild(c1);

    // Spalte 2: WP & Werte pro Level
    var c2 = el('div', { class: 'panel gd-card' });
    c2.appendChild(el('h2', { class: 'field-head', text: de ? 'Wettkampfwertung bei 100 % IV (15/15/15)' : 'Combat power at 100% IV (15/15/15)' }));
    var tbl = el('div', { class: 'gd-cp' });
    var hd = el('div', { class: 'gd-cp-row gd-cp-head' });
    ['Level', de ? 'WP' : 'CP', de ? 'Angriff' : 'Atk', de ? 'Vert.' : 'Def', de ? 'KP' : 'HP'].forEach(function (h) { hd.appendChild(el('span', { text: h })); });
    tbl.appendChild(hd);
    LEVELS.forEach(function (l) {
      var r = el('div', { class: 'gd-cp-row' });
      var lv = el('span', { class: 'gd-cp-lv' });
      lv.appendChild(el('b', { text: 'Lv ' + l }));
      lv.appendChild(el('small', { text: LEVEL_NOTE[l] }));
      r.appendChild(lv);
      r.appendChild(el('span', { class: 'gd-cp-wp', text: String(f.cp[l]) }));
      r.appendChild(el('span', { text: lvStat(f.atk, l).toFixed(1).replace('.', de ? ',' : '.') }));
      r.appendChild(el('span', { text: lvStat(f.def, l).toFixed(1).replace('.', de ? ',' : '.') }));
      r.appendChild(el('span', { text: String(hpAt(f, l)) }));
      tbl.appendChild(r);
    });
    c2.appendChild(tbl);
    c2.appendChild(el('p', { class: 'gd-foot', text: de
      ? 'Angriff, Verteidigung und KP sind die Werte, die das Pokémon im Kampf auf dem jeweiligen Level hat (Basiswert + 15 IV, mal Level-Faktor).'
      : 'Attack, defense and HP are the values the Pokémon has in battle at that level (base stat + 15 IV, times level multiplier).' }));
    grid.appendChild(c2);

    // Spalte 3: Attacken
    var c3 = el('div', { class: 'gd-moves-col' });
    c3.appendChild(moveTable('fast', f));
    c3.appendChild(moveTable('charged', f));
    grid.appendChild(c3);
    main.appendChild(grid);
  }

  function openMon(num, flabel) {
    var s = byNum[num];
    if (!s) return;
    var idx = 0;
    if (flabel) {
      s.forms.some(function (f, i) { if (f.label === flabel) { idx = i; return true; } return false; });
    }
    st.num = num;
    st.formIdx = idx;
    saveState();
    A.showView('godex');
  }

  window.CCGoDex = { render: render, openMon: openMon, spriteImg: spriteImg, spriteIdFor: spriteIdFor, formLabel: formLabel };
})();
